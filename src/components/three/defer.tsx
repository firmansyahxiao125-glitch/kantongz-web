'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Menahan anaknya sampai peramban benar-benar menganggur.
 *
 * ── MASALAH YANG DIUKUR ────────────────────────────────────────────────
 *
 * Lighthouse pada build produksi: Performance 50, Total Blocking Time
 * 2.440 ms, Time to Interactive 7,4 detik. Penyebabnya satu berkas — bundel
 * Three.js seberat 341 KiB yang diurai dan dijalankan SEBELUM halaman sempat
 * menanggapi sentuhan pertama.
 *
 * `next/dynamic` dengan `ssr: false` sudah memisahkan bundelnya, tetapi
 * pemisahan bundel BUKAN penundaan: potongan itu tetap diminta dan dijalankan
 * begitu komponennya dipasang, dan komponennya dipasang saat hidrasi.
 *
 * ── MENGAPA `requestIdleCallback`, BUKAN `setTimeout` ───────────────────
 *
 * Penundaan tetap adalah tebakan. Terlalu pendek dan ia tetap menabrak
 * hidrasi; terlalu panjang dan pengguna bermesin cepat menatap pengganti
 * statis tanpa alasan. `requestIdleCallback` bertanya kepada peramban kapan
 * ia benar-benar selesai — jawabannya berbeda di setiap perangkat, dan itulah
 * intinya.
 *
 * `timeout` tetap dipasang sebagai jaring: pada halaman yang tidak pernah
 * sungguh menganggur, tanpa itu adegan tidak akan pernah dimuat sama sekali.
 *
 * Safari belum mengirimkan `requestIdleCallback`, jadi ada mundur ke
 * `setTimeout` — tetap lebih baik daripada memuat seketika.
 */

/* Ditulis sebagai tipe berdiri sendiri, bukan `extends Window`: lib DOM sudah
   mendeklarasikan `cancelIdleCallback` sebagai WAJIB, jadi memperlebarnya
   menjadi opsional adalah pelanggaran pewarisan. Yang dibutuhkan di sini hanya
   dua anggota itu, dan menyatakannya terpisah membuat pengecekan `typeof` di
   bawah tetap jujur. */
interface IdleApi {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export interface DeferUntilIdleProps {
  children: ReactNode;
  /** Tampil sampai anaknya dipasang. WAJIB — bukan opsional. */
  fallback: ReactNode;
  /** Batas menunggu sebelum dipaksa dipasang. */
  timeout?: number;
}

export function DeferUntilIdle({ children, fallback, timeout = 2500 }: DeferUntilIdleProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as unknown as IdleApi;

    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(
        () => {
          setReady(true);
        },
        { timeout },
      );
      return () => {
        w.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(() => {
      setReady(true);
    }, 900);
    return () => {
      window.clearTimeout(handle);
    };
  }, [timeout]);

  return <>{ready ? children : fallback}</>;
}
