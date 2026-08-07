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
});

type Values = z.infer<typeof schema>;

export default function MasukPage() {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await signIn(values.email, values.password);
      router.replace('/dasbor');
    } catch (error) {
      /*
       * Pesan dari server TIDAK ditampilkan. Kodenya yang diterjemahkan —
       * itulah yang menjaga backend bebas mengubah kalimatnya tanpa mengubah
       * bahasa produk, dan yang mencegah detail internal bocor ke layar.
       */
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

        <div className="flex justify-end">
          <Link
            href="/pulihkan"
            className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            Lupa kata sandi?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={form.formState.isSubmitting}>
          Masuk
        </Button>
      </form>
    </AuthPanel>
  );
}
