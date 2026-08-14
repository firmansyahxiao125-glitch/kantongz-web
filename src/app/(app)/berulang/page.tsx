'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormAlert } from '@/components/auth/form-alert';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { hariIniLokal, labelJatuhTempo, ringkasIrama } from '@/lib/cadence';
import { messageFor } from '@/lib/contracts';
import { formatIdr } from '@/lib/format';
import {
  keys,
  ledger,
  recurring,
  recurringKeys,
  type Category,
  type RecurringRule,
  type WalletAccount,
} from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Aturan berulang: tagihan dan pemasukan yang jatuh pada irama tetap.
 *
 * ── MENGAPA HALAMAN INI MENCATAT SENDIRI, SEMENTARA PINDAI STRUK TIDAK ──
 *
 * Struk menghasilkan angka TEBAKAN, jadi ia berhenti di formulir dan menunggu
 * diperiksa. Aturan berulang berisi angka yang diketik pemiliknya sendiri —
 * tidak ada yang perlu diverifikasi, dan meminta konfirmasi tiap bulan atas
 * nominal yang sudah disetujui hanya memindahkan pekerjaan tanpa menambah
 * kepastian.
 *
 * Yang tetap dijaga, dan terlihat di layar ini: setiap aturan dapat DIJEDA
 * kapan pun, jumlah yang sudah dilahirkannya dihitung terbuka, dan tanggal
 * jatuh berikutnya selalu dinyatakan sebelum apa pun terjadi.
 */

const schema = z
  .object({
    name: z.string().trim().min(1, 'Beri nama aturannya.').max(80, 'Nama terlalu panjang.'),
    kind: z.enum(['income', 'expense', 'transfer']),
    accountId: z.string().min(1, 'Pilih dompet.'),
    counterAccountId: z.string(),
    categoryId: z.string(),
    amount: z.coerce
      .number({ message: 'Masukkan jumlahnya.' })
      .int('Tulis dalam rupiah utuh, tanpa koma.')
      .positive('Jumlah harus lebih dari nol.'),
    cadence: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.coerce
      .number({ message: 'Masukkan angkanya.' })
      .int('Tulis bilangan bulat.')
      .min(1, 'Minimal 1.')
      .max(366, 'Terlalu jarang.'),
    startsOn: z.string().min(1, 'Pilih tanggal mulainya.'),
    endsOn: z.string(),
    merchant: z.string().max(120),
    note: z.string().max(280),
  })
  .refine((v) => v.kind !== 'transfer' || v.counterAccountId.length > 0, {
    message: 'Pilih dompet tujuan.',
    path: ['counterAccountId'],
  })
  .refine((v) => v.kind !== 'transfer' || v.counterAccountId !== v.accountId, {
    message: 'Dompet tujuan harus berbeda.',
    path: ['counterAccountId'],
  })
  .refine((v) => v.endsOn === '' || v.endsOn >= v.startsOn, {
    message: 'Tanggal berakhir mendahului tanggal mulai.',
    path: ['endsOn'],
  });

type Values = z.infer<typeof schema>;

