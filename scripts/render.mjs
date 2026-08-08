#!/usr/bin/env node
/**
 * Gerbang regresi KELUARAN TERENDER.
 *
 * ── APA YANG DIJAGA ────────────────────────────────────────────────────
 *
 * Gerbang tipografi (`typography.mjs`) menjaga satu hal dengan sangat rapat:
 * font. Berkas ini memperluas perlindungan yang sama ke sisa halaman muka —
 * kelas cacat yang lolos typecheck, lint, uji unit, dan `next build`, lalu
 * salah ketika benar-benar dirender.
 *
 * Kelas itu BUKAN hipotesis. Ia sudah terjadi tiga kali di repositori ini:
 *
 *   1. Bentuk ringkas `animation:` menyetel durasi 0s, dan animasi berdurasi
 *      nol pada lini masa gulir duduk di keadaan AKHIR selamanya — maskot
 *      TIDAK TERLIHAT SAMA SEKALI, sementara skor Lighthouse justru MEMBAIK
 *      karena kanvas transparan lebih murah dirender.
 *   2. `--font-sans` menghitung menjadi kosong; seluruh aplikasi tampil dengan
 *      font sistem.
 *   3. Peladen standalone mengikat ke `HOSTNAME` yang salah; halaman tidak
 *      pernah dilayani sama sekali.
 *
 * Tidak satu pun dari ketiganya memerahkan gerbang mana pun yang sudah ada.
 *
 * ── PRINSIP PENEGASAN ──────────────────────────────────────────────────
 *
 * TIDAK ADA nilai piksel absolut yang ditulis. Ukuran mutlak berubah menurut
 * viewport, DPI, dan versi font — menuliskannya menghasilkan gerbang yang
 * memerah setiap kali seseorang menyentuh tata letak, dan gerbang yang sering
 * memerah tanpa sebab akan dimatikan orang.
 *
 * Yang ditegaskan: keberadaan, VISIBILITAS, dimensi bukan-nol, hubungan
 * relatif antar-elemen, gaya terhitung, dan keadaan runtime (galat konsol,
 * permintaan gagal, pergeseran tata letak).
 *
 * Jalankan (sama seperti typography.mjs — butuh peladen standalone hidup):
 *   npm run build
 *   cp -r .next/static .next/standalone/.next/static
 *   PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js &
 *   node scripts/render.mjs --base http://localhost:3100
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
const PORT = 9335; // berbeda dari screenshots.mjs (9333) dan typography.mjs (9334)
const PROFILE = join(tmpdir(), `kantongz-render-${String(process.pid)}`);

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
    throw new Error('Chrome tidak ditemukan. Setel CHROME_PATH ke berkas biner Chrome atau Chromium.');
  }
  return found;
}

/* ── klien CDP ───────────────────────────────────────────────────────── */

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
      socket.addEventListener('error', () => { rejectPromise(new Error(`Gagal terhubung ke ${url}`)); }, { once: true });
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

  close() { this.#socket.close(); }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`Galat di halaman: ${result.exceptionDetails.text}`);
  return result.result.value;
}

/* ── pelaporan ───────────────────────────────────────────────────────── */

let lulus = 0;
let gagal = 0;
const ok = (m) => { lulus += 1; console.log(`  \u001b[32mOK  \u001b[0m ${m}`); };
const bad = (m, d) => {
  gagal += 1;
  console.log(`  \u001b[31mGAGAL\u001b[0m ${m}`);
  if (d !== undefined) console.log(`        → ${d}`);
};
const bagian = (t) => { console.log(`\n\u001b[1m${t}\u001b[0m`); };
const cek = (kondisi, pesanOk, pesanGagal, detail) => (kondisi ? ok(pesanOk) : bad(pesanGagal, detail));

/* ── instrumentasi, dipasang SEBELUM dokumen dibuat ──────────────────────
   Galat konsol dan pergeseran tata letak hanya dapat ditangkap kalau
   pengamatnya sudah ada sebelum halaman berjalan. Dipasang lewat
   `Page.addScriptToEvaluateOnNewDocument`, bukan sesudah `load`. */

