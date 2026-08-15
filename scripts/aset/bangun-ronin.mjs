#!/usr/bin/env node
/**
 * Membangun `public/ronin.glb` — samurai HUMANOID berangka, dengan animasi.
 *
 * ── MENGAPA DIBANGUN, BUKAN DIUNDUH ────────────────────────────────────
 *
 * Ini bukan pilihan estetika melainkan satu-satunya jalan yang memenuhi
 * seluruh batasan yang berlaku di proyek ini sekaligus:
 *
 *   · tidak ada anggaran untuk aset berbayar
 *   · biner pihak ketiga menuntut verifikasi lisensi DAN izin unduh; berkas
 *     biner yang tidak dapat diperiksa dalam diff juga melanggar nilai yang
 *     sudah dinyatakan berkas adegan ini sejak awal
 *   · targetnya menuntut GLB/GLTF sungguhan dengan animasi kerangka, bukan
 *     primitif yang diperkaya terus-menerus
 *
 * Yang di-commit adalah SUMBER berkas ini — dapat dibaca, dapat di-diff,
 * dapat disetel satu angka pada satu waktu. GLB-nya hasil bangun, sama
 * seperti bundel JavaScript.
 *
 * ── APA YANG MEMBUATNYA TERBACA SEBAGAI MANUSIA ────────────────────────
 *
 * Bukan jumlah poligon dan bukan kekayaan detail — versi prosedural
 * sebelumnya justru gagal ketika detailnya PALING banyak. Yang menentukan
 * adalah PROPORSI dan RANGKA.
 *
 * Sosok ini setinggi 2,4 satuan dengan kepala 0,32: tujuh setengah kepala,
 * proporsi manusia dewasa. Rentangan tangannya kira-kira setinggi badannya.
 * Ada leher yang benar-benar memisahkan kepala dari dada, siku dan lutut
 * yang menekuk pada tempatnya, dan telapak yang menggenggam gagang.
 *
 * Rangkanya HIRARKI SIMPUL, bukan kulit berbobot — dan itu justru benar
 * untuk zirah: pelat baja memang tidak melar. Yang melar hanyalah kain, dan
 * kain di sini pendek. glTF menganimasikan transform simpul dengan sah, jadi
 * hasilnya tetap GLB berangka yang dapat diberi klip.
 *
 * ── MATERIAL SENGAJA POLOS ─────────────────────────────────────────────
 *
 * Materialnya diberi NAMA, bukan rupa. Aplikasi menukarnya sesudah memuat
 * dengan shader fresnel yang warnanya diambil dari token — sehingga warna
 * tetap hanya punya satu sumber kebenaran dan gerbang palet tetap dapat
 * menegakkannya. GLB yang membawa warnanya sendiri akan menjadi tempat
 * kedua warna disimpan, dan tempat kedua selalu menyimpang.
 *
 * Jalankan:
 *   node scripts/aset/bangun-ronin.mjs
 */

import './node-gltf.mjs';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ── proporsi ─────────────────────────────────────────────────────────────
   Seluruh angka di bawah diturunkan dari SATU: tinggi kepala. Mengubahnya
   menggeser seisi sosok tanpa merusak perbandingannya, dan perbandingan
   itulah yang dibaca mata sebagai "manusia". */
const KEPALA = 0.32;
const TINGGI = KEPALA * 7.5;

const Y = {
  ubun: TINGGI,
  dagu: TINGGI - KEPALA,
  bahu: TINGGI - KEPALA * 1.38,
  dada: TINGGI - KEPALA * 2.1,
  pinggang: TINGGI - KEPALA * 3.05,
  pinggul: TINGGI - KEPALA * 3.6,
  lutut: TINGGI - KEPALA * 5.45,
  mataKaki: TINGGI - KEPALA * 7.2,
};

const LEBAR_BAHU = KEPALA * 0.82;
/*
   Pinggul DILEBARKAN 0,34 -> 0,54, dan itu memperbaiki regresi nyata.

   Ketika hakama dilebarkan supaya sosoknya tidak lagi kurus, jari-jarinya
   (0,44) melampaui setengah jarak antar-pinggul (0,17) — jadi kedua celana
   saling menembus dan melebur menjadi SATU kerucut. Yang tergambar bukan
   samurai berkuda-kuda melainkan sosok bergaun, dan kedua kakinya hilang.

   Lebar tungkai dan jarak pinggul harus disetel bersama; menaikkan salah
   satunya sendirian selalu menghasilkan salah satu dari dua kesalahan itu.
*/
const LEBAR_PINGGUL = KEPALA * 0.54;

