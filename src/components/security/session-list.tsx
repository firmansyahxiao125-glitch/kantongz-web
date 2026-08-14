'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { labelPerangkat } from '@/lib/device';
import { formatDateTime, formatRelative } from '@/lib/format';
import { sessionKeys, sessions } from '@/lib/ledger';
import type { ActiveSession } from '@/lib/contracts';

/**
 * Sesi aktif, dan pengakhiran satu per satu.
 *
 * ── MENGAPA HALAMAN INI AKHIRNYA BISA MELAKUKAN SESUATU ────────────────
 *
 * Rotasi refresh token dan deteksi pemakaian ulang sudah berjalan sejak lama
 * dan seluruhnya tidak terlihat. Sebelum ini satu-satunya tindakan yang
 * tersedia bagi pengguna yang curiga adalah mengganti kata sandi — yang
 * mengeluarkan SEMUA perangkat, termasuk miliknya sendiri.
 *
 * ── SESI SEKARANG DITANDAI, DAN TIDAK PUNYA TOMBOL AKHIRI ──────────────
 *
 * Penandanya datang dari klaim token di server, bukan dari tebakan klien.
 * Tombolnya sengaja TIDAK ADA pada baris itu: mengakhiri sesi sendiri dari
 * daftar ini terasa seperti mencabut sesi asing dan justru mengeluarkan diri
 * sendiri. Untuk keluar dari peramban ini sudah ada kartunya sendiri di bawah,
 * dengan kata kerja yang jelas.
 */

const IKON: Record<string, typeof Laptop> = {
  web: Monitor,
  ios: Smartphone,
  android: Smartphone,
};

export function SessionList() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: sessionKeys.list, queryFn: sessions.list });

  const akhiri = useMutation({
    mutationFn: (id: string) => sessions.revoke(id),
    onSuccess: async () => {
      toast.success('Sesi diakhiri.');
      await client.invalidateQueries({ queryKey: sessionKeys.list });
    },
    onError: () => {
      toast.error('Gagal mengakhiri sesi. Coba lagi.');
    },
  });

  return (
    <Card>
      <CardBody>
        <CardHeader title="Sesi aktif" />
        <p className="-mt-2 mb-4 text-sm leading-relaxed text-muted">
          Setiap perangkat yang sedang masuk ke akunmu. Ada yang tidak kamu kenali? Akhiri sesinya
          — token perangkat itu langsung dicabut.
        </p>

        {q.isPending ? (
          /* Kerangka BERBENTUK barisnya: ikon, dua baris teks, satu tombol.
             Kerangka yang berbeda bentuk dari isinya menjanjikan tata letak
             yang tidak akan datang. */
          <ul className="space-y-2" aria-busy="true">
            {[0, 1].map((i) => (
              <li key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--line)] px-3.5 py-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32 max-w-[55%]" />
                  <Skeleton className="h-3 w-24 max-w-[40%]" />
                </div>
              </li>
            ))}
            <span className="sr-only">Memuat sesi aktif</span>
          </ul>
        ) : q.isError ? (
          <ErrorState
            error={q.error}
            onRetry={() => {
              void q.refetch();
            }}
          />
        ) : (
          <ul className="space-y-2">
            {q.data.map((s) => (
              <SessionRow
                key={s.id}
                sesi={s}
                sedangDiakhiri={akhiri.isPending && akhiri.variables === s.id}
                onAkhiri={() => {
                  akhiri.mutate(s.id);
                }}
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function SessionRow({
  sesi,
  sedangDiakhiri,
  onAkhiri,
}: {
  sesi: ActiveSession;
  sedangDiakhiri: boolean;
  onAkhiri: () => void;
}) {
  const Icon = IKON[sesi.platform] ?? Laptop;
  /* Sesi yang tersimpan SEBELUM BFF berhenti menyimpan User-Agent utuh masih
     membawa string sepanjang 120 karakter. Meringkasnya di sini membuat baris
     lama ikut terbaca, alih-alih menunggu mereka kedaluwarsa sendiri. */
  const nama = labelPerangkat(sesi.platform, sesi.model);

  return (
    /*
      Menumpuk di ponsel, berdampingan mulai 640px — pelajaran dari halaman
      Anggaran, tempat blok kanan `shrink-0` meremukkan nama sampai lebar nol.
      Di sini nama perangkat yang paling penting dibaca, jadi ia yang mendapat
      baris penuh lebih dulu.
    */
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--line)] px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] text-muted"
        aria-hidden
      >
        <Icon size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink">
          <span className="truncate">{nama}</span>
          {sesi.current ? (
            /* Warna saja tidak cukup — sepuluh persen laki-laki tidak dapat
               membedakannya. Katanya yang menjelaskan, bukan warnanya. */
            <span className="rounded-full bg-[color-mix(in_oklab,var(--color-positive)_16%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-positive)]">
              Perangkat ini
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-dim">
          {sesi.platform}
          {sesi.appVersion === null ? '' : ` · v${sesi.appVersion}`} · aktif{' '}
          <time dateTime={new Date(sesi.lastSeenAt).toISOString()} title={formatDateTime(sesi.lastSeenAt)}>
            {formatRelative(sesi.lastSeenAt)}
          </time>
        </p>
      </div>

      {/*
        TIDAK ADA tombol pada sesi ini sendiri — lihat alasannya di atas.
        Tombolnya juga tidak memakai `.action-reveal`: kontrol keamanan yang
        harus dicari lebih dulu adalah kontrol yang tidak dipakai saat
        dibutuhkan.
      */}
      {sesi.current ? null : (
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 self-start sm:self-auto"
          loading={sedangDiakhiri}
          aria-label={`Akhiri sesi ${nama}`}
          onClick={onAkhiri}
        >
          Akhiri
        </Button>
      )}
    </li>
  );
}
