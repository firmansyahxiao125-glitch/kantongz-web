'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
/** Apa yang DIPILIH pengguna. `system` bukan tema — ia adalah penolakan memilih. */
export type ThemeChoice = Theme | 'system';

const STORAGE_KEY = 'kantongz-theme';

interface ThemeContextValue {
  /** Tema yang benar-benar tampil, sesudah `system` diselesaikan. */
  theme: Theme;
  /** Yang dipilih pengguna, termasuk `system`. */
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
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

function notify(): void {
  for (const listener of listeners) listener();
}

const SYSTEM_QUERY = '(prefers-color-scheme: light)';

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  /* Pengguna yang memilih `system` harus ikut berubah ketika sistemnya berubah
     — di macOS dan Windows itu terjadi otomatis saat matahari terbenam. */
  const media = window.matchMedia(SYSTEM_QUERY);
  const onSystemChange = (): void => {
    if (readChoice() === 'system') {
      document.documentElement.setAttribute('data-theme', media.matches ? 'light' : 'dark');
      notify();
    }
  };
  media.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystemChange);
  };
}

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

interface Snapshot {
  theme: Theme;
  choice: ThemeChoice;
}

/* Objek yang sama dikembalikan selama isinya sama. `useSyncExternalStore`
   membandingkan dengan `Object.is`, dan objek baru tiap panggilan akan membuat
   React merender tanpa henti. */
let cached: Snapshot = { theme: 'dark', choice: 'system' };

function getSnapshot(): Snapshot {
  const theme: Theme =
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const choice = readChoice();

  if (cached.theme !== theme || cached.choice !== choice) cached = { theme, choice };
  return cached;
}

const SERVER_SNAPSHOT: Snapshot = { theme: 'dark', choice: 'system' };

/* Di server tidak ada DOM. Nilai ini harus cocok dengan yang dilukis skrip
   pra-paint pada kasus paling umum; `useSyncExternalStore` yang menangani
   perbedaannya setelah hidrasi, tanpa peringatan ketidakcocokan. */
function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setChoice = useCallback((next: ThemeChoice) => {
    const resolved: Theme =
      next === 'system'
        ? window.matchMedia(SYSTEM_QUERY).matches
          ? 'light'
          : 'dark'
        : next;

    document.documentElement.setAttribute('data-theme', resolved);

    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Mode penyamaran memblokir penyimpanan. Tema tetap berlaku untuk sesi
         ini; yang hilang hanya ingatannya. */
    }

    notify();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: snapshot.theme,
      choice: snapshot.choice,
      setChoice,
      toggle: () => {
        setChoice(snapshot.theme === 'dark' ? 'light' : 'dark');
      },
    }),
    [snapshot, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  return ctx;
}
