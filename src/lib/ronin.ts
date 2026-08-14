/**
 * Mesin keadaan tebasan Ronin.
 *
 * ── MENGAPA IA BUKAN BAGIAN DARI KOMPONEN 3D ────────────────────────────
 *
 * Sudut bilah, guncangan kamera, kepekatan jejak, dan pose gulir seluruhnya
 * fungsi MURNI dari (fase, waktu). Ditulis terpisah, ketiganya dapat diuji
 * tanpa WebGL, tanpa React, dan tanpa satu piksel pun dirender — dan yang
 * menentukan apakah tebasan terasa benar justru angka-angka itu, bukan
 * material atau pencahayaannya.
 *
 * Komponen 3D di atasnya karena itu hanya MEMANGGIL. Ia tidak memutuskan.
 *
 * ── SATUAN ──────────────────────────────────────────────────────────────
 *
 * Waktu dalam detik. Sudut dalam radian. Guncangan dalam satuan dunia
 * three.js — bukan piksel — dan nilainya sengaja kecil: pada kamera jarak 7,
 * 0,03 satuan dunia jatuh di sekitar dua sampai tiga piksel di layar 1440px.
 */

export type FaseRonin = 'diam' | 'ancang' | 'tebas' | 'pulih' | 'terbuka';

/**
 * Panjang setiap fase.
 *
 * Ancang sengaja PENDEK dan ayunannya lebih pendek lagi. Tebasan yang lambat
 * berhenti terbaca sebagai tebasan; yang membuatnya terbaca adalah pemulihan
 * yang panjang sesudahnya — mata butuh waktu untuk mendarat, bukan untuk
 * mengikuti.
 */
export const DURASI = {
  ancang: 0.15,
  tebas: 0.22,
  pulih: 0.4,
} as const;

/** Berapa lama tanpa masukan sebelum ia hanyut kembali ke pose istirahat. */
export const DIAM_SEBELUM_ISTIRAHAT = 8;

export function totalTebasan(): number {
  return DURASI.ancang + DURASI.tebas + DURASI.pulih;
}

const jepit = (v: number, min = 0, max = 1): number => Math.max(min, Math.min(max, v));

/** Pelan di kedua ujung. Dipakai untuk gerak yang harus terasa disengaja. */
const halus = (t: number): number => t * t * (3 - 2 * t);

/** Cepat di awal, mendarat perlahan. Dipakai untuk ayunan. */
const keluar = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Fase berikutnya beserta jam yang sudah diatur ulang.
 *
 * Mengembalikan objek, bukan memutasi: pemanggilnya adalah `useFrame` yang
 * berjalan enam puluh kali per detik, dan keadaan yang dimutasi di sana adalah
 * keadaan yang tidak dapat ditelusuri ketika salah.
 */
export function majuFase(fase: FaseRonin, t: number): { fase: FaseRonin; t: number } {
  if (fase === 'ancang' && t >= DURASI.ancang) return { fase: 'tebas', t: t - DURASI.ancang };
  if (fase === 'tebas' && t >= DURASI.tebas) return { fase: 'pulih', t: t - DURASI.tebas };
  if (fase === 'pulih' && t >= DURASI.pulih) return { fase: 'terbuka', t: 0 };
  /* `diam` dan `terbuka` menunggu perbuatan manusia. Lapisan angka yang lenyap
     sendiri sesudah beberapa detik adalah lapisan yang tidak sempat dibaca. */
  return { fase, t };
}

export interface PoseTebasan {
  /** Sudut bilah, radian. Negatif = tertarik ke belakang. */
  bilah: number;
  /** Puntiran badan mengikuti bilah, lebih kecil dan tertinggal. */
  badan: number;
  /** Kepekatan jejak bilah, 0–1. */
  jejak: number;
  /** Dorongan mekar cahaya, 0–1. */
  mekar: number;
}

const ISTIRAHAT = -0.35;
const TARIK = -1.15;
const AKHIR = 1.05;

/**
 * Pose pada satu titik waktu.
 *
 * ── TARIKAN BALIK ADALAH SETENGAH DARI TEBASANNYA ───────────────────────
 *
 * Tanpa ancang-ancang, ayunan terbaca sebagai tangan yang tergelincir. Bilah
 * ditarik MELEWATI titik istirahat ke arah berlawanan lebih dulu, dan justru
 * gerak kecil itu yang membuat ayunan sesudahnya terasa punya berat.
 */
