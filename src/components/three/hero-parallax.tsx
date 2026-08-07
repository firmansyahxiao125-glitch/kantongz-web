'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
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
 * Digerakkan oleh `useScroll`, bukan oleh `scroll` listener. Yang kedua
 * berjalan di utas utama pada setiap peristiwa gulir dan memaksa tata letak
 * dihitung ulang; yang pertama membaca posisi lewat nilai gerak yang tidak
 * pernah menyentuh state React, jadi tidak ada satu pun render tambahan.
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();

  /* Sampai 600px pertama. Setelah itu bagian berikutnya sudah memenuhi layar
     dan adegan tidak lagi terlihat, jadi menganimasikannya hanya membakar
     baterai tanpa ada yang melihatnya. */
  const y = useTransform(scrollY, [0, 600], [0, 140]);
  const opacity = useTransform(scrollY, [0, 420], [1, 0]);
  const scale = useTransform(scrollY, [0, 600], [1, 1.08]);

  return (
    <motion.div style={{ y, opacity, scale }} className="size-full will-change-transform">
      {children}
    </motion.div>
  );
}
