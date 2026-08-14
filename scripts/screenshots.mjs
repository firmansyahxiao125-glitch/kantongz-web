#!/usr/bin/env node
/**
 * Tangkapan layar untuk dokumentasi portofolio.
 *
 * Memakai Chrome yang SUDAH terpasang lewat DevTools Protocol, bukan Puppeteer
 * atau Playwright. Keduanya mengunduh peramban sendiri berukuran ratusan
 * megabyte — untuk sebuah repositori portofolio, itu berarti setiap orang yang
 * menjalankan `npm install` membayar ongkos yang hanya dipakai saat dokumentasi
 * disegarkan. Node 22 sudah punya `WebSocket` bawaan, dan CDP hanyalah JSON di
 * atasnya.
 *
 * Mengapa tidak `chrome --screenshot` saja: bendera itu tidak dapat menyetel
 * `localStorage` (tema), tidak dapat menggulir untuk memicu animasi
 * masuk-viewport, dan tidak dapat masuk ke akun. Ketiganya dibutuhkan supaya
 * tangkapan layar menampilkan aplikasi seperti yang benar-benar dilihat
 * pengguna, bukan versi paruh-muat yang kebetulan tertangkap.
 *
 * Jalankan:
 *   node scripts/screenshots.mjs --base http://localhost:3100 --out ../kantongz/docs/screenshots
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/* ── argumen ─────────────────────────────────────────────────────────── */

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const BASE = arg('base', 'http://localhost:3100');
const OUT = resolve(arg('out', '../kantongz/docs/screenshots'));
const EMAIL = arg('email', null);
const PASSWORD = arg('password', null);
const PORT = 9333;
const PROFILE = join(tmpdir(), `kantongz-shots-${String(process.pid)}`);

/* Chrome pada Windows, macOS, dan Linux. Dicari, bukan diasumsikan — jalur
   yang salah menghasilkan galat "spawn ENOENT" yang tidak menjelaskan apa pun. */
const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const found = CANDIDATES.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      'Chrome tidak ditemukan. Setel CHROME_PATH ke berkas biner Chrome atau Chromium.',
    );
  }
  return found;
}

/* ── klien CDP ───────────────────────────────────────────────────────── */

/**
 * Klien DevTools Protocol seminimal mungkin.
 *
 * Setiap perintah membawa `id` dan menunggu balasan dengan `id` yang sama.
 * Tanpa pencocokan itu, balasan perintah lambat akan diterima sebagai balasan
 * perintah berikutnya — dan gejalanya adalah tangkapan layar kosong yang
 * sesekali muncul tanpa pola.
 */
class Cdp {
  #socket;
  #next = 1;
  #pending = new Map();
  #listeners = new Map();

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.id !== undefined) {
        const entry = this.#pending.get(message.id);
        this.#pending.delete(message.id);
        if (!entry) return;
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
        else entry.resolve(message.result);
        return;
      }

      const waiters = this.#listeners.get(message.method);
      if (waiters) {
        this.#listeners.delete(message.method);
        for (const resolveWaiter of waiters) resolveWaiter(message.params);
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolvePromise, rejectPromise) => {
      socket.addEventListener('open', resolvePromise, { once: true });
      socket.addEventListener('error', () => {
        rejectPromise(new Error(`Gagal terhubung ke ${url}`));
      }, { once: true });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.#next++;
    return new Promise((resolvePromise, rejectPromise) => {
      this.#pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolvePromise) => {
      const waiters = this.#listeners.get(method) ?? [];
      waiters.push(resolvePromise);
      this.#listeners.set(method, waiters);
    });
  }

  close() {
    this.#socket.close();
  }
}

/* ── utilitas halaman ────────────────────────────────────────────────── */

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`Galat di halaman: ${result.exceptionDetails.text}`);
  }
  return result.result.value;
}

async function goto(cdp, url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
}

/**
 * Menggulir seluruh halaman lalu kembali ke atas.
 *
 * Animasi masuk-viewport hanya berjalan ketika elemennya benar-benar terlihat.
 * Tanpa gulir ini, tangkapan layar halaman penuh menampilkan bagian bawah yang
 * masih pudar setengah — dan pembaca dokumentasi membacanya sebagai bug, bukan
 * sebagai artefak tangkapan layar.
 */
async function revealAll(cdp) {
  await evaluate(
    cdp,
    `(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    })()`,
  );
}

