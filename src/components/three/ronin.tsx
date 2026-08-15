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
  uniform vec3 uKunci;
  uniform vec3 uIsi;
  uniform vec3 uArah;
  uniform float uPangkat;
  uniform float uKuat;
  uniform float uBentuk;
  uniform float uKilau;
  uniform float uIsiKuat;

  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalView);
    vec3 V = normalize(vViewDir);

    /*
      ── CAHAYA BENTUK, DAN MENGAPA IA HARUS ADA ────────────────────────

      Versi sebelumnya hanya punya fresnel: bagian dalam satu warna rata,
      tepinya menyala. Hasilnya menggambar KONTUR dan tidak pernah
      menggambar VOLUME — dan benda tanpa volume terbaca sebagai manekin
      kawat, betapa pun banyak bagian yang ditambahkan padanya. Menambah
      pelat ke sosok yang tidak punya gradien permukaan hanya menambah
      kontur.

      Yang membuat permukaan terbaca padat adalah cahaya yang MELINTASINYA:
      terang di sisi yang menghadap sumber, meredup memutari bentuknya,
      gelap di sisi seberang. Setengah-Lambert dipakai alih-alih Lambert
      penuh supaya sisi bayangannya tidak jatuh ke hitam pekat seketika —
      pada adegan sesudah ini seluruh sisi gelapnya akan lenyap ke latar
      dan siluetnya justru hilang.
    */
    float lam = dot(N, normalize(uArah)) * 0.5 + 0.5;
    /*
      Pangkat 2,6, bukan 1,7.

      Pada 1,7 setengah-Lambert menaikkan SELURUH permukaan: sisi yang
      membelakangi cahaya pun tetap berwarna, dan sosoknya berubah menjadi
      patung yang dicat rata ungu. Yang hilang bukan volumenya melainkan
      KONTRASNYA — dan tanpa sisi gelap tidak ada yang namanya cahaya
      sinematik, hanya penerangan.

      2,6 menekan tengahnya ke bawah sambil membiarkan puncaknya tetap
      terang: pelat yang menghadap cahaya menyala, sisi seberangnya jatuh ke
      hampir hitam, dan siluetnya kembali terbaca di atas latar.
    */
    lam = pow(clamp(lam, 0.0, 1.0), 3.2) * uBentuk;
    vec3 dasar = mix(uDalam, uKunci, lam);

    /*
      Sorot spekular sempit — hanya di tempat pelat benar-benar menghadap
      cahaya. Inilah yang membedakan baja dari kain pada bentuk yang sama,
      dan ia dimatikan (uKilau = 0) untuk bahan yang memang tidak berkilat.
    */
    /*
      ── CAHAYA ISI DARI ARAH BERLAWANAN ────────────────────────────────

      Satu sumber cahaya menghasilkan satu warna, dan satu warna di atas
      hampir-hitam menghasilkan sosok MONOKROM: tiap permukaan hanya berbeda
      terangnya, tidak pernah berbeda rupanya. Itu yang membuat hasilnya
      terbaca sebagai patung dicat satu kaleng.

      Cahaya isi datang dari seberang dengan warna LEBIH TERANG dan lebih
      dingin. Ia lemah — sengaja, karena isi yang sekuat kunci menghapus
      arah cahayanya dan mengembalikan kerataan yang tadi dihilangkan — tapi
      cukup untuk membuat sisi bayangan punya warnanya sendiri.

      Hasilnya dua rentang tonal pada permukaan yang sama, dan dua rentang
      itulah yang dibaca mata sebagai bahan yang berada di dalam ruang, bukan
      sebagai bentuk yang diberi warna.
    */
    float isi = pow(clamp(dot(N, -normalize(uArah)) * 0.5 + 0.5, 0.0, 1.0), 2.2) * uIsiKuat;
    dasar += uIsi * isi;

    vec3 H = normalize(normalize(uArah) + V);
    float spek = pow(max(dot(N, H), 0.0), 42.0) * uKilau;
    dasar += uKunci * spek;

    /*
      Fresnel tetap ada, DI ATAS cahaya bentuknya. Dijepit sesudah dikalikan:
      tanpa jepitan, uKuat > 1 membuat campurannya melampaui warna rim dan
      seluruh permukaan menyala rata — kebalikan dari yang membuat siluet
      terbaca.
    */
    float f = 1.0 - max(dot(N, V), 0.0);
    f = clamp(pow(clamp(f, 0.0, 1.0), uPangkat) * uKuat, 0.0, 1.0);

    gl_FragColor = vec4(mix(dasar, uTepi, f), 1.0);
  }
