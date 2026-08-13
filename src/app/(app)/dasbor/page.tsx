'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Repeat, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

import { AreaChart } from '@/components/charts/area-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { PageHeader } from '@/components/shell/page-header';
import { QuickActions } from '@/components/shell/quick-actions';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { Stat } from '@/components/ui/stat';
import { rasioPengeluaran } from '@/lib/delta';
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
      <PageHeader title="Dasbor" description="Ringkasan keuanganmu bulan ini." />
      {/*
        HIERARKI, bukan empat kotak sama besar.

        Empat ubin berukuran identik memaksa mata memilih sendiri harus mulai
        dari mana, dan pilihan itu sering salah. Kekayaan bersih adalah SATU
        H1 layar ini (DESIGN §6): kuningan, dua kali lebih lebar, dan angkanya
        lebih besar. Tiga sisanya turun satu tingkat dan memakai warna
        semantik — arah uang, bukan peringkat.
      */}
      <motion.section
        variants={stagger}
        /*
          DUA BARIS, bukan satu deret ubin sama besar.

          Percobaan pertama memakai satu grid enam kolom dengan H1 selebar
          tiga. Angkanya TERPOTONG: "Rp 4.723.000" dalam mono 28px menuntut
          sekitar 310px, sementara kolom sempitnya hanya memberi 175px. Uang
          yang terpotong bukan masalah estetika — ia salah baca.

          Susunan ini memberi H1 satu baris penuh untuk dirinya, lalu tiga
          angka pendukung berbagi baris kedua dengan lebar 1/3 masing-masing —
          cukup untuk nominal terpanjang yang mungkin muncul.
        */
        className="grid gap-4"
        aria-label="Ringkasan bulan ini"
      >
        <Stat
          label="Kekayaan bersih"
          value={d.netWorth}
          format={formatIdr}
          tone="value"
          hero
          icon={<Wallet size={16} aria-hidden />}
          hint={`Dihitung dari ${String(d.accounts.length)} dompet`}
        />

        <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Masuk bulan ini"
          value={d.monthIncome}
          format={formatIdr}
          tone={d.monthIncome > 0 ? 'positive' : 'neutral'}
          icon={<TrendingUp size={16} aria-hidden />}
        />
        <Stat
          label="Keluar bulan ini"
          value={d.monthExpense}
          format={formatIdr}
          tone={d.monthExpense > 0 ? 'negative' : 'neutral'}
          icon={<TrendingDown size={16} aria-hidden />}
          delta={rasioPengeluaran(d.monthExpense, d.expenseDelta)}
          /* Naiknya pengeluaran BUKAN kabar baik — dan panah hijau di atas
             angka yang membengkak adalah kesalahan yang paling sering dibuat
             justru karena hijau terasa seperti pilihan yang aman. */
          positiveIsGood={false}
          hint={
            d.expenseDelta === null
              ? 'Belum ada pembanding'
              : `${formatIdr(Math.abs(d.expenseDelta))} ${d.expenseDelta > 0 ? 'lebih' : 'lebih hemat'}`
          }
        />
        <Stat
          label="Selisih"
          value={d.monthIncome - d.monthExpense}
          format={formatIdr}
          tone={d.monthIncome - d.monthExpense >= 0 ? 'positive' : 'negative'}
          icon={<Repeat size={16} aria-hidden />}
          hint={d.monthIncome - d.monthExpense >= 0 ? 'Surplus' : 'Defisit'}
        />
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div variants={fadeUp} className="xl:col-span-2">
          <Card>
            <CardBody>
              <CardHeader
                title="Arus kas 30 hari"
                action={
                  <Link href="/analitik" className="card-action text-xs text-muted hover:text-ink">
                    Lihat analitik
                  </Link>
                }
              />
              <AreaChart points={d.cashflow} label="Arus kas tiga puluh hari terakhir" />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardBody>
              <CardHeader title="Pengeluaran per kategori" />
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
              <CardHeader
                title="Transaksi terakhir"
                action={
                  <Link href="/transaksi" className="card-action text-xs text-muted hover:text-ink">
                    Semua transaksi
                  </Link>
                }
              />

              {d.recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-dim">Belum ada transaksi.</p>
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
              <CardHeader title="Dompet" />
              <ul className="space-y-2.5">
                {d.accounts.map((account) => (
                  <li key={account.id} className="flex items-center gap-2.5 text-sm">
                    {/* Cadangannya BUKAN hologram. Titik ini muncul sekali per
                        dompet, dan DESIGN §1.3 membatasi hologram pada satu
                        permukaan aktif per layar — tiga dompet saja sudah
                        melanggarnya tiga kali lipat. */}
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: account.color ?? 'var(--color-identity-none)' }}
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
                <CardHeader
                  title="Anggaran"
                  action={
                    <Link href="/anggaran" className="card-action text-xs text-muted hover:text-ink">
                      Kelola
                    </Link>
                  }
                />
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
                          <span className={lewat ? 'text-[var(--color-negative)]' : 'text-muted'}>
                            {formatIdr(budget.spent)} / {formatIdr(budget.amount)}
                          </span>
                        </div>
                        {/* Tiga tingkat yang SAMA PERSIS dengan halaman
                            Anggaran. Sebelumnya dasbor hanya mengenal dua —
                            lewat atau tidak — sehingga anggaran di 99% terlihat
                            setenang anggaran di 10%, dan justru pada ambang
                            itulah peringatan paling berguna.

                            Keadaan tenang netral, bukan hologram: isyaratnya
                            dibawa merah dan kuning, dan keduanya hanya bekerja
                            kalau sisanya diam. */}
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: lewat
                                ? 'var(--color-negative)'
                                : ratio > 0.85
                                  ? 'var(--color-caution)'
                                  : 'var(--color-identity-none)',
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

      {/* Aksi cepat DI BAWAH, dan itu bukan kompromi tata letak. Dasbor
          menjawab "bagaimana keadaanku" lebih dulu; pintu ke halaman lain
          berguna sesudah pertanyaan itu terjawab, bukan sebelumnya. */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardBody>
            <CardHeader title="Aksi cepat" />
            <QuickActions />
          </CardBody>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ── bagian ──────────────────────────────────────────────────────────── */

function TransactionRow({ trx }: { trx: Transaction }) {
  const sign = trx.kind === 'income' ? '+' : trx.kind === 'expense' ? '−' : '';
  const colour =
    trx.kind === 'income'
      ? 'text-[var(--color-positive)]'
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
          <ArrowDownLeft size={15} className="text-[var(--color-positive)]" />
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
        <p className="text-xs text-dim">{formatDate(trx.occurredAt)}</p>
      </div>

      <span className={`numeric shrink-0 text-sm ${colour}`}>
        {sign}
        {formatIdr(trx.amount)}
      </span>
    </li>
  );
}

/**
 * Kerangka muat.
 *
 * Bentuknya WAJIB sama dengan isinya. Sebelum ini ia menggambar empat ubin sama
 * besar dalam satu deret (`xl:grid-cols-4`), sementara yang datang kemudian
 * adalah satu ubin H1 selebar penuh ditambah tiga ubin di baris kedua — jadi
 * begitu data tiba, seluruh halaman melompat.
 *
 * Kerangka yang berbeda bentuk dari isinya lebih buruk daripada tidak ada
 * kerangka sama sekali: ia menjanjikan tata letak yang tidak akan pernah datang,
 * dan pembacanya sudah mulai mengarahkan mata ke tempat yang salah.
 *
 * CATATAN JUJUR: strukturnya kini sama, tetapi tingginya masih perkiraan yang
 * diturunkan dari kotak `Stat` — belum diukur di peramban, karena dasbor
 * menuntut sesi login dan backend-nya belum berjalan. Sisa pergeserannya kecil
 * dan tegak saja, bukan perubahan susunan.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4">
        <Skeleton className="h-[8.5rem] sm:h-[9.25rem]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[7.75rem]" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 xl:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-64 xl:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <span className="sr-only">Memuat dasbor</span>
    </div>
  );
}
