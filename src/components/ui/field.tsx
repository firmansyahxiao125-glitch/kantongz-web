'use client';

import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Isian teks berlabel.
 *
 * Label adalah `<label htmlFor>` sungguhan, bukan placeholder. Placeholder
 * hilang begitu diketik, dan formulir yang labelnya hilang saat diisi tidak
 * dapat diperiksa ulang oleh siapa pun — termasuk pembaca layar.
 */

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, className, type = 'text', ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-galat`;
  const hintId = `${id}-petunjuk`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)]">
        {label}
      </label>

      <div className="relative">
        <input
          {...rest}
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length > 0 ? describedBy : undefined}
          className={cn(
            'w-full rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-[15px] text-[var(--ink)]',
            'placeholder:text-[var(--ink-dim)] transition-[border-color,box-shadow] duration-150',
            'outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-holo)]/40',
            error
              ? 'border-[var(--color-negative)] focus-visible:border-[var(--color-negative)]'
              : 'border-[var(--line)] focus-visible:border-[var(--color-holo)]',
            isPassword && 'pr-11',
            className,
          )}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => {
              setRevealed((v) => !v);
            }}
            /* Bukan `aria-pressed`: yang penting bagi pembaca layar adalah apa
               yang akan terjadi, bukan keadaan tombolnya. */
            aria-label={revealed ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-holo)]/40"
          >
            {revealed ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-[var(--ink-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          /* `role="alert"` mengumumkannya saat muncul — pesan galat yang hanya
             terlihat mata tidak sampai ke pengguna pembaca layar. */
          role="alert"
          className="flex items-start gap-1.5 text-xs text-[var(--color-negative)]"
        >
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
});
