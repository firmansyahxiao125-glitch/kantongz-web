'use client';

import { useSyncExternalStore } from 'react';

/**
 * Seberapa banyak grafik yang boleh dijalankan perangkat ini.
 *
 * Adegan 3D yang selalu dinyalakan adalah janji yang tidak semua perangkat bisa
 * ditepati. Laptop terintegrasi, ponsel kelas menengah, dan mesin virtual tanpa
 * akselerasi akan menjalankannya pada belasan frame per detik — dan antarmuka
 * yang tersendat terasa RUSAK, bukan mewah. Lebih baik tidak menampilkannya
 * sama sekali daripada menampilkannya dengan buruk.
 *
 * Tingkat dipilih SEKALI dan dipegang. Penurunan mutu adaptif di tengah jalan
 * menghasilkan adegan yang berubah sendiri di depan mata pengguna, dan itu
 * lebih mengganggu daripada satu tingkat yang dipilih lebih awal.
 */

export type GraphicsTier =
  /** Tanpa 3D sama sekali. Pengganti statis yang tetap menyampaikan isinya. */
  | 'off'
  /** Geometri lebih sederhana, tanpa pascaproses, DPR dijepit ke 1. */
  | 'lite'
  /** Seluruhnya: bloom, kedalaman medan, dan kerapatan partikel penuh. */
  | 'full';

/**
 * Apakah WebGL benar-benar dapat dibuat.
 *
 * `'WebGLRenderingContext' in window` TIDAK cukup: konteksnya bisa ada sebagai
 * tipe sementara pembuatannya gagal karena driver diblokir, akselerasi
 * dimatikan, atau terlalu banyak konteks sudah hidup di tab lain. Satu-satunya
 * jawaban yang jujur adalah mencoba membuatnya.
 */
function probeWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (gl === null) return false;

    /* Konteks uji dilepas segera. Peramban membatasi jumlah konteks WebGL yang
       hidup bersamaan, dan yang bocor di sini akan mencuri jatah adegan
       sungguhan yang menyusul. */
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Hasil uji WebGL disimpan.
 *
 * `getSnapshot` dipanggil pada setiap render. Membuat konteks WebGL di sana
 * akan membuat dan membuang puluhan konteks per detik — persis sumber daya
 * yang paling ketat jatahnya di peramban.
 */
let webglCache: boolean | null = null;

function webglWorks(): boolean {
  webglCache ??= probeWebgl();
  return webglCache;
}

interface NavigatorWithMemory extends Navigator {
  /** Chromium saja. `undefined` di tempat lain, dan itu bukan sinyal buruk. */
  deviceMemory?: number;
}

/**
 * Preferensi pengguna, dan mengapa ia berdiri TERPISAH dari deteksi.
 *
 * `detectTier` menjawab "sanggupkah perangkat ini". Ia tidak pernah dapat
 * menjawab "maukah orangnya" — dan keduanya jawaban berbeda yang sering
 * berlawanan. Mesin yang sanggup menjalankan adegan penuh tetap boleh dimiliki
 * seseorang yang tidak menginginkannya: baterai tinggal sedikit, tethering
 * mahal, atau gerak di layar memang mengganggunya tanpa ia menyalakan
 * `prefers-reduced-motion` di tingkat sistem.
 *
 * Disimpan di `localStorage` dan bukan di server: ia sifat PERANGKAT, bukan
 * sifat akun. Orang yang mematikannya di ponsel tua belum tentu ingin
 * mematikannya di desktopnya.
 */
export type Preferensi3D = 'mati' | 'otomatis' | 'penuh';

const KUNCI_PREF = 'kantongz.efek3d';

export function baca3D(): Preferensi3D {
  if (typeof window === 'undefined') return 'otomatis';
  try {
    const v = window.localStorage.getItem(KUNCI_PREF);
    return v === 'mati' || v === 'penuh' ? v : 'otomatis';
  } catch {
    /* Mode privat sebagian peramban melempar pada localStorage. Jatuh ke
       bawaan lebih baik daripada halaman yang gagal dirender. */
    return 'otomatis';
  }
}

const pendengar = new Set<() => void>();

export function tulis3D(nilai: Preferensi3D): void {
  try {
    window.localStorage.setItem(KUNCI_PREF, nilai);
  } catch {
    /* Diabaikan dengan sengaja: preferensi yang gagal disimpan tetap harus
       berlaku untuk sesi ini. */
  }
  pendengar.forEach((f) => { f(); });
}

