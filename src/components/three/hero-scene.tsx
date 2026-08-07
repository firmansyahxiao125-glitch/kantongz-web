'use client';

import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { AiCore } from '@/components/three/ai-core';
import { OrbitObjects, TransactionStreams } from '@/components/three/orbit-objects';
import { Stage } from '@/components/three/stage';
import { cn } from '@/lib/cn';

/**
 * Adegan utama: inti AI dengan uang yang mengorbitnya.
 *
 * Bukan hiasan yang berdiri sendiri. Bentuknya menyatakan tesis produk ini —
 * ada sesuatu di tengah yang mengawasi, dan uang bergerak mengelilinginya.
 * Kalau adegan ini bisa dilepas tanpa halaman kehilangan makna, ia tidak layak
 * memakai satu pun watt baterai pengunjung.
 */

function Scene() {
  return (
    <Stage
      className="size-full"
      distance={7.4}
      fallback={<StaticCore />}
    >
      {(tier) => (
        <>
          <AiCore tier={tier} />
          <OrbitObjects tier={tier} />
          <TransactionStreams tier={tier} />

          {/*
            Pascaproses HANYA pada mutu penuh.
            Setiap lulus tambahan merender ulang seluruh layar; pada perangkat
            terintegrasi, tiga lulus mengubah adegan 60 fps menjadi 20 — dan
            adegan tersendat dengan bloom terlihat lebih buruk daripada adegan
            mulus tanpanya.
          */}
          {tier === 'full' ? (
            <EffectComposer>
              <Bloom
                /* Ambang tinggi supaya HANYA tepi yang menyala ikut mekar.
                   Ambang rendah membuat seluruh adegan berkabut, dan kabut
                   terbaca sebagai lensa kotor. */
                luminanceThreshold={0.55}
                luminanceSmoothing={0.28}
                intensity={1.15}
                mipmapBlur
              />
              <DepthOfField
                focusDistance={0.012}
                focalLength={0.05}
                bokehScale={2.4}
              />
              <Vignette offset={0.32} darkness={0.62} />
            </EffectComposer>
          ) : null}
        </>
      )}
    </Stage>
  );
}

/**
 * Pengganti tanpa WebGL.
 *
 * BUKAN kotak kosong. Pengunjung yang gerak-nya dikurangi, atau yang
 * perangkatnya tidak menjalankan WebGL, tetap harus melihat bentuk yang sama —
 * inti bercahaya dengan cincin di sekelilingnya — hanya saja diam. Halaman
 * yang kehilangan seluruh pusat visualnya pada perangkat lemah adalah halaman
 * yang dirancang untuk satu perangkat saja.
 */
function StaticCore() {
  return (
    <div className="grid size-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[min(78%,26rem)]">
        <div
          className="absolute inset-[18%] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 38% 32%, color-mix(in oklab, var(--color-holo) 55%, transparent), color-mix(in oklab, var(--color-holo) 30%, transparent) 55%, transparent 72%)',
            filter: 'blur(2px)',
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              inset: `${String(6 + i * 6)}%`,
              borderColor: `color-mix(in oklab, var(--color-holo) ${String(24 - i * 6)}%, transparent)`,
              transform: `rotateX(72deg) rotateZ(${String(i * 28)}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Dimuat hanya di klien, dan hanya saat dibutuhkan.
 *
 * Three.js dan pascaproses berjumlah ratusan kilobyte. Memuatnya di bundel
 * awal berarti setiap pengunjung membayar ongkosnya — termasuk yang tingkat
 * grafisnya `off` dan tidak akan pernah menjalankan satu baris pun darinya.
 *
 * `ssr: false` karena adegan ini membutuhkan `window` dan WebGL; merendernya
 * di server hanya menghasilkan galat, dan tidak ada HTML bermakna yang bisa
 * dihasilkannya.
 */
const LazyScene = dynamic(() => Promise.resolve(Scene), {
  ssr: false,
  loading: () => <StaticCore />,
});

export function HeroScene({ className }: { className?: string }): ReactNode {
  return (
    <div className={cn('relative', className)}>
      <LazyScene />
    </div>
  );
}
