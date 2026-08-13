'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/state';
import { downloadText, transactionsToCsv } from '@/lib/export';
import { formatDate, formatIdr } from '@/lib/format';
import { keys, ledger } from '@/lib/ledger';

/**
 * Laporan periode.
 *
 * Rentang default adalah bulan berjalan. Batas atas diambil pada akhir hari
 * lokal, bukan tengah malam awal hari — rentang yang berakhir di 00:00 diam-diam
 * membuang seluruh transaksi hari terakhir, dan tidak ada yang menyadarinya
 * sampai total laporan tidak cocok dengan dasbor.
 */

const MAX_ROWS = 100;

function firstOfMonth(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function LaporanPage() {
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const range = useMemo(
    () => ({
      from: new Date(`${from}T00:00:00`).getTime(),
      to: new Date(`${to}T23:59:59.999`).getTime(),
      limit: MAX_ROWS,
    }),
    [from, to],
  );

  const list = useQuery({
    queryKey: keys.transactions(range),
    queryFn: () => ledger.transactions(range),
  });
  const accounts = useQuery({ queryKey: keys.accounts, queryFn: ledger.accounts });
  const categories = useQuery({ queryKey: keys.categories, queryFn: ledger.categories });

  const rows = list.data?.items ?? [];
  const income = rows.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.amount, 0);

  function unduh(): void {
    if (rows.length === 0) {
      toast.error('Tidak ada transaksi pada rentang ini.');
      return;
    }

    downloadText(
      `kantongz-${from}-sd-${to}.csv`,
      transactionsToCsv(rows, accounts.data ?? [], categories.data ?? []),
      'text/csv',
    );
    toast.success('Berkas CSV diunduh.');
  }

  return (
    <div className="space-y-5">
      {/* `print:hidden` — kepala halaman ini alat, bukan isi laporan. Yang
          dicetak adalah datanya, dan judul aplikasi di atas kertas hanya
          memakan baris pertama. */}
      <PageHeader
        className="print:hidden"
        title="Laporan"
        description="Pilih rentang tanggal, lalu unduh atau cetak rekap transaksinya."
      />

      <Card className="print:hidden">
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Field
              label="Dari"
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                setFrom(event.target.value);
              }}
            />
          </div>
          <div className="w-44">
            <Field
              label="Sampai"
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                setTo(event.target.value);
              }}
            />
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              icon={<Printer size={16} aria-hidden />}
              onClick={() => {
                window.print();
              }}
            >
              Cetak / PDF
            </Button>
            <Button icon={<Download size={16} aria-hidden />} onClick={unduh}>
              Unduh CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {/* Satu-satunya judul kartu yang SENGAJA lebih besar dari `text-sm`.
              Kartu ini adalah laporannya sendiri, dan kepala halaman di atas
              memakai `print:hidden` — jadi di atas kertas baris inilah judul
              dokumennya. Judul cetak setinggi 14px terbaca sebagai keterangan,
              bukan judul. Tingkatnya tetap `CardTitle` supaya strukturnya sama
              dengan kartu mana pun. */}
          <CardHeader className="mb-4 flex-wrap gap-3 border-b border-line pb-4">
            <div>
              <CardTitle className="text-base tracking-tight">Laporan transaksi</CardTitle>
              <p className="text-sm text-muted">
                {formatDate(range.from)} — {formatDate(range.to)}
              </p>
            </div>

            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted">Pemasukan</dt>
                <dd className="numeric text-[var(--color-positive)]">{formatIdr(income)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Pengeluaran</dt>
                <dd className="numeric text-ink">{formatIdr(expense)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Selisih</dt>
                <dd
                  className={`numeric ${income - expense < 0 ? 'text-[var(--color-negative)]' : 'text-ink'}`}
                >
                  {formatIdr(income - expense)}
                </dd>
              </div>
            </dl>
          </CardHeader>

          {list.isPending ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : list.isError ? (
            <ErrorState
              error={list.error}
              onRetry={() => {
                void list.refetch();
              }}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Tidak ada transaksi"
              description="Belum ada catatan pada rentang tanggal ini. Coba lebarkan rentangnya."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Tanggal
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Keterangan
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Dompet
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      Jumlah
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((trx) => {
                    const account = (accounts.data ?? []).find((a) => a.id === trx.accountId);
                    const category = (categories.data ?? []).find((c) => c.id === trx.categoryId);

                    return (
                      <tr key={trx.id} className="border-b border-[var(--line)] last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted">
                          {formatDate(trx.occurredAt)}
                        </td>
                        <td className="py-2 pr-3 text-ink">
                          {trx.merchant ?? trx.note ?? category?.name ?? '—'}
                        </td>
                        <td className="py-2 pr-3 text-muted">{account?.name ?? '—'}</td>
                        <td
                          className={`numeric py-2 pl-3 text-right whitespace-nowrap ${
                            trx.kind === 'income' ? 'text-[var(--color-positive)]' : 'text-ink'
                          }`}
                        >
                          {trx.kind === 'income' ? '+' : trx.kind === 'expense' ? '−' : ''}
                          {formatIdr(trx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {list.data?.nextCursor ? (
                <p className="mt-4 text-xs text-dim">
                  Menampilkan {MAX_ROWS} transaksi teratas pada rentang ini. Persempit rentangnya
                  untuk laporan yang lengkap.
                </p>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
