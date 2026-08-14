'use client';

import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';

import { Suspense } from 'react';

import { Bara, Lingkungan, type KendaliRonin } from '@/components/three/ronin';
import { RoninModel } from '@/components/three/ronin-model';
import { Stage } from '@/components/three/stage';
import { RoninDiam } from '@/components/three/ronin-diam';

/**
 * Isi kanvas Ronin — dan SELURUH berat Three.js.
 *
 * Berkas ini berdiri sendiri supaya `import()` dinamis benar-benar memisahkan
 * bundelnya. Pola `dynamic(() => Promise.resolve(Scene))` TIDAK memisahkan apa
 * pun: komponennya sudah diimpor secara statis di berkas yang sama, jadi
 * Three.js ikut ke potongan utama dan setiap pengunjung mengunduhnya — termasuk
 * yang tingkat grafisnya tidak akan pernah menjalankannya.
 */
export default function RoninCanvas({ kendali }: { kendali: { current: KendaliRonin } }) {
  /*
   * Jaraknya DIRAPATKAN 7,4 -> 5,9.
   *
   * Pada 7,4 samurainya hanya mengisi kira-kira seperenam bingkai, dan sisanya
   * langit kosong. Itu bukan sekadar soal selera: pahatan yang dibayar mahal —
   * kusazuri, sode berlapis, lengkung bilah — semuanya berada di bawah dua
   * piksel pada jarak itu, jadi biayanya dibayar tanpa ada yang melihat
   * hasilnya.
   */
  return (
    <Stage className="size-full" distance={5.2} parallax={0.34} fallback={<RoninDiam />}>
      {(tier) => (
        <>
          {/*
            `Suspense` di SINI, bukan di sekitar seluruh kanvas.

            `useGLTF` menangguhkan sampai modelnya tiba. Kalau batasnya
            dipasang di luar kanvas, seluruh adegan ikut hilang selama
            pengunduhan — termasuk lingkungan dan bara yang sudah siap. Di
            dalam, yang kosong hanya samurainya, dan panggungnya tetap hidup
            sejak bingkai pertama.
          */}
          <Suspense fallback={null}>
            <RoninModel tier={tier} kendali={kendali} />
          </Suspense>
          <Lingkungan tier={tier} />
          <Bara tier={tier} />

          {tier === 'full' ? (
            <EffectComposer>
              {/*
                Ambang TINGGI: hanya bilah, celah mata, dan tepi zirah yang
                ikut mekar. Ambang rendah membuat seluruh adegan berkabut, dan
                kabut terbaca sebagai lensa kotor — bukan sebagai cahaya.
              */}
              <Bloom
                luminanceThreshold={0.55}
                luminanceSmoothing={0.22}
                intensity={1.25}
                mipmapBlur
              />
              {/*
                Kedalaman medan DIPAKAI di sini, berbeda dari adegan maskot
                sebelumnya. Subjeknya bukan wajah melainkan SILUET, dan bara
                yang sebagian di luar fokus itulah yang mengubah kumpulan titik
                menjadi udara.
              */}
              <DepthOfField focusDistance={0.016} focalLength={0.05} bokehScale={2.4} />
              <Vignette offset={0.26} darkness={0.62} />
            </EffectComposer>
          ) : null}
        </>
      )}
    </Stage>
  );
}
