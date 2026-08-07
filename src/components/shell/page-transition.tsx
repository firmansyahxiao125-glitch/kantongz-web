'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * Transisi antar halaman aplikasi.
 *
 * `mode="wait"` supaya halaman lama selesai keluar sebelum yang baru masuk.
 * Keduanya berjalan bersamaan menghasilkan dua salinan konten yang saling
 * menembus selama seperlima detik, dan pada halaman berisi angka uang itu
 * terbaca sebagai nominal yang berkedip menjadi nominal lain.
 *
 * Geraknya SANGAT kecil — delapan piksel. Transisi halaman yang mencolok
 * menyenangkan pada kunjungan pertama dan menjengkelkan pada kunjungan
 * kelima puluh, dan aplikasi keuangan dibuka setiap hari.
 *
 * Pengguna yang meminta gerak dikurangi hanya menerima pudarnya: `MotionConfig`
 * di `providers.tsx` menahan transformnya, bukan komponen ini.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
