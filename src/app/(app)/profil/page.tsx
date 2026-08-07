'use client';

import { useQuery } from '@tanstack/react-query';
import { Mail, ShieldCheck, User as UserIcon } from 'lucide-react';

import { useSession } from '@/components/session-provider';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/state';
import { keys, ledger } from '@/lib/ledger';
import { formatIdr } from '@/lib/format';

/**
 * Profil.
 *
 * Menampilkan apa yang benar-benar diketahui backend tentang pengguna —
 * `id`, `email`, `fullName` — dan tidak satu pun kolom yang belum ada
 * endpoint-nya. Kolom yang tampil tetapi tidak bisa disimpan lebih buruk
 * daripada kolom yang belum ada.
 */
export default function ProfilPage() {
  const session = useSession();
  const summary = useQuery({ queryKey: keys.dashboard, queryFn: ledger.dashboard });

  if (session.status !== 'masuk') return null;

  const initials = session.user.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardBody>
          <div className="flex items-center gap-4">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[var(--surface-3)] text-lg font-semibold text-ink"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                {session.user.fullName}
              </h2>
              <p className="truncate text-sm text-muted">{session.user.email}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
            <div className="flex items-start gap-3">
              <UserIcon size={16} className="mt-0.5 shrink-0 text-dim" aria-hidden />
              <div>
                <dt className="text-muted">Nama lengkap</dt>
                <dd className="text-ink">{session.user.fullName}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail size={16} className="mt-0.5 shrink-0 text-dim" aria-hidden />
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="text-ink">{session.user.email}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-dim" aria-hidden />
              <div>
                <dt className="text-muted">Status akun</dt>
                <dd className="text-ink">Terverifikasi</dd>
              </div>
            </div>
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <ButtonLink href="/keamanan" variant="secondary" size="sm">
              Buka Pusat Keamanan
            </ButtonLink>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-ink">Ringkasan</h2>

          {summary.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : summary.isError ? (
            <p className="text-sm text-muted">Ringkasan tidak dapat dimuat.</p>
          ) : (
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Kekayaan bersih</dt>
                <dd className="text-lg font-semibold tabular text-ink">
                  {formatIdr(summary.data.netWorth)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Dompet aktif</dt>
                <dd className="text-lg font-semibold tabular text-ink">
                  {summary.data.accounts.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Tujuan berjalan</dt>
                <dd className="text-lg font-semibold tabular text-ink">
                  {summary.data.goals.filter((g) => !g.achieved).length}
                </dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
