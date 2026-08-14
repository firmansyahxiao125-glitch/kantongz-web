'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthPanel } from '@/components/auth/auth-panel';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { isApiError } from '@/lib/api';
import { messageFor } from '@/lib/contracts';
import { signIn } from '@/lib/session';

const schema = z.object({
  email: z.string().min(1, 'Masukkan emailmu.').email('Format email belum benar.'),
  password: z.string().min(1, 'Masukkan kata sandimu.'),
  /* Tidak wajib: sebagian besar akun tidak memakai 2FA, dan kolomnya baru
     muncul sesudah server memintanya. */
  totpCode: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export default function MasukPage() {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  /*
   * Dua langkah, bukan satu formulir dengan kolom kode yang selalu terlihat.
   *
   * Klien TIDAK dapat tahu apakah sebuah akun memakai 2FA sebelum kata
   * sandinya terbukti benar — dan itu memang disengaja di sisi server, sebab
   * memberitahukannya lebih awal memilah daftar target untuk penyerang.
   * Karena itu kolom kode baru muncul ketika server menjawab `totp_required`.
   */
  const [mintaKode, setMintaKode] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', totpCode: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await signIn(values.email, values.password, values.totpCode?.trim() || undefined);
      router.replace('/dasbor');
    } catch (error) {
      /*
       * Pesan dari server TIDAK ditampilkan. Kodenya yang diterjemahkan —
       * itulah yang menjaga backend bebas mengubah kalimatnya tanpa mengubah
       * bahasa produk, dan yang mencegah detail internal bocor ke layar.
       */
      if (isApiError(error) && error.code === 'totp_required') {
        /* Bukan kegagalan — kata sandinya BENAR. Menampilkannya sebagai galat
           membuat pengguna mengetik ulang sandi yang sudah tepat. */
        setMintaKode(true);
        setFailure(null);
        return;
      }
      setFailure(isApiError(error) ? messageFor(error.code) : messageFor('unknown'));
    }
  });

  return (
    <AuthPanel
      title="Masuk"
      description="Lanjutkan ke ruang keuanganmu."
      footer={
        <>
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-medium text-[var(--color-holo)] hover:underline">
            Buat sekarang
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert message={failure} />

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@contoh.id"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <Field
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        {mintaKode ? (
          <Field
            label="Kode autentikasi"
            /* `inputMode` numerik, tetapi `type="text"`: kode PEMULIHAN berisi
               huruf, dan input numerik akan menolaknya. */
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            hint="Dari aplikasi autentikatormu. Kehilangan ponsel? Masukkan salah satu kode pemulihanmu."
            error={form.formState.errors.totpCode?.message}
            {...form.register('totpCode')}
          />
        ) : null}

        <div className="flex justify-end">
          <Link
            href="/pulihkan"
            className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            Lupa kata sandi?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting}>
          {mintaKode ? 'Verifikasi' : 'Masuk'}
        </Button>
      </form>
    </AuthPanel>
  );
}
