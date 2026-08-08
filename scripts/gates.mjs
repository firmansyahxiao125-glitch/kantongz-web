#!/usr/bin/env node
/**
 * Menjalankan seluruh gerbang peramban sebagai SATU perintah.
 *
 * ── MASALAH YANG DIPECAHKAN ────────────────────────────────────────────
 *
 * Gerbang peramban menuntut peladen produksi yang hidup, jadi urutan manualnya
 * selalu tiga langkah: nyalakan peladen di latar, jalankan gerbang, hentikan
 * peladen. Langkah pertama TIDAK PERNAH keluar dengan sendirinya — ia peladen.
 *
 * Akibatnya, pelari tugas menandai langkah itu GAGAL, dan penandaan itu benar
 * secara harfiah: menghentikan peladen memberi exit code bukan-nol
 * (SIGTERM = 143, penghentian paksa = 255). Diukur, bukan diduga:
 *
 *   peladen menempel 15 detik, HTTP 200 sepanjang itu
 *   exit code anak sesudah SIGTERM        143
 *   exit code skrip yang memiliki siklusnya  0   -> dilaporkan "completed"
 *
 * Jadi yang salah bukan aplikasinya dan bukan pelarinya — melainkan siapa yang
 * MEMILIKI siklus hidup peladen. Ketika skrip yang memilikinya, ia berhenti
 * dengan rapi dan mengembalikan kode gerbang, bukan kode pembunuhan.
 *
 * Berkas ini juga menyamakan jalur lokal dengan CI: langkah `ci.yml`
 * menjalankan kedua gerbang terhadap satu peladen, dan begitu pula di sini.
 *
 * Jalankan:
 *   npm run build && npm run gates
 */

import { spawn } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = process.env.GATES_PORT ?? '3210';
const BASE = `http://127.0.0.1:${PORT}`;

/* Keluaran `standalone` sengaja tidak memuat aset statis; Dockerfile produksi
   menyalinnya pada tahap penyebaran. Tanpa langkah ini seluruh CSS menjawab
   404 dan gerbang gagal karena alasan yang sama sekali salah. */
function rakitArtefak() {
  if (!existsSync('.next/standalone/server.js')) {
    console.error('`.next/standalone/server.js` tidak ada. Jalankan `npm run build` lebih dulu.');
    process.exit(2);
  }
  rmSync('.next/standalone/.next/static', { recursive: true, force: true });
  cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
  if (existsSync('public')) cpSync('public', '.next/standalone/public', { recursive: true });
}

async function tungguSiap() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(BASE + '/', { redirect: 'manual' });
      if (r.status > 0) return true;
    } catch { await sleep(500); }
  }
  return false;
}

function jalankan(skrip) {
  return new Promise((resolve) => {
    const anak = spawn(process.execPath, [skrip, '--base', BASE], { stdio: 'inherit' });
    anak.on('exit', (code) => { resolve(code ?? 1); });
  });
}

rakitArtefak();

/* `HOSTNAME` WAJIB ditimpa. `server.js` memakai
   `process.env.HOSTNAME || '0.0.0.0'`, dan Docker maupun runner CI sudah
   menyetelnya ke ID kontainer / nama mesin — peladen lalu mengikat ke nama
   itu dan `127.0.0.1` tidak pernah menjawab. */
const peladen = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: { ...process.env, PORT, HOSTNAME: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logPeladen = '';
peladen.stdout.on('data', (d) => { logPeladen += String(d); });
peladen.stderr.on('data', (d) => { logPeladen += String(d); });

let kode = 0;
try {
  if (!(await tungguSiap())) {
    console.error(`Peladen di ${BASE} tidak pernah menjawab.\n${logPeladen}`);
    kode = 2;
  } else {
    console.log(`[1mpeladen siap di ${BASE}[0m\n`);
    for (const skrip of ['scripts/typography.mjs', 'scripts/render.mjs']) {
      const hasil = await jalankan(skrip);
      /* Gerbang berikutnya tetap dijalankan meski yang ini gagal: dua laporan
         kegagalan dalam satu jalan lebih berguna daripada satu, dan yang
         kedua sering menjelaskan yang pertama. */
      if (hasil !== 0) kode = hasil;
    }
  }
} finally {
  peladen.kill('SIGTERM');
  /* Menunggu peladen benar-benar melepas porta. Tanpa ini, jalan berikutnya
     menemukan 3210 masih terikat dan gagal karena sisa jalan sebelumnya. */
  for (let i = 0; i < 20 && peladen.exitCode === null && peladen.signalCode === null; i += 1) {
    await sleep(100);
  }
}

console.log(`\n[1mgerbang selesai — exit ${String(kode)}[0m`);
process.exit(kode);
