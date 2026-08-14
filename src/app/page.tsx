import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Code2, Fingerprint, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/magnetic';
import { DemoPreview } from '@/components/landing/demo-preview';
import { Arsitektur, Keamanan, Kemampuan, Repositori } from '@/components/landing/sections';
import { TanyaJawab } from '@/components/landing/faq';
import { CaraKerja, Harga, MesinAi, Suara } from '@/components/landing/story';
import { Reveal, Rise } from '@/components/ui/reveal';
import { RevealObserver } from '@/components/ui/reveal-observer';
import { ThemeToggle } from '@/components/theme-toggle';
import { CoreMark } from '@/components/brand/core-mark';
import { HeroParallax } from '@/components/three/hero-parallax';
import { MascotScene } from '@/components/three/mascot-scene';

export const metadata: Metadata = {
  title: 'KANTONGZ — Uangmu, dengan mesin yang mengawasinya',
};

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {/*
        SATU pengamat untuk seluruh halaman, dan satu-satunya JavaScript milik
        halaman ini di luar adegan 3D. Ia tidak merender apa pun — ia hanya
        menyalakan atribut yang CSS tunggu.
      */}
      <RevealObserver />

      {/* ── navigasi ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl glass px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="KANTONGZ, beranda">
            <CoreMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight">KANTONGZ</span>
          </Link>

          {/* `gap-0.5` + tinggi 40px. Lighthouse menandai jarak antar-sasaran
              sebagai kurang; menambah tinggi lebih murah daripada menambah
              jarak, karena jarak mendorong navigasi melebihi lebar bilahnya. */}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Utama">
            {[
              ['Kemampuan', '#fitur'],
              ['Mesin AI', '#mesin-ai'],
              ['Arsitektur', '#arsitektur'],
              ['Keamanan', '#keamanan'],
              ['Biaya', '#harga'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="flex h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm text-muted transition-colors duration-[var(--dur-fast)] hover:bg-[var(--surface-2)] hover:text-ink"
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

      {/*
        <main>, dan bukan sekadar kerapian semantik.

        Tautan "Lompat ke konten" di atas sudah ada sejak awal dan menunjuk ke
        `#konten` — yang selama ini melekat pada sebuah `<section>`. Halaman ini
        karena itu tidak punya SATU pun tengara utama: pembaca layar yang
        melompat antar-landmark menemukan header, nav, sebelas section, dan
        footer, tanpa apa pun yang mengatakan "isi halamannya mulai di sini".

        `id` pindah ke sini supaya tautan lewati-navigasi mendarat di tengara
        yang sebenarnya, bukan di potongan pertamanya.
      */}
      <main id="konten">

      {/* ── hero ─────────────────────────────────────────────────── */}
      <section className="aurora relative isolate overflow-hidden px-4 pb-20 pt-32 sm:pt-40">
        <div className="grid-lines pointer-events-none absolute inset-0 -z-10" aria-hidden />

        {/*
          TATA LETAK ASIMETRIS, bukan terpusat.

          Maskot adalah SUBJEK, bukan latar. Adegan yang diletakkan di belakang
          teks memaksa salah satu dari keduanya kalah: teks kehilangan kontras,
          atau adegan tertutup tabir sampai tidak terlihat. Memberinya kolom
          sendiri menyelesaikan keduanya sekaligus.

          Pembagiannya 7:5 dan bukan 6:6. Kolom yang sama lebar tidak punya
          arah baca — mata berhenti di tengah dan memilih sendiri, dan pilihan
          itu sering salah. Ketimpangan kecil memberi tahu mata harus mulai
          dari mana tanpa satu pun panah.
        */}
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/*
            HERO MEMAKAI `Rise`, BUKAN `Reveal`.

            Keduanya terlihat sama; bedanya kapan mereka menyala. `Reveal`
            menunggu pengamat memberitahu bahwa elemennya masuk layar — dan
            pengamat itu JavaScript. Isi yang sudah terlihat pada piksel pertama
            tidak boleh menunggu apa pun untuk muncul, apalagi isi yang menjadi
            elemen LCP halaman ini.

            `Rise` murni CSS: ia berjalan saat halaman dicat, dan ia berjalan
            walaupun potongan skripnya masih dalam perjalanan.
          */}
          <div className="lg:col-span-7">
            <Rise>
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-[var(--surface)]/60 px-3.5 py-1.5 text-xs text-muted backdrop-blur">
                <Sparkles className="size-3.5 text-[var(--color-holo)]" aria-hidden />
                AI Financial Operating System
              </span>
            </Rise>

            <Rise index={1}>
              <h1 className="text-display mt-7 text-balance">
                Uangmu, dengan <span className="text-gradient">mesin yang mengawasinya</span>
              </h1>
            </Rise>

            <Rise index={2}>
              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                Kategorisasi otomatis, anomali yang ketahuan sebelum jadi masalah, dan
                jawaban atas pertanyaanmu sendiri — seluruhnya berjalan di mesinmu, tanpa
                satu pun kunci API berbayar.
              </p>
            </Rise>

            <Rise index={3}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/daftar" className="w-full sm:w-auto">
                  <MagneticButton>
                    <Button size="lg" block iconRight={<ArrowRight className="size-4" />}>
                      Mulai gratis
                    </Button>
                  </MagneticButton>
                </Link>
                <Link href="/masuk" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" block>
                    Masuk ke akun
                  </Button>
                </Link>
              </div>
            </Rise>

            <Rise index={4}>
              <p className="mt-6 flex items-center gap-2 text-xs text-dim">
                <Fingerprint className="size-3.5" aria-hidden />
                Argon2id, rotasi token, dan penguncian otomatis sejak hari pertama
              </p>
            </Rise>
          </div>

          {/*
            Maskot. `aria-hidden` di dalam `MascotScene`, dan namanya
            diperkenalkan lewat teks di bawahnya — pembaca layar bertemu
            "Bruang" sebagai kata, bukan sebagai kanvas yang tak terbaca.
          */}
          <div className="relative lg:col-span-5">
            <HeroParallax>
              <MascotScene className="mx-auto aspect-square w-full max-w-[30rem]" />
            </HeroParallax>

            <Rise index={2}>
              <p className="text-center text-xs text-dim">
                <span className="text-muted">Bruang</span> — mengawasi bukumu, dan melambai
                kalau kamu lama menatapnya
              </p>
            </Rise>
          </div>
        </div>

        <DemoPreview />
      </section>

      <Kemampuan />
      <MesinAi />
      <CaraKerja />
      <Arsitektur />
      <Keamanan />
      <Suara />
      <Harga />
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

      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--ink-dim)] sm:flex-row">
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
