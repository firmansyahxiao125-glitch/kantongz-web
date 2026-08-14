#!/usr/bin/env node
/**
 * Gerbang regresi HALAMAN INTERIOR.
 *
 * ── APA YANG DIJAGA, DAN MENGAPA GERBANG LAIN TIDAK BISA ───────────────
 *
 * `typography.mjs` dan `render.mjs` menjaga halaman MUKA — halaman publik yang
 * dapat dibuka tanpa sesi. Halaman di balik login tidak pernah tersentuh
 * gerbang mana pun, dan di sanalah seluruh produk sebenarnya berada.
 *
 * Kelas cacat yang dijaga berkas ini BUKAN hipotesis. Keempatnya sudah terjadi
 * di repositori ini, dan tidak satu pun memerahkan typecheck, lint, uji unit,
 * `next build`, kontras, maupun palet:
 *
 *   1. Judul kartu ditulis tangan dalam EMPAT varian kelas berbeda. Tidak ada
 *      pemeriksa statis yang tahu dua kelas berbeda menghasilkan piksel yang
 *      berbeda pula.
 *   2. Nominal uang memakai font teks di satu halaman dan mono di halaman lain,
 *      untuk angka yang SAMA PERSIS.
 *   3. `<h3>` dipakai di bawah `<h1>` tanpa `<h2>` di antaranya — pembaca layar
 *      yang melompat antar-heading kehilangan struktur.
 *   4. Tombol `opacity-0` + `group-hover` yang TETAP menerima ketukan di layar
 *      sentuh: tak terlihat, tetapi bisa tertekan tanpa sengaja.
 *
 * ── PRINSIP PENEGASAN ──────────────────────────────────────────────────
 *
 * Yang diukur adalah GEJALA pada keluaran terender, bukan nama kelas di sumber.
 *
 * Perbedaannya menentukan. Versi pertama gerbang ini menghitung elemen
 * ber-kelas `.action-reveal`, dan karena itu hanya dapat melihat yang SUDAH
 * diperbaiki — cacat yang sama di halaman Transaksi lolos utuh. Gerbang yang
 * memeriksa pemakai perbaikan tidak pernah menemukan yang belum diperbaiki.
 *
 * Tidak ada nilai piksel absolut yang ditulis: ukuran mutlak berubah menurut
 * viewport, DPI, dan versi font, dan gerbang yang memerah tanpa sebab akan
 * dimatikan orang.
 *
 * ── MENGAPA TIDAK DI CI ────────────────────────────────────────────────
 *
 * Gerbang ini menuntut SESI SUNGGUHAN: API hidup, basis data, dan satu akun
 * berdata. Alur peramban di CI berjalan hanya terhadap peladen standalone,
 * tanpa backend sama sekali. Menjalankannya di sana menuntut membangun dan
 * menyalakan API beserta PostgreSQL dan Redis dari repositori LAIN — biaya
 * integrasi yang jauh melebihi nilainya untuk saat ini.
 *
 * Ia karena itu gerbang LOKAL, dan dijalankan sebelum menyentuh halaman
 * interior mana pun. Statusnya dinyatakan apa adanya, bukan disamarkan sebagai
 * bagian dari CI.
 *
 * Jalankan (butuh API hidup dan akun berdata):
 *   npm run build
 *   cp -r .next/static .next/standalone/.next/static
 *   PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js &
 *   node scripts/interior.mjs --email you@contoh.id --password '…'
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Berapa lama menunggu Chrome membuka target halamannya.
 *
 * 160 x 250ms = 40 detik. Nilai sebelumnya 15 detik, dan itu CUKUP di laptop
 * yang panas — tetapi tidak di runner CI yang dingin sambil menyalakan peladen
 * Next di proses lain. Gejalanya: gerbang peramban gagal dengan "Chrome tidak
 * pernah membuka target halaman" pada satu commit lalu hijau pada commit
 * berikutnya yang tidak mengubah satu baris kode pun.
 *
 * Gerbang yang gagal secara acak lebih buruk daripada tidak ada gerbang: orang
 * belajar menjalankannya ulang alih-alih menyelidikinya, dan sesudah itu
 * kegagalan yang SUNGGUHAN pun ikut dijalankan ulang.
 */
const MAKS_TARGET = 160;

/* ── argumen ─────────────────────────────────────────────────────────── */

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const BASE = arg('base', 'http://localhost:3100');
const EMAIL = arg('email', null);
const PASSWORD = arg('password', null);
const PORT = 9336; // 9333 screenshots · 9334 typography · 9335 render
const PROFILE = join(tmpdir(), `kantongz-interior-${String(process.pid)}`);

