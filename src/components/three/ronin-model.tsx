'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useZirah, type KendaliRonin } from '@/components/three/ronin';
import type { GraphicsTier } from '@/lib/gpu';
import { TOKEN } from '@/lib/palette';
import { goyangKamera, stanceGulir } from '@/lib/ronin';

/**
 * RONIN sebagai MODEL — humanoid berangka dari `public/ronin.glb`.
 *
 * ── APA YANG BERUBAH DARI VERSI PROSEDURAL, DAN MENGAPA ────────────────
 *
 * Versi sebelumnya menyusun sosoknya dari primitif langsung di dalam JSX.
 * Ia lulus setiap gerbang dan tetap salah: yang tergambar adalah SILUET
 * bercaping, bukan manusia. Menambah pelat tidak memperbaikinya — justru
 * ketika detailnya paling banyak ia paling terbaca sebagai benda.
 *
 * Yang kurang bukan detail melainkan PROPORSI dan RANGKA, dan keduanya tidak
 * dapat ditambahkan ke sekumpulan mesh yang tidak punya hierarki sendi.
 * Modelnya karena itu pindah ke GLB dengan rangka sungguhan: pinggul, perut,
 * dada, leher, kepala, dua bahu, dua lengan berlengan-bawah dan telapak, dua
 * paha, dua betis, dua telapak kaki. Animasinya klip glTF, bukan sinus yang
 * ditulis ulang tiap bingkai.
 *
 * ── SUMBERNYA TETAP DAPAT DIPERIKSA ────────────────────────────────────
 *
 * GLB-nya bukan biner pihak ketiga: ia DIBANGUN oleh
 * `scripts/aset/bangun-ronin.mjs`, yang berupa sumber terbaca dan dapat
 * di-diff. Yang berubah cuma bentuk keluarannya — sama seperti bundel
 * JavaScript adalah keluaran, bukan sumber.
 *
 * ── MATERIALNYA DITUKAR SESUDAH MEMUAT ─────────────────────────────────
 *
 * GLB-nya membawa material POLOS yang hanya diberi nama. Rupanya ditentukan
 * di sini, dari token. Kalau warnanya ikut dipanggang ke dalam GLB, palet
 * punya tempat penyimpanan kedua — dan gerbang palet tidak akan bisa
 * menegakkan apa pun terhadap berkas biner.
 */

const BERKAS = '/ronin.glb';

export interface RoninModelProps {
  tier: GraphicsTier;
  kendali: { current: KendaliRonin };
}

