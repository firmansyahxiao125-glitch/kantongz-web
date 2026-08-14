import type { TransactionKind } from '@/lib/ledger';

/**
 * Pembacaan CSV.
 *
 * ── MENGAPA DITULIS SENDIRI ─────────────────────────────────────────────
 *
 * Bukan karena pustakanya kurang. Karena yang dibutuhkan di sini SEMPIT dan
 * SANGAT khusus: satu bentuk berkas, satu kumpulan kebiasaan angka Indonesia,
 * dan pelaporan galat PER BARIS dengan nomor barisnya. Pustaka umum
 * mengembalikan objek; yang dibutuhkan orang yang mengunggah berkas seribu
 * baris adalah "baris 417 tanggalnya tidak terbaca".
 *
 * ── DI MANA KESALAHANNYA MAHAL ──────────────────────────────────────────
 *
 * Kesalahan di berkas ini tidak menghasilkan galat. Ia menghasilkan angka yang
 * salah seribu kali lipat — "1.750" yang dibaca sebagai satu koma tujuh lima —
 * dan angka itu masuk ke pembukuan terlihat seperti angka biasa.
 */

/* ── pemisahan ───────────────────────────────────────────────────────── */

/**
 * Pemisah yang dipakai berkas ini.
 *
 * Excel dengan lokal Indonesia menulis titik koma, karena koma sudah dipakai
 * sebagai tanda desimal. Yang di dalam tanda kutip DIABAIKAN saat menghitung:
 * satu catatan berisi titik koma tidak boleh mengubah tafsiran seluruh berkas.
 */
function tebakPemisah(text: string): string {
  let koma = 0;
  let titikKoma = 0;
  let dalamKutip = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') dalamKutip = !dalamKutip;
    else if (!dalamKutip && c === ',') koma += 1;
    else if (!dalamKutip && c === ';') titikKoma += 1;
  }

  return titikKoma > koma ? ';' : ',';
}

/**
 * Membelah CSV menjadi larik baris berisi larik sel. RFC 4180.
 *
 * Ditulis sebagai mesin keadaan satu lintasan, bukan `split` bertingkat:
 * `split('\n')` memutus baris yang barisnya ada DI DALAM tanda kutip, dan
 * catatan transaksi memuat baris baru lebih sering daripada yang diduga.
 */
export function pisahCsv(text: string): string[][] {
  /* BOM dibuang lebih dulu. Excel menulisnya di depan berkas UTF-8, dan tanpa
     ini kolom pertama bernama "﻿Tanggal" dan tidak pernah cocok. */
  const isi = text.replace(/^﻿/, '');
  if (isi.length === 0) return [];

  const pemisah = tebakPemisah(isi);
  const baris: string[][] = [];
  let sel: string[] = [];
  let nilai = '';
  let dalamKutip = false;

  for (let i = 0; i < isi.length; i += 1) {
    const c = isi[i];

    if (dalamKutip) {
      if (c === '"') {
        /* Kutip ganda berurutan adalah satu kutip harfiah, bukan penutup. */
        if (isi[i + 1] === '"') {
          nilai += '"';
          i += 1;
        } else {
          dalamKutip = false;
        }
      } else {
        nilai += c;
      }
      continue;
    }

    if (c === '"') dalamKutip = true;
    else if (c === pemisah) {
      sel.push(nilai);
      nilai = '';
    } else if (c === '\n' || c === '\r') {
      /* CRLF ditangani sebagai satu akhir baris: `\r` mengakhiri, `\n` yang
         menyusul dilewati. */
      if (c === '\r' && isi[i + 1] === '\n') i += 1;
      sel.push(nilai);
      nilai = '';
      baris.push(sel);
      sel = [];
    } else {
      nilai += c;
    }
  }

  if (nilai.length > 0 || sel.length > 0) {
    sel.push(nilai);
    baris.push(sel);
  }

  /* Baris yang seluruhnya kosong dibuang — berkas Excel hampir selalu berakhir
     dengan satu, dan baris kosong yang dilaporkan sebagai galat membuat setiap
     impor terlihat gagal separuh. */
  return baris.filter((r) => r.some((x) => x.trim().length > 0));
}

