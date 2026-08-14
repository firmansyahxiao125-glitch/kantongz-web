import { describe, expect, it } from 'vitest';

import {
  DIAM_SEBELUM_ISTIRAHAT,
  DURASI,
  type FaseRonin,
  goyangKamera,
  majuFase,
  poseTebasan,
  stanceGulir,
  totalTebasan,
} from '../ronin';

/**
 * Mesin keadaan tebasan Ronin.
 *
 * Diuji sendirian, tanpa WebGL dan tanpa React, karena inilah bagian yang
 * menentukan apakah tebasannya terasa benar. Sudut bilah, guncangan kamera,
 * dan jejaknya seluruhnya fungsi murni dari (fase, waktu) — jadi komponen 3D
 * di atasnya hanya memanggil, tidak memutuskan.
 *
 * Yang TIDAK diuji di sini: apakah ia terlihat bagus. Tidak ada angka untuk
 * itu, dan uji yang berpura-pura punya akan mengubah selera menjadi kegagalan.
 */

const maju = (fase: FaseRonin, t: number) => majuFase(fase, t);

describe('urutan fase', () => {
  it('diam bertahan sampai diminta', () => {
    expect(maju('diam', 0).fase).toBe('diam');
    expect(maju('diam', 999).fase).toBe('diam');
  });

  it('ancang menjadi tebas sesudah durasinya', () => {
    expect(maju('ancang', DURASI.ancang - 0.001).fase).toBe('ancang');
    expect(maju('ancang', DURASI.ancang).fase).toBe('tebas');
  });

  it('tebas menjadi pulih', () => {
    expect(maju('tebas', DURASI.tebas - 0.001).fase).toBe('tebas');
    expect(maju('tebas', DURASI.tebas).fase).toBe('pulih');
  });

  it('pulih menjadi terbuka — lapisan datanya tinggal', () => {
    expect(maju('pulih', DURASI.pulih).fase).toBe('terbuka');
  });

  it('terbuka TIDAK pernah menutup sendiri', () => {
    /* Yang membuka lapisan data adalah orangnya; yang menutupnya juga. Panel
       angka yang lenyap sendiri sesudah beberapa detik adalah panel yang tidak
       sempat dibaca siapa pun. */
    expect(maju('terbuka', 0.1).fase).toBe('terbuka');
    expect(maju('terbuka', 60).fase).toBe('terbuka');
  });

  it('perpindahan fase mengatur ulang jamnya', () => {
    const r = maju('ancang', DURASI.ancang + 0.05);
    expect(r.fase).toBe('tebas');
    expect(r.t).toBeCloseTo(0.05, 5);
  });

  it('seluruh tebasan selesai di bawah satu detik', () => {
    /* Gerakan yang lebih lama dari sedetik berhenti terbaca sebagai tebasan
       dan mulai terbaca sebagai animasi memuat. */
    expect(totalTebasan()).toBeLessThan(1);
    expect(totalTebasan()).toBeGreaterThan(0.4);
  });
});

