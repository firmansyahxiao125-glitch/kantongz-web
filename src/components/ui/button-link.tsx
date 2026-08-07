import type { VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { buttonStyle } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Tautan yang tampil sebagai tombol.
 *
 * Tetap `<a>` di DOM, bukan `<button>` dengan `onClick` yang memanggil router.
 * Yang kedua tidak bisa dibuka di tab baru, tidak muncul di daftar tautan
 * pembaca layar, dan tidak menampilkan alamat tujuan di bilah status.
 */
export interface ButtonLinkProps
  extends ComponentProps<typeof Link>,
    VariantProps<typeof buttonStyle> {
  children: ReactNode;
}

export function ButtonLink({ className, variant, size, block, ...rest }: ButtonLinkProps) {
  return <Link className={cn(buttonStyle({ variant, size, block }), className)} {...rest} />;
}
