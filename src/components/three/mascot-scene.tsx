'use client';

import { ContactShadows } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import dynamic from 'next/dynamic';

import { AiCore } from '@/components/three/ai-core';
import { Bear } from '@/components/three/bear';
import { OrbitObjects } from '@/components/three/orbit-objects';
import { Stage } from '@/components/three/stage';
import { cn } from '@/lib/cn';

/**
 * Adegan maskot.
 *
 * Bruang di depan, inti AI di belakangnya, uang mengorbit keduanya. Susunannya
 * menyatakan tesis produk dalam satu gambar: ada sesuatu yang mengawasi, dan
 * ada teman yang menghadapmu.
 *
 * Kedalaman dibangun lewat SKALA dan POSISI Z, bukan lewat kabur. Beruang
 * besar dan dekat; inti kecil dan jauh. Itu terbaca sebagai kedalaman bahkan
 * pada tingkat `lite` yang tidak menjalankan kedalaman medan sama sekali.
 */

function Scene() {
  return (
    <Stage className="size-full" distance={6.2} parallax={0.42} fallback={<StaticMascot />}>
      {(tier) => (
        <>
          {/* Inti di belakang dan kecil — halo, bukan subjek. */}
          <group position={[0, 0.35, -3.4]} scale={0.92}>
            <AiCore tier={tier} />
          </group>

          <group position={[0, -0.55, 0]} scale={1.18}>
            <Bear tier={tier} />
          </group>

          <group scale={1.35}>
            <OrbitObjects tier={tier} />
          </group>

          {/*
            Bayangan kontak. SATU-SATUNYA hal yang membuat benda terbaca
            BERDIRI di atas sesuatu alih-alih melayang di ruang hampa — dan
            ketiadaannya adalah alasan paling umum adegan 3D terlihat seperti
            tempelan.
          */}
          <ContactShadows
            position={[0, -1.62, 0]}
            opacity={0.55}
            scale={7}
            blur={2.6}
            far={3}
            resolution={tier === 'full' ? 512 : 128}
            color="#000000"
            frames={tier === 'full' ? Infinity : 1}
          />

          {tier === 'full' ? (
            <EffectComposer>
              {/*
                Ambang TINGGI: hanya visor dan tepi inti yang menyala ikut
                mekar. Ambang rendah membuat seluruh adegan berkabut, dan kabut
                terbaca sebagai lensa kotor — bukan sebagai cahaya.

                Kedalaman medan SENGAJA tidak dipakai di sini. Subjeknya adalah
                wajah, dan wajah yang sebagian kabur pada adegan sekecil ini
                terbaca sebagai render yang gagal fokus.
              */}
              <Bloom luminanceThreshold={0.62} luminanceSmoothing={0.24} intensity={0.9} mipmapBlur />
              <Vignette offset={0.3} darkness={0.55} />
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
 * Siluet beruang yang sama — kepala, dua telinga, badan — digambar dengan CSS.
 * BUKAN kotak kosong: pengunjung yang gerak-nya dikurangi tetap bertemu maskot
 * yang sama, hanya saja diam.
 */
function StaticMascot() {
  return (
    <div className="grid size-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[min(62%,20rem)]">
        {/* halo inti */}
        <div
          className="absolute inset-[6%] rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, color-mix(in oklab, var(--color-holo) 30%, transparent), transparent 62%)',
            filter: 'blur(10px)',
          }}
        />
        {/* telinga */}
        {[-1, 1].map((side) => (
          <div
            key={side}
            className="absolute size-[19%] rounded-full"
            style={{
              background: 'var(--surface-4)',
              top: '17%',
              left: side === -1 ? '18%' : '63%',
            }}
          />
        ))}
        {/* kepala */}
        <div
          className="absolute rounded-full"
          style={{ inset: '22% 24% 34% 24%', background: 'var(--surface-4)' }}
        />
        {/* badan */}
        <div
          className="absolute rounded-full"
          style={{ inset: '58% 16% 4% 16%', background: 'var(--surface-3)' }}
        />
        {/* visor — satu-satunya bagian yang menyala, sama seperti di 3D */}
        <div
          className="absolute size-[7%] rounded-full border-2"
          style={{ top: '42%', left: '36%', borderColor: 'var(--color-holo)' }}
        />
      </div>
    </div>
  );
}

const LazyScene = dynamic(() => Promise.resolve(Scene), {
  ssr: false,
  loading: () => <StaticMascot />,
});

export function MascotScene({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <LazyScene />
    </div>
  );
}
