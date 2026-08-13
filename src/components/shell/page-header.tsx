import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Kepala halaman.
 *
 * ── MENGAPA IA ADA ──────────────────────────────────────────────────────
 *
 * Sebelum ini judul halaman hidup HANYA di bilah lengket `AppShell`, setinggi
 * 15px, dan empat halaman — Transaksi, Dompet, Anggaran, Tujuan — karena itu
 * tidak punya judul di dalam area isinya sama sekali. Yang pertama dibaca mata
 * di halaman Transaksi adalah dua label penyaring, yang bobotnya persis sama
 * dengan judul kartu di bawahnya. Halaman tanpa puncak hierarki memaksa
 * pembacanya memilih sendiri harus mulai dari mana.
 *
 * ── SATU H1, DAN LETAKNYA DI SINI ───────────────────────────────────────
 *
 * `AppShell` berhenti merender judul sebagai `<h1>` bersamaan dengan lahirnya
 * komponen ini; di sana ia turun menjadi konteks navigasi biasa. Dua `<h1>` di
 * satu dokumen bukan sekadar salah secara semantik — pembaca layar yang
 * melompat antar-heading akan mendengar judul yang sama dua kali dan kehilangan
 * kepercayaan pada strukturnya.
 *
 * ── UKURANNYA `text-h3`, DAN ITU DISENGAJA ──────────────────────────────
 *
 * DESIGN §6 menetapkan satu H1 VISUAL per layar, dan H1 itu adalah nilai uang
 * berwarna kuningan — di dasbor ia 40px. Judul halaman memakai `text-h3`
 * (18→24px): cukup besar untuk menjadi puncak struktur halaman, dan tetap
 * TUNDUK pada angka uang yang menjadi puncak perhatian. Memakai `text-h2`
 * (24→36px) akan membuat kata "Dasbor" bersaing dengan kekayaan bersih, dan
 * yang kalah dalam persaingan itu selalu angkanya.
 */

export interface PageHeaderProps {
  title: string;
  /** Satu kalimat: apa yang bisa dilakukan di halaman ini. */
  description?: string;
  /** Aksi utama halaman. Kanan atas di layar lebar, turun ke bawah di ponsel. */
  actions?: ReactNode;
  /** Penyaring atau kontrol konteks. Berada DI BAWAH judul, bukan menggantikannya. */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      {/* `items-start` dan bukan `items-center`: begitu deskripsinya membungkus
          jadi dua baris di layar sempit, penengahan vertikal menggeser tombol
          ke posisi yang tidak sejajar dengan apa pun. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-h3 text-ink">{title}</h1>
          {description ? (
            /* Lebar dibatasi. Baris teks yang melampaui ~75 karakter membuat
               mata kehilangan awal baris berikutnya saat kembali. */
            <p className="max-w-prose text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {children}
    </header>
  );
}
