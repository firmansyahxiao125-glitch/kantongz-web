#!/usr/bin/env node
/**
 * Membangkitkan ikon PWA dari lambang merek yang SAMA. H1.
 *
 * ── MENGAPA DIBANGKITKAN, BUKAN DIGAMBAR SEKALI LALU DITEMPEL ──────────
 *
 * Lambang KANTONGZ hidup sebagai komponen React (`brand/core-mark.tsx`).
 * Ikon yang digambar terpisah akan menyimpang darinya pada perubahan pertama
 * yang menyentuh salah satunya — dan penyimpangan itu tidak pernah dilaporkan
 * sebagai bug, ia hanya membuat ikon di layar utama perlahan terlihat seperti
 * produk lain.
 *
 * Geometrinya ditulis ulang di sini sebagai SVG murni — bukan diimpor dari
 * komponennya, karena komponen itu memakai kelas Tailwind dan variabel CSS
 * yang tidak ada di luar aplikasi. Yang disalin ANGKANYA, dan angka-angka itu
 * diperiksa gerbang `pwa` supaya penyimpangannya berisik.
 *
 * ── MENGAPA CHROME, BUKAN `sharp` ─────────────────────────────────────
 *
 * Repositori ini tidak memuat `sharp`, dan menambah satu dependensi biner
 * berukuran puluhan megabita demi tiga berkas PNG yang dibuat sekali seumur
 * hidup adalah harga yang salah. Chrome headless SUDAH dipakai enam gerbang
 * lain di direktori ini; ia merender SVG persis seperti peramban pengguna
 * merendernya, lengkap dengan anti-aliasing.
 *
 * PNG-nya DI-COMMIT. Jadi Chrome hanya dibutuhkan ketika ikonnya benar-benar
 * dibuat ulang, bukan pada setiap `npm install` maupun setiap jalanan CI.
 *
 * Jalankan:
 *   node scripts/ikon.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const MAKS_TARGET = 160;
const PORT = 9337;
const PROFILE = join(tmpdir(), `kantongz-ikon-${String(process.pid)}`);
const OUT = resolve('public');

/* ── warna, disalin dari `layout.tsx` dan dijaga gerbang ─────────────── */

/**
 * Latar ikon: `#06070a`, sama dengan `--bg` tema gelap.
 *
 * SELALU gelap, di kedua tema. Ikon layar utama tidak punya media query — ia
 * satu berkas yang dilihat di peluncur aplikasi, di atas wallpaper yang tidak
 * kita ketahui. Lambang terang di atas latar transparan hilang di wallpaper
 * terang; satu latar tetap yang gelap terbaca di mana pun.
 */
const LATAR = '#06070a';
const CINCIN = '#c89440';
const INTI = '#e8b563';

/* ── geometri, disalin dari `brand/core-mark.tsx` ────────────────────── */

const BILAH = 12;
const R_LUAR = 22;
const R_CINCIN = 11;
const R_INTI = 5;

/**
 * @param sisi     Ukuran sisi PNG.
 * @param padding  Bagian sisi yang dibiarkan kosong di tiap tepi, 0–0,5.
 *
 *   Ikon biasa memakai 0,08 — cukup agar lambang tidak menyentuh tepi.
 *
 *   Ikon `maskable` memakai 0,20, dan itu tuntutan spesifikasi bukan selera:
 *   Android memotong ikon maskable menjadi lingkaran, kotak membulat, atau
 *   tetesan menurut peluncurnya. Hanya 80% bagian TENGAH yang dijamin
 *   terlihat. Lambang yang mengisi penuh akan terpotong bilahnya di sebagian
 *   ponsel dan utuh di sebagian yang lain — cacat yang tidak pernah terlihat
 *   di mesin pengembang.
 */
function svgIkon(sisi, padding) {
  const pusat = 24;
  const skala = 1 - padding * 2;

  const bilah = Array.from({ length: BILAH }, (_, i) => i * (360 / BILAH))
    .map(
      (deg) =>
        `<line x1="24" y1="7" x2="24" y2="14" transform="rotate(${String(deg)} 24 24)"/>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(sisi)}" height="${String(sisi)}" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="${LATAR}"/>
  <g transform="translate(${String(pusat)} ${String(pusat)}) scale(${skala.toFixed(4)}) translate(${String(-pusat)} ${String(-pusat)})">
    <circle cx="24" cy="24" r="${String(R_LUAR)}" stroke="${CINCIN}" stroke-opacity="0.28" stroke-width="2" fill="none"/>
    <g stroke="${CINCIN}" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round">${bilah}</g>
    <circle cx="24" cy="24" r="${String(R_CINCIN)}" stroke="${CINCIN}" stroke-opacity="0.85" stroke-width="1.5" fill="none"/>
    <circle cx="24" cy="24" r="${String(R_INTI)}" fill="${INTI}" fill-opacity="0.9"/>
  </g>
</svg>`;
}

/** Ikon yang dibangkitkan. Namanya dirujuk `app/manifest.ts` dan gerbang `pwa`. */
const IKON = [
  { berkas: 'icon-192.png', sisi: 192, padding: 0.08 },
  { berkas: 'icon-512.png', sisi: 512, padding: 0.08 },
  { berkas: 'icon-maskable-512.png', sisi: 512, padding: 0.2 },
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
  const found = CANDIDATES.find((path) => existsSync(path));
  if (!found) {
    throw new Error('Chrome tidak ditemukan. Setel CHROME_PATH ke biner Chrome atau Chromium.');
  }
  return found;
}

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
    await new Promise((res, rej) => {
      socket.addEventListener('open', res, { once: true });
      socket.addEventListener('error', () => rej(new Error(`Gagal terhubung ke ${url}`)), {
        once: true,
      });
    });
    return new Cdp(socket);
  }

  send(method, params = {}) {
    const id = this.#next++;
    return new Promise((res, rej) => {
      this.#pending.set(id, { resolve: res, reject: rej });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.#socket.close();
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

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

    for (const { berkas, sisi, padding } of IKON) {
      /* Viewport disetel PERSIS seukuran ikonnya, lalu SVG-nya mengisi penuh.
         Menangkap area yang lebih besar lalu memotongnya menuntut pemotong
         gambar — yaitu dependensi yang justru ingin dihindari berkas ini. */
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: sisi,
        height: sisi,
        deviceScaleFactor: 1,
        mobile: false,
      });

      const svg = svgIkon(sisi, padding);
      const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${LATAR}}svg{display:block}</style>${svg}`;

      await cdp.send('Page.navigate', {
        url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      });
      /* Jeda pendek, bukan menunggu `Page.loadEventFired`: halaman ini tidak
         memuat satu sumber daya eksternal pun, jadi yang ditunggu hanya satu
         kali lukis. */
      await sleep(300);

      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const tujuan = join(OUT, berkas);
      await writeFile(tujuan, Buffer.from(data, 'base64'));
      console.log(`  ${berkas}  ${String(sisi)}x${String(sisi)}  padding ${String(padding * 100)}%`);
    }

    cdp.close();
    console.log(`\n  ${String(IKON.length)} ikon ditulis ke public/`);
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(`\nGAGAL: ${error.message}`);
  process.exit(1);
});
