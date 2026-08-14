import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';

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

/**
 * Angka uang memakai lebar digit rata.
 *
 * Pada daftar transaksi, digit berlebar berbeda membuat kolom nominal
 * bergoyang setiap kali nilainya berubah. Pada aplikasi uang goyangan itu
 * terbaca sebagai angka yang tidak dapat dipercaya.
 */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-stack',
  display: 'swap',
  weight: ['400', '500'],
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
    /*
     * WAJIB sama dengan `--bg` di `globals.css`, dan `scripts/palette.mjs`
     * memeriksanya — bukan sekadar diminta lewat komentar.
     *
     * Nilai sebelumnya `#09090b` dan `#fafafa`: itu zinc-950 dan zinc-50, sisa
     * palet Tailwind yang tertinggal ketika sistem warnanya diganti. Akibatnya
     * bilah alamat di ponsel berbeda rona setipis dari halamannya — jenis
     * ketidakcocokan yang tidak pernah dilaporkan sebagai bug tetapi membuat
     * aplikasi terbaca sebagai halaman web di dalam peramban alih-alih sebagai
     * satu bidang utuh.
     *
     * Ditulis sebagai literal karena memang harus: `<meta name="theme-color">`
     * dibaca peramban SEBELUM CSS mana pun dimuat, jadi `var()` di sini tidak
     * punya apa pun untuk dirujuk.
     */
    { media: '(prefers-color-scheme: dark)', color: '#06070a' },
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
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
/**
 * Bawaannya berbeda per PERMUKAAN — ROADMAP §7.1.
 *
 * Halaman publik menjual; halaman di balik login dipakai. Yang pertama gelap
 * dan sinematik, yang kedua terang dan tenang. Keduanya tetap punya kedua tema
 * — yang berbeda hanya di mana masing-masing dimulai.
 *
 * Pilihan pengguna SELALU menang. Yang dikorbankan adalah `prefers-color-
 * scheme` sebagai penentu bawaan di halaman dalam-aplikasi, dan itu memang
 * biaya yang nyata: sebagian orang memilih tema gelap di sistemnya justru
 * karena mata. Penyeimbangnya adalah tombol tema yang tetap ada di kepala
 * halaman, dan pilihannya bertahan sejak ketukan pertama.
 */
const themeScript = `
(function () {
  try {
    var PUBLIK = ['/', '/masuk', '/daftar', '/pulihkan'];
    var stored = localStorage.getItem('kantongz-theme');
    var bawaan = PUBLIK.indexOf(location.pathname) === -1 ? 'light' : 'dark';
    var theme = stored === 'light' || stored === 'dark' ? stored : bawaan;
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * Variabel font hidup di `<html>`, BUKAN di `<body>`.
     *
     * ── MENGAPA INI BUKAN SELERA ────────────────────────────────────────
     *
     * `globals.css` mendeklarasikan di dalam `@theme`:
     *
     *     --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
     *     --font-mono: var(--font-mono-stack), ui-monospace, …;
     *
     * Tailwind memancarkan keduanya ke `:root` — dan `:root` ADALAH `<html>`.
     *
     * Substitusi `var()` diselesaikan pada elemen tempat DEKLARASINYA berada.
     * Ketika `--font-inter` hanya dipasang di `<body>`, pencarian di `:root`
     * tidak menemukan apa-apa, seluruh deklarasi `--font-sans` menjadi
     * "guaranteed-invalid", dan nilai KOSONG itulah yang diwariskan ke bawah.
     * Substitusi TIDAK diulang di `<body>`; yang diwariskan adalah hasil
     * hitungnya, dan hasil hitungnya sudah kosong.
     *
     * Akibatnya terukur, bukan diperkirakan: `--font-sans` dan `--font-mono`
     * menghitung menjadi KOSONG, `.font-sans` jatuh ke tumpukan bawaan
     * Tailwind, dan seluruh halaman tampil dengan Segoe UI. Diuji dengan
     * mengukur lebar teks: badan 728,63px — sama persis dengan Segoe UI yang
     * dipaksa, dan berbeda dari Inter yang dipaksa (775,2px).
     *
     * Yang paling mahal: `.numeric` memakai `var(--font-mono)`, jadi SETIAP
     * nominal uang kehilangan JetBrains Mono — persis jaminan lebar digit rata
     * yang DESIGN.md sebut sebagai pembeda antara angka yang dapat dipercaya
     * dan angka yang bergoyang.
     *
     * Berkas fontnya sendiri TIDAK PERNAH bermasalah: keduanya terunduh dengan
     * benar dari `/_next/static/media/`. Ia hanya tidak pernah dirujuk siapa
     * pun.
     *
     * Menaikkan kedua kelas satu tingkat ke `<html>` menempatkan
     * `--font-inter` dan `--font-mono-stack` pada elemen yang sama dengan
     * konsumennya. Ini juga pola yang didokumentasikan `next/font` untuk
     * pemakaian berbasis variabel.
     */
    <html
      lang="id"
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {/* Lompat ke konten — pengguna papan ketik tidak boleh dipaksa
            menyusuri seluruh navigasi di setiap halaman. WCAG 2.4.1 */}
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:shadow-[var(--shadow-float)]"
        >
          Lompat ke konten
        </a>
        {/*
          HANYA tema yang global.

          React Query, penyimpanan sesi, sistem notifikasi, dan Framer Motion
          dulu juga dipasang di sini — dan karena itu ikut diunduh serta
          dijalankan oleh setiap pengunjung halaman muka, yang tidak memakai
          satu pun dari keempatnya. Sekarang keempatnya berhenti di
          `AppProviders`, dipasang oleh grup rute `(app)` dan `(auth)` saja.

          Tema tetap di sini karena pengalih tema memang ada di halaman muka,
          dan karena `data-theme` harus sudah benar sebelum piksel pertama —
          itu urusan skrip pra-paint di atas, dan penyedia ini yang membacanya.
        */}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