const INSTRUMENT = `
(() => {
  window.__kz = { errors: [], cls: 0, shifts: 0 };
  const asli = console.error;
  console.error = (...a) => { window.__kz.errors.push(a.map(String).join(' ').slice(0, 300)); asli(...a); };
  addEventListener('error', (e) => { window.__kz.errors.push('window.onerror: ' + (e.message || String(e.error)).slice(0, 300)); });
  addEventListener('unhandledrejection', (e) => { window.__kz.errors.push('unhandledrejection: ' + String(e.reason).slice(0, 300)); });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) { window.__kz.cls += entry.value; window.__kz.shifts += 1; }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
`;

/* ── pengumpulan fakta di dalam halaman ──────────────────────────────── */

const PROBE = `(async () => {
  await document.fonts.ready;

  const kotak = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top + window.scrollY), left: Math.round(r.left),
      opacity: Number(cs.opacity), display: cs.display, visibility: cs.visibility,
    };
  };
  const terlihat = (b) => b !== null && b.w > 0 && b.h > 0 && b.opacity > 0.01 && b.display !== 'none' && b.visibility !== 'hidden';

  const header = document.querySelector('header');
  const nav = document.querySelector('header nav');
  const h1 = document.querySelector('h1');
  const ctaUtama = document.querySelector('main a[href="/daftar"], a[href="/daftar"]');
  const heroSink = document.querySelector('.hero-sink');
  const numeric = document.querySelector('.numeric');
  const footer = document.querySelector('footer');
  const demo = document.querySelector('.glass-strong');

  /* Maskot: 3D (canvas) ATAU pengganti statis berbasis CSS. Keduanya sah —
     yang TIDAK sah adalah wilayah maskot yang kosong atau tak terlihat. */
  const canvas = heroSink ? heroSink.querySelector('canvas') : null;
  const anakMaskot = heroSink ? [...heroSink.querySelectorAll('*')].filter((el) => {
    const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8;
  }).length : 0;

  /* Elemen di ATAS lipatan yang masih tersembunyi sesudah muat = cacat
     "animasi menyembunyikan isi" yang pernah terjadi. */
  const lipatan = window.innerHeight;
  const tersembunyiAtasLipatan = [...document.querySelectorAll('[data-rise], [data-reveal]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top >= lipatan || r.height === 0) return false;
      return Number(getComputedStyle(el).opacity) < 0.01;
    })
    .map((el) => (el.textContent || el.className || el.tagName).slice(0, 60));

  const gagalJaringan = performance.getEntriesByType('resource')
    .filter((r) => r.responseStatus && r.responseStatus >= 400)
    .map((r) => r.responseStatus + ' ' + r.name.replace(location.origin, ''));

  const akar = getComputedStyle(document.documentElement);
  const badan = getComputedStyle(document.body);

  return {
    readyState: document.readyState,
    judul: document.title,
    tema: document.documentElement.getAttribute('data-theme'),

    header: kotak(header), navLinks: nav ? nav.querySelectorAll('a').length : 0,
    h1: kotak(h1), h1Teks: h1 ? h1.innerText.trim().slice(0, 60) : null,
    cta: kotak(ctaUtama), ctaTeks: ctaUtama ? ctaUtama.innerText.trim().slice(0, 40) : null,
    heroSink: kotak(heroSink), adaCanvas: canvas !== null, canvasKotak: kotak(canvas), anakMaskot,
    demo: kotak(demo), footer: kotak(footer),

    terlihat: {
      header: terlihat(kotak(header)), h1: terlihat(kotak(h1)), cta: terlihat(kotak(ctaUtama)),
      heroSink: terlihat(kotak(heroSink)), footer: terlihat(kotak(footer)),
    },

    fontBadan: badan.fontFamily,
    fontNumeric: numeric ? getComputedStyle(numeric).fontFamily : null,
    adaNumeric: numeric !== null,
    tokenBg: akar.getPropertyValue('--bg').trim(),
    warnaBadan: badan.backgroundColor,
    inkBadan: badan.color,

    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    tinggiDokumen: document.documentElement.scrollHeight,

    seksiPenting: ['#fitur', '#mesin-ai', '#arsitektur', '#keamanan', '#harga', '#tanya-jawab']
      .map((s) => ({ s, ada: document.querySelector(s) !== null })),

    tersembunyiAtasLipatan,

    errors: window.__kz ? window.__kz.errors : ['(instrumentasi tidak terpasang)'],
    cls: window.__kz ? Math.round(window.__kz.cls * 10000) / 10000 : null,
    shifts: window.__kz ? window.__kz.shifts : null,
    gagalJaringan,
  };
})()`;

