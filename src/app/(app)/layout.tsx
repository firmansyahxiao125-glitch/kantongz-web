import { AppProviders } from '@/components/app-providers';
import { AppGuard } from '@/components/shell/app-guard';

/**
 * Tata letak rute terautentikasi.
 *
 * Server Component, dan isinya cuma dua pembungkus — penjaganya ada di
 * `AppGuard`. Pembagian itu yang membuat penyedia berhenti di sini alih-alih
 * naik ke tata letak akar, tempat halaman muka publik ikut membayarnya.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AppGuard>{children}</AppGuard>
    </AppProviders>
  );
}
