/**
 * Kesehatan keuangan: peringatan dan skor, dituhkan dari data yang SUDAH ada.
 *
 * ── MENGAPA MURNI, DAN MENGAPA DI SINI ─────────────────────────────────
 *
 * Tidak ada satu pun titik akhir API baru untuk berkas ini, dan itu keputusan.
 * Setiap sinyal yang dibutuhkan — anggaran yang jebol, tujuan yang tertinggal,
 * belanja melebihi pemasukan — sudah ada di `DashboardSummary`. Menambah
 * endpoint untuk menghitung ulang hal yang sudah dikirim berarti dua tempat
 * yang harus sepakat, dan dua tempat selalu berselisih pada akhirnya.
 *
 * Seluruh isinya fungsi murni tanpa React, tanpa jaringan, tanpa jam. Waktu
 * disuntikkan sebagai argumen. Itu yang membuatnya dapat diuji sebagai
 * aritmetika biasa — pola yang sama dipakai `ronin.ts` dan `cadence.ts`.
 *
 * ── XP UNTUK KESEHATAN, BUKAN UNTUK BELANJA ────────────────────────────
 *
 * Ini keputusan produk, dan ia dijaga di sini supaya tidak diam-diam bergeser.
 * Gamifikasi yang memberi poin untuk TRANSAKSI menghadiahi pengeluaran: makin
 * sering belanja, makin tinggi angkanya. Pada aplikasi keuangan itu bukan
 * cuma salah, itu berbahaya.
 *
 * Yang diberi poin di sini hanya empat hal, dan keempatnya membaik ketika
 * uang penggunanya membaik: anggaran yang dihormati, laju menabung, kemajuan
 * tujuan, dan pemasukan yang melebihi pengeluaran. Tidak ada satu pun poin
 * yang bisa dinaikkan dengan membeli sesuatu.
 */

export type TingkatPeringatan = 'bahaya' | 'awas' | 'kabar';

export interface Peringatan {
  /** Stabil antar-render supaya React tidak menyusun ulang daftarnya. */
  id: string;
  tingkat: TingkatPeringatan;
  judul: string;
  detail: string;
  /** Ke mana pengguna dibawa untuk menindaklanjutinya. */
  tautan: string;
}

interface AnggaranRingkas {
  id: string;
  categoryId: string;
  spent: number;
  /** `amount + carryOver`, tidak pernah di bawah nol. */
  effectiveAmount: number;
}

interface TujuanRingkas {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  achieved: boolean;
}

export interface MasukanKesehatan {
  monthIncome: number;
  monthExpense: number;
  budgets: AnggaranRingkas[];
  goals: TujuanRingkas[];
  /** Milidetik. Disuntikkan, tidak pernah dibaca dari jam global. */
  sekarang: number;
  namaKategori: (id: string) => string;
}

/* ── peringatan ────────────────────────────────────────────────────────── */

/**
 * Ambang "hampir jebol".
 *
 * 85%, bukan 90%: pada 90% sebagian besar orang sudah tidak punya ruang untuk
 * mengubah apa pun di sisa periode, dan peringatan yang datang ketika sudah
 * terlambat hanya menambah rasa bersalah tanpa menambah pilihan.
 */
const AMBANG_HAMPIR = 0.85;

export function susunPeringatan(m: MasukanKesehatan): Peringatan[] {
  const hasil: Peringatan[] = [];

  for (const b of m.budgets) {
    if (b.effectiveAmount <= 0) continue;
    const rasio = b.spent / b.effectiveAmount;
    const nama = m.namaKategori(b.categoryId);

    if (rasio > 1) {
      hasil.push({
        id: `anggaran-jebol-${b.id}`,
        tingkat: 'bahaya',
        judul: `Anggaran ${nama} terlampaui`,
        detail: `Terpakai ${persen(rasio)} dari batas periode ini.`,
        tautan: '/anggaran',
      });
    } else if (rasio >= AMBANG_HAMPIR) {
      hasil.push({
        id: `anggaran-hampir-${b.id}`,
        tingkat: 'awas',
        judul: `Anggaran ${nama} hampir habis`,
        detail: `Terpakai ${persen(rasio)}; sisa ${format(b.effectiveAmount - b.spent)}.`,
        tautan: '/anggaran',
      });
    }
  }

  /*
   * Tujuan yang TERTINGGAL LAJU, bukan sekadar yang belum tercapai.
   *
   * Menandai setiap tujuan yang belum selesai akan memenuhi daftar dengan
   * kabar yang tidak dapat ditindaklanjuti — tujuan tiga tahun memang belum
   * selesai hari ini, dan mengatakannya setiap hari melatih orang mengabaikan
   * seluruh daftarnya.
   *
   * Yang disebut hanya yang kemajuannya tertinggal di belakang WAKTUNYA:
   * separuh tenggat sudah lewat sementara tabungannya belum separuh.
   */
  for (const g of m.goals) {
    if (g.achieved || g.targetDate === null || g.targetAmount <= 0) continue;
    const tenggat = Date.parse(g.targetDate);
    if (Number.isNaN(tenggat) || tenggat <= m.sekarang) continue;

    const majuUang = g.savedAmount / g.targetAmount;
    /* Tanpa tanggal mulai di data, lajunya diukur terhadap sisa waktu:
       tenggat yang tinggal sedikit menuntut kemajuan yang sudah banyak. */
    const sisaHari = (tenggat - m.sekarang) / 86_400_000;
    if (sisaHari <= 30 && majuUang < 0.8) {
      hasil.push({
        id: `tujuan-tertinggal-${g.id}`,
        tingkat: 'awas',
        judul: `Tujuan ${g.name} tertinggal`,
        detail: `Terkumpul ${persen(majuUang)} dan tenggatnya ${Math.round(sisaHari)} hari lagi.`,
        tautan: '/tujuan',
      });
    }
  }

  if (m.monthExpense > m.monthIncome && m.monthIncome > 0) {
    hasil.push({
      id: 'arus-negatif',
      tingkat: 'bahaya',
      judul: 'Pengeluaran melebihi pemasukan',
      detail: `Selisihnya ${format(m.monthExpense - m.monthIncome)} bulan ini.`,
      tautan: '/laporan',
    });
  }

  /* Urut menurut kegentingan, bukan menurut urutan penemuan. Daftar yang
     mencampur "hampir habis" di atas "sudah jebol" memaksa mata memindai
     seluruhnya sebelum tahu mana yang penting. */
  const bobot: Record<TingkatPeringatan, number> = { bahaya: 0, awas: 1, kabar: 2 };
  return hasil.sort((a, b) => bobot[a.tingkat] - bobot[b.tingkat]);
}

