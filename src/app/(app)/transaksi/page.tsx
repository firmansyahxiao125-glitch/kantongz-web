'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ReceiptScanButton } from '@/components/ledger/receipt-scan';
import { TransactionDialog } from '@/components/ledger/transaction-dialog';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { formatDate, formatIdr } from '@/lib/format';
import {
  keys,
  ledger,
  type ReceiptDraft,
  type Transaction,
  type TransactionKind,
  type TransactionPage,
} from '@/lib/ledger';
import { fadeUp, stagger } from '@/lib/motion';

const PAGE = 25;

export default function TransaksiPage() {
  const client = useQueryClient();
  const [kind, setKind] = useState<TransactionKind | ''>('');
  const [accountId, setAccountId] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [open, setOpen] = useState(false);

  const accountsQuery = useQuery({ queryKey: keys.accounts, queryFn: ledger.accounts });
  const categoriesQuery = useQuery({ queryKey: keys.categories, queryFn: ledger.categories });

  const filter = useMemo(
    () => ({
      ...(kind === '' ? {} : { kind }),
      ...(accountId === '' ? {} : { accountId }),
      limit: PAGE,
    }),
    [kind, accountId],
  );

  const list = useInfiniteQuery({
    queryKey: keys.transactions(filter),
    queryFn: ({ pageParam }) =>
      ledger.transactions({ ...filter, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (last: TransactionPage) => last.nextCursor ?? undefined,
  });

  const remove = useMutation({
    mutationFn: (id: string) => ledger.deleteTransaction(id),
    onSuccess: async () => {
      toast.success('Transaksi dihapus.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['transactions'] }),
        client.invalidateQueries({ queryKey: keys.dashboard }),
        client.invalidateQueries({ queryKey: keys.accounts }),
        client.invalidateQueries({ queryKey: keys.budgets }),
      ]);
    },
    onError: () => {
      toast.error('Gagal menghapus. Coba lagi.');
    },
  });

  /* Rancangan mengisi formulir yang SAMA, bukan formulir keduanya sendiri.
     Satu tempat untuk menyimpan transaksi berarti satu tempat untuk aturan
     jumlah, tanggal, dan kategorinya. */
  const bukaRancangan = useCallback((hasil: ReceiptDraft) => {
    setEditing(null);
    setDraft(hasil);
    setOpen(true);
  }, []);

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const menyaring = kind !== '' || accountId !== '';

  /* Nama dicari lewat peta, bukan lewat `find` di dalam render setiap baris —
     daftar seratus baris dikali dua puluh dompet adalah dua ribu perbandingan
     pada setiap render. */
  const accountName = useMemo(
    () => new Map((accountsQuery.data ?? []).map((a) => [a.id, a.name])),
    [accountsQuery.data],
  );
  const categoryName = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name])),
    [categoriesQuery.data],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transaksi"
        description="Seluruh catatan masuk, keluar, dan transfer antar dompet."
        actions={
          <>
            {/* Keduanya mati sebelum ada dompet, dan karena alasan yang sama:
                transaksi selalu tercatat pada sebuah dompet, jadi memindai
                struk lebih dulu hanya akan berakhir di formulir yang tidak
                dapat disimpan. */}
            <ReceiptScanButton disabled={accounts.length === 0} onDraft={bukaRancangan} />
            <Button
              icon={<Plus size={16} aria-hidden />}
              disabled={accounts.length === 0}
              onClick={() => {
                setEditing(null);
                setDraft(null);
                setOpen(true);
              }}
            >
              Catat transaksi
            </Button>
          </>
        }
      >
        {/* Penyaring berada DI BAWAH judul, bukan menggantikannya. Labelnya
            disembunyikan secara visual — nilai terpilih sudah menjelaskan
            dirinya ("Semua dompet"), sementara label bergaya formulir di
            atasnya dulu berbobot sama dengan judul kartu di bawah. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36 sm:w-40">
            <Select
              label="Jenis transaksi"
              hideLabel
              scale="sm"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as TransactionKind | '');
              }}
              options={[
                { value: '', label: 'Semua jenis' },
                { value: 'expense', label: 'Pengeluaran' },
                { value: 'income', label: 'Pemasukan' },
                { value: 'transfer', label: 'Transfer' },
              ]}
            />
          </div>

          <div className="w-40 sm:w-48">
            <Select
              label="Dompet"
              hideLabel
              scale="sm"
              value={accountId}
              onChange={(event) => {
                setAccountId(event.target.value);
              }}
              options={[
                { value: '', label: 'Semua dompet' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
          </div>

          {menyaring ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKind('');
                setAccountId('');
              }}
            >
              Hapus saringan
            </Button>
          ) : null}

          {/*
            Jumlah yang BENAR-BENAR diketahui, dan tidak lebih.

            API memberi halaman berkursor tanpa jumlah total, jadi yang bisa
            dinyatakan hanyalah berapa yang sudah dimuat. Menuliskan "dari 240"
            di sini berarti mengarang angka yang tidak pernah dikirim siapa pun.
          */}
          {items.length > 0 ? (
            <p className="ml-auto text-xs text-dim" aria-live="polite">
              {list.hasNextPage
                ? `${String(items.length)} transaksi dimuat`
                : `${String(items.length)} transaksi`}
            </p>
          ) : null}
        </div>
      </PageHeader>

      <Card>
        <CardBody className="p-0">
          {list.isPending ? (
            /*
              Kerangka yang MENYERUPAI barisnya, bukan lima kotak abu.

              Sebelumnya lima `h-12` (48px) berjarak 8px di dalam `p-5`,
              sementara baris aslinya ±60px dan dipisah garis. Jadi begitu data
              tiba, seluruh daftar bergeser — dan pergeseran itu paling terasa
              justru pada koneksi paling lambat, tempat kerangka paling lama
              dilihat.
            */
            <ul className="divide-y divide-[var(--line)]" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  {/* Ikut disembunyikan di bawah 640px, sama dengan barisnya.
                      Kerangka yang menjanjikan ikon yang tidak akan datang
                      menggeser seluruh baris begitu data tiba. */}
                  <Skeleton className="hidden size-9 shrink-0 rounded-lg sm:block" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40 max-w-[60%]" />
                    <Skeleton className="h-3 w-28 max-w-[40%]" />
                  </div>
                  <Skeleton className="h-3.5 w-20 shrink-0" />
                </li>
              ))}
              <span className="sr-only">Memuat transaksi</span>
            </ul>
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : items.length === 0 ? (
            /*
              Keadaan kosong SELALU membawa jalan keluarnya.

              Sebelumnya `action` tidak pernah dilewatkan, jadi halaman ini
              menyuruh "catat transaksi pertamamu" lalu tidak memberi satu pun
              tombol untuk melakukannya — dan tombol yang sebenarnya ada berada
              di kepala halaman, di luar tempat mata sedang membaca.

              Tiga keadaan kosong yang BERBEDA, karena jalan keluarnya berbeda:
              belum punya dompet, saringan tidak menemukan apa-apa, atau memang
              belum ada catatan sama sekali.
            */
            menyaring ? (
              <EmptyState
                title="Tidak ada yang cocok"
                description="Saringan yang aktif tidak menemukan transaksi. Longgarkan salah satunya untuk melihat lebih banyak."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setKind('');
                      setAccountId('');
                    }}
                  >
                    Hapus saringan
                  </Button>
                }
              />
            ) : accounts.length === 0 ? (
              <EmptyState
                title="Mulai dari satu dompet"
                description="Transaksi selalu tercatat pada sebuah dompet, jadi buat dompet pertamamu dulu."
                action={<ButtonLink href="/dompet">Buat dompet</ButtonLink>}
              />
            ) : (
              <EmptyState
                title="Belum ada transaksi"
                description="Catat pemasukan atau pengeluaran pertamamu — dasbor akan langsung mengikuti."
                action={
                  <Button
                    icon={<Plus size={16} aria-hidden />}
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    Catat transaksi
                  </Button>
                }
              />
            )
          ) : (
            <motion.ul
              variants={stagger}
              initial="hidden"
              animate="show"
              className="divide-y divide-[var(--line)]"
            >
              {items.map((trx) => (
                <motion.li
                  key={trx.id}
                  variants={fadeUp}
                  className="group flex items-center gap-3 px-5 py-3"
                >
                  {/* Ikon disembunyikan di bawah 640px, dan itu keputusan
                      ruang yang diukur, bukan selera.

                      Di 390px baris ini memperebutkan lebar antara ikon (36px
                      + jarak 12), nama, nominal, dan dua tombol aksi. Yang
                      kalah selalu namanya: tangkapan layar dokumentasi
                      menunjukkan "PT S…", "Kopi Ken…", dan "Nasi Pada…" —
                      transaksi yang tidak dapat dikenali dari daftarnya
                      sendiri.

                      Ikonnya `aria-hidden` dan MURNI dekoratif: arah uang
                      sudah dibawa tanda +/− dan warnanya, keduanya tetap ada.
                      Membuang 48px dari elemen yang tidak menyampaikan
                      informasi adalah penukaran yang paling murah di baris
                      ini. */}
                  <span
                    className="hidden size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] sm:grid"
                    aria-hidden
                  >
                    {trx.kind === 'income' ? (
                      <ArrowDownLeft size={16} className="text-[var(--color-positive)]" />
                    ) : trx.kind === 'transfer' ? (
                      <Repeat size={16} className="text-muted" />
                    ) : (
                      <ArrowUpRight size={16} className="text-muted" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {trx.merchant ??
                        trx.note ??
                        (trx.kind === 'transfer'
                          ? `${accountName.get(trx.accountId) ?? 'Dompet'} → ${accountName.get(trx.counterAccountId ?? '') ?? 'Dompet'}`
                          : (categoryName.get(trx.categoryId ?? '') ?? 'Tanpa kategori'))}
                    </p>
                    <p className="truncate text-xs text-dim">
                      {formatDate(trx.occurredAt)} · {accountName.get(trx.accountId) ?? '—'}
                      {trx.kind === 'transfer' || !trx.categoryId
                        ? ''
                        : ` · ${categoryName.get(trx.categoryId) ?? ''}`}
                    </p>
                  </div>

                  {/* `numeric`, BUKAN `tabular` saja. Daftar yang sama di dasbor
                      sudah memakai `numeric` (mono + tabular-nums); di sini
                      nominalnya dulu memakai font teks biasa, jadi angka yang
                      sama tampil dengan dua wajah berbeda di dua halaman. */}
                  <span
                    className={`numeric shrink-0 text-sm ${
                      trx.kind === 'income' ? 'text-[var(--color-positive)]' : 'text-ink'
                    }`}
                  >
                    {trx.kind === 'income' ? '+' : trx.kind === 'expense' ? '−' : ''}
                    {formatIdr(trx.amount)}
                  </span>

                  {/* `.action-reveal`, bukan `opacity-0` + `group-hover`.
                      Cacat yang sama sudah diperbaiki di Dompet, Anggaran, dan
                      Tujuan; baris ini terlewat. Di layar sentuh tidak pernah
                      ada `hover`, jadi kedua tombol menghitung `opacity: 0`
                      sementara kotak kliknya tetap menerima ketukan — tak
                      terlihat tetapi tetap bisa tertekan tanpa sengaja. */}
                  <div className="action-reveal flex shrink-0 gap-0.5 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ubah transaksi ${formatIdr(trx.amount)}`}
                      onClick={() => {
                        setEditing(trx);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={15} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus transaksi ${formatIdr(trx.amount)}`}
                      loading={remove.isPending && remove.variables === trx.id}
                      onClick={() => {
                        remove.mutate(trx.id);
                      }}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardBody>
      </Card>

      {list.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            loading={list.isFetchingNextPage}
            onClick={() => {
              void list.fetchNextPage();
            }}
          >
            Muat lebih banyak
          </Button>
        </div>
      ) : null}

      <TransactionDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setDraft(null);
        }}
        accounts={accounts}
        categories={categories}
        existing={editing}
        draft={draft}
      />
    </div>
  );
}
