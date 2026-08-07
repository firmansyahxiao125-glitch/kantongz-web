'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * Galat tingkat formulir.
 *
 * `aria-live="assertive"` bukan pilihan gaya: pesan ini muncul setelah
 * pengiriman, jauh dari fokus keyboard, dan pengguna pembaca layar tidak punya
 * cara lain mengetahui pengirimannya gagal.
 */
export function FormAlert({ message }: { message: string | null }) {
  return (
    <div aria-live="assertive" aria-atomic="true">
      <AnimatePresence initial={false}>
        {message ? (
          <motion.div
            key={message}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="mb-1 flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3.5 py-3 text-sm leading-relaxed text-[var(--color-danger)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{message}</span>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