/* ── material: nama saja, rupa ditentukan aplikasi ────────────────────── */
const bahan = (nama) => {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
  m.name = nama;
  return m;
};

const MAT = {
  zirah: bahan('zirah'),
  zirahTerang: bahan('zirahTerang'),
  kain: bahan('kain'),
  baja: bahan('baja'),
  bilah: bahan('bilah'),
  kulit: bahan('kulit'),
};

/* ── perkakas rangka ──────────────────────────────────────────────────── */

function simpul(nama, x = 0, y = 0, z = 0) {
  const o = new THREE.Object3D();
  o.name = nama;
  o.position.set(x, y, z);
  return o;
}

function pasang(induk, geometri, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geometri, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  induk.add(m);
  return m;
}

/**
 * Anggota badan sebagai KAPSUL, bukan tabung.
 *
 * Perbedaannya kecil di kode dan besar di mata: tabung berakhir pada
 * lingkaran datar, dan lingkaran datar di ujung lengan terbaca sebagai
 * potongan. Kapsul berakhir membulat — seperti otot dan sendi sungguhan —
 * dan sambungan antar-ruasnya berhenti terlihat sebagai sambungan.
 */
const kapsul = (jari, panjang, seg = 12) =>
  new THREE.CapsuleGeometry(jari, Math.max(0.001, panjang - jari * 2), 4, seg);

/* ── rangka ───────────────────────────────────────────────────────────── */

const akar = simpul('ronin');

const pinggul = simpul('pinggul', 0, Y.pinggul, 0);
akar.add(pinggul);

const perut = simpul('perut', 0, Y.pinggang - Y.pinggul, 0);
pinggul.add(perut);

const dada = simpul('dada', 0, Y.dada - Y.pinggang, 0);
perut.add(dada);

const leher = simpul('leher', 0, Y.bahu - Y.dada + KEPALA * 0.16, 0);
dada.add(leher);

const kepala = simpul('kepala', 0, KEPALA * 0.52, 0);
leher.add(kepala);

/* lengan: bahu -> siku -> pergelangan -> telapak */
const lengan = {};
for (const sisi of [-1, 1]) {
  const n = sisi === -1 ? 'Kiri' : 'Kanan';

  const bahu = simpul(`bahu${n}`, sisi * LEBAR_BAHU, Y.bahu - Y.dada, 0);
  dada.add(bahu);

  const atas = simpul(`lenganAtas${n}`, sisi * KEPALA * 0.12, 0, 0);
  bahu.add(atas);

  const siku = simpul(`siku${n}`, 0, -(Y.bahu - Y.dada) * 0 - KEPALA * 1.44, 0);
  atas.add(siku);

  const bawah = simpul(`lenganBawah${n}`, 0, 0, 0);
  siku.add(bawah);

  const pergelangan = simpul(`pergelangan${n}`, 0, -KEPALA * 1.3, 0);
  bawah.add(pergelangan);

  const telapak = simpul(`telapak${n}`, 0, -KEPALA * 0.2, 0);
  pergelangan.add(telapak);

  lengan[n] = { bahu, atas, siku, bawah, pergelangan, telapak };
}

/* kaki: pinggul -> lutut -> mata kaki -> telapak kaki */
const kaki = {};
for (const sisi of [-1, 1]) {
  const n = sisi === -1 ? 'Kiri' : 'Kanan';

  const paha = simpul(`paha${n}`, sisi * LEBAR_PINGGUL, 0, 0);
  pinggul.add(paha);

  const lutut = simpul(`lutut${n}`, 0, Y.lutut - Y.pinggul, 0);
  paha.add(lutut);

  const betis = simpul(`betis${n}`, 0, 0, 0);
  lutut.add(betis);

  const mataKaki = simpul(`mataKaki${n}`, 0, Y.mataKaki - Y.lutut, 0);
  betis.add(mataKaki);

  kaki[n] = { paha, lutut, betis, mataKaki };
}

