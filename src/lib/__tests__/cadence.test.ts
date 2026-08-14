import { describe, expect, it } from 'vitest';

import { labelJatuhTempo, ringkasIrama } from '../cadence';

/**
 * Kalimat yang menjelaskan sebuah irama.
 *
 * Diuji karena inilah satu-satunya tempat pengguna diberi tahu KAPAN uangnya
 * akan keluar. Kalimat yang salah di sini tidak menghasilkan galat apa pun —
 * ia hanya membuat orang mengira tagihannya jatuh di hari yang lain.
 */

describe('ringkasIrama', () => {
  it('harian', () => {
    expect(ringkasIrama({ cadence: 'daily', interval: 1, startsOn: '2026-08-14' })).toBe(
      'Setiap hari',
    );
    expect(ringkasIrama({ cadence: 'daily', interval: 3, startsOn: '2026-08-14' })).toBe(
      'Setiap 3 hari',
    );
  });

  it('mingguan menyebut HARINYA, bukan sekadar "tiap pekan"', () => {
    /* 14 Agustus 2026 adalah Jumat. "Setiap pekan" tidak memberi tahu apa pun
       yang dapat dipakai orang untuk menyiapkan uangnya. */
    expect(ringkasIrama({ cadence: 'weekly', interval: 1, startsOn: '2026-08-14' })).toBe(
      'Setiap Jumat',
    );
    expect(ringkasIrama({ cadence: 'weekly', interval: 2, startsOn: '2026-08-14' })).toBe(
      'Setiap 2 pekan, hari Jumat',
    );
  });

  it('bulanan menyebut tanggalnya', () => {
    expect(ringkasIrama({ cadence: 'monthly', interval: 1, startsOn: '2026-08-14' })).toBe(
      'Setiap tanggal 14',
    );
    expect(ringkasIrama({ cadence: 'monthly', interval: 3, startsOn: '2026-08-14' })).toBe(
      'Setiap 3 bulan, tanggal 14',
    );
  });

  it('tanggal di atas 28 MENGATAKAN penjepitannya', () => {
    /* Tagihan tanggal 31 tidak ada di bulan Februari. Diam soal ini membuat
       orang mengira Februari terlewat. */
    expect(ringkasIrama({ cadence: 'monthly', interval: 1, startsOn: '2026-01-31' })).toBe(
      'Setiap tanggal 31, atau akhir bulan bila lebih pendek',
    );
    expect(ringkasIrama({ cadence: 'monthly', interval: 1, startsOn: '2026-01-29' })).toBe(
      'Setiap tanggal 29, atau akhir bulan bila lebih pendek',
    );
    expect(ringkasIrama({ cadence: 'monthly', interval: 1, startsOn: '2026-01-28' })).toBe(
      'Setiap tanggal 28',
    );
  });
});

describe('labelJatuhTempo', () => {
  it('hari ini dan besok punya kata sendiri', () => {
    expect(labelJatuhTempo('2026-08-14', '2026-08-14')).toBe('Jatuh hari ini');
    expect(labelJatuhTempo('2026-08-15', '2026-08-14')).toBe('Jatuh besok');
  });

  it('menghitung hari untuk yang dekat', () => {
    expect(labelJatuhTempo('2026-08-20', '2026-08-14')).toBe('6 hari lagi');
  });

  it('menyebut tanggalnya untuk yang jauh', () => {
    /* "Dalam 47 hari" memaksa orang membuka kalender. Tanggalnya tidak. */
    expect(labelJatuhTempo('2026-09-30', '2026-08-14')).toBe('30 September 2026');
  });

  it('yang sudah lewat dikatakan apa adanya', () => {
    /* Terjadi pada aturan yang baru dilanjutkan atau saat pekerja tertidur.
       Menyembunyikannya membuat aturan terlihat sehat padahal tertinggal. */
    expect(labelJatuhTempo('2026-08-13', '2026-08-14')).toBe('Terlambat 1 hari');
    expect(labelJatuhTempo('2026-08-10', '2026-08-14')).toBe('Terlambat 4 hari');
  });

  it('menyeberangi bulan tanpa salah hitung', () => {
    expect(labelJatuhTempo('2026-09-01', '2026-08-31')).toBe('Jatuh besok');
    expect(labelJatuhTempo('2027-01-01', '2026-12-31')).toBe('Jatuh besok');
  });
});
