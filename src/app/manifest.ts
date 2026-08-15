import type { MetadataRoute } from 'next';

import { KANVAS } from '@/lib/palette';

/**
 * Manifest aplikasi web. H1.
 *
 * ── MENGAPA `start_url` KE /masuk, BUKAN KE / ─────────────────────────
 *
 * Halaman muka adalah halaman PEMASARAN. Orang yang sudah memasang KANTONGZ
 * di layar utamanya sudah selesai dibujuk — membukanya ke halaman muka
 * memaksanya menekan satu tombol lagi setiap kali, selamanya.
 *
 * `/masuk` benar untuk keduanya: yang belum masuk memang perlu masuk, dan yang
 * sesinya masih hidup diteruskan ke dasbor oleh penjaga rute yang sudah ada.
 *
 * ── MENGAPA WARNANYA DARI `palette.ts` ────────────────────────────────
 *
 * Manifest dibaca sistem operasi SEBELUM satu baris CSS pun dimuat, jadi
 * `var(--bg)` di sini tidak menunjuk apa pun — nilainya harus konkret.
 *
 * Versi pertama menuliskan hex-nya langsung, dan gerbang `palette` menolaknya
 * dengan benar: alasan "harus konkret" berlaku untuk variabel CSS, bukan untuk
 * impor TypeScript yang diselesaikan saat kompilasi.
 *
 * Kecocokannya dengan `--bg` dijaga mesin, bukan komentar: `scripts/pwa.mjs`
 * memeriksa manifest yang benar-benar dilayani terhadap nilai yang sama.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KANTONGZ — AI Financial Operating System',
    short_name: 'KANTONGZ',
    description:
      'Satu rekening, kategorisasi otomatis, dan peringatan sebelum masalah terjadi — bukan setelah saldomu habis.',
    start_url: '/masuk',
    /* `standalone`, bukan `fullscreen`: aplikasi keuangan yang menyembunyikan
       bilah status juga menyembunyikan jam dan indikator baterai, dan
       menghilangkan gerakan kembali bawaan di sebagian peluncur. */
    display: 'standalone',
    orientation: 'portrait',
    /* Latar splash. Gelap di kedua tema — layar splash muncul sebelum
       preferensi tema pengguna terbaca, dan kedipan putih di aplikasi yang
       bawaannya gelap jauh lebih mengganggu daripada sebaliknya. */
    background_color: KANVAS.gelap,
    theme_color: KANVAS.gelap,
    lang: 'id-ID',
    dir: 'ltr',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /*
       * `maskable` TERPISAH, dan itu bukan pengulangan.
       *
       * Android memotong ikon maskable menjadi lingkaran, kotak membulat, atau
       * tetesan menurut peluncurnya, dan hanya menjamin 80% bagian tengahnya
       * terlihat. Ikon `any` yang dipakai ulang sebagai maskable akan terpotong
       * bilahnya di sebagian ponsel dan utuh di sebagian lain — cacat yang
       * tidak pernah muncul di mesin pengembang.
       */
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
