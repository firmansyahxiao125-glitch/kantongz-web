'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Plus, Sun } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { FormAlert } from '@/components/auth/form-alert';
import { useTheme, type ThemeChoice } from '@/components/theme-provider';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { tulis3D, usePreferensi3D } from '@/lib/gpu';
import { messageFor } from '@/lib/contracts';
import { keys, ledger } from '@/lib/ledger';
import { CATEGORY_DEFAULT } from '@/lib/palette';

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti sistem', icon: Monitor },
];

const schema = z.object({
  name: z.string().trim().min(1, 'Beri nama kategorinya.').max(60, 'Nama terlalu panjang.'),
  kind: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pilih warnanya.'),
});

type Values = z.infer<typeof schema>;

export default function PengaturanPage() {
  /* Dibaca lewat `useSyncExternalStore`: `localStorage` hidup di luar React,
     dan menyalinnya masuk lewat efek menambah satu render pada tiap pemuatan. */
  const efek3d = usePreferensi3D();

  const { choice, setChoice } = useTheme();
  const [open, setOpen] = useState(false);

  const categories = useQuery({ queryKey: keys.categories, queryFn: ledger.categories });
  const rows = categories.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Pengaturan" description="Tampilan aplikasi dan kategori transaksimu." />

      <Card>
        <CardBody>
          <CardTitle>Tampilan</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Pilihan disimpan di peramban ini dan berlaku sebelum halaman dicat.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              const active = choice === theme.value;

              return (
                <button
                  key={theme.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setChoice(theme.value);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                    active
                      ? 'border-[var(--color-holo)] bg-[color-mix(in_oklab,var(--color-holo)_10%,transparent)] text-ink'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/*
        ── EFEK 3D ────────────────────────────────────────────────────────

        Deteksi perangkat menjawab "sanggupkah", dan tidak pernah dapat
        menjawab "maukah". Keduanya sering berlawanan: mesin yang sanggup tetap
        boleh dimiliki seseorang yang baterainya tinggal sedikit, tetheringnya
        mahal, atau memang terganggu oleh gerak tanpa menyalakan
        `prefers-reduced-motion` di tingkat sistem.

        Berlaku SEKETIKA. Saklar yang baru bekerja pada kunjungan berikutnya
        terbaca sebagai rusak.
      */}
      <Card>
        <CardBody>
          <CardTitle>Efek 3D</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Mematikannya menghemat baterai dan data; isinya tetap tampil sebagai
            gambar diam.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Efek 3D">
            {(
              [
                { nilai: 'mati' as const, label: 'Mati', ket: 'Gambar diam di mana pun' },
                { nilai: 'otomatis' as const, label: 'Otomatis', ket: 'Halaman muka saja' },
                { nilai: 'penuh' as const, label: 'Penuh', ket: 'Termasuk lencana dasbor (+235 KB)' },
              ]
            ).map((o) => {
              const aktif = efek3d === o.nilai;
              return (
                <button
                  key={o.nilai}
                  type="button"
                  role="radio"
                  aria-checked={aktif}
                  onClick={() => {
                    tulis3D(o.nilai);
                  }}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                    aktif
                      ? 'border-[var(--color-holo)] bg-[color-mix(in_oklab,var(--color-holo)_10%,transparent)] text-ink'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span>{o.label}</span>
                  <span className="text-xs text-dim">{o.ket}</span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardHeader
            action={
              <Button
                size="sm"
                icon={<Plus size={15} aria-hidden />}
                onClick={() => {
                  setOpen(true);
                }}
              >
                Tambah
              </Button>
            }
          >
            <div>
              <CardTitle>Kategori</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Kategori bawaan dipakai bersama semua pengguna dan tidak dapat diubah. Yang kamu
                buat sendiri hanya milikmu.
              </p>
            </div>
          </CardHeader>

          {categories.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : categories.isError ? (
            <ErrorState
              error={categories.error}
              onRetry={() => {
                void categories.refetch();
              }}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {(['expense', 'income'] as const).map((kind) => (
                <section key={kind}>
                  <h3 className="mb-2 text-[11px] uppercase tracking-wider text-dim">
                    {kind === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </h3>
                  <ul className="space-y-1.5">
                    {rows
                      .filter((c) => c.kind === kind)
                      .map((category) => (
                        <li key={category.id} className="flex items-center gap-2.5 text-sm">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: category.color }}
                            aria-hidden
                          />
                          <span className="flex-1 truncate text-muted">{category.name}</span>
                          {category.system ? (
                            <span className="text-[11px] text-dim">bawaan</span>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Tambah kategori"
        description="Hanya terlihat olehmu, dan bisa langsung dipakai saat mencatat transaksi."
      >
        <CategoryForm
          onDone={() => {
            setOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

function CategoryForm({ onDone }: { onDone: () => void }) {
  const client = useQueryClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    /* Bawaannya dulu `#3b82f6` — biru bawaan Tailwind, persis warna yang
       `globals.css` nyatakan sudah dibuang dari produk, masuk kembali lewat
       pintu belakang formulir kategori baru. Nilainya kini tinggal di
       `@/lib/palette` bersama seluruh warna literal lain, supaya gerbang bisa
       melarang hex di dalam komponen tanpa pengecualian per berkas. */
    defaultValues: { name: '', kind: 'expense', color: CATEGORY_DEFAULT },
  });

  const create = useMutation({
    /* `icon` tidak ditawarkan di formulir: daftar ikonnya belum ada di produk,
       dan pilihan yang tidak bisa dilihat pengguna bukan pilihan. Nilai tetap
       ini yang dipakai backend untuk kategori buatan pengguna. */
    mutationFn: (values: Values) => ledger.createCategory({ ...values, icon: 'circle-dashed' }),
    onSuccess: async () => {
      toast.success('Kategori dibuat.');
      await client.invalidateQueries({ queryKey: keys.categories });
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
        placeholder="Kopi harian"
        error={form.formState.errors.name?.message}
        {...form.register('name')}
      />

      <Select
        label="Jenis"
        options={[
          { value: 'expense', label: 'Pengeluaran' },
          { value: 'income', label: 'Pemasukan' },
        ]}
        {...form.register('kind')}
      />

      <Field
        label="Warna"
        type="color"
        className="h-11 px-2 py-1"
        error={form.formState.errors.color?.message}
        {...form.register('color')}
      />

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" block onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" block loading={create.isPending}>
          Tambah
        </Button>
      </div>
    </form>
  );
}
