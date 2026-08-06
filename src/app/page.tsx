import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, Fingerprint, LineChart, ShieldCheck, Sparkles, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Reveal, RevealGroup } from '@/components/ui/reveal';
import { ThemeToggle } from '@/components/theme-toggle';
import { CoreMark } from '@/components/brand/core-mark';

export const metadata: Metadata = {
  title: 'KANTONGZ — Uangmu, dengan mesin yang mengawasinya',
};

const PILLARS = [
  {
    icon: Bot,
    title: 'Kategorisasi otomatis',
    body: 'Transaksi masuk langsung tergolong. Tidak ada tugas rapi-rapi yang menumpuk sampai akhir bulan.',
  },
  {
    icon: LineChart,
    title: 'Peringatan sebelum, bukan sesudah',
    body: 'Mesin melihat pola pengeluaranmu dan memberi tahu ketika arahnya salah — saat masih bisa diubah.',
  },
  {
    icon: ShieldCheck,
    title: 'Keamanan tingkat perbankan',
    body: 'Argon2id, rotasi token dengan deteksi pemakaian ulang, dan jejak audit yang tidak bisa dihapus.',
  },
] as const;

const NUMBERS = [
  { value: '10 mnt', label: 'Umur access token' },
  { value: '5×', label: 'Percobaan sebelum terkunci' },
  { value: '15 mnt', label: 'Batas diam sesi' },
  { value: '5 thn', label: 'Retensi jejak audit' },
] as const;

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {/* ── navigasi ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl glass px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="KANTONGZ, beranda">
            <CoreMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight">KANTONGZ</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Utama">
            {[
              ['Fitur', '#fitur'],
              ['Keamanan', '#keamanan'],
              ['Cara kerja', '#cara-kerja'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/masuk" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/daftar">
              <Button size="sm" iconRight={<ArrowRight className="size-4" />}>
                Buat akun
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── hero ─────────────────────────────────────────────────── */}
      <section className="aurora relative isolate px-4 pb-24 pt-36 sm:pt-44">
        <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />

        <div className="relative mx-auto max-w-4xl text-center">
          <RevealGroup>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)]/60 px-3.5 py-1.5 text-xs text-[var(--ink-muted)] backdrop-blur">
                <Sparkles className="size-3.5 text-[var(--color-accent)]" aria-hidden />
                AI Financial Operating System
              </span>
            </Reveal>

            <Reveal>
              <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                Uangmu, dengan{' '}
                <span className="text-gradient">mesin yang mengawasinya</span>
              </h1>
            </Reveal>

            <Reveal>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
                Satu rekening, kategorisasi otomatis, dan peringatan sebelum masalah terjadi —
                bukan setelah saldomu habis.
              </p>
            </Reveal>

            <Reveal>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/daftar" className="w-full sm:w-auto">
                  <Button size="lg" block iconRight={<ArrowRight className="size-4" />}>
                    Mulai gratis
                  </Button>
                </Link>
                <Link href="/masuk" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" block>
                    Masuk ke akun
                  </Button>
                </Link>
              </div>
            </Reveal>

            <Reveal>
              <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--ink-faint)]">
                <Fingerprint className="size-3.5" aria-hidden />
                Biometrik, rotasi token, dan penguncian otomatis sejak hari pertama
              </p>
            </Reveal>
          </RevealGroup>
        </div>

        {/* pratinjau produk */}
        <Reveal className="mx-auto mt-20 max-w-5xl">
          <div className="relative rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-[var(--shadow-float)]">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-5 sm:p-8">
              <div className="mb-6 flex items-center gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-[var(--color-danger)]/70" />
                <span className="size-2.5 rounded-full bg-[var(--color-warning)]/70" />
                <span className="size-2.5 rounded-full bg-[var(--color-success)]/70" />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {NUMBERS.map((n) => (
                  <div
                    key={n.label}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="tabular text-2xl font-semibold tracking-tight">{n.value}</div>
                    <div className="mt-1 text-xs text-[var(--ink-faint)]">{n.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:col-span-2">
                  <div className="text-sm text-[var(--ink-muted)]">Arus kas</div>
                  <div className="mt-4 flex h-28 items-end gap-1.5" aria-hidden>
                    {[38, 52, 44, 66, 58, 78, 62, 88, 71, 94, 80, 100].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${String(h)}%` }}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-[var(--color-primary)]/25 to-[var(--color-primary)]"
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="text-sm text-[var(--ink-muted)]">Wawasan</div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
                    Pengeluaran transportasi naik 34% dibanding rata-rata tiga bulan terakhir.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-warning)]/12 px-2.5 py-1 text-xs text-[var(--color-warning)]">
                    <Zap className="size-3" aria-hidden />
                    Perlu perhatian
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── pilar ────────────────────────────────────────────────── */}
      <section id="fitur" className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Bukan aplikasi pencatat.
              <span className="block text-[var(--ink-muted)]">Sistem operasi keuangan.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <Reveal key={title}>
                <article className="group h-full rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-6 transition-colors duration-300 hover:border-[var(--line-strong)]">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon className="size-5 text-[var(--color-accent)]" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </RevealGroup>
      </section>

      {/* ── keamanan ─────────────────────────────────────────────── */}
      <section id="keamanan" className="border-y border-[var(--line)] bg-[var(--surface)]/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <RevealGroup>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Reveal>
                  <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                    Keamanan yang dirancang lebih dulu
                  </h2>
                </Reveal>
                <Reveal>
                  <p className="mt-5 text-pretty leading-relaxed text-[var(--ink-muted)]">
                    Setiap keputusan keamanan di sini dibuat dengan satu pertanyaan: apa yang
                    terjadi kalau ini gagal? Token yang bocor kehilangan gunanya begitu dipakai
                    dua kali. Penguncian diperiksa sebelum kredensial dibandingkan. Jejak audit
                    dirantai hash, sehingga perusakan terdeteksi.
                  </p>
                </Reveal>
              </div>

              <Reveal>
                <ul className="space-y-3">
                  {[
                    ['Argon2id 64 MiB', 'Sandi tidak pernah disimpan, hanya diverifikasi.'],
                    ['Rotasi token', 'Pemakaian ulang mencabut seluruh keluarga token.'],
                    ['Pengikatan perangkat', 'Token yang berpindah perangkat langsung dicabut.'],
                    ['Jejak audit berantai', 'Menghapus satu baris memutus rantai sesudahnya.'],
                  ].map(([title, body]) => (
                    <li
                      key={title}
                      className="flex gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
                    >
                      <ShieldCheck
                        className="mt-0.5 size-5 shrink-0 text-[var(--color-success)]"
                        aria-hidden
                      />
                      <div>
                        <div className="text-sm font-medium">{title}</div>
                        <div className="mt-1 text-sm text-[var(--ink-muted)]">{body}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* ── ajakan ───────────────────────────────────────────────── */}
      <section id="cara-kerja" className="relative px-4 py-24 sm:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Tiga langkah, lalu mesinnya bekerja
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-[var(--ink-muted)]">
            Buat akun, verifikasi email, dan hubungkan rekeningmu. Sisanya berjalan sendiri.
          </p>
          <Link href="/daftar" className="mt-9 inline-block">
            <Button size="lg" iconRight={<ArrowRight className="size-4" />}>
              Mulai sekarang
            </Button>
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--ink-faint)] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <CoreMark className="size-5" />
            <span>KANTONGZ</span>
          </div>
          <p>Dibangun untuk uang sungguhan, dengan kehati-hatian yang setara.</p>
        </div>
      </footer>
    </div>
  );
}
