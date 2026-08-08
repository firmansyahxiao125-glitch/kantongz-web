'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

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
 *
 * ── MENGAPA TIDAK MEMAKAI PUSTAKA GERAK LAGI ───────────────────────────
 *
 * Versi sebelumnya memakai `useSpring` milik Framer Motion, dan itu satu-
 * satunya alasan pustaka gerak seberat itu ikut ke potongan halaman muka.
 * Yang dibutuhkan sebenarnya cuma dua angka dan sebuah transisi CSS.
 *
 * Posisinya ditulis LANGSUNG ke gaya sebaris lewat ref, bukan lewat state:
 * `pointermove` menyala puluhan kali per detik, dan satu render React per
 * peristiwa adalah harga yang tidak perlu dibayar untuk menggeser delapan
 * piksel. Satu-satunya state di sini adalah preferensi gerak, yang berubah
 * paling banyak sekali seumur halaman.
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
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduced(media.matches);
    };
    sync();
    media.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
    };
  }, []);

  function move(x: number, y: number) {
    const el = host.current;
    if (el) el.style.translate = x === 0 && y === 0 ? '' : `${String(x)}px ${String(y)}px`;
  }

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
      move(0, 0);
      return;
    }

    /* Tarikan MELEMAH seiring jarak, bukan tetap. Tarikan konstan membuat
       tombol menempel ke kursor bahkan di tepi jangkauan, yang terbaca sebagai
       macet alih-alih sebagai magnet. */
    const falloff = 1 - distance / reach;
    move((dx / reach) * PULL * falloff * 2, (dy / reach) * PULL * falloff * 2);
  }

  /* Gerak dikurangi: pembungkus menjadi transparan sepenuhnya. Bukan versi
     yang lebih lembut — yang diminta adalah tidak ada gerak. */
  if (reduced) return <span className={cn('inline-block', className)}>{children}</span>;

  return (
    <span
      ref={host}
      onPointerMove={handleMove}
      onPointerLeave={() => {
        move(0, 0);
      }}
      /* Transisi pendek, BUKAN pegas. Pegas dipakai dulu karena kursor berbalik
         arah puluhan kali per detik dan transisi berdurasi panjang akan
         memulai ulang setiap kali. Pada 120 ms, memulai ulang tidak terlihat —
         dan yang tersisa adalah gerak yang mengikuti kursor tanpa tertinggal. */
      className={cn(
        'inline-block will-change-transform',
        'transition-[translate] duration-[var(--dur-instant)] ease-[var(--ease-out)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
