'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useRef, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Pembungkus magnetik.
 *
 * Isinya condong ke arah kursor saat kursor mendekat, lalu kembali begitu
 * pergi. Dipakai HANYA pada aksi utama — satu per layar, kadang dua.
 *
 * ── MENGAPA ADA ────────────────────────────────────────────────────────
 *
 * Bukan karena bagus dilihat. Tombol magnetik memperbesar sasaran secara
 * efektif: kursor yang meleset beberapa piksel tetap mendarat, karena
 * tombolnya bergerak menemuinya. Hukum Fitts berlaku terbalik untuk sekali
 * ini — dan efeknya nyata pada trackpad, tempat presisi paling rendah.
 *
 * ── MENGAPA HANYA UNTUK AKSI UTAMA ─────────────────────────────────────
 *
 * Kalau setiap tombol magnetik, tidak ada yang terasa utama, dan halaman
 * terbaca gelisah — setiap benda bergoyang mengikuti kursor yang lewat.
 * Kelangkaan itulah isyaratnya.
 *
 * ── BATAS 8 PIKSEL ─────────────────────────────────────────────────────
 *
 * Di atas itu, tombol berpisah secara kasatmata dari tempat ia SEHARUSNYA
 * berada, dan pengguna papan ketik yang men-tab ke sana melihat fokus mendarat
 * di posisi yang bergeser. Delapan piksel cukup untuk terasa, terlalu kecil
 * untuk membingungkan.
 */

const PULL = 8;

export interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Radius aktif di luar batas elemen. */
  range?: number;
}

export function MagneticButton({ children, className, range = 56 }: MagneticProps) {
  const host = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  /* Pegas, bukan transisi: kursor berubah arah puluhan kali per detik, dan
     transisi berdurasi tetap akan memulai ulang setiap kali — menghasilkan
     gerak yang tersendat justru saat kursor bergerak paling cepat. */
  const x = useSpring(rawX, { stiffness: 260, damping: 22, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 260, damping: 22, mass: 0.5 });

  function handleMove(event: PointerEvent<HTMLSpanElement>) {
    /* Sentuh tidak punya hover. Menjalankan ini pada jari menghasilkan tombol
       yang melompat tepat saat ditekan — sasaran yang bergerak di bawah jari
       adalah cacat, bukan kemewahan. */
    if (event.pointerType !== 'mouse') return;

    const el = host.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;

    const distance = Math.hypot(dx, dy);
    const reach = Math.max(rect.width, rect.height) / 2 + range;
    if (distance > reach) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    /* Tarikan MELEMAH seiring jarak, bukan tetap. Tarikan konstan membuat
       tombol menempel ke kursor bahkan di tepi jangkauan, yang terbaca sebagai
       macet alih-alih sebagai magnet. */
    const falloff = 1 - distance / reach;
    rawX.set((dx / reach) * PULL * falloff * 2);
    rawY.set((dy / reach) * PULL * falloff * 2);
  }

  function reset() {
    rawX.set(0);
    rawY.set(0);
  }

  /* Gerak dikurangi: pembungkus menjadi transparan sepenuhnya. Bukan versi
     yang lebih lembut — yang diminta adalah tidak ada gerak. */
  if (reduced) return <span className={cn('inline-block', className)}>{children}</span>;

  return (
    <motion.span
      ref={host}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn('inline-block will-change-transform', className)}
    >
      {children}
    </motion.span>
  );
}
