'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { TOKEN } from '@/lib/palette';

/**
 * LENCANA — satu-satunya 3D yang hidup DI DALAM aplikasi.
 *
 * ── MENGAPA IA JAUH LEBIH KECIL DARIPADA RONIN ─────────────────────────
 *
 * Permukaan publik menjual; permukaan dalam DIPAKAI. ROADMAP §7.1
 * menetapkannya tenang dan terang-hangat, dan sebabnya bukan selera: orang
 * membuka dasbor untuk membaca angka uangnya, sering dalam keadaan cemas.
 * Adegan yang bergerak besar di sebelah angka itu bukan kemewahan melainkan
 * gangguan.
 *
 * Jadi yang masuk hanya lencana: satu bentuk, satu putaran lambat, tanpa
 * pascaproses, tanpa partikel, tanpa bayangan. Ia menempati 88 piksel dan
 * tidak pernah meminta perhatian lebih dari itu.
 *
 * ── WARNANYA KUNINGAN, BUKAN UNGU ──────────────────────────────────────
 *
 * Ungu adalah identitas permukaan PUBLIK. Membawanya ke dalam aplikasi akan
 * menghapus batas yang sengaja dibangun dua permukaan ini, dan kuningan sudah
 * punya arti tetap di dalam: uang. Lencana yang menandai kesehatan keuangan
 * memang tempatnya di sana.
 */

const VERTEX = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uDasar;
  uniform vec3 uTepi;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 N = normalize(vN);
    float lam = pow(clamp(dot(N, normalize(vec3(-0.5, 0.8, 0.6))) * 0.5 + 0.5, 0.0, 1.0), 1.8);
    float f = pow(1.0 - max(dot(N, normalize(vV)), 0.0), 2.6);
    gl_FragColor = vec4(mix(uDasar * (0.35 + lam * 0.85), uTepi, f * 0.7), 1.0);
  }
`;

function Bentuk() {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uDasar: { value: new THREE.Color(TOKEN.brass) },
          uTepi: { value: new THREE.Color(TOKEN.brassSpec) },
        },
      }),
    [],
  );

  useFrame((state, delta) => {
    if (!ref.current) return;
    /* Satu putaran lambat pada satu sumbu. Dua sumbu terbaca sebagai benda
       yang jatuh, dan benda yang jatuh menarik mata setiap kali ia lewat. */
    ref.current.rotation.y += delta * 0.35;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.12;
  });

  return (
    <mesh ref={ref} material={material}>
      {/* Ikosahedron ber-detail 0: dua puluh muka datar, dan muka datar itulah
          yang menangkap cahaya sebagai bidang-bidang terpisah. Bola halus pada
          ukuran sekecil ini hanya terbaca sebagai lingkaran. */}
      <icosahedronGeometry args={[1, 0]} />
    </mesh>
  );
}

export default function Lencana() {
  return (
    <Canvas
      /* Tanpa antialias dan DPR dijepit 1,5: pada 88 piksel, selisihnya tidak
         terlihat dan biayanya nyata. */
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 3.1], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <Bentuk />
    </Canvas>
  );
}
