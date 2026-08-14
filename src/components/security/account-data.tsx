'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { account } from '@/lib/ledger';
import { forget } from '@/lib/session';

/**
 * Data akun: mengunduh semuanya, dan menutup akun.
 *
 * Keduanya duduk di kartu yang SAMA, dan itu disengaja. Orang yang hendak
 * pergi harus melihat tombol unduh sebelum tombol tutup — kehilangan catatan
 * bertahun-tahun karena tidak tahu ekspor itu ada adalah kerugian yang tidak
 * dapat diperbaiki sesudahnya.
 */
export function AccountData() {
  const router = useRouter();
  const [tutup, setTutup] = useState(false);

  const unduh = useMutation({
    mutationFn: account.exportData,
    onSuccess: (data) => {
      /*
       * Berkas dirakit di klien dari respons JSON. Alternatifnya membuka URL
       * API di tab baru, dan itu TIDAK membawa header Authorization — token
       * akses hidup di memori tab ini saja, tidak pernah di kuki.
       */
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kantongz-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data diunduh.');
    },
    onError: () => {
      toast.error('Gagal mengunduh data. Coba lagi.');
    },
  });

  return (
    <Card>
      <CardBody>
        <CardHeader title="Data akunmu" />
        <p className="-mt-2 text-sm leading-relaxed text-muted">
          Seluruh dompet, transaksi, anggaran, dan tujuanmu dalam satu berkas JSON. Tidak memuat
          kata sandi maupun kunci keamanan.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={15} aria-hidden />}
            loading={unduh.isPending}
            className="shrink-0 self-start"
            onClick={() => {
              unduh.mutate();
            }}
          >
            Unduh data
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={15} aria-hidden />}
            className="shrink-0 self-start text-[var(--color-negative)]"
            onClick={() => {
              setTutup(true);
            }}
          >
            Tutup akun
          </Button>
        </div>
      </CardBody>

      <Dialog
        open={tutup}
        onClose={() => {
          setTutup(false);
        }}
        title="Tutup akun"
        description="Sesudah ini kamu tidak bisa masuk lagi, dan seluruh perangkat dikeluarkan."
      >
        <FormTutup
          onDone={() => {
            /* Sesi lokal dibersihkan sebelum berpindah: membiarkannya membuat
               penjaga rute mencoba menyegarkan token yang sudah dicabut, dan
               pengguna melihat galat jaringan sebagai perpisahan. */
            forget();
            router.replace('/masuk');
          }}
        />
      </Dialog>
    </Card>
  );
}

function FormTutup({ onDone }: { onDone: () => void }) {
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  const tutup = useMutation({
    mutationFn: () => account.close(sandi),
    onSuccess: () => {
      toast.success('Akun ditutup.');
      onDone();
    },
    onError: (e) => {
      setGalat(isApiError(e) ? messageFor(e.code) : messageFor('unknown'));
    },
  });

  return (
    <div className="space-y-4">
      <FormAlert message={galat} />

      {/*
        Dinyatakan APA ADANYA, termasuk yang TIDAK terjadi.
        Menjanjikan penghapusan seketika yang tidak dilakukan siapa pun akan
        membuat pengguna berhenti khawatir atas data yang masih ada.
      */}
      <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
        <li>· Kamu langsung tidak bisa masuk, dan semua sesi dicabut.</li>
        <li>· Kunci verifikasi dua langkah dimusnahkan.</li>
        <li>· Emailmu bebas dipakai mendaftar lagi kapan pun.</li>
        <li>· Catatan keuanganmu belum terhapus dari server saat itu juga.</li>
      </ul>

      <p className="text-sm font-medium text-ink">
        Sudah mengunduh datamu? Sesudah akun ditutup kamu tidak bisa mengambilnya sendiri.
      </p>

      <Field
        label="Kata sandi"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={sandi}
        onChange={(e) => {
          setSandi(e.target.value);
        }}
      />

      <Button
        variant="danger"
        block
        loading={tutup.isPending}
        disabled={sandi.length === 0}
        onClick={() => {
          setGalat(null);
          tutup.mutate();
        }}
      >
        Tutup akun saya
      </Button>
    </div>
  );
}
