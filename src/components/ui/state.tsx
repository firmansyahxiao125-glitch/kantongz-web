'use client';

import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { cn } from '@/lib/cn';

/**
 * Tiga keadaan yang setiap layar berdata punya: memuat, gagal, kosong.
 *
 * Dijadikan komponen karena layar yang menuliskannya sendiri-sendiri akan
 * melewatkan salah satunya — dan yang paling sering terlewat adalah "kosong",
 * yang lalu tampil sebagai halaman putih tanpa penjelasan.
 */

/**
 * Kerangka muat.
 *
 * Sapuan kilau, bukan denyut. Denyut meredupkan seluruh blok serentak dan
 * terbaca sebagai elemen rusak; sapuan yang bergerak terbaca sebagai sesuatu
 * yang sedang datang — dan itu memang yang sedang terjadi.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} aria-hidden />;
}

/**
 * Kerangka yang menyerupai bentuk isinya.
 *
 * Kotak abu-abu seragam memaksa tata letak melompat begitu data tiba. Kerangka
 * yang tingginya sudah benar membuat kedatangan data tidak menggeser apa pun —
 * dan pergeseran tata letak adalah cacat yang paling terasa justru pada koneksi
 * paling lambat.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        /* Baris terakhir lebih pendek — paragraf sungguhan berakhir begitu. */
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  );
}

export function Loading({ label = 'Memuat' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16 text-muted" aria-busy="true">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="grid place-items-center gap-3 py-14 text-center" role="alert">
      <AlertTriangle className="size-6 text-[var(--color-danger)]" aria-hidden />
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        {isApiError(error) ? messageFor(error.code) : messageFor('unknown')}
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 py-14 text-center">
      <Inbox className="size-6 text-faint" aria-hidden />
      <p className="font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
