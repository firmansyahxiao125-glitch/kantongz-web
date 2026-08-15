'use client';

import { useEffect } from 'react';

/**
 * Mendaftarkan service worker. H1.
 *
 * ── MENGAPA HANYA DI PRODUKSI ──────────────────────────────────────────
 *
 * `next dev` menyajikan potongan JavaScript yang berubah setiap kali berkas
 * disimpan, dan sebagian namanya TIDAK ber-sidik-jari. Service worker yang
 * hidup di sana akan menyimpan potongan yang semenit kemudian sudah usang,
 * lalu menyajikannya kembali — dan gejalanya adalah perubahan kode yang
 * "tidak berlaku" sampai seseorang tahu harus membuka DevTools dan menghapus
 * pendaftarannya.
 *
 * Kerugiannya jujur: perilaku PWA tidak terlihat saat `npm run dev`. Karena
 * itu gerbangnya (`scripts/pwa.mjs`) berjalan terhadap `next build` lalu
 * `next start` — yaitu tepat yang diterima pengguna, bukan yang dilihat
 * pengembang.
 *
 * ── MENGAPA TIDAK ADA UI PEMBARUAN ─────────────────────────────────────
 *
 * `sw.js` memanggil `skipWaiting()` dan `clients.claim()`, jadi versi baru
 * mengambil alih sendiri pada muat berikutnya. Spanduk "versi baru tersedia,
 * muat ulang?" akan menambah satu keputusan yang tidak perlu diambil siapa
 * pun untuk aplikasi yang cangkangnya kecil dan datanya selalu dari jaringan.
 */
export function DaftarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    /* Ditunda sampai `load`. Pendaftaran menuntut unduhan dan penguraian
       skrip, dan melakukannya saat halaman masih memuat akan berebut jaringan
       dengan sumber daya yang benar-benar dilihat pengguna. */
    const daftar = (): void => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* Diabaikan DENGAN SENGAJA, dan tanpa melapor ke pengguna.
           Pendaftaran gagal pada mode penyamaran sebagian peramban dan pada
           asal tanpa HTTPS. Keduanya keadaan yang wajar, dan pada keduanya
           aplikasi tetap berjalan penuh — yang hilang cuma halaman luring. */
      });
    };

    if (document.readyState === 'complete') {
      daftar();
      return;
    }

    window.addEventListener('load', daftar, { once: true });
    return () => {
      window.removeEventListener('load', daftar);
    };
  }, []);

  return null;
}