describe('pose bilah', () => {
  it('diam: bilah beristirahat, tanpa jejak', () => {
    const p = poseTebasan('diam', 0);
    expect(p.jejak).toBe(0);
    expect(p.mekar).toBe(0);
  });

  it('ancang MENARIK bilah ke belakang lebih dulu', () => {
    /* Tanpa tarikan balik, tebasan terbaca sebagai tangan yang tergelincir.
       Sudutnya harus melewati titik istirahat ke arah yang berlawanan. */
    const awal = poseTebasan('ancang', 0).bilah;
    const akhir = poseTebasan('ancang', DURASI.ancang * 0.99).bilah;
    expect(akhir).toBeLessThan(awal);
  });

  it('tebas menyapu satu arah, tanpa berbalik', () => {
    /* Bilah yang berbalik di tengah ayunan terbaca sebagai gagal, bukan
       sebagai tebasan. Diperiksa monoton di dua puluh cuplikan. */
    const nilai = Array.from({ length: 20 }, (_, i) =>
      poseTebasan('tebas', (DURASI.tebas * i) / 19).bilah,
    );
    for (let i = 1; i < nilai.length; i += 1) {
      expect(nilai[i]).toBeGreaterThanOrEqual(nilai[i - 1] as number);
    }
  });

  it('jejak hanya ada selama ayunan', () => {
    expect(poseTebasan('ancang', DURASI.ancang / 2).jejak).toBe(0);
    expect(poseTebasan('tebas', DURASI.tebas / 2).jejak).toBeGreaterThan(0.2);
    expect(poseTebasan('terbuka', 5).jejak).toBe(0);
  });

  it('mekar memuncak SEKALI, di tengah ayunan', () => {
    const tengah = poseTebasan('tebas', DURASI.tebas * 0.5).mekar;
    expect(tengah).toBeGreaterThan(poseTebasan('tebas', 0).mekar);
    expect(tengah).toBeGreaterThan(poseTebasan('tebas', DURASI.tebas * 0.99).mekar);
  });

  it('setiap pose terbatas — tidak ada nilai yang lepas', () => {
    const fase: FaseRonin[] = ['diam', 'ancang', 'tebas', 'pulih', 'terbuka'];
    for (const f of fase) {
      for (let i = 0; i <= 10; i += 1) {
        const p = poseTebasan(f, i * 0.12);
        expect(Math.abs(p.bilah)).toBeLessThanOrEqual(Math.PI * 1.2);
        expect(p.jejak).toBeGreaterThanOrEqual(0);
        expect(p.jejak).toBeLessThanOrEqual(1);
        expect(p.mekar).toBeGreaterThanOrEqual(0);
        expect(p.mekar).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('goyang kamera', () => {
  it('nol di luar ayunan', () => {
    expect(goyangKamera('diam', 0)).toBe(0);
    expect(goyangKamera('ancang', 0.05)).toBe(0);
    expect(goyangKamera('terbuka', 1)).toBe(0);
  });

  it('SATU denyut yang meluruh, bukan getaran', () => {
    /*
     * Getaran yang berayun bolak-balik adalah mual, bukan sinematik. Nilainya
     * harus menurun monoton sejak puncaknya — tidak pernah naik lagi.
     */
    const nilai = Array.from({ length: 24 }, (_, i) =>
      goyangKamera('tebas', (DURASI.tebas * i) / 23),
    );
    const puncak = nilai.indexOf(Math.max(...nilai));
    for (let i = puncak + 1; i < nilai.length; i += 1) {
      expect(nilai[i]).toBeLessThanOrEqual((nilai[i - 1] as number) + 1e-9);
    }
  });

  it('amplitudonya KECIL — piksel, bukan sentimeter', () => {
    const puncak = Math.max(
      ...Array.from({ length: 40 }, (_, i) => goyangKamera('tebas', (DURASI.tebas * i) / 39)),
    );
    expect(puncak).toBeGreaterThan(0);
    expect(puncak).toBeLessThanOrEqual(0.045);
  });
});

describe('koreografi gulir', () => {
  it('setiap beat mendarat pada pose istirahat yang stabil', () => {
    /*
     * Kalau orang berhenti menggulir di tengah, bingkainya harus tetap
     * tersusun — tidak pernah setengah jalan antara dua pose. Diperiksa
     * dengan menuntut turunan mendekati nol tepat di setiap beat.
     */
    for (let b = 0; b < stanceGulir.jumlah; b += 1) {
      const pada = b / (stanceGulir.jumlah - 1);
      const d = 0.004;
      const kiri = stanceGulir.pose(Math.max(0, pada - d));
      const kanan = stanceGulir.pose(Math.min(1, pada + d));
      expect(Math.abs(kanan.putar - kiri.putar)).toBeLessThan(0.02);
      expect(Math.abs(kanan.mundur - kiri.mundur)).toBeLessThan(0.02);
    }
  });

  it('mundur selalu menjauh seiring gulir', () => {
    const nilai = Array.from({ length: 30 }, (_, i) => stanceGulir.pose(i / 29).mundur);
    for (let i = 1; i < nilai.length; i += 1) {
      expect(nilai[i]).toBeGreaterThanOrEqual((nilai[i - 1] as number) - 1e-9);
    }
  });

  it('nilai di luar 0–1 dijepit, bukan meledak', () => {
    expect(stanceGulir.pose(-5)).toEqual(stanceGulir.pose(0));
    expect(stanceGulir.pose(9)).toEqual(stanceGulir.pose(1));
  });
});

describe('kembali beristirahat', () => {
  it('ambangnya delapan detik', () => {
    expect(DIAM_SEBELUM_ISTIRAHAT).toBe(8);
  });
});