if (!EMAIL || !PASSWORD) {
  console.error('Butuh --email dan --password: gerbang ini menuntut sesi sungguhan.');
  process.exit(2);
}

const HALAMAN = [
  ['dasbor', '/dasbor'], ['transaksi', '/transaksi'], ['dompet', '/dompet'],
  ['anggaran', '/anggaran'], ['tujuan', '/tujuan'], ['berulang', '/berulang'],
  ['analitik', '/analitik'],
  ['wawasan', '/wawasan'], ['asisten', '/asisten'], ['laporan', '/laporan'],
  ['profil', '/profil'], ['keamanan', '/keamanan'], ['pengaturan', '/pengaturan'],
];

/*
 * Dua halaman SENGAJA memakai dua ukuran judul kartu, dan alasannya tertulis
 * di komponennya masing-masing: Laporan adalah judul dokumen TERCETAK (kepala
 * halaman `print:hidden`, jadi baris itulah judulnya di atas kertas), dan
 * Profil menamai PEMILIK AKUN. Keduanya tetap `CardTitle`, jadi tingkat
 * headingnya seragam meski ukurannya tidak.
 */
const VARIAN_EKSTRA = { profil: 1 };

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
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome tidak ditemukan. Setel CHROME_PATH.');
  return found;
}

/* ── klien CDP ───────────────────────────────────────────────────────── */

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let next = 1;
  const galatKonsol = [];

  await new Promise((res, rej) => {
    socket.addEventListener('open', res, { once: true });
    socket.addEventListener('error', () => { rej(new Error(`gagal terhubung ke ${url}`)); }, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const m = JSON.parse(event.data);
    if (m.id !== undefined) {
      const entry = pending.get(m.id);
      pending.delete(m.id);
      if (!entry) return;
      if (m.error) entry.reject(new Error(JSON.stringify(m.error)));
      else entry.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      galatKonsol.push(JSON.stringify(m.params.args.map((a) => a.value ?? a.description)).slice(0, 200));
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = next++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  return { send, galatKonsol, close: () => { socket.close(); } };
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`galat di halaman: ${r.exceptionDetails.text}`);
  return r.result.value;
}

const goto = async (cdp, url, tunggu = 2600) => {
  await cdp.send('Page.navigate', { url });
  await sleep(tunggu);
};

const viewport = (cdp, width, height, mobile = false) =>
  cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height,
  });

/* ── pemeriksaan, dijalankan DI DALAM halaman ────────────────────────── */

