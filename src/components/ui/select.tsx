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

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: SelectOption[];
  error?: string | undefined;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, placeholder, className, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-galat`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
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
            'w-full appearance-none rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 pr-10',
            'text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-150',
            'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40',
            error
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--line)] focus-visible:border-[var(--color-primary)]',
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
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
});
