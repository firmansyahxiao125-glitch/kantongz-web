'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { GraphicsTier } from '@/lib/gpu';
import { MATERIAL, TOKEN } from '@/lib/palette';
import {
  DURASI,
  type FaseRonin,
  goyangKamera,
  poseTebasan,
  stanceGulir,
} from '@/lib/ronin';

/**
 * RONIN — mesin samurai kuno.
 *
 * ── PLAN B, DAN ITU BUKAN PILIHAN KEDUA ────────────────────────────────
 *
 * Dibangun dari primitif di dalam kode, bukan diunduh sebagai model. Nol
 * risiko lisensi, nol berkas biner di repositori, dapat diperiksa dalam diff,
 * dan dapat disetel satu angka pada satu waktu.
 *
 * Yang membuat rujukannya keren bukan jumlah poligon. Yang membuatnya keren
 * adalah SILUET — caping dan bahu zirah yang terbaca dalam 0,2 detik — lalu
 * satu warna jenuh di atas hampir-hitam, rim light yang mendefinisikan
 * tepinya, bara yang melayang, dan kabut yang memberi cahaya tempat berpijak.
 *
 * Siluet geometris yang disinari dengan benar mengalahkan model rinci yang
 * disinari asal-asalan. Berkas ini bertaruh pada itu.
 *
 * ── FRESNEL MENGERJAKAN SEBAGIAN BESARNYA ──────────────────────────────
 *
 * Satu shader: bagian dalam nyaris hitam, tepinya menyala. Itulah yang
 * mengubah kumpulan kotak menjadi sesuatu yang punya bentuk — dan itu pula
 * yang membuat bloom punya sesuatu untuk dimekarkan.
 */

const VERTEX = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uDalam;
  uniform vec3 uTepi;
  uniform float uPangkat;
  uniform float uKuat;

  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    float f = 1.0 - max(dot(normalize(vNormalView), normalize(vViewDir)), 0.0);
    /*
      DIJEPIT SESUDAH dikalikan, dan itu bukan detail.

      Tanpa jepitan, uKuat > 1 membuat campurannya MELAMPAUI warna rim: pada
      f serendah 0,6 seluruh permukaan sudah 96% warna tepi, dan zirah yang
      seharusnya gelap menyala rata dari pinggir sampai perut. Yang tersisa
      bukan rim light melainkan benda yang bersinar seluruhnya — persis
      kebalikan dari yang membuat siluet terbaca.
    */
    f = clamp(pow(clamp(f, 0.0, 1.0), uPangkat) * uKuat, 0.0, 1.0);
    gl_FragColor = vec4(mix(uDalam, uTepi, f), 1.0);
  }
