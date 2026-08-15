/**
 * Mengenali PERMUKAAN yang sedang diukur: pengembangan atau produksi.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  MENGAPA BERKAS INI ADA
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tiga gerbang peramban melaporkan MERAH selama satu sesi penuh, dan tidak
 * satu pun karena ada yang rusak:
 *
 *   grafis   bobot JavaScript 1728 KB terhadap langit-langit 1265 KB
 *   render   1 galat konsol
 *   ronin    1 gagal + 3 galat konsol
 *
 * Ketiganya diukur terhadap `next dev`. Diukur ulang terhadap `next build`
 * lalu `next start`, angkanya menjadi:
 *
 *   grafis   846 KB          19 lulus, 0 gagal
 *   render   39 lulus, 0 gagal
 *   ronin    28 lulus, 0 gagal, 0 galat konsol
 *
 * Selisihnya bukan perbaikan. Ia mengukur hal yang berbeda sejak awal.
 *
 * ── APA YANG SEBENARNYA TERJADI ────────────────────────────────────────
 *
 * `next dev` menyajikan potongan yang TIDAK diminifikasi, tidak di-tree-shake,
 * ditambah runtime React Refresh, klien HMR, dan panel devtools Next. Tidak
 * satu byte pun dari semua itu pernah diunduh pengguna.
 *
 * Dua akibatnya persis yang terlihat di atas:
 *
 *   BOBOT.  882 KB tambahan yang tidak ada di produksi. Anggaran yang diukur
 *           terhadap angka itu tidak mengukur apa pun tentang pengalaman
 *           siapa pun — dan yang lebih buruk, ia BERGERAK sendiri setiap kali
 *           versi Next berubah, tanpa satu baris kode aplikasi disentuh.
 *
 *   GALAT.  React Refresh memanggil `eval()`. CSP repositori ini menolak
 *           `unsafe-eval` DENGAN SENGAJA dan terdokumentasi di
 *           `next.config.ts`. Jadi galat itu adalah kebijakan keamanan yang
 *           bekerja persis sebagaimana dirancang — dan gerbang yang
 *           melaporkannya sebagai kegagalan sedang menghukum kodenya sendiri
 *           karena benar.
 *
 * ── MENGAPA MENOLAK, BUKAN MENYARING ───────────────────────────────────
 *
 * Godaannya adalah menyaring galat React Refresh dari daftar galat konsol,
 * lalu membiarkan gerbangnya berjalan di dev. Itu memperbaiki gejalanya dan
 * meninggalkan sebabnya: bobotnya tetap salah, dan penyaring itu akan ikut
 * menelan galat SUNGGUHAN yang kebetulan menyebut `eval`.
 *
 * Jadi ketiga gerbang itu MENOLAK berjalan di dev, dengan mengatakan apa yang
 * harus dijalankan sebagai gantinya. Gerbang yang menjawab pertanyaan yang
 * salah lebih berbahaya daripada gerbang yang menolak menjawab.
 *
 * ── GERBANG YANG TIDAK MEMAKAI INI, DAN MENGAPA ────────────────────────
 *
 * `akses`, `interior`, `contrast`, `typography`, dan `alur` mengukur
 * STRUKTUR, warna, dan perilaku — bukan byte yang terkirim. Ketiganya sama
 * persis di dev dan produksi, dan menuntut build produksi untuk
 * menjalankannya hanya akan membuat orang jarang menjalankannya.
 */

import { get as getHttp } from 'node:http';
import { get as getHttps } from 'node:https';

/** Potongan yang HANYA ada di `next dev`. */
const PENANDA_DEV = ['next-devtools', 'node_modules_next_dist'];

/**
 * Mengambil HTML lewat `node:http`, BUKAN `fetch`. Dan itu bukan selera.
 *
 * ── GEJALANYA ──────────────────────────────────────────────────────────
 *
 * Versi pertama memakai `fetch`, lalu memanggil `process.exit(1)` ketika
 * permukaannya salah. Hasilnya di Windows:
 *
 *     Assertion failed: !(handle->flags & UV_HANDLE_CLOSING),
 *     file src\win\async.c, line 76
 *
 * dan kode keluar 127 — bukan 1. Gerbang yang gagal dengan 127 dan satu baris
 * crash libuv terbaca di CI sebagai "alat ukurnya rusak", bukan sebagai
 * "kodenya belum siap". Pesan penolakan yang sudah rapi di atasnya tenggelam.
 *
 * ── SEBABNYA ───────────────────────────────────────────────────────────
 *
 * `fetch` di Node memakai undici, dan undici menahan soketnya sebagai
 * keep-alive sesudah badan respons habis dibaca. `process.exit()` merobek
 * proses selagi handle itu masih hidup, dan libuv menegaskan di situ.
 *
 * Diuji satu per satu, bukan dikira:
 *
 *     fetch + process.exit()                    -> 127, crash
 *     fetch + tunda satu tick + process.exit()  -> 127, crash
 *     fetch + tutup dispatcher + exit()         -> 127, crash
 *     fetch + process.exitCode saja             ->   1, bersih (tetapi tidak
 *                                                     menghentikan skripnya)
 *     node:http agent:false + process.exit()    ->   1, bersih  ← dipakai
 *
 * `agent: false` yang menentukan: tanpa agen bersama, soketnya ditutup begitu
 * respons selesai, dan tidak ada handle yang tertinggal saat proses berhenti.
 */
