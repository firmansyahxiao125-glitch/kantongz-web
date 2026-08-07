'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { NAV_ITEMS, type NavItem } from '@/lib/nav';
import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * Palet perintah (Ctrl/⌘ + K).
 *
 * Bukan hiasan: begitu aplikasi punya lebih dari selusin halaman, navigasi
 * lewat mata dan kursor menjadi lebih lambat daripada mengetik dua huruf.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {/*
        Isi palet dipasang dan dilepas bersama `open`, bukan disembunyikan.
        Keadaannya — kueri dan posisi kursor — dengan begitu lahir bersih pada
        setiap pembukaan tanpa satu pun efek yang mengembalikannya, dan tanpa
        render berantai yang ditimbulkan efek semacam itu.
      */}
      {open ? <PaletteDialog onClose={onClose} /> : null}
    </AnimatePresence>
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<NavItem[]>(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      `${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(needle),
    );
  }, [query]);

  /* Dijepit saat render, bukan dikoreksi lewat efek. Kursor yang tertinggal di
     luar batas setelah daftar menyusut membuat Enter diam tanpa penjelasan. */
  const active = cursor < results.length ? cursor : 0;

  /**
   * Fokus dipinjam saat dibuka dan dikembalikan saat ditutup. Tanpa ini,
   * pengguna keyboard yang menutup palet mendarat di awal dokumen.
   */
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();

    return () => {
      previous?.focus();
    };
  }, []);

  function go(item: NavItem): void {
    onClose();
    router.push(item.href);
  }

  function handleKey(event: React.KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[active];
      if (item) go(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.fast }}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
    >
      <button
        type="button"
        aria-label="Tutup palet perintah"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Palet perintah"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        onKeyDown={handleKey}
        className="glass-strong relative w-full max-w-lg overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-faint" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            placeholder="Cari halaman…"
            aria-label="Cari halaman"
            aria-controls="palet-hasil"
            className="w-full bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        <ul id="palet-hasil" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted">
              Tidak ada yang cocok dengan “{query}”.
            </li>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const focused = index === active;

              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onMouseMove={() => {
                      setCursor(index);
                    }}
                    onClick={() => {
                      go(item);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      focused ? 'bg-[var(--surface-3)] text-ink' : 'text-muted',
                    )}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {focused ? <CornerDownLeft size={14} className="text-faint" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}
