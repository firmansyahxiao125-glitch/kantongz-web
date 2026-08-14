'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/state';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { totp, totpKeys } from '@/lib/ledger';

/**
 * Verifikasi dua langkah.
 *
 * ── MENGAPA TIDAK ADA KODE QR ──────────────────────────────────────────
 *
 * Memindai memang lebih nyaman, dan itu SENGAJA ditunda. Membuat kode QR
 * menuntut encoder Reed-Solomon beserta penutupan pola dan maskingnya —
 * ratusan baris yang, menurut aturan yang dipakai repositori ini pada TOTP
 * sendiri, hanya boleh dipercaya kalau diuji terhadap vektor RESMI. Menuliskan
 * sebanyak itu tanpa vektor akan menjadi bagian paling rapuh dari seluruh alur
 * keamanan ini.
 *
 * Memasukkan kunci secara manual didukung SETIAP aplikasi autentikator, dan
 * kuncinya ditampilkan berkelompok empat karakter supaya benar-benar dapat
 * disalin tanpa salah. Nyaman menyusul; benar lebih dulu.
 */
export function TotpCard() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: totpKeys.status, queryFn: totp.status });

  const [daftar, setDaftar] = useState(false);
  const [matikan, setMatikan] = useState(false);

  return (
    <Card>
      <CardBody>
        <CardHeader title="Verifikasi dua langkah" />
        <p className="-mt-2 text-sm leading-relaxed text-muted">
          Kata sandi yang bocor tidak lagi cukup untuk masuk. Setiap kali masuk, aplikasi
          autentikatormu memberi kode enam digit yang hanya berlaku tiga puluh detik.
        </p>

        <div className="mt-4">
          {q.isPending ? (
            <Skeleton className="h-10 w-44" />
          ) : q.isError ? (
            <FormAlert message={messageFor('unknown')} />
          ) : q.data.enabled ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-[var(--color-positive)]">
                <ShieldCheck size={16} aria-hidden />
                Aktif · {q.data.recoveryCodesLeft} kode pemulihan tersisa
              </p>
              <Button
                variant="danger"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                onClick={() => {
                  setMatikan(true);
                }}
              >
                Matikan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-muted">
                <ShieldOff size={16} aria-hidden />
                Belum aktif
              </p>
              <Button
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                onClick={() => {
                  setDaftar(true);
                }}
              >
                Aktifkan
              </Button>
            </div>
          )}
        </div>
      </CardBody>

      <Dialog
        open={daftar}
        onClose={() => {
          setDaftar(false);
        }}
        title="Aktifkan verifikasi dua langkah"
        description="Masukkan kunci di bawah ke aplikasi autentikatormu, lalu ketik kode yang muncul."
      >
        <FormPendaftaran
          onDone={async () => {
            setDaftar(false);
            await client.invalidateQueries({ queryKey: totpKeys.status });
          }}
        />
      </Dialog>

      <Dialog
        open={matikan}
        onClose={() => {
          setMatikan(false);
        }}
        title="Matikan verifikasi dua langkah"
        description="Akunmu kembali dijaga kata sandi saja. Kode pemulihanmu ikut dihapus."
      >
        <FormMatikan
          onDone={async () => {
            setMatikan(false);
            await client.invalidateQueries({ queryKey: totpKeys.status });
          }}
        />
      </Dialog>
    </Card>
  );
}

/** Kunci dipecah empat-empat: manusia menyalin 32 karakter jauh lebih akurat. */
function kelompokkan(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(' ');
}

function FormPendaftaran({ onDone }: { onDone: () => Promise<void> }) {
  const [kode, setKode] = useState('');
  const [galat, setGalat] = useState<string | null>(null);
  const [pemulihan, setPemulihan] = useState<string[] | null>(null);

  const setup = useQuery({ queryKey: ['auth', 'totp', 'setup'], queryFn: totp.setup, retry: false });

  const aktifkan = useMutation({
    mutationFn: () => totp.enable(kode.trim()),
    onSuccess: (data) => {
      /* Kode pemulihan ditampilkan SEKARANG dan tidak pernah lagi — yang
         tersimpan di server hanya hash-nya. Dialog sengaja tidak ditutup
         otomatis: menutupnya tanpa disalin berarti kehilangan satu-satunya
         jalan masuk ketika ponselnya hilang. */
      setPemulihan(data.recoveryCodes);
    },
    onError: (e) => {
      setGalat(isApiError(e) ? messageFor(e.code) : messageFor('unknown'));
    },
  });

  if (pemulihan) {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-caution)]/40 bg-[color-mix(in_oklab,var(--color-caution)_10%,transparent)] p-3.5">
          <p className="text-sm font-medium text-ink">Simpan kode pemulihan ini sekarang.</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Ini satu-satunya jalan masuk kalau ponselmu hilang. Setiap kode hanya bisa dipakai
            sekali, dan halaman ini tidak akan menampilkannya lagi.
          </p>
        </div>

        <ul className="numeric grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[var(--radius-md)] border border-[var(--line)] p-3.5 text-sm text-ink">
          {pemulihan.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>

        <Button
          block
          onClick={() => {
            void onDone();
            toast.success('Verifikasi dua langkah aktif.');
          }}
        >
          Sudah kusimpan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormAlert message={galat} />

      {setup.isPending ? (
        <Skeleton className="h-16" />
      ) : setup.isError ? (
        <FormAlert
          message={isApiError(setup.error) ? messageFor(setup.error.code) : messageFor('unknown')}
        />
      ) : (
        <div>
          <p className="text-xs text-muted">Kunci untuk aplikasi autentikator</p>
          <p className="numeric mt-1 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm break-all text-ink">
            {kelompokkan(setup.data.secret)}
          </p>
        </div>
      )}

      <Field
        label="Kode dari aplikasi"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        value={kode}
        onChange={(e) => {
          setKode(e.target.value);
        }}
      />

      <Button
        block
        loading={aktifkan.isPending}
        disabled={kode.trim().length < 6 || setup.isPending}
        onClick={() => {
          setGalat(null);
          aktifkan.mutate();
        }}
      >
        Aktifkan
      </Button>
    </div>
  );
}

function FormMatikan({ onDone }: { onDone: () => Promise<void> }) {
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<string | null>(null);

  const matikan = useMutation({
    mutationFn: () => totp.disable(sandi),
    onSuccess: () => {
      void onDone();
      toast.success('Verifikasi dua langkah dimatikan.');
    },
    onError: (e) => {
      setGalat(isApiError(e) ? messageFor(e.code) : messageFor('unknown'));
    },
  });

  return (
    <div className="space-y-4">
      <FormAlert message={galat} />

      {/* Kata sandi diminta LAGI: faktor kedua yang dapat dilepas tanpa faktor
          pertama tidak menjaga apa pun. */}
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
        loading={matikan.isPending}
        disabled={sandi.length === 0}
        onClick={() => {
          setGalat(null);
          matikan.mutate();
        }}
      >
        Matikan
      </Button>
    </div>
  );
}
