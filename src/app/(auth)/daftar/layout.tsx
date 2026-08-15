import type { Metadata } from 'next';

/**
 * Judul halaman daftar. V1.
 *
 * ── MENGAPA LEWAT `layout.tsx`, BUKAN DI HALAMANNYA ────────────────────
 *
 * `page.tsx` di sini adalah komponen klien — ia memakai `useState`,
 * `useRouter`, dan react-hook-form. Komponen klien TIDAK dapat mengekspor
 * `metadata`; Next mengabaikannya tanpa memperingatkan siapa pun.
 *
 * ── MENGAPA INI BUKAN KERAPIAN ─────────────────────────────────────────
 *
 * Tanpa ini ketiga halaman autentikasi memakai judul bawaan yang sama persis:
 * "KANTONGZ — AI Financial Operating System". Akibatnya nyata dan sepele
 * untuk dilewatkan:
 *
 *   Pembaca layar mengumumkan judul dokumen setiap kali navigasi selesai.
 *   Tiga halaman berjudul sama berarti pengguna tidak pernah diberi tahu ia
 *   sudah pindah.
 *
 *   Tiga tab peramban yang terbuka bersamaan tidak dapat dibedakan sama
 *   sekali.
 *
 * Templat di `app/layout.tsx` (`'%s · KANTONGZ'`) yang menyusun sisanya,
 * jadi yang ditulis di sini cukup namanya saja.
 */
export const metadata: Metadata = {
  title: 'Daftar',
  description: 'Buat akun KANTONGZ dan mulai mencatat keuanganmu.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
