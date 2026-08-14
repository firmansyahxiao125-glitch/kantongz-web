'use client';

import { motion } from 'framer-motion';

/**
 * Cincin kemajuan.
 *
 * ── MENGAPA CINCIN, BUKAN BATANG ────────────────────────────────────────
 *
 * Batang menjawab "sudah sejauh mana"; cincin menjawab "berapa bagian dari
 * keseluruhan". Anggaran adalah pertanyaan kedua — orang ingin tahu berapa
 * PORSI jatahnya yang sudah terpakai, bukan seberapa jauh ia berjalan.
 *
 * Dan cincin punya satu hal yang tidak dimiliki batang: PUSAT. Persentasenya
 * duduk di dalam bentuknya sendiri alih-alih menumpang di sebelahnya, jadi
 * angka dan bentuk terbaca sebagai satu benda, bukan dua yang kebetulan
 * bertetangga.
 *
 * ── SATU KEPUTUSAN YANG MUDAH SALAH ─────────────────────────────────────
 *
 * `strokeDasharray` dihitung dari keliling, dan kelilingnya dari jari-jari
 * yang SAMA dengan yang dipakai atribut `r`. Menuliskan dua angka jari-jari di
 * dua tempat adalah cara paling andal menghasilkan cincin yang berhenti di
 * 97% ketika seharusnya penuh — dan tidak ada yang akan curiga, karena 97%
 * terlihat seperti 100%.
 */

const JARI = 34;
const KELILING = 2 * Math.PI * JARI;

export function ProgressRing({
  ratio,
  label,
  caption,
  tone = 'neutral',
  size = 96,
}: {
  /** 0–1. Nilai di luar rentang dijepit; kemajuan 140% tetap cincin penuh. */
  ratio: number;
  /** Teks di pusat cincin. Biasanya persentase. */
  label: string;
  /** Dibacakan pembaca layar sebagai ganti gambarnya. */
  caption: string;
  tone?: 'neutral' | 'caution' | 'negative' | 'positive';
  size?: number;
}) {
  const jepit = Math.max(0, Math.min(1, ratio));

  const warna =
    tone === 'negative'
      ? 'var(--color-negative)'
      : tone === 'caution'
        ? 'var(--color-caution)'
        : tone === 'positive'
          ? 'var(--color-positive)'
          : 'var(--color-identity-none)';

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={caption}
    >
      {/* `-rotate-90`: SVG memulai busur di jam tiga. Tanpa putaran ini cincin
          terisi dari kanan, dan setiap orang membaca kemajuan dari puncak. */}
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r={JARI}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="8"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={JARI}
          fill="none"
          stroke={warna}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={KELILING}
          initial={{ strokeDashoffset: KELILING }}
          animate={{ strokeDashoffset: KELILING * (1 - jepit) }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </svg>

      <span className="absolute inset-0 grid place-items-center">
        <span className="numeric text-base font-semibold text-ink">{label}</span>
      </span>
    </div>
  );
}