export function poseTebasan(fase: FaseRonin, t: number): PoseTebasan {
  if (fase === 'ancang') {
    const p = halus(jepit(t / DURASI.ancang));
    return { bilah: ISTIRAHAT + (TARIK - ISTIRAHAT) * p, badan: -0.18 * p, jejak: 0, mekar: 0 };
  }

  if (fase === 'tebas') {
    const p = jepit(t / DURASI.tebas);
    const e = keluar(p);
    return {
      bilah: TARIK + (AKHIR - TARIK) * e,
      /* Badan tertinggal di belakang bilah — itu yang membedakan ayunan dari
         benda kaku yang diputar. */
      badan: -0.18 + 0.5 * halus(jepit(p * 1.35)),
      jejak: Math.sin(Math.PI * p) ** 0.6,
      /* Mekar memuncak SEKALI, di tengah, tepat ketika bilah paling cepat. */
      mekar: Math.sin(Math.PI * p) ** 1.6,
    };
  }

  if (fase === 'pulih') {
    const p = halus(jepit(t / DURASI.pulih));
    return { bilah: AKHIR + (ISTIRAHAT - AKHIR) * p, badan: 0.32 * (1 - p), jejak: 0, mekar: 0 };
  }

  /* `diam` dan `terbuka` berbagi pose istirahat yang sama. Bedanya bukan pada
     tubuhnya melainkan pada apa yang melayang di depannya. */
  return { bilah: ISTIRAHAT, badan: 0, jejak: 0, mekar: 0 };
}

/**
 * Guncangan kamera: SATU denyut yang meluruh.
 *
 * Bukan sinus. Getaran yang berayun bolak-balik adalah mual, bukan sinematik —
 * dan pada layar sebesar apa pun, yang terbaca sebagai hantaman adalah satu
 * sentakan yang langsung mereda, bukan tiga yang saling menyusul.
 *
 * Amplitudonya 0,03 satuan dunia. Pada kamera jarak 7 itu sekitar dua sampai
 * tiga piksel — cukup untuk dirasakan, terlalu kecil untuk diperhatikan.
 */
export function goyangKamera(fase: FaseRonin, t: number): number {
  if (fase !== 'tebas') return 0;
  const p = jepit(t / DURASI.tebas);
  return 0.03 * Math.exp(-9 * p);
}

export interface PoseGulir {
  /** Putaran badan terhadap kamera, radian. */
  putar: number;
  /** Seberapa jauh ia mundur ke dalam kabut, satuan dunia. */
  mundur: number;
}

/**
 * Koreografi gulir: deret POSE ISTIRAHAT, bukan animasi yang digosok.
 *
 * ── MENGAPA BEAT, BUKAN INTERPOLASI BEBAS ───────────────────────────────
 *
 * Kalau orang berhenti menggulir di tengah — dan mereka selalu berhenti di
 * tengah — bingkainya harus tetap tersusun. Animasi yang digosok langsung ke
 * posisi gulir akan membeku di pose setengah jadi: lengan separuh terangkat,
 * badan miring tanpa alasan.
 *
 * Jadi tiap beat punya pose istirahatnya sendiri, dan perpindahan antar-beat
 * memakai pelemahan di KEDUA ujung. Turunannya nol tepat di setiap beat, jadi
 * berhenti di mana pun mendarat pada sesuatu yang disengaja.
 */
const BEAT: PoseGulir[] = [
  { putar: 0, mundur: 0 },
  { putar: -0.22, mundur: 0.9 },
  { putar: 0.14, mundur: 1.8 },
  { putar: -0.08, mundur: 2.6 },
];

export const stanceGulir = {
  jumlah: BEAT.length,

  pose(progres: number): PoseGulir {
    const p = jepit(progres);
    const skala = p * (BEAT.length - 1);
    const i = Math.min(BEAT.length - 2, Math.floor(skala));
    const lokal = halus(jepit(skala - i));

    const a = BEAT[i] as PoseGulir;
    const b = BEAT[i + 1] as PoseGulir;

    return {
      putar: a.putar + (b.putar - a.putar) * lokal,
      mundur: a.mundur + (b.mundur - a.mundur) * lokal,
    };
  },
};
