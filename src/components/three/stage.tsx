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
        /* Bayangan HANYA pada mutu penuh. Peta bayangan adalah lulus render
           kedua atas seluruh adegan; menyalakannya di `lite` adalah menggandakan
           biaya pada perangkat yang justru dipilih karena tidak sanggup.

           `'percentage'` (PCFShadowMap) dan bukan `true` (PCFSoftShadowMap):
           Three.js sudah MENOLAK yang terakhir dan diam-diam memakai yang ini
           sebagai gantinya — "PCFSoftShadowMap has been deprecated. Using
           PCFShadowMap instead", dua puluh delapan kali per pemuatan halaman.
           Menyebutnya langsung tidak mengubah satu piksel pun; ia hanya
           berhenti meminta sesuatu yang tidak akan diberikan. */
        shadows={tier === 'full' ? 'percentage' : false}
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
 * Pencahayaan tiga titik, susunan sinematik.
 *
 *   KEY    kanan-atas-depan, hangat, paling terang. Membentuk wajah.
 *   FILL   kiri, dingin, sepertiga kekuatan key. Mengangkat bayangan supaya
 *          sisi gelap punya BENTUK alih-alih menjadi siluet hitam.
 *   RIM    belakang-atas, hologram. Menggambar garis cahaya di tepi siluet,
 *          dan itulah satu-satunya hal yang memisahkan subjek gelap dari
 *          latar gelap.
 *
 * Suhu key dan fill sengaja berlawanan — hangat melawan dingin. Dua sumber
 * berwarna sama menghasilkan bentuk yang datar berapa pun kuatnya, karena
 * mata membaca kedalaman dari perbedaan RONA sebanyak dari perbedaan terang.
 *
 * `castShadow` hanya pada key. Dua sumber berbayang menggandakan biaya peta
 * bayangan untuk bayangan kedua yang hampir tidak pernah terlihat.
 */
function Lighting({ tier }: { tier: Exclude<GraphicsTier, 'off'> }) {
  const full = tier === 'full';

  return (
    <>
      {/* Ambien rendah. Menaikkannya lebih mudah daripada menata cahaya, dan
          itulah persis mengapa hasilnya selalu terlihat datar. */}
      <ambientLight intensity={0.22} />

      <directionalLight
        position={[3.2, 4.5, 3.5]}
        intensity={2.1}
        color="#FFF4DC"
        castShadow={full}
        shadow-mapSize={full ? [1024, 1024] : [256, 256]}
        shadow-bias={-0.0012}
      >
        {/* Frustum bayangan dirapatkan ke subjek. Frustum bawaan mencakup
            seluruh adegan, yang menyebarkan resolusi peta ke ruang kosong dan
            menghasilkan tepi bayangan bergerigi. */}
        <orthographicCamera attach="shadow-camera" args={[-4, 4, 4, -4, 0.1, 14]} />
      </directionalLight>

      <directionalLight position={[-4.5, 0.5, 2]} intensity={0.55} color="#7FE3FF" />

      {/* Rim. Di BELAKANG subjek, menghadap kamera. */}
      <directionalLight position={[-1.5, 2.5, -4]} intensity={1.4} color="#B8F0FF" />

      {/* Praktikal hangat dari bawah-depan, hanya pada mutu penuh. Meniru
          cahaya yang memantul dari permukaan meja — halus, dan satu-satunya
          alasan dagu tidak menjadi lubang hitam. */}
      {full ? (
        <pointLight position={[0, -1.8, 2.4]} intensity={6} distance={8} color="#C89440" />
      ) : null}
    </>
  );
}