/* ── skor ──────────────────────────────────────────────────────────────── */

export interface Skor {
  /** 0–100. */
  nilai: number;
  /** Empat komponen, masing-masing 0–25, supaya angkanya dapat dijelaskan. */
  rincian: { label: string; nilai: number; maks: number }[];
  tingkat: 'baik' | 'cukup' | 'perlu perhatian';
}

/**
 * Skor yang DAPAT DIJELASKAN, bukan satu angka ajaib.
 *
 * Angka tunggal tanpa rincian tidak dapat ditindaklanjuti: orang yang melihat
 * "62" tidak tahu apa yang harus diubah. Keempat komponennya karena itu
 * dikembalikan utuh, dan antarmuka menampilkannya.
 */
export function hitungSkor(m: MasukanKesehatan): Skor {
  /* 1. Anggaran dihormati. */
  const dipakai = m.budgets.filter((b) => b.effectiveAmount > 0);
  const aman = dipakai.filter((b) => b.spent <= b.effectiveAmount).length;
  const nAnggaran = dipakai.length === 0 ? 0 : Math.round((aman / dipakai.length) * 25);

  /* 2. Laju menabung: (pemasukan − pengeluaran) / pemasukan. 20% dapat nilai
        penuh — angka yang lazim dipakai sebagai sasaran sehat, dan cukup
        tinggi untuk berarti tanpa mustahil. */
  const laju = m.monthIncome > 0 ? (m.monthIncome - m.monthExpense) / m.monthIncome : 0;
  const nTabung = Math.round(jepit(laju / 0.2, 0, 1) * 25);

  /* 3. Kemajuan tujuan, dirata-rata. */
  const tujuanAktif = m.goals.filter((g) => g.targetAmount > 0);
  const rataTujuan =
    tujuanAktif.length === 0
      ? 0
      : tujuanAktif.reduce((s, g) => s + jepit(g.savedAmount / g.targetAmount, 0, 1), 0) /
        tujuanAktif.length;
  const nTujuan = Math.round(rataTujuan * 25);

  /* 4. Arus kas positif — biner, karena setengah positif bukan hal yang ada. */
  const nArus = m.monthIncome > m.monthExpense ? 25 : 0;

  const nilai = nAnggaran + nTabung + nTujuan + nArus;

  return {
    nilai,
    rincian: [
      { label: 'Anggaran dihormati', nilai: nAnggaran, maks: 25 },
      { label: 'Laju menabung', nilai: nTabung, maks: 25 },
      { label: 'Kemajuan tujuan', nilai: nTujuan, maks: 25 },
      { label: 'Arus kas positif', nilai: nArus, maks: 25 },
    ],
    tingkat: nilai >= 70 ? 'baik' : nilai >= 40 ? 'cukup' : 'perlu perhatian',
  };
}

/* ── perkakas kecil ────────────────────────────────────────────────────── */

const jepit = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const persen = (x: number): string => `${String(Math.round(x * 100))}%`;

/** Rupiah bulat. Sengaja tidak memakai `Intl` supaya berkas ini tetap murni
 *  dan hasilnya identik di setiap mesin yang menjalankan ujinya. */
function format(n: number): string {
  const bulat = Math.round(Math.abs(n));
  const teks = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '−' : ''}Rp ${teks}`;
}