/**
 * Menunggu angka berhenti berhitung.
 *
 * ── CACAT YANG DIPERBAIKINYA ────────────────────────────────────────────
 *
 * `CountUp` menganimasikan angka ringkasan dengan pegas, dan `aria-label`-nya
 * memuat nilai AKHIR yang sudah diformat — sementara teks yang terlihat masih
 * bergerak menuju nilai itu. Tidur tetap 2600 ms memotretnya sebelum reda:
 *
 *   ubin "Keluar bulan ini"  Rp 4.229.988   ← masih berhitung
 *   total donat di kartu sebelahnya  Rp 4.230.000   ← sudah final
 *
 * Dua angka untuk satu besaran, di dalam SATU tangkapan layar, dan yang
 * dipajang di dokumentasi adalah yang salah. Pada aplikasi uang itu bukan
 * cacat kosmetik — pembacanya tidak punya cara tahu angka mana yang benar.
 *
 * Pegasnya (`stiffness: 90, damping: 22, mass: 0.9`) teredam-lebih dan butuh
 * ~3,6 detik untuk mendarat tepat pada nilai 29 juta. Menaikkan tidurnya
 * menjadi 4 detik akan "cukup" hari ini dan menjadi salah lagi begitu ada
 * angka yang lebih besar atau mesin yang lebih lambat.
 *
 * Karena itu yang ditunggu KONDISI, bukan waktu: setiap elemen `CountUp` sudah
 * membawa jawabannya sendiri di `aria-label`.
 */
async function settleNumbers(cdp, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const belum = await evaluate(
      cdp,
      `[...document.querySelectorAll('span[aria-label^="Rp"]')]
         .filter((el) => el.textContent.trim() !== el.getAttribute('aria-label').trim()).length`,
    );
    if (belum === 0) return true;
    await sleep(120);
  }
  /* Tidak melempar: dokumentasi yang gagal dibuat lebih buruk daripada
     dokumentasi yang satu angkanya meleset — tetapi kelesetannya HARUS
     terdengar, bukan lewat diam-diam. */
  console.warn('  ! angka belum reda dalam batas waktu — periksa tangkapannya');
  return false;
}

/** Nama yang benar-benar ditulis jalankan ini. Dipakai untuk menyapu sisa. */
const ditulis = new Set();

/**
 * Membuang PNG yang TIDAK ditulis jalankan ini.
 *
 * ── CACAT YANG DIPERBAIKINYA ────────────────────────────────────────────
 *
 * Alat ini menimpa berkas per nama, dan tidak pernah membuang apa pun. Begitu
 * daftar halamannya berubah, berkas lama tetap tinggal:
 *
 *   05-wawasan.png   ditinggalkan saat 05 menjadi Transaksi
 *   06-asisten.png   ditinggalkan saat 06 menjadi Dompet
 *   07-transaksi.png ditinggalkan saat 07 menjadi Anggaran
 *
 * Yang terakhir paling merugikan: ia memotret tata letak SEBELUM perbaikan
 * baris transaksi, dan duduk di direktori yang sama dengan versi sesudahnya.
 * Dokumentasi yang memuat dua kebenaran sekaligus lebih buruk daripada
 * dokumentasi yang usang seluruhnya — pembacanya tidak punya cara tahu mana
 * yang berlaku.
 *
 * HANYA `.png` yang disapu, dan hanya di direktori keluaran: berkas lain yang
 * kebetulan diletakkan orang di sana bukan urusan alat ini.
 */
async function sapuSisa() {
  const sisa = (await readdir(OUT)).filter((f) => f.endsWith('.png') && !ditulis.has(f));
  for (const f of sisa) {
    await rm(resolve(OUT, f), { force: true });
    console.log(`  − ${f} (sisa jalankan sebelumnya)`);
  }
}

