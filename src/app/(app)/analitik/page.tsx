'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
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
      <PageHeader title="Analitik" description="Tren arus kas dan komposisi pengeluaran per periode.">
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
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
        </motion.div>
      </PageHeader>

      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            {/* Titik di sini menamai deret yang SAMA dengan yang digambar
                `AreaChart`, jadi warnanya wajib ikut. Ketika grafiknya berhenti
                memakai hologram untuk kedua deret, dua titik ini tertinggal —
                terlihat di peramban sebagai empat titik legenda pada satu kartu,
                dua di antaranya menamai garis dengan warna yang bukan warnanya.
                Legenda yang salah warna lebih buruk daripada tanpa legenda.

                `numeric` menggantikan `tabular`: nominal di sini uang, sama
                seperti di seluruh halaman lain. */}
            <CardHeader className="flex-wrap gap-3">
              <CardTitle>Arus kas</CardTitle>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full bg-[var(--color-positive)]" aria-hidden />
                  Masuk <span className="numeric text-ink">{formatIdr(totalIn)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-full bg-[var(--color-negative)]" aria-hidden />
                  Keluar <span className="numeric text-ink">{formatIdr(totalOut)}</span>
                </span>
              </div>
            </CardHeader>

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
                <p className="py-8 text-center text-sm text-dim">Belum ada dompet.</p>
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
                                  : (account.color ?? 'var(--color-identity-none)'),
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
