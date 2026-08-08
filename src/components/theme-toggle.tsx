'use client';

import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Pengalih tema.
 *
 * Ikonnya berputar dan memudar saat berganti, bukan bertukar mendadak —
 * pergantian yang instan membuat pengguna ragu apakah tombolnya benar-benar
 * bekerja atau halaman yang berkedip.
 *
 * ── MENGAPA TIDAK MEMAKAI `AnimatePresence` LAGI ────────────────────────
 *
 * Tombol ini muncul di halaman muka, dan lewat dialah Framer Motion ikut
 * terseret ke potongan halaman muka — satu pustaka animasi penuh demi dua ikon
 * yang bertukar tempat.
 *
 * Yang menggantikannya: KEDUA ikon selalu ada di DOM, saling bertumpuk, dan
 * hanya opasitas serta rotasinya yang berganti. Tidak ada yang perlu
 * dipasang-lepas, jadi tidak ada yang perlu mengurus animasi keluar — dan
 * karena ini transisi CSS, aturan `prefers-reduced-motion` di `globals.css`
 * menjangkaunya tanpa konfigurasi tambahan apa pun.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
    >
      {/* Kotak setinggi ikon supaya tumpukan absolut punya tempat berdiri —
          tanpa ini keduanya melayang keluar dan tombolnya mengempis. */}
      <span className="relative grid size-[18px] place-items-center" aria-hidden>
        <Sun
          className={cn(
            'absolute size-[18px] transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)]',
            dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0',
          )}
        />
        <Moon
          className={cn(
            'absolute size-[18px] transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)]',
            dark ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
        />
      </span>
    </Button>
  );
}
