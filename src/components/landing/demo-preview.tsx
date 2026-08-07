'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Repeat, Sparkles, TrendingDown } from 'lucide-react';

import { Sparkline } from '@/components/charts/sparkline';
import { Reveal } from '@/components/ui/reveal';
import { formatIdr } from '@/lib/format';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Pratinjau produk di halaman muka.
 *
 * SELURUH angka di sini adalah DATA CONTOH, dan halaman menyatakannya secara
 * terbuka lewat label di sudut panel. Halaman muka portofolio yang menampilkan
 * angka buatan tanpa mengakuinya sedang berbohong tentang hal paling kecil
 * yang bisa diperiksa — dan pembaca yang menemukannya akan mempertanyakan
 * seluruh sisanya.
 *
 * Bentuk kartunya SENGAJA sama persis dengan yang dipakai aplikasi sungguhan.
 * Pratinjau yang lebih cantik daripada produknya adalah janji yang tidak
 * ditepati pada klik pertama.
 */

/* Deret contoh: saldo yang menurun perlahan lalu jatuh oleh satu pengeluaran
   besar — bentuk yang persis dikenali detektor anomali di M10. */
const SALDO_CONTOH = [
  9_100_000, 9_050_000, 8_980_000, 8_920_000, 8_840_000, 8_760_000, 8_690_000, 8_600_000,
  8_520_000, 8_440_000, 4_240_000, 4_180_000,
];

export function DemoPreview() {
  return (
    <Reveal className="mx-auto mt-20 max-w-5xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="glass-strong relative rounded-[var(--radius-panel)] p-2 shadow-[var(--shadow-float)]"
      >
        {/*
          Penanda data contoh. Di dalam bingkai, bukan di keterangan bawah yang
          bisa terlewat — orang membaca panel, bukan catatan kakinya.
        */}
        <span className="absolute -top-3 left-6 z-10 rounded-full border border-line-strong bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-faint">
          Data contoh
        </span>

        <div className="rounded-xl border border-line bg-[var(--bg)] p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[var(--color-danger)]/70" />
            <span className="size-2.5 rounded-full bg-[var(--color-warning)]/70" />
            <span className="size-2.5 rounded-full bg-[var(--color-success)]/70" />
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {/* saldo + lintasan */}
            <motion.div
              variants={fadeUp}
              className="edge-light relative overflow-hidden rounded-xl border border-line bg-[var(--surface)] p-5 lg:col-span-3"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-faint">
                Kekayaan bersih
              </p>
              <p className="numeric mt-2 text-3xl font-medium">{formatIdr(4_180_000)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
                <TrendingDown className="size-3.5" aria-hidden />
                Turun 54% dalam dua pekan
              </p>
              <Sparkline
                className="mt-5 h-12"
                values={SALDO_CONTOH}
                stroke="var(--color-danger)"
              />
            </motion.div>

            {/* wawasan */}
            <motion.div
              variants={fadeUp}
              className="edge-light relative overflow-hidden rounded-xl border border-line bg-[var(--surface)] p-5 lg:col-span-2"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[var(--color-warning)]" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-wider text-faint">Wawasan</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                Pengeluaran jauh di atas kebiasaan.
              </p>
              {/* Alasan berupa angka, sama seperti di aplikasi sungguhan. */}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                6,6 simpangan baku di atas rata-rata kategori Makan &amp; Minum enam bulan
                terakhir.
              </p>
              <p className="numeric mt-3 text-sm text-ink">{formatIdr(4_200_000)}</p>
            </motion.div>

            {/* langganan */}
            <motion.div
              variants={fadeUp}
              className="edge-light relative overflow-hidden rounded-xl border border-line bg-[var(--surface)] p-5 lg:col-span-2"
            >
              <div className="flex items-center gap-2">
                <Repeat className="size-4 text-muted" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-wider text-faint">
                  Langganan
                </p>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="flex-1 truncate text-sm text-ink">Netflix</span>
                <span className="numeric text-sm text-ink">
                  {formatIdr(186_000)}
                  <span className="text-faint">/bln</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs text-faint">
                Tiap 30 hari · 5 kali · nominal tidak pernah berubah
              </p>
            </motion.div>

            {/* asisten */}
            <motion.div
              variants={fadeUp}
              className="edge-light relative overflow-hidden rounded-xl border border-line bg-[var(--surface)] p-5 lg:col-span-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--color-accent)]" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-wider text-faint">Asisten</p>
              </div>
              <p className="mt-3 text-sm text-muted">“Saldoku cukup sampai kapan?”</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                Dengan pola sekarang, saldomu habis dalam 78 hari.
              </p>
              {/* Asal-usul angka, sama seperti di aplikasi sungguhan. */}
              <p className="mt-2 text-xs text-faint">
                Dihitung dari arus bersih 41 hari terakhir dibagi saldo seluruh dompet.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}
