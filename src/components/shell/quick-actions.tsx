import { ArrowLeftRight, FileText, PiggyBank, Target, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * Aksi cepat.
 *
 * ── APA YANG KOMPONEN INI SEBENARNYA LAKUKAN ────────────────────────────
 *
 * Ia MENAVIGASI, bukan membuka formulir di tempat. Setiap ubin menuju halaman
 * yang aksi utamanya persis seperti tertulis di ubinnya — "Catat transaksi"
 * mendarat di Transaksi, tempat tombol dengan nama yang sama sudah menunggu di
 * kepala halaman.
 *
 * Membuka dialognya langsung dari dasbor menuntut dasbor ikut mengambil daftar
 * dompet dan kategori, lalu memasang `TransactionDialog` beserta seluruh
 * mutasinya. Itu query baru dan alur baru demi satu klik yang dihemat, dan
 * dasbor sudah punya pekerjaan sendiri. Kalau nanti diinginkan, jalannya lewat
 * parameter URL yang dibaca halaman tujuan — bukan lewat menyalin dialognya.
 *
 * ── YANG TIDAK ADA DI SINI, DAN ALASANNYA ───────────────────────────────
 *
 * Rujukan visualnya memuat ubin "Transfer" terpisah. Transfer BUKAN halaman
 * tersendiri di aplikasi ini; ia salah satu jenis di dalam `TransactionDialog`.
 * Membuat ubinnya berarti menjanjikan pintu yang tidak ada.
 *
 * Seluruh tujuan di bawah sudah terdaftar di `NAV`, jadi tidak ada satu pun
 * rute, data, atau kemampuan baru yang diperkenalkan berkas ini.
 */

interface Aksi {
  href: string;
  label: string;
  icon: LucideIcon;
}

const AKSI: Aksi[] = [
  { href: '/transaksi', label: 'Catat transaksi', icon: ArrowLeftRight },
  { href: '/dompet', label: 'Tambah dompet', icon: Wallet },
  { href: '/anggaran', label: 'Buat anggaran', icon: PiggyBank },
  { href: '/tujuan', label: 'Buat tujuan', icon: Target },
  { href: '/laporan', label: 'Unduh laporan', icon: FileText },
];

export function QuickActions() {
  return (
    /*
      Grid, bukan flex-wrap. Lima ubin yang membungkus lewat flex meninggalkan
      baris terakhir yang lebarnya berbeda dari baris pertama; grid membuat
      setiap ubin berukuran sama pada setiap titik henti.
    */
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {AKSI.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group flex h-full flex-col items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-center transition-[border-color,background-color] duration-[var(--dur-fast)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-3)]"
          >
            <span
              className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--surface-3)] text-dim transition-colors duration-[var(--dur-fast)] group-hover:text-ink"
              aria-hidden
            >
              <Icon size={17} />
            </span>
            <span className="text-xs font-medium leading-tight text-muted transition-colors duration-[var(--dur-fast)] group-hover:text-ink">
              {label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
