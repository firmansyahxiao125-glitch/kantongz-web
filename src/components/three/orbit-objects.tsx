'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { GraphicsTier } from '@/lib/gpu';

/**
 * Benda keuangan yang mengorbit inti: kartu, koin, dan batang emas.
 *
 * Seluruhnya memakai `InstancedMesh` per jenis — satu panggilan gambar untuk
 * dua puluh koin alih-alih dua puluh. Pada perangkat terintegrasi, jumlah
 * panggilan gambar adalah batas yang lebih dulu tercapai daripada jumlah
 * segitiga, dan itulah yang membedakan 60 fps dari 24.
 *
 * Matriks tiap contoh dihitung dari waktu, bukan disimpan dan diakumulasi.
 * Akumulasi mengumpulkan galat pembulatan sampai orbit melenceng setelah
 * beberapa menit — cacat yang tidak pernah muncul saat diuji sebentar.
 */

interface OrbitSpec {
  /** Jari-jari orbit. */
  radius: number;
  /** Ketinggian rata-rata dari bidang inti. */
  height: number;
  /** Radian per detik. */
  speed: number;
  /** Fase awal supaya benda tidak berbaris rapi pada detik nol. */
  phase: number;
  /** Amplitudo naik-turun. */
  bob: number;
}

function specsFor(count: number, seedRadius: number): OrbitSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const ratio = i / count;
    return {
      radius: seedRadius + (i % 3) * 0.42,
      height: (ratio - 0.5) * 2.6,
      /* Kecepatan berbanding terbalik dengan jari-jari — benda yang jauh
         bergerak lebih lambat, seperti orbit sungguhan. Tanpa ini seluruhnya
         berputar seirama dan terbaca sebagai satu benda kaku. */
      speed: 0.16 - (i % 3) * 0.03,
      phase: ratio * Math.PI * 2,
      bob: 0.12 + (i % 4) * 0.05,
    };
  });
}

/** Satu kelompok benda seragam yang mengorbit. */
function OrbitInstances({
  specs,
  children,
  spin = 1,
}: {
  specs: OrbitSpec[];
  children: React.ReactNode;
  /** Pengali putaran benda pada porosnya sendiri. */
  spin?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  /* Objek bantu dipakai ulang antar-frame. Membuat `Object3D` baru untuk tiap
     contoh tiap frame menghasilkan ribuan alokasi per detik, dan jeda pengumpul
     sampah yang menyusulnya terlihat sebagai tersendat berkala. */
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;

    specs.forEach((spec, index) => {
      const angle = spec.phase + t * spec.speed;

      dummy.position.set(
        Math.cos(angle) * spec.radius,
        spec.height + Math.sin(t * 0.6 + spec.phase) * spec.bob,
        Math.sin(angle) * spec.radius,
      );
      dummy.rotation.set(t * 0.25 * spin + spec.phase, angle + Math.PI / 2, t * 0.14 * spin);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, specs.length]} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
}

export interface OrbitObjectsProps {
  tier: GraphicsTier;
  accent?: string;
}

export function OrbitObjects({ tier, accent = '#3b82f6' }: OrbitObjectsProps) {
  const full = tier === 'full';

  const cards = useMemo(() => specsFor(full ? 7 : 4, 3.1), [full]);
  const coins = useMemo(() => specsFor(full ? 14 : 7, 4.0), [full]);
  const bars = useMemo(() => specsFor(full ? 5 : 3, 4.8), [full]);

  return (
    <group>
      {/* Kartu bank: pelat tipis dengan pantulan tinggi. `roughness` rendah
          memberi kilau logam kartu tanpa peta lingkungan yang harus diunduh. */}
      <OrbitInstances specs={cards}>
        <boxGeometry args={[0.86, 0.54, 0.012]} />
        <meshStandardMaterial
          color={accent}
          metalness={0.85}
          roughness={0.22}
          emissive={accent}
          emissiveIntensity={0.14}
        />
      </OrbitInstances>

      {/* Koin. Silinder bersegi 24 — di ukuran layar ini, segi ke-25 tidak
          pernah terlihat dan hanya menambah segitiga. */}
      <OrbitInstances specs={coins} spin={2}>
        <cylinderGeometry args={[0.13, 0.13, 0.028, 24]} />
        <meshStandardMaterial color="#f0b429" metalness={0.95} roughness={0.28} />
      </OrbitInstances>

      {/* Batang emas. */}
      <OrbitInstances specs={bars} spin={0.6}>
        <boxGeometry args={[0.38, 0.14, 0.19]} />
        <meshStandardMaterial
          color="#d4a017"
          metalness={0.92}
          roughness={0.32}
          emissive="#7a5c00"
          emissiveIntensity={0.18}
        />
      </OrbitInstances>
    </group>
  );
}

/**
 * Aliran transaksi: pita cahaya yang menempuh orbit mengelilingi inti.
 *
 * Dibangun dari `TubeGeometry` pada lintasan Catmull-Rom tertutup, dengan
 * `dashOffset` yang bergerak — yang terbaca sebagai paket data yang mengalir,
 * bukan sebagai cincin yang berputar.
 */
export function TransactionStreams({ tier, color = '#00f5d4' }: { tier: GraphicsTier; color?: string }) {
  const group = useRef<THREE.Group>(null);
  const count = tier === 'full' ? 4 : 2;

  const curves = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const radius = 2.4 + i * 0.55;
        const tilt = (i - count / 2) * 0.42;

        /* Delapan titik kendali, ditinggikan bergantian: lintasan yang
           benar-benar melingkar terbaca sebagai cincin, sementara yang
           bergelombang terbaca sebagai jalur. */
        const points = Array.from({ length: 8 }, (_, p) => {
          const angle = (p / 8) * Math.PI * 2;
          return new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle * 2 + tilt) * 0.5,
            Math.sin(angle) * radius,
          );
        });

        return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
      }),
    [count],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.07;
  });

  return (
    <group ref={group}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, tier === 'full' ? 160 : 80, 0.008, 6, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.34 - i * 0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
