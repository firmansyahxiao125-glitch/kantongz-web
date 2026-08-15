#!/usr/bin/env node
/**
 * Mengolah GLB mentah menjadi GLB seukuran web.
 *
 * ── MENGAPA ALAT INI ADA ───────────────────────────────────────────────
 *
 * Aset berkualitas datang dalam ukuran studio, bukan ukuran halaman muka.
 * Berkas yang memicu berkas ini ditulis berukuran 26,8 MB: 557.421 segitiga
 * dan 8,98 MB tekstur JPEG. Angka itu benar untuk render sinematik dan salah
 * untuk sesuatu yang harus tiba sebelum pengunjung kehilangan minat — ia
 * seratus kali lipat anggaran model yang berlaku di repositori ini.
 *
 * Yang TIDAK dilakukan: menaikkan anggarannya lalu menyebut masalahnya
 * selesai. Anggaran yang dinaikkan setiap kali dilanggar bukan anggaran.
 *
 * ── NOL DEPENDENSI BARU ────────────────────────────────────────────────
 *
 * `sharp` sudah ada di `node_modules` karena Next.js membawanya untuk
 * optimasi gambar, dan potongan GLB dapat dibaca-tulis langsung sebagai
 * biner. Jadi tidak ada yang perlu dipasang, dan tidak ada rantai pasok baru
 * yang perlu dipercaya demi satu langkah bangun.
 *
 * ── DUA PEMANGKASAN, DUA ALASAN BERBEDA ────────────────────────────────
 *
 * TEKSTUR dikecilkan karena resolusinya tidak pernah terlihat. Panggungnya
 * setinggi ~420 piksel di layar; tekstur 2K di atasnya membuang tiga
 * perempat pikselnya sebelum satu pun sampai ke mata.
 *
 * GEOMETRI dipangkas dengan PENGGUGUSAN VERTEKS: verteks yang jatuh di
 * dalam sel kisi yang sama disatukan, lalu segitiga yang runtuh dibuang.
 * Cara ini dipilih di atas penyederhanaan berbasis galat kuadrik karena
 * sifatnya dapat diramalkan — waktunya linear terhadap jumlah verteks, dan
 * hasilnya ditentukan satu angka yang dapat disetel.
 *
 * Kuncinya menyertakan UV, bukan posisi saja. Menggabungkan dua verteks yang
 * berdekatan tetapi berada di sisi berlawanan sebuah jahitan tekstur akan
 * menarik peta teksturnya melintasi jahitan itu — dan noda yang dihasilkan
 * jauh lebih terlihat daripada segitiga yang dihemat.
 *
 * Jalankan:
 *   node scripts/aset/olah-glb.mjs <masukan.glb> <keluaran.glb> [--kisi 0.004] [--tekstur 1024]
 */

import { readFileSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

const [masukan, keluaran] = process.argv.slice(2);
if (!masukan || !keluaran) {
  console.error('Pakai: node scripts/aset/olah-glb.mjs <masukan.glb> <keluaran.glb>');
  process.exit(2);
}

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i === -1 ? bawaan : Number(process.argv[i + 1]);
};

const KISI = arg('kisi', 0.004);
const LEBAR_TEKSTUR = arg('tekstur', 1024);
const MUTU_JPEG = arg('mutu', 82);
const KISI_UV = arg('uvkisi', 256);

/* ── membaca GLB ──────────────────────────────────────────────────────── */

const mentah = readFileSync(masukan);
if (mentah.readUInt32LE(0) !== 0x46546c67) {
  console.error('Bukan berkas GLB.');
  process.exit(1);
}

const panjangJson = mentah.readUInt32LE(12);
const json = JSON.parse(mentah.subarray(20, 20 + panjangJson).toString('utf8'));
const awalBin = 20 + panjangJson + 8;
const bin = mentah.subarray(awalBin, awalBin + mentah.readUInt32LE(20 + panjangJson));

const irisan = (indeksTampilan) => {
  const v = json.bufferViews[indeksTampilan];
  const mulai = v.byteOffset ?? 0;
  return bin.subarray(mulai, mulai + v.byteLength);
};

