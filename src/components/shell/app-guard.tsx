'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from '@/components/session-provider';
import { AppShell } from '@/components/shell/app-shell';
import { CoreMark } from '@/components/brand/core-mark';

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