`;

/**
 * Arah cahaya kunci, dipakai bersama oleh SELURUH bahan.
 *
 * Satu sumber, satu arah. Kalau tiap bahan memilih arahnya sendiri, tiap
 * bagian sosoknya akan disinari dari tempat berbeda — dan mata membaca itu
 * sebagai kumpulan benda yang kebetulan berdekatan, bukan sebagai satu
 * tubuh. Dari kiri-atas-depan: arah yang paling lazim dipakai untuk memahat
 * wajah dan bahu, dan paling sedikit menimbulkan bentuk yang membingungkan.
 */
const ARAH_KUNCI = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();

/**
 * HALO — cahaya yang meluruh, bukan bidang yang diberi warna.
 *
 * Percobaan pertama memakai `MeshBasicMaterial` transparan untuk bulan dan
 * kabut. Hasilnya memperlihatkan masalah yang selalu sama: bidang datar
 * berwarna rata TIDAK PUNYA PELURUHAN, jadi yang terlihat bukan cahayanya
 * melainkan bentuk pembawanya — bulannya menjadi piring kelabu pejal, dan
 * kabutnya menjadi kotak bertepi keras melintang di bawah adegan.
 *
 * Cahaya di alam tidak pernah berakhir pada sebuah tepi. Peluruhan radial
 * dari pusat ke nol inilah yang membuat sesuatu terbaca sebagai pendar; dan
 * karena ia mencapai nol sebelum sampai ke pinggir mesh, geometri
 * pembawanya tidak akan pernah terlihat berapa pun besarnya.
 */
const HALO_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 uWarna;
  uniform float uKuat;
  uniform float uPusat;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), uPusat) * uKuat;
    gl_FragColor = vec4(uWarna, a);
  }
`;

