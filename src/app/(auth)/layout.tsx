import { AppProviders } from '@/components/app-providers';
import { AuthFrame } from '@/components/auth/auth-frame';

/**
 * Tata letak halaman autentikasi.
 *
 * Layar masuk dan daftar memakai React Query untuk mutasinya dan penyimpanan
 * sesi untuk pengalihannya, jadi keduanya memang butuh penyedia yang sama
 * dengan aplikasi. Halaman muka tidak — dan itulah sebabnya pemasangannya
 * berhenti di batas grup rute, bukan di tata letak akar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthFrame>{children}</AuthFrame>
    </AppProviders>
  );
}
