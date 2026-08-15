import { describe, expect, it } from 'vitest';

import { hitungSkor, susunPeringatan, type MasukanKesehatan } from '@/lib/kesehatan';

const SEKARANG = Date.UTC(2026, 7, 15);
const hariDepan = (n: number): string => new Date(SEKARANG + n * 86_400_000).toISOString();

function masukan(ubah: Partial<MasukanKesehatan> = {}): MasukanKesehatan {
  return {
    monthIncome: 10_000_000,
    monthExpense: 6_000_000,
    budgets: [],
    goals: [],
    sekarang: SEKARANG,
    namaKategori: (id) => `Kategori ${id}`,
    ...ubah,
  };
}

describe('susunPeringatan', () => {
  it('diam ketika tidak ada yang perlu dikatakan', () => {
    expect(susunPeringatan(masukan())).toEqual([]);
  });

  it('menandai anggaran yang JEBOL sebagai bahaya', () => {
    const p = susunPeringatan(
      masukan({ budgets: [{ id: 'b1', categoryId: 'c1', spent: 1_200_000, effectiveAmount: 1_000_000 }] }),
    );
    expect(p).toHaveLength(1);
    expect(p[0]?.tingkat).toBe('bahaya');
    expect(p[0]?.judul).toContain('terlampaui');
  });

  it('menandai anggaran HAMPIR habis sebagai awas, bukan bahaya', () => {
    const p = susunPeringatan(
      masukan({ budgets: [{ id: 'b1', categoryId: 'c1', spent: 900_000, effectiveAmount: 1_000_000 }] }),
    );
    expect(p[0]?.tingkat).toBe('awas');
  });

  it('DIAM pada 84% — ambangnya 85, bukan "kira-kira banyak"', () => {
    const p = susunPeringatan(
      masukan({ budgets: [{ id: 'b1', categoryId: 'c1', spent: 840_000, effectiveAmount: 1_000_000 }] }),
    );
    expect(p).toEqual([]);
  });

  it('mengabaikan anggaran yang batas efektifnya nol — pembagian nol bukan peringatan', () => {
    const p = susunPeringatan(
      masukan({ budgets: [{ id: 'b1', categoryId: 'c1', spent: 500_000, effectiveAmount: 0 }] }),
    );
    expect(p).toEqual([]);
  });

  it('menyebut tujuan yang tertinggal laju, bukan setiap tujuan yang belum selesai', () => {
    const jauh = {
      id: 'g-jauh',
      name: 'Rumah',
      targetAmount: 100_000_000,
      savedAmount: 1_000_000,
      targetDate: hariDepan(900),
      achieved: false,
    };
    const dekat = {
      id: 'g-dekat',
      name: 'Liburan',
      targetAmount: 10_000_000,
      savedAmount: 1_000_000,
      targetDate: hariDepan(10),
      achieved: false,
    };
    const p = susunPeringatan(masukan({ goals: [jauh, dekat] }));
    expect(p).toHaveLength(1);
    expect(p[0]?.judul).toContain('Liburan');
  });

  it('tidak menyebut tujuan yang SUDAH tercapai', () => {
    const p = susunPeringatan(
      masukan({
        goals: [
          {
            id: 'g1',
            name: 'Dana darurat',
            targetAmount: 10_000_000,
            savedAmount: 10_000_000,
            targetDate: hariDepan(5),
            achieved: true,
          },
        ],
      }),
    );
    expect(p).toEqual([]);
  });

  it('menandai pengeluaran yang melebihi pemasukan', () => {
    const p = susunPeringatan(masukan({ monthIncome: 5_000_000, monthExpense: 7_000_000 }));
    expect(p.some((x) => x.id === 'arus-negatif')).toBe(true);
  });

  it('mengurutkan bahaya SEBELUM awas', () => {
    const p = susunPeringatan(
      masukan({
        monthIncome: 5_000_000,
        monthExpense: 7_000_000,
        budgets: [{ id: 'b1', categoryId: 'c1', spent: 900_000, effectiveAmount: 1_000_000 }],
      }),
    );
    expect(p[0]?.tingkat).toBe('bahaya');
    expect(p.at(-1)?.tingkat).toBe('awas');
  });
});

describe('hitungSkor', () => {
  it('nol ketika tidak ada apa-apa dan arus kasnya tidak positif', () => {
    const s = hitungSkor(masukan({ monthIncome: 0, monthExpense: 0 }));
    expect(s.nilai).toBe(0);
    expect(s.tingkat).toBe('perlu perhatian');
  });

  it('seratus ketika keempat komponennya penuh', () => {
    const s = hitungSkor(
      masukan({
        monthIncome: 10_000_000,
        monthExpense: 5_000_000,
        budgets: [{ id: 'b1', categoryId: 'c1', spent: 100_000, effectiveAmount: 1_000_000 }],
        goals: [
          {
            id: 'g1',
            name: 'Dana darurat',
            targetAmount: 1_000_000,
            savedAmount: 1_000_000,
            targetDate: null,
            achieved: false,
          },
        ],
      }),
    );
    expect(s.nilai).toBe(100);
    expect(s.tingkat).toBe('baik');
  });

  it('TIDAK naik ketika belanja bertambah — poin untuk kesehatan, bukan transaksi', () => {
    const sedikit = hitungSkor(masukan({ monthExpense: 3_000_000 }));
    const banyak = hitungSkor(masukan({ monthExpense: 9_000_000 }));
    expect(banyak.nilai).toBeLessThan(sedikit.nilai);
  });

  it('rinciannya berjumlah sama dengan nilainya — angkanya harus dapat dijelaskan', () => {
    const s = hitungSkor(
      masukan({
        budgets: [{ id: 'b1', categoryId: 'c1', spent: 500_000, effectiveAmount: 1_000_000 }],
        goals: [
          {
            id: 'g1',
            name: 'X',
            targetAmount: 1_000_000,
            savedAmount: 400_000,
            targetDate: null,
            achieved: false,
          },
        ],
      }),
    );
    expect(s.rincian.reduce((a, r) => a + r.nilai, 0)).toBe(s.nilai);
    expect(s.rincian.every((r) => r.nilai >= 0 && r.nilai <= r.maks)).toBe(true);
  });

  it('laju menabung dijepit — menabung 90% tidak memberi lebih dari nilai penuhnya', () => {
    const a = hitungSkor(masukan({ monthIncome: 10_000_000, monthExpense: 8_000_000 }));
    const b = hitungSkor(masukan({ monthIncome: 10_000_000, monthExpense: 1_000_000 }));
    const lajuA = a.rincian.find((r) => r.label === 'Laju menabung')?.nilai;
    const lajuB = b.rincian.find((r) => r.label === 'Laju menabung')?.nilai;
    expect(lajuA).toBe(25);
    expect(lajuB).toBe(25);
  });
});
