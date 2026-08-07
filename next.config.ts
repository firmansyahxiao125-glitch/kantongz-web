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
    return [
      {
        source: '/:path*',
        headers: [
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
