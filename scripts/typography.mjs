#!/usr/bin/env node
/**
 * Gerbang regresi TIPOGRAFI.
 *
 * ── CACAT YANG DIJAGA BERKAS INI ───────────────────────────────────────
 *
 * `globals.css` mendeklarasikan di dalam `@theme`:
 *
 *     --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
 *     --font-mono: var(--font-mono-stack), ui-monospace, …;
 *
 * Tailwind memancarkan keduanya ke `:root` — dan `:root` ADALAH `<html>`.
 * Ketika `--font-inter` dipasang `next/font` lewat kelas di `<body>`, satu
 * tingkat di bawahnya, pencarian `var()` di `:root` tidak menemukan apa pun.
 * Seluruh deklarasi `--font-sans` menjadi "guaranteed-invalid", dan nilai
 * KOSONG itulah yang diwariskan ke bawah — substitusi tidak pernah diulang
 * pada elemen anak.
 *
 * Akibatnya: SELURUH aplikasi tampil dengan font sistem, dan setiap nominal
 * uang kehilangan JetBrains Mono berikut jaminan lebar digit ratanya.
 *
 * ── MENGAPA GERBANG INI MEMBUTUHKAN PERAMBAN ───────────────────────────
 *
 * Karena tidak ada pemeriksaan statis yang dapat melihatnya. Deklarasi
 * `--font-sans` HADIR dan BENAR di CSS terbangun, baik pada versi yang rusak
 * maupun yang sudah diperbaiki — yang berbeda hanyalah ELEMEN tempat
 * masukannya dipasang. Hanya kaskade sungguhan yang tahu bedanya.
 *
 * Itu juga sebabnya seluruh gerbang yang sudah ada melewatkannya: typecheck,
 * ESLint, uji unit, `next build`, dan setiap permintaan jaringan seluruhnya
 * HIJAU sementara aplikasinya tampil dengan Segoe UI.
 *
 * ── MENGAPA BUKAN VITEST ───────────────────────────────────────────────
 *
 * `vitest.config.mts` menyatakan cakupannya SEMPIT dan disengaja: hanya
 * logika murni di bawah `src/lib`, `environment: 'node'`, dan komponen tidak
 * diuji di sana karena menuntut DOM lengkap. Menaruh pemeriksaan peramban di
 * sana akan melanggar batas yang sudah dinyatakan berkas itu sendiri. Gerbang
 * ini mengikuti pola `contrast.mjs`: skrip berdiri sendiri yang dipanggil CI.
 *
 * ── MENGAPA TANPA PUPPETEER ATAU PLAYWRIGHT ────────────────────────────
 *
 * Alasan yang sama dengan `screenshots.mjs`: keduanya mengunduh peramban
 * sendiri berukuran ratusan megabyte, dan setiap orang yang menjalankan
 * `npm install` akan membayarnya. Chrome yang SUDAH terpasang ditambah
 * `WebSocket` bawaan Node sudah cukup — CDP hanyalah JSON di atasnya.
 *
 * ── MENJALANKAN ────────────────────────────────────────────────────────
 *
 * Butuh peladen PRODUKSI yang sudah hidup — dan peladen itu harus dijalankan
 * dengan cara yang SAMA seperti produksi. `next.config.ts` memakai
 * `output: 'standalone'`, jadi `next start` ditolak Next:
 *
 *   ⚠ "next start" does not work with "output: standalone" configuration.
 *
 * Bundel standalone SENGAJA tidak memuat aset statis; Dockerfile produksi
 * menyalinnya pada tahap penyebaran, dan perakitan di bawah menirunya persis.
 * Tanpa `.next/static`, seluruh CSS menjawab 404 — dan gerbang ini akan gagal
 * karena alasan yang sama sekali salah.
 *
 *   npm run build
 *   cp -r .next/static .next/standalone/.next/static
 *   PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js &
 *   node scripts/typography.mjs --base http://localhost:3100
 *
 * Di PowerShell, dua baris tengahnya menjadi:
 *   Copy-Item -Recurse -Force .next\\static .next\\standalone\\.next\\static
 *   $env:PORT='3100'; $env:HOSTNAME='127.0.0.1'; node .next\\standalone\\server.js
 *
 * `HOSTNAME` WAJIB disetel. `server.js` memakai
 * `process.env.HOSTNAME || '0.0.0.0'`, dan Docker maupun runner CI sudah
 * menyetel variabel itu ke ID kontainer / nama mesin. Tanpa menimpanya,
 * peladen mengikat ke nama tersebut dan `http://localhost:3100` tidak pernah
 * menjawab — gerbang ini lalu gagal dengan exit 2 karena alasan yang tidak
 * ada hubungannya dengan tipografi.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/* ── argumen ─────────────────────────────────────────────────────────── */

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const BASE = arg('base', 'http://localhost:3100');
const PORT = 9334; // bukan 9333 — supaya dapat berjalan bersama screenshots.mjs
const PROFILE = join(tmpdir(), `kantongz-type-${String(process.pid)}`);

