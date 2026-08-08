'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Tombol.
 *
 * Satu komponen, empat varian. Tombol yang dibuat ulang per layar akan berbeda
 * tinggi, radius, dan perilaku fokusnya — dan perbedaan itu yang paling cepat
 * membuat antarmuka terbaca murah.
 *
 * ── AKSI UTAMA ADALAH KUNINGAN ─────────────────────────────────────────
 *
 * DESIGN §1.4 menyebutnya aturan paling ketat di seluruh dokumen: kuningan
 * hanya pada angka uang dan aksi utama. Varian `primary` sempat memakai warna
 * hologram — dan itu menghabiskan isyarat yang seharusnya dimiliki uang. Ketika
 * satu-satunya benda hangat di layar yang dingin adalah uangmu dan tombol yang
 * memindahkannya, mata tahu ke mana harus pergi tanpa dipandu.
 *
 * `accent` DIHAPUS, bukan diperbaiki. Ia hidup untuk memberi cara kedua
 * menandai aksi penting, dan cara kedua adalah tepat masalahnya: dua varian
 * "penting" berarti tidak ada yang penting.
 */
const button = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-[var(--radius-md)] font-medium select-none',
    'transition-[transform,background-color,border-color,box-shadow,opacity]',
    'duration-150 ease-out',
    'active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-45',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-brass)] text-[var(--color-brass-ink)]',
          /* Sorot dalam di tepi atas + pendar hangat di bawah. Keduanya meniru
             pelat kuningan yang menangkap cahaya dari atas: yang pertama
             memberinya tepi, yang kedua memberinya massa. */
          'shadow-[0_1px_0_0_rgb(255_244_220/0.45)_inset,0_10px_28px_-10px_rgb(200_148_64/0.65)]',
          'hover:bg-[var(--color-brass-bright)]',
        ].join(' '),
        secondary: [
          'bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line-strong)]',
          'hover:bg-[var(--surface-2)]',
        ].join(' '),
        ghost: 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]',
        danger: [
          'bg-[var(--color-negative)]/12 text-[var(--color-negative)]',
          'border border-[var(--color-negative)]/35 hover:bg-[var(--color-negative)]/20',
        ].join(' '),
      },
      size: {
        /* Tidak ada ukuran di bawah 40px. Target sentuh yang lebih kecil
           gagal pada jari, dan gagal diam-diam. */
        sm: 'h-10 px-3.5 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-[15px]',
        icon: 'h-10 w-10',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

/** Diekspor supaya tautan yang berperan sebagai tombol memakai gaya yang SAMA,
 *  bukan gaya yang mirip. Yang mirip akan menyimpang. */
export const buttonStyle = button;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, icon, iconRight, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size, block }), className)}
      disabled={disabled ?? loading}
      /* Pembaca layar diberi tahu tombol sedang bekerja. Tanpa ini, pengguna
         tunanetra menekan lalu tidak tahu apakah ada yang terjadi. */
      aria-busy={loading ?? false}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {loading ? null : iconRight}
    </button>
  );
});