`;

/**
 * Zirah: gelap di perut, menyala HANYA di pinggir.
 *
 * `uPangkat` menentukan setipis apa pitanya. 2,6 menghasilkan gradien lembut
 * yang menutupi separuh permukaan — indah sendirian, tetapi ia menghapus
 * siluetnya: benda yang bersinar seluruhnya tidak punya tepi untuk dibaca
 * mata. 5,0 menjadikannya pita tipis di sepanjang pinggir, dan perutnya
 * kembali gelap. Itulah yang membuat bentuk sederhana terbaca bervolume.
 *
 * `kuat` di atas 1 dipakai untuk bagian yang memang harus menonjol — helm,
 * pelat bahu, tsuba — dan tetap dijepit di shader supaya ia tidak pernah
 * membanjiri permukaan.
 */
function useZirah(kuat = 1, pangkat = 5) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uDalam: { value: new THREE.Color(MATERIAL.nearBlack) },
          uTepi: { value: new THREE.Color(TOKEN.ronin) },
          uPangkat: { value: pangkat },
          uKuat: { value: kuat },
        },
      }),
    [kuat, pangkat],
  );
}

/**
 * Keadaan yang dibaca tiap bingkai.
 *
 * Dilewatkan sebagai REF, bukan sebagai prop biasa. Fase berubah beberapa kali
 * per detik dan arah kursor berubah puluhan kali; menjadikannya prop berarti
 * React merender ulang seluruh pohon adegan pada setiap gerakan tetikus, dan
 * merender ulang adegan 3D enam puluh kali sedetik adalah cara paling mahal
 * untuk menganimasikan sesuatu yang seharusnya digerakkan `useFrame`.
 */
export interface KendaliRonin {
  fase: FaseRonin;
  t: number;
  /** 0–1, kemajuan gulir halaman. */
  gulir: number;
  /** Arah penunjuk, −1..1. Berlaku untuk tetikus maupun sentuhan. */
  arah: { x: number; y: number };
}

export interface RoninProps {
  tier: GraphicsTier;
  kendali: { current: KendaliRonin };
}

export function Ronin({ tier, kendali }: RoninProps) {
  const akar = useRef<THREE.Group>(null);
  const badan = useRef<THREE.Group>(null);
  const lengan = useRef<THREE.Group>(null);
  const kepala = useRef<THREE.Group>(null);
  const jejak = useRef<THREE.Mesh>(null);
  const nafas = useRef(0);

  const zirah = useZirah();
  const zirahTerang = useZirah(1.25, 4);

  /* Bilah: hijau nyaris putih, ADITIF, jadi ia benar-benar menyala alih-alih
     sekadar berwarna terang. Ini yang ditangkap bloom. */
  const bilahMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(TOKEN.roninBright),
        toneMapped: false,
      }),
    [],
  );

  /*
   * Material jejak dipegang lewat REF, bukan `useMemo`.
   *
   * Kepekatannya berubah tiap bingkai, dan React Compiler memperlakukan hasil
   * `useMemo` sebagai tidak boleh diubah sesudah render — dengan benar:
   * `useMemo` adalah petunjuk, dan nilai yang dimutasi di belakangnya adalah
   * nilai yang bisa hilang tanpa pemberitahuan. Ref menyatakan mutasinya
   * secara terbuka.
   */
  const jejakMat = useRef<THREE.MeshBasicMaterial>(null);

  const segmen = tier === 'full' ? 24 : 10;

  useFrame((state, delta) => {
    nafas.current += delta;

    const { fase, t, gulir, arah } = kendali.current;
    const pose = poseTebasan(fase, t);
    const stance = stanceGulir.pose(gulir);
    const guncang = goyangKamera(fase, t);

    if (akar.current) {
      /* Mundur ke dalam kabut mengikuti gulir; guncangan ditumpangkan di atasnya
         sebagai satu sentakan, bukan getaran. */
      akar.current.position.z = -stance.mundur + guncang * 2;
      akar.current.position.y = -1.15 + Math.sin(nafas.current * 0.9) * 0.02 + guncang;
      akar.current.rotation.y = stance.putar;
    }

    if (badan.current) {
      /*
       * Kepala dan badan MENGIKUTI kursor, teredam dan DIBATASI KERAS.
       *
       * Benda yang mengejar kursor tanpa batas terbaca sebagai rusak, bukan
       * sebagai hidup. Batasnya kecil sekali — cukup untuk terasa
       * memperhatikan, tidak cukup untuk terlihat menoleh.
       */
      const targetY = THREE.MathUtils.clamp(arah.x * 0.22, -0.22, 0.22);
      badan.current.rotation.y = THREE.MathUtils.damp(
        badan.current.rotation.y,
        targetY + pose.badan,
        4,
        delta,
      );
      badan.current.rotation.z = THREE.MathUtils.damp(
        badan.current.rotation.z,
        pose.badan * 0.35,
        6,
        delta,
      );
    }

    if (kepala.current) {
      const targetX = THREE.MathUtils.clamp(-arah.y * 0.14, -0.14, 0.14);
      kepala.current.rotation.x = THREE.MathUtils.damp(kepala.current.rotation.x, targetX, 3.4, delta);
      kepala.current.position.y = 1.42 + Math.sin(nafas.current * 0.9) * 0.012;
    }

    /* Lengan mengayun langsung — tidak diredam. Ayunan yang diredam kehilangan
       ketegasannya, dan ketegasan itulah yang membuat tebasan terbaca. */
    if (lengan.current) lengan.current.rotation.z = pose.bilah;

    if (jejak.current && jejakMat.current) {
      jejakMat.current.opacity = pose.jejak * 0.85;
      jejak.current.visible = pose.jejak > 0.01;
      jejak.current.rotation.z = pose.bilah - 0.55;
    }

    void state;
  });

  return (
    <group ref={akar} position={[0, -1.15, 0]} scale={0.92}>
      <group ref={badan}>
        {/* ── kepala dan caping ─────────────────────────────────────────
            Caping adalah SATU-SATUNYA bentuk yang harus dikenali dalam
            sekejap. Ia lebar, rendah, dan menutupi wajah — dan wajah yang
            tertutup itulah yang membuat siluetnya terbaca sebagai samurai
            alih-alih sebagai orang. */}
        <group ref={kepala} position={[0, 1.42, 0]}>
          <mesh position={[0, 0.06, 0]} material={zirahTerang}>
            <coneGeometry args={[0.62, 0.3, segmen]} />
          </mesh>
          <mesh position={[0, -0.08, 0]} material={zirah}>
            <sphereGeometry args={[0.19, segmen, segmen]} />
          </mesh>
          {/* celah mata — satu-satunya bagian wajah yang ada, dan ia menyala */}
          <mesh position={[0, -0.06, 0.17]} material={bilahMat}>
            <boxGeometry args={[0.17, 0.022, 0.02]} />
          </mesh>
        </group>

        {/* ── bahu zirah ────────────────────────────────────────────────
            Pelat bersudut, bukan bulat. Sudut yang menangkap rim light itulah
            yang memberi bahu beratnya. */}
        {[-1, 1].map((sisi) => (
          <mesh
            key={sisi}
            position={[sisi * 0.46, 1.06, 0]}
            rotation={[0, 0, sisi * 0.34]}
            material={zirahTerang}
          >
            <boxGeometry args={[0.42, 0.16, 0.44]} />
          </mesh>
        ))}

        {/* ── badan ─────────────────────────────────────────────────────
            Meruncing ke bawah: bahu lebar, pinggang sempit. Itu proporsi yang
            membaca sebagai zirah, bukan sebagai tong. */}
        <mesh position={[0, 0.72, 0]} material={zirah}>
          <cylinderGeometry args={[0.42, 0.3, 0.72, segmen]} />
        </mesh>
        <mesh position={[0, 0.34, 0]} material={zirahTerang}>
          <cylinderGeometry args={[0.3, 0.34, 0.16, segmen]} />
        </mesh>

        {/* ── kaki, sedikit terbuka: kuda-kuda, bukan berdiri tegak ───── */}
        {[-1, 1].map((sisi) => (
          <group key={sisi} position={[sisi * 0.19, 0.26, 0]} rotation={[0, 0, sisi * 0.12]}>
            <mesh position={[0, -0.26, 0]} material={zirah}>
              <cylinderGeometry args={[0.11, 0.09, 0.56, segmen]} />
            </mesh>
          </group>
        ))}

        {/* ── lengan kanan + katana ─────────────────────────────────────
            Seluruh ayunan terjadi di grup ini. Bilahnya panjang dan tipis;
            yang membuatnya terbaca sebagai pedang adalah rasio, bukan detail. */}
        <group ref={lengan} position={[0.44, 1.0, 0.06]}>
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={zirah}>
            <cylinderGeometry args={[0.085, 0.075, 0.6, segmen]} />
          </mesh>
          {/* tsuba — pembatas tangan dan bilah */}
          <mesh position={[0.62, 0, 0]} material={zirahTerang}>
            <cylinderGeometry args={[0.11, 0.11, 0.03, segmen]} />
          </mesh>
          <mesh position={[1.32, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={bilahMat}>
            <boxGeometry args={[0.028, 1.36, 0.075]} />
          </mesh>
        </group>

        {/* lengan kiri, diam — kontras yang membuat lengan kanan terbaca
            sebagai yang bergerak */}
        <mesh position={[-0.5, 0.86, 0.02]} rotation={[0, 0, 0.28]} material={zirah}>
          <cylinderGeometry args={[0.085, 0.07, 0.6, segmen]} />
        </mesh>

        {/* ── jejak bilah ───────────────────────────────────────────────
            Busur, bukan garis. Yang membaca sebagai kecepatan adalah bentuk
            yang ditinggalkan bilah di udara — dan itu selalu lengkung. */}
        <mesh ref={jejak} position={[0.44, 1.0, 0.04]} visible={false}>
          <ringGeometry args={[1.0, 1.75, tier === 'full' ? 48 : 20, 1, 0, 1.5]} />
          <meshBasicMaterial
            ref={jejakMat}
            color={TOKEN.ronin}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Bara yang melayang naik.
 *
 * Ukurannya BERVARIASI dan sebagian sengaja di luar fokus. Partikel seragam
 * terbaca sebagai screensaver; yang bervariasi terbaca sebagai udara — dan
 * perbedaan antara keduanya adalah satu baris acak.
 */
export function Bara({ tier }: { tier: GraphicsTier }) {
  const titik = useRef<THREE.Points>(null);
  const jumlah = tier === 'full' ? 220 : 70;

  const { geometry, material, kecepatan } = useMemo(() => {
    /*
     * BERBENIH, bukan `Math.random()`. Dua alasan, keduanya nyata.
     *
     * React Compiler menolak fungsi tak murni di dalam `useMemo` — dengan
     * benar: `useMemo` adalah petunjuk, bukan jaminan, dan sebaran bara yang
     * berubah pada render ulang yang tidak disengaja adalah adegan yang
     * berkedip tanpa sebab.
     *
     * Dan yang lebih berguna: ladang bara jadi IDENTIK pada setiap pemuatan.
     * Tangkapan layar dokumentasi karena itu dapat dibandingkan satu sama
     * lain, dan perbedaan di antaranya berarti sesuatu benar-benar berubah.
     */
    let benih = 0x9e3779b9;
    const acak = (): number => {
      benih = (benih + 0x6d2b79f5) | 0;
      let t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const posisi = new Float32Array(jumlah * 3);
    const ukuran = new Float32Array(jumlah);
    const laju = new Float32Array(jumlah);

    for (let i = 0; i < jumlah; i += 1) {
      posisi[i * 3] = (acak() - 0.5) * 7;
      posisi[i * 3 + 1] = acak() * 5 - 1.4;
      posisi[i * 3 + 2] = (acak() - 0.5) * 4 - 0.6;
      /* Pangkat tiga: sebagian besar kecil, sedikit yang besar. Ukuran seragam
         terbaca sebagai screensaver; sebaran inilah yang terbaca sebagai
         udara. */
      ukuran[i] = 0.012 + acak() ** 3 * 0.07;
      laju[i] = 0.12 + acak() * 0.36;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posisi, 3));
    g.setAttribute('size', new THREE.BufferAttribute(ukuran, 1));

    const m = new THREE.PointsMaterial({
      color: new THREE.Color(TOKEN.ronin),
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    return { geometry: g, material: m, kecepatan: laju };
  }, [jumlah]);

  useFrame((_, delta) => {
    const p = titik.current?.geometry.getAttribute('position');
    if (!p) return;
    for (let i = 0; i < jumlah; i += 1) {
      let y = p.getY(i) + kecepatan[i]! * delta;
      /* Melingkar, bukan dilahirkan ulang: kelahiran ulang menghasilkan kedipan
         di tepi bawah yang terlihat begitu ada yang memperhatikan. */
      if (y > 3.8) y = -1.6;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  });

  return <points ref={titik} geometry={geometry} material={material} />;
}

export { DURASI };
