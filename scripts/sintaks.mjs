#!/usr/bin/env node
/**
 * Gerbang SINTAKS untuk `scripts/`.
 *
 * ── MENGAPA IA ADA ─────────────────────────────────────────────────────
 *
 * ESLint di repositori ini hanya membaca `src/`. Seluruh skrip gerbang —
 * tujuh berkas, beberapa ribu baris yang menjaga desain, aksesibilitas,
 * performa, dan keamanan — tidak diperiksa apa pun sampai seseorang
 * menjalankannya.
 *
 * Akibatnya satu kelas kesalahan lolos berulang kali dan selalu dengan cara
 * yang sama: SATU BACKTICK DI DALAM KOMENTAR YANG BERADA DI DALAM TEMPLATE
 * LITERAL. Potongan yang disuntik ke halaman ditulis sebagai template literal,
 * komentarnya menyebut nama properti dalam backtick karena itu kebiasaan
 * menulis yang baik di tempat lain, dan stringnya tertutup di tengah jalan.
 *
 * Sudah terjadi di `interior.mjs` dua kali, `akses.mjs` sekali, dan
 * `grafis.mjs` sekali. Empat kali kesalahan yang sama berarti bukan
 * kecerobohan orangnya — melainkan tidak adanya yang menangkapnya.
 *
 * Berkas ini menangkapnya, dalam hitungan milidetik, sebelum satu peramban pun
 * dinyalakan.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('.', import.meta.url));

const berkas = readdirSync(DIR)
  .filter((f) => f.endsWith('.mjs'))
  .sort();

let gagal = 0;

for (const f of berkas) {
  try {
    execFileSync(process.execPath, ['--check', join(DIR, f)], { stdio: 'pipe' });
  } catch (error) {
    gagal += 1;
    const pesan = String(error.stderr ?? error.message)
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .slice(0, 4)
      .join('\n      ');
    console.error(`  GAGAL ${f}\n      ${pesan}`);
  }
}

if (gagal === 0) {
  console.log(`  Sintaks ${String(berkas.length)} skrip gerbang sah.`);
} else {
  console.error(`\n  ${String(gagal)} skrip tidak dapat diurai.`);
}

process.exit(gagal > 0 ? 1 : 0);
