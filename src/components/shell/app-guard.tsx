'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from '@/components/session-provider';
import { AppShell } from '@/components/shell/app-shell';
import { CoreMark } from '@/components/brand/core-mark';
import { ErrorState } from '@/components/ui/state';
import { ApiError } from '@/lib/api';
import { restore } from '@/lib/session';

/**
 * Penjaga rute terautentikasi.
 *
 * Selama status masih `memuat`, TIDAK ADA yang dialihkan. Muat ulang halaman
 * selalu dimulai tanpa token akses — ia hidup di memori — dan mengalihkan pada
 * saat itu akan mengeluarkan setiap pengguna yang menekan F5.
 *
 * Berdiri terpisah dari `app/(app)/layout.tsx` karena ia memanggil
 * `useSession()`, dan pemanggil tidak bisa berada di dalam penyedia yang ia
 * pasang sendiri. Tata letaknya memasang penyedia; berkas ini memakainya.
 */
export function AppGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'tamu') router.replace('/masuk');
  }, [session.status, router]);

  /*
   * Peladen tidak terjangkau — dan itu BUKAN alasan mengeluarkan pengguna.
   *
   * Sebelum keadaan ini ada, kegagalan jaringan saat memulihkan sesi berakhir
   * sebagai `tamu` dan mengalihkan ke halaman masuk, padahal kuki refresh masih
   * sah. Yang benar adalah mengatakan apa yang terjadi dan menawarkan mencoba
   * lagi, sama seperti setiap layar berdata di aplikasi ini.
   */
  if (session.status === 'galat') {
    return (
      <div className="grid min-h-dvh place-items-center bg-app px-6">
        <div className="w-full max-w-sm">
          <ErrorState
            error={new ApiError(
              {
                code: 'network',
                message:
                  'Tidak bisa terhubung ke server. Sesimu masih tersimpan — periksa koneksimu, lalu coba lagi.',
                details: null,
                retryAfter: null,
              },
              0,
            )}
            onRetry={() => {
              void restore();
            }}
          />
        </div>
      </div>
    );
  }

  if (session.status !== 'masuk') {
    return (
      <div className="grid min-h-dvh place-items-center bg-app" aria-busy="true">
        <CoreMark className="size-10 animate-pulse text-[var(--ink-dim)]" />
        <span className="sr-only">Memulihkan sesi</span>
      </div>
    );
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
