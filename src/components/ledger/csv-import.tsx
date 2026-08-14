'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { isApiError } from '@/lib/api';
import { bacaCsvTransaksi, type KesalahanBaris } from '@/lib/csv';
import { messageFor } from '@/lib/contracts';
import {
  MAX_IMPORT_ROWS,
  impor,
  keys,
  type Category,
  type ImportReport,
  type ImportRow,
  type WalletAccount,
} from '@/lib/ledger';

/**
 * Impor CSV.
 *
 * ── PRATINJAU LEBIH DULU, SELALU ────────────────────────────────────────
 *
 * Berkas dibaca, dicocokkan, lalu dikirim ke peladen dengan `dryRun` — yang
 * kembali adalah nasib SETIAP baris, dan tidak satu pun tertulis. Baru
 * sesudah orangnya menekan tombol keduanya, berkasnya benar-benar masuk.
 *
 * Berkas seribu baris yang langsung masuk lalu ternyata salah kolom adalah
 * seribu baris yang harus dihapus satu per satu, dan tidak ada cara
 * membedakan mana yang barusan masuk dari mana yang sudah lama ada.
 */

const MAX_BYTES = 2 * 1024 * 1024;

interface Siap {
  rows: ImportRow[];
  /** Nomor baris di berkas, sejajar dengan `rows`. Untuk pesan galat. */
  lines: number[];
  errors: KesalahanBaris[];
  report: ImportReport;
}

