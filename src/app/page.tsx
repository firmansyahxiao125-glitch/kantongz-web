import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Code2, Fingerprint, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DemoPreview } from '@/components/landing/demo-preview';
import {
  Arsitektur,
  Keamanan,
  Kemampuan,
  Repositori,
  TanyaJawab,
} from '@/components/landing/sections';
import { Reveal, RevealGroup } from '@/components/ui/reveal';
import { ThemeToggle } from '@/components/theme-toggle';
import { CoreMark } from '@/components/brand/core-mark';
import { HeroParallax } from '@/components/three/hero-parallax';
import { HeroScene } from '@/components/three/hero-scene';

export const metadata: Metadata = {
  title: 'KANTONGZ — Uangmu, dengan mesin yang mengawasinya',
};

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
              ['Kemampuan', '#fitur'],
              ['Arsitektur', '#arsitektur'],
              ['Keamanan', '#keamanan'],
              ['Tanya jawab', '#tanya-jawab'],
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
      <section id="konten" className="aurora relative isolate px-4 pb-24 pt-36 sm:pt-44">
        <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />

        {/* Adegan berada DI BELAKANG teks, bukan di sebelahnya. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[38rem] sm:h-[46rem]">
          <HeroParallax>
            <HeroScene className="size-full" />
          </HeroParallax>
        </div>

        {/*
          Tabir keterbacaan.
          Adegan yang bercahaya di belakang teks membuat paragraf kehilangan
          kontras justru di bagian paling terang — dan halaman yang indah
          tetapi tidak terbaca telah gagal pada tugas pertamanya. Tabir ini
          menggelapkan tepat di belakang kolom teks dan membiarkan sisi-sisinya
          tetap terbuka, sehingga adegan masih terlihat penuh.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] sm:h-[46rem]"
          style={{
            background: [
              /* Bulat di belakang judul — menggelapkan pusat tanpa memotong
                 tepi, sehingga adegan masih terbaca penuh di sisi kiri-kanan. */
              'radial-gradient(50% 34% at 50% 26%, color-mix(in oklab, var(--bg) 72%, transparent), transparent 76%)',
              /* Lurus dari bawah judul ke bawah — paragraf, tombol, dan baris
                 keterangan seluruhnya duduk di atas dasar padat. Di sinilah
                 kontras paling mudah hilang, dan kontras yang hilang pada
                 kalimat penjelas berarti tidak ada yang membacanya. */
              'linear-gradient(to bottom, transparent 26%, color-mix(in oklab, var(--bg) 88%, transparent) 46%, var(--bg) 72%)',
            ].join(','),
          }}
        />

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

        <DemoPreview />
      </section>

      <Kemampuan />
      <Arsitektur />
      <Keamanan />
      <TanyaJawab />
      <Repositori />

      {/* ── ajakan ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        <div className="aurora absolute inset-0" aria-hidden />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-h2 text-balance font-semibold">
            Jalankan seluruhnya di mesinmu sendiri
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-muted">
            Satu perintah{' '}
            <code className="numeric rounded-md border border-line bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.9em] text-ink">
              docker compose up
            </code>{' '}
            menyalakan API, basis data, antrean, dan server surel. Tanpa akun pihak ketiga, tanpa
            kunci API, tanpa biaya berulang.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/daftar">
              <Button size="lg" iconRight={<ArrowRight className="size-4" />}>
                Buat akun
              </Button>
            </Link>
            <a href="#repositori">
              <Button size="lg" variant="secondary" icon={<Code2 className="size-4" />}>
                Lihat kodenya
              </Button>
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--ink-faint)] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <CoreMark className="size-5" />
            <span>KANTONGZ</span>
          </div>
          <p className="text-center sm:text-right">
            Proyek portofolio dan tugas akhir — bukan layanan komersial.
            <span className="block">Seluruh data pada demo adalah data buatan.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
