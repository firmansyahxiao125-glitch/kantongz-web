'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CommandPalette } from '@/components/shell/command-palette';
import { PageTransition } from '@/components/shell/page-transition';
import { Sidebar } from '@/components/shell/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/contracts';
import { navItemFor } from '@/lib/nav';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { signOut } from '@/lib/session';

/**
 * Kerangka aplikasi.
 *
 * Sidebar tetap di layar lebar dan menjadi laci di layar sempit. Satu komponen
 * `Sidebar` dipakai keduanya — dua salinan akan menyimpang, dan yang menyimpang
 * selalu yang jarang dibuka.
 */
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  const current = navItemFor(pathname);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPalette((open) => !open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  async function keluar(): Promise<void> {
    await signOut();
    router.replace('/masuk');
  }

  return (
    <div className="min-h-dvh bg-app">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-[var(--surface)] lg:block">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {drawer ? (
          <>
            <motion.button
              type="button"
              aria-label="Tutup navigasi"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDrawer(false);
              }}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-[var(--surface)] lg:hidden"
            >
              <Sidebar
                onNavigate={() => {
                  setDrawer(false);
                }}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDrawer((open) => !open);
            }}
            aria-label={drawer ? 'Tutup navigasi' : 'Buka navigasi'}
            aria-expanded={drawer}
            className="lg:hidden"
          >
            {drawer ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
          </Button>

          <h1 className="text-[15px] font-semibold tracking-tight text-ink">
            {current?.label ?? 'KANTONGZ'}
          </h1>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPalette(true);
              }}
              className="hidden items-center gap-2 rounded-lg border border-line bg-[var(--surface-2)] px-3 py-2 text-sm text-muted transition-colors hover:text-ink sm:flex"
            >
              <Search size={15} aria-hidden />
              <span>Cari</span>
              <kbd className="ml-3 rounded border border-line-strong bg-[var(--surface-3)] px-1.5 py-0.5 font-sans text-[11px] text-dim">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPalette(true);
              }}
              aria-label="Cari"
              className="sm:hidden"
            >
              <Search size={18} aria-hidden />
            </Button>

            <ThemeToggle />

            <div className="mx-1.5 hidden h-6 w-px bg-[var(--line)] sm:block" />

            <span className="hidden max-w-40 truncate text-sm text-muted sm:block">
              {user.fullName}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                void keluar();
              }}
              aria-label="Keluar"
            >
              <LogOut size={17} aria-hidden />
            </Button>
          </div>
        </header>

        <main id="konten" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <CommandPalette
        open={palette}
        onClose={() => {
          setPalette(false);
        }}
      />
    </div>
  );
}
