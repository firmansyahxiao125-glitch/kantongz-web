'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { GraphicsTier } from '@/lib/gpu';

/**
 * Inti AI.
 *
 * Sebuah bola yang permukaannya bergolak dan tepinya menyala — bentuk yang
 * membaca sebagai "sesuatu sedang berpikir" tanpa memakai satu pun wajah,
 * otak, atau robot.
 *
 * Golakan dan pendar tepi keduanya dihitung di GPU lewat shader, bukan dengan
 * memindahkan simpul di CPU setiap frame. Geometri sebanyak ini yang
 * dipindahkan dari JavaScript akan memakan lebih banyak waktu daripada seluruh
 * sisa adegan digabung, dan hasilnya sama persis.
 */

/* Fungsi derau simpleks 3D. Diletakkan di shader dan bukan dihitung di CPU
   karena setiap simpul membutuhkannya, setiap frame. */
const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vDisplace;

  ${NOISE_GLSL}

  void main() {
    /* Dua oktaf: yang lambat memberi bentuk keseluruhan, yang cepat memberi
       riak permukaan. Satu oktaf saja terbaca sebagai balon yang bernapas. */
    float slow = snoise(position * 1.1 + vec3(0.0, uTime * 0.16, 0.0));
    float fast = snoise(position * 2.9 - vec3(uTime * 0.28, 0.0, 0.0)) * 0.4;
    float displace = (slow + fast) * uAmplitude;

    vDisplace = displace;

    vec3 displaced = position + normal * displace;
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);

    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorDeep;
  uniform vec3 uColorEdge;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vDisplace;

  void main() {
    /* Fresnel: permukaan yang menghadap langsung ke kamera hampir gelap,
       yang menyerempet menyala. Itulah yang membuat bola terbaca sebagai
       benda berongga yang bercahaya dari dalam, bukan sebagai bola cat. */
    float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.4);

    /* Punggung gelombang ikut menyala — cahaya menumpuk di tempat permukaan
       terdorong paling jauh, seperti energi yang menekan dari dalam. */
    float ridge = smoothstep(0.02, 0.16, vDisplace);

    vec3 color = mix(uColorDeep, uColorEdge, clamp(fresnel + ridge * 0.55, 0.0, 1.0));
    float alpha = clamp(0.30 + fresnel * 0.85, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface AiCoreProps {
  tier: GraphicsTier;
  /** Warna inti. Diambil dari token tema oleh pemanggil, bukan ditulis di sini. */
  deep?: string;
  edge?: string;
}

export function AiCore({ tier, deep = '#0b2a4a', edge = '#00f5d4' }: AiCoreProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);

  /* Segmen bola menentukan halusnya golakan. `lite` memakai separuh, yang
     kehilangan riak halus tetapi mempertahankan bentuk keseluruhan — dan
     bentuk keseluruhan yang bergerak 60 fps mengalahkan riak yang tersendat. */
  const detail = tier === 'full' ? 96 : 48;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: 0.16 },
      uColorDeep: { value: new THREE.Color(deep) },
      uColorEdge: { value: new THREE.Color(edge) },
    }),
    [deep, edge],
  );

  useFrame((_, delta) => {
    if (material.current) material.current.uniforms.uTime.value += delta;
    /* Putaran lambat pada sumbu Y saja. Putaran di dua sumbu terbaca sebagai
       benda yang jatuh, bukan sebagai benda yang berpikir. */
    if (group.current) group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, detail, detail]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <EnergyRings tier={tier} color={edge} />
      <NeuralNodes tier={tier} color={edge} />
    </group>
  );
}

/**
 * Cincin energi yang mengorbit inti.
 *
 * Torus tipis dan bukan garis: garis dengan lebar satu piksel menghilang di
 * layar beresolusi tinggi dan menebal di layar rendah, sementara torus punya
 * tebal yang sama secara fisik di keduanya.
 */
function EnergyRings({ tier, color }: { tier: GraphicsTier; color: string }) {
  const rings = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!rings.current) return;
    const t = state.clock.elapsedTime;

    /* Setiap cincin berputar pada kecepatan berbeda yang tidak berkelipatan
       bulat, sehingga polanya tidak pernah berulang secara kasatmata. */
    rings.current.children.forEach((ring, index) => {
      ring.rotation.z = t * (0.18 + index * 0.11);
      ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.24 + index) * 0.32;
    });
  });

  const count = tier === 'full' ? 3 : 2;

  return (
    <group ref={rings}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.55 + i * 0.34, 0.006, 8, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5 - i * 0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Simpul jaringan saraf yang mengambang di sekeliling inti.
 *
 * Titik-titik pada permukaan bola, disebar dengan spiral Fibonacci supaya
 * jaraknya merata. Penyebaran acak menghasilkan gumpalan dan celah, dan
 * gumpalan terbaca sebagai kesalahan.
 */
function NeuralNodes({ tier, color }: { tier: GraphicsTier; color: string }) {
  const points = useRef<THREE.Points>(null);
  const count = tier === 'full' ? 320 : 140;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    /* Sudut emas: pembagian paling merata yang mungkin di permukaan bola. */
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      /* Jari-jari disebar supaya simpul tidak duduk di satu kulit tipis yang
         terbaca sebagai bola kedua.

         Sebaran DITURUNKAN dari indeks, bukan dari `Math.random()`. Nilai acak
         yang dipanggil saat render membuat adegan berbeda pada setiap render
         ulang — dan React 19 memang menolak memanggilnya di sana. Kelipatan
         irasional menghasilkan sebaran yang tidak pernah berulang tanpa
         mengorbankan keterulangan. */
      const shell = 1.9 + ((i * 0.6180339887) % 1) * 0.9;

      positions[i * 3] = Math.cos(theta) * radiusAtY * shell;
      positions[i * 3 + 1] = y * shell;
      positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * shell;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [count]);

  useFrame((state) => {
    if (points.current) points.current.rotation.y = -state.clock.elapsedTime * 0.05;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.022}
        color={color}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