/* ── daging dan zirah ─────────────────────────────────────────────────── */

/* ── KEPALA ──────────────────────────────────────────────────────────────

   Bagian ini ditulis ulang karena review visual menyebut helmnya terbaca
   sebagai TUDUNG, bukan kabuto — dan sebabnya bukan mangkuknya kurang halus.

   Yang memisahkan helm dari rambut adalah TEPI KERAS YANG MENJOROK di atas
   mata. Mangkuk bulat tanpa tepi itu selalu terbaca sebagai kepala berambut,
   betapa pun banyak lapisan yang ditumpuk di belakangnya. Versi sebelumnya
   justru menumpuk lapisan tengkuk yang melebar, dan lapisan itulah yang
   dibaca mata sebagai rambut terurai.

   Jadi tiga bentuk ditambahkan, dan ketiganya penanda kabuto yang tidak
   dimiliki bentuk kepala lain mana pun:

     mabizashi   tepi depan yang menjorok — penentu utamanya
     fukigaeshi  dua sayap terlipat di sisi depan
     tehen       puncak logam kecil di ubun-ubun

   dan lapisan tengkuknya dirapatkan serta dibatasi HANYA ke belakang. */

/* tengkorak */
pasang(kepala, new THREE.SphereGeometry(KEPALA * 0.4, 16, 14), MAT.kulit, { y: 0 });

