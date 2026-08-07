import type { Category, Transaction, WalletAccount } from '@/lib/ledger';

/**
 * Ekspor CSV.
 *
 * Dibuat di peramban dari data yang sudah ada di memori, bukan lewat endpoint
 * ekspor tersendiri. Datanya sudah diambil untuk ditampilkan; memintanya sekali
 * lagi ke server hanya untuk menyusun ulang teks yang sama adalah perjalanan
 * bolak-balik tanpa manfaat.
 */

const KIND_LABEL: Record<Transaction['kind'], string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
};

/**
 * Satu sel CSV.
 *
 * Kutip GANDA di dalam nilai digandakan, dan setiap nilai selalu dikutip.
 * Catatan transaksi memuat koma dan tanda kutip lebih sering daripada yang
 * diduga siapa pun, dan satu sel yang bocor menggeser seluruh kolom di
 * sisanya.
 *
 * Nilai yang diawali `=`, `+`, `-`, atau `@` diberi awalan apostrof: tanpa itu
 * Excel memperlakukannya sebagai rumus, dan berkas ekspor menjadi jalur
 * penyuntikan rumus ke komputer siapa pun yang membukanya.
 */
function cell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function transactionsToCsv(
  rows: Transaction[],
  accounts: WalletAccount[],
  categories: Category[],
): string {
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const header = [
    'Tanggal',
    'Jenis',
    'Dompet',
    'Dompet tujuan',
    'Kategori',
    'Merchant',
    'Catatan',
    'Jumlah',
    'Mata uang',
  ];

  const lines = rows.map((trx) =>
    [
      isoDate(trx.occurredAt),
      KIND_LABEL[trx.kind],
      accountName.get(trx.accountId) ?? '',
      trx.counterAccountId ? (accountName.get(trx.counterAccountId) ?? '') : '',
      trx.categoryId ? (categoryName.get(trx.categoryId) ?? '') : '',
      trx.merchant ?? '',
      trx.note ?? '',
      trx.amount,
      trx.currency,
    ]
      .map(cell)
      .join(','),
  );

  /* CRLF dan BOM: Excel di Windows membaca UTF-8 sebagai ANSI tanpa BOM, dan
     nama dengan é atau · berubah menjadi sampah di kolom pertama yang dibuka
     akuntan. */
  return `﻿${[header.map(cell).join(','), ...lines].join('\r\n')}\r\n`;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  /* Dilepas segera: URL objek menahan seluruh blob di memori sampai dokumen
     ditutup, dan halaman yang dibiarkan terbuka seharian akan mengumpulkannya. */
  URL.revokeObjectURL(url);
}
