'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { formatIdr } from '@/lib/format';
import { EASE_OUT } from '@/lib/motion';

/**
 * Donat proporsi.
 *
 * Digambar dengan `stroke-dasharray` pada satu lingkaran, bukan dengan busur
 * `path`: satu elemen per irisan, tanpa trigonometri, dan animasi masuknya
 * cukup dengan menganimasikan offsetnya.
 */

export interface Slice {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Arc {
  slice: Slice;
  length: number;
  start: number;
}

/**
 * Panjang busur dan titik mulainya, dihitung sekali sebagai fungsi murni.
 *
 * Di luar komponen dengan sengaja: akumulator yang bermutasi di dalam badan
 * render membaca nilai basi begitu React melanjutkan render yang tertunda, dan
 * gejalanya adalah irisan donat yang tumpang tindih tanpa satu pun galat.
 */
function toArcs(slices: Slice[], total: number): Arc[] {
  return slices.reduce<Arc[]>((acc, slice) => {
    const previous = acc.at(-1);
    const length = total === 0 ? 0 : (slice.value / total) * CIRCUMFERENCE;
    return [...acc, { slice, length, start: previous ? previous.start + previous.length : 0 }];
  }, []);
}

export function DonutChart({ slices, caption }: { slices: Slice[]; caption: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const arcs = useMemo(() => toArcs(slices, total), [slices, total]);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-dim">Belum ada pengeluaran bulan ini.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox="0 0 160 160" className="size-40 -rotate-90" role="img" aria-label={caption}>
          {/* Lintasan di belakang irisan. Tanpa ini, donat dengan satu kategori
              terbaca sebagai cincin penuh yang berarti "100% dari segalanya",
              bukan sebagai satu kategori yang kebetulan sendirian. */}
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="18"
          />
          {arcs.map(({ slice, length, start }) => (
            <motion.circle
              key={slice.label}
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${String(length)} ${String(CIRCUMFERENCE - length)}`}
              initial={{ strokeDashoffset: -start + CIRCUMFERENCE }}
              animate={{ strokeDashoffset: -start }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            />
          ))}
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-dim">Total</p>
            <p className="numeric text-sm font-medium text-ink">{formatIdr(total)}</p>
          </div>
        </div>
      </div>

      {/*
        `min-w-0` BUKAN hiasan.
        Anak lentur menolak menyusut di bawah lebar isinya, jadi tanpa ini
        legenda meluber keluar kartu begitu nominalnya panjang — dan rupiah
        selalu panjang.
      */}
      <ul className="w-full min-w-0 space-y-2.5">
        {slices.map((slice) => {
          const persen = Math.round((slice.value / total) * 100);

          return (
            <li key={slice.label} className="min-w-0 text-sm">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="size-2.5 shrink-0 translate-y-px rounded-full"
                  style={{ background: slice.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-muted">{slice.label}</span>
                <span className="numeric shrink-0 text-ink">{formatIdr(slice.value)}</span>
              </div>

              {/* Batang proporsi di bawah baris, bukan kolom persen di
                  sampingnya: kolom keempat memaksa baris meluber pada kartu
                  sempit, sementara batang selalu muat berapa pun lebarnya. */}
              <div className="mt-1.5 flex items-center gap-2 pl-5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: slice.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${String(persen)}%` }}
                    transition={{ duration: 0.7, ease: EASE_OUT }}
                  />
                </div>
                <span className="numeric shrink-0 text-xs text-dim">{persen}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
