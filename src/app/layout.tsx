import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from '@/components/providers';

import './globals.css';

/**
 * `display: swap` supaya teks terbaca sebelum font tiba. Menahan teks sampai
 * font selesai diunduh menukar satu masalah kosmetik dengan halaman kosong,
 * dan halaman kosong jauh lebih buruk pada koneksi lambat.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'KANTONGZ — AI Financial Operating System',
    template: '%s · KANTONGZ',
  },
  description:
    'Satu rekening, kategorisasi otomatis, dan peringatan sebelum masalah terjadi — bukan setelah saldomu habis.',
  applicationName: 'KANTONGZ',
  authors: [{ name: 'KANTONGZ' }],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'KANTONGZ',
    title: 'KANTONGZ — AI Financial Operating System',
    description: 'Uangmu, dengan mesin yang mengawasinya.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * Skrip tema berjalan SEBELUM paint pertama.
 *
 * Tanpa ini, pengguna bertema terang melihat satu frame gelap setiap kali
 * memuat halaman — dan kedipan itu adalah hal pertama yang membuat aplikasi
 * terasa rakitan.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('kantongz-theme');
    var system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    var theme = stored === 'light' || stored === 'dark' ? stored : system;
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Lompat ke konten — pengguna papan ketik tidak boleh dipaksa
            menyusuri seluruh navigasi di setiap halaman. WCAG 2.4.1 */}
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:shadow-[var(--shadow-float)]"
        >
          Lompat ke konten
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