const CEK = `(() => {
  const main = document.querySelector('main');
  const teks = main ? main.innerText : '';
  const h1 = [...document.querySelectorAll('main h1')];

  const varian = new Map();
  for (const h of document.querySelectorAll('main h2')) {
    const c = getComputedStyle(h);
    const k = c.fontSize + '/' + c.fontWeight;
    varian.set(k, (varian.get(k) ?? 0) + 1);
  }

  const tingkat = [...document.querySelectorAll('main h1,main h2,main h3,main h4')]
    .map((h) => Number(h.tagName[1]));
  let lompat = 0;
  for (let i = 1; i < tingkat.length; i++) if (tingkat[i] - tingkat[i - 1] > 1) lompat++;

  /* Elemen yang ISINYA hanya angka uang. Kalimat yang kebetulan memuat nominal
     adalah PROSA — memonokan "lebih hemat" bersama angkanya justru salah. */
  const UANG_SAJA = /^Rp\\s?[\\d.]+(\\s*\\/\\s*Rp\\s?[\\d.]+)?$/;
  let uangSans = 0;
  const contohUang = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length) continue;
    const t = (el.textContent ?? '').trim();
    if (!UANG_SAJA.test(t)) continue;
    if (!/mono/i.test(getComputedStyle(el).fontFamily)) {
      uangSans++;
      if (contohUang.length < 3) contohUang.push(t.slice(0, 28));
    }
  }

  /* Kontrol tak terlihat yang TETAP dapat ditekan.
     Opacity berlipat ganda sepanjang rantai leluhur, jadi hasil kalinya adalah
     satu-satunya angka yang berarti "terlihat atau tidak" — memeriksa elemennya
     sendiri buta terhadap opacity-0 yang dipasang di pembungkus. */
  let tersembunyi = 0;
  const contohKontrol = [];
  for (const el of document.querySelectorAll('main button, main a[href], main [role="button"]')) {
    const g = getComputedStyle(el);
    let efektif = Number(g.opacity);
    let bisaDitekan = g.pointerEvents !== 'none';
    let p = el.parentElement;
    while (p && p !== document.body) {
      const pg = getComputedStyle(p);
      efektif *= Number(pg.opacity);
      if (pg.pointerEvents === 'none') bisaDitekan = false;
      if (pg.visibility === 'hidden' || pg.display === 'none') { efektif = 1; break; }
      p = p.parentElement;
    }
    /* Ambang "tidak terlihat", bukan "diredupkan": Button menyetel
       disabled:opacity-45, dan tombol nonaktif dipasangkan
       disabled:pointer-events-none — ia tidak dapat tertekan tanpa sengaja. */
    if (efektif > 0.1) continue;
    if (g.visibility === 'hidden' || g.display === 'none') continue;
    if (!bisaDitekan || el.disabled === true) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    tersembunyi++;
    if (contohKontrol.length < 3) {
      contohKontrol.push((el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40));
    }
  }

  /*
   * Isi yang TERPOTONG HABIS, bukan sekadar diberi elipsis.
   *
   * Gerbang ini pernah melaporkan halaman Anggaran hijau di 390px sementara
   * nama kategorinya TIDAK TERLIHAT SAMA SEKALI: elemen ber-truncate di dalam
   * baris yang kehabisan ruang menyusut ke lebar NOL, dan pengguna tidak dapat
   * membedakan satu anggaran dari yang lain.
   *
   * Pemeriksaan luapan tidak dapat melihatnya — isinya justru DIPOTONG, jadi
   * tidak ada yang meluap. Yang membedakan "dipendekkan dengan sopan" dari
   * "hilang" adalah berapa lebar yang tersisa, bukan ada-tidaknya elipsis.
   *
   * Ambang 24px: di bawah itu tidak ada kata yang tersisa untuk dibaca.
   */
  let terpotongHabis = 0;
  const contohPotong = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length) continue;
    const t = (el.textContent ?? '').trim();
    if (t.length === 0) continue;
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (el.clientWidth >= 24) continue;
    const g = getComputedStyle(el);
    if (g.visibility === 'hidden' || g.display === 'none') continue;
    /*
     * Label sr-only DIKECUALIKAN, dan bukan dengan melonggarkan ambangnya.
     *
     * Pola sr-only adalah kotak 1x1 piksel: sengaja tak terlihat mata, sengaja
     * TERBACA pembaca layar, dan wajib ada pada penyaring yang labelnya
     * disembunyikan. Tanpa pengecualian ini gerbang menuduh justru hal yang
     * membuat halaman dapat diakses — dan gerbang yang menghukum aksesibilitas
     * akan dimatikan orang.
     *
     * Tingginya yang membedakan: teks yang benar-benar dirender punya tinggi
     * satu baris, sedangkan sr-only tingginya 1px.
     */
    if (el.clientHeight < 8) continue;
    terpotongHabis++;
    if (contohPotong.length < 3) {
      contohPotong.push(t.slice(0, 24) + ' (' + String(el.clientWidth) + 'px, butuh ' + String(el.scrollWidth) + ')');
    }
  }

  return {
    url: location.pathname,
    h1n: h1.length,
    terpotongHabis, contohPotong,
    nVarian: varian.size,
    varian: [...varian.entries()].map(([k, n]) => k + 'x' + n),
    lompat,
    uangSans, contohUang,
    tersembunyi, contohKontrol,
    luapan: document.documentElement.scrollWidth > window.innerWidth + 1,
    kosong: teks.trim().length < 40,
  };
})()`;

/* ── alur ────────────────────────────────────────────────────────────── */

