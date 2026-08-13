'use client';

import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Pilihan.
 *
 * `<select>` asli, bukan menu buatan sendiri. Menu buatan sendiri kehilangan
 * roda gulir asli, pencarian ketik-huruf, dan pemilih layar penuh di ponsel —
 * tiga hal yang tidak pernah dilaporkan hilang tetapi selalu terasa.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'size'> {
  label: string;
  options: SelectOption[];
  error?: string | undefined;
  placeholder?: string;
  /**
   * Sembunyikan label secara VISUAL, bukan dari pembaca layar.
   *
   * Dipakai ketika kontrolnya adalah PENYARING, bukan isian formulir. Label
   * `text-sm font-medium text-ink` di atas setiap penyaring punya bobot visual
   * yang sama persis dengan judul kartu di bawahnya — jadi baris penyaring
   * bersaing dengan isi halaman, padahal ia hanya alat untuk mempersempitnya.
   *
   * `sr-only` dan bukan penghapusan: kontrol tanpa nama yang dapat diakses
   * hanyalah kotak yang tidak bisa dijelaskan pembaca layar.
   */
  hideLabel?: boolean;
  /** `sm` untuk baris penyaring; `md` (bawaan) untuk formulir. */
  scale?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, placeholder, className, hideLabel = false, scale = 'md', ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-galat`;
  const kecil = scale === 'sm';

  return (
    <div className={cn(hideLabel ? undefined : 'space-y-1.5')}>
      <label
        htmlFor={id}
        className={cn(
          hideLabel ? 'sr-only' : 'block text-sm font-medium text-ink',
        )}
      >
        {label}
      </label>

      <div className="relative">
        <select
          {...rest}
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full appearance-none rounded-xl border bg-[var(--surface)]',
            'text-ink outline-none transition-[border-color,box-shadow] duration-150',
            'focus-visible:ring-2 focus-visible:ring-[var(--color-holo)]/40',
            /* Tinggi 40px pada varian kecil — sama dengan `Button` size `sm`,
               supaya penyaring dan tombol di baris yang sama berbaris rata
               alih-alih meleset beberapa piksel. */
            kecil ? 'h-10 px-3 pr-9 text-sm' : 'px-3.5 py-2.5 pr-10 text-[15px]',
            error
              ? 'border-[var(--color-negative)]'
              : 'border-[var(--line)] focus-visible:border-[var(--color-holo)]',
            className,
          )}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={kecil ? 15 : 16}
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted',
            kecil ? 'right-3' : 'right-3.5',
          )}
          aria-hidden
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-negative)]">
          {error}
        </p>
      ) : null}
    </div>
  );
});
