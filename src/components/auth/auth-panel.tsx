'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { EASE_OUT } from '@/lib/motion';

/**
 * Panel autentikasi.
 *
 * Satu bentuk untuk masuk, daftar, verifikasi, dan pemulihan — supaya berpindah
 * antar langkah terbaca sebagai satu alur, bukan empat halaman yang kebetulan
 * berdekatan.
 */
export function AuthPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="glass-strong rounded-[var(--radius-xl)] p-7 shadow-[var(--shadow-float)] sm:p-8"
    >
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>

      <div className="mt-7">{children}</div>

      {footer ? (
        <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
          {footer}
        </div>
      ) : null}
    </motion.section>
  );
}
