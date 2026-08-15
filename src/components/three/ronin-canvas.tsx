'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

import { Suspense } from 'react';

import { Bara, Lingkungan, type KendaliRonin } from '@/components/three/ronin';
import { TOKEN } from '@/lib/palette';
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
          {/*
            ── CAHAYA, DAN MENGAPA IA BARU ADA SEKARANG ──────────────────

            Adegan ini berjalan tanpa satu pun lampu sejak awal, dan itu
            benar selama seluruh isinya memakai shader fresnel yang
            menghitung rupanya sendiri. Aset dari luar tidak: materialnya PBR
            sungguhan, dan PBR tanpa sumber cahaya merender HITAM PEKAT —
            bukan gelap, melainkan tidak tergambar sama sekali.

            Tiga sumber, arah kuncinya sama dengan yang dipakai shader
            fresnel supaya kedua jenis bahan disinari dari tempat yang sama.
            Sosok yang separuhnya disinari dari kiri dan separuhnya dari
            kanan terbaca sebagai dua benda yang kebetulan berdekatan.
          */}
          <ambientLight intensity={0.55} color={TOKEN.ronin} />
          <directionalLight position={[-2.2, 2.9, 1.7]} intensity={1.5} color={TOKEN.roninBright} />
          <directionalLight position={[2.6, 1.2, -1.8]} intensity={0.9} color={TOKEN.ronin} />

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
                luminanceThreshold={0.72}
                luminanceSmoothing={0.22}
                intensity={0.85}
                mipmapBlur
              />
              {/*
                ── KEDALAMAN MEDAN DIBUANG ────────────────────────────────

                Ia dipasang ketika subjeknya siluet prosedural: bara yang
                sebagian lepas fokus mengubah kumpulan titik menjadi udara,
                dan siluet datar tidak punya detail yang bisa hilang.

                Aset berpahat membalik perhitungan itu seluruhnya. Yang dibayar
                mahal justru KETAJAMANNYA — pelat zirah, jahitan mantel, ukiran
                helm — dan kedalaman medan menghapus persis itu. Dengan
                `focusDistance` 0,016 pada kamera sejauh 5,2, bidang fokusnya
                bahkan tidak jatuh di karakternya: yang tajam ruang kosong di
                depannya, yang kabur samurainya.

                Atmosfernya tidak hilang bersamanya — halimun, bulan berpendar,
                dan bara masih mengerjakannya, dan ketiganya tidak menyentuh
                ketajaman subjek.
              */}
              <Vignette offset={0.26} darkness={0.62} />
            </EffectComposer>
          ) : null}
        </>
      )}
    </Stage>
  );
}