export function RoninModel({ tier, kendali }: RoninModelProps) {
  const akar = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(BERKAS);
  const { actions } = useAnimations(animations, akar);

  const nafas = useRef(0);
  const faseLalu = useRef<string>('diam');

  /*
   * Lima bahan, dan yang membedakannya sekarang bukan cuma ketajaman rim.
   *
   * Sesudah cahaya bentuk masuk ke shader, tiap bahan punya dua angka baru:
   * seberapa kuat cahaya kunci memahatnya (`bentuk`) dan seberapa sempit
   * sorot spekularnya (`kilau`). Itulah yang membuat baja terbaca berbeda
   * dari kain PADA BENTUK YANG SAMA — perbedaan yang tidak mungkin dibuat
   * oleh rim saja, karena rim hanya menggambar tepi dan tepi baja sama saja
   * dengan tepi kain.
   *
   *   kain   paling redup, tanpa sorot sama sekali. Kain memang menyerap.
   *   kulit  redup dan nyaris tanpa sorot — lapisan di bawah zirah.
   *   zirah  pelat gelap dengan sorot sedang.
   *   terang helm, sode, obi: dipahat paling kuat dan paling berkilat.
   *   baja   bilah dan sarung: sorot paling sempit dan paling tajam.
   */
  const zirah = useZirah(1, 5, false, 0.34, 0.6);
  const zirahTerang = useZirah(1.25, 4, false, 0.54, 1.15);
  const kain = useZirah(0.55, 6.5, false, 0.17, 0);
  const baja = useZirah(0.7, 8, false, 0.4, 1.7);
  const kulit = useZirah(0.85, 5.5, false, 0.16, 0.08);

  /* Bilah: satu-satunya yang benar-benar MEMANCAR, dan karena itu
     satu-satunya yang ditangkap bloom. */
  const bilah = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(TOKEN.roninBright),
        toneMapped: false,
      }),
    [],
  );

  const peta = useMemo(
    () => ({ zirah, zirahTerang, kain, baja, bilah, kulit }) as Record<string, THREE.Material>,
    [zirah, zirahTerang, kain, baja, bilah, kulit],
  );

  /*
   * Ditukar di `useLayoutEffect`, bukan `useEffect`.
   *
   * `useEffect` berjalan SESUDAH cat pertama, jadi akan ada satu bingkai
   * ketika samurainya tampil dengan material bawaan GLB — kelabu polos di
   * atas latar hitam. Satu bingkai cukup untuk terlihat sebagai kedipan.
   */
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const nama = (o.material as THREE.Material | undefined)?.name;
      const ganti = nama ? peta[nama] : undefined;
      if (ganti) o.material = ganti;
      o.castShadow = false;
      o.receiveShadow = false;
    });
  }, [scene, peta]);

  /*
   * Klipnya dipegang lewat REF, dan itu bukan gaya penulisan.
   *
   * `useAnimations` mengembalikan nilai turunan render, dan React Compiler
   * memperlakukannya sebagai tidak boleh diubah sesudah render — dengan
   * benar. Tetapi memainkan klip PADA HAKIKATNYA adalah mutasi: `reset()`,
   * `play()`, `fadeIn()` semuanya mengubah keadaan aksi. Ref menyatakan
   * mutasi itu secara terbuka alih-alih menyelundupkannya lewat nilai yang
   * dijanjikan murni.
   *
   * Pola yang sama sudah dipakai untuk material jejak di `ronin.tsx`.
   */
  const aksi = useRef<typeof actions | null>(null);

  /* Diam berjalan terus dan tidak pernah berhenti — sosok yang benar-benar
     membeku di antara tebasan terbaca sebagai adegan yang macet. */
  useEffect(() => {
    aksi.current = actions;
    const d = actions.diam;
    if (!d) return;
    d.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.6).play();
    return () => {
      d.fadeOut(0.3);
    };
  }, [actions]);

  useFrame((state, delta) => {
    nafas.current += delta;
    const { fase, t, gulir, arah } = kendali.current;

    /*
     * Tebasannya dipicu oleh PERPINDAHAN fase, bukan oleh fase itu sendiri.
     *
     * Memicu selama fase bernilai 'ancang' akan memanggil `reset()` enam
     * puluh kali sedetik dan klipnya tidak pernah maju melewati bingkai
     * pertama — ayunannya berubah menjadi getaran. Yang ditunggu adalah
     * tepi naiknya.
     */
    if (fase !== faseLalu.current) {
      if (faseLalu.current === 'diam' && fase !== 'diam') {
        const a = aksi.current?.tebas;
        if (a) a.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).fadeIn(0.05).play();
      }
      faseLalu.current = fase;
    }

    const stance = stanceGulir.pose(gulir);
    const guncang = goyangKamera(fase, t);

    if (akar.current) {
      akar.current.position.z = -stance.mundur + guncang * 2;
      akar.current.position.y = DASAR_Y + guncang;
      akar.current.rotation.y = THREE.MathUtils.damp(
        akar.current.rotation.y,
        /*
         * Penunjuk memutar SELURUH sosok, dan dibatasi keras.
         *
         * Sosok yang mengejar kursor tanpa batas terbaca sebagai rusak,
         * bukan sebagai hidup. Batasnya cukup untuk terasa memperhatikan,
         * tidak cukup untuk terlihat menoleh.
         */
        stance.putar + THREE.MathUtils.clamp(arah.x * 0.26, -0.26, 0.26),
        3.6,
        delta,
      );
    }

    void state;
    void tier;
  });

  return (
    <group ref={akar} position={[0, DASAR_Y, 0]} scale={SKALA}>
      <primitive object={scene} />
    </group>
  );
}

/*
 * Sosoknya berdiri di y=0 dan setinggi 2,4 satuan di dalam GLB — koordinat
 * yang benar untuk sebuah model, dan salah untuk bingkai ini. Digeser turun
 * supaya pusat massanya jatuh di tengah layar, bukan kepalanya.
 */
const DASAR_Y = -1.42;
const SKALA = 1.02;

useGLTF.preload(BERKAS);
