'use client';

import dynamic from 'next/dynamic';

import { DeferUntilIdle } from '@/components/three/defer';
import { StaticMascot } from '@/components/three/static-mascot';
import { useGraphicsTier } from '@/lib/gpu';
import { cn } from '@/lib/cn';

/**
 * Maskot: gerbang ringan di depan adegan 3D yang berat.
 *
 * Berkas ini TIDAK mengimpor Three.js. Seluruh isinya hidup di
 * `mascot-canvas.tsx` dan hanya datang lewat `import()` sungguhan.
 */

const LazyCanvas = dynamic(() => import('@/components/three/mascot-canvas'), {
  ssr: false,
  loading: () => <StaticMascot />,
});

export function MascotScene({ className }: { className?: string }) {
  const tier = useGraphicsTier();

  /*
   * ── HANYA `full` YANG MENGUNDUH THREE.JS ────────────────────────────
   *
   * Diputuskan dari pengukuran, bukan dari selera. Lighthouse pada emulasi
   * ponsel dengan CPU dicekik 4× — yang setara ponsel kelas menengah
   * sungguhan — mencatat Total Blocking Time 3.130 ms dari satu bundel 341 KiB.
   *
   * `lite` sejak awal berarti "perangkat ini tidak sanggup, atau tidak
   * seharusnya diminta membayar panas dan baterainya". Membiarkannya tetap
   * mengunduh pustaka yang lalu dijalankan setengah hati merugikan keduanya.
   *
   * Pengganti statis berukuran SAMA dengan kanvasnya, jadi pergantian di
   * perangkat `full` tidak menggeser satu piksel pun tata letak (CLS 0).
   */
  /*
   * `data-tier` DI SINI, bukan di `Stage`.
   *
   * Gerbang `grafis` harus dapat menegaskan "di ponsel tingkatnya lite" dan
   * "dengan gerak dikurangi tidak ada 3D sama sekali". `Stage` hanya dipasang
   * ketika tingkatnya `full` — jadi penanda di sana LENYAP tepat pada dua
   * keadaan yang paling perlu diperiksa, dan gerbangnya melaporkan "tidak ada"
   * alih-alih melaporkan keadaan yang sebenarnya.
   *
   * Komponen inilah yang memutuskan tingkatnya, jadi di sinilah keputusan itu
   * dapat dibaca.
   */
  if (tier !== 'full') {
    return (
      <div data-tier={tier} className={cn('relative', className)}>
        <StaticMascot />
      </div>
    );
  }

  return (
    <div data-tier={tier} className={cn('relative', className)}>
      {/* Bahkan di `full`, adegan menunggu peramban selesai bekerja. */}
      <DeferUntilIdle fallback={<StaticMascot />}>
        <LazyCanvas />
      </DeferUntilIdle>
    </div>
  );
}