/* ── angka ───────────────────────────────────────────────────────────── */

/**
 * Jumlah dalam rupiah utuh, atau `null`.
 *
 * `null` dan BUKAN nol: nol adalah jumlah yang terlihat sah dan akan masuk ke
 * pembukuan tanpa satu pun tanda bahwa selnya sebenarnya berisi "n/a".
 */
export function bacaAngka(text: string): number | null {
  const asli = text.trim();
  if (asli.length === 0) return null;

  /* Tanda kurung berarti negatif. Kebiasaan rekening koran dan akuntansi;
     tanpa ini seluruh debit terbaca sebagai pemasukan. */
  const negatif = /^\(.*\)$/.test(asli) || asli.startsWith('-');

  const bersih = asli.replace(/[^\d.,]/g, '');
  if (!/\d/.test(bersih)) return null;

  const titik = bersih.lastIndexOf('.');
  const koma = bersih.lastIndexOf(',');
  const terakhir = Math.max(titik, koma);

  let utuh = bersih;
  let pecahan = '';

  if (terakhir !== -1) {
    const belakang = bersih.length - terakhir - 1;
    const keduanya = titik !== -1 && koma !== -1;

    /*
     * Pemisah TERAKHIR yang menentukan.
     *
     * "1.750.000,50" (Indonesia) dan "1,750,000.50" (Inggris) menulis jumlah
     * yang sama; yang membedakan hanya urutannya. Kalau hanya ada SATU
     * pemisah dan di belakangnya tepat tiga angka, itu tanda ribuan —
     * "1,750" jauh lebih sering berarti seribu tujuh ratus lima puluh, dan
     * rupiah tidak beredar dalam pecahan sen sama sekali.
     */
    if (keduanya || belakang !== 3) {
      utuh = bersih.slice(0, terakhir);
      pecahan = bersih.slice(terakhir + 1);
    }
  }

  const angka = Number(`${utuh.replace(/[.,]/g, '') || '0'}.${pecahan.replace(/[.,]/g, '') || '0'}`);
  if (!Number.isFinite(angka)) return null;

  const bulat = Math.round(angka);
  return negatif ? -bulat : bulat;
}

/* ── tanggal ─────────────────────────────────────────────────────────── */