function ambilHtml(base) {
  const url = new URL(base);
  const get = url.protocol === 'https:' ? getHttps : getHttp;

  return new Promise((res, rej) => {
    const req = get(base, { agent: false }, (r) => {
      if (r.statusCode === undefined || r.statusCode >= 400) {
        r.resume();
        rej(new Error(`HTTP ${String(r.statusCode)}`));
        return;
      }
      let badan = '';
      r.setEncoding('utf8');
      r.on('data', (c) => {
        badan += c;
      });
      r.on('end', () => res(badan));
    });
    req.on('error', rej);
    /* Batas waktu eksplisit. Tanpa ini, alamat yang benar tetapi tidak
       menjawab akan menggantung gerbang tanpa pesan apa pun. */
    req.setTimeout(10_000, () => {
      req.destroy(new Error('tidak ada jawaban dalam 10 detik'));
    });
  });
}

/**
 * @param {string} base Asal peladen yang diukur.
 * @returns {Promise<'pengembangan' | 'produksi'>}
 *
 * Membaca HTML-nya saja — tanpa Chrome. Dengan begitu penjaganya dapat berdiri
 * di baris pertama gerbang, sebelum satu proses peramban pun dinyalakan.
 *
 * Nama potongan adalah sinyalnya: `next dev` memancarkan nama modul yang dapat
 * dibaca (`node_modules_next_dist_...`) dan memuat panel devtools; `next build`
 * memancarkan hash pendek. Membandingkan NAMA jauh lebih tahan daripada
 * menebak dari tajuk atau dari porta.
 */
export async function permukaanDari(base) {
  let html;
  try {
    html = await ambilHtml(base);
  } catch (error) {
    throw new Error(
      `Tidak dapat menghubungi ${base} — ${error.message}. ` +
        'Nyalakan peladennya lebih dulu, lalu jalankan lagi.',
    );
  }

  const potongan = [...html.matchAll(/\/_next\/static\/chunks\/([^"'\s]+)/g)].map((m) => m[1]);
  const dev = potongan.some((p) => PENANDA_DEV.some((tanda) => p.includes(tanda)));
  return dev ? 'pengembangan' : 'produksi';
}

/**
 * Menghentikan gerbang yang tidak boleh mengukur `next dev`.
 *
 * Keluar dengan kode 1 dan menjelaskan sebabnya. Pesannya menyebut perintah
 * yang harus dijalankan — penolakan yang tidak memberi jalan keluar hanya
 * memindahkan kebingungan.
 */
export async function wajibProduksi(base, namaGerbang) {
  const permukaan = await permukaanDari(base);
  if (permukaan === 'produksi') return;

  console.error(
    [
      '',
      `  Gerbang \`${namaGerbang}\` MENOLAK mengukur peladen pengembangan.`,
      '',
      `  ${base} menyajikan \`next dev\`: potongan tanpa minifikasi, runtime`,
      '  React Refresh, klien HMR, dan panel devtools Next. Tidak satu byte pun',
      '  dari semuanya diunduh pengguna, jadi angka yang keluar dari sini tidak',
      '  mengukur pengalaman siapa pun.',
      '',
      '  Terukur pada repositori ini: 1728 KB di dev terhadap 846 KB di',
      '  produksi — 882 KB yang tidak pernah ada. Dan React Refresh memanggil',
      '  `eval()`, yang CSP di sini tolak dengan sengaja, sehingga gerbangnya',
      '  melaporkan kebijakan keamanan yang bekerja benar sebagai kegagalan.',
      '',
      '  Jalankan terhadap build produksi:',
      '',
      '    npm run build',
      '    npx next start -p 3200',
      `    node scripts/${namaGerbang}.mjs --base http://localhost:3200`,
      '',
      '  SUDAH menjalankan produksi dan tetap ditolak? Periksa apakah ada',
      '  peladen `next dev` LAMA yang masih memegang porta itu. Dua proses',
      '  dapat mendengarkan porta yang sama pada antarmuka berbeda (0.0.0.0',
      '  dan 127.0.0.1), dan `localhost` bisa jatuh ke yang salah:',
      '',
      '    Windows   Get-NetTCPConnection -LocalPort 3100 -State Listen',
      '    Linux     ss -lptn "sport = :3100"',
      '',
      '  `pkill -f "next dev"` TIDAK dapat diandalkan di Git Bash pada Windows —',
      '  ia melaporkan berhasil tanpa mematikan apa pun. Kekeliruan itu sempat',
      '  membuat build produksi menyajikan potongan dev selama tiga jalanan',
      '  berturut-turut, dan gerbang inilah yang menangkapnya.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
