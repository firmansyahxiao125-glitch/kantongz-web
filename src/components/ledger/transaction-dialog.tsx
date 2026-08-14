'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import {
  keys,
  ledger,
  type Category,
  type ReceiptDraft,
  type Transaction,
  type WalletAccount,
} from '@/lib/ledger';

/**
 * Formulir catat / ubah transaksi.
 *
 * Jumlah diketik sebagai rupiah utuh dan dikirim sebagai bilangan bulat —
 * persis satuan yang dipakai backend. Tidak ada pembagian seratus di mana pun,
 * dan itulah alasan tidak ada tempat untuk salah membulatkan.
 */

const schema = z
  .object({
    kind: z.enum(['income', 'expense', 'transfer']),
    accountId: z.string().min(1, 'Pilih dompet.'),
    counterAccountId: z.string(),
    categoryId: z.string(),
    amount: z.coerce
      .number({ message: 'Masukkan jumlahnya.' })
      .int('Tulis dalam rupiah utuh, tanpa koma.')
      .positive('Jumlah harus lebih dari nol.'),
    occurredAt: z.string().min(1, 'Pilih tanggalnya.'),
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
  });

type Values = z.infer<typeof schema>;

function toDateInput(ms: number): string {
  const d = new Date(ms);
  /* Nilai `<input type="date">` selalu lokal. `toISOString` akan menggesernya ke
     UTC dan memundurkan tanggal tujuh jam di Jakarta. */
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TransactionDialog({
  open,
  onClose,
  accounts,
  categories,
  existing,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  accounts: WalletAccount[];
  categories: Category[];
  existing?: Transaction | null;
  /**
   * Hasil pemindaian struk, bila formulir dibuka lewat jalan itu.
   *
   * TERPISAH dari `existing` dan bukan sekadar transaksi setengah jadi:
   * `existing` menentukan formulir ini menyimpan lewat PUT ke sebuah id yang
   * sudah ada. Rancangan tidak punya id dan tidak boleh punya — ia hanya
   * mengisi kolom, dan yang menyimpan tetap orangnya.
   */
  draft?: ReceiptDraft | null;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? 'Ubah transaksi' : draft ? 'Periksa hasil pindai' : 'Catat transaksi'}
      description={
        existing
          ? undefined
          : draft
            ? 'Angka di bawah dibaca dari fotomu. Betulkan yang meleset sebelum menyimpan.'
            : 'Pemasukan, pengeluaran, atau pemindahan antar dompetmu sendiri.'
      }
    >
      <TransactionForm
        onClose={onClose}
        accounts={accounts}
        categories={categories}
        existing={existing ?? null}
        draft={draft ?? null}
      />
    </Dialog>
  );
}

const KEYAKINAN: Record<ReceiptDraft['confidence'], string> = {
  tinggi: 'Terbaca jelas.',
  sedang: 'Sebagian terbaca samar.',
  rendah: 'Struknya sulit dibaca.',
};

