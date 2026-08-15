import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Keluaran `standalone`: satu `server.js` beserta HANYA modul yang dijangkau
   * jejak impornya. Citra produksi karena itu tidak perlu `npm ci` kedua, dan
   * ukurannya turun dari ratusan megabita menjadi puluhan.
   */
  output: 'standalone',

  /* Header keamanan dipasang di sini, bukan di middleware — middleware berjalan
     per permintaan, header ini tidak berubah, dan yang tidak berubah tidak
     layak dihitung ulang jutaan kali. */
  async headers() {
    /**
     * Content-Security-Policy.
     *
     * Sebelumnya TIDAK ADA sama sekali — tidak di sini, tidak di Caddyfile.
     * Untuk aplikasi keuangan itu celah nyata: satu skrip pihak ketiga yang
     * berhasil disisipkan dapat membaca token dari memori halaman dan
     * mengirimkannya ke mana pun.
     *
     * ── MENGAPA `unsafe-inline` MASIH ADA PADA `script-src` ──────────────
     *
     * Next menyuntikkan skrip hidrasi sebaris, dan `layout.tsx` menyuntikkan
     * skrip tema yang HARUS berjalan sebelum cat pertama. Menghapusnya
     * menuntut nonce per-permintaan, dan nonce memaksa SETIAP halaman menjadi
     * dinamis — kehilangan pra-render statis yang saat ini memberi FCP 0,3 s
     * dan LCP 1,3 s.
     *
     * Pertukarannya dinyatakan terbuka, bukan disembunyikan: `unsafe-inline`
     * melemahkan perlindungan terhadap XSS yang SUDAH berhasil menyuntik
     * markup. Yang tetap diblokir dan itulah nilainya:
     *
     *   script-src 'self'  → skrip dari domain lain ditolak, jadi payload
     *                        yang menarik kode eksternal gagal
     *   connect-src        → data tidak dapat dikirim ke host asing
     *   form-action 'self' → formulir tidak dapat dibajak ke domain lain
     *   frame-ancestors    → halaman tidak dapat dibingkai (clickjacking)
     *   base-uri 'none'    → tag <base> palsu tidak dapat membelokkan
     *                        seluruh URL relatif
     *   object-src 'none'  → plugin dan applet ditutup
     *
     * Menaikkannya ke CSP berbasis nonce adalah pekerjaan yang sah dan
     * TERCATAT di PRODUCTION_CHECKLIST — ia menuntut middleware dan
     * pengukuran ulang kinerja, bukan satu baris.
     */
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      /* Framer Motion menulis gaya sebaris pada setiap frame animasi, dan
         Tailwind menyuntikkan gaya kritis. Keduanya menuntut ini. */
      "style-src 'self' 'unsafe-inline'",
      /*
         `data:` untuk tekstur bintik SVG di `globals.css`.

         `blob:` DITAMBAHKAN untuk tekstur GLB, dan lingkupnya sengaja
         diperiksa sebelum ditambahkan. `GLTFLoader` mengurai gambar yang
         TERTANAM di dalam berkas model, lalu menyerahkannya ke peramban
         sebagai URL blob; tanpa izin ini ia gagal dengan "Couldn't load
         texture" dan modelnya tergambar polos tanpa tekstur.

         Yang diizinkan bukan sumber baru: URL blob hanya dapat DIBUAT oleh
         skrip di origin ini, dari byte yang sudah ada di origin ini. Ia tidak
         dapat menunjuk ke host mana pun di luar, jadi permukaan serangnya
         tidak bertambah — berbeda jauh dari `unsafe-eval`, yang sebelumnya
         DITOLAK di berkas ini demi decoder WASM yang tidak dipakai.

         Tidak ada gambar dari host luar di mana pun.
      */
      "img-src 'self' data: blob:",
      /* `next/font` mengunduh saat BUILD dan menyajikannya dari domain
         sendiri, jadi tidak ada host font eksternal yang perlu diizinkan. */
      "font-src 'self'",
      /*
         `blob:` di SINI, bukan hanya di `img-src`, dan sebabnya halus.

         `GLTFLoader` memuat tekstur lewat `ImageBitmapLoader`, dan
         `ImageBitmapLoader` mengambil URL blob-nya dengan `fetch()` — bukan
         dengan `<img>`. `fetch` diatur `connect-src`, jadi mengizinkan
         `blob:` pada `img-src` saja membuat gambarnya dapat dipasang di
         `<img>` tetapi tetap tidak dapat DIAMBIL oleh pemuatnya.

         Jejaknya menyesatkan: pesan galatnya berbunyi "Couldn't load
         texture" dan menunjuk URL blob, padahal blob itu terbukti dapat
         diurai — `createImageBitmap` atasnya mengembalikan 1024x1024 pada
         detik yang sama. Yang gagal pengambilannya, bukan penguraiannya.

         Lingkupnya tetap sama sempitnya: URL blob hanya dapat dibuat skrip
         origin ini dari byte yang sudah ada di origin ini, dan tidak dapat
         menunjuk host mana pun di luar.
      */
      `connect-src 'self' blob: ${api}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          /* Klik-jacking: aplikasi keuangan yang dapat dibingkai adalah aplikasi
             yang tombol "kirim"-nya dapat ditumpangi halaman lain. */
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          /* Tidak satu pun dari ketiganya dipakai produk ini. Yang tidak dipakai
             lebih baik ditutup daripada dibiarkan menganggur. */
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
