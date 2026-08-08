'use client';

import { ContactShadows } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

import { AiCore } from '@/components/three/ai-core';
import { Bear } from '@/components/three/bear';
import { OrbitObjects } from '@/components/three/orbit-objects';
import { Stage } from '@/components/three/stage';
import { StaticMascot } from '@/components/three/static-mascot';
import { MATERIAL } from '@/lib/palette';

/**
 * Isi kanvas 3D — dan SELURUH berat Three.js.
 *
 * Berkas ini berdiri sendiri supaya `import()` dinamis benar-benar memisahkan
 * bundelnya. Pola sebelumnya, `dynamic(() => Promise.resolve(Scene))`, TIDAK
 * memisahkan apa pun: `Scene` sudah diimpor secara statis di berkas yang sama,
 * jadi Three.js ikut ke potongan utama dan setiap pengunjung mengunduhnya —
 * termasuk yang tingkat grafisnya tidak akan pernah menjalankannya.
 *
 * Gejalanya terukur: Total Blocking Time 3.130 ms dan bobot halaman 748 KiB
 * pada emulasi ponsel, meski komponennya tidak pernah dirender.
 */
export default function MascotCanvas() {
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
            color={MATERIAL.black}
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
