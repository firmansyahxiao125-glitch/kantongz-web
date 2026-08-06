'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kantongz-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Sumber kebenaran tema adalah atribut `data-theme` pada `<html>`, bukan state
 * React.
 *
 * Skrip pra-paint di `layout.tsx` sudah memasangnya sebelum React hidup, jadi
 * React harus MEMBACA dari sana — bukan menyimpan salinan kedua yang harus
 * disamakan lewat efek. Salinan kedua itulah yang menghasilkan kedipan tema
 * pada muat pertama.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

/* Di server tidak ada DOM. Nilai ini harus cocok dengan yang dilukis skrip
   pra-paint pada kasus paling umum; `useSyncExternalStore` yang menangani
   perbedaannya setelah hidrasi, tanpa peringatan ketidakcocokan. */
function getServerSnapshot(): Theme {
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Mode penyamaran memblokir penyimpanan. Tema tetap berlaku untuk sesi
         ini; yang hilang hanya ingatannya. */
    }
    notify();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
      },
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  return ctx;
}
