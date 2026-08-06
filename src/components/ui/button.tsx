'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Tombol.
 *
 * Satu komponen, lima varian. Tombol yang dibuat ulang per layar akan berbeda
 * tinggi, radius, dan perilaku fokusnya — dan perbedaan itu yang paling cepat
 * membuat antarmuka terbaca murah.
 */
const button = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-xl font-medium select-none',
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
          'bg-[var(--color-primary)] text-white',
          'shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_8px_24px_-8px_rgb(59_130_246/0.6)]',
          'hover:brightness-110',
        ].join(' '),
        accent: [
          'bg-[var(--color-accent)] text-[#04201c]',
          'shadow-[0_1px_0_0_rgb(255_255_255/0.25)_inset,0_8px_24px_-8px_rgb(0_245_212/0.5)]',
          'hover:brightness-110',
        ].join(' '),
        secondary: [
          'bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line-strong)]',
          'hover:bg-[var(--surface-2)]',
        ].join(' '),
        ghost: 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]',
        danger: [
          'bg-[var(--color-danger)]/12 text-[var(--color-danger)]',
          'border border-[var(--color-danger)]/35 hover:bg-[var(--color-danger)]/20',
        ].join(' '),
      },
      size: {
        /* Tidak ada ukuran di bawah 40px. Target sentuh yang lebih kecil
           gagal pada jari, dan gagal diam-diam. */
        sm: 'h-10 px-3.5 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

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
