'use client';

import { useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * Garis mini tanpa sumbu.
 *
 * Bentuk, bukan angka: dipakai di dalam ubin dan baris daftar, tempat sebuah
 * grafik penuh akan lebih besar daripada konteks yang dijelaskannya.
 *
 * TIDAK punya sumbu dan karena itu TIDAK boleh dibaca sebagai grafik yang
 * presisi — nilainya diumumkan lewat teks di sebelahnya, dan `aria-hidden`
 * memastikan pembaca layar tidak membacakan bentuk yang tak bermakna baginya.
 */

export interface SparklineProps {
  values: number[];
  className?: string;
  /** Warna garis. Token CSS, bukan nilai heksadesimal. */
  stroke?: string;
  /** Isi gradien di bawah garis. */
  filled?: boolean;
}

const W = 100;
const H = 28;

export function Sparkline({
  values,
  className,
  stroke = 'var(--color-primary)',
  filled = true,
}: SparklineProps) {
  const gradientId = useId();

  /* Satu titik tidak punya bentuk, dan dua titik yang sama nilainya
     menghasilkan pembagian nol saat dinormalisasi. */
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  /* Rentang nol berarti garis datar — digambar di tengah, bukan di tepi. */
  const span = max - min || 1;
  const flat = max === min;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * W;
    const y = flat ? H / 2 : H - ((value - min) / span) * H;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L${String(W)} ${String(H)} L0 ${String(H)} Z`;

  return (
    <svg
      viewBox={`0 0 ${String(W)} ${String(H)}`}
      preserveAspectRatio="none"
      className={cn('h-7 w-full', className)}
      aria-hidden
    >
      {filled ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
