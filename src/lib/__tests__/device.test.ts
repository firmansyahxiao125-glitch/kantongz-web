import { describe, expect, it } from 'vitest';

import { labelPerangkat, namaPeramban } from '../device';

/**
 * Nama perangkat di daftar sesi.
 *
 * Baris ini adalah SATU-SATUNYA hal yang dibaca pengguna untuk menjawab
 * "apakah ini perangkatku" sebelum menekan Akhiri. Kalau ia salah, orang
 * mengakhiri sesi yang keliru — atau lebih buruk, membiarkan sesi asing hidup
 * karena mengira itu miliknya.
 */

const UA = {
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  edge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 OPR/110.0.0.0',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  headless:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
};

describe('nama peramban dari User-Agent', () => {
  /*
   * URUTAN ADALAH ATURANNYA, dan uji ini yang menegakkannya.
   *
   * Edge, Opera, dan Samsung Internet SEMUANYA memuat "Chrome/" di UA-nya;
   * Chrome memuat "Safari/". Kalau urutan pemeriksaan terbalik, setiap
   * peramban dilaporkan sebagai Chrome dan daftar sesi berbohong dengan
   * percaya diri.
   */
  it('membedakan peramban yang UA-nya saling memuat', () => {
    expect(namaPeramban(UA.edge)).toBe('Edge');
    expect(namaPeramban(UA.opera)).toBe('Opera');
    expect(namaPeramban(UA.samsung)).toBe('Samsung Internet');
    expect(namaPeramban(UA.chrome)).toBe('Chrome');
    expect(namaPeramban(UA.safari)).toBe('Safari');
    expect(namaPeramban(UA.firefox)).toBe('Firefox');
  });

  it('menandai peramban headless apa adanya', () => {
    /* Sesi headless hampir selalu berasal dari perkakas, bukan manusia.
       Menyamarkannya sebagai "Chrome" menyembunyikan justru yang paling
       pantas dicurigai. */
    expect(namaPeramban(UA.headless)).toBe('Chrome (headless)');
  });

  it('tidak pernah mengembalikan kosong', () => {
    expect(namaPeramban(null)).toBe('Peramban');
    expect(namaPeramban('')).toBe('Peramban');
    expect(namaPeramban('sesuatu-yang-tidak-dikenal')).toBe('Peramban');
  });
});

describe('label perangkat', () => {
  it('meringkas User-Agent panjang milik sesi lama', () => {
    /* Sesi yang tersimpan sebelum BFF berhenti menyimpan UA utuh masih ada di
       basis data. Antarmuka harus membuatnya terbaca, bukan menunggu mereka
       kedaluwarsa. */
    expect(labelPerangkat('web', UA.chrome)).toBe('Chrome');
    expect(labelPerangkat('web', UA.headless)).toBe('Chrome (headless)');
  });

  it('MEMBIARKAN nama perangkat sungguhan apa adanya', () => {
    /* Klien mobile mengirim nama perangkat, bukan UA. Menerjemahkannya
       menjadi "Peramban" membuang informasi yang paling berguna. */
    expect(labelPerangkat('android', 'Pixel 8')).toBe('Pixel 8');
    expect(labelPerangkat('ios', 'iPhone 15 Pro')).toBe('iPhone 15 Pro');
    expect(labelPerangkat('web', 'Chrome')).toBe('Chrome');
  });

  it('jatuh ke platform ketika model tidak ada', () => {
    expect(labelPerangkat('web', null)).toBe('web');
    expect(labelPerangkat('android', '   ')).toBe('android');
  });
});
