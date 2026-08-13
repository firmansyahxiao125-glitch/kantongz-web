#!/usr/bin/env node
/**
 * Gerbang disiplin palet.
 *
 * ── CELAH YANG DITUTUPNYA ──────────────────────────────────────────────
 *
 * `contrast.mjs` membaca `globals.css` dan mengaudit setiap pasangan
 * teks/permukaan. Ia menjalankan tugasnya dengan benar dan SELALU hijau — untuk
 * warna yang ada di berkas itu. Warna yang ditulis langsung di dalam `.tsx`
 * tidak terlihat olehnya sama sekali.
 *
 * Yang lolos lewat celah itu, ditemukan dengan membaca setiap hex di `src/`:
 *
 *   core-mark.tsx        fill="#00F5D4"    lambang merek, di SETIAP layar
 *   ai-core.tsx          edge  = '#00f5d4'  pendar inti AI di halaman muka
 *   orbit-objects.tsx    color = '#00f5d4'  pita aliran transaksi
 *   orbit-objects.tsx    accent = '#3b82f6' kartu bank — dan ia MEMANCAR
 *   layout.tsx           #09090b / #fafafa  zinc-950 / zinc-50
 *
 * Dua nilai pertama adalah cyan yang `globals.css` sendiri nyatakan dibuang
 * ("warna yang membuat sesuatu terlihat murah", DESIGN §1.3). Yang keempat
 * adalah biru bawaan Tailwind — hal yang menurut berkas yang sama "pertama
 * terbaca sebagai templat". Seluruhnya bertahan melewati commit yang judulnya
 * secara harfiah berbunyi "berhenti memakai palet bawaan Tailwind", karena
 * tidak ada satu pun gerbang yang melihat ke dalam komponen.
 *
 * ── TIGA ATURAN ────────────────────────────────────────────────────────
 *
 *   1. Tidak ada literal warna di dalam `src/`, kecuali `src/lib/palette.ts`.
 *      Komponen memakai token CSS; adegan 3D memakai `palette.ts`.
 *   2. `TOKEN` di `palette.ts` wajib sama persis dengan token `globals.css`.
 *      Three.js tidak bisa membaca `var()`, jadi salinannya tak terhindarkan —
 *      yang bisa dihindari adalah salinan yang MENYIMPANG diam-diam.
 *   3. `themeColor` di `layout.tsx` wajib sama dengan `--bg` tiap tema. Nilainya
 *      harus literal (peramban membacanya sebelum CSS ada), jadi hanya
 *      perbandingan yang bisa menjaganya.
 *   4. Hologram tidak boleh menjadi cadangan bagi warna yang datang dari data.
 *      Lihat alasan lengkapnya di atas aturannya sendiri.
 *
 * Jalankan:
 *   npm run palette
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const CSS = readFileSync(join(SRC, 'app/globals.css'), 'utf8');

/** Satu-satunya berkas yang boleh memuat literal warna. */
const SUMBER_PALET = 'src/lib/palette.ts';

/** Boleh memuat literal KARENA nilainya diperiksa aturan 3, bukan karena
 *  dikecualikan. Pengecualian tanpa pemeriksaan hanyalah celah yang diberi
 *  nama. */
const DIPERIKSA_TERPISAH = 'src/app/layout.tsx';

const TERLARANG = {
  '#3b82f6': 'biru bawaan Tailwind (blue-500)',
  '#00f5d4': 'cyan jenuh — DESIGN §1.3 menyebutnya membuat sesuatu terlihat murah',
  '#09090b': 'zinc-950 bawaan Tailwind',
  '#fafafa': 'zinc-50 bawaan Tailwind',
  '#71717a': 'zinc-500 bawaan Tailwind',
};

const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

/* ── membaca sumber ──────────────────────────────────────────────────── */

/**
 * Membuang komentar sebelum mencari hex.
 *
 * Ini bukan kerapian: berkas-berkas ini MENJELASKAN warna yang dibuang, dan
 * penjelasan itu menyebut nilainya. Gerbang yang menyalakan alarm atas komentar
 * yang mendokumentasikan perbaikan akan dimatikan orang dalam seminggu.
 *
 * Keadaan string ikut dilacak supaya `https://…` tidak terbaca sebagai komentar
 * dan menelan sisa barisnya — yang akan MENYEMBUNYIKAN hex, bukan menemukannya.
 */
