'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Archive, Banknote, CreditCard, Landmark, Plus, Smartphone, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
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
import { keys, ledger, type AccountKind } from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';
import { TOKEN } from '@/lib/palette';

const ICON: Record<AccountKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  card: CreditCard,
  investment: TrendingUp,
};

const LABEL: Record<AccountKind, string> = {
  cash: 'Kas',
  bank: 'Rekening bank',
  ewallet: 'E-wallet',
  card: 'Kartu kredit',
  investment: 'Investasi',
};

const schema = z.object({
  name: z.string().trim().min(1, 'Beri nama dompetnya.').max(80, 'Nama terlalu panjang.'),
  kind: z.enum(['cash', 'bank', 'ewallet', 'card', 'investment']),
  /* Saldo awal BOLEH negatif — kartu kredit dimulai dari utang. Yang tidak
     boleh hanyalah pecahan, karena buku besar menyimpan rupiah utuh. */
  openingBalance: z.coerce.number().int('Tulis dalam rupiah utuh, tanpa koma.'),
  /*
   * Warna dompet.
   *
   * Bukan kemampuan baru: `WalletAccount.color` sudah ada di kontrak,
   * `POST /v1/accounts` sudah menerimanya, dan kartu di halaman ini sudah
   * MERENDERNYA sejak awal. Yang tidak ada hanyalah cara pengguna mengisinya —
   * jadi setiap dompet lahir tanpa warna dan ketiganya tampil sebagai lingkaran
   * abu yang sama persis. Terukur di peramban: tiga ikon, satu nilai
   * `rgb(127,127,139)`.
   *
   * Polanya sama persis dengan formulir kategori di Pengaturan, supaya tidak
   * ada dua cara berbeda memilih warna di satu produk.
   */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pilih warnanya.'),
});

type Values = z.infer<typeof schema>;