export function detectTier(): GraphicsTier {
  if (typeof window === 'undefined') return 'off';

  /* Permintaan pengguna menang atas kemampuan perangkat. Seseorang yang
     meminta gerak dikurangi tidak sedang meminta gerak yang lebih halus. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';

  /* Saklar eksplisit menang atas segalanya, termasuk atas perangkat yang
     sanggup. Preferensi yang dapat dikalahkan deteksi bukan preferensi. */
  if (baca3D() === 'mati') return 'off';

  if (!webglWorks()) return 'off';

  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency;
  const memory = nav.deviceMemory;

  /* Empat inti dan 4 GB adalah garis tempat ponsel kelas menengah 2020-an
     berada. Nilai yang TIDAK dilaporkan diperlakukan sebagai cukup — menghukum
     peramban karena tidak membocorkan spesifikasi perangkat akan mematikan 3D
     di Safari untuk semua orang. */
  if (typeof cores === 'number' && cores > 0 && cores < 4) return 'lite';
  if (typeof memory === 'number' && memory < 4) return 'lite';

  /* Layar sentuh kecil: bukan soal kemampuan melainkan soal panas dan baterai.
     Adegan penuh pada ponsel menghabiskan keduanya dalam hitungan menit. */
  if (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768) return 'lite';

  return 'full';
}

/**
 * Berlangganan perubahan preferensi gerak.
 *
 * Preferensi ini dapat diubah selagi halaman terbuka — di macOS dan Windows
 * keduanya ada di panel pengaturan yang bisa dibuka berdampingan dengan
 * peramban. Kemampuan perangkat tidak berubah, jadi hanya ini yang dipantau.
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onChange);
  /* Saklar di halaman Pengaturan harus berlaku SEKETIKA, tanpa muat ulang.
     Tanpa langganan ini, mematikannya hanya berlaku pada kunjungan
     berikutnya — dan saklar yang tidak melakukan apa-apa ketika ditekan
     terbaca sebagai rusak. */
  pendengar.add(onChange);
  return () => {
    media.removeEventListener('change', onChange);
    pendengar.delete(onChange);
  };
}

/**
 * Tingkat grafis perangkat ini.
 *
 * `useSyncExternalStore` dan bukan `useState` + `useEffect`: kemampuan
 * perangkat adalah keadaan yang hidup DI LUAR React, dan menyalinnya ke dalam
 * state lewat efek menghasilkan satu render tambahan pada setiap pemuatan
 * halaman — yang pada halaman ini berarti kanvas dipasang, dibongkar, lalu
 * dipasang lagi.
 *
 * Cuplikan server selalu `'off'`. Server tidak punya `window`, dan menebak
 * tingkat yang berbeda dari yang dihitung klien menghasilkan ketidakcocokan
 * hidrasi.
 */
export function useGraphicsTier(): GraphicsTier {
  return useSyncExternalStore(subscribe, detectTier, () => 'off' as const);
}

/**
 * Preferensi 3D sebagai hook, memakai mesin langganan yang sama.
 *
 * Bukan `useState` + `useEffect`. Keduanya akan membaca `localStorage` di
 * dalam efek lalu memanggil `setState` seketika — satu render tambahan pada
 * setiap pemuatan, dan pola yang lint repositori ini tolak dengan benar
 * ("cascading renders").
 *
 * `localStorage` adalah keadaan yang hidup DI LUAR React, persis kasus yang
 * `useSyncExternalStore` dibuat untuk menanganinya. Cuplikan peladen selalu
 * `'otomatis'` supaya hidrasinya cocok.
 */
export function usePreferensi3D(): Preferensi3D {
  return useSyncExternalStore(subscribe, baca3D, () => 'otomatis' as const);
}

/**
 * Apakah lencana 3D DI DALAM aplikasi boleh dipasang.
 *
 * ── MENGAPA IA OPT-IN, DAN BUKAN IKUT `otomatis` ───────────────────────
 *
 * Diukur sebelum diputuskan: memasangnya menaikkan JavaScript halaman dasbor
 * dari 389 KB menjadi 624 KB — naik 235 KB, enam puluh persen, untuk lencana
 * 88 piksel yang tidak menyampaikan satu informasi pun.
 *
 * Di halaman muka biaya seperti itu wajar: permukaan publik memang menjual,
 * dan pengunjung datang sekali. Dasbor dibuka setiap hari, sering di jaringan
 * yang mahal, untuk membaca angka uang sendiri. Menaruh biaya itu di sana
 * secara diam-diam berarti setiap pengguna membayar hiasan yang tidak pernah
 * ia minta.
 *
 * Jadi ia berdiri di belakang pilihan ketiga yang eksplisit. Yang memilih
 * `otomatis` — bawaannya — tetap mendapat adegan penuh di halaman muka dan
 * NOL byte three.js di dalam aplikasi.
 */
export function useLencana3D(): boolean {
  const tier = useGraphicsTier();
  const pref = usePreferensi3D();
  return tier === 'full' && pref === 'penuh';
}