/* ── penegasan ───────────────────────────────────────────────────────── */

function periksa(f, httpStatus) {
  bagian('1. Halaman dimuat dan permintaan pentingnya berhasil');
  cek(httpStatus === 200, `dokumen HTTP ${String(httpStatus)}`, 'dokumen tidak 200', httpStatus);
  cek(f.readyState === 'complete', 'readyState complete', 'halaman tidak selesai dimuat', f.readyState);
  cek(f.judul.length > 0, `judul terisi ("${f.judul.slice(0, 40)}…")`, 'judul kosong');
  cek(f.gagalJaringan.length === 0, 'tidak ada permintaan yang gagal', `${String(f.gagalJaringan.length)} permintaan gagal`, JSON.stringify(f.gagalJaringan.slice(0, 4)));

  bagian('2. Elemen kritis ADA');
  cek(f.header !== null, 'header ada', 'header TIDAK ADA');
  cek(f.navLinks > 0, `navigasi ada (${String(f.navLinks)} tautan)`, 'navigasi tidak punya tautan');
  cek(f.h1 !== null && (f.h1Teks ?? '').length > 0, `hero h1 ada ("${(f.h1Teks ?? '').slice(0, 34)}…")`, 'hero h1 tidak ada atau kosong');
  cek(f.cta !== null, `CTA utama ada ("${f.ctaTeks ?? ''}")`, 'CTA /daftar TIDAK ADA');
  cek(f.footer !== null, 'footer ada', 'footer TIDAK ADA');
  cek(f.adaNumeric, 'elemen .numeric ada', 'tidak ada .numeric — nominal uang tidak dapat diperiksa');
  const seksiHilang = f.seksiPenting.filter((s) => !s.ada).map((s) => s.s);
  cek(seksiHilang.length === 0, `enam seksi utama ada`, 'ada seksi utama yang hilang', seksiHilang.join(', '));

  bagian('3. Elemen kritis benar-benar TERLIHAT');
  for (const [nama, v] of Object.entries(f.terlihat)) {
    cek(v, `${nama} terlihat`, `${nama} TIDAK TERLIHAT`, JSON.stringify(f[nama] ?? null));
  }

  bagian('4. Dimensi bukan-nol');
  for (const nama of ['header', 'h1', 'cta', 'heroSink', 'footer']) {
    const b = f[nama];
    cek(b !== null && b.w > 0 && b.h > 0, `${nama} berdimensi ${b ? `${String(b.w)}×${String(b.h)}` : '?'}`, `${nama} berdimensi nol`, JSON.stringify(b));
  }

  bagian('5. Maskot benar-benar dirender');
  /* Kanvas 3D dan pengganti statis SAMA-SAMA sah; yang tidak sah adalah
     wilayah maskot yang kosong. Cacat nyata yang pernah terjadi persis ini:
     kanvas ada, tetapi induknya `opacity: 0` — jadi keberadaan saja tidak
     cukup, visibilitasnya yang menentukan. */
  cek(f.heroSink !== null, 'wilayah maskot ada', 'wilayah maskot TIDAK ADA');
  cek(f.terlihat.heroSink, `wilayah maskot terlihat (opacity ${String(f.heroSink?.opacity ?? '?')})`, 'wilayah maskot TIDAK TERLIHAT — inilah cacat animasi berdurasi-nol', JSON.stringify(f.heroSink));
  if (f.adaCanvas) {
    cek((f.canvasKotak?.w ?? 0) > 0 && (f.canvasKotak?.h ?? 0) > 0, `kanvas 3D dirender ${String(f.canvasKotak?.w)}×${String(f.canvasKotak?.h)}`, 'kanvas 3D berdimensi nol', JSON.stringify(f.canvasKotak));
  } else {
    cek(f.anakMaskot > 0, `pengganti statis dirender (${String(f.anakMaskot)} bagian terlihat)`, 'tidak ada kanvas DAN tidak ada pengganti statis');
  }

  bagian('6. Gerak masuk tidak menyembunyikan isi');
  cek(f.tersembunyiAtasLipatan === undefined || f.tersembunyiAtasLipatan.length === 0,
    'tidak ada elemen di atas lipatan yang tertinggal tersembunyi',
    `${String(f.tersembunyiAtasLipatan?.length ?? 0)} elemen di atas lipatan masih opacity 0`,
    JSON.stringify((f.tersembunyiAtasLipatan ?? []).slice(0, 3)));

  bagian('7. Gaya terhitung dan tipografi masih sah');
  cek(f.tema === 'dark' || f.tema === 'light', `tema terpasang (${String(f.tema)})`, 'atribut data-theme tidak terpasang', f.tema);
  cek(f.tokenBg.length > 0, `token --bg terisi (${f.tokenBg})`, 'token --bg KOSONG — sistem desain tidak termuat');
  cek(f.warnaBadan !== 'rgba(0, 0, 0, 0)' && f.warnaBadan !== 'transparent', `latar badan terpasang (${f.warnaBadan})`, 'latar badan transparan — CSS kemungkinan tidak termuat', f.warnaBadan);
  cek(/^\s*(["']?)Inter\1/.test(f.fontBadan), 'badan memakai Inter', 'badan TIDAK memakai Inter', f.fontBadan.slice(0, 70));
  cek(f.fontNumeric !== null && /JetBrains Mono/.test(f.fontNumeric), '.numeric memakai JetBrains Mono', '.numeric TIDAK memakai JetBrains Mono', String(f.fontNumeric).slice(0, 70));

  bagian('8. Tata letak masuk akal');
  cek(f.scrollWidth <= f.clientWidth + 1, `tidak ada luapan mendatar (${String(f.scrollWidth)} ≤ ${String(f.clientWidth)})`, 'ADA luapan mendatar', `scrollWidth ${String(f.scrollWidth)} > clientWidth ${String(f.clientWidth)}`);
  cek((f.h1?.w ?? 0) <= f.clientWidth, 'hero h1 tidak melampaui lebar viewport', 'hero h1 lebih lebar daripada viewport', `${String(f.h1?.w)} > ${String(f.clientWidth)}`);
  cek((f.header?.top ?? 1e9) <= (f.h1?.top ?? -1), 'header berada di atas hero', 'urutan header/hero terbalik', `header.top=${String(f.header?.top)} h1.top=${String(f.h1?.top)}`);
  if (f.demo !== null) {
    cek((f.h1?.top ?? 1e9) < f.demo.top, 'hero berada di atas panel pratinjau', 'urutan hero/pratinjau terbalik');
  }
  cek((f.footer?.top ?? -1) > (f.h1?.top ?? 1e9), 'footer berada di bawah hero', 'urutan footer/hero terbalik');
  cek(f.tinggiDokumen > f.clientWidth, `dokumen punya isi (tinggi ${String(f.tinggiDokumen)}px)`, 'dokumen terlalu pendek — isi kemungkinan tidak dirender');

  bagian('9. Keadaan runtime bersih');
  /* Three.js mencetak PERINGATAN deprecation; itu `console.warn`, bukan
     `console.error`, jadi ia sengaja tidak ditangkap di sini. Yang ditangkap
     adalah galat sungguhan, `window.onerror`, dan promise yang tidak tertangani. */
  cek(f.errors.length === 0, 'tidak ada galat konsol dari aplikasi', `${String(f.errors.length)} galat konsol`, JSON.stringify(f.errors.slice(0, 3)));
  cek(f.cls !== null, `pergeseran tata letak terukur (${String(f.shifts)} pergeseran)`, 'CLS tidak terukur — instrumentasi gagal');
  cek((f.cls ?? 1) < 0.1, `CLS ${String(f.cls)} < 0,1`, `CLS ${String(f.cls)} melewati ambang 0,1`, `${String(f.shifts)} pergeseran`);
}

/* ── jalan ───────────────────────────────────────────────────────────── */

async function tungguPeladen(url) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status > 0) return r.status;
    } catch { await sleep(500); }
  }
  return 0;
}

