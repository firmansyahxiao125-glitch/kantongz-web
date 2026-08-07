'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

import { SessionProvider } from '@/components/session-provider';
import { ThemeProvider } from '@/components/theme-provider';

/**
 * Penyedia global.
 *
 * `QueryClient` dibuat lewat `useState` supaya tidak lahir ulang tiap render.
 * Klien yang dibuat ulang membuang seluruh cache pada setiap render induk, dan
 * gejalanya adalah aplikasi yang memuat ulang datanya sendiri tanpa sebab.
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
      <ThemeProvider>
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              'glass-strong !rounded-xl !text-[var(--ink)] !shadow-[var(--shadow-float)] !text-sm',
          }}
          closeButton
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
