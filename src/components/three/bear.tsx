'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { GraphicsTier } from '@/lib/gpu';

/**
 * BRUANG — maskot KANTONGZ.
 *
 * Beruang siber: bulat, tenang, dan sedikit berat. Bentuknya dipilih sebelum
 * detailnya — siluetnya harus terbaca sebagai "beruang" pada 48 piksel, karena
 * di situlah ia akan hidup sebagai favicon dan avatar jauh lebih sering
 * daripada sebagai adegan penuh.
 *
 * ── MENGAPA GEOMETRI PROSEDURAL, BUKAN GLB ─────────────────────────────
 *
 * Tidak ada berkas model di repositori ini, jadi tidak ada yang perlu
 * dikompresi Draco maupun KTX2. Beruang ini dibangun dari primitif yang
 * disatukan: nol byte aset, nol permintaan jaringan, dan bentuknya dapat
 * diubah dengan mengedit angka alih-alih membuka Blender.
 *
 * Batasnya nyata dan dinyatakan di sini: bulu, kerut kain, dan asimetri halus
 * yang membuat karakter Pixar terasa hidup TIDAK dapat dicapai dari primitif.
 * Yang dikejar bentuk ini adalah bahasa lain — mainan presisi yang termesin,
 * bukan makhluk. Itu sejalan dengan material titanium di DESIGN §1.1, dan
 * jujur terhadap apa yang benar-benar bisa dihasilkan tanpa aset.
 *
 * ── MENGAPA GERAKNYA BERLAPIS ──────────────────────────────────────────
 *
 * Empat lapis berjalan bersamaan pada periode yang tidak berkelipatan bulat:
 * napas, kedip, lirik kepala, dan lambaian sesekali. Yang membuat sesuatu
 * terbaca hidup bukan salah satunya, melainkan kenyataan bahwa keempatnya
 * tidak pernah jatuh di ketukan yang sama dua kali. Animasi idle yang berulang
 * persis adalah animasi yang setelah lima detik terbaca sebagai mesin.
 */

/* ── warna ────────────────────────────────────────────────────────────── */

const FUR = '#2A2F3A';
const FUR_LIGHT = '#3A4150';
const MUZZLE = '#E8EDF6';
const NOSE = '#0B0E14';
const EYE = '#0B0E14';
const VISOR = '#7FE3FF';

/* ── perilaku ─────────────────────────────────────────────────────────── */

/** Napas: 4,2 detik per siklus. Manusia tenang bernapas ~14×/menit; beruang
 *  yang bernapas lebih lambat terbaca sebagai tenang, bukan sebagai lambat. */
const BREATH_PERIOD = 4.2;

/** Kedip berlangsung 130 ms. Di bawah 90 ms mata tidak menangkapnya sama
 *  sekali; di atas 200 ms ia terbaca sebagai mengantuk. */
const BLINK_MS = 0.13;

/** Jeda antar kedip, acak dalam rentang ini. Kedip berkala persis adalah hal
 *  pertama yang membongkar bahwa ini animasi, bukan makhluk. */
const BLINK_MIN = 2.4;
const BLINK_MAX = 6.8;

/** Lambaian sesekali — cukup jarang untuk terasa seperti kejadian, bukan
 *  seperti perulangan. */
const WAVE_MIN = 9;
const WAVE_MAX = 18;
const WAVE_DURATION = 2.1;

export interface BearProps {
  tier: GraphicsTier;
  /** Ke mana beruang memandang, dalam koordinat pointer −1..1. */
  pointer?: React.RefObject<{ x: number; y: number }>;
}

