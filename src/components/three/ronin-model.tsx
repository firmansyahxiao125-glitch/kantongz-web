'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useZirah, type KendaliRonin } from '@/components/three/ronin';
import type { GraphicsTier } from '@/lib/gpu';
import { TOKEN } from '@/lib/palette';
import { goyangKamera, poseTebasan, stanceGulir } from '@/lib/ronin';

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

/*
 * Aset produksi, bukan aset sumber.
 *
 * Yang di-commit di `aset-sumber/` adalah GLB mentah 26,8 MB — sumber
 * kebenaran yang tidak pernah dikirim ke peramban. Berkas di bawah ini
 * hasil `scripts/aset/olah-glb.mjs`: geometrinya dipangkas dan teksturnya
 * dikecilkan, dengan angka sebelum-sesudah tercatat di PROGRESS.
 */
const BERKAS = '/ronin-kustom.glb';

/** Tinggi sasaran di ruang adegan. Aset apa pun diskalakan ke angka ini. */
const TINGGI_SASARAN = 2.4;

export interface RoninModelProps {
  tier: GraphicsTier;
  kendali: { current: KendaliRonin };
}

export function RoninModel({ tier, kendali }: RoninModelProps) {
  const akar = useRef<THREE.Group>(null);
  /*
   * Draco DAN Meshopt DIMATIKAN, dan itu memperbaiki galat runtime nyata.
   *
   * `useGLTF` memasang kedua decoder secara bawaan. Meshopt berbasis
   * WebAssembly, dan `WebAssembly.instantiate` ditolak Content Security
   * Policy halaman ini karena `unsafe-eval` tidak diizinkan — gerbang
   * `render` menangkapnya sebagai `unhandledrejection` di konsol, tepat
   * sesudah GLB-nya mendarat.
   *
   * Menambahkan `unsafe-eval` ke CSP demi decoder yang tidak dipakai adalah
   * pertukaran yang salah arah: `ronin.glb` dibangun sendiri dan TIDAK
   * dikompresi Draco maupun Meshopt, jadi kedua decoder itu murni beban —
   * satu unduhan lebih besar, satu modul WASM lebih banyak, dan satu lubang
   * di kebijakan keamanan, seluruhnya demi jalur kode yang tidak pernah
   * dilalui.
   */
  const { scene, animations } = useGLTF(BERKAS, false, false);
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
  const zirah = useZirah(1, 5, false, 0.3, 0.6);
  const zirahTerang = useZirah(1.25, 4, false, 0.47, 1.15);
  const kain = useZirah(0.55, 6.5, false, 0.12, 0);
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
    /* Dicari di sini karena rotasinya akan DIUBAH tiap bingkai, dan nilai
       turunan render tidak boleh dimutasi. Ref menyatakannya terbuka. */
    simpul.current.kepala = scene.getObjectByName('kepala') ?? null;
    simpul.current.dada = scene.getObjectByName('dada') ?? null;

    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      /*
        Material DITUKAR HANYA kalau namanya dikenal.

        Model bawaan repositori memberi nama materialnya justru supaya
        ditukar di sini — warnanya harus datang dari token, bukan dipanggang
        ke dalam biner. Aset dari luar TIDAK punya nama itu, dan materialnya
        dibiarkan utuh dengan sengaja: tekstur PBR-nya adalah seluruh alasan
        aset itu dipilih, dan menimpanya dengan shader fresnel berarti
        membuang persis mutu yang dibayar.
      */
      const nama = (o.material as THREE.Material | undefined)?.name;
      const ganti = nama ? peta[nama] : undefined;
      if (ganti) o.material = ganti;
      o.castShadow = false;
      o.receiveShadow = false;
    });

    /*
      ── PENYESUAIAN OTOMATIS ────────────────────────────────────────────

      Aset dari luar datang dengan skala dan titik asal sesukanya: yang ini
      setinggi 2,00 satuan dengan dasar di y = -1,0. Menuliskan angka
      penyesuaian sebagai tetapan berarti setiap penggantian aset menuntut
      penyuntingan kode — dan penyesuaian yang harus diingat manusia adalah
      penyesuaian yang suatu saat terlupa.

      Kotak batasnya diukur, lalu sosoknya diskalakan ke tinggi sasaran dan
      digeser sampai TELAPAK KAKINYA menyentuh nol. Aset apa pun sesudah ini
      mendarat di tempat yang benar tanpa satu angka pun disentuh.
    */
    const kotak = new THREE.Box3().setFromObject(scene);
    const ukuran = kotak.getSize(new THREE.Vector3());
    const skala = ukuran.y > 0.001 ? TINGGI_SASARAN / ukuran.y : 1;
    scene.scale.setScalar(skala);
    scene.position.set(
      -((kotak.min.x + kotak.max.x) / 2) * skala,
      -kotak.min.y * skala,
      -((kotak.min.z + kotak.max.z) / 2) * skala,
    );
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

  /*
   * Simpul kepala dan dada dicari SEKALI, bukan tiap bingkai.
   *
   * `getObjectByName` menelusuri seluruh pohon; memanggilnya enam puluh kali
   * sedetik untuk dua simpul yang tidak pernah berpindah adalah pencarian
   * yang jawabannya sudah diketahui sejak awal.
   */
  const simpul = useRef<{ kepala: THREE.Object3D | null; dada: THREE.Object3D | null }>({
    kepala: null,
    dada: null,
  });

  /* Nilai yang diredam antar-bingkai. Disimpan di ref karena ia keadaan
     animasi, bukan keadaan render. */
  const halus = useRef({ hover: 0, kepalaX: 0, kepalaY: 0, dadaY: 0 });

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

    /*
     * ── HOVER ────────────────────────────────────────────────────────
     *
     * Diredam, tidak pernah dipasang seketika. Sosok yang menyentak naik
     * begitu kursor menyentuh tepi panggung terbaca sebagai tombol; yang
     * naik dalam seperlima detik terbaca sebagai makhluk yang menyadari
     * ada orang datang. Perbedaannya seluruhnya ada di waktu tempuhnya.
     */
    const h = halus.current;
    h.hover = THREE.MathUtils.damp(h.hover, kendali.current.hover ? 1 : 0, 5, delta);

    /*
     * ── DUA JALUR GERAK, DIPILIH DARI ASETNYA ────────────────────────
     *
     * Model berangka menggerakkan dirinya lewat klip glTF. Aset dari luar
     * yang statis — tanpa skin, tanpa klip — tidak bisa, dan berpura-pura
     * ia bisa adalah kebohongan yang langsung terlihat: sosok yang membeku
     * sementara antarmuka mengatakan ia menebas.
     *
     * Jadi ketika klipnya tidak ada, mesin keadaan yang SAMA menggerakkan
     * seluruh objeknya: badan memuntir, condong, dan tersentak pada
     * tebasan. Itu bukan animasi kerangka dan tidak akan disebut begitu —
     * tetapi ia digerakkan oleh sumber kebenaran yang sama, jadi setiap
     * interaksi yang sudah terbukti tetap bekerja apa adanya.
     */
    const berangka = aksi.current?.diam !== undefined;
    const pose = berangka ? null : poseTebasan(fase, t);

    if (akar.current) {
      akar.current.position.z = -stance.mundur + guncang * 2;
      /* Terangkat sedikit saat diperhatikan — cukup untuk terasa, tidak
         cukup untuk terlihat melayang. */
      akar.current.position.y = DASAR_Y + guncang + h.hover * 0.055;
      if (pose) {
        /* Napas: naik-turun halus, dan condong pada ayunan. */
        akar.current.position.y += Math.sin(nafas.current * 0.9) * 0.018;
        akar.current.rotation.z = THREE.MathUtils.damp(
          akar.current.rotation.z,
          pose.badan * 0.5,
          7,
          delta,
        );
      }

      akar.current.rotation.y = THREE.MathUtils.damp(
        akar.current.rotation.y,
        /*
         * Penunjuk memutar SELURUH sosok, dan dibatasi keras.
         *
         * Sosok yang mengejar kursor tanpa batas terbaca sebagai rusak,
         * bukan sebagai hidup. Batasnya cukup untuk terasa memperhatikan,
         * tidak cukup untuk terlihat menoleh.
         */
        /* Jangkauan putarnya MELEBAR saat penunjuk hadir: 0,26 -> 0,36.
           Yang berubah bukan cuma seberapa jauh ia menoleh, melainkan
           seberapa jelas ia terlihat memperhatikan. */
        stance.putar +
          (pose ? pose.badan * 1.15 : 0) +
          THREE.MathUtils.clamp(arah.x * (0.26 + h.hover * 0.1), -0.36, 0.36),
        3.6 + h.hover * 1.4,
        delta,
      );
    }

    /*
     * ── PARALLAX: kepala dan dada, bukan hanya seluruh sosok ─────────
     *
     * Memutar akar saja menggerakkan orangnya seperti patung di atas meja
     * putar — seluruh tubuh berputar sebagai satu keping. Yang membuatnya
     * terbaca sebagai MEMANDANG adalah kepala yang mendahului badan dan
     * badan yang menyusul lebih lambat, persis seperti orang menoleh.
     *
     * Ditulis SESUDAH mixer memperbarui klipnya pada bingkai yang sama,
     * jadi ia menimpa — dan itu memang yang diinginkan: klip diam mengurus
     * napas, penunjuk mengurus arah pandang, dan keduanya tidak pernah
     * memperebutkan sumbu yang sama.
     */
    const targetKepalaY = THREE.MathUtils.clamp(arah.x * 0.3, -0.3, 0.3);
    const targetKepalaX = THREE.MathUtils.clamp(arah.y * 0.2, -0.2, 0.2);
    h.kepalaY = THREE.MathUtils.damp(h.kepalaY, targetKepalaY, 5.5, delta);
    h.kepalaX = THREE.MathUtils.damp(h.kepalaX, targetKepalaX, 5, delta);
    h.dadaY = THREE.MathUtils.damp(h.dadaY, targetKepalaY * 0.42, 2.6, delta);

    /*
       Aturan `react-hooks/immutability` dimatikan di sini, sadar dan sempit.

       Aturannya memodelkan nilai turunan hook sebagai tidak boleh diubah, dan
       itu benar untuk nilai React. Tetapi `scene` bukan nilai React: ia graf
       adegan three.js, dan MEMUTASINYA TIAP BINGKAI adalah seluruh alasan
       `useFrame` ada. `useAnimations` milik drei memutasi simpul yang sama
       persis, pada bingkai yang sama, lewat mixer-nya.

       Yang dimatikan hanya dua baris ini, bukan berkasnya. Kalau suatu saat
       ada cara idiomatik menggerakkan simpul GLB bernama tanpa menyentuhnya
       langsung — merender simpulnya lewat `useGraph` dan ref, misalnya —
       pengecualian ini harus dicabut, bukan diperluas.
    */
    /* eslint-disable react-hooks/immutability -- lihat catatan di atas */
    const kepala = simpul.current.kepala;
    const dadaSimpul = simpul.current.dada;
    if (kepala) {
      kepala.rotation.y = h.kepalaY;
      kepala.rotation.x += h.kepalaX * 0.5;
    }
    if (dadaSimpul) dadaSimpul.rotation.y += h.dadaY;
    /* eslint-enable react-hooks/immutability */

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

useGLTF.preload(BERKAS, false, false);
