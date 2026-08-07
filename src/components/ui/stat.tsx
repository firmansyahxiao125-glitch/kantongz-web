'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { CountUp } from '@/components/ui/count-up';
import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

/**
 * Ubin angka.
 *
 * ── HIERARKI, BUKAN SEKADAR WARNA (DESIGN §6) ──────────────────────────
 *
 * Dokumen desain menetapkan tepat SATU H1 per layar, dan H1 adalah nilai uang
 * berwarna kuningan. Setiap angka uang lain memakai warna semantik atau tinta
 * biasa.
 *
 * Itu menyelesaikan masalah yang membuat aturan kuningan paling sering
 * dilanggar: kalau SETIAP nominal berwarna kuningan, daftar dua puluh
 * transaksi menjadi dua puluh isyarat — dan dua puluh isyarat sama artinya
 * dengan nol. Kuningan bekerja justru karena langka.
 *
 * Karena itu `tone` bukan pilihan gaya melainkan pernyataan peringkat:
 *
 *   value     → H1. Kuningan. Satu per layar, ubinnya lebih besar.
 *   positive  → uang masuk. Selalu ditemani panah.
 *   negative  → uang keluar. Selalu ditemani panah.
 *   neutral   → angka yang bukan puncak hierarki.
 */

export type StatTone = 'value' | 'positive' | 'negative' | 'neutral';

export interface StatProps {
  label: string;
  /** Angka mentah, supaya ubin dapat menghitungnya naik. */
  value: number;
  /** Pemformat. Ubin tidak pernah memutuskan sendiri format uang. */
  format: (value: number) => string;
  tone?: StatTone;
  /** Perubahan relatif, misalnya -0.34 untuk turun 34%. `null` = tak ada pembanding. */
  delta?: number | null;
  /** Apakah delta positif itu kabar baik. Pengeluaran naik BUKAN kabar baik. */
  positiveIsGood?: boolean;
  hint?: string;
  icon?: ReactNode;
  /** H1 mendapat ubin lebih besar. Ukuran adalah separuh dari isyarat. */
  hero?: boolean;
  className?: string;
}

const PERSEN = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 0 });

const TONE_CLASS: Record<StatTone, string> = {
  value: 'text-value',
  positive: 'text-[var(--color-positive)]',
  negative: 'text-[var(--color-negative)]',
  neutral: 'text-ink',
};

export function Stat({
  label,
  value,
  format,
  tone = 'neutral',
  delta = null,
  positiveIsGood = true,
  hint,
  icon,
  hero = false,
  className,
}: StatProps) {
  const naik = delta !== null && delta > 0;
  const turun = delta !== null && delta < 0;
  const baik = naik ? positiveIsGood : turun ? !positiveIsGood : null;
  const Arrow = naik ? ArrowUpRight : turun ? ArrowDownRight : Minus;

  return (
    <motion.div
      variants={fadeUp}
      /* Hover mengangkat 3px dan MENGUATKAN garis, bukan mengubah latar.
         Latar yang berubah pada hover menggeser kontras teks di atasnya — dan
         pada angka uang, kontras yang goyah terbaca sebagai angka yang goyah. */
      whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      className={cn(
        'panel group relative overflow-hidden',
        hero ? 'p-6 sm:p-7' : 'p-5',
        'transition-[border-color,box-shadow] duration-[var(--dur-base)]',
        'hover:border-line-strong hover:shadow-[var(--shadow-lift)]',
        className,
      )}
    >
      {/* Pendar kuningan HANYA pada ubin H1, dan hanya saat kursor mendekat.
          Ia menandai satu-satunya angka terpenting di layar. */}
      {tone === 'value' ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--color-brass) 12%, transparent), transparent 60%)',
          }}
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-eyebrow text-faint">{label}</p>
        {icon ? <span className="shrink-0 text-faint">{icon}</span> : null}
      </div>

      <CountUp
        value={value}
        format={format}
        className={cn(
          'numeric relative mt-3 block font-medium',
          hero ? 'text-3xl sm:text-[2.5rem] sm:leading-[1.05]' : 'text-2xl sm:text-[1.75rem]',
          TONE_CLASS[tone],
        )}
      />

      <div className="relative mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {delta === null ? (
          hint ? (
            <span className="text-faint">{hint}</span>
          ) : null
        ) : (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 font-medium',
                baik === null && 'bg-[var(--surface-2)] text-faint',
                baik === true &&
                  'bg-[color-mix(in_oklab,var(--color-positive)_14%,transparent)] text-[var(--color-positive)]',
                baik === false &&
                  'bg-[color-mix(in_oklab,var(--color-negative)_14%,transparent)] text-[var(--color-negative)]',
              )}
            >
              {/* Panah SELALU menemani warnanya. Sepuluh persen laki-laki tidak
                  dapat membedakan merah dari hijau, dan bagi mereka lencana
                  tanpa bentuk hanyalah kotak abu berangka. */}
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
