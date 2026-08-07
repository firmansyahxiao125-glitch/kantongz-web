'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthPanel } from '@/components/auth/auth-panel';
import { CodeStep } from '@/components/auth/code-step';
import { FormAlert } from '@/components/auth/form-alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { isApiError } from '@/lib/api';
import { messageFor, type PendingVerification } from '@/lib/contracts';
import { register as registerAccount, verify } from '@/lib/session';

/** §8 — sandi minimal delapan karakter, ditegakkan juga di backend. Aturan yang
 *  hanya hidup di klien bukan aturan. */
const MIN_PASSWORD = 8;

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Masukkan namamu.').max(120, 'Nama terlalu panjang.'),
    email: z.string().min(1, 'Masukkan emailmu.').email('Format email belum benar.'),
    password: z.string().min(MIN_PASSWORD, `Minimal ${String(MIN_PASSWORD)} karakter.`),
    confirm: z.string().min(1, 'Ulangi kata sandimu.'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Kedua kata sandi belum sama.',
    path: ['confirm'],
  });

type Values = z.infer<typeof schema>;

export default function DaftarPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirm: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      setPending(await registerAccount(values.fullName, values.email, values.password));
    } catch (error) {
      setFailure(isApiError(error) ? messageFor(error.code) : messageFor('unknown'));
    }
  });

  if (pending) {
    return (
      <CodeStep
        title="Masukkan kode"
        pending={pending}
        submitLabel="Verifikasi & masuk"
        onSubmit={async (code) => {
          await verify(pending.ticket, code);
          router.replace('/dasbor');
        }}
        onBack={() => {
          setPending(null);
        }}
      />
    );
  }

  return (
    <AuthPanel
      title="Buat akun"
      description="Satu menit sekarang, kendali penuh setelahnya."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-medium text-[var(--color-holo)] hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormAlert message={failure} />

        <Field
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Nama sesuai identitas"
          error={form.formState.errors.fullName?.message}
          {...form.register('fullName')}
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          hint={`Minimal ${String(MIN_PASSWORD)} karakter.`}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <Field
          label="Ulangi kata sandi"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={form.formState.errors.confirm?.message}
          {...form.register('confirm')}
        />

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting}>
          Lanjutkan
        </Button>

        <p className="text-center text-xs leading-relaxed text-faint">
          Dengan melanjutkan kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi KANTONGZ.
        </p>
      </form>
    </AuthPanel>
  );
}
