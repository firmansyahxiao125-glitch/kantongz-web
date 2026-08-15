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
pasang(kepala, new THREE.SphereGeometry(KEPALA * 0.4, 14, 10), MAT.kulit, { y: 0 });

/* hachi — mangkuk helm */
pasang(
  kepala,
  new THREE.SphereGeometry(KEPALA * 0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
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

/* ── KUWAGATA: sepasang tanduk ───────────────────────────────────────────

   Penanda siluet paling kuat di seluruh rujukan. Dua lengkung panjang
   menyapu ke atas-luar dari kening; keduanya menembus garis atas kepala,
   jadi siluetnya berhenti berupa telur dan mulai berupa sesuatu yang
   bertanduk. Mata mengenali itu jauh sebelum sempat membaca zirahnya.

   Dibangun dari RUAS EKSPLISIT, bukan dari torus yang diputar.

   Percobaan pertama memakai satu torus ber-arc dengan tiga sumbu rotasi
   sekaligus, dan hasilnya lenyap — entah tertanam di dalam mangkuk helm atau
   menghadap ke belakang. Lengkung yang arahnya ditentukan tiga rotasi
   majemuk memang tidak dapat diramalkan tanpa dicoba, dan bentuk yang harus
   MENEMBUS siluet tidak boleh bergantung pada tebakan. Rantai ruas menaruh
   tiap potongnya di tempat yang dihitung, jadi arahnya pasti. */
for (const sisi of [-1, 1]) {
  let hx = sisi * KEPALA * 0.3;
  let hy = KEPALA * 0.3;
  let sudut = sisi * 0.75;
  /* Empat ruas, bukan lima, dan lebih tebal. Tanduk yang terlalu panjang dan
     kurus terbaca sebagai antena serangga; yang membuatnya terbaca sebagai
     tanduk logam adalah PANGKAL yang tebal lalu meruncing cepat. */
  const ruasTanduk = KEPALA * 0.3;
  for (let i = 0; i < 4; i += 1) {
    const jari = KEPALA * (0.105 - i * 0.019);
    pasang(kepala, new THREE.CylinderGeometry(jari * 0.75, jari, ruasTanduk * 1.06, 7), MAT.zirahTerang, {
      x: hx + Math.sin(sudut) * ruasTanduk * 0.5,
      y: hy + Math.cos(sudut) * ruasTanduk * 0.5,
      z: KEPALA * 0.06,
      rz: -sudut,
    });
    hx += Math.sin(sudut) * ruasTanduk;
    hy += Math.cos(sudut) * ruasTanduk;
    /* Melengkung MASUK ke arah tengah sambil naik — tanduk yang lurus
       terbaca sebagai antena. */
    sudut -= sisi * 0.3;
  }
}

/* maedate — bulan sabit di kening, di depan mabizashi */
pasang(kepala, new THREE.TorusGeometry(KEPALA * 0.34, KEPALA * 0.05, 5, 12, Math.PI * 1.05), MAT.zirahTerang, {
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
    pasang(L.bahu, new THREE.BoxGeometry(KEPALA * (0.5 + i * 0.05), KEPALA * 0.2, KEPALA * 0.62), MAT.zirahTerang, {
      x: sisi * KEPALA * (0.1 + i * 0.04),
      y: -i * KEPALA * 0.2,
      rz: sisi * (0.5 + i * 0.09),
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

/* ── daishō: DUA katana, satu di tiap tangan ────────────────────────────

   Rujukan memegang sepasang bilah menyilang ke bawah, dan itu bukan sekadar
   satu pedang tambahan. Dua diagonal yang berlawanan arah membentuk huruf X
   di sekeliling badan — dan X adalah bentuk yang dibaca mata jauh sebelum ia
   sempat mengenali zirahnya. Satu pedang hanya memberi satu garis, dan satu
   garis tenggelam di siluet yang sudah penuh garis vertikal.

   Bilahnya dibuat lewat fungsi supaya keduanya BENAR-BENAR identik. Menyalin
   blok geometri untuk sisi kedua adalah cara paling pasti membuat dua pedang
   yang perlahan berbeda tanpa ada yang menyadarinya. */
function buatKatana(nama, induk) {
  const k = simpul(nama, 0, -KEPALA * 0.22, KEPALA * 0.06);
  induk.add(k);

  /* tsuka — gagang terbungkus */
  pasang(k, new THREE.CylinderGeometry(KEPALA * 0.055, KEPALA * 0.05, KEPALA * 0.72, 10), MAT.baja, {
    y: KEPALA * 0.18,
  });
  /* tsuba — pembatas tangan dan bilah */
  pasang(k, new THREE.CylinderGeometry(KEPALA * 0.15, KEPALA * 0.15, KEPALA * 0.04, 14), MAT.zirahTerang, {
    y: -KEPALA * 0.2,
  });

  let x = 0;
  let y = -KEPALA * 0.24;
  let a = 0;
  const ruas = KEPALA * 0.62;
  for (let i = 0; i < 6; i += 1) {
    const cx = x + Math.sin(a) * ruas * 0.5;
    const cy = y - Math.cos(a) * ruas * 0.5;
    pasang(k, new THREE.BoxGeometry(KEPALA * 0.055, ruas * 1.02, KEPALA * 0.14), MAT.baja, {
      x: cx,
      y: cy,
      rz: a,
    });
    pasang(k, new THREE.BoxGeometry(KEPALA * 0.058, ruas * 1.02, KEPALA * 0.03), MAT.bilah, {
      x: cx + Math.cos(a) * KEPALA * 0.07,
      y: cy + Math.sin(a) * KEPALA * 0.07,
      rz: a,
    });
    x += Math.sin(a) * ruas;
    y -= Math.cos(a) * ruas;
    a += 0.055;
  }
  return k;
}

const katana = buatKatana('katana', lengan.Kanan.telapak);
const katanaKiri = buatKatana('katanaKiri', lengan.Kiri.telapak);

/* Pedang KETIGA, tersarung di punggung — miring melintasi bahu. Rujukan
   memilikinya, dan ia mengerjakan sesuatu yang tidak dikerjakan dua bilah di
   tangan: satu diagonal DI BELAKANG badan, yang memberi kedalaman pada siluet
   yang tanpa itu seluruhnya datar di satu bidang. */
const saya = simpul('saya', -KEPALA * 0.1, KEPALA * 0.2, -KEPALA * 0.34);
saya.rotation.z = -0.62;
saya.rotation.x = 0.16;
dada.add(saya);
pasang(saya, new THREE.CylinderGeometry(KEPALA * 0.07, KEPALA * 0.055, KEPALA * 2.0, 10), MAT.baja, {
  y: -KEPALA * 0.4,
  rz: Math.PI / 2,
  x: -KEPALA * 0.6,
});
pasang(saya, new THREE.CylinderGeometry(KEPALA * 0.06, KEPALA * 0.055, KEPALA * 0.55, 10), MAT.zirah, {
  x: KEPALA * 0.55,
  rz: Math.PI / 2,
});

/* ── HAORI: mantel panjang yang mengembang ──────────────────────────────

   Bagian tunggal yang paling mengubah siluet, dan sebabnya bukan keindahan.
   Sosok berzirah tanpa kain panjang berakhir di pinggang, jadi separuh bawah
   siluetnya cuma dua tungkai — dan dua tungkai tegak adalah bentuk paling
   netral yang ada. Mantel yang MENGEMBANG memberi bagian bawah itu massa
   berbentuk baji, dan baji itulah yang membuat sosoknya terbaca berdiri
   kokoh alih-alih sekadar berdiri.

   Terbuka di depan supaya zirah dada dan kedua tungkai tetap terlihat;
   mantel tertutup akan menelan seluruh pahatan di baliknya. */
pasang(
  dada,
  /* Digantung dari BAHU, bukan dari dada, dan lebih lebar di atas.

     Versi pertama mulai sempit setinggi dada lalu melebar — dan bentuk yang
     sempit di atas lalu melebar ke bawah adalah definisi ROK. Mantel jatuh
     dari bahu: lebar sejak pundak, sedikit menyempit di pinggang, lalu
     mengembang lagi. Perbedaan itu yang menentukan apakah ia terbaca sebagai
     pakaian luar atau sebagai bawahan. */
  new THREE.CylinderGeometry(
    KEPALA * 1.12,
    KEPALA * 1.62,
    KEPALA * 3.9,
    18,
    1,
    true,
    Math.PI * 0.3,
    Math.PI * 1.4,
  ),
  MAT.kain,
  { y: -KEPALA * 1.62, z: -KEPALA * 0.08 },
);

/* Dua kelepak depan — sisi mantel yang jatuh di depan bahu. Tanpa keduanya,
   mantel terbuka terbaca sebagai jubah yang hilang bagian depannya. */
for (const sisi of [-1, 1]) {
  pasang(dada, new THREE.BoxGeometry(KEPALA * 0.42, KEPALA * 2.7, KEPALA * 0.07), MAT.kain, {
    x: sisi * KEPALA * 0.66,
    y: -KEPALA * 1.1,
    z: KEPALA * 0.52,
    rz: sisi * 0.1,
    rx: -0.06,
  });
}

/* Tali dada yang menyilang — satu diagonal di atas dada yang gelap, dan
   diagonal itu yang membuat dada berhenti terbaca sebagai tong polos. */
for (const sisi of [-1, 1]) {
  pasang(dada, new THREE.BoxGeometry(KEPALA * 0.14, KEPALA * 1.5, KEPALA * 0.06), MAT.zirahTerang, {
    x: sisi * KEPALA * 0.12,
    y: -KEPALA * 0.24,
    z: KEPALA * 0.5,
    rz: sisi * 0.52,
  });
}

/* ── pose: SIMETRIS dan terbuka ──────────────────────────────────────────

   Pose sebelumnya memuntir badan dengan satu lengan terangkat. Rujukan
   melakukan kebalikannya: berdiri menghadap depan, kedua lengan terbuka,
   kedua bilah menggantung ke bawah-luar. Simetri terbaca sebagai
   KESIAPAN — sosok yang menunggu, bukan sosok yang sedang menyelesaikan
   gerakan — dan itu pose yang jauh lebih tepat untuk sesuatu yang berdiri
   diam di halaman muka sampai seseorang menekannya. */
for (const sisi of [-1, 1]) {
  const n = sisi === -1 ? 'Kiri' : 'Kanan';
  const L = lengan[n];
  L.bahu.rotation.z = -sisi * 0.3;
  L.atas.rotation.z = -sisi * 0.46;
  L.atas.rotation.x = -0.16;
  L.bawah.rotation.x = -0.1;
  L.bawah.rotation.z = -sisi * 0.3;
  L.telapak.rotation.x = 0.2;
}

/* Kedua bilah menyapu ke bawah-luar, membentuk X di sekeliling tungkai. */
/* Kedua bilah menggantung ke BAWAH-luar.

   Nilai pertama (z -0,55 / x -0,42) menumpuk di atas rotasi lengan dan
   hasilnya bilah MENDATAR — sosoknya terbaca bersayap, bukan bersenjata.
   Sudut serong yang kecil sudah cukup: yang membentuk huruf X adalah kedua
   diagonal panjangnya, bukan seberapa lebar keduanya dibuka. */
katana.rotation.z = -0.2;
katana.rotation.x = 0.12;
katanaKiri.rotation.z = 0.2;
katanaKiri.rotation.x = 0.12;

kaki.Kiri.paha.rotation.z = 0.26;
kaki.Kanan.paha.rotation.z = -0.26;
kaki.Kiri.paha.rotation.x = 0.0;
kaki.Kanan.paha.rotation.x = 0.0;
kaki.Kiri.lutut.rotation.x = 0.14;
kaki.Kanan.lutut.rotation.x = 0.14;

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
  /* Lengan KIRI ikut, dan sengaja BERLAWANAN arah.

     Dua lengan yang mengayun seirama terbaca sebagai satu gerakan yang
     digandakan. Yang membuat tebasan dua bilah terbaca sebagai dua bilah
     adalah kedua busurnya berpapasan — kiri turun ketika kanan naik, dan
     silangnya jatuh tepat di puncak potongan. */
  putar('lenganAtasKiri', [0, 0.18, 0.32, 0.55, 0.95], [
    [0, 0, 0],
    [0.62, -0.2, 0.3],
    [-0.85, 0.16, -0.44],
    [-0.4, 0.08, -0.22],
    [0, 0, 0],
  ]),
  putar('lenganBawahKiri', [0, 0.18, 0.32, 0.58, 0.95], [
    [0, 0, 0],
    [0.42, 0, 0],
    [-0.55, 0, 0],
    [-0.2, 0, 0],
    [0, 0, 0],
  ]),
  putar('bahuKiri', [0, 0.18, 0.32, 0.95], [
    [0, 0, 0],
    [0, -0.14, 0.1],
    [0, 0.18, -0.16],
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

/* ── SATUKAN GEOMETRI KEMBAR SEBELUM EKSPOR ─────────────────────────────

   Tiap `pasang()` membangun geometri barunya sendiri, jadi bentuk yang sama
   persis tersimpan berkali-kali: dua katana menyimpan empat belas bentuk
   identik masing-masing, dan setiap bagian kiri-kanan menyimpan kembarannya.
   glTF menyimpan tiap geometri sebagai buffer terpisah, jadi seluruh
   pengulangan itu benar-benar dibayar dalam kilobita.

   Menyatukannya di sini, bukan di tempat pemanggilan, adalah keputusan yang
   disengaja: menulis kode pemasangan supaya berbagi geometri akan membuat
   setiap baris pahatan bergantung pada tabel bersama, dan tabel bersama itu
   yang akan membuat perubahan kecil sulit dilakukan. Bentuknya ditulis
   sebebas mungkin; kembarannya disatukan belakangan.

   Aman karena geometri di sini tidak pernah diubah sesudah dibuat — yang
   berbeda antar-mesh adalah transform-nya, dan transform tinggal di mesh. */
function satukanGeometri(akarPohon) {
  const kamus = new Map();
  let dibuang = 0;
  akarPohon.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const kunci = `${g.type}:${JSON.stringify(g.parameters ?? {})}`;
    const ada = kamus.get(kunci);
    if (ada && ada !== g) {
      o.geometry = ada;
      g.dispose();
      dibuang += 1;
    } else if (!ada) {
      kamus.set(kunci, g);
    }
  });
  return { unik: kamus.size, dibuang };
}

const penyatuan = satukanGeometri(akar);

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
console.log(`  geometri: ${String(penyatuan.unik)} unik, ${String(penyatuan.dibuang)} kembar disatukan`);
console.log(`  klip: diam (${String(diam.duration)}s), tebas (${String(tebas.duration)}s)`);
console.log(`  tinggi ${TINGGI.toFixed(2)} satuan = ${(TINGGI / KEPALA).toFixed(1)} kepala`);