function TransactionForm({
  onClose,
  accounts,
  categories,
  existing,
  draft,
}: {
  onClose: () => void;
  accounts: WalletAccount[];
  categories: Category[];
  existing: Transaction | null;
  draft: ReceiptDraft | null;
}) {
  const client = useQueryClient();

  /* Dibaca sekali lewat penginisialisasi malas `useState`. `Date.now()` di
     badan render adalah nilai yang berubah tiap render, dan React Compiler
     memperlakukannya sebagai ketidakmurnian — dengan benar: tanggal bawaan
     yang bergeser di tengah pengisian formulir adalah bug, bukan fitur. */
  const [hariIni] = useState(() => toDateInput(Date.now()));

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: existing?.kind ?? 'expense',
      accountId: existing?.accountId ?? accounts[0]?.id ?? '',
      counterAccountId: existing?.counterAccountId ?? '',
      categoryId: existing?.categoryId ?? '',
      amount: existing?.amount ?? draft?.total ?? ('' as unknown as number),
      occurredAt: existing
        ? toDateInput(existing.occurredAt)
        : /* Tanggal struk hanya dipakai bila BENAR-BENAR terbaca. Nilai yang
             tidak ditemukan pembacanya datang sebagai `null`, dan hari ini
             adalah tebakan yang jauh lebih baik daripada 1 Januari 1970. */
          draft?.occurredAt
          ? toDateInput(draft.occurredAt)
          : hariIni,
      merchant: existing?.merchant ?? draft?.merchant ?? '',
      note: existing?.note ?? '',
    },
  });

  /* `useWatch` dan bukan `form.watch`: yang kedua mengembalikan fungsi baru
     setiap render, yang membuat React Compiler melewatkan memoisasi seluruh
     komponen ini. */
  const kind = useWatch({ control: form.control, name: 'kind' });

  /* Kategori disaring mengikuti jenis transaksi. Backend menolak pasangan yang
     tidak cocok; menyaringnya di sini berarti pengguna tidak pernah sampai ke
     penolakan itu. */
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.kind === (kind === 'income' ? 'income' : 'expense'))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, kind],
  );

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  const save = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        accountId: values.accountId,
        kind: values.kind,
        amount: values.amount,
        /* Tengah hari lokal, bukan tengah malam: transaksi tanggal 1 yang
           disimpan sebagai 00:00 lokal jatuh ke bulan sebelumnya begitu ada
           pergeseran zona sebesar apa pun. */
        occurredAt: new Date(`${values.occurredAt}T12:00:00`).getTime(),
        ...(values.kind === 'transfer' ? { counterAccountId: values.counterAccountId } : {}),
        ...(values.kind !== 'transfer' && values.categoryId
          ? { categoryId: values.categoryId }
          : {}),
        ...(values.merchant ? { merchant: values.merchant } : {}),
        ...(values.note ? { note: values.note } : {}),
      };

      return existing
        ? ledger.updateTransaction(existing.id, body)
        : ledger.createTransaction(body);
    },
    onSuccess: async () => {
      toast.success(existing ? 'Transaksi diperbarui.' : 'Transaksi dicatat.');
      /* Saldo, dasbor, dan anggaran seluruhnya diturunkan dari transaksi —
         ketiganya dibatalkan bersama, atau salah satunya akan menampilkan angka
         lama sampai halaman dimuat ulang. */
      await Promise.all([
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
        client.invalidateQueries({ queryKey: keys.accounts }),
        client.invalidateQueries({ queryKey: keys.budgets }),
      ]);
      onClose();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        save.mutate(values);
      })}
    >
      <FormAlert
        message={
          save.error
            ? isApiError(save.error)
              ? messageFor(save.error.code)
              : messageFor('unknown')
            : null
        }
      />

      {/*
        Sumber angkanya diperlihatkan, bukan disembunyikan.

        `totalLine` adalah baris MENTAH yang menghasilkan nominal di bawah.
        Menampilkannya membuat salah baca dapat dikenali dalam sekejap — "TOTAL
        Rp 40.500" yang menjadi 405.000 terlihat seketika bila barisnya ada di
        sebelahnya, dan tidak terlihat sama sekali bila hanya angkanya yang
        muncul. Keyakinan rendah tidak menolak hasilnya; ia hanya mengatakan
        seberapa keras kolom-kolomnya perlu diperiksa.
      */}
      {draft ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
          <p className="text-xs text-muted">
            {KEYAKINAN[draft.confidence]} Periksa jumlah dan tanggalnya.
          </p>
          {draft.totalLine ? (
            <p className="numeric mt-1.5 text-sm break-words text-ink">“{draft.totalLine}”</p>
          ) : (
            <p className="mt-1.5 text-sm text-ink">
              Baris totalnya tidak ketemu — isi jumlahnya sendiri.
            </p>
          )}
        </div>
      ) : null}

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
        placeholder="50000"
        error={form.formState.errors.amount?.message}
        {...form.register('amount')}
      />

      <Field
        label="Tanggal"
        type="date"
        error={form.formState.errors.occurredAt?.message}
        {...form.register('occurredAt')}
      />

      {kind === 'transfer' ? null : (
        <Field
          label="Merchant"
          placeholder="Warung Bu Tini"
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
        <Button type="button" variant="secondary" block onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" block loading={save.isPending}>
          {existing ? 'Simpan' : 'Catat'}
        </Button>
      </div>
    </form>
  );
}