function useHalo(warna: string, kuat: number, pusat = 2.2) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HALO_VERTEX,
        fragmentShader: HALO_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uWarna: { value: new THREE.Color(warna) },
          uKuat: { value: kuat },
          uPusat: { value: pusat },
        },
      }),
    [warna, kuat, pusat],
  );
}

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
export function useZirah(kuat = 1, pangkat = 5, duaSisi = false, bentuk = 0.5, kilau = 0, isiKuat = 0.07) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: duaSisi ? THREE.DoubleSide : THREE.FrontSide,
        uniforms: {
          uDalam: { value: new THREE.Color(MATERIAL.nearBlack) },
          uTepi: { value: new THREE.Color(TOKEN.ronin) },
          /*
             Kunci JENUH, isi PUCAT — dan urutannya penting.

             Percobaan pertama memasang `roninBright` sebagai kunci. Karena
             kunci yang mendominasi hampir seluruh permukaan, seisi sosoknya
             pudar menjadi lavender kelabu dan warna Ronin-nya hilang. Yang
             pucat harus menjadi yang LEMAH: ia bertugas memberi sisi bayangan
             rona berbeda, bukan menentukan rona sosoknya.
          */
          uKunci: { value: new THREE.Color(TOKEN.ronin) },
          uIsi: { value: new THREE.Color(TOKEN.roninBright) },
          uArah: { value: ARAH_KUNCI },
          uPangkat: { value: pangkat },
          uKuat: { value: kuat },
          uBentuk: { value: bentuk },
          uKilau: { value: kilau },
          uIsiKuat: { value: isiKuat },
        },
      }),
    [kuat, pangkat, duaSisi, bentuk, kilau, isiKuat],
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
  /**
   * Apakah penunjuk sedang berada DI ATAS panggung.
   *
   * Terpisah dari `arah`, dan itu bukan pengulangan: `arah` tetap menyimpan
   * posisi terakhir sesudah penunjuk pergi, karena sosok yang menyentak
   * kembali ke tengah begitu tetikus keluar terbaca sebagai patah, bukan
   * sebagai tenang. Yang menandai kepergian itu justru bendera ini.
   */
  hover: boolean;
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

  /*
   * EMPAT bahan, bukan satu.
   *
   * Zirah sungguhan tidak terbuat dari satu benda. Yang membuat model
   * prosedural terbaca sebagai baju perang alih-alih sebagai boneka adalah
   * perbedaan antara pelat yang menangkap cahaya dan kain yang meredamnya —
   * dan perbedaan itu dibuat oleh KETAJAMAN rim-nya, bukan oleh warnanya.
   *
   *   zirahTerang  pita paling lebar dan paling kuat: helm, sode, tsuba.
   *                Bagian yang mata cari lebih dulu.
   *   zirah        pelat biasa — dō, kusazuri, tungkai.
   *   kain         pita paling tipis dan paling lemah: hakama dan jubah.
   *                Kain memang tidak berkilat, dan pinggirnya yang nyaris
   *                padam itulah yang membuatnya terbaca sebagai kain.
   *   saya         sarung pedang: gelap, tetapi pinggirnya tegas. Kayu
   *                dipernis, bukan logam dan bukan kain.
   */
  const zirah = useZirah();
  const zirahTerang = useZirah(1.25, 4);
  const kain = useZirah(0.55, 6.5);
  const saya = useZirah(0.9, 5.5);
  /* Jubah adalah permukaan terbuka — punggungnya ikut terlihat, jadi ia harus
     dirender dua sisi. Tanpa itu ia lenyap begitu sosoknya berputar. */
  const kainJubah = useZirah(0.34, 7, true);

  /*
   * Baja bilah: rim PALING sempit di seluruh berkas ini.
   *
   * Bilah adalah lempeng tipis, dan lempeng tipis terlihat dari sudut nyaris
   * menyerempet di hampir seluruh permukaannya. Dengan bahan zirah biasa
   * seluruh bilah menyala putih dan katananya berubah menjadi tabung neon.
   * Pangkat 8 membuat hanya punggung dan sisi bilah yang menangkap cahaya;
   * mukanya tetap baja gelap, dan satu-satunya yang benar-benar memancar
   * adalah ha-nya.
   */
  const baja = useZirah(0.7, 8);

  /*
   * Lengkung bilah, dihitung sekali.
   *
   * Katana melengkung; pedang lurus adalah pedang Eropa, dan mata langsung
   * tahu bedanya walau tidak bisa menyebutkan alasannya. Lengkungnya disusun
   * dari beberapa ruas pendek yang masing-masing sedikit lebih miring —
   * murah, dan pada tebal sekecil ini tak terbedakan dari lengkung sungguhan.
   */
  const ruasBilah = useMemo(() => {
    const ruas: { x: number; y: number; a: number }[] = [];
    const panjang = 0.3;
    let x = 0;
    let y = 0;
    let a = 0;
    for (let i = 0; i < 5; i += 1) {
      ruas.push({ x: x + (Math.cos(a) * panjang) / 2, y: y + (Math.sin(a) * panjang) / 2, a });
      x += Math.cos(a) * panjang;
      y += Math.sin(a) * panjang;
      a += 0.052;
    }
    return ruas;
  }, []);

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
          {/*
              Capingnya DINAIKKAN, dan itu bukan penyesuaian selera.

              Pada tinggi semula bibirnya berada hanya 0,025 di atas celah
              mata. Kamera memandang sedikit dari atas, jadi bibir selebar 0,66
              itu menutupi persis satu-satunya bagian wajah yang ada — dan
              wajah tanpa mata yang menyala kehilangan satu-satunya titik yang
              membuat siluetnya terasa MEMANDANG BALIK.

              Dinaikkan 0,09, celahnya kembali terlihat tanpa capingnya
              kehilangan sifatnya yang rendah dan menutupi.
          */}
          <mesh position={[0, 0.16, 0]} material={zirahTerang}>
            <coneGeometry args={[0.68, 0.32, segmen]} />
          </mesh>
          {/* Bibir caping — cincin tipis di pinggir bawahnya. Kerucut polos
              berakhir pada satu garis; caping sungguhan punya TEBAL, dan
              tebal setipis ini yang menangkap rim dua kali. */}
          <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={zirahTerang}>
            <torusGeometry args={[0.66, 0.022, 6, segmen]} />
          </mesh>

          {/* ── maedate ───────────────────────────────────────────────
              Lambang bulan sabit di kening. Satu lengkung, dan siluetnya
              berhenti terbaca sebagai orang bertopi lalu mulai terbaca
              sebagai orang berperang. */}
          <mesh
            position={[0, 0.21, 0.28]}
            rotation={[0.42, 0, 0]}
            material={zirahTerang}
          >
            <torusGeometry args={[0.2, 0.028, 6, segmen, Math.PI * 1.1]} />
          </mesh>

          <mesh position={[0, -0.09, 0]} material={zirah}>
            <sphereGeometry args={[0.19, segmen, segmen]} />
          </mesh>

          {/* menpō — pelindung RAHANG, dan hanya rahang. Versi pertamanya
              dipasang setinggi mata dan menelan celahnya: wajahnya berubah
              menjadi segitiga gelap tanpa apa pun di dalamnya. Ia diturunkan
              ke bawah garis mata, tempat pelindung wajah sungguhan berada. */}
          <mesh position={[0, -0.2, 0.075]} rotation={[0.5, 0, 0]} material={zirah}>
            <boxGeometry args={[0.19, 0.13, 0.12]} />
          </mesh>

          {/* celah mata — satu-satunya bagian wajah yang ada, dan ia menyala */}
          <mesh position={[0, -0.075, 0.185]} material={bilahMat}>
            <boxGeometry args={[0.2, 0.026, 0.02]} />
          </mesh>
        </group>

        {/* ── sode: bahu BERLAPIS ────────────────────────────────────────
            Tiga pelat bertumpuk, makin ke bawah makin lebar, masing-masing
            sedikit lebih miring. Satu kotak besar terbaca sebagai bantalan;
            yang membuatnya terbaca sebagai zirah adalah GARIS di antara
            lapisannya — dan tiap garis itu satu tepi lagi yang menangkap
            cahaya. */}
        {[-1, 1].map((sisi) => (
          <group key={sisi} position={[sisi * 0.47, 1.09, 0]}>
            {[0, 1, 2].map((lapis) => (
              <mesh
                key={lapis}
                position={[sisi * lapis * 0.035, -lapis * 0.115, 0]}
                rotation={[0, 0, sisi * (0.3 + lapis * 0.06)]}
                material={zirahTerang}
              >
                <boxGeometry args={[0.4 + lapis * 0.03, 0.095, 0.44 - lapis * 0.03]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* ── dō: badan zirah ───────────────────────────────────────────
            Meruncing ke bawah: bahu lebar, pinggang sempit. Itu proporsi yang
            membaca sebagai zirah, bukan sebagai tong. Dua pita mendatar di
            atasnya adalah baris tali yang menyatukan pelatnya. */}
        {/*
            SATU bentuk, tanpa pita dan tanpa pemisahan. Dua percobaan gagal
            sebelum ini, dan keduanya gagal karena sebab yang sama.

            Yang pertama menempelkan tiga cincin terang melintang di dada
            sebagai baris tali. Hasilnya tong bergaris: cincin tipis terlihat
            dari sudut nyaris menyerempet di hampir seluruh permukaannya,
            fresnel-nya jenuh, dan ketiganya menyala penuh.

            Yang kedua mencoba akal-akalan — dō-nya dipecah menjadi tiga
            kerucut terpotong supaya garisnya datang dari CELAH yang gelap,
            bukan dari pita yang terang. Itu justru MENGGANDAKAN masalahnya:
            tiap kerucut menyumbang rim di tepi atas dan tepi bawahnya, jadi
            tiga pita berubah menjadi enam.

            Pelajarannya berlaku untuk seluruh berkas ini: pada bahan fresnel,
            SETIAP tepi geometri adalah garis terang, entah diminta atau
            tidak. Detail permukaan karena itu tidak boleh dibuat dari
            potongan. Lapisan zirahnya dibawa oleh sode dan kusazuri — bagian
            yang memang menonjol keluar dari siluet — sementara dadanya
            dibiarkan satu permukaan gelap yang tenang, dan ketenangan itulah
            yang membuat lapisan di sekitarnya terbaca.
        */}
        <mesh position={[0, 0.76, 0]} material={zirah}>
          <cylinderGeometry args={[0.42, 0.31, 0.78, segmen]} />
        </mesh>

        {/* obi — sabuk. Titik tersempit seluruh sosok. */}
        <mesh position={[0, 0.38, 0]} material={zirahTerang}>
          <cylinderGeometry args={[0.305, 0.325, 0.1, segmen]} />
        </mesh>

        {/* ── kusazuri: rok pelat yang menggantung ───────────────────────
            Ini bagian zirah samurai yang paling tidak mungkin tertukar
            dengan apa pun. Lima pelat mengelilingi pinggang, masing-masing
            miring keluar, dan celah di antaranya membentuk garis vertikal
            yang memberi pinggangnya lebar tanpa memberinya massa. */}
        {Array.from({ length: 5 }, (_, i) => {
          const sudut = (i / 5) * Math.PI * 2 + Math.PI / 5;
          return (
            <mesh
              key={sudut}
              position={[Math.sin(sudut) * 0.3, 0.19, Math.cos(sudut) * 0.3]}
              rotation={[0.2, sudut, 0]}
              material={zirah}
            >
              <boxGeometry args={[0.3, 0.34, 0.035]} />
            </mesh>
          );
        })}

        {/* ── hakama: kaki KAIN, bukan tabung ───────────────────────────
            Lebar di paha dan menyempit tajam di mata kaki. Celana samurai
            memang berbentuk begitu, dan kerucut terpotong yang meruncing
            terbalik itulah satu-satunya isyarat yang dibutuhkan. Kuda-kuda:
            sedikit terbuka, bukan berdiri tegak. */}
        {[-1, 1].map((sisi) => (
          <group key={sisi} position={[sisi * 0.2, 0.26, 0]} rotation={[0, 0, sisi * 0.11]}>
            <mesh position={[0, -0.19, 0]} material={kain}>
              <cylinderGeometry args={[0.19, 0.115, 0.42, segmen]} />
            </mesh>
            {/* pelindung tulang kering, dan sepatu yang menahan kuda-kuda */}
            <mesh position={[0, -0.46, 0.01]} material={zirah}>
              <cylinderGeometry args={[0.1, 0.085, 0.16, segmen]} />
            </mesh>
            <mesh position={[0, -0.56, 0.04]} material={zirah}>
              <boxGeometry args={[0.15, 0.06, 0.24]} />
            </mesh>
          </group>
        ))}

        {/* ── lengan kanan + katana ─────────────────────────────────────
            Seluruh ayunan terjadi di grup ini. Bilahnya panjang dan tipis;
            yang membuatnya terbaca sebagai pedang adalah rasio, bukan detail. */}
        <group ref={lengan} position={[0.44, 1.0, 0.06]}>
          {/* lengan atas dan bawah, dengan siku yang benar-benar ada */}
          <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={zirah}>
            <cylinderGeometry args={[0.088, 0.075, 0.34, segmen]} />
          </mesh>
          <mesh position={[0.34, 0, 0]} material={zirahTerang}>
            <sphereGeometry args={[0.082, segmen, segmen]} />
          </mesh>
          <mesh position={[0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={zirah}>
            <cylinderGeometry args={[0.072, 0.062, 0.34, segmen]} />
          </mesh>

          {/* tsuka — gagang terbungkus. Gelap, dan justru karena gelap ia
              memisahkan tangan dari bilah yang menyala. */}
          <mesh position={[0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={saya}>
            <cylinderGeometry args={[0.045, 0.042, 0.24, segmen]} />
          </mesh>
          {/* tsuba — pembatas tangan dan bilah */}
          <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={zirahTerang}>
            <cylinderGeometry args={[0.105, 0.105, 0.028, segmen]} />
          </mesh>

          {/*
              ── BILAH ──────────────────────────────────────────────────
              Sebelumnya ini satu batang putih penuh, dan itu salah dua kali.
              Katana bukan neon: yang menyala pada pedang adalah MATANYA,
              satu garis tipis di sepanjang sisi potong, sementara punggung
              bilahnya baja gelap. Batang penuh juga membanjiri bagian dalam
              siluet dengan cahaya, persis yang membuat sosoknya kehilangan
              volume.

              Jadi badannya bahan zirah, dan hanya ha-nya yang emisif.
          */}
          <group position={[0.96, 0, 0]}>
            {ruasBilah.map((r) => (
              <group key={r.x} position={[r.x, r.y, 0]} rotation={[0, 0, r.a]}>
                <mesh material={baja}>
                  <boxGeometry args={[0.302, 0.072, 0.026]} />
                </mesh>
                <mesh position={[0, -0.037, 0]} material={bilahMat}>
                  <boxGeometry args={[0.303, 0.013, 0.027]} />
                </mesh>
              </group>
            ))}
            {/* kissaki — ujung yang menyudut, bukan terpotong rata */}
            <mesh position={[1.53, 0.16, 0]} rotation={[0, 0, 0.26 - 0.5]} material={bilahMat}>
              <boxGeometry args={[0.12, 0.05, 0.026]} />
            </mesh>
          </group>
        </group>

        {/* lengan kiri, diam — kontras yang membuat lengan kanan terbaca
            sebagai yang bergerak */}
        <mesh position={[-0.5, 0.9, 0.02]} rotation={[0, 0, 0.3]} material={zirah}>
          <cylinderGeometry args={[0.088, 0.07, 0.36, segmen]} />
        </mesh>
        <mesh position={[-0.6, 0.63, 0.03]} rotation={[0, 0, 0.22]} material={zirah}>
          <cylinderGeometry args={[0.07, 0.06, 0.3, segmen]} />
        </mesh>

        {/* ── daishō: pedang KEDUA, tersarung di pinggang ────────────────
            Satu pedang di tangan membuat sosok bersenjata. Pedang kedua yang
            tetap tersarung di pinggul membuatnya seorang samurai — daishō
            adalah pasangannya, dan pasangan itulah tandanya. Ia juga
            memberi pinggang kiri garis diagonal yang memutus siluet vertikal
            yang tanpa itu terlalu rapi. */}
        <group position={[-0.3, 0.36, -0.1]} rotation={[0, 0, -0.42]}>
          <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={saya}>
            <cylinderGeometry args={[0.038, 0.03, 0.94, segmen]} />
          </mesh>
          <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={zirahTerang}>
            <cylinderGeometry args={[0.075, 0.075, 0.022, segmen]} />
          </mesh>
          <mesh position={[0.29, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={saya}>
            <cylinderGeometry args={[0.036, 0.033, 0.22, segmen]} />
          </mesh>
        </group>

        {/* ── jubah ─────────────────────────────────────────────────────
            Setengah kerucut terbuka di belakang punggung, melebar ke bawah.
            Fungsinya bukan hiasan: ia memberi siluetnya MASSA di bawah bahu,
            dan massa itulah yang membuat sosok setinggi ini tidak terbaca
            sebagai ranting. */}
        <mesh position={[0, 0.7, -0.14]} material={kainJubah}>
          <cylinderGeometry
            args={[0.4, 0.62, 1.26, segmen, 1, true, Math.PI * 0.72, Math.PI * 0.56]}
          />
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
 * LINGKUNGAN — lantai, kabut, dan gerbang di kejauhan.
 *
 * Sosok yang melayang di ruang hitam terbaca sebagai aset yang ditempel.
 * Yang mengubahnya menjadi adegan bukan detail lantainya, melainkan
 * kenyataan bahwa ia BERPIJAK pada sesuatu — dan pada adegan segelap ini
 * pijakan itu tidak bisa dibuat dari bayangan. Bayangan gelap di atas latar
 * yang sudah hampir hitam tidak terlihat sama sekali.
 *
 * Jadi kontaknya dibuat dari CAHAYA: cincin di lantai tepat di bawah kaki.
 * Mata membaca "berdiri di sana" dari cincin itu sama yakinnya seperti dari
 * bayangan, dan cincinnya justru terbaca pada latar gelap.
 *
 * Torii-nya jauh, besar, dan nyaris padam — ia hanya perlu memberi kedalaman
 * dan satu isyarat tempat. Begitu ia cukup terang untuk diperhatikan, ia
 * berhenti menjadi latar dan mulai bersaing dengan subjeknya.
 */
export function Lingkungan({ tier }: { tier: GraphicsTier }) {
  const kabut = useRef<THREE.Mesh>(null);
  const segmen = tier === 'full' ? 64 : 24;

  /*
   * Torii DIREDUPKAN keras, dari 0,5/3,2 menjadi 0,16/7.
   *
   * Pada nilai pertamanya ia menjulang seterang samurainya dan langsung
   * merebut pandangan — persis yang dilarang catatan di atas, ditulis oleh
   * saya sendiri sebelum melihat hasilnya. Tiang setinggi itu punya luas layar
   * berkali-kali lipat badan Ronin, jadi kecerahan yang sama sekali-kali tidak
   * berarti berat yang sama.
   */
  const jauh = useZirah(0.16, 7, false, 0.05, 0, 0.03);

  /*
   * Bulan, kabut, dan siluet pagoda — dan ketiganya lingkungan, bukan hiasan.
   *
   * Sesudah karakternya berdiri, jarak terbesar terhadap rujukan berpindah:
   * yang kurang bukan lagi sosoknya melainkan DUNIA di sekelilingnya.
   * Rujukan menempatkan samurainya di dalam tempat — bulan besar, gerbang,
   * atap-atap jauh, kabut ungu — dan tempat itu mengerjakan separuh
   * kesannya. Sosok yang sama di atas hitam polos terbaca sebagai aset yang
   * ditempel, betapa pun rapi pahatannya.
   */
  const bulanMat = useHalo(TOKEN.roninCore, 0.5, 5.5);
  const bulanPendar = useHalo(TOKEN.ronin, 0.16, 2.4);
  const halimunMat = useHalo(TOKEN.ronin, 0.13, 2.8);

  const cincinMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(TOKEN.ronin),
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame((state) => {
    /* Cincin luarnya berputar sangat lambat. Cukup untuk menghapus kesan
       gambar beku, terlalu lambat untuk menarik perhatian ke dirinya
       sendiri. */
    if (kabut.current) kabut.current.rotation.z = state.clock.elapsedTime * 0.05;
  });

  return (
    <group position={[0, -1.46, 0]}>
      {/*
          Cincin kontak — inilah lantainya, dan ia DIRAPATKAN ke kaki.

          Versi pertamanya berjari-jari 1,0 dan 1,65 pada kepekatan 0,5, dan
          hasilnya bukan lantai melainkan sebuah sasaran tembak: dua lingkaran
          terang jauh lebih lebar dari sosoknya, memusat pada ruang kosong.
          Kontak dibaca dari CAHAYA YANG BERTEMU KAKI, jadi cincinnya harus
          seukuran kuda-kudanya, bukan seukuran panggungnya.

          Yang lebar hanya disimpan satu, sangat tipis dan sangat redup,
          sebagai isyarat bahwa lantainya menerus di luar cahaya.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={cincinMat}>
        <ringGeometry args={[0.44, 0.5, segmen]} />
      </mesh>
      <mesh ref={kabut} rotation={[-Math.PI / 2, 0, 0]} material={cincinMat} scale={2.1}>
        <ringGeometry args={[0.47, 0.482, segmen]} />
      </mesh>

      {/* ── SIGIL ────────────────────────────────────────────────────────
          Dua cincin polos memberi pijakan, dan berhenti di situ. Rujukan
          menaruh lingkaran sihir bersegmen di bawah kakinya, dan segmen itu
          yang mengubah "berdiri di atas cahaya" menjadi "berdiri di dalam
          sesuatu". Yang menambah artinya bukan cincin ketiga melainkan
          RITME — potongan berulang yang mata baca sebagai tanda, bukan
          sebagai bentuk.

          Hanya di tingkat penuh: dua belas potong kecil di bawah lipatan
          ponsel bukan detail, melainkan gambar yang dibayar tanpa dilihat. */}
      {tier === 'full'
        ? Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh
                key={a}
                position={[Math.sin(a) * 0.78, 0.002, Math.cos(a) * 0.78]}
                rotation={[-Math.PI / 2, 0, -a]}
                material={cincinMat}
              >
                <planeGeometry args={[0.035, 0.16]} />
              </mesh>
            );
          })
        : null}

      {/* Halimun setinggi lutut — bidang lebar yang sangat redup. Ia tidak
          digambar untuk dilihat melainkan untuk memberi cahaya sesuatu yang
          dapat disinggahi; tanpanya, cincin lantai mengambang di kehampaan. */}
      <mesh position={[0, 0.5, -0.6]} material={halimunMat}>
        <planeGeometry args={[8, 4]} />
      </mesh>

      {/* ── BULAN ────────────────────────────────────────────────────────
          Jangkar besar di kiri-atas, persis seperti rujukan. Ia jauh, pucat,
          dan tidak pernah bergerak — dan justru karena tidak bergerak, ia
          memberi seluruh adegan skala. Tanpa satu benda yang jelas jauh,
          tidak ada yang memberi tahu mata seberapa besar samurainya. */}
      <mesh position={[-4.6, 4.6, -14]} material={bulanPendar}>
        <planeGeometry args={[11, 11]} />
      </mesh>
      <mesh position={[-4.6, 4.6, -13.9]} material={bulanMat}>
        <planeGeometry args={[4.6, 4.6]} />
      </mesh>

      {/* ── ATAP JAUH ────────────────────────────────────────────────────
          Tiga atap bersusun di kejauhan, nyaris padam. Bentuk atap Jepang —
          lebar, rendah, ujungnya terangkat — dikenali dari siluetnya saja,
          dan siluet itu yang menyebut "kota" tanpa satu pun bangunan
          digambar. */}
      {tier === 'full'
        ? [-1, 1].map((sisi) =>
            [0, 1, 2].map((tingkat) => (
              <mesh
                key={`${String(sisi)}-${String(tingkat)}`}
                position={[sisi * (3.4 + tingkat * 0.5), 0.5 + tingkat * 0.62, -10 - tingkat]}
                rotation={[0, 0, 0]}
                material={jauh}
              >
                <coneGeometry args={[1.5 - tingkat * 0.26, 0.42, 4]} />
              </mesh>
            )),
          )
        : null}

      {/* ── torii ────────────────────────────────────────────────────────
          Dua tiang dan dua palang. Bentuk itu dikenali seketika, dan tidak
          ada bentuk lain yang menyebut "Jepang" dengan geometri sesedikit
          ini. Ia hanya dipasang pada tingkat penuh: pada tingkat rendah ia
          nyaris tak terlihat, dan yang nyaris tak terlihat tidak layak
          dibayar dengan gambar tambahan. */}
      {tier === 'full' ? (
        <group position={[0, 0, -8.6]} scale={1.9}>
          {[-1, 1].map((sisi) => (
            <mesh key={sisi} position={[sisi * 1.06, 1.06, 0]} material={jauh}>
              <cylinderGeometry args={[0.075, 0.098, 2.12, 10]} />
            </mesh>
          ))}
          <mesh position={[0, 2.24, 0]} material={jauh}>
            <boxGeometry args={[2.86, 0.13, 0.2]} />
          </mesh>
          <mesh position={[0, 1.86, 0]} material={jauh}>
            <boxGeometry args={[2.4, 0.088, 0.15]} />
          </mesh>
          <mesh position={[0, 2.05, 0]} material={jauh}>
            <boxGeometry args={[0.14, 0.3, 0.14]} />
          </mesh>
        </group>
      ) : null}
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
