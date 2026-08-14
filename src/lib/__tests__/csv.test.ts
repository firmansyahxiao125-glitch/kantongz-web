import { describe, expect, it } from 'vitest';

import { bacaAngka, bacaCsvTransaksi, bacaTanggal, pisahCsv } from '../csv';
import { transactionsToCsv } from '../export';
import type { Category, Transaction, WalletAccount } from '../ledger';

/**
 * Pembacaan CSV.
 *
 * Berkas yang diunggah pengguna datang dari Excel, dari internet banking, dan
 * dari ekspor aplikasi ini sendiri — tiga sumber dengan tiga kebiasaan berbeda
 * soal pemisah, tanda ribuan, dan urutan tanggal. Kesalahan di lapisan ini
 * tidak menghasilkan galat: ia menghasilkan angka yang salah seribu kali
 * lipat, dan angka itu masuk ke pembukuan terlihat seperti angka biasa.
 */

describe('pisahCsv', () => {
  it('baris dan kolom sederhana', () => {
    expect(pisahCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('koma DI DALAM tanda kutip bukan pemisah', () => {
    expect(pisahCsv('"Kopi, gula",5000')).toEqual([['Kopi, gula', '5000']]);
  });

  it('kutip ganda di dalam nilai', () => {
    expect(pisahCsv('"Warung ""Bu Tini""",5000')).toEqual([['Warung "Bu Tini"', '5000']]);
  });

  it('baris baru DI DALAM tanda kutip tidak memutus baris', () => {
    expect(pisahCsv('"baris\nkedua",1')).toEqual([['baris\nkedua', '1']]);
  });

  it('CRLF dari Excel Windows', () => {
    expect(pisahCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('BOM dibuang', () => {
    /* Excel menulisnya di depan berkas UTF-8. Tanpa dibuang, kolom pertama
       bernama "﻿Tanggal" dan tidak pernah cocok dengan apa pun. */
    expect(pisahCsv('﻿Tanggal,Jumlah\n2026-08-14,5000')[0]?.[0]).toBe('Tanggal');
  });

  it('titik koma sebagai pemisah — Excel dengan lokal Indonesia', () => {
    expect(pisahCsv('a;b;c\n1;2;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('koma di dalam kutip tidak membuat berkas dibaca sebagai titik koma', () => {
    /* Deteksi pemisah harus MENGABAIKAN isi tanda kutip; kalau tidak, satu
       catatan berisi titik koma akan mengubah tafsiran seluruh berkas. */
    expect(pisahCsv('"a;b",c\n"d;e",f')).toEqual([
      ['a;b', 'c'],
      ['d;e', 'f'],
    ]);
  });

  it('baris kosong di akhir tidak menjadi baris', () => {
    expect(pisahCsv('a,b\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('bacaAngka', () => {
  it('rupiah utuh apa adanya', () => {
    expect(bacaAngka('1750000')).toBe(1_750_000);
  });

  it('titik sebagai ribuan — tulisan Indonesia', () => {
    expect(bacaAngka('1.750.000')).toBe(1_750_000);
  });

  it('koma sebagai ribuan — tulisan Inggris', () => {
    expect(bacaAngka('1,750,000')).toBe(1_750_000);
  });

  it('lambang mata uang dan spasi diabaikan', () => {
    expect(bacaAngka('Rp 1.750.000')).toBe(1_750_000);
    expect(bacaAngka('  IDR 50.000 ')).toBe(50_000);
  });

  it('pemisah TERAKHIR yang menentukan desimal', () => {
    /* "1.750.000,50" Indonesia dan "1,750,000.50" Inggris menulis jumlah yang
       SAMA. Yang membedakan hanya urutannya, dan yang terakhir selalu koma
       desimalnya. */
    expect(bacaAngka('1.750.000,50')).toBe(1_750_001);
    expect(bacaAngka('1,750,000.50')).toBe(1_750_001);
  });

  it('satu pemisah dengan tepat tiga angka di belakangnya adalah RIBUAN', () => {
    /* "1,750" jauh lebih sering berarti seribu tujuh ratus lima puluh rupiah
       daripada satu koma tujuh lima rupiah — dan rupiah tidak beredar dalam
       pecahan sen sama sekali. */
    expect(bacaAngka('1,750')).toBe(1_750);
    expect(bacaAngka('1.750')).toBe(1_750);
  });

  it('satu pemisah dengan angka selain tiga adalah DESIMAL', () => {
    expect(bacaAngka('1,5')).toBe(2);
    expect(bacaAngka('1750,25')).toBe(1_750);
  });

  it('tanda kurung berarti negatif — kebiasaan rekening koran', () => {
    expect(bacaAngka('(50.000)')).toBe(-50_000);
    expect(bacaAngka('-50.000')).toBe(-50_000);
  });

  it('yang bukan angka menghasilkan null, bukan nol', () => {
    /* Nol akan lolos sebagai jumlah yang sah dan masuk ke pembukuan. */
    expect(bacaAngka('')).toBeNull();
    expect(bacaAngka('  ')).toBeNull();
    expect(bacaAngka('abc')).toBeNull();
    expect(bacaAngka('Rp')).toBeNull();
  });
});

describe('bacaTanggal', () => {
  it('ISO apa adanya', () => {
    expect(bacaTanggal('2026-08-14')).toBe('2026-08-14');
  });

  it('hari dulu, bulan kemudian — urutan Indonesia', () => {
    expect(bacaTanggal('14/08/2026')).toBe('2026-08-14');
    expect(bacaTanggal('14-08-2026')).toBe('2026-08-14');
    expect(bacaTanggal('1/8/2026')).toBe('2026-08-01');
  });

  it('yang ambigu dibaca sebagai HARI dulu, dan itu keputusan yang dicatat', () => {
    /* 03/04/2026 berarti 3 April di Indonesia dan 4 Maret di Amerika. Salah
       satu harus dipilih; yang dipilih adalah kebiasaan penggunanya. */
    expect(bacaTanggal('03/04/2026')).toBe('2026-04-03');
  });

  it('ISO dengan garis miring', () => {
    expect(bacaTanggal('2026/08/14')).toBe('2026-08-14');
  });

  it('cap waktu ISO dipotong ke tanggalnya', () => {
    expect(bacaTanggal('2026-08-14T09:30:00Z')).toBe('2026-08-14');
  });

  it('tanggal yang tidak ada ditolak', () => {
    /* 31 Februari lolos hampir semua pemeriksaan bentuk dan digulung diam-diam
       oleh `Date` menjadi 3 Maret. */
    expect(bacaTanggal('31/02/2026')).toBeNull();
    expect(bacaTanggal('2026-13-01')).toBeNull();
    expect(bacaTanggal('2026-02-30')).toBeNull();
  });

  it('kosong dan sampah menghasilkan null', () => {
    expect(bacaTanggal('')).toBeNull();
    expect(bacaTanggal('kemarin')).toBeNull();
  });
});

/* ── pembacaan berkas utuh ───────────────────────────────────────────── */

const AKUN: WalletAccount[] = [
  {
    id: 'akun-1',
    name: 'Bank Utama',
    kind: 'bank',
    currency: 'IDR',
    openingBalance: 0,
    balance: 0,
    color: null,
    archived: false,
  },
  {
    id: 'akun-2',
    name: 'Dompet Tunai',
    kind: 'cash',
    currency: 'IDR',
    openingBalance: 0,
    balance: 0,
    color: null,
    archived: false,
  },
];

/* Warnanya token, bukan heksadesimal harfiah. Yang diuji berkas ini adalah
   teks CSV; satu literal warna di sini akan menembus gerbang palet tanpa
   memberi tambahan apa pun pada ujinya. */
const KATEGORI: Category[] = [
  {
    id: 'kat-1',
    name: 'Makan & Minum',
    kind: 'expense',
    icon: 'x',
    color: 'var(--color-identity-none)',
    system: true,
  },
  {
    id: 'kat-2',
    name: 'Gaji',
    kind: 'income',
    icon: 'y',
    color: 'var(--color-identity-none)',
    system: true,
  },
];

describe('bacaCsvTransaksi', () => {
  it('membaca berkas hasil ekspornya sendiri, bulat-bulat', () => {
    /*
     * Uji paling berharga di berkas ini: impor yang tidak dapat membaca ekspor
     * aplikasi yang sama bukan impor, melainkan janji. Berkasnya dirakit oleh
     * `transactionsToCsv` yang sungguhan, bukan diketik tangan — teks yang
     * diketik tangan akan menguji dugaan penulisnya, bukan keluaran nyatanya.
     */
    const trx: Transaction[] = [
      {
        id: 't1',
        accountId: 'akun-1',
        counterAccountId: null,
        categoryId: 'kat-1',
        kind: 'expense',
        amount: 55_000,
        currency: 'IDR',
        occurredAt: Date.UTC(2026, 7, 14, 5),
        note: 'Makan siang, berdua',
        merchant: 'Warung "Bu Tini"',
      },
      {
        id: 't2',
        accountId: 'akun-1',
        counterAccountId: 'akun-2',
        categoryId: null,
        kind: 'transfer',
        amount: 200_000,
        currency: 'IDR',
        occurredAt: Date.UTC(2026, 7, 15, 5),
        note: null,
        merchant: null,
      },
    ];

    const hasil = bacaCsvTransaksi(transactionsToCsv(trx, AKUN, KATEGORI));

    expect(hasil.errors).toEqual([]);
    expect(hasil.rows).toHaveLength(2);
    expect(hasil.rows[0]).toMatchObject({
      occurredAt: '2026-08-14',
      kind: 'expense',
      accountName: 'Bank Utama',
      categoryName: 'Makan & Minum',
      merchant: 'Warung "Bu Tini"',
      note: 'Makan siang, berdua',
      amount: 55_000,
    });
    expect(hasil.rows[1]).toMatchObject({
      kind: 'transfer',
      accountName: 'Bank Utama',
      counterAccountName: 'Dompet Tunai',
      amount: 200_000,
    });
  });

  it('mengenali nama kolom dalam bahasa Inggris', () => {
    const hasil = bacaCsvTransaksi(
      'Date,Type,Account,Category,Description,Amount\n2026-08-14,Expense,Bank Utama,Makan & Minum,Kopi,25000',
    );
    expect(hasil.errors).toEqual([]);
    expect(hasil.rows[0]).toMatchObject({
      occurredAt: '2026-08-14',
      kind: 'expense',
      accountName: 'Bank Utama',
      note: 'Kopi',
      amount: 25_000,
    });
  });

  it('TANDA jumlah menentukan jenis ketika kolom jenis tidak ada', () => {
    /* Rekening koran tidak punya kolom "Jenis"; yang ada hanya jumlah
       bertanda. Mengabaikannya berarti seluruh mutasi masuk sebagai
       pengeluaran, termasuk gaji. */
    const hasil = bacaCsvTransaksi(
      'Tanggal,Dompet,Jumlah\n2026-08-14,Bank Utama,(150.000)\n2026-08-15,Bank Utama,9.000.000',
    );
    expect(hasil.errors).toEqual([]);
    expect(hasil.rows[0]).toMatchObject({ kind: 'expense', amount: 150_000 });
    expect(hasil.rows[1]).toMatchObject({ kind: 'income', amount: 9_000_000 });
  });

  it('jumlah selalu POSITIF, tandanya pindah ke jenis', () => {
    const hasil = bacaCsvTransaksi('Tanggal,Jenis,Dompet,Jumlah\n2026-08-14,Pengeluaran,Bank,-55.000');
    expect(hasil.rows[0]?.amount).toBe(55_000);
    expect(hasil.rows[0]?.kind).toBe('expense');
  });

  it('berkas tanpa kolom wajib ditolak seluruhnya', () => {
    const hasil = bacaCsvTransaksi('Nama,Alamat\nBudi,Jakarta');
    expect(hasil.rows).toEqual([]);
    expect(hasil.errors[0]?.reason).toMatch(/kolom/i);
  });

  it('baris rusak dilaporkan dengan NOMOR BARISNYA, sisanya tetap terbaca', () => {
    /* Menolak seluruh berkas karena satu baris cacat memaksa orang mencari
       sendiri baris mana — di berkas seribu baris itu berarti menyerah. */
    const hasil = bacaCsvTransaksi(
      [
        'Tanggal,Jenis,Dompet,Jumlah',
        '2026-08-14,Pengeluaran,Bank Utama,55.000',
        'kemarin,Pengeluaran,Bank Utama,10.000',
        '2026-08-16,Pengeluaran,Bank Utama,bukan angka',
        '2026-08-17,Pengeluaran,Bank Utama,20.000',
      ].join('\n'),
    );

    expect(hasil.rows).toHaveLength(2);
    expect(hasil.errors).toHaveLength(2);
    expect(hasil.errors[0]?.line).toBe(3);
    expect(hasil.errors[1]?.line).toBe(4);
  });

  it('jumlah nol ditolak, bukan diterima diam-diam', () => {
    const hasil = bacaCsvTransaksi('Tanggal,Jenis,Dompet,Jumlah\n2026-08-14,Pengeluaran,Bank,0');
    expect(hasil.rows).toEqual([]);
    expect(hasil.errors).toHaveLength(1);
  });

  it('berkas kosong bukan galat, hanya kosong', () => {
    expect(bacaCsvTransaksi('').rows).toEqual([]);
    expect(bacaCsvTransaksi('Tanggal,Jenis,Dompet,Jumlah\n').rows).toEqual([]);
  });

  it('baris dengan kolom lebih sedikit tidak menggeser nilai', () => {
    const hasil = bacaCsvTransaksi(
      'Tanggal,Jenis,Dompet,Kategori,Jumlah\n2026-08-14,Pengeluaran,Bank Utama,55.000',
    );
    /* Kolom "Jumlah" hilang karena barisnya pendek — dilaporkan, tidak dibaca
       dari kolom sebelahnya. */
    expect(hasil.rows).toEqual([]);
    expect(hasil.errors).toHaveLength(1);
  });
});
