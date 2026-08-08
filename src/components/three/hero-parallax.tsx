import type { ReactNode } from 'react';

/**
 * Adegan yang tenggelam saat halaman digulir.
 *
 * Latar bergerak LEBIH LAMBAT daripada teks di atasnya, dan memudar sebelum
 * bagian berikutnya tiba. Dua alasannya, dan yang kedua lebih penting:
 *
 * 1. Beda kecepatan itulah yang membaca sebagai kedalaman.
 * 2. Adegan yang tetap terang di belakang bagian "Fitur" akan bersaing dengan
 *    teks yang seharusnya dibaca — dan pada bagian itu, adegan tidak lagi
 *    punya sesuatu untuk dikatakan.
 *
 * ── DULU `useScroll`, SEKARANG LINI MASA GULIR CSS ──────────────────────
 *
 * Versi sebelumnya benar dalam menolak `scroll` listener — yang itu memang
 * memaksa tata letak dihitung ulang pada setiap peristiwa gulir. Tetapi
 * `useScroll` tetap membaca posisi gulir di UTAS UTAMA setiap frame, dan
 * membuat berkas ini Client Component.
 *
 * `animation-timeline: scroll()` menyerahkan seluruhnya ke utas kompositor.
 * Geraknya tetap mulus ketika utas utama sibuk — persis keadaan yang paling
 * mungkin terjadi pada muat pertama, saat adegan 3D sedang dikompilasi.
 *
 * Batas dan nilainya SAMA PERSIS dengan versi Framer-nya (600px untuk geser
 * dan skala, 420px untuk pudar); seluruhnya hidup di `.hero-sink` di
 * `globals.css`. Peramban tanpa dukungan lini masa gulir tidak mendapat
 * paralaks, dan adegannya diam di tempat — tidak ada yang hilang selain gerak.
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  return <div className="hero-sink size-full">{children}</div>;
}
