'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormAlert } from '@/components/auth/form-alert';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { formatIdr } from '@/lib/format';
import { keys, ledger, type BudgetPeriod } from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

const PERIOD_LABEL: Record<BudgetPeriod, string> = {
  weekly: 'per pekan',
  monthly: 'per bulan',
  yearly: 'per tahun',
};

const schema = z.object({
  categoryId: z.string().min(1, 'Pilih kategorinya.'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  amount: z.coerce
    .number({ message: 'Masukkan batasnya.' })
    .int('Tulis dalam rupiah utuh, tanpa koma.')
    .positive('Batas harus lebih dari nol.'),
});

type Values = z.infer<typeof schema>;

export default function AnggaranPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);

  const budgets = useQuery({ queryKey: keys.budgets, queryFn: ledger.budgets });
  const categories = useQuery({ queryKey: keys.categories, queryFn: ledger.categories });

  const close = useMutation({
    mutationFn: (id: string) => ledger.closeBudget(id),
    onSuccess: async () => {
      /* "Dihentikan", bukan "dihapus": anggaran ditutup dengan tanggal akhir
         supaya periode yang sudah lewat tetap dapat dibaca apa adanya. */
      toast.success('Anggaran dihentikan.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.budgets }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
    },
    onError: () => {
      toast.error('Gagal menghentikan. Coba lagi.');
    },
  });

  const nameOf = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const rows = budgets.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Anggaran"
        description="Batas belanja per kategori. Terpakai dihitung dari transaksi periode berjalan."
        actions={
          <Button
            icon={<Plus size={16} aria-hidden />}
            onClick={() => {
              setOpen(true);
            }}
          >
            Buat anggaran
          </Button>
        }
      />

      {budgets.isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : budgets.isError ? (
        <ErrorState
          error={budgets.error}
          onRetry={() => {
            void budgets.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Belum ada anggaran"
              description="Tetapkan batas untuk kategori yang paling sering menguras — makan, transportasi, belanja."
              action={
                <Button
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  Buat anggaran pertama
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {rows.map((budget) => {
            const category = nameOf.get(budget.categoryId);
            const ratio = Math.min(budget.spent / budget.amount, 1);
            const over = budget.spent > budget.amount;
            const sisa = budget.amount - budget.spent;

            return (
              <motion.li key={budget.id} variants={fadeUp}>
                <Card className="group">
                  <CardBody>
                    {/*
                      Menumpuk di ponsel, berdampingan mulai 640px.

                      Sebelumnya SELALU berdampingan, dan blok nominal di
                      kanan `shrink-0`. Di 390px pasangan "Rp 594.000 /
                      Rp 1.500.000" ditambah tombol memakan seluruh baris,
                      sehingga nama kategori — satu-satunya elemen yang boleh
                      menyusut — runtuh ke lebar NOL:

                        "Makan & Minum"  0px, butuh 107px
                        "Belanja"        0px, butuh 49px
                        "Transportasi"   9px, butuh 84px

                      Yang terlihat pengguna: tiga kartu anggaran tanpa nama,
                      dengan "per bulan" bertindih di atas nominalnya. Halaman
                      anggaran yang anggarannya tidak dapat dibedakan satu sama
                      lain sudah berhenti menjadi halaman anggaran.

                      Tidak terdeteksi gerbang mana pun karena isinya DIPOTONG,
                      bukan meluap — tidak ada yang melewati tepi layar.
                    */}
                    <div className="mb-2.5 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-ink">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: category?.color ?? 'var(--color-identity-none)' }}
                            aria-hidden
                          />
                          <span className="truncate">{category?.name ?? 'Kategori'}</span>
                          <span className="text-xs font-normal text-dim">
                            {PERIOD_LABEL[budget.period]}
                          </span>
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${over ? 'text-[var(--color-negative)]' : 'text-muted'}`}
                        >
                          {over
                            ? `Lewat ${formatIdr(-sisa)} dari batas`
                            : `Sisa ${formatIdr(sisa)}`}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {/* `numeric`, bukan `tabular` saja — nominal uang
                            memakai mono di Dasbor, Transaksi, dan Dompet, dan
                            angka yang berganti wajah antar halaman terbaca
                            sebagai dua sistem. */}
                        <span className="numeric text-sm text-ink">
                          {formatIdr(budget.spent)}{' '}
                          <span className="text-dim">/ {formatIdr(budget.amount)}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Hentikan anggaran ${category?.name ?? ''}`}
                          loading={close.isPending && close.variables === budget.id}
                          onClick={() => {
                            close.mutate(budget.id);
                          }}
                          className="action-reveal"
                        >
                          <Trash2 size={15} aria-hidden />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"
                      role="progressbar"
                      aria-valuenow={Math.round(ratio * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Terpakai ${String(Math.round(ratio * 100))} persen`}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          /* Keadaan sehat NETRAL, bukan hologram. Isyarat di
                             bilah ini dibawa merah dan kuningnya; kalau keadaan
                             tenang pun berwarna, tidak ada yang menonjol saat
                             keadaannya berubah. */
                          background: over
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
                  </CardBody>
                </Card>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Buat anggaran"
        description="Satu anggaran berjalan per kategori. Membuat yang baru untuk kategori yang sama akan ditolak."
      >
        <BudgetForm
          categories={(categories.data ?? []).filter((c) => c.kind === 'expense')}
          onDone={() => {
            setOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

function BudgetForm({
  categories,
  onDone,
}: {
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const client = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', period: 'monthly', amount: '' as unknown as number },
  });

  const create = useMutation({
    mutationFn: (values: Values) => ledger.createBudget(values),
    onSuccess: async () => {
      toast.success('Anggaran dibuat.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.budgets }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
      onDone();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        create.mutate(values);
      })}
    >
      <FormAlert
        message={
          create.error
            ? isApiError(create.error)
              ? messageFor(create.error.code)
              : messageFor('unknown')
            : null
        }
      />

      <Select
        label="Kategori"
        placeholder="Pilih kategori pengeluaran"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        error={form.formState.errors.categoryId?.message}
        {...form.register('categoryId')}
      />

      <Select
        label="Periode"
        options={[
          { value: 'monthly', label: 'Bulanan' },
          { value: 'weekly', label: 'Mingguan' },
          { value: 'yearly', label: 'Tahunan' },
        ]}
        {...form.register('period')}
      />

      <Field
        label="Batas (Rp)"
        type="number"
        inputMode="numeric"
        step={1}
        min={1}
        placeholder="1500000"
        error={form.formState.errors.amount?.message}
        {...form.register('amount')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={create.isPending}>
          Buat anggaran
        </Button>
      </div>
    </form>
  );
}
