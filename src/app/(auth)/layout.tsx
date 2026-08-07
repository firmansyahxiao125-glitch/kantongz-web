'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { CoreMark } from '@/components/brand/core-mark';
import { useSession } from '@/components/session-provider';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Bingkai halaman autentikasi.
 *
 * Pengguna yang sudah masuk tidak pernah melihat layar ini: dialihkan sebelum
 * apa pun dicat. Halaman masuk yang muncul sekejap bagi pengguna yang sudah
 * masuk terbaca sebagai sesi yang hilang, dan itu merusak kepercayaan pada
 * produk keuangan lebih cepat daripada bug mana pun.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'masuk') router.replace('/dasbor');
  }, [session.status, router]);

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-app">
      <div className="aurora absolute inset-x-0 top-0 h-[60vh]" aria-hidden />
      <div className="grid-lines absolute inset-x-0 top-0 h-[70vh] opacity-40" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg text-[15px] font-semibold tracking-tight text-ink"
        >
          <CoreMark className="size-7" />
          KANTONGZ
        </Link>
        <ThemeToggle />
      </header>

      <main
        id="konten"
        className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center px-6 pb-20 pt-6 sm:pt-12"
      >
        {children}
      </main>
    </div>
  );
}
