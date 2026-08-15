'use client';

import Link from 'next/link';
import {
  ArrowLeftRight,
  FileUp,
  PiggyBank,
  Repeat,
  ScanLine,
  Target,
} from 'lucide-react';

import { Card, CardBody, CardTitle } from '@/components/ui/card';

/**
 * W2: kisi aksi cepat.
 *
 * ── ENAM, DAN TIDAK LEBIH ──────────────────────────────────────────────
 *
 * Kisi aksi cepat yang memuat segalanya berhenti menjadi pintasan dan berubah
 * menjadi menu kedua — dan menu kedua yang isinya berbeda dari menu pertama
 * adalah dua tempat untuk mencari hal yang sama.
 *
 * Yang masuk hanya yang benar-benar SERING dan benar-benar dimulai dari
 * dasbor. Enam kotak muat dalam satu pandangan pada ponsel maupun desktop;
 * kotak ketujuh memaksa gulir atau baris ketiga yang timpang.
 *
 * ── TAUTAN, BUKAN TOMBOL ───────────────────────────────────────────────
 *
 * Semuanya `Link`. Aksi yang membuka dialog di halaman lain tetap menuju
 * halamannya — pintasan yang membuka dialog DI SINI akan menduplikasi
 * formulir yang sudah ada, dan dua formulir untuk satu hal selalu menyimpang.
 */

const AKSI = [
  { label: 'Catat transaksi', ket: 'Masuk, keluar, transfer', href: '/transaksi', Ikon: ArrowLeftRight },
  { label: 'Pindai struk', ket: 'Foto jadi rancangan', href: '/transaksi', Ikon: ScanLine },
  { label: 'Buat anggaran', ket: 'Batas per kategori', href: '/anggaran', Ikon: PiggyBank },
  { label: 'Buat tujuan', ket: 'Target yang dikejar', href: '/tujuan', Ikon: Target },
  { label: 'Atur berulang', ket: 'Tagihan yang tetap', href: '/berulang', Ikon: Repeat },
  { label: 'Impor CSV', ket: 'Dari bank atau aplikasi lain', href: '/laporan', Ikon: FileUp },
] as const;

export function AksiCepat() {
  return (
    <Card>
      <CardBody>
        <CardTitle>Aksi cepat</CardTitle>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {AKSI.map(({ label, ket, href, Ikon }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex h-full flex-col gap-1.5 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-[var(--color-brass)]"
              >
                <Ikon className="size-4 text-[var(--color-brass)]" aria-hidden />
                <span className="text-sm text-ink">{label}</span>
                <span className="text-xs text-dim">{ket}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
