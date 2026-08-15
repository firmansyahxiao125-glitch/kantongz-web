#!/usr/bin/env node
/**
 * Gerbang PWA. H1.
 *
 * ── MENGAPA TERHADAP BUILD PRODUKSI, BUKAN `next dev` ──────────────────
 *
 * Service worker sengaja TIDAK didaftarkan di luar produksi (lihat
 * `components/pwa/daftar-sw.tsx`). Gerbang yang berjalan terhadap `next dev`
 * karena itu akan memeriksa aplikasi yang perilaku PWA-nya memang tidak ada,
 * lalu hijau tanpa membuktikan apa pun.
 *
 * Jalankan:
 *   npm run build && npm start          (di terminal lain, porta 3000)
 *   node scripts/pwa.mjs --base http://localhost:3000
 *
 * ── YANG PALING PENTING DI BERKAS INI ──────────────────────────────────
 *
 * Pemeriksaan "tidak satu pun jawaban API tersimpan". Sisa gerbang ini
 * memeriksa bahwa PWA-nya BEKERJA; yang satu itu memeriksa bahwa ia tidak
 * diam-diam menyimpan saldo seseorang ke disk — kegagalan yang tidak akan
 * pernah dilaporkan sebagai bug oleh siapa pun, karena aplikasinya justru
 * terasa lebih cepat.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const MAKS_TARGET = 160;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = arg('base', 'http://localhost:3000');
const PORT = 9338;
const PROFILE = join(tmpdir(), `kantongz-pwa-${String(process.pid)}`);

let lulus = 0;
let gagal = 0;

function ok(nama, syarat, extra = '') {
  if (syarat) {
    lulus += 1;
    console.log(`  OK    ${nama} ${extra}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL ${nama} ${extra}`);
  }
}

/* ── nilai yang WAJIB sama dengan sumbernya ──────────────────────────── */

/**
 * Warna tema, disalin dari `app/layout.tsx`.
 *
 * Manifest dan `<meta name="theme-color">` dibaca sistem operasi sebelum CSS
 * mana pun dimuat, jadi keduanya berisi literal. Literal yang tersebar di dua
 * berkas akan berselisih pada perubahan pertama yang menyentuh salah satunya,
 * dan gejalanya adalah layar splash yang warnanya sedikit berbeda dari
 * aplikasinya — tidak pernah dilaporkan, selalu terasa.
 */
const BG_GELAP = '#06070a';

const IKON_WAJIB = [
  { berkas: 'icon-192.png', sisi: 192 },
  { berkas: 'icon-512.png', sisi: 512 },
  { berkas: 'icon-maskable-512.png', sisi: 512 },
];

/* ── Chrome ──────────────────────────────────────────────────────────── */

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

class Cdp {
  #socket;
  #next = 1;
  #pending = new Map();

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => {
      const m = JSON.parse(event.data);
      if (m.id === undefined) return;
      const entry = this.#pending.get(m.id);
      this.#pending.delete(m.id);
      if (!entry) return;
      if (m.error) entry.reject(new Error(JSON.stringify(m.error)));
      else entry.resolve(m.result);
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((res, rej) => {
      socket.addEventListener('open', res, { once: true });
      socket.addEventListener('error', () => rej(new Error(`Gagal terhubung ke ${url}`)), {
        once: true,
      });
    });
    return new Cdp(socket);
  }

  /**
   * @param sessionId Sesi target LAIN, bila ada.
   *
   * Dibutuhkan karena service worker berjalan di targetnya SENDIRI. Perintah
   * tanpa `sessionId` hanya mengenai target halaman — lihat `luringkanSW`.
   */
  send(method, params = {}, sessionId) {
    const id = this.#next++;
    return new Promise((res, rej) => {
      this.#pending.set(id, { resolve: res, reject: rej });
      this.#socket.send(
        JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }),
      );
    });
  }

  close() {
    this.#socket.close();
  }
}

