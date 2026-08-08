import { describe, expect, it } from 'vitest';

import { rasioPengeluaran } from '../delta';

/**
 * Persentase perubahan pengeluaran.
 *
 * Yang diuji di sini bukan aritmetikanya melainkan PENOLAKANNYA: setiap kasus
 * di mana tidak ada pembanding yang sah harus menghasilkan `null`, bukan angka.
 * Angka yang dikarang di tempat ini tampil sebagai lencana persen di sebelah
 * uang pengguna, dan lencana yang meyakinkan tidak akan dipertanyakan siapa pun.
 */
describe('rasioPengeluaran', () => {
  it('menghitung kenaikan terhadap bulan sebelumnya', () => {
    /* Bulan ini 150rb, naik 50rb → bulan lalu 100rb → +50%. */
    expect(rasioPengeluaran(150_000, 50_000)).toBeCloseTo(0.5);
  });

  it('menghitung penurunan', () => {
    /* Bulan ini 80rb, turun 20rb → bulan lalu 100rb → −20%. */
    expect(rasioPengeluaran(80_000, -20_000)).toBeCloseTo(-0.2);
  });

  it('mengembalikan null ketika tidak ada pembanding', () => {
    expect(rasioPengeluaran(150_000, null)).toBeNull();
  });

  it('mengembalikan null ketika bulan lalu NOL — bukan Infinity', () => {
    /* Bulan pertama memakai aplikasi: seluruh pengeluaran adalah "kenaikan"
       dari nol. Pembagian dengan nol menghasilkan Infinity, dan Infinity yang
       diformat sebagai persen tampil sebagai "∞%" atau "NaN%" di sebelah uang. */
    expect(rasioPengeluaran(150_000, 150_000)).toBeNull();
  });

  it('mengembalikan null ketika bulan lalu negatif', () => {
    /* Tidak seharusnya terjadi, tetapi data yang rusak tidak meminta izin.
       Persentase terhadap basis negatif membalik tandanya secara diam-diam. */
    expect(rasioPengeluaran(100_000, 150_000)).toBeNull();
  });

  it('nol delta berarti tidak berubah, BUKAN tidak ada pembanding', () => {
    /* Perbedaan yang paling mudah hilang: 0 dan null harus tetap berbeda. */
    expect(rasioPengeluaran(100_000, 0)).toBe(0);
  });
});