async function main() {
  console.log('\u001b[1mGERBANG REGRESI KELUARAN TERENDER\u001b[0m');
  console.log(`sasaran: ${BASE}\n`);

  const status = await tungguPeladen(BASE);
  if (status === 0) {
    console.error(
      `Peladen di ${BASE} tidak pernah menjawab.\n` +
        'Bangun dan jalankan aplikasinya lebih dulu:\n' +
        '  npm run build\n' +
        '  cp -r .next/static .next/standalone/.next/static\n' +
        '  PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js &',
    );
    process.exit(2);
  }

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      /* SwiftShader memberi WebGL pada mesin tanpa GPU. Tanpa ini, tingkat
         grafis jatuh ke `off` dan jalur maskot yang diuji bukan jalur yang
         dilihat pengguna ber-GPU. */
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--no-sandbox',
      /* Viewport TETAP: hubungan tata letak yang diuji di bawah harus
         dibandingkan pada lebar yang sama di setiap mesin. */
      '--window-size=1280,900',
      `--user-data-dir=${PROFILE}`,
    ],
    { stdio: 'ignore' },
  );

  let cdp = null;
  try {
    let target = null;
    for (let i = 0; i < 60 && target === null; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${String(PORT)}/json/list`);
        target = (await res.json()).find((t) => t.type === 'page') ?? null;
      } catch { await sleep(250); }
    }
    if (target === null) throw new Error('Chrome tidak pernah membuka port debug.');

    cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    /* WAJIB sebelum navigasi: pengamat galat dan pergeseran tata letak tidak
       dapat menangkap apa pun yang terjadi sebelum ia dipasang. */
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });

    await cdp.send('Page.navigate', { url: BASE });

    let siap = false;
    for (let i = 0; i < 80 && !siap; i += 1) {
      try { siap = (await evaluate(cdp, 'document.readyState')) === 'complete'; } catch { /* konteks berganti */ }
      if (!siap) await sleep(250);
    }
    if (!siap) throw new Error(`Halaman ${BASE} tidak pernah selesai dimuat.`);

    /* Jeda menetap: pengamat masuk-viewport, adegan 3D, dan pemuatan font
       semuanya menyelesaikan pekerjaannya sesudah `load`. Menegaskan sebelum
       itu menghasilkan gerbang yang memerah sesekali tanpa pola — dan gerbang
       yang tidak stabil lebih buruk daripada tidak ada gerbang. */
    await sleep(2500);

    periksa(await evaluate(cdp, PROBE), status);
  } finally {
    cdp?.close();
    chrome.kill();
  }

  console.log(`\n${'─'.repeat(48)}`);
  console.log(`LULUS ${String(lulus)}   GAGAL ${String(gagal)}`);

  if (gagal > 0) {
    console.log('\n\u001b[31mKELUARAN TERENDER TIDAK SESUAI KONTRAK.\u001b[0m');
    process.exit(1);
  }
  console.log('\n\u001b[32mHalaman muka dirender sesuai kontrak.\u001b[0m');
}

await main();