/* hachi — mangkuk helm */
pasang(
  kepala,
  new THREE.SphereGeometry(KEPALA * 0.52, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
  MAT.zirahTerang,
  { y: KEPALA * 0.08 },
);

/* tehen — puncak logam di ubun-ubun */
pasang(kepala, new THREE.CylinderGeometry(KEPALA * 0.07, KEPALA * 0.1, KEPALA * 0.08, 10), MAT.zirahTerang, {
  y: KEPALA * 0.52,
});

/* mabizashi — TEPI DEPAN. Inilah yang menjadikannya helm. */
pasang(kepala, new THREE.BoxGeometry(KEPALA * 0.9, KEPALA * 0.08, KEPALA * 0.36), MAT.zirahTerang, {
  y: KEPALA * 0.19,
  z: KEPALA * 0.29,
  rx: -0.32,
});

/* fukigaeshi — dua sayap terlipat di sisi depan helm */
for (const sisi of [-1, 1]) {
  pasang(kepala, new THREE.BoxGeometry(KEPALA * 0.07, KEPALA * 0.36, KEPALA * 0.32), MAT.zirahTerang, {
    x: sisi * KEPALA * 0.46,
    y: KEPALA * 0.14,
    z: KEPALA * 0.14,
    rz: sisi * 0.44,
    ry: -sisi * 0.5,
  });
}

/* shikoro — tengkuk, RAPAT dan hanya di belakang. Versi sebelumnya melebar
   ke samping dan terbaca sebagai rambut jatuh. */
for (let i = 0; i < 3; i += 1) {
  pasang(
    kepala,
    new THREE.CylinderGeometry(
      KEPALA * (0.5 + i * 0.055),
      KEPALA * (0.55 + i * 0.055),
      KEPALA * 0.1,
      16,
      1,
      true,
      Math.PI * 0.6,
      Math.PI * 0.8,
    ),
    MAT.zirah,
    { y: KEPALA * (0.02 - i * 0.09), z: -KEPALA * 0.05 },
  );
}

/* menpō — topeng wajah: pipi bersudut lalu dagu meruncing. Bentuk runcing di
   bawah garis mata itulah yang membuat wajahnya terbaca tertutup topeng
   logam, bukan sekadar gelap. */
pasang(kepala, new THREE.BoxGeometry(KEPALA * 0.46, KEPALA * 0.28, KEPALA * 0.32), MAT.zirah, {
  y: -KEPALA * 0.22,
  z: KEPALA * 0.11,
  rx: 0.3,
});
pasang(kepala, new THREE.ConeGeometry(KEPALA * 0.21, KEPALA * 0.24, 4), MAT.zirah, {
  y: -KEPALA * 0.42,
  z: KEPALA * 0.09,
  rx: Math.PI,
  ry: Math.PI / 4,
});

/* DUA celah mata yang menyala, duduk di bayangan bawah mabizashi. Dua celah
   terpisah terbaca sebagai mata; satu garis melintang terbaca sebagai visor
   robot. */
for (const sisi of [-1, 1]) {
  pasang(kepala, new THREE.BoxGeometry(KEPALA * 0.18, KEPALA * 0.055, KEPALA * 0.04), MAT.bilah, {
    x: sisi * KEPALA * 0.15,
    y: KEPALA * 0.01,
    z: KEPALA * 0.33,
    rz: sisi * 0.12,
  });
}

/* maedate — bulan sabit di kening, di depan mabizashi */
pasang(kepala, new THREE.TorusGeometry(KEPALA * 0.34, KEPALA * 0.05, 6, 16, Math.PI * 1.05), MAT.zirahTerang, {
  y: KEPALA * 0.34,
  z: KEPALA * 0.26,
  rx: 0.52,
});

/* leher benar-benar ada — inilah yang memisahkan kepala dari badan, dan
   tanpanya sosok apa pun terbaca sebagai boneka */
pasang(leher, kapsul(KEPALA * 0.17, KEPALA * 0.42, 10), MAT.kulit, { y: KEPALA * 0.1 });

/* dada: dō yang meruncing ke pinggang */
pasang(dada, kapsul(KEPALA * 0.66, KEPALA * 1.08, 16), MAT.zirah, { y: -KEPALA * 0.16 });
pasang(dada, new THREE.CylinderGeometry(KEPALA * 0.78, KEPALA * 0.56, KEPALA * 1.0, 18), MAT.zirah, {
  y: -KEPALA * 0.24,
});

/* perut lebih sempit — pinggang yang terlihat adalah setengah dari yang
   membuat bahu terbaca lebar */
pasang(perut, new THREE.CylinderGeometry(KEPALA * 0.54, KEPALA * 0.46, KEPALA * 0.62, 16), MAT.zirah, {
  y: KEPALA * 0.18,
});

/* obi — sabuk di titik tersempit */
pasang(pinggul, new THREE.CylinderGeometry(KEPALA * 0.48, KEPALA * 0.5, KEPALA * 0.24, 16), MAT.zirahTerang, {
  y: KEPALA * 0.1,
});

/* kusazuri — rok pelat yang menggantung dari pinggang */
for (let i = 0; i < 6; i += 1) {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
  pasang(pinggul, new THREE.BoxGeometry(KEPALA * 0.52, KEPALA * 0.88, KEPALA * 0.09), MAT.zirah, {
    x: Math.sin(a) * KEPALA * 0.44,
    z: Math.cos(a) * KEPALA * 0.44,
    y: -KEPALA * 0.42,
    ry: a,
    rx: 0.22,
  });
}

/* lengan */
for (const sisi of [-1, 1]) {
  const n = sisi === -1 ? 'Kiri' : 'Kanan';
  const L = lengan[n];

  /* sode — pelat bahu berlapis, menggantung DI LUAR sendi supaya ia ikut
     berayun tanpa menembus lengan */
  for (let i = 0; i < 3; i += 1) {
    pasang(L.bahu, new THREE.BoxGeometry(KEPALA * (0.86 + i * 0.07), KEPALA * 0.24, KEPALA * 0.86), MAT.zirahTerang, {
      x: sisi * KEPALA * (0.2 + i * 0.05),
      y: -i * KEPALA * 0.2,
      rz: sisi * (0.24 + i * 0.05),
    });
  }

  pasang(L.atas, kapsul(KEPALA * 0.2, KEPALA * 1.36, 12), MAT.kulit, { y: -KEPALA * 0.7 });
  pasang(L.bawah, kapsul(KEPALA * 0.17, KEPALA * 1.24, 12), MAT.kulit, { y: -KEPALA * 0.64 });

  /* kote — pelindung lengan bawah */
  pasang(L.bawah, new THREE.CylinderGeometry(KEPALA * 0.22, KEPALA * 0.19, KEPALA * 0.9, 12), MAT.zirah, {
    y: -KEPALA * 0.68,
  });

  /* telapak: genggaman, bukan bola */
  pasang(L.telapak, new THREE.BoxGeometry(KEPALA * 0.2, KEPALA * 0.26, KEPALA * 0.17), MAT.kulit, {
    y: -KEPALA * 0.08,
  });
}

/* kaki */
for (const sisi of [-1, 1]) {
  const n = sisi === -1 ? 'Kiri' : 'Kanan';
  const K = kaki[n];

  /* hakama: paha LEBAR, menyempit tajam di betis. Bentuk itu sendiri yang
     menyebut "celana samurai" tanpa perlu detail lain. */
  pasang(K.paha, new THREE.CylinderGeometry(KEPALA * 0.36, KEPALA * 0.26, KEPALA * 1.72, 14), MAT.kain, {
    y: -KEPALA * 0.86,
  });
  pasang(K.paha, kapsul(KEPALA * 0.21, KEPALA * 1.7, 12), MAT.kulit, { y: -KEPALA * 0.86 });

  pasang(K.betis, kapsul(KEPALA * 0.19, KEPALA * 1.6, 12), MAT.kulit, { y: -KEPALA * 0.82 });

  /* suneate — pelindung tulang kering */
  pasang(K.betis, new THREE.CylinderGeometry(KEPALA * 0.23, KEPALA * 0.19, KEPALA * 1.2, 12), MAT.zirah, {
    y: -KEPALA * 0.72,
    z: KEPALA * 0.02,
  });

  /* telapak kaki — memberi sosoknya pijakan, dan pijakan memberi berat */
  pasang(K.mataKaki, new THREE.BoxGeometry(KEPALA * 0.32, KEPALA * 0.16, KEPALA * 0.66), MAT.zirah, {
    y: -KEPALA * 0.06,
    z: KEPALA * 0.14,
  });
}

/* ── daishō ───────────────────────────────────────────────────────────── */

/**
 * Katana di tangan kanan.
 *
 * Bilahnya melengkung, disusun dari ruas pendek yang makin miring. Badannya
 * baja gelap dan hanya sisi potongnya yang memancar: katana bukan neon, dan
 * batang yang menyala seluruhnya juga membanjiri bagian dalam siluet dengan
 * cahaya — pelajaran yang sudah dibayar sekali di versi prosedural.
 */
const katana = simpul('katana', 0, -KEPALA * 0.22, KEPALA * 0.06);
lengan.Kanan.telapak.add(katana);

pasang(katana, new THREE.CylinderGeometry(KEPALA * 0.055, KEPALA * 0.05, KEPALA * 0.72, 10), MAT.baja, {
  y: KEPALA * 0.18,
});
pasang(katana, new THREE.CylinderGeometry(KEPALA * 0.15, KEPALA * 0.15, KEPALA * 0.04, 14), MAT.zirahTerang, {
  y: -KEPALA * 0.2,
});

{
  let x = 0;
  let y = -KEPALA * 0.24;
  let a = 0;
  const ruas = KEPALA * 0.62;
  for (let i = 0; i < 6; i += 1) {
    const cx = x + Math.sin(a) * ruas * 0.5;
    const cy = y - Math.cos(a) * ruas * 0.5;
    pasang(katana, new THREE.BoxGeometry(KEPALA * 0.055, ruas * 1.02, KEPALA * 0.14), MAT.baja, {
      x: cx,
      y: cy,
      rz: a,
    });
    pasang(katana, new THREE.BoxGeometry(KEPALA * 0.058, ruas * 1.02, KEPALA * 0.03), MAT.bilah, {
      x: cx + Math.cos(a) * KEPALA * 0.07,
      y: cy + Math.sin(a) * KEPALA * 0.07,
      rz: a,
    });
    x += Math.sin(a) * ruas;
    y -= Math.cos(a) * ruas;
    a += 0.055;
  }
}

/**
 * Wakizashi — tetap tersarung di pinggang kiri.
 *
 * Satu pedang membuat sosok bersenjata; PASANGANNYA yang membuatnya samurai.
 * Ia juga memutus siluet pinggang dengan satu garis diagonal, dan siluet
 * tanpa garis itu terlalu rapi untuk terbaca sebagai orang yang bergerak.
 */
const saya = simpul('saya', -KEPALA * 0.42, -KEPALA * 0.06, -KEPALA * 0.12);
saya.rotation.z = -0.42;
saya.rotation.x = -0.18;
pinggul.add(saya);
pasang(saya, new THREE.CylinderGeometry(KEPALA * 0.07, KEPALA * 0.055, KEPALA * 1.7, 10), MAT.baja, {
  y: -KEPALA * 0.5,
  rz: Math.PI / 2,
  x: -KEPALA * 0.5,
});
pasang(saya, new THREE.CylinderGeometry(KEPALA * 0.06, KEPALA * 0.055, KEPALA * 0.5, 10), MAT.zirah, {
  x: KEPALA * 0.42,
  rz: Math.PI / 2,
});

/* ── pose istirahat ───────────────────────────────────────────────────────
   Sosok berdiri tegak sempurna terbaca sebagai manekin. Kuda-kudanya sedikit
   terbuka, lutut sedikit menekuk, dan lengan kanan terangkat memegang
   katana — pose itu sendiri sudah bercerita sebelum satu bingkai animasi
   pun berjalan. */
/*
   Lengan kanan MENJAUH dari badan, bukan menyilang di depannya.

   Percobaan pertama menekuk bahu ke dalam, dan bilahnya melintas di depan
   perut lalu keluar di sisi KIRI. Yang terbaca bukan orang memegang pedang
   melainkan orang yang tertusuk pedangnya sendiri. Pedang harus punya ruang
   kosong di sekelilingnya supaya terbaca sebagai pedang.
*/
lengan.Kanan.bahu.rotation.z = -0.4;
lengan.Kanan.atas.rotation.x = -0.22;
lengan.Kanan.atas.rotation.z = -0.5;
lengan.Kanan.bawah.rotation.x = -0.34;
lengan.Kanan.bawah.rotation.z = -0.42;
lengan.Kanan.telapak.rotation.x = 0.16;

/* Bilahnya diangkat: ujungnya menyapu ke atas-kanan alih-alih menggantung
   ke bawah. Diagonal panjang di ruang kosong itulah yang membuat katana
   terbaca dalam sekejap. */
katana.rotation.z = -0.62;
katana.rotation.x = -2.72;

lengan.Kiri.bahu.rotation.z = 0.22;
lengan.Kiri.atas.rotation.x = -0.2;
lengan.Kiri.atas.rotation.z = 0.3;
lengan.Kiri.bawah.rotation.x = -0.5;

kaki.Kiri.paha.rotation.z = 0.3;
kaki.Kanan.paha.rotation.z = -0.3;
kaki.Kiri.paha.rotation.x = -0.08;
kaki.Kanan.paha.rotation.x = 0.06;
kaki.Kiri.lutut.rotation.x = 0.3;
kaki.Kanan.lutut.rotation.x = 0.26;

/* ── animasi ──────────────────────────────────────────────────────────── */

const dasar = new Map();
akar.traverse((o) => {
  if (o.name) dasar.set(o.name, o.rotation.clone());
});

/** Trek putaran dari sudut Euler, relatif terhadap pose istirahat simpulnya. */
function putar(nama, waktu, delta) {
  const d = dasar.get(nama) ?? new THREE.Euler();
  const nilai = [];
  for (const [dx, dy, dz] of delta) {
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(d.x + dx, d.y + dy, d.z + dz),
    );
    nilai.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${nama}.quaternion`, waktu, nilai);
}

const geser = (nama, waktu, nilai) =>
  new THREE.VectorKeyframeTrack(`${nama}.position`, waktu, nilai.flat());

/**
 * DIAM — napas, bukan pose beku.
 *
 * Empat detik, dan sengaja tidak simetris: dada naik lebih cepat daripada
 * turunnya, kepala bergerak pada irama yang berbeda dari badannya. Gerak
 * yang seluruh bagiannya berdenyut seirama terbaca sebagai mesin; yang
 * fasenya sedikit berbeda terbaca sebagai makhluk.
 */
const diam = new THREE.AnimationClip('diam', 4, [
  geser('perut', [0, 1.4, 2.6, 4], [
    [0, Y.pinggang - Y.pinggul, 0],
    [0, Y.pinggang - Y.pinggul + KEPALA * 0.035, 0],
    [0, Y.pinggang - Y.pinggul + KEPALA * 0.012, 0],
    [0, Y.pinggang - Y.pinggul, 0],
  ]),
  putar('dada', [0, 1.4, 2.6, 4], [
    [0, 0, 0],
    [-0.035, 0.022, 0],
    [-0.012, -0.018, 0],
    [0, 0, 0],
  ]),
  putar('kepala', [0, 1.1, 2.3, 3.2, 4], [
    [0, 0, 0],
    [0.026, 0.05, 0],
    [-0.02, -0.042, 0.012],
    [0.014, 0.02, 0],
    [0, 0, 0],
  ]),
  putar('lenganAtasKanan', [0, 2, 4], [
    [0, 0, 0],
    [0.05, 0, -0.03],
    [0, 0, 0],
  ]),
  putar('lenganAtasKiri', [0, 2.4, 4], [
    [0, 0, 0],
    [-0.045, 0, 0.028],
    [0, 0, 0],
  ]),
  putar('pinggul', [0, 2, 4], [
    [0, 0, 0],
    [0, 0.03, 0.014],
    [0, 0, 0],
  ]),
]);

/**
 * TEBAS — ancang, potong, pulih.
 *
 * Yang membuat tebasan terbaca bukan kecepatan ayunnya melainkan JEDA
 * sebelum ayun. Ancang-ancang menahan 0,18 detik, potongannya jatuh dalam
 * 0,12, lalu badannya butuh setengah detik penuh untuk kembali. Perbandingan
 * itulah yang membedakan tebasan dari lengan yang sekadar berputar.
 */
const tebas = new THREE.AnimationClip('tebas', 0.95, [
  putar('lenganAtasKanan', [0, 0.18, 0.3, 0.52, 0.95], [
    [0, 0, 0],
    [-0.75, 0.28, -0.35],
    [0.95, -0.2, 0.5],
    [0.5, -0.1, 0.28],
    [0, 0, 0],
  ]),
  putar('lenganBawahKanan', [0, 0.18, 0.3, 0.55, 0.95], [
    [0, 0, 0],
    [-0.5, 0, 0],
    [0.62, 0, 0],
    [0.24, 0, 0],
    [0, 0, 0],
  ]),
  putar('bahuKanan', [0, 0.18, 0.3, 0.95], [
    [0, 0, 0],
    [0, 0.16, -0.12],
    [0, -0.2, 0.18],
    [0, 0, 0],
  ]),
  putar('dada', [0, 0.18, 0.3, 0.6, 0.95], [
    [0, 0, 0],
    [0, 0.3, 0],
    [0, -0.34, 0],
    [0, -0.12, 0],
    [0, 0, 0],
  ]),
  putar('pinggul', [0, 0.18, 0.3, 0.6, 0.95], [
    [0, 0, 0],
    [0, 0.16, 0],
    [0, -0.2, 0],
    [0, -0.06, 0],
    [0, 0, 0],
  ]),
  putar('kepala', [0, 0.18, 0.32, 0.95], [
    [0, 0, 0],
    [0.06, 0.12, 0],
    [0.1, -0.16, 0],
    [0, 0, 0],
  ]),
  putar('lututKanan', [0, 0.3, 0.6, 0.95], [
    [0, 0, 0],
    [0.2, 0, 0],
    [0.08, 0, 0],
    [0, 0, 0],
  ]),
]);

/* ── ekspor ───────────────────────────────────────────────────────────── */

const adegan = new THREE.Scene();
adegan.add(akar);

const glb = await new GLTFExporter().parseAsync(adegan, {
  binary: true,
  animations: [diam, tebas],
  onlyVisible: false,
});

const tujuan = join(AKAR, 'public', 'ronin.glb');
mkdirSync(dirname(tujuan), { recursive: true });
writeFileSync(tujuan, Buffer.from(glb));

let simpulJumlah = 0;
let segitiga = 0;
akar.traverse((o) => {
  simpulJumlah += 1;
  if (o.isMesh) segitiga += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
});

console.log(`  public/ronin.glb  ${(glb.byteLength / 1024).toFixed(1)} KiB`);
console.log(`  simpul ${String(simpulJumlah)} · segitiga ${String(Math.round(segitiga))}`);
console.log(`  klip: diam (${String(diam.duration)}s), tebas (${String(tebas.duration)}s)`);
console.log(`  tinggi ${TINGGI.toFixed(2)} satuan = ${(TINGGI / KEPALA).toFixed(1)} kepala`);
