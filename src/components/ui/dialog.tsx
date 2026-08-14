'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * Dialog modal.
 *
 * Isinya dipasang dan dilepas bersama `open`, bukan disembunyikan: formulir di
 * dalamnya lahir bersih setiap kali dibuka, tanpa satu pun efek yang
 * mengosongkannya.
 *
 * Tiga hal yang membuat modal ini benar dan bukan sekadar kotak melayang:
 * fokus berpindah ke dalam dan kembali saat ditutup, Escape menutupnya, dan
 * gulir halaman di belakang dikunci.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <DialogBody onClose={onClose} title={title} description={description}>
          {children}
        </DialogBody>
      ) : null}
    </AnimatePresence>
  );
}

function DialogBody({
  onClose,
  title,
  description,
  children,
}: {
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /*
     * FOKUS DIPINDAHKAN KE DALAM. Selama ini komentar di atas menjanjikannya
     * dan kodenya hanya mengerjakan separuh pulangnya — dialog terbuka,
     * fokus tetap tertinggal di tombol yang membukanya, dan pengguna papan tik
     * harus menyeberangi seluruh halaman di belakang untuk sampai ke
     * formulir yang baru saja ia minta.
     *
     * Yang difokus adalah PANELNYA, bukan kolom pertama: pembaca layar
     * membacakan judul dan keterangan dialog lebih dulu, dan orang berhak tahu
     * ia sedang berada di mana sebelum diminta mengisi apa pun.
     *
     * Kecuali ada yang sudah meminta fokus untuk dirinya sendiri lewat
     * `autoFocus` — permintaan yang lebih spesifik itu dihormati.
     */
    const t = window.setTimeout(() => {
      const p = panel.current;
      if (p && !p.contains(document.activeElement)) p.focus();
    }, 0);

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.fast }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        /* `-1`: dapat difokus lewat kode, TIDAK ikut urutan Tab. Panel adalah
           tempat berpijak, bukan kontrol — memasukkannya ke urutan Tab berarti
           satu perhentian kosong yang tidak melakukan apa pun. */
        tabIndex={-1}
        initial={{ opacity: 0, y: 24, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.99 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        /* `outline-none` aman di sini justru KARENA `tabIndex={-1}`: panel ini
           tidak pernah dapat dicapai lewat Tab, jadi tidak ada seorang pun
           yang kehilangan penanda fokusnya. Cincin selebar dialog hanya akan
           terbaca sebagai galat gambar. */
        className="glass-strong relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-xl)] p-6 shadow-[var(--shadow-float)] outline-none sm:rounded-[var(--radius-xl)]"
      >
        <header className="mb-5 pr-8">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted">
              {description}
            </p>
          ) : null}
        </header>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-lg p-2 text-muted transition-colors hover:bg-[var(--surface-3)] hover:text-ink"
        >
          <X size={17} aria-hidden />
        </button>

        {children}
      </motion.div>
    </motion.div>
  );
}
