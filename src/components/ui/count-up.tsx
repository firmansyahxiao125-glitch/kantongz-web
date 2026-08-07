'use client';

import { useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

/**
 * Angka yang berhitung naik menuju nilainya.
 *
 * Dipakai HANYA pada angka ringkasan — saldo, total, kekayaan bersih. Bukan
 * pada nominal transaksi: daftar berisi dua puluh angka yang semuanya
 * berhitung sekaligus terbaca sebagai layar yang sedang rusak, bukan sebagai
 * kemewahan.
 *
 * Nilai akhirnya SELALU tepat. Pegas berhenti pada sasaran, dan pemformatan
 * dilakukan pada nilai yang sudah dibulatkan — angka uang yang mendarat di
 * 12.909.998 karena pegas belum benar-benar reda adalah cacat yang jauh lebih
 * mahal daripada animasinya berharga.
 */

export interface CountUpProps {
  value: number;
  /** Pemformat. Menerima nilai bulat, mengembalikan teks siap tampil. */
  format: (value: number) => string;
  className?: string;
}

export function CountUp({ value, format, className }: CountUpProps) {
  const reduced = useReducedMotion();

  const raw = useMotionValue(0);
  const eased = useSpring(raw, { stiffness: 90, damping: 22, mass: 0.9 });
  const text = useTransform(eased, (current) => format(Math.round(current)));

  useEffect(() => {
    raw.set(value);
  }, [raw, value]);

  /* Gerak dikurangi: angka langsung berada di nilainya. Bukan versi yang lebih
     cepat — berhitung cepat masih berhitung, dan yang diminta adalah tidak
     ada gerak sama sekali. */
  if (reduced) return <span className={className}>{format(value)}</span>;

  return (
    <motion.span className={className} aria-label={format(value)}>
      {text}
    </motion.span>
  );
}
