import {
  ArrowLeftRight,
  BarChart3,
  FileText,
  LayoutDashboard,
  Lightbulb,
  PiggyBank,
  Settings,
  Shield,
  Sparkles,
  Target,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Peta navigasi.
 *
 * Satu daftar yang dipakai sidebar, palet perintah, dan remah jejak sekaligus.
 * Tiga salinan yang harus dijaga sinkron adalah tiga kesempatan untuk menyimpang,
 * dan yang menyimpang selalu yang paling jarang dilihat.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Kata kunci tambahan untuk pencarian di palet perintah. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Ikhtisar',
    items: [
      { href: '/dasbor', label: 'Dasbor', icon: LayoutDashboard, keywords: 'beranda ringkasan' },
      { href: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight, keywords: 'mutasi catatan' },
      { href: '/dompet', label: 'Dompet', icon: Wallet, keywords: 'rekening saldo kas' },
    ],
  },
  {
    label: 'Rencana',
    items: [
      { href: '/anggaran', label: 'Anggaran', icon: PiggyBank, keywords: 'budget batas' },
      { href: '/tujuan', label: 'Tujuan', icon: Target, keywords: 'goal tabungan target' },
    ],
  },
  {
    label: 'Wawasan',
    items: [
      { href: '/analitik', label: 'Analitik', icon: BarChart3, keywords: 'grafik tren' },
      { href: '/wawasan', label: 'Wawasan', icon: Lightbulb, keywords: 'anomali langganan proyeksi' },
      { href: '/asisten', label: 'Asisten', icon: Sparkles, keywords: 'tanya chat simulasi what-if' },
      { href: '/laporan', label: 'Laporan', icon: FileText, keywords: 'ekspor csv cetak pdf' },
    ],
  },
  {
    label: 'Akun',
    items: [
      { href: '/profil', label: 'Profil', icon: User, keywords: 'nama email' },
      { href: '/keamanan', label: 'Keamanan', icon: Shield, keywords: 'sesi perangkat sandi' },
      { href: '/pengaturan', label: 'Pengaturan', icon: Settings, keywords: 'preferensi tema kategori' },
    ],
  },
];

/*
 * Notifikasi TIDAK terdaftar di sini.
 *
 * Ia belum punya permukaan sendiri: peringatan yang layak diberitahukan sudah
 * muncul di Wawasan, dan pusat notifikasi terpisah tanpa kanal push yang
 * sungguhan hanya akan menjadi salinan kedua dari halaman yang sama.
 *
 * Wawasan dan Asisten kini ADA di sini — keduanya punya endpoint yang bekerja
 * tanpa kredensial apa pun.
 */

export const NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

export function navItemFor(pathname: string): NavItem | undefined {
  /* Kecocokan terpanjang menang: `/transaksi/baru` adalah Transaksi, dan
     `/dasbor` tidak boleh mencocoki setiap rute yang diawali garis miring. */
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