/* Chrome dicari, bukan diasumsikan — daftar yang sama dengan `screenshots.mjs`.
   `/usr/bin/google-chrome` adalah yang dipakai runner `ubuntu-latest`. */
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

/* ── klien CDP seminimal mungkin ─────────────────────────────────────────
   Sengaja lebih kecil daripada milik `screenshots.mjs`: gerbang ini tidak
   perlu menunggu peristiwa halaman, jadi seluruh mesin pendengar peristiwa
   tidak dibutuhkan. Kesiapan ditentukan dengan menanyai `document.readyState`,
   yang juga membuatnya kebal terhadap peristiwa `load` yang terlewat. */

class Cdp {
  #socket;
  #next = 1;
  #pending = new Map();

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id === undefined) return;
      const entry = this.#pending.get(message.id);
      this.#pending.delete(message.id);
      if (!entry) return;
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolvePromise, rejectPromise) => {
      socket.addEventListener('open', resolvePromise, { once: true });
      socket.addEventListener(
        'error',
        () => {
          rejectPromise(new Error(`Gagal terhubung ke ${url}`));
        },
        { once: true },
      );
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

  close() {
    this.#socket.close();
  }
}

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

/* ── pelaporan ───────────────────────────────────────────────────────── */

let lulus = 0;
let gagal = 0;
const ok = (pesan) => {
  lulus += 1;
  console.log(`  \u001b[32mOK  \u001b[0m ${pesan}`);
};
const bad = (pesan, detail) => {
  gagal += 1;
  console.log(`  \u001b[31mGAGAL\u001b[0m ${pesan}`);
  if (detail) console.log(`        → ${detail}`);
};
const bagian = (judul) => {
  console.log(`\n\u001b[1m${judul}\u001b[0m`);
};

/* ── pengukuran di dalam halaman ─────────────────────────────────────── */

/**
 * Dijalankan DI DALAM peramban dan mengembalikan fakta, bukan penilaian.
 *
 * Keputusan lulus/gagal sengaja dibuat di Node: nilai mentahnya ikut tercetak
 * saat gagal, dan gerbang yang hanya berkata "false" memaksa orang berikutnya
 * mengulang seluruh penyelidikan dari nol.
 */
const PROBE = `(async () => {
  await document.fonts.ready;

  const akar = getComputedStyle(document.documentElement);
  const badan = getComputedStyle(document.body);
  const angka = document.querySelector('.numeric');

  /* Lebar teks pada 100px. Inilah pembeda antara "dideklarasikan" dan
     "benar-benar dipakai": deklarasi yang menunjuk font yang gagal dimuat
     tetap terbaca benar di CSS, tetapi lebarnya akan sama dengan fallback. */
  const ukur = (fontFamily, teks) => {
    const span = document.createElement('span');
    span.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;font-family:' +
      fontFamily;
    span.textContent = teks;
    document.body.appendChild(span);
    const lebar = Math.round(span.getBoundingClientRect().width * 100) / 100;
    span.remove();
    return lebar;
  };

  const TEKS = 'Uangmu 123456';
  const NOMINAL = 'Rp 4.180.000';

  return {
    fontSans: akar.getPropertyValue('--font-sans').trim(),
    fontMono: akar.getPropertyValue('--font-mono').trim(),
    fontInter: akar.getPropertyValue('--font-inter').trim(),
    fontMonoStack: akar.getPropertyValue('--font-mono-stack').trim(),

    badanFontFamily: badan.fontFamily,
    adaNumeric: angka !== null,
    numericFontFamily: angka ? getComputedStyle(angka).fontFamily : null,
    numericVariant: angka ? getComputedStyle(angka).fontVariantNumeric : null,

    /* Keluarga yang berkas fontnya BENAR-BENAR selesai dimuat. */
    keluargaDimuat: [...document.fonts]
      .filter((f) => f.status === 'loaded')
      .map((f) => f.family),

    lebarBadan: ukur(badan.fontFamily, TEKS),
    lebarInterDipaksa: ukur('Inter', TEKS),
    lebarGenerikSans: ukur('sans-serif', TEKS),

    lebarNumeric: angka ? ukur(getComputedStyle(angka).fontFamily, NOMINAL) : null,
    lebarMonoDipaksa: ukur('"JetBrains Mono"', NOMINAL),
    lebarGenerikSerif: ukur('serif', NOMINAL),
  };
})()`;

