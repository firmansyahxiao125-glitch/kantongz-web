'use client';

import dynamic from 'next/dynamic';

import { useLencana3D } from '@/lib/gpu';

/**
 * Pembungkus lencana: tiga lapis penjagaan sebelum satu byte three.js diminta.
 *
 * ── MENGAPA PENJAGAANNYA BERLAPIS ──────────────────────────────────────
 *
 * Ini permukaan FINANSIAL. Yang dipertaruhkan bukan keindahan melainkan
 * kecepatan halaman yang dibuka orang setiap hari, sering di jaringan yang
 * mahal, untuk membaca angka uangnya sendiri.
 *
 *   1. `dynamic(ssr:false)` — three.js masuk potongan terpisah, jadi berkas
 *      dasarnya tidak membesar sedikit pun untuk siapa pun.
 *   2. tingkat grafis — hanya `full`. Ponsel, perangkat lemah, WebGL yang
 *      diblokir, dan `prefers-reduced-motion` tidak pernah memintanya.
 *   3. OPT-IN eksplisit — bawaannya MATI. Diukur lebih dulu: memasangnya
 *      menaikkan JavaScript dasbor 389 -> 624 KB, dan hiasan 88 piksel tidak
 *      layak dibayar 235 KB oleh orang yang tidak memintanya.
 *
 * ── CADANGANNYA BUKAN RUANG KOSONG ─────────────────────────────────────
 *
 * Ketika ketiganya menolak, yang tampil bukan lubang melainkan cakram
 * kuningan bergradien. Ukurannya sama persis, jadi tata letaknya tidak pernah
 * bergeser — dan pergeseran tata letak di sebelah angka uang jauh lebih buruk
 * daripada tidak ada lencana sama sekali.
 */

const LazyLencana = dynamic(() => import('@/components/three/lencana'), {
  ssr: false,
  loading: () => <Cakram />,
});

function Cakram() {
  return (
    <div
      aria-hidden
      className="size-full rounded-full"
      style={{
        background:
          'radial-gradient(circle at 34% 30%, var(--color-brass-spec), var(--color-brass) 46%, color-mix(in oklab, var(--color-brass) 40%, transparent) 78%, transparent 100%)',
      }}
    />
  );
}

export function LencanaKartu({ className }: { className?: string }) {
  const hidup = useLencana3D();

  return (
    <div className={className} style={{ width: 88, height: 88 }}>
      {hidup ? <LazyLencana /> : <Cakram />}
    </div>
  );
}