function normal(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Nama dipetakan ke id di KLIEN, bukan di peladen.
 *
 * Peladen hanya mengenal id — sama seperti setiap rute lain — dan itu
 * membuatnya tidak perlu menebak apa yang dimaksud "BCA" milik siapa. Nama
 * yang tidak dikenali dilaporkan sebagai galat baris, bukan diam-diam dibuat:
 * satu salah ketik akan melahirkan dompet kembar yang saldonya terbelah.
 */
function petakan(
  hasil: ReturnType<typeof bacaCsvTransaksi>,
  accounts: WalletAccount[],
  categories: Category[],
): { rows: ImportRow[]; lines: number[]; errors: KesalahanBaris[] } {
  const akun = new Map(accounts.map((a) => [normal(a.name), a.id]));
  const kategori = new Map(categories.map((c) => [`${normal(c.name)}|${c.kind}`, c.id]));

  const rows: ImportRow[] = [];
  const lines: number[] = [];
  const errors = [...hasil.errors];

  for (const baris of hasil.rows) {
    const accountId = akun.get(normal(baris.accountName));
    if (!accountId) {
      errors.push({ line: baris.line, reason: `dompet "${baris.accountName}" belum ada` });
      continue;
    }

    let counterAccountId: string | undefined;
    if (baris.kind === 'transfer') {
      counterAccountId = akun.get(normal(baris.counterAccountName));
      if (!counterAccountId) {
        errors.push({
          line: baris.line,
          reason: baris.counterAccountName
            ? `dompet tujuan "${baris.counterAccountName}" belum ada`
            : 'transfer tanpa dompet tujuan',
        });
        continue;
      }
    }

    /* Kategori dicari BESERTA jenisnya: nama yang sama bisa ada di pemasukan
       dan pengeluaran, dan pasangan yang tidak cocok ditolak peladen. */
    const categoryId =
      baris.kind === 'transfer' || baris.categoryName.length === 0
        ? undefined
        : kategori.get(`${normal(baris.categoryName)}|${baris.kind}`);

    if (baris.kind !== 'transfer' && baris.categoryName.length > 0 && !categoryId) {
      errors.push({
        line: baris.line,
        reason: `kategori "${baris.categoryName}" belum ada untuk jenis ini`,
      });
      continue;
    }

    rows.push({
      accountId,
      kind: baris.kind,
      amount: baris.amount,
      /* Tengah hari lokal, sama seperti pencatatan manual: transaksi tanggal 1
         yang disimpan sebagai 00:00 jatuh ke bulan sebelumnya begitu ada
         pergeseran zona sebesar apa pun. */
      occurredAt: new Date(`${baris.occurredAt}T12:00:00`).getTime(),
      ...(counterAccountId ? { counterAccountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(baris.merchant ? { merchant: baris.merchant } : {}),
      ...(baris.note ? { note: baris.note } : {}),
    });
    lines.push(baris.line);
  }

  errors.sort((a, b) => a.line - b.line);
  return { rows, lines, errors };
}

export function CsvImportButton({
  accounts,
  categories,
}: {
  accounts: WalletAccount[];
  categories: Category[];
}) {
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [siap, setSiap] = useState<Siap | null>(null);

  const segarkan = async (): Promise<void> => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['transactions'] }),
      client.invalidateQueries({ queryKey: keys.dashboard }),
      client.invalidateQueries({ queryKey: keys.accounts }),
      client.invalidateQueries({ queryKey: keys.budgets }),
    ]);
  };

  const galat = (error: unknown): void => {
    toast.error(
      isApiError(error) ? messageFor(error.code) : 'Berkas gagal diproses. Coba lagi.',
    );
  };

  const lihat = useMutation({
    mutationFn: async (file: File) => {
      const teks = await file.text();
      const dibaca = bacaCsvTransaksi(teks);
      const dipetakan = petakan(dibaca, accounts, categories);

      if (dipetakan.rows.length > MAX_IMPORT_ROWS) {
        throw new Error('terlalu banyak baris');
      }

      const report = await impor.jalankan(dipetakan.rows, true);
      return { ...dipetakan, report } satisfies Siap;
    },
    onSuccess: (hasil) => {
      if (hasil.rows.length === 0 && hasil.errors.length === 0) {
        toast.error('Tidak ada baris transaksi di berkas itu.');
        return;
      }
      setSiap(hasil);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'terlalu banyak baris') {
        toast.error(`Maksimal ${String(MAX_IMPORT_ROWS)} baris sekali unggah. Pecah berkasnya.`);
        return;
      }
      galat(error);
    },
  });

  const tulis = useMutation({
    mutationFn: (rows: ImportRow[]) => impor.jalankan(rows, false),
    onSuccess: async (report) => {
      toast.success(
        report.imported === 0
          ? 'Tidak ada baris baru — semuanya sudah ada.'
          : `${String(report.imported)} transaksi diimpor.`,
      );
      setSiap(null);
      await segarkan();
    },
    onError: galat,
  });

  const laporan = siap?.report;

  return (
    <>
      {/* `display: none`, bukan `sr-only`: yang kedua tetap dapat difokus
          dengan Tab, jadi pengguna papan tik mendarat di kontrol tak terlihat
          di antara tombol-tombol yang terlihat. */}
      <input
        ref={input}
        type="file"
        className="hidden"
        accept=".csv,text/csv,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          /* Dikosongkan lebih dulu: tanpa ini, memilih berkas yang sama dua
             kali berturut-turut tidak memicu `change` sama sekali. */
          event.target.value = '';
          if (!file) return;

          if (file.size > MAX_BYTES) {
            toast.error('Berkasnya lebih dari 2 MB. Pecah dulu, lalu coba lagi.');
            return;
          }
          lihat.mutate(file);
        }}
      />

      <Button
        variant="secondary"
        icon={<Upload size={16} aria-hidden />}
        disabled={accounts.length === 0}
        loading={lihat.isPending}
        onClick={() => {
          input.current?.click();
        }}
      >
        Impor CSV
      </Button>

      <Dialog
        open={siap !== null}
        onClose={() => {
          setSiap(null);
        }}
        title="Periksa sebelum mengimpor"
        description="Belum ada satu baris pun yang tersimpan. Berikut yang akan terjadi."
      >
        {siap && laporan ? (
          <div className="space-y-4">
            <ul className="grid grid-cols-3 gap-2 text-center">
              <RingkasanSel angka={laporan.imported} label="akan masuk" nada="baik" />
              <RingkasanSel angka={laporan.duplicate} label="sudah ada" nada="netral" />
              <RingkasanSel angka={laporan.failed + siap.errors.length} label="dilewati" nada="buruk" />
            </ul>

            {laporan.duplicate > 0 ? (
              /* Dikatakan, bukan disembunyikan. Orang mengunggah berkas yang
                 sama dua kali dengan sengaja; yang mereka butuhkan adalah
                 kepastian bahwa itu tidak menggandakan apa pun. */
              <p className="text-sm text-muted">
                {String(laporan.duplicate)} baris sudah ada di pembukuan dan akan dilewati — dompet,
                jumlah, tanggal, dan merchant-nya sama persis.
              </p>
            ) : null}

            {siap.errors.length > 0 || laporan.failed > 0 ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-2 text-xs text-muted">
                  Baris yang dilewati, beserta alasannya:
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-ink">
                  {siap.errors.slice(0, 20).map((e) => (
                    <li key={`csv-${String(e.line)}`}>
                      <span className="numeric text-dim">baris {e.line}</span> — {e.reason}
                    </li>
                  ))}
                  {laporan.results
                    .filter((r) => r.status === 'error')
                    .slice(0, 20)
                    .map((r) => (
                      <li key={`api-${String(r.index)}`}>
                        <span className="numeric text-dim">
                          baris {siap.lines[r.index] ?? r.index + 2}
                        </span>{' '}
                        — {r.reason ?? 'ditolak'}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                block
                onClick={() => {
                  setSiap(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                block
                disabled={laporan.imported === 0}
                loading={tulis.isPending}
                onClick={() => {
                  tulis.mutate(siap.rows);
                }}
              >
                {laporan.imported === 0
                  ? 'Tidak ada yang baru'
                  : `Impor ${String(laporan.imported)} baris`}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function RingkasanSel({
  angka,
  label,
  nada,
}: {
  angka: number;
  label: string;
  nada: 'baik' | 'netral' | 'buruk';
}) {
  /* Nol selalu netral, apa pun nadanya: "0 dilewati" adalah kabar baik, dan
     mewarnainya merah membuat impor yang sempurna terlihat bermasalah. */
  const warna =
    angka === 0
      ? 'text-dim'
      : nada === 'baik'
        ? 'text-[var(--color-positive)]'
        : nada === 'buruk'
          ? 'text-[var(--color-caution)]'
          : 'text-ink';

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--line)] p-3">
      <p className={`numeric text-xl font-semibold tracking-tight ${warna}`}>{angka}</p>
      <p className="text-xs text-dim">{label}</p>
    </li>
  );
}