export default function BerulangPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  /* Dibaca sekali. `hariIniLokal()` di badan render adalah nilai yang berubah
     tiap render, dan label "jatuh besok" yang berganti sendiri di tengah
     interaksi adalah bug, bukan kesegaran. */
  const [hariIni] = useState(() => hariIniLokal());

  const q = useQuery({ queryKey: recurringKeys.list, queryFn: recurring.list });
  const accountsQuery = useQuery({ queryKey: keys.accounts, queryFn: ledger.accounts });
  const categoriesQuery = useQuery({ queryKey: keys.categories, queryFn: ledger.categories });

  /* Empat kueri dibatalkan bersama: aturan yang berjalan MENULIS transaksi,
     dan transaksi itu mengubah saldo, dasbor, serta anggaran sekaligus. */
  const segarkan = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: recurringKeys.list }),
      client.invalidateQueries({ queryKey: ['transactions'] }),
      client.invalidateQueries({ queryKey: keys.dashboard }),
      client.invalidateQueries({ queryKey: keys.accounts }),
      client.invalidateQueries({ queryKey: keys.budgets }),
    ]);
  };

  const jeda = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => recurring.pause(id, paused),
    onSuccess: async (rule) => {
      toast.success(rule.paused ? `${rule.name} dijeda.` : `${rule.name} dilanjutkan.`);
      await segarkan();
    },
    onError: () => {
      toast.error('Gagal mengubah. Coba lagi.');
    },
  });

  const hapus = useMutation({
    mutationFn: (id: string) => recurring.remove(id),
    onSuccess: async () => {
      /* Dikatakan apa adanya: transaksi yang sudah terjadi TIDAK ikut hilang.
         Menghapusnya akan mengubah saldo bulan yang sudah ditutup. */
      toast.success('Aturan dihapus. Transaksi yang sudah tercatat tetap ada.');
      await segarkan();
    },
    onError: () => {
      toast.error('Gagal menghapus. Coba lagi.');
    },
  });

  const jalankan = useMutation({
    mutationFn: () => recurring.run(),
    onSuccess: async (hasil) => {
      toast.success(
        hasil.posted === 0
          ? 'Tidak ada yang jatuh tempo.'
          : `${String(hasil.posted)} transaksi dicatat.`,
      );
      await segarkan();
    },
    onError: () => {
      toast.error('Gagal menjalankan. Coba lagi.');
    },
  });

  const rules = q.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  /* Bergantung pada `accountsQuery.data`, BUKAN pada `accounts` di atasnya:
     `?? []` menghasilkan larik baru setiap render, dan memo yang bergantung
     padanya dihitung ulang setiap kali — memo yang tidak pernah mengingat. */
  const accountName = useMemo(
    () => new Map((accountsQuery.data ?? []).map((a) => [a.id, a.name])),
    [accountsQuery.data],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Berulang"
        description="Tagihan, langganan, dan gaji yang jatuh pada irama tetap — dicatat sendiri saat tanggalnya tiba."
        actions={
          <>
            {rules.length > 0 ? (
              <Button
                variant="secondary"
                loading={jalankan.isPending}
                onClick={() => {
                  jalankan.mutate();
                }}
              >
                Jalankan sekarang
              </Button>
            ) : null}
            <Button
              icon={<Plus size={16} aria-hidden />}
              disabled={accounts.length === 0}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Buat aturan
            </Button>
          </>
        }
      />

      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState
          error={q.error}
          onRetry={() => {
            void q.refetch();
          }}
        />
      ) : rules.length === 0 ? (
        <Card>
          <CardBody>
            {accounts.length === 0 ? (
              <EmptyState
                title="Mulai dari satu dompet"
                description="Aturan berulang selalu menulis ke sebuah dompet, jadi buat dompet pertamamu dulu."
                action={<ButtonLink href="/dompet">Buat dompet</ButtonLink>}
              />
            ) : (
              <EmptyState
                title="Belum ada aturan berulang"
                description="Sewa, listrik, langganan, cicilan, gaji — apa pun yang jatuh pada tanggal yang sama setiap kali. Kamu cukup mengaturnya sekali."
                action={
                  <Button
                    icon={<Plus size={16} aria-hidden />}
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    Buat aturan pertama
                  </Button>
                }
              />
            )}
          </CardBody>
        </Card>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2"
        >
          {rules.map((rule) => (
            <motion.li key={rule.id} variants={fadeUp}>
              <Card className="group h-full">
                <CardBody className="flex h-full flex-col">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]"
                        aria-hidden
                      >
                        {rule.kind === 'income' ? (
                          <ArrowDownLeft size={17} className="text-[var(--color-positive)]" />
                        ) : rule.kind === 'transfer' ? (
                          <Repeat size={17} className="text-muted" />
                        ) : (
                          <ArrowUpRight size={17} className="text-muted" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{rule.name}</p>
                        <p className="truncate text-xs text-dim">
                          {ringkasIrama(rule)} · {accountName.get(rule.accountId) ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="action-reveal flex shrink-0 gap-0.5 focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ubah aturan ${rule.name}`}
                        onClick={() => {
                          setEditing(rule);
                          setOpen(true);
                        }}
                      >
                        <Pencil size={15} aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus aturan ${rule.name}`}
                        loading={hapus.isPending && hapus.variables === rule.id}
                        onClick={() => {
                          hapus.mutate(rule.id);
                        }}
                      >
                        <Trash2 size={15} aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <p
                    className={`numeric text-xl font-semibold tracking-tight ${
                      rule.kind === 'income' ? 'text-[var(--color-positive)]' : 'text-ink'
                    }`}
                  >
                    {rule.kind === 'income' ? '+' : rule.kind === 'expense' ? '−' : ''}
                    {formatIdr(rule.amount)}
                  </p>

                  {/*
                    Dua fakta yang menjawab satu pertanyaan masing-masing:
                    "kapan berikutnya?" dan "sudah berapa kali?".

                    Yang kedua penting justru karena aturan ini menulis sendiri.
                    Angka yang tumbuh tanpa ada yang menghitungnya adalah cara
                    paling mudah kehilangan jejak ke mana uang pergi.
                  */}
                  <p className="mt-1 text-xs text-dim">
                    {rule.paused ? 'Dijeda' : labelJatuhTempo(rule.nextRunOn, hariIni)}
                    {rule.postedCount > 0
                      ? ` · sudah ${String(rule.postedCount)}× tercatat`
                      : ' · belum pernah tercatat'}
                    {rule.endsOn ? ` · berakhir ${rule.endsOn}` : ''}
                  </p>

                  <div className="mt-auto pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      block
                      icon={
                        rule.paused ? (
                          <Play size={14} aria-hidden />
                        ) : (
                          <Pause size={14} aria-hidden />
                        )
                      }
                      loading={jeda.isPending && jeda.variables?.id === rule.id}
                      onClick={() => {
                        jeda.mutate({ id: rule.id, paused: !rule.paused });
                      }}
                    >
                      {rule.paused ? 'Lanjutkan' : 'Jeda'}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Ubah aturan' : 'Buat aturan berulang'}
        description={
          editing
            ? 'Perubahan berlaku untuk kejadian berikutnya. Yang sudah tercatat tidak ikut berubah.'
            : 'Atur sekali; transaksinya dicatat sendiri setiap tanggalnya tiba.'
        }
      >
        <RecurringForm
          accounts={accounts}
          categories={categories}
          existing={editing}
          onDone={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </Dialog>
    </div>
  );
}

function RecurringForm({
  accounts,
  categories,
  existing,
  onDone,
}: {
  accounts: WalletAccount[];
  categories: Category[];
  existing: RecurringRule | null;
  onDone: () => void;
}) {
  const client = useQueryClient();
  const [hariIni] = useState(() => hariIniLokal());

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? '',
      kind: existing?.kind ?? 'expense',
      accountId: existing?.accountId ?? accounts[0]?.id ?? '',
      counterAccountId: existing?.counterAccountId ?? '',
      categoryId: existing?.categoryId ?? '',
      amount: existing?.amount ?? ('' as unknown as number),
      cadence: existing?.cadence ?? 'monthly',
      interval: existing?.interval ?? 1,
      startsOn: existing?.startsOn ?? hariIni,
      endsOn: existing?.endsOn ?? '',
      merchant: existing?.merchant ?? '',
      note: existing?.note ?? '',
    },
  });

  const kind = useWatch({ control: form.control, name: 'kind' });
  const cadence = useWatch({ control: form.control, name: 'cadence' });
  const interval = useWatch({ control: form.control, name: 'interval' });
  const startsOn = useWatch({ control: form.control, name: 'startsOn' });

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.kind === (kind === 'income' ? 'income' : 'expense'))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, kind],
  );

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  const simpan = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        name: values.name,
        accountId: values.accountId,
        kind: values.kind,
        amount: values.amount,
        cadence: values.cadence,
        interval: values.interval,
        startsOn: values.startsOn,
        ...(values.kind === 'transfer' ? { counterAccountId: values.counterAccountId } : {}),
        ...(values.kind !== 'transfer' && values.categoryId
          ? { categoryId: values.categoryId }
          : {}),
        ...(values.endsOn ? { endsOn: values.endsOn } : {}),
        ...(values.merchant ? { merchant: values.merchant } : {}),
        ...(values.note ? { note: values.note } : {}),
      };

      return existing ? recurring.update(existing.id, body) : recurring.create(body);
    },
    onSuccess: async () => {
      toast.success(existing ? 'Aturan diperbarui.' : 'Aturan dibuat.');
      await Promise.all([
        client.invalidateQueries({ queryKey: recurringKeys.list }),
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
        simpan.mutate(values);
      })}
    >
      <FormAlert
        message={
          simpan.error
            ? isApiError(simpan.error)
              ? messageFor(simpan.error.code)
              : messageFor('unknown')
            : null
        }
      />

      <Field
        label="Nama aturan"
        placeholder="Sewa kos"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />

      <Select
        label="Jenis"
        options={[
          { value: 'expense', label: 'Pengeluaran' },
          { value: 'income', label: 'Pemasukan' },
          { value: 'transfer', label: 'Transfer antar dompet' },
        ]}
        {...form.register('kind')}
      />

      <Select
        label={kind === 'transfer' ? 'Dari dompet' : 'Dompet'}
        options={accountOptions}
        error={form.formState.errors.accountId?.message}
        {...form.register('accountId')}
      />

      {kind === 'transfer' ? (
        <Select
          label="Ke dompet"
          options={accountOptions}
          placeholder="Pilih dompet tujuan"
          error={form.formState.errors.counterAccountId?.message}
          {...form.register('counterAccountId')}
        />
      ) : (
        <Select
          label="Kategori"
          options={categoryOptions}
          placeholder="Tanpa kategori"
          error={form.formState.errors.categoryId?.message}
          {...form.register('categoryId')}
        />
      )}

      <Field
        label="Jumlah (Rp)"
        type="number"
        inputMode="numeric"
        step={1}
        min={1}
        placeholder="1500000"
        error={form.formState.errors.amount?.message}
        {...form.register('amount')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Irama"
          options={[
            { value: 'daily', label: 'Harian' },
            { value: 'weekly', label: 'Mingguan' },
            { value: 'monthly', label: 'Bulanan' },
          ]}
          {...form.register('cadence')}
        />
        <Field
          label="Setiap"
          type="number"
          inputMode="numeric"
          step={1}
          min={1}
          error={form.formState.errors.interval?.message}
          {...form.register('interval')}
        />
      </div>

      <Field
        label="Mulai tanggal"
        type="date"
        hint="Boleh mundur sampai 31 hari, untuk tagihan yang sudah lewat bulan ini."
        error={form.formState.errors.startsOn?.message}
        {...form.register('startsOn')}
      />

      {/*
        Kalimatnya dirakit dari nilai yang SEDANG diketik, bukan dari yang sudah
        tersimpan. Angka `{ monthly, 3, tanggal 31 }` benar tetapi tidak
        memberi tahu siapa pun kapan uangnya keluar — dan tanggal 31 yang
        dijepit ke akhir Februari adalah hal terakhir yang boleh menjadi
        kejutan.
      */}
      {startsOn ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm text-ink">
          {ringkasIrama({
            cadence,
            interval: Number(interval) > 0 ? Number(interval) : 1,
            startsOn,
          })}
        </p>
      ) : null}

      <Field
        label="Berakhir tanggal"
        type="date"
        hint="Opsional. Kosongkan untuk berjalan terus."
        error={form.formState.errors.endsOn?.message}
        {...form.register('endsOn')}
      />

      {kind === 'transfer' ? null : (
        <Field
          label="Merchant"
          placeholder="Bu Kos"
          error={form.formState.errors.merchant?.message}
          {...form.register('merchant')}
        />
      )}

      <Field
        label="Catatan"
        placeholder="Opsional"
        error={form.formState.errors.note?.message}
        {...form.register('note')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={simpan.isPending}>
          {existing ? 'Simpan' : 'Buat aturan'}
        </Button>
      </div>
    </form>
  );
}