export default function DompetPage() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({ queryKey: keys.accounts, queryFn: ledger.accounts });

  const archive = useMutation({
    mutationFn: (id: string) => ledger.updateAccount(id, { archived: true }),
    onSuccess: async () => {
      toast.success('Dompet diarsipkan.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.accounts }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
      ]);
    },
    onError: () => {
      toast.error('Gagal mengarsipkan. Coba lagi.');
    },
  });

  const accounts = q.data ?? [];
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dompet"
        description="Kas, rekening, dan e-wallet — beserta saldo masing-masing."
        actions={
          <Button
            icon={<Plus size={16} aria-hidden />}
            onClick={() => {
              setOpen(true);
            }}
          >
            Tambah dompet
          </Button>
        }
      >
        {/* Total tetap di kepala halaman, tetapi sekarang DI BAWAH judulnya
            alih-alih menggantikannya. `numeric` dan bukan `tabular` saja:
            nominal yang sama di dasbor dan Transaksi memakai mono, dan angka
            uang yang berganti wajah antar halaman terbaca sebagai dua sistem. */}
        <div>
          <p className="text-xs text-muted">Total seluruh dompet</p>
          {/*
            Selama memuat, TIDAK ADA angka.

            `total` dijumlahkan dari daftar yang masih kosong, jadi sebelum
            perbaikan ini kepala halaman menampilkan "Rp 0" lalu melompat ke
            nilai sebenarnya — terlihat di tangkapan layar keadaan muat. Nol
            bukan "belum tahu": ia pernyataan bahwa uangmu habis, dan aplikasi
            uang yang mengatakannya sekejap pun sudah salah bicara.
          */}
          {q.isPending ? (
            <Skeleton className="mt-1 h-8 w-44" />
          ) : (
            <p className="numeric text-2xl font-semibold tracking-tight text-ink">
              {formatIdr(total)}
            </p>
          )}
        </div>
      </PageHeader>

      {q.isPending ? (
        /*
          Kerangka BERBENTUK kartunya, bukan tiga kotak abu.

          Diukur di peramban: kotak lama `h-28` tingginya 112px sementara kartu
          yang datang 170px — jadi seluruh grid melompat 58px per baris begitu
          data tiba. Tingginya di bawah diturunkan dari kotak kartu yang sama
          (padding 20+20, ikon 36 + jarak 12, nama 20, jenis 6+16, saldo 12+28),
          bukan dikira-kira.
        */
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Card>
                <CardBody>
                  <Skeleton className="mb-3 size-9 rounded-lg" />
                  <Skeleton className="h-5 w-32 max-w-[70%]" />
                  <Skeleton className="mt-1.5 h-4 w-20 max-w-[45%]" />
                  <Skeleton className="mt-3 h-7 w-40 max-w-[85%]" />
                </CardBody>
              </Card>
            </li>
          ))}
          <span className="sr-only">Memuat dompet</span>
        </ul>
      ) : q.isError ? (
        <ErrorState
          error={q.error}
          onRetry={() => {
            void q.refetch();
          }}
        />
      ) : accounts.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Belum ada dompet"
              description="Dompet adalah tempat uangmu berada: kas di tangan, rekening bank, e-wallet, atau portofolio."
              action={
                <Button
                  onClick={() => {
                    setOpen(true);
                  }}
                >
                  Buat dompet pertama
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {accounts.map((account) => {
            const Icon = ICON[account.kind];

            return (
              <motion.li key={account.id} variants={fadeUp}>
                <Card className="group h-full">
                  <CardBody className="flex h-full flex-col">
                    <div className="mb-3 flex items-start justify-between">
                      <span
                        className="grid size-9 place-items-center rounded-lg"
                        style={{
                          background: `color-mix(in oklab, ${account.color ?? 'var(--color-identity-none)'} 16%, transparent)`,
                          color: account.color ?? 'var(--color-identity-none)',
                        }}
                        aria-hidden
                      >
                        <Icon size={17} />
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Arsipkan ${account.name}`}
                        loading={archive.isPending && archive.variables === account.id}
                        onClick={() => {
                          archive.mutate(account.id);
                        }}
                        className="action-reveal"
                      >
                        <Archive size={15} aria-hidden />
                      </Button>
                    </div>

                    <p className="truncate text-sm font-medium text-ink">{account.name}</p>
                    <p className="text-xs text-dim">{LABEL[account.kind]}</p>

                    {/* `numeric`, BUKAN `tabular` saja. Diukur di peramban:
                        saldo ini menghitung `font-family: Inter`, sementara
                        total di kepala halaman yang sama — dan setiap nominal
                        di Dasbor maupun Transaksi — memakai mono. Dua wajah
                        angka uang dalam satu layar terbaca sebagai dua sistem. */}
                    <p
                      className={`numeric mt-auto pt-3 text-xl font-semibold tracking-tight ${
                        account.balance < 0 ? 'text-[var(--color-negative)]' : 'text-ink'
                      }`}
                    >
                      {formatIdr(account.balance)}
                    </p>
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
        title="Tambah dompet"
        description="Saldo awal adalah jumlah yang ada di dompet ini sekarang, sebelum transaksi apa pun dicatat."
      >
        <AccountForm
          onDone={() => {
            setOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

function AccountForm({ onDone }: { onDone: () => void }) {
  const client = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    /* Bawaannya netral, bukan warna pilihan: pengguna memilih sendiri, dan
       bawaan tidak boleh mendahului pilihan itu. */
    defaultValues: { name: '', kind: 'cash', openingBalance: 0, color: TOKEN.identityNone },
  });

  const create = useMutation({
    mutationFn: (values: Values) => ledger.createAccount(values),
    onSuccess: async () => {
      toast.success('Dompet dibuat.');
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.accounts }),
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

      <Field
        label="Nama"
        placeholder="BCA, Dompet Tunai, GoPay…"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />

      <Select
        label="Jenis"
        options={(Object.keys(LABEL) as AccountKind[]).map((kind) => ({
          value: kind,
          label: LABEL[kind],
        }))}
        {...form.register('kind')}
      />

      <Field
        label="Saldo awal (Rp)"
        type="number"
        inputMode="numeric"
        step={1}
        placeholder="0"
        hint="Boleh negatif untuk kartu kredit."
        error={form.formState.errors.openingBalance?.message}
        {...form.register('openingBalance')}
      />

      <Field
        label="Warna"
        type="color"
        className="h-11 px-2 py-1"
        hint="Membedakan dompet ini di dasbor, analitik, dan daftar."
        error={form.formState.errors.color?.message}
        {...form.register('color')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={create.isPending}>
          Buat dompet
        </Button>
      </div>
    </form>
  );
}