const bacaAtribut = (indeksAccessor, komponen) => {
  const a = json.accessors[indeksAccessor];
  const v = json.bufferViews[a.bufferView];
  const mulai = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  return new Float32Array(
    bin.buffer.slice(
      bin.byteOffset + mulai,
      bin.byteOffset + mulai + a.count * komponen * 4,
    ),
  );
};

const bacaIndeks = (indeksAccessor) => {
  const a = json.accessors[indeksAccessor];
  const v = json.bufferViews[a.bufferView];
  const mulai = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const bagian = bin.buffer.slice(
    bin.byteOffset + mulai,
    bin.byteOffset + mulai + a.count * (a.componentType === 5125 ? 4 : 2),
  );
  return a.componentType === 5125 ? new Uint32Array(bagian) : new Uint16Array(bagian);
};

/* ── memangkas geometri ───────────────────────────────────────────────── */

const prim = json.meshes[0].primitives[0];
const posisi = bacaAtribut(prim.attributes.POSITION, 3);
const normal = bacaAtribut(prim.attributes.NORMAL, 3);
const uv = bacaAtribut(prim.attributes.TEXCOORD_0, 2);
const indeks = bacaIndeks(prim.indices);

const jumlahVertekAwal = posisi.length / 3;
const jumlahSegitigaAwal = indeks.length / 3;

/*
 * Kunci gugus: posisi DAN uv.
 *
 * Kisi UV sengaja lebih halus daripada kisi posisi. Jahitan tekstur adalah
 * tempat dua verteks berimpit di ruang tetapi berjauhan di peta; kalau
 * kuncinya hanya posisi, keduanya menyatu dan tekstur tertarik melintasi
 * jahitan. Noda yang dihasilkan terlihat jauh lebih jelas daripada beberapa
 * ribu segitiga yang dihemat.
 */
const kamus = new Map();
const petaVerteks = new Uint32Array(jumlahVertekAwal);
const posBaru = [];
const norBaru = [];
const uvBaru = [];

for (let i = 0; i < jumlahVertekAwal; i += 1) {
  const kx = Math.round(posisi[i * 3] / KISI);
  const ky = Math.round(posisi[i * 3 + 1] / KISI);
  const kz = Math.round(posisi[i * 3 + 2] / KISI);
  const ku = Math.round(uv[i * 2] * KISI_UV);
  const kv = Math.round(uv[i * 2 + 1] * KISI_UV);
  const kunci = `${kx},${ky},${kz},${ku},${kv}`;

  let baru = kamus.get(kunci);
  if (baru === undefined) {
    baru = posBaru.length / 3;
    kamus.set(kunci, baru);
    posBaru.push(posisi[i * 3], posisi[i * 3 + 1], posisi[i * 3 + 2]);
    norBaru.push(normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]);
    uvBaru.push(uv[i * 2], uv[i * 2 + 1]);
  }
  petaVerteks[i] = baru;
}

const indeksBaru = [];
for (let t = 0; t < indeks.length; t += 3) {
  const a = petaVerteks[indeks[t]];
  const b = petaVerteks[indeks[t + 1]];
  const c = petaVerteks[indeks[t + 2]];
  /* Segitiga yang dua simpulnya menyatu sudah runtuh menjadi garis; ia tidak
     menggambar apa pun dan hanya menambah berat. */
  if (a !== b && b !== c && a !== c) indeksBaru.push(a, b, c);
}

const jumlahVertekAkhir = posBaru.length / 3;
const jumlahSegitigaAkhir = indeksBaru.length / 3;

/* ── mengecilkan tekstur ──────────────────────────────────────────────── */

const gambarBaru = [];
for (const im of json.images ?? []) {
  const asal = irisan(im.bufferView);
  const meta = await sharp(asal).metadata();
  const hasil = await sharp(asal)
    .resize({ width: Math.min(LEBAR_TEKSTUR, meta.width ?? LEBAR_TEKSTUR), withoutEnlargement: true })
    /*
       BASELINE, bukan progresif.

       `mozjpeg: true` menghasilkan JPEG progresif yang beberapa persen lebih
       kecil — dan `createImageBitmap` pada Chrome headless menolaknya,
       sehingga GLTFLoader gagal dengan "Couldn't load texture" dan modelnya
       tergambar polos. Beberapa persen bukan harga yang pantas untuk tekstur
       yang tidak pernah muncul.
    */
    .jpeg({ quality: MUTU_JPEG, mozjpeg: false, progressive: false })
    .toBuffer();
  gambarBaru.push({ data: hasil, asalPx: `${String(meta.width)}x${String(meta.height)}` });
}

