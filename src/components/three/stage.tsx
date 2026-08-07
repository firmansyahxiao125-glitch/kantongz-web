'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

import { useGraphicsTier, type GraphicsTier } from '@/lib/gpu';
import { cn } from '@/lib/cn';

/**
 * Panggung 3D.
 *
 * Satu tempat yang memutuskan apakah 3D dijalankan sama sekali, pada mutu apa,
 * dan apa yang tampil kalau tidak. Layar yang memutuskannya sendiri-sendiri
 * akan menghasilkan satu layar yang lupa memeriksa — dan yang lupa itu selalu
 * layar yang paling jarang dibuka, di perangkat yang paling lemah.
 *
 * Anak-anaknya menerima `tier` sebagai argumen fungsi, bukan lewat konteks:
 * setiap adegan HARUS menyatakan apa yang berubah pada mutu rendah, dan
 * konteks membuatnya terlalu mudah untuk tidak menyatakan apa pun.
 */

export interface StageProps {
  children: (tier: Exclude<GraphicsTier, 'off'>) => ReactNode;
  /** Tampil menggantikan kanvas saat 3D dimatikan. WAJIB — bukan opsional. */
  fallback: ReactNode;
  className?: string;
  /** Jarak kamera dari titik asal. */
  distance?: number;
  /** Seberapa jauh kamera mengikuti kursor, dalam satuan dunia. */
  parallax?: number;
}

export function Stage({
  children,
  fallback,
  className,
  distance = 7,
  parallax = 0.7,
}: StageProps) {
  const tier = useGraphicsTier();

  if (tier === 'off') {
    return <div className={cn('relative', className)}>{fallback}</div>;
  }

  return (
    <div className={cn('relative', className)}>
      <Canvas
        /* Layar retina merender empat kali lebih banyak piksel. Batas 1.5
           menahan biaya itu tanpa perbedaan yang terlihat pada adegan yang
           seluruhnya berupa pendar dan gradien. `lite` dijepit ke 1. */
        dpr={tier === 'full' ? [1, 1.5] : 1}
        camera={{ position: [0, 0, distance], fov: 42 }}
        gl={{
          antialias: tier === 'full',
          alpha: true,
          powerPreference: 'high-performance',
        }}
        /* Kanvas dekoratif. Pembaca layar tidak boleh menemukan apa pun di
           sini — isinya sudah disampaikan teks di sekelilingnya. */
        aria-hidden
        style={{ pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <Rig parallax={parallax} distance={distance} />
          <Lighting tier={tier} />
          {children(tier)}
        </Suspense>
      </Canvas>

      {/* Vinyet gelap di tepi. Menahan adegan supaya tidak "terpotong" oleh
          batas kanvas — tanpa ini, tepi kanvas terlihat sebagai garis. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 75% at 50% 45%, transparent 40%, var(--bg) 100%)',
        }}
      />
    </div>
  );
}

/**
 * Kamera mengikuti kursor.
 *
 * Bergerak menuju sasaran dengan interpolasi berbasis waktu, bukan langsung ke
 * posisi kursor: gerak langsung membuat adegan tersentak mengikuti setiap
 * getaran tangan, dan yang tersentak terbaca sebagai murah.
 *
 * Faktor peredaman dihitung dari `delta`, bukan konstanta per frame. Konstanta
 * membuat kecepatan mengikuti bergantung pada laju frame — halus di 120 Hz,
 * berat di 30 Hz, dan tidak ada yang menyadarinya sampai diuji di perangkat
 * lambat.
 */
function Rig({ parallax, distance }: { parallax: number; distance: number }) {
  const target = useRef(new THREE.Vector3(0, 0, distance));
  const { camera } = useThree();

  useFrame((state, delta) => {
    target.current.set(
      state.pointer.x * parallax,
      state.pointer.y * parallax * 0.6,
      distance,
    );

    const damping = 1 - Math.exp(-3.2 * delta);
    camera.position.lerp(target.current, damping);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/**
 * Pencahayaan.
 *
 * Tiga sumber: kunci dari kanan atas, isi dingin dari kiri, dan ambien lemah
 * supaya sisi gelap tidak menjadi siluet hitam. Adegan bercahaya sendiri masih
 * membutuhkan ini — logam tanpa cahaya terarah tidak punya kilau, dan tanpa
 * kilau kartu dan koin terbaca sebagai plastik.
 */
function Lighting({ tier }: { tier: Exclude<GraphicsTier, 'off'> }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.7} color="#3b82f6" />
      {/* Sorot lembut dari atas hanya pada mutu penuh — biayanya nyata dan
          sumbangannya paling kecil di antara ketiganya. */}
      {tier === 'full' ? (
        <pointLight position={[0, 3.5, 1.5]} intensity={14} distance={12} color="#00f5d4" />
      ) : null}
    </>
  );
}