function tanpaKomentar(source) {
  let keluar = '';
  let i = 0;
  let kutip = null;

  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];

    if (kutip) {
      if (c === '\\') {
        keluar += '  ';
        i += 2;
        continue;
      }
      if (c === kutip) kutip = null;
      keluar += c;
      i += 1;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      kutip = c;
      keluar += c;
      i += 1;
      continue;
    }

    if (c === '/' && d === '*') {
      const akhir = source.indexOf('*/', i + 2);
      const potong = akhir === -1 ? source.length : akhir + 2;
      /* Baris baru dipertahankan supaya nomor baris tetap benar. */
      keluar += source.slice(i, potong).replace(/[^\n]/g, ' ');
      i = potong;
      continue;
    }

    if (c === '/' && d === '/') {
      const akhir = source.indexOf('\n', i);
      const potong = akhir === -1 ? source.length : akhir;
      keluar += ' '.repeat(potong - i);
      i = potong;
      continue;
    }

    keluar += c;
    i += 1;
  }

  return keluar;
}

function berkasSumber(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

function barisDari(source, index) {
  return source.slice(0, index).split('\n').length;
}

/* ── aturan 1: tidak ada literal warna di dalam komponen ─────────────── */

const pelanggaran = [];

for (const path of berkasSumber(SRC)) {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  const mentah = readFileSync(path, 'utf8');
  const bersih = tanpaKomentar(mentah);

  for (const m of bersih.matchAll(HEX)) {
    const nilai = m[0].toLowerCase();
    const baris = barisDari(bersih, m.index);

    const terlarang = TERLARANG[nilai];
    if (terlarang) {
      /* Warna terlarang tetap terlarang di `palette.ts` sekalipun. Berkas itu
         mengumpulkan literal, bukan mengampuninya. */
      pelanggaran.push({ rel, baris, nilai, sebab: `TERLARANG — ${terlarang}` });
      continue;
    }

    if (rel === SUMBER_PALET || rel === DIPERIKSA_TERPISAH) continue;

    pelanggaran.push({
      rel,
      baris,
      nilai,
      sebab: `literal warna di dalam komponen — pindahkan ke ${SUMBER_PALET} atau pakai token CSS`,
    });
  }
}

/* ── aturan 4: hologram bukan warna cadangan ──────────────────────────
 *
 * DESIGN §1.3 memberi hologram satu arti — informasi mesin — dan membatasinya
 * pada satu permukaan aktif per layar.
 *
 * Aturan ini SENGAJA tidak mencoba menegakkan hitungan itu. Percobaan pertama
 * menghitung setiap pemakaian `--color-holo` per berkas, dan hasilnya menuduh
 * hal-hal yang benar: cincin fokus (`:focus-visible` WAJIB terlihat, WCAG
 * 2.4.7), garis grafik yang satu permukaan tetapi dua belas deklarasi, dan
 * label eyebrow halaman muka. Gerbang yang berteriak pada aksesibilitas adalah
 * gerbang yang dimatikan orang, dan sesudah dimatikan ia tidak menjaga apa pun.
 *
 * Yang dijaga di sini jauh lebih sempit dan tidak punya salah tuduh: hologram
 * dipakai sebagai CADANGAN bagi warna yang datang dari data.
 *
 *   account.color ?? 'var(--color-holo)'
 *
 * Pola itu selalu berada di dalam daftar, jadi ia berulang sebanyak barisnya —
 * dan tiap baris yang belum diberi warna oleh pengguna menyalakan satu hologram
 * lagi. Warna identitas yang belum dipilih bukan "informasi mesin"; ia justru
 * ketiadaan informasi, dan cadangannya harus netral.
 *
 * Alasannya sama dengan yang sudah ditulis proyek ini untuk kuningan di
 * `stat.tsx`: isyarat yang muncul di setiap baris berhenti menjadi isyarat.
 */

const CADANGAN_HOLO = /(\?\?|\|\|)\s*['"`]var\(--color-holo\)['"`]/g;
const cadangan = [];

for (const path of berkasSumber(SRC)) {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  const bersih = tanpaKomentar(readFileSync(path, 'utf8'));
  for (const m of bersih.matchAll(CADANGAN_HOLO)) {
    cadangan.push({ rel, baris: barisDari(bersih, m.index) });
  }
}

/* ── aturan 2: TOKEN wajib sama dengan globals.css ───────────────────── */

function tokenCss() {
  const mulai = CSS.indexOf('@theme');
  const buka = CSS.indexOf('{', mulai);
  const tutup = CSS.indexOf('\n}', buka);
  const blok = CSS.slice(buka, tutup);

  const found = {};
  for (const [, nama, hex] of blok.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    found[nama] = hex.toLowerCase();
  }
  return found;
}

function tokenPalet() {
  const source = readFileSync(join(ROOT, SUMBER_PALET), 'utf8');
  const mulai = source.indexOf('export const TOKEN');
  if (mulai === -1) throw new Error(`\`export const TOKEN\` tidak ditemukan di ${SUMBER_PALET}`);
  const buka = source.indexOf('{', mulai);
  const tutup = source.indexOf('}', buka);
  const blok = source.slice(buka, tutup);

  const found = {};
  for (const [, nama, hex] of blok.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) {
    found[nama] = hex.toLowerCase();
  }
  return found;
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const CSS_TOKEN = tokenCss();
const TS_TOKEN = tokenPalet();
const beda = [];

for (const [kunci, nilai] of Object.entries(TS_TOKEN)) {
  const nama = kebab(kunci);
  const css = CSS_TOKEN[nama];
  if (css === undefined) {
    beda.push(`${kunci} -> --color-${nama} TIDAK ADA di globals.css`);
  } else if (css !== nilai) {
    beda.push(`${kunci}: palette.ts ${nilai} != globals.css --color-${nama} ${css}`);
  }
}

/* ── aturan 3: themeColor wajib sama dengan --bg ─────────────────────── */

function bg(selector) {
  const mulai = CSS.indexOf(selector);
  const buka = CSS.indexOf('{', mulai);
  const tutup = CSS.indexOf('\n}', buka);
  const m = /--bg:\s*(#[0-9a-fA-F]{6})/.exec(CSS.slice(buka, tutup));
  if (!m) throw new Error(`--bg tidak ditemukan di ${selector}`);
  return m[1].toLowerCase();
}

function themeColor() {
  const source = readFileSync(join(ROOT, DIPERIKSA_TERPISAH), 'utf8');
  const bersih = tanpaKomentar(source);
  const found = {};
  for (const [, skema, hex] of bersih.matchAll(
    /prefers-color-scheme:\s*(dark|light)\)['"],\s*color:\s*'(#[0-9a-fA-F]{6})'/g,
  )) {
    found[skema] = hex.toLowerCase();
  }
  return found;
}

const TEMA = themeColor();
const HARAP = { dark: bg(':root {'), light: bg(":root[data-theme='light']") };
const bedaTema = [];

for (const skema of ['dark', 'light']) {
  if (TEMA[skema] === undefined) {
    bedaTema.push(`themeColor untuk skema ${skema} tidak ditemukan di ${DIPERIKSA_TERPISAH}`);
  } else if (TEMA[skema] !== HARAP[skema]) {
    bedaTema.push(`${skema}: themeColor ${TEMA[skema]} != --bg ${HARAP[skema]}`);
  }
}

/* ── laporan ──────────────────────────────────────────────────────────── */

const garis = '═'.repeat(72);
console.log(`\n${garis}\n  DISIPLIN PALET\n${garis}`);

console.log(`\n1. Literal warna di dalam src/`);
if (pelanggaran.length === 0) {
  console.log(`  OK   tidak ada, kecuali ${SUMBER_PALET} dan ${DIPERIKSA_TERPISAH}`);
} else {
  for (const p of pelanggaran) console.log(`  ✗    ${p.rel}:${p.baris}  ${p.nilai}  ${p.sebab}`);
}

console.log(`\n2. TOKEN palette.ts terhadap globals.css  (${Object.keys(TS_TOKEN).length} nilai)`);
if (beda.length === 0) {
  console.log('  OK   seluruhnya sama persis');
} else {
  for (const b of beda) console.log(`  ✗    ${b}`);
}

console.log('\n3. themeColor terhadap --bg');
if (bedaTema.length === 0) {
  console.log(`  OK   gelap ${HARAP.dark} · terang ${HARAP.light}`);
} else {
  for (const b of bedaTema) console.log(`  ✗    ${b}`);
}

console.log('\n4. Hologram sebagai warna cadangan data');
if (cadangan.length === 0) {
  console.log('  OK   tidak ada — cadangan identitas memakai netral');
} else {
  for (const c of cadangan) {
    console.log(
      `  ✗    ${c.rel}:${c.baris}  cadangan data memakai hologram — pakai var(--color-identity-none)`,
    );
  }
}

const gagal = pelanggaran.length + beda.length + bedaTema.length + cadangan.length;
console.log(`\n${garis}`);
if (gagal === 0) {
  console.log('  Palet disiplin: tidak ada warna yang masuk lewat pintu belakang.\n');
} else {
  console.log(`  ${String(gagal)} PELANGGARAN.\n`);
  process.exitCode = 1;
}
