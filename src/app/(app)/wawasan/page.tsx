'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Repeat, TrendingDown, Wand2 } from 'lucide-react';

import { Sparkline } from '@/components/charts/sparkline';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { formatDate, formatIdr } from '@/lib/format';
import {
  intelligence,
  intelligenceKeys,
  keys,
  type Insight,
  type InsightSeverity,
} from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Wawasan. ROADMAP M9, M10, M12.
 *
 * Setiap kartu menampilkan `reason` — angka yang mendasarinya — di bawah
 * kalimatnya. Itu bukan hiasan: saran keuangan yang tidak dapat dijelaskan
 * tidak akan dipercaya, dan yang tidak dipercaya akan dimatikan bersama seluruh
 * notifikasi lainnya.
 */

const TONE: Record<InsightSeverity, { border: string; text: string; icon: typeof Info }> = {
  critical: {
    border: 'border-[var(--color-negative)]/40',
    text: 'text-[var(--color-negative)]',
    icon: AlertTriangle,
  },
  warning: {
    border: 'border-[var(--color-caution)]/40',
    text: 'text-[var(--color-caution)]',
    icon: AlertTriangle,
  },
  info: { border: 'border-line', text: 'text-muted', icon: Info },
};

export default function WawasanPage() {
  const client = useQueryClient();

  const digest = useQuery({ queryKey: intelligenceKeys.insights, queryFn: intelligence.insights });
  const suggestions = useQuery({
    queryKey: intelligenceKeys.suggestions,
    queryFn: intelligence.suggestions,
  });

  const apply = useMutation({
    mutationFn: ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) =>
      intelligence.applySuggestion(transactionId, categoryId),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: intelligenceKeys.suggestions }),
        client.invalidateQueries({ queryKey: intelligenceKeys.insights }),
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
    },
  });

  if (digest.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (digest.isError) {
    return (
      <ErrorState
        error={digest.error}
        onRetry={() => {
          void digest.refetch();
        }}
      />
    );
  }

  const { insights, projection, recurring } = digest.data;
  const usulan = suggestions.data ?? [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <PageHeader
        title="Wawasan"
        description="Pengeluaran janggal, langganan yang tampak terlupakan, dan anggaran yang mendekati batas."
      />

      {insights.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              <EmptyState
                title="Belum ada yang perlu diperhatikan"
                description="Wawasan muncul saat ada pengeluaran janggal, langganan yang tampak tidak terpakai, anggaran yang hampir jebol, atau saldo yang menuju nol."
              />
            </CardBody>
          </Card>
        </motion.div>
      ) : (
        <motion.ul variants={stagger} className="space-y-3">
          {insights.map((insight) => (
            <motion.li key={insight.id} variants={fadeUp}>
              <InsightCard insight={insight} />
            </motion.li>
          ))}
        </motion.ul>
      )}

      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-muted" aria-hidden />
                <CardTitle>Proyeksi arus kas</CardTitle>
              </div>
            </CardHeader>

            {!projection.reliable ? (
              /* `reliable: false` dinyatakan terbuka, bukan disamarkan sebagai
                 proyeksi berpita lebar yang tetap ditampilkan seolah bermakna. */
              <p className="text-sm leading-relaxed text-muted">
                Datamu belum cukup untuk proyeksi yang bermakna — baru{' '}
                {projection.basisDays} hari tercatat. Catat transaksi selama dua pekan lagi.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Arus bersih{' '}
                  <span
                    className={`numeric ${projection.dailyNet < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-positive)]'}`}
                  >
                    {formatIdr(projection.dailyNet)}
                  </span>{' '}
                  per hari, dari {projection.basisDays} hari terakhir.
                </p>

                {/* Bentuk lintasannya lebih dulu, angkanya sesudah. Deret ini
                    dimulai dari saldo sekarang supaya kemiringannya jujur —
                    grafik yang dimulai dari titik proyeksi pertama menyembunyikan
                    seberapa jauh perjalanannya dari hari ini. */}
                <Sparkline
                  className="mt-4 h-10"
                  values={[projection.startingBalance, ...projection.points.map((p) => p.expected)]}
                  stroke={
                    projection.dailyNet < 0 ? 'var(--color-negative)' : 'var(--color-positive)'
                  }
                />

                <ul className="mt-4 space-y-3">
                  {projection.points.map((point) => (
                    <li key={point.horizonDays}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted">{point.horizonDays} hari</span>
                        <span className="numeric text-ink">{formatIdr(point.expected)}</span>
                      </div>
                      {/* Pita ketidakpastian ditampilkan, bukan disembunyikan.
                          Angka tunggal pada proyeksi keuangan terlihat tepat dan
                          tidak pernah tepat. */}
                      <p className="numeric text-xs text-dim">
                        {formatIdr(point.low)} – {formatIdr(point.high)}
                      </p>
                    </li>
                  ))}
                </ul>

                {projection.daysUntilEmpty === null ? null : (
                  <p className="mt-4 rounded-xl border border-[var(--color-negative)]/30 bg-[var(--color-negative)]/10 px-3.5 py-3 text-sm text-[var(--color-negative)]">
                    Dengan pola sekarang, saldomu habis dalam {projection.daysUntilEmpty} hari.
                  </p>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {recurring.length > 0 ? (
        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Repeat size={16} className="text-muted" aria-hidden />
                  <CardTitle>Tagihan berulang</CardTitle>
                </div>
              </CardHeader>

              <ul className="divide-y divide-[var(--line)]">
                {recurring.map((charge) => (
                  <li key={charge.merchant} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{charge.merchant}</p>
                      <p className="text-xs text-dim">
                        Tiap {charge.intervalDays} hari · {charge.occurrences} kali · terakhir{' '}
                        {formatDate(charge.lastChargedAt)}
                      </p>
                    </div>
                    <span className="numeric shrink-0 text-sm text-ink">
                      {formatIdr(charge.monthlyCost)}
                      <span className="text-dim">/bln</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </motion.div>
      ) : null}

      {usulan.length > 0 ? (
        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              {/* `mb-1` menahan jarak bawaan: yang menyusul BUKAN isi kartu
                  melainkan kalimat penjelas judulnya sendiri, dan judul yang
                  menjauh dari penjelasnya terbaca sebagai dua hal. */}
              <CardHeader className="mb-1">
                <div className="flex items-center gap-2">
                  <Wand2 size={16} className="text-muted" aria-hidden />
                  <CardTitle>Usulan kategori</CardTitle>
                </div>
              </CardHeader>
              <p className="mb-3 text-sm text-muted">
                Diterapkan satu per satu, bukan otomatis — kategorisasi yang berubah sendiri membuat
                laporan bulan lalu berbeda setiap kali dibuka.
              </p>

              <ul className="divide-y divide-[var(--line)]">
                {usulan.map((s) => (
                  <li key={s.transactionId} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{s.categoryName}</p>
                      <p className="text-xs text-dim">{s.reason}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={apply.isPending && apply.variables?.transactionId === s.transactionId}
                      onClick={() => {
                        apply.mutate({
                          transactionId: s.transactionId,
                          categoryId: s.categoryId,
                        });
                      }}
                    >
                      Terapkan
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const tone = TONE[insight.severity];
  const Icon = tone.icon;

  return (
    <Card className={tone.border}>
      <CardBody>
        <div className="flex items-start gap-3">
          <Icon size={17} className={`mt-0.5 shrink-0 ${tone.text}`} aria-hidden />
          <div className="min-w-0">
            {/* `CardTitle` (h2) dan bukan `h3`: setiap wawasan adalah kartunya
                sendiri, jadi tingkatnya sama dengan judul kartu mana pun.
                `h3` di sini melompati satu tingkat dari `h1` halaman. */}
            <CardTitle>{insight.title}</CardTitle>
            <p className="mt-1 text-sm leading-relaxed text-muted">{insight.body}</p>
            {/* MENGAPA wawasan ini muncul. Wawasan tanpa ini adalah tebakan yang
                menyamar sebagai analisis. */}
            <p className="mt-2 text-xs leading-relaxed text-dim">{insight.reason}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