async function shoot(cdp, name, { fullPage = false } = {}) {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
    ...(fullPage ? { optimizeForSpeed: false } : {}),
  });

  const file = resolve(OUT, `${name}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  ditulis.add(`${name}.png`);
  console.log(`  ✓ ${name}.png`);
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    /* 2 supaya tangkapan layar tajam di layar retina dan di README GitHub,
       yang menampilkan gambar pada separuh lebar pikselnya. */
    deviceScaleFactor: 2,
    mobile,
  });
}

/* ── alur ────────────────────────────────────────────────────────────── */

async function main() {
  await mkdir(OUT, { recursive: true });

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      /* SwiftShader memberi WebGL pada mesin tanpa GPU. Tanpa ini, tingkat
         grafis jatuh ke `off` dan tangkapan layar menampilkan pengganti
         statis — yang benar sebagai perilaku, tetapi bukan yang ingin
         ditunjukkan dokumentasi. */
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      /* Profil Chrome ke direktori sementara, BUKAN ke folder keluaran.
         Profil berisi ratusan berkas dan akan ikut ter-commit bersama
         tangkapan layarnya — dan sekali masuk riwayat, ia tinggal di sana. */
      `--user-data-dir=${PROFILE}`,
    ],
    { stdio: 'ignore' },
  );

  try {
    /* Menunggu port siap dengan menjajalnya, bukan dengan tidur sekian detik.
       Durasi tetap terlalu pendek pada mesin lambat dan terlalu panjang pada
       mesin cepat, dan yang pertama gagal secara acak. */
    let target = null;
    /* Tidur di SETIAP putaran yang belum menemukan target, bukan hanya saat
       fetch melempar — Chrome dapat menjawab sebelum target halamannya ada. */
    for (let attempt = 0; attempt < 60 && target === null; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${String(PORT)}/json/list`);
        const targets = await response.json();
        target = targets.find((t) => t.type === 'page') ?? null;
      } catch {
        /* belum menerima sambungan */
      }
      if (target === null) await sleep(250);
    }
    if (target === null) throw new Error('Chrome tidak pernah membuka target halaman.');

    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    /* Tema gelap dipilih untuk dokumentasi karena adegan 3D dan pendar aksen
       hanya terbaca di atasnya. Disetel lewat localStorage — kunci yang sama
       yang dibaca skrip tema sebelum cat pertama. */
    await goto(cdp, BASE);
    await evaluate(cdp, `localStorage.setItem('kantongz-theme', 'dark')`);

    console.log(`Menangkap dari ${BASE} → ${OUT}`);

    /* ── halaman muka ── */
    await setViewport(cdp, 1440, 900);
    await goto(cdp, BASE);
    await sleep(2500);
    await shoot(cdp, '01-landing-hero');

    await revealAll(cdp);
    await setViewport(cdp, 1440, 900);
    await shoot(cdp, '02-landing-full', { fullPage: true });

    /* ── ponsel ── */
    await setViewport(cdp, 390, 844, true);
    await goto(cdp, BASE);
    await sleep(2000);
    await shoot(cdp, '03-landing-mobile');

    /* ── aplikasi ── */
    if (EMAIL && PASSWORD) {
      await setViewport(cdp, 1440, 900);
      await goto(cdp, `${BASE}/masuk`);
      await sleep(900);

      /* Nilai disetel lewat penyetel asli React supaya `onChange` benar-benar
         terpicu. Menetapkan `.value` langsung mengubah DOM tanpa React
         mengetahuinya, dan formulir tetap menganggap isiannya kosong. */
      await evaluate(
        cdp,
        `(() => {
          const setValue = (el, value) => {
            const proto = Object.getPrototypeOf(el);
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          setValue(document.querySelector('input[type=email]'), ${JSON.stringify(EMAIL)});
          setValue(document.querySelector('input[type=password]'), ${JSON.stringify(PASSWORD)});
          document.querySelector('button[type=submit]').click();
        })()`,
      );
      await sleep(4000);

      /*
       * SELURUH dua belas halaman interior, bukan empat.
       *
       * Sebelumnya hanya Dasbor, Wawasan, Asisten, dan Transaksi yang dipotret.
       * Delapan halaman sisanya — termasuk sembilan yang baru saja disatukan ke
       * `PageHeader`/`CardTitle` — tidak muncul di dokumentasi sama sekali,
       * sehingga pekerjaan yang paling terlihat justru yang paling tidak
       * terlihat.
       *
       * Untuk repositori portofolio, tangkapan layar ADALAH argumennya.
       * Memotret sepertiga aplikasi berarti membiarkan pembacanya menebak
       * dua pertiga sisanya.
       */
      for (const [name, path] of [
        ['04-dasbor', '/dasbor'],
        ['05-transaksi', '/transaksi'],
        ['06-dompet', '/dompet'],
        ['07-anggaran', '/anggaran'],
        ['08-tujuan', '/tujuan'],
        ['09-analitik', '/analitik'],
        ['10-wawasan', '/wawasan'],
        ['11-asisten', '/asisten'],
        ['12-laporan', '/laporan'],
        ['13-profil', '/profil'],
        ['14-keamanan', '/keamanan'],
        ['15-pengaturan', '/pengaturan'],
      ]) {
        await goto(cdp, `${BASE}${path}`);
        await sleep(2600);
        await settleNumbers(cdp);
        await shoot(cdp, name);
      }

      /* Ponsel, dan hanya halaman yang bentuknya benar-benar BERUBAH di layar
         sempit: dasbor menyusun ulang ubinnya, transaksi memindahkan
         penyaringnya, dompet berpindah dari tiga kolom ke satu. Memotret
         seluruh dua belas dalam dua ukuran menggandakan berkas tanpa
         menggandakan informasi. */
      await setViewport(cdp, 390, 844, true);
      for (const [name, path] of [
        ['16-dasbor-ponsel', '/dasbor'],
        ['17-transaksi-ponsel', '/transaksi'],
        ['18-dompet-ponsel', '/dompet'],
      ]) {
        await goto(cdp, `${BASE}${path}`);
        await sleep(2600);
        await settleNumbers(cdp);
        await shoot(cdp, name);
      }
    } else {
      console.log('  · Layar aplikasi dilewati (butuh --email dan --password).');
    }

    /* Disapu HANYA ketika layar aplikasi ikut dipotret. Tanpa kredensial,
       jalankan ini hanya menghasilkan tiga berkas halaman muka — menyapu di
       situ akan MENGHAPUS seluruh layar aplikasi yang masih berlaku. */
    if (EMAIL && PASSWORD) await sapuSisa();

    cdp.close();
  } finally {
    chrome.kill();
    /* Profil sementara dibersihkan. Chrome menulis puluhan megabyte cache ke
       sana, dan menumpuknya per jalankan akan memenuhi direktori sementara. */
    await rm(PROFILE, { recursive: true, force: true }).catch(() => undefined);
  }
}

await main();
