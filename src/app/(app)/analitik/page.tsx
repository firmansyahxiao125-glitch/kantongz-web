'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { formatIdr } from '@/lib/format';
import { keys, ledger } from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

type Window = { label: string; days?: number; months?: number };

const WINDOWS: Window[] = [
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
  { label: '12 bulan', months: 12 },
];

export default function AnalitikPage() {
  const [index, setIndex] = useState(0);
  const window = WINDOWS[index] ?? WINDOWS[0];
  const params = window?.months === undefined ? { days: window?.days } : { months: window.months };

  const flow = useQuery({
    queryKey: keys.cashflow(params),
    queryFn: () => ledger.cashflow(params),
  });

  const summary = useQuery({ queryKey: keys.dashboard, queryFn: ledger.dashboard });

  const points = flow.data ?? [];
  const totalIn = points.reduce((sum, p) => sum + p.income, 0);
  const totalOut = points.reduce((sum, p) => sum + p.expense, 0);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={fadeUp} className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w, i) => (
          <Button
            key={w.label}
            size="sm"
            variant={i === index ? 'primary' : 'secondary'}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
            }}
          >
            {w.label}
          </Button>
        ))}
      </motion.header>

      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Arus kas</h2>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full bg-[var(--color-holo)]" aria-hidden />
                  Masuk <span className="tabular text-ink">{formatIdr(totalIn)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full bg-[var(--color-holo)]" aria-hidden />
                  Keluar <span className="tabular text-ink">{formatIdr(totalOut)}</span>
                </span>
              </div>
            </header>

            {flow.isPending ? (
              <Skeleton className="h-50" />
            ) : flow.isError ? (
              <ErrorState
                error={flow.error}
                onRetry={() => {
                  void flow.refetch();
                }}
              />
            ) : (
              <AreaChart points={points} label={`Arus kas ${window?.label ?? ''}`} />
            )}
          </CardBody>
        </Card>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardBody>
              <h2 className="mb-4 text-sm font-semibold text-ink">
                Pengeluaran per kategori bulan ini
              </h2>
              {summary.isPending ? (
                <Skeleton className="h-40" />
              ) : summary.isError ? (
                <ErrorState
                  error={summary.error}
                  onRetry={() => {
                    void summary.refetch();
                  }}
                />
              ) : (
                <DonutChart
                  caption="Pengeluaran bulan ini per kategori"
                  slices={summary.data.topCategories.map((c) => ({
                    label: c.categoryName,
                    value: c.total,
                    color: c.color,
                  }))}
                />
              )}
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardBody>
              <h2 className="mb-4 text-sm font-semibold text-ink">Saldo per dompet</h2>

              {summary.isPending ? (
                <Skeleton className="h-40" />
              ) : summary.isError ? null : summary.data.accounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">Belum ada dompet.</p>
              ) : (
                <ul className="space-y-3">
                  {summary.data.accounts.map((account) => {
                    const biggest = Math.max(
                      1,
                      ...summary.data.accounts.map((a) => Math.abs(a.balance)),
                    );
                    const ratio = Math.abs(account.balance) / biggest;

                    return (
                      <li key={account.id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="truncate text-muted">{account.name}</span>
                          <span
                            className={`tabular ${account.balance < 0 ? 'text-[var(--color-negative)]' : 'text-ink'}`}
                          >
                            {formatIdr(account.balance)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background:
                                account.balance < 0
                                  ? 'var(--color-negative)'
                                  : (account.color ?? 'var(--color-holo)'),
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
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
