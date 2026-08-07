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

export function detectTier(): GraphicsTier {
  if (typeof window === 'undefined') return 'off';

  /* Permintaan pengguna menang atas kemampuan perangkat. Seseorang yang
     meminta gerak dikurangi tidak sedang meminta gerak yang lebih halus. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';

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
  return () => {
    media.removeEventListener('change', onChange);
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
