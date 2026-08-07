'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Repeat, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { formatDate, formatIdr } from '@/lib/format';
import { keys, ledger, type Transaction } from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

export default function DasborPage() {
  const q = useQuery({ queryKey: keys.dashboard, queryFn: ledger.dashboard });

  if (q.isPending) return <DashboardSkeleton />;
  if (q.isError) {
    return (
      <ErrorState
        error={q.error}
        onRetry={() => {
          void q.refetch();
        }}
      />
    );
  }

  const d = q.data;
  const belumAdaApaPun = d.accounts.length === 0 && d.recent.length === 0;

  if (belumAdaApaPun) {
    return (
      <EmptyState
        title="Mulai dari satu dompet"
        description="Tambahkan dompet pertamamu — kas, rekening bank, atau e-wallet. Setelah itu setiap catatan masuk ke sini."
        action={<ButtonLink href="/dompet">Buat dompet</ButtonLink>}
      />
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.section
        variants={fadeUp}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Ringkasan bulan ini"
      >
        <Stat
          label="Kekayaan bersih"
          value={formatIdr(d.netWorth)}
          icon={<Wallet size={16} aria-hidden />}
          tone="neutral"
        />
        <Stat
          label="Pemasukan bulan ini"
          value={formatIdr(d.monthIncome)}
          icon={<TrendingUp size={16} aria-hidden />}
          tone="positive"
        />
        <Stat
          label="Pengeluaran bulan ini"
          value={formatIdr(d.monthExpense)}
          icon={<TrendingDown size={16} aria-hidden />}
          tone="negative"
          delta={d.expenseDelta}
        />
        <Stat
          label="Selisih"
          value={formatIdr(d.monthIncome - d.monthExpense)}
          icon={<Repeat size={16} aria-hidden />}
          tone={d.monthIncome - d.monthExpense >= 0 ? 'positive' : 'negative'}
        />
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} className="xl:col-span-2">
          <Card>
            <CardBody>
              <header className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-ink">Arus kas 30 hari</h2>
                <Link href="/analitik" className="text-xs text-muted hover:text-ink">
                  Lihat analitik
                </Link>
              </header>
              <AreaChart points={d.cashflow} label="Arus kas tiga puluh hari terakhir" />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              <h2 className="mb-4 text-sm font-semibold text-ink">Pengeluaran per kategori</h2>
              <DonutChart
                caption="Pengeluaran bulan ini per kategori"
                slices={d.topCategories.map((c) => ({
                  label: c.categoryName,
                  value: c.total,
                  color: c.color,
                }))}
              />
            </CardBody>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} className="xl:col-span-2">
          <Card>
            <CardBody>
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-ink">Transaksi terakhir</h2>
                <Link href="/transaksi" className="text-xs text-muted hover:text-ink">
                  Semua transaksi
                </Link>
              </header>

              {d.recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">Belum ada transaksi.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {d.recent.map((trx) => (
                    <TransactionRow key={trx.id} trx={trx} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold text-ink">Dompet</h2>
              <ul className="space-y-2.5">
                {d.accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: account.color ?? 'var(--color-primary)' }}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-muted">{account.name}</span>
                    <span className="tabular text-ink">{formatIdr(account.balance)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {d.budgets.length > 0 ? (
            <Card>
              <CardBody>
                <header className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-ink">Anggaran</h2>
                  <Link href="/anggaran" className="text-xs text-muted hover:text-ink">
                    Kelola
                  </Link>
                </header>
                <ul className="space-y-3">
                  {d.budgets.slice(0, 4).map((budget) => {
                    const ratio = Math.min(budget.spent / budget.amount, 1);
                    const lewat = budget.spent > budget.amount;

                    return (
                      <li key={budget.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted">
                            {d.topCategories.find((c) => c.categoryId === budget.categoryId)
                              ?.categoryName ?? 'Kategori'}
                          </span>
                          <span className={lewat ? 'text-[var(--color-danger)]' : 'text-muted'}>
                            {formatIdr(budget.spent)} / {formatIdr(budget.amount)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: lewat
                                ? 'var(--color-danger)'
                                : 'var(--color-primary)',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${String(ratio * 100)}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── bagian ──────────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'neutral' | 'positive' | 'negative';
  delta?: number | null;
}) {
  const toneClass = {
    neutral: 'text-ink',
    positive: 'text-[var(--color-success)]',
    negative: 'text-[var(--color-danger)]',
  }[tone];

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <span className={toneClass}>{icon}</span>
          {label}
        </div>
        <p className="text-xl font-semibold tabular tracking-tight text-ink">{value}</p>

        {/* `null` berarti belum ada bulan pembanding — bukan "tidak berubah". */}
        {delta === undefined || delta === null ? null : (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            {delta > 0 ? (
              <ArrowUpRight size={13} className="text-[var(--color-danger)]" aria-hidden />
            ) : (
              <ArrowDownLeft size={13} className="text-[var(--color-success)]" aria-hidden />
            )}
            {formatIdr(Math.abs(delta))} {delta > 0 ? 'lebih' : 'lebih hemat'} dari bulan lalu
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function TransactionRow({ trx }: { trx: Transaction }) {
  const sign = trx.kind === 'income' ? '+' : trx.kind === 'expense' ? '−' : '';
  const colour =
    trx.kind === 'income'
      ? 'text-[var(--color-success)]'
      : trx.kind === 'expense'
        ? 'text-ink'
        : 'text-muted';

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]"
        aria-hidden
      >
        {trx.kind === 'income' ? (
          <ArrowDownLeft size={15} className="text-[var(--color-success)]" />
        ) : trx.kind === 'transfer' ? (
          <Repeat size={15} className="text-muted" />
        ) : (
          <ArrowUpRight size={15} className="text-muted" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">
          {trx.merchant ?? trx.note ?? (trx.kind === 'transfer' ? 'Transfer' : 'Transaksi')}
        </p>
        <p className="text-xs text-faint">{formatDate(trx.occurredAt)}</p>
      </div>

      <span className={`shrink-0 text-sm tabular ${colour}`}>
        {sign}
        {formatIdr(trx.amount)}
      </span>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-64 xl:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <span className="sr-only">Memuat dasbor</span>
    </div>
  );
}
