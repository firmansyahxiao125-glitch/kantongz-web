#!/usr/bin/env node
/**
 * Memeriksa isi sebuah GLB SEBELUM ia dipakai.
 *
 * ── MENGAPA POTONGAN JSON DIBACA LANGSUNG ──────────────────────────────
 *
 * Percobaan pertama memakai `GLTFLoader`, dan ia gagal di Node dengan
 * `self is not defined`: pemuatnya menyiapkan jalur tekstur yang menuntut
 * global peramban, jauh sebelum satu byte geometri disentuh.
 *
 * Menambal `self` akan membuatnya berjalan lalu gagal lagi di dekoder gambar,
 * dan seluruh usaha itu untuk data yang sebenarnya tidak dibutuhkan. Yang
 * ingin diketahui — rangka, klip, jumlah simpul, material, kotak batas —
 * seluruhnya tertulis di potongan JSON GLB, dalam format yang sudah
 * terdokumentasi dan tidak berubah sejak glTF 2.0.
 *
 * Jadi potongannya dibaca apa adanya. Nol dependensi, nol tambalan, dan
 * jawabannya persis sama.
 */
import { readFileSync } from 'node:fs';

const berkas = process.argv[2];
const buf = readFileSync(berkas);

if (buf.readUInt32LE(0) !== 0x46546c67) {
  console.error('Bukan berkas GLB (magic salah).');
  process.exit(1);
}

/* Potongan pertama sesudah header 12-byte selalu JSON pada GLB yang sah. */
const panjangJson = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + panjangJson).toString('utf8'));

const n = (x) => (x ?? []).length;
const rapi = (x) => x.toLocaleString('id-ID');

let segitiga = 0;
for (const m of json.meshes ?? []) {
  for (const p of m.primitives ?? []) {
    const acc = json.accessors?.[p.indices ?? p.attributes?.POSITION];
    if (acc) segitiga += (p.indices !== undefined ? acc.count : acc.count) / 3;
  }
}

/* Kotak batas dari accessor POSITION — min/max wajib ada di glTF 2.0. */
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (const m of json.meshes ?? []) {
  for (const p of m.primitives ?? []) {
    const acc = json.accessors?.[p.attributes?.POSITION];
    if (!acc?.min || !acc.max) continue;
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], acc.min[i]);
      max[i] = Math.max(max[i], acc.max[i]);
    }
  }
}

console.log(`  berkas         ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  generator      ${json.asset?.generator ?? '(tidak disebut)'}`);
console.log(`  mesh           ${n(json.meshes)}`);
console.log(`  segitiga       ${rapi(Math.round(segitiga))}`);
console.log(`  simpul (node)  ${n(json.nodes)}`);
console.log(`  RANGKA (skin)  ${n(json.skins)}`);
console.log(`  KLIP ANIMASI   ${n(json.animations)}`);
for (const a of json.animations ?? []) {
  console.log(`     - "${a.name ?? '(tanpa nama)'}"  ${n(a.channels)} kanal`);
}
console.log(`  material       ${n(json.materials)}`);
for (const m of json.materials ?? []) {
  const t = [];
  if (m.pbrMetallicRoughness?.baseColorTexture) t.push('baseColor');
  if (m.normalTexture) t.push('normal');
  if (m.pbrMetallicRoughness?.metallicRoughnessTexture) t.push('metalRough');
  if (m.emissiveTexture) t.push('emissive');
  console.log(`     - ${m.name ?? '(tanpa nama)'}  tekstur:[${t.join(',') || 'tidak ada'}]`);
}
console.log(`  tekstur        ${n(json.textures)} · gambar ${n(json.images)}`);
if (Number.isFinite(min[1])) {
  console.log(`  kotak batas    ${(max[0] - min[0]).toFixed(2)} x ${(max[1] - min[1]).toFixed(2)} x ${(max[2] - min[2]).toFixed(2)}`);
  console.log(`  dasar y        ${min[1].toFixed(3)}`);
}