async function evaluate(cdp, expression) {
  const hasil = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (hasil.exceptionDetails) {
    throw new Error(hasil.exceptionDetails.exception?.description ?? 'galat evaluasi');
  }
  return hasil.result.value;
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
}

/**
 * Memutus jaringan DI DALAM service worker juga.
 *
 * ── SEBAB YANG DITEMUKAN GERBANG INI SENDIRI ───────────────────────────
 *
 * `Network.emulateNetworkConditions` berlaku pada target yang menerimanya, dan
 * service worker berjalan di TARGET TERSENDIRI. Memutus jaringan halaman saja
 * membuat `fetch()` di dalam `sw.js` tetap tembus ke peladen — jadi jaring
 * jatuh `/luring.html` tidak pernah terpakai, dan gerbang yang memeriksanya
 * akan melaporkan kegagalan yang menyesatkan: bukan "jaring jatuhnya rusak"
 * melainkan "jaringannya tidak benar-benar diputus".
 *
 * Dua jalanan pertama gerbang ini merah karena persis itu.
 *
 * @returns Jumlah target service worker yang berhasil diputus.
 */
async function luringkanSW(cdp, offline) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const pekerja = targetInfos.filter((t) => t.type === 'service_worker');

  let diputus = 0;
  for (const t of pekerja) {
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId: t.targetId,
      flatten: true,
    });
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send(
      'Network.emulateNetworkConditions',
      { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
      sessionId,
    );
    diputus += 1;
  }
  return diputus;
}

/* ── ikon: dibaca dari berkasnya, bukan dipercaya dari manifest ──────── */

/**
 * Lebar dan tinggi PNG dari tajuk IHDR.
 *
 * Manifest boleh MENGAKU 512x512; yang menentukan apa yang benar-benar ada di
 * berkasnya. Ikon yang ukurannya tidak sesuai deklarasi ditolak diam-diam oleh
 * sebagian peluncur Android — aplikasinya terpasang tanpa ikon, dan tidak ada
 * galat di mana pun.
 */
function ukuranPng(jalur) {
  const b = readFileSync(jalur);
  const tandaPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!b.subarray(0, 8).equals(tandaPng)) return null;
  if (b.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { lebar: b.readUInt32BE(16), tinggi: b.readUInt32BE(20) };
}

