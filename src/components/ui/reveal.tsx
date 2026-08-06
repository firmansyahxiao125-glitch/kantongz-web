'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { fadeUp, stagger } from '@/lib/motion';

/**
 * Muncul saat masuk viewport.
 *
 * `once: true` disengaja — elemen yang beranimasi ulang setiap kali digulir
 * melewatinya membuat halaman terasa gelisah, dan pada gulir cepat ia terlihat
 * berkedip. `amount: 0.2` memicu ketika seperlima elemen terlihat, bukan
 * seluruhnya, supaya kartu tinggi tidak menunggu sampai hampir lewat.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Induk yang membuat anak-anaknya masuk berurutan, bukan serentak. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