function sah(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null;
  /* Hari 0 bulan berikutnya adalah hari terakhir bulan ini, termasuk kabisat. */
  if (d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Tanggal sebagai `YYYY-MM-DD`, atau `null`.
 *
 * YANG AMBIGU DIBACA HARI DULU. `03/04/2026` berarti 3 April di Indonesia dan
 * 4 Maret di Amerika; salah satu harus dipilih, dan yang dipilih adalah
 * kebiasaan penggunanya. Keputusan ini dinyatakan di antarmuka unggahan.
 */
export function bacaTanggal(text: string): string | null {
  const asli = text.trim();
  if (asli.length === 0) return null;

  /* Cap waktu ISO dipotong ke tanggalnya: jam dari zona lain akan menggeser
     harinya, dan yang diminta memang harinya. */
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]|$)/.exec(asli);
  if (iso) return sah(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const lokal = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(asli);
  if (lokal) return sah(Number(lokal[3]), Number(lokal[2]), Number(lokal[1]));

  return null;
}

/* ── berkas utuh ─────────────────────────────────────────────────────── */

export interface BarisCsv {
  /** Nomor baris DI BERKAS, header terhitung. Untuk pesan galat. */
  line: number;
  occurredAt: string;
  kind: TransactionKind;
  accountName: string;
  counterAccountName: string;
  categoryName: string;
  merchant: string;
  note: string;
  /** Rupiah utuh, selalu POSITIF. Tandanya sudah pindah ke `kind`. */
  amount: number;
}

export interface KesalahanBaris {
  line: number;
  reason: string;
}

export interface HasilBaca {
  rows: BarisCsv[];
  errors: KesalahanBaris[];
}

/** Nama kolom yang dikenali. Yang pertama cocok yang dipakai. */
const KOLOM = {
  tanggal: ['tanggal', 'date', 'tgl', 'waktu'],
  jenis: ['jenis', 'type', 'tipe'],
  dompet: ['dompet', 'account', 'akun', 'rekening'],
  tujuan: ['dompet tujuan', 'counter account', 'ke dompet', 'tujuan'],
  kategori: ['kategori', 'category'],
  merchant: ['merchant', 'penerima', 'toko', 'payee'],
  catatan: ['catatan', 'note', 'notes', 'keterangan', 'description', 'deskripsi'],
  jumlah: ['jumlah', 'amount', 'nominal', 'nilai'],
} as const;

function normal(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function cariKolom(header: string[], nama: readonly string[]): number {
  return header.findIndex((h) => nama.includes(normal(h)));
}

const JENIS: Record<string, TransactionKind> = {
  pemasukan: 'income',
  masuk: 'income',
  income: 'income',
  kredit: 'income',
  credit: 'income',
  pengeluaran: 'expense',
  keluar: 'expense',
  expense: 'expense',
  debit: 'expense',
  transfer: 'transfer',
  pindah: 'transfer',
};

export function bacaCsvTransaksi(text: string): HasilBaca {
  const baris = pisahCsv(text);
  if (baris.length === 0) return { rows: [], errors: [] };

  const header = baris[0] ?? [];
  const kol = {
    tanggal: cariKolom(header, KOLOM.tanggal),
    jenis: cariKolom(header, KOLOM.jenis),
    dompet: cariKolom(header, KOLOM.dompet),
    tujuan: cariKolom(header, KOLOM.tujuan),
    kategori: cariKolom(header, KOLOM.kategori),
    merchant: cariKolom(header, KOLOM.merchant),
    catatan: cariKolom(header, KOLOM.catatan),
    jumlah: cariKolom(header, KOLOM.jumlah),
  };

  /* Tiga kolom yang tanpa salah satunya berkas ini bukan berkas transaksi.
     Jenis TIDAK termasuk: rekening koran tidak punya kolom itu, dan tandanya
     ada di jumlahnya. */
  const kurang: string[] = [];
  if (kol.tanggal === -1) kurang.push('Tanggal');
  if (kol.dompet === -1) kurang.push('Dompet');
  if (kol.jumlah === -1) kurang.push('Jumlah');

  if (kurang.length > 0) {
    return {
      rows: [],
      errors: [{ line: 1, reason: `kolom ${kurang.join(', ')} tidak ditemukan` }],
    };
  }

  const rows: BarisCsv[] = [];
  const errors: KesalahanBaris[] = [];

  for (let i = 1; i < baris.length; i += 1) {
    const sel = baris[i] ?? [];
    const line = i + 1;
    /* Sel yang tidak ada dibaca sebagai kosong, BUKAN diambil dari kolom
       sebelahnya: baris pendek yang nilainya bergeser satu kolom menghasilkan
       jumlah yang masuk sebagai tanggal dan sebaliknya. */
    const ambil = (n: number): string => (n === -1 ? '' : (sel[n] ?? '')).trim();

    const occurredAt = bacaTanggal(ambil(kol.tanggal));
    if (!occurredAt) {
      errors.push({ line, reason: `tanggal "${ambil(kol.tanggal)}" tidak terbaca` });
      continue;
    }

    const angka = bacaAngka(ambil(kol.jumlah));
    if (angka === null || angka === 0) {
      errors.push({ line, reason: `jumlah "${ambil(kol.jumlah)}" tidak terbaca` });
      continue;
    }

    const dompet = ambil(kol.dompet);
    if (dompet.length === 0) {
      errors.push({ line, reason: 'dompet kosong' });
      continue;
    }

    /* Tanda jumlah menentukan jenis ketika kolomnya tidak ada. Mengabaikannya
       berarti seluruh mutasi rekening masuk sebagai pengeluaran — termasuk
       gaji. */
    const kind = JENIS[normal(ambil(kol.jenis))] ?? (angka < 0 ? 'expense' : 'income');

    rows.push({
      line,
      occurredAt,
      kind,
      accountName: dompet,
      counterAccountName: ambil(kol.tujuan),
      categoryName: ambil(kol.kategori),
      merchant: ambil(kol.merchant),
      note: ambil(kol.catatan),
      amount: Math.abs(angka),
    });
  }

  return { rows, errors };
}
