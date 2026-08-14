import type { Cadence } from '@/lib/ledger';

/**
 * Kalimat yang menjelaskan sebuah irama.
 *
 * Angka `{ cadence: 'monthly', interval: 3, anchorDay: 31 }` benar tetapi tidak
 * memberi tahu siapa pun kapan uangnya keluar. Yang dibaca orang adalah
 * kalimatnya, dan kalimat itulah yang harus tepat.
 *
 * Seluruh berkas bekerja pada `YYYY-MM-DD` — tanggal kalender, sama seperti
 * `schedule.ts` di API. Tidak ada `new Date()` tanpa argumen di sini; hari ini
 * selalu dilewatkan pemanggilnya, dan itulah yang membuatnya dapat diuji.
 */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Tengah hari UTC: jauh dari kedua tepi hari, jadi kebal terhadap pergeseran. */
function pada(on: string): Date {
  return new Date(`${on}T12:00:00Z`);
}

function selisihHari(a: string, b: string): number {
  return Math.round((pada(a).getTime() - pada(b).getTime()) / 86_400_000);
}

export function ringkasIrama(rule: {
  cadence: Cadence;
  interval: number;
  startsOn: string;
}): string {
  const { cadence, interval, startsOn } = rule;

  if (cadence === 'daily') {
    return interval === 1 ? 'Setiap hari' : `Setiap ${String(interval)} hari`;
  }

  if (cadence === 'weekly') {
    /* Harinya disebut, bukan sekadar "tiap pekan". Orang menyiapkan uang untuk
       hari tertentu; "tiap pekan" tidak dapat dipakai untuk itu. */
    const hari = HARI[pada(startsOn).getUTCDay()] ?? '';
    return interval === 1
      ? `Setiap ${hari}`
      : `Setiap ${String(interval)} pekan, hari ${hari}`;
  }

  const tanggal = pada(startsOn).getUTCDate();
  const dasar =
    interval === 1
      ? `Setiap tanggal ${String(tanggal)}`
      : `Setiap ${String(interval)} bulan, tanggal ${String(tanggal)}`;

  /*
   * Penjepitan DIKATAKAN, tidak disembunyikan.
   *
   * Tagihan tanggal 31 tidak punya tanggal 31 di bulan Februari; ia jatuh di
   * akhir bulan. Diam soal ini membuat orang mengira Februari terlewat, lalu
   * mencari transaksi yang sebenarnya ada di tanggal 28.
   *
   * Ambangnya 28, bukan 30: Februari biasa hanya punya 28 hari, jadi tanggal
   * 29 pun sudah dijepit di sebagian besar tahun.
   */
  return tanggal > 28 ? `${dasar}, atau akhir bulan bila lebih pendek` : dasar;
}

/**
 * Kapan kejadian berikutnya, dalam kata-kata.
 *
 * Yang dekat dihitung dalam hari; yang jauh disebut tanggalnya. "Dalam 47 hari"
 * memaksa orang membuka kalender untuk mengerti, dan angka yang harus
 * diterjemahkan sendiri bukan informasi.
 */
export function labelJatuhTempo(nextRunOn: string, today: string): string {
  const beda = selisihHari(nextRunOn, today);

  if (beda < 0) {
    const n = Math.abs(beda);
    return `Terlambat ${String(n)} hari`;
  }
  if (beda === 0) return 'Jatuh hari ini';
  if (beda === 1) return 'Jatuh besok';
  if (beda <= 30) return `${String(beda)} hari lagi`;

  const d = pada(nextRunOn);
  return `${String(d.getUTCDate())} ${BULAN[d.getUTCMonth()] ?? ''} ${String(d.getUTCFullYear())}`;
}

/** Hari ini sebagai `YYYY-MM-DD` LOKAL. Nilai `<input type=date>` juga lokal. */
export function hariIniLokal(at: Date = new Date()): string {
  return `${String(at.getFullYear())}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
}
