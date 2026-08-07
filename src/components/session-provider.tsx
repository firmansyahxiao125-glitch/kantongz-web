'use client';

import { useEffect, useSyncExternalStore } from 'react';

import {
  noteActivity,
  restore,
  serverSnapshot,
  snapshot,
  subscribe,
  type SessionState,
} from '@/lib/session';

/**
 * Jembatan antara store sesi dan React.
 *
 * Tidak ada `useState` di sini. Sumber kebenarannya adalah store, dan
 * `useSyncExternalStore` adalah cara React membacanya tanpa menyalinnya —
 * salinan berarti dua kebenaran, dan dua kebenaran akan berbeda.
 */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'visibilitychange'] as const;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void restore();
  }, []);

  useEffect(() => {
    /* Batas diam 15 menit (§6) diukur dari interaksi nyata, bukan dari
       permintaan jaringan — halaman yang menyegarkan datanya sendiri di latar
       belakang tidak boleh membuat sesi terlihat aktif. */
    const handler = () => {
      noteActivity();
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handler, { passive: true });
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handler);
    };
  }, []);

  return children;
}