/* ── penegasan ───────────────────────────────────────────────────────── */

function periksa(f) {
  bagian('1. Properti kustom di :root benar-benar menghitung menjadi sesuatu');

  /* INI penegasan intinya. Pada cacat yang dijaga, keduanya string KOSONG —
     dan seluruh gerbang lain di repositori ini tetap hijau. */
  if (f.fontSans.length > 0) ok(`--font-sans terisi (${f.fontSans.slice(0, 46)}…)`);
  else bad('--font-sans KOSONG di :root', 'var() gagal disubstitusi — masukannya tidak ada di :root');

  if (f.fontMono.length > 0) ok(`--font-mono terisi (${f.fontMono.slice(0, 46)}…)`);
  else bad('--font-mono KOSONG di :root', 'var() gagal disubstitusi — masukannya tidak ada di :root');

  /* Sumber substitusinya harus berada di :root, bukan lebih rendah. Tanpa
     penegasan ini, gerbang di atas dapat dipuaskan dengan menuliskan nama
     keluarga langsung — yang membuang metrik fallback `next/font` dan
     mengembalikan pergeseran tata letak yang justru dihindari. */
  if (f.fontInter.length > 0) ok('--font-inter tersedia di :root');
  else bad('--font-inter tidak ada di :root', 'kelas next/font harus berada di <html>, bukan <body>');

  if (f.fontMonoStack.length > 0) ok('--font-mono-stack tersedia di :root');
  else bad('--font-mono-stack tidak ada di :root', 'kelas next/font harus berada di <html>, bukan <body>');

  bagian('2. Tumpukan yang dimaksud benar-benar terpilih');

  if (/\bInter\b/.test(f.fontSans)) ok('--font-sans memuat Inter');
  else bad('--font-sans tidak memuat Inter', f.fontSans || '(kosong)');

  if (/JetBrains Mono/.test(f.fontMono)) ok('--font-mono memuat JetBrains Mono');
  else bad('--font-mono tidak memuat JetBrains Mono', f.fontMono || '(kosong)');

  if (/^\s*(["']?)Inter\1/.test(f.badanFontFamily)) ok('<body> memakai Inter sebagai keluarga pertama');
  else bad('<body> TIDAK memakai Inter', f.badanFontFamily);

  bagian('3. Nominal uang memakai JetBrains Mono');

  if (!f.adaNumeric) {
    /* Halaman tanpa `.numeric` membuat separuh gerbang ini diam-diam tidak
       menguji apa pun. Itu kegagalan, bukan kondisi yang boleh dilewati. */
    bad('tidak ada elemen .numeric di halaman', 'gerbang tidak dapat memverifikasi font uang');
  } else {
    if (/JetBrains Mono/.test(f.numericFontFamily)) ok('.numeric memakai JetBrains Mono');
    else bad('.numeric TIDAK memakai JetBrains Mono', f.numericFontFamily);

    if (f.numericVariant.includes('tabular-nums')) ok('.numeric memakai tabular-nums');
    else bad('.numeric kehilangan tabular-nums', f.numericVariant);
  }

  bagian('4. Berkas fontnya benar-benar dimuat, bukan sekadar dirujuk');

  if (f.keluargaDimuat.some((k) => /\bInter\b/.test(k))) ok('berkas Inter selesai dimuat');
  else bad('tidak ada berkas Inter yang dimuat', `keluarga dimuat: ${JSON.stringify(f.keluargaDimuat)}`);

  if (f.keluargaDimuat.some((k) => /JetBrains Mono/.test(k))) ok('berkas JetBrains Mono selesai dimuat');
  else bad('tidak ada berkas JetBrains Mono yang dimuat', `keluarga dimuat: ${JSON.stringify(f.keluargaDimuat)}`);

  bagian('5. Bukti piksel — bentuk yang dirender, bukan yang dijanjikan');

  /*
   * Perbandingan dipilih supaya DETERMINISTIK lintas sistem operasi.
   *
   * Lebar fallback sistem BERBEDA di tiap OS (Segoe UI di Windows, DejaVu di
   * runner Linux), jadi tidak ada angka mutlak yang boleh ditulis di sini.
   * Yang stabil adalah dua hubungan berikut, dan keduanya cukup:
   *
   *   badan == Inter-yang-dipaksa   → yang dirender memang Inter
   *   badan != sans-serif generik   → dan ia bukan sekadar fallback sistem
   *
   * Berkas font di-hosting sendiri oleh `next/font`, jadi metrik Inter identik
   * di mesin mana pun — kesamaan yang pertama tidak bergantung pada OS.
   */
  if (f.lebarBadan === f.lebarInterDipaksa) {
    ok(`lebar teks badan sama dengan Inter (${String(f.lebarBadan)}px)`);
  } else {
    bad(
      'teks badan TIDAK dirender dengan Inter',
      `badan ${String(f.lebarBadan)}px vs Inter ${String(f.lebarInterDipaksa)}px`,
    );
  }

  if (f.lebarBadan !== f.lebarGenerikSans) {
    ok('teks badan berbeda dari sans-serif generik');
  } else {
    bad(
      'teks badan identik dengan sans-serif generik',
      `keduanya ${String(f.lebarBadan)}px — Inter kemungkinan gagal dimuat`,
    );
  }

  if (f.adaNumeric) {
    if (f.lebarNumeric === f.lebarMonoDipaksa) {
      ok(`lebar nominal sama dengan JetBrains Mono (${String(f.lebarNumeric)}px)`);
    } else {
      bad(
        'nominal TIDAK dirender dengan JetBrains Mono',
        `nominal ${String(f.lebarNumeric)}px vs JetBrains Mono ${String(f.lebarMonoDipaksa)}px`,
      );
    }

    if (f.lebarNumeric !== f.lebarGenerikSerif) {
      ok('nominal berbeda dari serif generik');
    } else {
      bad('nominal identik dengan serif generik', 'JetBrains Mono kemungkinan gagal dimuat');
    }
  }
}

/* ── jalan ───────────────────────────────────────────────────────────── */

/** Menunggu peladen dengan menjajalnya, bukan dengan tidur sekian detik. */
async function tungguPeladen(url) {
  for (let percobaan = 0; percobaan < 120; percobaan += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status > 0) return true;
    } catch {
      await sleep(500);
    }
  }
  return false;
}

async function main() {
  console.log('\u001b[1mGERBANG REGRESI TIPOGRAFI\u001b[0m');
  console.log(`sasaran: ${BASE}\n`);

  if (!(await tungguPeladen(BASE))) {
    console.error(
      `Peladen di ${BASE} tidak pernah menjawab.\n` +
        'Bangun dan jalankan aplikasinya lebih dulu:\n' +
        '  npm run build && npx next start -p 3100 &',
    );
    process.exit(2);
  }

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      /* Runner CI berjalan sebagai root di dalam kontainer; tanpa ini Chrome
         menolak start dan gerbangnya gagal karena alasan yang tidak ada
         hubungannya dengan tipografi. */
      '--no-sandbox',
      `--user-data-dir=${PROFILE}`,
    ],
    { stdio: 'ignore' },
  );

  let cdp = null;
  try {
    let target = null;
    /* Tidur di SETIAP putaran yang belum menemukan target, bukan hanya saat
       fetch melempar. Chrome dapat menjawab `/json/list` sebelum target
       halamannya ada; dengan `sleep` hanya di `catch`, keenam puluh putaran
       habis dalam hitungan milidetik dan gerbangnya gagal dengan kalimat yang
       menyesatkan — portanya justru sudah terbuka. */
    for (let percobaan = 0; percobaan < 60 && target === null; percobaan += 1) {
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

    cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: BASE });

    /* Kesiapan ditanyakan, bukan ditunggu sekian detik. */
    let siap = false;
    for (let percobaan = 0; percobaan < 80 && !siap; percobaan += 1) {
      try {
        siap = (await evaluate(cdp, 'document.readyState')) === 'complete';
      } catch {
        /* Konteks eksekusi masih berganti saat navigasi. */
      }
      if (!siap) await sleep(250);
    }
    if (!siap) throw new Error(`Halaman ${BASE} tidak pernah selesai dimuat.`);

    periksa(await evaluate(cdp, PROBE));
  } finally {
    cdp?.close();
    chrome.kill();
  }

  console.log(`\n${'─'.repeat(48)}`);
  console.log(`LULUS ${String(lulus)}   GAGAL ${String(gagal)}`);

  if (gagal > 0) {
    console.log(
      '\n\u001b[31mTIPOGRAFI TIDAK SESUAI RANCANGAN.\u001b[0m\n' +
        'Periksa bahwa kelas variabel `next/font` berada di <html> — bukan di\n' +
        '<body> — supaya `--font-inter` dan `--font-mono-stack` ada di :root,\n' +
        'tempat `@theme` menyusun `--font-sans` dan `--font-mono` dari keduanya.',
    );
    process.exit(1);
  }

  console.log('\n\u001b[32mInter dan JetBrains Mono benar-benar dirender.\u001b[0m');
}

await main();