async function main() {
  console.log(`Gerbang PWA → ${BASE}\n`);

  /* ── berkas di disk ────────────────────────────────────────────────── */

  console.log('--- Ikon ---');
  for (const { berkas, sisi } of IKON_WAJIB) {
    const jalur = resolve('public', berkas);
    if (!existsSync(jalur)) {
      ok(`${berkas} ada`, false, '(tidak ditemukan)');
      continue;
    }
    const ukuran = ukuranPng(jalur);
    ok(
      `${berkas} PNG ${String(sisi)}x${String(sisi)}`,
      ukuran !== null && ukuran.lebar === sisi && ukuran.tinggi === sisi,
      ukuran ? `(${String(ukuran.lebar)}x${String(ukuran.tinggi)})` : '(bukan PNG)',
    );
  }

  /* ── manifest ──────────────────────────────────────────────────────── */

  console.log('\n--- Manifest ---');
  const resManifest = await fetch(`${BASE}/manifest.webmanifest`);
  ok('manifest dilayani', resManifest.ok, `(${String(resManifest.status)})`);

  const manifest = resManifest.ok ? await resManifest.json() : {};

  ok('punya name dan short_name', Boolean(manifest.name) && Boolean(manifest.short_name));
  ok('display standalone', manifest.display === 'standalone', `(${String(manifest.display)})`);
  ok(
    'start_url BUKAN halaman muka',
    typeof manifest.start_url === 'string' && manifest.start_url !== '/',
    `(${String(manifest.start_url)})`,
  );
  ok(
    `theme_color sama dengan --bg gelap`,
    manifest.theme_color === BG_GELAP,
    `(${String(manifest.theme_color)} vs ${BG_GELAP})`,
  );
  ok(
    'background_color sama dengan theme_color',
    manifest.background_color === BG_GELAP,
    `(${String(manifest.background_color)})`,
  );

  const ikon = Array.isArray(manifest.icons) ? manifest.icons : [];
  ok('punya ikon 192 dan 512', ikon.some((i) => i.sizes === '192x192') && ikon.some((i) => i.sizes === '512x512'));
  /* `maskable` TERPISAH dari `any`. Android memotong ikon maskable dan hanya
     menjamin 80% bagian tengahnya terlihat; ikon `any` yang dipakai ulang akan
     terpotong bilahnya di sebagian peluncur. */
  ok(
    'punya ikon maskable TERPISAH',
    ikon.some((i) => i.purpose === 'maskable') && ikon.some((i) => i.purpose === 'any'),
  );

  /* ── peramban ──────────────────────────────────────────────────────── */

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${PROFILE}`,
    ],
    { stdio: 'ignore' },
  );

  try {
    let target = null;
    for (let attempt = 0; attempt < MAKS_TARGET && target === null; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${String(PORT)}/json/list`);
        target = (await response.json()).find((t) => t.type === 'page') ?? null;
      } catch {
        /* belum siap */
      }
      if (target === null) await sleep(250);
    }
    if (target === null) throw new Error('Chrome tidak pernah membuka target halaman.');

    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    console.log('\n--- Service worker ---');

    await goto(cdp, `${BASE}/masuk`);

    /* Menunggu AKTIF, bukan sekadar terdaftar. Service worker yang terpasang
       tetapi belum mengambil alih tidak menjawab satu permintaan pun. */
    const aktif = await evaluate(
      cdp,
      `(async () => {
         if (!('serviceWorker' in navigator)) return 'tidak didukung';
         const reg = await Promise.race([
           navigator.serviceWorker.ready.then(() => 'siap'),
           new Promise((r) => setTimeout(() => r('batas waktu'), 15000)),
         ]);
         return reg;
       })()`,
    );
    ok('service worker AKTIF', aktif === 'siap', `(${String(aktif)})`);

    /* Muat ulang sekali: `clients.claim()` mengambil alih klien yang sudah
       ada, tetapi cangkangnya baru terisi sesudah satu putaran permintaan. */
    await goto(cdp, `${BASE}/masuk`);
    await sleep(800);

    console.log('\n--- Yang TIDAK boleh tersimpan ---');

    const isiCache = await evaluate(
      cdp,
      `(async () => {
         const nama = await caches.keys();
         const semua = [];
         for (const n of nama) {
           const c = await caches.open(n);
           for (const req of await c.keys()) semua.push(req.url);
         }
         return semua;
       })()`,
    );

    const daftar = Array.isArray(isiCache) ? isiCache : [];
    ok('cangkang benar-benar ter-cache', daftar.length > 0, `(${String(daftar.length)} entri)`);

    /*
       INTI GERBANG INI.

       Tidak satu byte pun jawaban API boleh tersimpan. Saldo dari cache adalah
       angka salah yang ditampilkan dengan percaya diri penuh, dan cache
       service worker bertahan sesudah keluar akun — pada ponsel bersama,
       laptop pinjaman, dan perangkat yang dijual, riwayat transaksi seseorang
       tinggal di disk tanpa satu pun jalur di aplikasi yang membersihkannya.
    */
    const asalWeb = new URL(BASE).origin;
    const asing = daftar.filter((u) => new URL(u).origin !== asalWeb);
    ok('TIDAK ada entri dari asal lain (API)', asing.length === 0, asing.slice(0, 3).join(', '));

    const jalurApi = daftar.filter((u) => new URL(u).pathname.startsWith('/api/'));
    ok('TIDAK ada entri /api/', jalurApi.length === 0, jalurApi.slice(0, 3).join(', '));

    /* Halaman aplikasi pun tidak boleh ikut ter-cache: HTML-nya memuat
       kerangka pembukuan, dan menyajikannya dari cache menghasilkan kedipan
       angka lama sebelum data segar tiba. */
    const halamanApp = daftar.filter((u) => /\/(dasbor|transaksi|dompet|anggaran|laporan)\b/.test(u));
    ok('TIDAK ada halaman dalam-aplikasi ter-cache', halamanApp.length === 0, halamanApp.slice(0, 2).join(', '));

    console.log('\n--- Luring ---');

    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    /*
       ── PEMERIKSAAN PERTAMA: LURING DENGAN CANGKANG YANG MASIH ADA ──────

       Chrome menyimpan HTML halaman statis di HTTP cache-nya SENDIRI, di luar
       kendali service worker. Jadi pengguna yang luring pada halaman yang baru
       saja ia buka tetap melihat aplikasinya, bukan halaman luring.

       Itu perilaku yang benar dan tidak perlu dilawan — cangkangnya tidak
       memuat satu angka pun. Yang WAJIB benar adalah akibatnya: tidak ada
       nominal rupiah di layar. Inilah jaminan yang sebenarnya dijanjikan H1,
       dan ia diperiksa pada halaman yang paling padat angka.

       Ditemukan gerbang ini pada jalanan pertama: versi sebelumnya menuntut
       halaman luring di sini dan MERAH — bukan karena ada yang rusak,
       melainkan karena asumsinya tentang HTTP cache salah.
    */
    await goto(cdp, `${BASE}/dasbor`);
    const teksShell = String((await evaluate(cdp, 'document.body.innerText')) ?? '');
    ok(
      'luring dengan cangkang: TIDAK ada nominal rupiah',
      !/Rp\s?[\d.]{4,}/.test(teksShell),
      `(${teksShell.slice(0, 34).replace(/\s+/g, ' ')}…)`,
    );

    /*
       ── PEMERIKSAAN KEDUA: HALAMAN YANG BELUM PERNAH DIMUAT ─────────────

       HTTP cache dimatikan supaya `fetch()` di dalam service worker
       benar-benar gagal. Hanya di jalur inilah jaring jatuh `/luring.html`
       terpakai, dan tanpa mematikannya gerbang ini akan hijau meski jaring
       jatuhnya tidak pernah ditulis.
    */
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

    /* Dan jaringan DI DALAM service worker ikut diputus — tanpa ini,
       `fetch()` di `sw.js` tetap tembus dan jaring jatuhnya tak terpakai. */
    const diputus = await luringkanSW(cdp, true);
    ok('jaringan service worker benar-benar diputus', diputus > 0, `(${String(diputus)} target)`);

    await goto(cdp, `${BASE}/laporan?tanpa-cache=${String(Date.now())}`);

    const teks = String((await evaluate(cdp, 'document.body.innerText')) ?? '');

    ok(
      'halaman baru saat luring dijawab halaman luring',
      /luring/i.test(teks),
      `(${teks.slice(0, 34).replace(/\s+/g, ' ')}…)`,
    );
    ok('halaman luring menyebut datanya TIDAK disimpan', /tidak disimpan/i.test(teks));
    /*
       Dan ia TIDAK menampilkan satu nominal pun.

       Godaan pada halaman luring adalah menampilkan "saldo terakhir yang
       diketahui". Baris ini menutupnya secara mekanis: pola rupiah apa pun di
       layar luring berarti ada angka keuangan yang bertahan di perangkat.
    */
    ok('halaman luring TIDAK memuat nominal rupiah', !/Rp\s?[\d.]{4,}/.test(teks));

    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
    await luringkanSW(cdp, false);

    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    cdp.close();
  } finally {
    chrome.kill();
  }

  console.log(`\n  PWA: ${String(lulus)} lulus, ${String(gagal)} gagal`);
  process.exit(gagal > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nGERBANG GAGAL: ${error.message}`);
  process.exit(1);
});
