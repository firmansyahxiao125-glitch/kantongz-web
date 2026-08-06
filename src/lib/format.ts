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

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** "3 menit lalu". Dipakai lini masa aktivitas dan pusat notifikasi. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
  const diff = new Date(iso).getTime() - now;
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