/* ── menyusun ulang GLB ───────────────────────────────────────────────── */

const potongan = [];
let offset = 0;
const tambah = (buf) => {
  /* glTF menuntut setiap bufferView selaras 4 byte. */
  const isi = Buffer.from(buf);
  const pad = (4 - (isi.length % 4)) % 4;
  const rekam = { byteOffset: offset, byteLength: isi.length };
  potongan.push(isi, Buffer.alloc(pad));
  offset += isi.length + pad;
  return rekam;
};

const vPos = tambah(new Float32Array(posBaru).buffer);
const vNor = tambah(new Float32Array(norBaru).buffer);
const vUv = tambah(new Float32Array(uvBaru).buffer);
/* uint16 kalau verteksnya muat: separuh berat indeks, tanpa satu pun
   segitiga hilang. 65.536 adalah batas kerasnya, bukan pilihan. */
const pakaiUint16 = jumlahVertekAkhir <= 65535;
const vIdx = tambah(
  pakaiUint16 ? new Uint16Array(indeksBaru).buffer : new Uint32Array(indeksBaru).buffer,
);
const vGambar = gambarBaru.map((g) => tambah(g.data));

const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < jumlahVertekAkhir; i += 1) {
  for (let k = 0; k < 3; k += 1) {
    min[k] = Math.min(min[k], posBaru[i * 3 + k]);
    max[k] = Math.max(max[k], posBaru[i * 3 + k]);
  }
}

const binBaru = Buffer.concat(potongan);

const jsonBaru = {
  asset: { version: '2.0', generator: 'kantongz olah-glb' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'ronin' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  materials: json.materials,
  textures: json.textures,
  images: gambarBaru.map((_, i) => ({ mimeType: 'image/jpeg', bufferView: 4 + i })),
  samplers: json.samplers,
  accessors: [
    { bufferView: 0, componentType: 5126, count: jumlahVertekAkhir, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: jumlahVertekAkhir, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: jumlahVertekAkhir, type: 'VEC2' },
    { bufferView: 3, componentType: pakaiUint16 ? 5123 : 5125, count: indeksBaru.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, ...vPos, target: 34962 },
    { buffer: 0, ...vNor, target: 34962 },
    { buffer: 0, ...vUv, target: 34962 },
    { buffer: 0, ...vIdx, target: 34963 },
    ...vGambar.map((g) => ({ buffer: 0, ...g })),
  ],
  buffers: [{ byteLength: binBaru.length }],
};

const jsonBuf = Buffer.from(JSON.stringify(jsonBaru), 'utf8');
const jsonPad = Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20);
const jsonPenuh = Buffer.concat([jsonBuf, jsonPad]);

const total = 12 + 8 + jsonPenuh.length + 8 + binBaru.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);

const kepalaJson = Buffer.alloc(8);
kepalaJson.writeUInt32LE(jsonPenuh.length, 0);
kepalaJson.writeUInt32LE(0x4e4f534a, 4);

const kepalaBin = Buffer.alloc(8);
kepalaBin.writeUInt32LE(binBaru.length, 0);
kepalaBin.writeUInt32LE(0x004e4942, 4);

writeFileSync(keluaran, Buffer.concat([header, kepalaJson, jsonPenuh, kepalaBin, binBaru]));

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const rapi = (n) => n.toLocaleString('id-ID');
console.log(`  masukan       ${mb(mentah.length)}`);
console.log(`  verteks       ${rapi(jumlahVertekAwal)} -> ${rapi(jumlahVertekAkhir)}`);
console.log(`  segitiga      ${rapi(jumlahSegitigaAwal)} -> ${rapi(jumlahSegitigaAkhir)}`);
gambarBaru.forEach((g, i) => {
  console.log(`  tekstur ${String(i)}     ${g.asalPx} -> lebar ${String(LEBAR_TEKSTUR)}  (${mb(g.data.length)})`);
});
console.log(`  indeks        ${pakaiUint16 ? 'uint16' : 'uint32'}`);
console.log(`  KELUARAN      ${mb(total)}  ->  ${keluaran}`);