async function main() {
  const chrome = spawn(findChrome(), [
    '--headless=new', `--remote-debugging-port=${String(PORT)}`, `--user-data-dir=${PROFILE}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
    /* Sama dengan `typography.mjs` dan `render.mjs`: runner CI berjalan sebagai
       root di dalam kontainer, dan tanpa ini Chrome menolak start. Gerbang ini
       belum berjalan di CI, tetapi bendera yang hilang adalah jenis perbedaan
       yang baru ketahuan saat seseorang memindahkannya ke sana. */
    '--no-sandbox',
  ], { stdio: 'ignore' });

  let gagal = 0;

  try {
    let target = null;
    /* Tidur di SETIAP putaran yang belum menemukan target, bukan hanya saat
       fetch melempar — Chrome dapat menjawab sebelum target halamannya ada. */
    for (let i = 0; i < MAKS_TARGET && target === null; i += 1) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)).json();
        target = list.find((t) => t.type === 'page') ?? null;
      } catch { /* belum menerima sambungan */ }
      if (target === null) await sleep(250);
    }
    if (target === null) throw new Error('Chrome tidak pernah membuka target halaman.');

    const cdp = await connect(target.webSocketDebuggerUrl);

    await viewport(cdp, 1440, 900);
    await goto(cdp, `${BASE}/masuk`, 3000);
    await evaluate(cdp, `(() => {
      const set = (el, v) => {
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        d.set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set(document.querySelector('input[type=email]'), ${JSON.stringify(EMAIL)});
      set(document.querySelector('input[type=password]'), ${JSON.stringify(PASSWORD)});
      document.querySelector('button[type=submit]').click();
    })()`);

    /* Menunggu KONDISI, bukan durasi tetap: peladen terkontainerisasi boot
       lebih lambat, dan uji yang mengukur kesabaran bukan mengukur aplikasi. */
    const batas = Date.now() + 40_000;
    let masuk = false;
    while (Date.now() < batas && !masuk) {
      if ((await evaluate(cdp, 'location.pathname')) === '/dasbor') { await sleep(2000); masuk = true; }
      else await sleep(500);
    }
    if (!masuk) throw new Error('tidak pernah sampai di /dasbor — periksa kredensial dan API.');

    const jalankan = async (label, ponsel) => {
      console.log(`\n  ── ${label} ──`);
      for (const [nama, jalur] of HALAMAN) {
        await goto(cdp, `${BASE}${jalur}`, ponsel ? 2600 : 3000);
        const d = await evaluate(cdp, CEK);
        const batasVarian = 1 + (VARIAN_EKSTRA[nama] ?? 0);

        const alasan = [];
        if (d.url !== jalur) alasan.push(`url=${d.url}`);
        if (d.h1n !== 1) alasan.push(`h1=${String(d.h1n)}`);
        if (d.kosong) alasan.push('isi kosong');
        if (d.luapan) alasan.push('luapan horizontal');
        if (d.nVarian > batasVarian) alasan.push(`varian judul=${String(d.nVarian)} ${d.varian.join(' ')}`);
        if (d.lompat > 0) alasan.push(`lompatan heading=${String(d.lompat)}`);
        if (d.uangSans > 0) alasan.push(`nominal non-mono=${String(d.uangSans)} ${JSON.stringify(d.contohUang)}`);
        if (d.terpotongHabis > 0) alasan.push(`isi terpotong habis=${String(d.terpotongHabis)} ${JSON.stringify(d.contohPotong)}`);
        /* Tersembunyi di DESKTOP itu benar — kontrol menyingkir sampai kursor
           mendekat. Yang salah hanya bila tidak ada kursor sama sekali. */
        if (ponsel && d.tersembunyi > 0) {
          alasan.push(`kontrol tak terlihat tapi bisa ditekan=${String(d.tersembunyi)} ${JSON.stringify(d.contohKontrol)}`);
        }

        if (alasan.length > 0) gagal++;
        console.log(`  ${alasan.length > 0 ? '✗' : 'OK'}  ${nama.padEnd(11)}${alasan.length > 0 ? '  ' + alasan.join(' · ') : ''}`);
      }
    };

    await jalankan('desktop 1440px', false);

    await viewport(cdp, 390, 844, true);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    /* Tanpa ini, `@media (hover: hover)` tetap benar dan seluruh cacat
       khusus-sentuh tidak pernah muncul. */
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }],
    });
    await jalankan('ponsel 390px (tanpa kursor)', true);

    console.log(`\n  galat konsol: ${String(cdp.galatKonsol.length)}`);
    for (const g of cdp.galatKonsol.slice(0, 5)) console.log(`    ${g}`);
    gagal += cdp.galatKonsol.length;

    console.log(`\n${'═'.repeat(72)}`);
    console.log(gagal === 0
      ? '  Halaman interior konsisten: satu judul, satu varian, nol kontrol hantu.\n'
      : `  ${String(gagal)} temuan.\n`);

    cdp.close();
  } finally {
    chrome.kill();
    await rm(PROFILE, { recursive: true, force: true }).catch(() => undefined);
  }

  process.exit(gagal === 0 ? 0 : 1);
}

await main();
