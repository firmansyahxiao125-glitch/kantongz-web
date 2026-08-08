'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { Toaster } from 'sonner';

import { SessionProvider } from '@/components/session-provider';

/**
 * Penyedia untuk bagian aplikasi yang SUDAH atau SEDANG masuk.
 *
 * ── MENGAPA INI TIDAK LAGI DI TATA LETAK AKAR ───────────────────────────
 *
 * Sebelumnya seluruhnya dipasang di `app/layout.tsx`, yang artinya setiap
 * pengunjung halaman muka — halaman publik yang isinya teks dan satu adegan
 * 3D — mengunduh dan menjalankan React Query, Framer Motion, penyimpanan sesi,
 * dan sistem notifikasi. Halaman itu tidak memakai satu pun dari keempatnya.
 *
 * Yang membuatnya mudah terlewat: tidak ada yang RUSAK. Halaman muka bekerja
 * sempurna; ia hanya membayar biaya yang bukan miliknya, dan biaya itu muncul
 * di tempat yang jauh — sebagai Total Blocking Time.
 *
 * Sekarang keempatnya hidup di sini, dan hanya rute `(app)` dan `(auth)` yang
 * memasangnya. Batas itu bukan soal kerapian: ia adalah batas antara yang
 * publik dan yang terautentikasi, dan itu memang tempat yang benar untuk
 * memisahkan muatan.
 *
 * `QueryClient` dibuat lewat `useState` supaya tidak lahir ulang tiap render.
 * Klien yang dibuat ulang membuang seluruh cache pada setiap render induk, dan
 * gejalanya adalah aplikasi yang memuat ulang datanya sendiri tanpa sebab.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              /* Galat autentikasi tidak pernah diulang — mengulang permintaan
                 yang ditolak karena sesi berakhir hanya menunda pengalihan. */
              const code = (error as { code?: string }).code;
              if (code === 'session_expired' || code === 'invalid_credentials') return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {/*
        Framer Motion menganimasikan lewat gaya sebaris dan `requestAnimationFrame`,
        BUKAN lewat animasi CSS. Aturan `prefers-reduced-motion` di `globals.css`
        karena itu tidak menyentuhnya sama sekali: pengguna yang meminta gerak
        dikurangi tetap menerima seluruh transisi halaman, laci yang meluncur,
        dan setiap kartu yang naik saat masuk layar.

        `reducedMotion="user"` menutup celah itu di satu tempat. Framer menahan
        animasi transform dan tata letak, tetapi MEMBIARKAN opasitas — memudar
        tidak memicu vertigo, dan tanpa memudar keadaan berganti dengan kedipan
        yang justru lebih mengganggu daripada gerak aslinya.

        Halaman muka tidak butuh penjaga ini karena ia sudah tidak memakai
        Framer sama sekali; geraknya CSS, dan CSS sudah patuh sejak awal.
      */}
      <MotionConfig reducedMotion="user">
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              'glass-strong !rounded-xl !text-[var(--ink)] !shadow-[var(--shadow-float)] !text-sm',
          }}
          closeButton
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
