'use client';

import { ArrowLeft } from 'lucide-react';
import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { AuthPanel } from '@/components/auth/auth-panel';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api';
import { messageFor, type PendingVerification } from '@/lib/contracts';

/**
 * Langkah kode verifikasi.
 *
 * Panjang kode datang dari server (`codeLength`), bukan dari konstanta di sini.
 * Backend yang suatu hari menerbitkan kode delapan digit tidak boleh memerlukan
 * penyebaran ulang frontend supaya kotaknya cukup.
 */
export function CodeStep({
  title,
  pending,
  submitLabel,
  onSubmit,
  onBack,
  children,
}: {
  title: string;
  pending: PendingVerification;
  submitLabel: string;
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array<string>(pending.codeLength).fill(''));
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');
  const complete = code.length === pending.codeLength;

  function focusBox(index: number): void {
    boxes.current[index]?.focus();
    boxes.current[index]?.select();
  }

  function write(index: number, value: string): void {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 0) return;

    setDigits((current) => {
      const next = [...current];
      /* Menempel dari tengah tetap mengisi ke kanan — pengguna yang menyalin
         kode dari email jarang mengklik kotak pertama lebih dulu. */
      for (let i = 0; i < clean.length && index + i < next.length; i += 1) {
        next[index + i] = clean[i] ?? '';
      }
      return next;
    });

    focusBox(Math.min(index + clean.length, pending.codeLength - 1));
  }

  function handleKey(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        if (next[index]) next[index] = '';
        else if (index > 0) next[index - 1] = '';
        return next;
      });
      if (!digits[index] && index > 0) focusBox(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) focusBox(index - 1);
    if (event.key === 'ArrowRight' && index < pending.codeLength - 1) focusBox(index + 1);
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>): void {
    event.preventDefault();
    write(index, event.clipboardData.getData('text'));
  }

  async function send(): Promise<void> {
    if (!complete || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await onSubmit(code);
    } catch (error) {
      setFailure(isApiError(error) ? messageFor(error.code) : messageFor('unknown'));
      setDigits(Array<string>(pending.codeLength).fill(''));
      focusBox(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPanel
      title={title}
      description={
        <>
          Kami mengirim {pending.codeLength} digit ke{' '}
          <span className="font-medium text-ink">{pending.maskedEmail}</span>.
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <FormAlert message={failure} />

        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              /* Posisi ADALAH identitas kotak: tidak ada yang disisipkan atau
                 diurutkan ulang, jadi indeks bukan kunci yang rapuh di sini. */
              key={index}
              ref={(node) => {
                boxes.current[index] = node;
              }}
              value={digit}
              onChange={(event) => {
                write(index, event.target.value);
              }}
              onKeyDown={(event) => {
                handleKey(index, event);
              }}
              onPaste={(event) => {
                handlePaste(index, event);
              }}
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={pending.codeLength}
              aria-label={`Digit ke-${String(index + 1)}`}
              autoFocus={index === 0}
              className="h-14 w-full rounded-xl border border-line bg-[var(--surface)] text-center text-xl font-semibold tabular text-ink outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--color-holo)] focus-visible:ring-2 focus-visible:ring-[var(--color-holo)]/35"
            />
          ))}
        </div>

        {children}

        <Button type="submit" size="lg" block loading={busy} disabled={!complete}>
          {submitLabel}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="mx-auto flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden />
          Kembali
        </button>
      </form>
    </AuthPanel>
  );
}
