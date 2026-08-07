/**
 * Pemformatan angka dan tanggal.
 *
 * Terpusat karena uang yang ditampilkan berbeda format di dua layar adalah
 * cacat yang tidak pernah dilaporkan siapa pun, tetapi selalu terasa.
 */

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const COMPACT = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export function formatIdr(value: number): string {
  return IDR.format(value);
}

export function formatCompact(value: number): string {
  return COMPACT.format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Waktu boleh datang sebagai epoch milidetik, ISO, atau `Date`.
 *
 * API mengirim epoch milidetik; kolom tanggal murni (`starts_on`) mengirim
 * `YYYY-MM-DD`. Satu penerima untuk keduanya mencegah `new Date()` tersebar ke
 * setiap komponen, yang di sanalah zona waktu mulai berbeda-beda.
 */
export type TimeInput = number | string | Date;

function asDate(value: TimeInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: TimeInput): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(asDate(value));
}

export function formatDateTime(value: TimeInput): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    asDate(value),
  );
}

/** Label pendek untuk sumbu grafik: "7 Agu". */
export function formatDayShort(value: TimeInput): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(asDate(value));
}

/** "3 menit lalu". Dipakai lini masa aktivitas dan pusat notifikasi. */
export function formatRelative(value: TimeInput, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
  const diff = asDate(value).getTime() - now;
  const abs = Math.abs(diff);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / 1000), 'second');
}
