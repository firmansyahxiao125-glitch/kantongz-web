'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AuthPanel } from '@/components/auth/auth-panel';
import { CodeStep } from '@/components/auth/code-step';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { isApiError } from '@/lib/api';
import { messageFor, type PendingVerification } from '@/lib/contracts';
import { requestPasswordReset, resetPassword } from '@/lib/session';

const MIN_PASSWORD = 8;

const emailSchema = z.object({
  email: z.string().min(1, 'Masukkan emailmu.').email('Format email belum benar.'),
});

const passwordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD, `Minimal ${String(MIN_PASSWORD)} karakter.`),
    confirm: z.string().min(1, 'Ulangi kata sandimu.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Kedua kata sandi belum sama.',
    path: ['confirm'],
  });

type EmailValues = z.infer<typeof emailSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function PulihkanPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const askEmail = emailForm.handleSubmit(async (values) => {
    setFailure(null);
    try {
      /*
       * Permintaan ini SELALU berhasil, termasuk untuk email yang tidak
       * terdaftar (§11). Layar berikutnya karena itu tidak boleh menjanjikan
       * bahwa emailnya benar-benar terkirim — kalimatnya sengaja netral.
       */
      setPending(await requestPasswordReset(values.email));
    } catch (error) {
      setFailure(isApiError(error) ? messageFor(error.code) : messageFor('unknown'));
    }
  });

  const setNewPassword = passwordForm.handleSubmit(async (values) => {
    if (!pending || !code) return;
    setFailure(null);
    try {
      await resetPassword(pending.ticket, code, values.password);
      /* Reset TIDAK menerbitkan sesi (§11) — pengguna membuktikan sandi barunya
         dengan memakainya. */
      toast.success('Kata sandi diperbarui. Masuk dengan sandi barumu.');
      router.replace('/masuk');
    } catch (error) {
      setFailure(isApiError(error) ? messageFor(error.code) : messageFor('unknown'));
      setCode(null);
    }
  });

  if (pending && code) {
    return (
      <AuthPanel title="Kata sandi baru" description="Pilih sandi yang belum pernah kamu pakai.">
        <form onSubmit={setNewPassword} noValidate className="space-y-4">
          <FormAlert message={failure} />

          <Field
            label="Kata sandi baru"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            hint={`Minimal ${String(MIN_PASSWORD)} karakter.`}
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register('password')}
          />

          <Field
            label="Ulangi kata sandi baru"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={passwordForm.formState.errors.confirm?.message}
            {...passwordForm.register('confirm')}
          />

          <Button type="submit" size="lg" block loading={passwordForm.formState.isSubmitting}>
            Simpan & masuk ulang
          </Button>
        </form>
      </AuthPanel>
    );
  }

  if (pending) {
    return (
      <CodeStep
        title="Masukkan kode pemulihan"
        pending={pending}
        submitLabel="Lanjutkan"
        onSubmit={(entered) => {
          /* Kode belum diadu ke server di sini — backend menukarnya bersama
             sandi baru dalam satu langkah, dan memisahkannya akan membuka
             penebakan kode tanpa perlu menyiapkan sandi. */
          setCode(entered);
          return Promise.resolve();
        }}
        onBack={() => {
          setPending(null);
        }}
      />
    );
  }

  return (
    <AuthPanel
      title="Pulihkan akses"
      description="Masukkan emailmu. Kalau terdaftar, kode pemulihan akan dikirim ke sana."
      footer={
        <>
          Ingat kata sandimu?{' '}
          <Link href="/masuk" className="font-medium text-[var(--color-holo)] hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={askEmail} noValidate className="space-y-4">
        <FormAlert message={failure} />

        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@contoh.id"
          error={emailForm.formState.errors.email?.message}
          {...emailForm.register('email')}
        />

        <Button type="submit" size="lg" block loading={emailForm.formState.isSubmitting}>
          Kirim kode pemulihan
        </Button>
      </form>
    </AuthPanel>
  );
}
