'use client';

import { motion } from 'framer-motion';
import { useId, useMemo, useState } from 'react';

import { formatCompact, formatDayShort, formatIdr } from '@/lib/format';
import { EASE_OUT } from '@/lib/motion';

/**
 * Grafik area dua deret.
 *
 * Digambar sendiri sebagai SVG dan bukan lewat pustaka grafik. Pustaka grafik
 * membawa 40–120 KB untuk menggambar dua garis, memaksakan tema sendiri yang
 * harus dilawan, dan hampir selalu merender ulang seluruh kanvas pada setiap
 * gerakan kursor. Yang dibutuhkan di sini adalah dua `path` dan satu tooltip.
 *
 * `viewBox` tetap dengan `preserveAspectRatio="none"`: grafik meregang mengikuti
 * lebar induknya tanpa satu pun pengukuran DOM, jadi tidak ada `ResizeObserver`
 * dan tidak ada lompatan tata letak pada muat pertama.
 */

export interface AreaPoint {
  bucket: string;
  income: number;
  expense: number;
}

const W = 600;
const H = 200;
const PAD = 4;

function path(values: number[], max: number, close: boolean): string {
  if (values.length === 0) return '';

  const step = values.length === 1 ? 0 : (W - PAD * 2) / (values.length - 1);
  const y = (value: number): number => H - PAD - (value / max) * (H - PAD * 2);

  const points = values.map((value, index) => `${String(PAD + index * step)},${String(y(value))}`);
  const line = `M${points.join(' L')}`;

  if (!close) return line;
  return `${line} L${String(PAD + (values.length - 1) * step)},${String(H)} L${String(PAD)},${String(H)} Z`;
}

export function AreaChart({ points, label }: { points: AreaPoint[]; label: string }) {
  const gradientIncome = useId();
  const gradientExpense = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { max, income, expense } = useMemo(() => {
    const incomeValues = points.map((p) => p.income);
    const expenseValues = points.map((p) => p.expense);
    /* Skala tidak pernah nol: deret yang seluruhnya nol akan membagi dengan nol
       dan menghasilkan `path` berisi NaN, yang gagal diam-diam sebagai kanvas
       kosong tanpa satu pun galat. */
    return {
      max: Math.max(1, ...incomeValues, ...expenseValues),
      income: incomeValues,
      expense: expenseValues,
    };
  }, [points]);

  /* Diambil sekali di sini supaya penyempitan tipenya berlaku sampai bawah —
     `hover` dibaca lagi di dalam JSX, di mana TypeScript sudah kehilangan
     jaminan bahwa ia bukan null. */
  const index = hover;

  if (points.length === 0) {
    return (
      <div className="grid h-50 place-items-center text-sm text-dim">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  const active = index === null ? null : points[index];
  const step = points.length === 1 ? 0 : (W - PAD * 2) / (points.length - 1);
  const xRatio = index === null ? 0 : (PAD + index * step) / W;

  return (
    <figure className="relative">
      <figcaption className="sr-only">{label}</figcaption>

      <div className="relative h-50">
      <svg
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={label}
        onPointerLeave={() => {
          setHover(null);
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
        }}
      >
        <defs>
          <linearGradient id={gradientIncome} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-holo)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-holo)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gradientExpense} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-holo)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-holo)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Kisi mendatar. Empat garis: cukup untuk memperkirakan tinggi,
            tidak cukup untuk bersaing dengan datanya sendiri. */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + ratio * (H - PAD * 2)}
            y2={PAD + ratio * (H - PAD * 2)}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <motion.path
          d={path(income, max, true)}
          fill={`url(#${gradientIncome})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        />
        <motion.path
          d={path(expense, max, true)}
          fill={`url(#${gradientExpense})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.05 }}
        />

        <motion.path
          d={path(income, max, false)}
          fill="none"
          stroke="var(--color-holo)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
        <motion.path
          d={path(expense, max, false)}
          fill="none"
          stroke="var(--color-holo)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.05 }}
        />

        {index === null ? null : (
          <line
            x1={PAD + index * step}
            x2={PAD + index * step}
            y1={0}
            y2={H}
            stroke="var(--line-strong)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {/*
        Label dan titik digambar sebagai HTML di atas SVG.
        `preserveAspectRatio="none"` meregang sumbu X dan Y dengan faktor
        berbeda; apa pun yang digambar di dalam SVG selain garis akan ikut
        terpipihkan — lingkaran menjadi lonjong dan huruf menjadi lebar.
      */}
      <span className="numeric pointer-events-none absolute left-1 top-0 text-[10px] text-dim">
        {formatCompact(max)}
      </span>

      {active ? (
        <>
          <Dot ratioX={xRatio} value={active.income} max={max} color="var(--color-holo)" />
          <Dot ratioX={xRatio} value={active.expense} max={max} color="var(--color-holo)" />
        </>
      ) : null}

      </div>

      {active ? (
        <div
          className="glass-strong pointer-events-none absolute top-2 rounded-xl px-3 py-2 text-xs shadow-[var(--shadow-lift)]"
          style={{
            /* Dijepit di kedua ujung supaya tooltip tidak pernah keluar dari
               kartu — yang keluar akan terpotong `overflow` induknya. */
            left: `clamp(0px, ${String((((PAD + (index ?? 0) * step) / W) * 100))}% - 60px, calc(100% - 130px))`,
          }}
        >
          <p className="mb-1 font-medium text-ink">{formatDayShort(active.bucket)}</p>
          <p className="flex items-center gap-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-[var(--color-holo)]" />
            Masuk {formatIdr(active.income)}
          </p>
          <p className="flex items-center gap-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-[var(--color-holo)]" />
            Keluar {formatIdr(active.expense)}
          </p>
        </div>
      ) : null}

      {/* Dua warna tanpa nama hanyalah dua garis. Legenda ada di luar SVG
          supaya pembaca layar membacanya sebagai teks, bukan melewatinya
          bersama grafik yang sudah ditandai `aria-label`. */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--color-holo)]" aria-hidden />
          Masuk
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--color-holo)]" aria-hidden />
          Keluar
        </li>
      </ul>
    </figure>
  );
}

/** Titik sorot pada satu deret. Diposisikan dalam persen — sama seperti SVG
 *  meregang, jadi keduanya selalu bertemu di titik yang sama. */
function Dot({
  ratioX,
  value,
  max,
  color,
}: {
  ratioX: number;
  value: number;
  max: number;
  color: string;
}) {
  const ratioY = (H - PAD - (value / max) * (H - PAD * 2)) / H;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--surface)]"
      style={{
        left: `${String(ratioX * 100)}%`,
        top: `${String(ratioY * 100)}%`,
        background: color,
      }}
    />
  );
}
