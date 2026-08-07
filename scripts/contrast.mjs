#!/usr/bin/env node
/**
 * Audit kontras token warna terhadap WCAG 2.1 AA.
 *
 * Dijalankan sebagai skrip, bukan diperiksa dengan mata. Rasio kontras adalah
 * angka, dan "kelihatannya cukup" adalah cara paling andal untuk mengirim teks
 * 3.8:1 ke produksi — terutama pada teks abu-abu di atas permukaan gelap, yang
 * terlihat baik-baik saja di layar OLED perancangnya dan hilang di layar mana
 * pun yang lain.
 *
 *   node scripts/contrast.mjs
 */

import { readFile } from 'node:fs/promises';

/* ── warna ───────────────────────────────────────────────────────────── */

/**
 * Palet DIBACA dari `globals.css`, bukan disalin ke sini.
 *
 * Salinan kedua akan menyimpang dari yang sebenarnya dirender, dan yang
 * menyimpang selalu ke arah yang sama: audit tetap hijau sementara nilai yang
 * dikirim ke pengguna sudah berubah. Audit yang mengaudit dirinya sendiri
 * lebih buruk daripada tidak ada audit.
 */
const CSS = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function block(selector) {
  const start = CSS.indexOf(selector);
  if (start === -1) throw new Error(`Blok ${selector} tidak ditemukan di globals.css`);
  const open = CSS.indexOf('{', start);
  /* Kurung tutup di kolom nol menandai akhir blok. Mencocokkan `}` mana pun
     akan berhenti pada aturan bersarang seperti `@keyframes` di dalamnya. */
  const close = CSS.indexOf('\n}', open);
  return CSS.slice(open, close);
}

/** Mengambil `--nama: #rrggbb` dari sepotong CSS. Hanya heksadesimal — nilai
 *  `rgb()` dan `color-mix()` adalah garis dan bayangan, bukan teks. */
function vars(source) {
  const found = {};
  for (const [, name, hex] of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    found[name.replace(/^color-/, '')] = hex.toUpperCase();
  }
  return found;
}

const THEME_TOKENS = vars(block('@theme'));
const DARK = { ...THEME_TOKENS, ...vars(block(':root {')) };
const LIGHT = { ...THEME_TOKENS, ...vars(block(":root[data-theme='light']")) };

/* ── perhitungan ─────────────────────────────────────────────────────── */

function channel(value) {
  const c = value / 255;
  /* Kurva sRGB, bukan pembagian linear. Memakai nilai mentah menghasilkan
     rasio yang terlalu murah hati pada warna gelap — persis tempat cacat
     kontras bersembunyi. */
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ── pasangan yang benar-benar dipakai ───────────────────────────────────
   Hanya pasangan yang muncul di antarmuka. Menguji seluruh kombinasi
   menghasilkan kegagalan atas pasangan yang tidak pernah dirender, dan laporan
   yang sebagian besarnya derau tidak akan dibaca dua kali. */

const SURFACES = ['bg', 'surface', 'surface-2', 'surface-3'];

/** Teks normal < 18.66px: butuh 4.5:1. Teks besar/tebal: 3:1. Grafis: 3:1. */
const PAIRS = [
  { fg: 'ink', need: 4.5, note: 'teks utama' },
  { fg: 'ink-muted', need: 4.5, note: 'teks sekunder' },
  { fg: 'ink-dim', need: 4.5, note: 'keterangan' },
  /*
   * NON-TEKS SAJA, ambang 3:1 (WCAG 1.4.11).
   *
   * Lighthouse menemukan token ini membawa teks tubuh 14px di footer pada
   * 3,43:1. Percobaan menaikkannya sampai lulus 4,5:1 mendaratkannya di 4,51 —
   * sementara `ink-dim` ada di 4,52. Keduanya menjadi tingkat yang SAMA.
   *
   * Kesimpulannya: tangga tinta hanya menyanggah tiga tingkat teks yang tetap
   * terbaca, bukan empat. `ink-faint` karena itu berhenti dipakai untuk teks
   * dan tinggal sebagai token elemen dekoratif.
   */
  { fg: 'ink-faint', need: 3.0, note: 'NON-TEKS saja (ikon, garis, angka aria-hidden)' },
  /* Sinyal dirender sebagai TEKS pada nominal, jadi 4,5:1 — bukan 3:1 yang
     berlaku bagi elemen non-teks. Warnanya juga TIDAK PERNAH berdiri sendiri:
     selalu ditemani tanda atau ikon, karena sepuluh persen laki-laki tidak
     dapat membedakan merah dari hijau. */
  { fg: 'positive', need: 4.5, note: 'nominal masuk' },
  { fg: 'negative', need: 4.5, note: 'nominal keluar' },
  { fg: 'caution', need: 4.5, note: 'peringatan' },
];

const THEME_EXTRA = {
  dark: [
    { fg: 'brass-bright', need: 4.5, note: 'angka uang' },
    { fg: 'brass', need: 3.0, note: 'aksi utama (teks besar)' },
    { fg: 'holo', need: 4.5, note: 'informasi mesin' },
  ],
  light: [
    { fg: 'brass-deep', need: 4.5, note: 'angka uang' },
    { fg: 'holo-deep', need: 3.0, note: 'informasi mesin (non-teks)' },
  ],
};

function audit(name, palette, extra) {
  console.log(`\n${'═'.repeat(72)}\n  TEMA ${name.toUpperCase()}\n${'═'.repeat(72)}`);

  const failures = [];

  for (const { fg, need, note } of [...PAIRS, ...extra]) {
    const row = SURFACES.filter((s) => palette[s] !== undefined)
      .map((surface) => {
        const value = ratio(palette[fg], palette[surface]);
        const pass = value >= need;
        if (!pass) failures.push({ fg, surface, value, need });
        return `${surface}:${value.toFixed(2)}${pass ? '' : ' ✗'}`;
      })
      .join('  ');

    console.log(`  ${fg.padEnd(13)} ≥${need.toFixed(1)}  ${row}   ${note}`);
  }

  return failures;
}

const failures = [
  ...audit('gelap', DARK, THEME_EXTRA.dark),
  ...audit('terang', LIGHT, THEME_EXTRA.light),
];

console.log(`\n${'═'.repeat(72)}`);
if (failures.length === 0) {
  console.log('  Seluruh pasangan LULUS WCAG 2.1 AA.');
} else {
  console.log(`  ${String(failures.length)} pasangan GAGAL:`);
  for (const f of failures) {
    console.log(`    ${f.fg} di atas ${f.surface}: ${f.value.toFixed(2)} < ${f.need.toFixed(1)}`);
  }
  process.exitCode = 1;
}