export function Bear({ tier }: BearProps) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const armLeft = useRef<THREE.Group>(null);
  const armRight = useRef<THREE.Group>(null);
  const lidLeft = useRef<THREE.Mesh>(null);
  const lidRight = useRef<THREE.Mesh>(null);

  /* Keadaan perilaku hidup di ref, bukan di state React: nilainya berubah
     setiap frame, dan setiap perubahan state akan memicu render ulang React
     enam puluh kali per detik untuk sesuatu yang React tidak menggambar. */
  const beat = useRef({
    nextBlink: BLINK_MIN,
    blinkUntil: -1,
    nextWave: WAVE_MIN,
    waveUntil: -1,
  });

  /* Segmen bola. `lite` memakai separuh — pada siluet sebulat ini, selisihnya
     baru terlihat kalau dilihat berdampingan. */
  const seg = tier === 'full' ? 48 : 24;

  const materials = useMemo(
    () => ({
      /* Bulu: kasar dan hampir tidak memantul. Beruang mengkilap terbaca
         sebagai plastik, dan plastik terbaca sebagai murah. */
      fur: new THREE.MeshStandardMaterial({ color: FUR, roughness: 0.85, metalness: 0.05 }),
      furLight: new THREE.MeshStandardMaterial({
        color: FUR_LIGHT,
        roughness: 0.8,
        metalness: 0.05,
      }),
      muzzle: new THREE.MeshStandardMaterial({ color: MUZZLE, roughness: 0.65, metalness: 0 }),
      nose: new THREE.MeshStandardMaterial({ color: NOSE, roughness: 0.35, metalness: 0.1 }),
      /* Mata memantul tajam — satu titik kilau kecil itulah yang membuat mata
         terbaca sebagai basah, dan mata yang tidak basah terbaca sebagai mati. */
      eye: new THREE.MeshStandardMaterial({ color: EYE, roughness: 0.08, metalness: 0.2 }),
      /* Visor: satu-satunya bagian yang MEMANCAR. Hologram, DESIGN §1.3 —
         maksimal satu permukaan memancar per layar, dan ini dia. */
      visor: new THREE.MeshStandardMaterial({
        color: VISOR,
        emissive: new THREE.Color(VISOR),
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      }),
    }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const s = beat.current;

    /* ── napas ───────────────────────────────────────────────────────────
       Dada mengembang pada sumbu X dan Z, BUKAN Y. Makhluk yang bernapas
       menjadi lebih lebar, bukan lebih tinggi; menaikkan Y membuatnya terlihat
       seperti memantul. */
    const breath = Math.sin((t / BREATH_PERIOD) * Math.PI * 2);
    if (chest.current) {
      chest.current.scale.set(1 + breath * 0.022, 1 + breath * 0.012, 1 + breath * 0.022);
    }
    /* Seluruh tubuh naik-turun jauh lebih halus, dan TERTINGGAL fase dari
       dada — massa tidak bergerak seketika mengikuti paru-paru. */
    if (root.current) {
      root.current.position.y = Math.sin((t / BREATH_PERIOD) * Math.PI * 2 - 0.6) * 0.018;
    }

    /* ── kepala mengikuti kursor ──────────────────────────────────────────
       Diredam berbasis `delta`, bukan konstanta per frame. Konstanta membuat
       kecepatan mengikuti bergantung pada laju frame — halus di 120 Hz dan
       berat di 30 Hz, dan tidak ada yang menyadarinya sampai diuji di
       perangkat lambat.

       Jangkauannya sengaja SEMPIT. Kepala yang berputar penuh mengikuti kursor
       terbaca sebagai boneka yang dikendalikan; sedikit lirikan terbaca
       sebagai perhatian. */
    if (head.current) {
      const damping = 1 - Math.exp(-4.5 * delta);
      const targetY = state.pointer.x * 0.34;
      const targetX = -state.pointer.y * 0.2;

      head.current.rotation.y += (targetY - head.current.rotation.y) * damping;
      head.current.rotation.x += (targetX - head.current.rotation.x) * damping;
      /* Miring kepala sedikit mengikuti arah pandang. Kepala yang berputar
         tanpa miring adalah kepala di atas poros, bukan di atas leher. */
      head.current.rotation.z += (-state.pointer.x * 0.09 - head.current.rotation.z) * damping;
    }

    /* ── kedip ────────────────────────────────────────────────────────────
       Kelopak adalah bola yang DISKALAKAN pada sumbu Y, bukan bentuk terpisah
       yang muncul dan hilang. Menyembunyikan mata dan menampilkan kelopak
       membuat kedipnya berkedut pada frame pergantian. */
    if (t > s.nextBlink && s.blinkUntil < 0) {
      s.blinkUntil = t + BLINK_MS;
      /* Jeda berikutnya diacak. Kedip berkala persis adalah hal pertama yang
         membongkar bahwa ini animasi. */
      s.nextBlink = t + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
    }

    const blinking = s.blinkUntil > 0 && t < s.blinkUntil;
    if (s.blinkUntil > 0 && t >= s.blinkUntil) s.blinkUntil = -1;

    /* Setengah siklus sinus: turun lalu naik, tanpa titik henti di tengah. */
    const lid = blinking ? Math.sin(((t - (s.blinkUntil - BLINK_MS)) / BLINK_MS) * Math.PI) : 0;
    for (const ref of [lidLeft, lidRight]) {
      if (ref.current) ref.current.scale.y = 0.02 + lid * 1.15;
    }

    /* ── lengan: menganggur, lalu sesekali melambai ───────────────────────── */
    if (t > s.nextWave && s.waveUntil < 0) {
      s.waveUntil = t + WAVE_DURATION;
      s.nextWave = t + WAVE_MIN + Math.random() * (WAVE_MAX - WAVE_MIN);
    }
    if (s.waveUntil > 0 && t >= s.waveUntil) s.waveUntil = -1;

    const waving = s.waveUntil > 0 && t < s.waveUntil;

    if (armRight.current) {
      if (waving) {
        const progress = 1 - (s.waveUntil - t) / WAVE_DURATION;
        /* Amplop naik-tahan-turun supaya lengan tidak menghentak ke posisi
           melambai lalu jatuh. `sin(πp)` memberi keduanya sekaligus. */
        const envelope = Math.sin(progress * Math.PI);
        armRight.current.rotation.z = -0.35 - envelope * 1.75;
        armRight.current.rotation.x = -envelope * 0.25;
        /* Goyangan tangan hanya hidup di dalam amplop — melambai yang
           amplitudonya tetap terbaca sebagai metronom. */
        armRight.current.rotation.y = Math.sin(t * 11) * 0.42 * envelope;
      } else {
        /* Menganggur: ayunan sangat kecil, tidak sefase dengan lengan kiri. */
        armRight.current.rotation.z = -0.35 + Math.sin(t * 0.9) * 0.045;
        armRight.current.rotation.x = 0;
        armRight.current.rotation.y = 0;
      }
    }
    if (armLeft.current) {
      armLeft.current.rotation.z = 0.35 - Math.sin(t * 0.9 + 1.7) * 0.045;
    }
  });

  return (
    <group ref={root} dispose={null}>
      {/* ── badan ── */}
      <group ref={chest}>
        <mesh material={materials.fur} position={[0, -0.15, 0]} castShadow receiveShadow>
          {/* Bola yang dipipihkan, bukan kapsul: beruang duduk lebih lebar
              daripada tinggi, dan itulah yang membuat siluetnya ramah. */}
          <sphereGeometry args={[0.78, seg, seg]} />
        </mesh>
        {/* Perut lebih terang — bidang yang menghadap ke atas menerima lebih
            banyak cahaya langit, dan meniru itu memberi bentuk tanpa
            menambah satu pun lampu. */}
        <mesh material={materials.furLight} position={[0, -0.22, 0.42]} scale={[0.62, 0.7, 0.35]}>
          <sphereGeometry args={[0.78, seg, seg]} />
        </mesh>
      </group>

      {/* ── lengan ── */}
      <group ref={armLeft} position={[-0.66, -0.05, 0.1]}>
        <mesh material={materials.fur} position={[-0.12, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.3, 4, seg / 2]} />
        </mesh>
      </group>
      <group ref={armRight} position={[0.66, -0.05, 0.1]}>
        <mesh material={materials.fur} position={[0.12, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.3, 4, seg / 2]} />
        </mesh>
      </group>

      {/* ── kepala ── */}
      <group ref={head} position={[0, 0.72, 0]}>
        <mesh material={materials.fur} castShadow receiveShadow>
          <sphereGeometry args={[0.62, seg, seg]} />
        </mesh>

        {/* Telinga. Ditempatkan agak ke DEPAN dari puncak kepala — telinga di
            belakang membuat siluetnya terbaca sebagai tikus. */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.42, 0.44, -0.02]}>
            <mesh material={materials.fur} castShadow>
              <sphereGeometry args={[0.2, seg / 2, seg / 2]} />
            </mesh>
            <mesh material={materials.furLight} position={[0, 0, 0.1]} scale={[0.6, 0.6, 0.4]}>
              <sphereGeometry args={[0.2, seg / 2, seg / 2]} />
            </mesh>
          </group>
        ))}

        {/* Moncong */}
        <mesh material={materials.muzzle} position={[0, -0.16, 0.46]} scale={[1, 0.74, 0.66]}>
          <sphereGeometry args={[0.28, seg, seg]} />
        </mesh>
        <mesh material={materials.nose} position={[0, -0.1, 0.66]} scale={[1.25, 0.85, 0.8]}>
          <sphereGeometry args={[0.075, seg / 2, seg / 2]} />
        </mesh>

        {/* Mata dan kelopaknya. Kelopak adalah bola yang dipipihkan sampai
            hampir nol dan MEMBUKA ke bawah saat berkedip. */}
        {[-1, 1].map((side, index) => (
          <group key={side} position={[side * 0.24, 0.06, 0.52]}>
            <mesh material={materials.eye}>
              <sphereGeometry args={[0.085, seg / 2, seg / 2]} />
            </mesh>
            <mesh
              ref={index === 0 ? lidLeft : lidRight}
              material={materials.fur}
              position={[0, 0.02, 0.02]}
              scale={[1.15, 0.02, 1.15]}
            >
              <sphereGeometry args={[0.09, seg / 2, seg / 2]} />
            </mesh>
          </group>
        ))}

        {/* Visor siber di satu mata. Satu-satunya permukaan yang memancar, dan
            satu-satunya tempat identitas "siber" itu diletakkan — menempelkan
            neon di sekujur tubuh akan membuatnya terbaca sebagai mainan lampu,
            bukan sebagai mesin yang tenang. */}
        <mesh
          material={materials.visor}
          position={[-0.24, 0.07, 0.545]}
          rotation={[0, 0.12, -0.08]}
        >
          <ringGeometry args={[0.1, 0.135, 24]} />
        </mesh>
      </group>
    </group>
  );
}
