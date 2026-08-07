'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

/**
 * Ubin angka.
 *
 * Satu bentuk untuk setiap angka utama di aplikasi. Sebelum ini setiap layar
 * menyusun ubinnya sendiri, dan empat layar menghasilkan empat ukuran angka
 * yang berbeda tipis — cukup untuk terbaca sebagai rakitan, tidak cukup untuk
 * ada yang menunjuknya.
 *
 * `delta` boleh `null`, dan `null` BUKAN nol. Nol berarti tidak berubah; null
 * berarti belum ada pembanding. Menampilkan keduanya sebagai "0%" adalah
 * kebohongan kecil yang persis paling mudah dipercaya.
 */

export interface StatProps {
  label: string;
  value: string;
  /** Perubahan relatif, misalnya -0.34 untuk turun 34%. `null` = tak ada pembanding. */
  delta?: number | null;
  /** Apakah delta positif itu kabar baik. Pengeluaran naik BUKAN kabar baik. */
  positiveIsGood?: boolean;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

const PERSEN = new Intl.NumberFormat('id-ID', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export function Stat({
  label,
  value,
  delta = null,
  positiveIsGood = true,
  hint,
  icon,
  className,
}: StatProps) {
  const naik = delta !== null && delta > 0;
  const turun = delta !== null && delta < 0;
  const baik = naik ? positiveIsGood : turun ? !positiveIsGood : null;

  const Arrow = naik ? ArrowUpRight : turun ? ArrowDownRight : Minus;

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'edge-light relative overflow-hidden rounded-[var(--radius-card)]',
        'border border-[var(--line)] bg-[var(--surface)] p-5',
        'transition-colors duration-[var(--dur-base)] hover:border-[var(--line-strong)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-faint">{label}</p>
        {icon ? <span className="text-faint">{icon}</span> : null}
      </div>

      <p className="numeric mt-3 text-2xl font-medium text-ink sm:text-[1.75rem]">{value}</p>

      <div className="mt-2 flex min-h-5 items-center gap-1.5 text-xs">
        {delta === null ? (
          hint ? (
            <span className="text-faint">{hint}</span>
          ) : null
        ) : (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium',
                baik === null && 'bg-[var(--surface-2)] text-faint',
                baik === true &&
                  'bg-[color-mix(in_oklab,var(--color-success)_12%,transparent)] text-[var(--color-success)]',
                baik === false &&
                  'bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]',
              )}
            >
              <Arrow className="size-3" aria-hidden />
              {PERSEN.format(Math.abs(delta))}
            </span>
            {hint ? <span className="text-faint">{hint}</span> : null}
          </>
        )}
      </div>
    </motion.div>
  );
}
