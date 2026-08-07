'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TransactionDialog } from '@/components/ledger/transaction-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { formatDate, formatIdr } from '@/lib/format';
import {
  keys,
  ledger,
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

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <Select
              label="Jenis"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as TransactionKind | '');
              }}
              options={[
                { value: '', label: 'Semua' },
                { value: 'expense', label: 'Pengeluaran' },
                { value: 'income', label: 'Pemasukan' },
                { value: 'transfer', label: 'Transfer' },
              ]}
            />
          </div>

          <div className="w-48">
            <Select
              label="Dompet"
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
        </div>

        <Button
          icon={<Plus size={16} aria-hidden />}
          disabled={accounts.length === 0}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Catat transaksi
        </Button>
      </header>

      <Card>
        <CardBody className="p-0">
          {list.isPending ? (
            <div className="space-y-2 p-5" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description={
                accounts.length === 0
                  ? 'Buat dompet dulu di halaman Dompet, lalu catat transaksi pertamamu.'
                  : 'Catat pemasukan atau pengeluaran pertamamu — dasbor akan langsung mengikuti.'
              }
            />
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
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]"
                    aria-hidden
                  >
                    {trx.kind === 'income' ? (
                      <ArrowDownLeft size={16} className="text-[var(--color-success)]" />
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
                    <p className="truncate text-xs text-faint">
                      {formatDate(trx.occurredAt)} · {accountName.get(trx.accountId) ?? '—'}
                      {trx.kind === 'transfer' || !trx.categoryId
                        ? ''
                        : ` · ${categoryName.get(trx.categoryId) ?? ''}`}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-sm tabular ${
                      trx.kind === 'income' ? 'text-[var(--color-success)]' : 'text-ink'
                    }`}
                  >
                    {trx.kind === 'income' ? '+' : trx.kind === 'expense' ? '−' : ''}
                    {formatIdr(trx.amount)}
                  </span>

                  {/* Terlihat saat disorot ATAU saat difokus keyboard — kontrol
                      yang hanya muncul pada hover tidak pernah bisa dicapai Tab. */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
        }}
        accounts={accounts}
        categories={categories}
        existing={editing}
      />
    </div>
  );
}
