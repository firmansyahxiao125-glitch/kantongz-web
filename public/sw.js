/**
 * Service worker KANTONGZ. H1.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  YANG TIDAK PERNAH DI-CACHE, DAN MENGAPA ITU ATURAN PERTAMA
 * ══════════════════════════════════════════════════════════════════════
 *
 * Tidak satu byte pun jawaban API disimpan. Bukan saldo, bukan transaksi,
 * bukan anggaran, bukan apa pun dari `NEXT_PUBLIC_API_URL`.
 *
 * Dua sebab, dan keduanya berdiri sendiri:
 *
 *   ANGKA BASI. Aplikasi keuangan yang menampilkan saldo dari cache sedang
 *   menampilkan angka yang salah dengan percaya diri penuh. Pengguna yang
 *   membuka KANTONGZ untuk memutuskan apakah ia mampu membeli sesuatu tidak
 *   punya cara membedakan "saldo hari ini" dari "saldo hari Selasa lalu" —
 *   dan tidak ada penanda UI yang cukup keras untuk memperbaikinya.
 *
 *   DATA YANG TERTINGGAL. Cache service worker bertahan sesudah keluar akun,
 *   dan tidak ikut terhapus ketika token dicabut. Ponsel bersama, laptop
 *   pinjaman, perangkat yang dijual — pada ketiganya, riwayat transaksi
 *   seseorang tinggal di disk tanpa satu pun jalur di aplikasi yang dapat
 *   membersihkannya.
 *
 * Jadi yang di-cache HANYA cangkang: HTML halaman luring, ikon, dan aset
 * statis Next yang namanya sudah bersidik jari. Semuanya publik, semuanya
 * sama untuk setiap pengguna, dan tidak satu pun menyebutkan uang siapa pun.
 *
 * ── AKIBATNYA YANG JUJUR ───────────────────────────────────────────────
 *
 * Luring, KANTONGZ terbuka dan memberi tahu bahwa ia luring. Ia tidak
 * berpura-pura menampilkan pembukuan. Itu memang lebih sedikit daripada yang
 * dijanjikan sebagian PWA, dan itu satu-satunya bentuk yang jujur untuk
 * aplikasi yang angkanya dipakai orang mengambil keputusan.
 */

/**
 * Versi cache. Dinaikkan setiap kali daftar prasedia berubah.
 *
 * Nama cache yang tidak berubah membuat cangkang lama bertahan selamanya di
 * perangkat yang sudah memasangnya — termasuk sesudah perbaikan keamanan di
 * sisi klien.
 */
const VERSI = 'kantongz-v1';
const CANGKANG = `${VERSI}-cangkang`;

/** Halaman yang ditampilkan ketika navigasi gagal karena jaringan. */
const LURING = '/luring.html';

/**
 * Prasedia SEMINIMAL mungkin.
 *
 * Bundel Next tidak ikut: namanya memuat sidik jari yang berubah tiap build,
 * jadi daftar yang ditulis tangan akan salah pada build berikutnya — dan
 * `install` yang gagal mengambil satu berkas akan MEMBATALKAN seluruh
 * pemasangan service worker-nya. Aset ber-sidik-jari ditangani saat jalan,
 * di `fetch`, tempat namanya sudah diketahui.
 */
const PRASEDIA = [LURING, '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CANGKANG);
      await cache.addAll(PRASEDIA);
      /* Langsung menggantikan yang lama, tanpa menunggu seluruh tab ditutup.
         Service worker yang menunggu dapat tertinggal berminggu-minggu di
         peramban yang tabnya tidak pernah ditutup. */
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /* Cache versi lama dibuang. Tanpa ini, setiap versi meninggalkan
         salinannya sendiri dan kuota penyimpanan habis oleh cangkang yang
         tidak akan pernah dipakai lagi. */
      const nama = await caches.keys();
      await Promise.all(nama.filter((n) => !n.startsWith(VERSI)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Aset statis Next: `/_next/static/...` — namanya ber-sidik-jari, jadi abadi. */
function asetAbadi(url) {
  return url.pathname.startsWith('/_next/static/');
}

/** Ikon dan berkas publik yang memang tidak pernah berubah isinya. */
function asetPublik(url) {
  return PRASEDIA.includes(url.pathname) || url.pathname === '/favicon.ico';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Hanya GET. `POST`, `PUT`, dan `DELETE` mengubah keadaan di peladen, dan
     tidak satu pun boleh dijawab dari cache maupun diulang diam-diam. */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /*
     ── PENJAGA PERTAMA: ASAL LAIN TIDAK PERNAH DISENTUH ─────────────────

     API berada di asal yang berbeda (`NEXT_PUBLIC_API_URL`), dan service
     worker MENCEGAT permintaan lintas asal dari kliennya. Baris ini yang
     membuat seluruh lalu lintas keuangan lewat begitu saja ke jaringan,
     tanpa pernah menyentuh `caches`.

     Ditulis sebagai penjaga PALING AWAL dengan sengaja: aturan keamanan yang
     diperiksa terakhir adalah aturan yang suatu hari terlewat oleh cabang
     baru di atasnya.
  */
  if (url.origin !== self.location.origin) return;

  /* Penjaga kedua: apa pun yang beraroma API di asal ini sendiri. Hari ini
     `/api/*` hanya memuat rute internal Next, tetapi daftar putih yang
     dipersempit belakangan jauh lebih murah daripada kebocoran. */
  if (url.pathname.startsWith('/api/')) return;

  if (asetAbadi(url) || asetPublik(url)) {
    /* Cache-first: isinya tidak pernah berubah tanpa namanya ikut berubah. */
    event.respondWith(
      (async () => {
        const tersimpan = await caches.match(request);
        if (tersimpan) return tersimpan;

        const jawaban = await fetch(request);
        /* Hanya jawaban yang benar-benar berhasil yang disimpan. Menyimpan
           404 atau 500 membuat kegagalan sesaat menjadi kegagalan permanen di
           perangkat itu. */
        if (jawaban.ok) {
          const cache = await caches.open(CANGKANG);
          await cache.put(request, jawaban.clone());
        }
        return jawaban;
      })(),
    );
    return;
  }

  /*
     Navigasi: JARINGAN DULU, cache hanya sebagai jaring jatuh.

     Kebalikan dari aset. Halaman memuat data, dan halaman yang dilayani dari
     cache akan menampilkan kerangka pembukuan lama sebelum sempat menyegarkan
     — kedipan angka basi yang persis ingin dihindari berkas ini.
  */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const luring = await caches.match(LURING);
          if (luring) return luring;
          return new Response('Luring.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })(),
    );
  }

  /* Selebihnya dibiarkan apa adanya — tanpa `respondWith`, peramban
     menanganinya persis seperti tanpa service worker. */
});
