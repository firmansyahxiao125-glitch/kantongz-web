'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Braces,
  Calculator,
  CheckCheck,
  CircleDollarSign,
  Cpu,
  FileSearch,
  Quote,
  ScanLine,
  Sigma,
} from 'lucide-react';
import { useRef } from 'react';

import { Reveal, RevealGroup } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

/**
 * Bagian bercerita.
 *
 * Urutannya adalah argumen, bukan daftar: apa yang mesin ini lakukan (Mesin
 * AI) → bagaimana kamu memakainya (Cara kerja) → apa kata orang (Suara) → apa
 * biayanya (Harga). Halaman muka yang menyusun bagiannya menurut kerapian
 * visual alih-alih menurut urutan pertanyaan pembaca akan kehilangan pembaca
 * itu di layar kedua.
 */

/* ── mesin AI ─────────────────────────────────────────────────────────── */

const LAPISAN_AI = [
  {
    icon: Sigma,
    tier: 'Lapis 1',
    name: 'Statistik',
    detail: 'Z-score per kategori, analisis interval, regresi linear.',
    why: 'Deterministik. Angka yang sama untuk masukan yang sama, selamanya.',
    cost: 'Gratis',
  },
  {
    icon: Braces,
    tier: 'Lapis 2',
    name: 'Aturan',
    detail: 'Pencocokan pedagang berurutan, resolusi maksud, klasifikasi.',
    why: 'Dapat dibaca dan diperbaiki. Aturan yang salah dapat ditunjuk barisnya.',
    cost: 'Gratis',
  },
  {
    icon: ScanLine,
    tier: 'Lapis 3',
    name: 'Penglihatan',
    detail: 'Tesseract OCR di dalam proses backend yang sama.',
    why: 'Tidak ada gambar struk yang meninggalkan mesinmu.',
    cost: 'Gratis',
  },
  {
    icon: Cpu,
    tier: 'Lapis 4',
    name: 'Bahasa',
    detail: 'Ollama lokal menyusun kalimat ringkasan — dan hanya kalimatnya.',
    why: 'Opsional. Tanpa Ollama, ringkasan memakai templat dan tidak ada fitur hilang.',
    cost: 'Gratis',
  },
] as const;

export function MesinAi() {
  const host = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: host,
    offset: ['start end', 'end start'],
  });
  /* Garis penghubung tumbuh mengikuti gulir. Ia BUKAN hiasan: ia menyatakan
     bahwa keempat lapis adalah satu urutan yang dilewati dari atas ke bawah,
     bukan empat pilihan yang berdiri sendiri. */
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.65], ['0%', '100%']);

  return (
    <section id="mesin-ai" className="relative overflow-hidden px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl" ref={host}>
        <RevealGroup>
          <Reveal>
            <p className="text-eyebrow text-[var(--color-holo)]">Mesin AI</p>
          </Reveal>
          <Reveal>
            <h2 className="text-h2 mt-4 max-w-2xl text-balance">
              Empat lapis, dan tiga di antaranya tidak memakai model sama sekali
            </h2>
          </Reveal>
          <Reveal>
            <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted">
              Setiap angka yang muncul di layarmu dihitung lapis 1 sampai 3. Model bahasa hanya
              menyusun kalimat dari angka yang SUDAH dihitung, dan layar menampilkan yang mana
              yang terjadi. Aplikasi berjalan penuh tanpa satu pun model.
            </p>
          </Reveal>

          <div className="relative mt-14 pl-8 sm:pl-12">
            {/* Rel garis, dan bagian yang sudah dilewati. */}
            <div
              aria-hidden
              className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-[var(--line)] sm:left-[15px]"
            />
            <motion.div
              aria-hidden
              style={{ height: lineHeight }}
              className="absolute left-[7px] top-2 w-px bg-[var(--color-holo)] sm:left-[15px]"
            />

            <div className="space-y-10">
              {LAPISAN_AI.map(({ icon: Icon, tier, name, detail, why, cost }) => (
                <motion.div key={name} variants={fadeUp} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-8 top-1 grid size-4 place-items-center rounded-full border border-line-strong bg-[var(--surface)] sm:-left-12 sm:size-8"
                  >
                    <Icon className="hidden size-4 text-[var(--color-holo)] sm:block" />
                  </span>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-eyebrow text-dim">{tier}</span>
                    <h3 className="text-h3">{name}</h3>
                    <span className="rounded-[var(--radius-xs)] bg-[color-mix(in_oklab,var(--color-positive)_14%,transparent)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-positive)]">
                      {cost}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-dim">{why}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── cara kerja ───────────────────────────────────────────────────────── */

const LANGKAH = [
  {
    icon: CircleDollarSign,
    title: 'Catat, atau foto struknya',
    body: 'Ketik nominal, atau potret struk dan biarkan OCR mengisi formulirnya. Kamu tinggal memeriksa.',
  },
  {
    icon: Calculator,
    title: 'Mesin menghitung',
    body: 'Saldo, kategori, anggaran, dan proyeksi diturunkan dari buku besar — tidak ada satu pun yang disimpan sebagai angka terpisah.',
  },
  {
    icon: FileSearch,
    title: 'Mesin memberi tahu',
    body: 'Pengeluaran janggal, langganan yang tidak tersentuh, saldo yang menuju nol — dengan alasan berupa angka, bukan firasat.',
  },
  {
    icon: CheckCheck,
    title: 'Kamu memutuskan',
    body: 'Tanya balik pakai bahasa biasa. Setiap jawaban membawa asal-usul angkanya, jadi kamu bisa memeriksanya.',
  },
] as const;

export function CaraKerja() {
  return (
    <section id="cara-kerja" className="border-y border-line bg-[var(--surface)]/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <Reveal>
            <p className="text-eyebrow text-[var(--color-holo)]">Cara kerja</p>
          </Reveal>
          <Reveal>
            <h2 className="text-h2 mt-4 max-w-2xl text-balance">
              Empat langkah, lalu mesinnya bekerja sendiri
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map(({ icon: Icon, title, body }, index) => (
              <motion.li
                key={title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="panel flex h-full flex-col p-6"
              >
                {/* Nomor langkah besar dan SAMAR. Ia menandai urutan tanpa
                    bersaing dengan judulnya — nomor yang sekuat judul membuat
                    mata membaca angka lebih dulu, lalu harus kembali. */}
                <span className="numeric text-4xl font-medium leading-none text-faint/40" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon className="mt-5 size-5 text-[var(--color-holo)]" aria-hidden />
                <h3 className="mt-4 text-base font-medium">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>
              </motion.li>
            ))}
          </ol>
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── suara ────────────────────────────────────────────────────────────── */

/**
 * Bagian yang biasanya diisi testimoni.
 *
 * TIDAK ADA testimoni di sini, dan itu keputusan yang disengaja. Produk ini
 * belum punya pengguna; menaruh wajah dan kutipan buatan di halaman muka
 * adalah kebohongan paling mudah diperiksa yang bisa dibuat sebuah portofolio,
 * dan satu-satunya yang akan diingat pembacanya.
 *
 * Yang menggantikannya bukan kotak kosong bertuliskan "segera hadir",
 * melainkan sesuatu yang MEMANG dapat dikutip: kalimat yang benar-benar
 * dihasilkan sistem ini, dari data sungguhan, beserta asal-usul angkanya.
 */
const KELUARAN_ASISTEN = [
  {
    q: 'Saldoku cukup sampai kapan?',
    a: 'Dengan pola sekarang, saldomu habis dalam 78 hari.',
    src: 'Arus bersih 41 hari terakhir dibagi saldo seluruh dompet.',
  },
  {
    q: 'Langgananku apa saja?',
    a: 'Ada 1 tagihan berulang, total Rp 186.000 per bulan: Netflix Rp 186.000.',
    src: 'Ditagih 5 kali dengan interval dan nominal yang tidak pernah berubah.',
  },
  {
    q: 'Siapa presiden Indonesia?',
    a: 'Aku belum bisa menjawab itu. Yang bisa kutanyakan ke datamu: pengeluaran atau pemasukan pada suatu periode, rincian per kategori…',
    src: 'Di luar jangkauan — tidak ditebak.',
  },
] as const;

export function Suara() {
  return (
    <section id="suara" className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <RevealGroup>
        <Reveal>
          <p className="text-eyebrow text-[var(--color-holo)]">Suara</p>
        </Reveal>
        <Reveal>
          <h2 className="text-h2 mt-4 max-w-2xl text-balance">
            Belum ada pengguna, jadi tidak ada testimoni
          </h2>
        </Reveal>
        <Reveal>
          <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted">
            Yang bisa ditunjukkan adalah kalimat yang benar-benar dikeluarkan sistem ini dari data
            sungguhan — termasuk satu yang menolak menjawab.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {KELUARAN_ASISTEN.map(({ q, a, src }) => (
            <motion.figure
              key={q}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="panel flex h-full flex-col p-6"
            >
              <Quote className="size-4 text-dim" aria-hidden />
              <figcaption className="mt-4 text-sm text-dim">“{q}”</figcaption>
              <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-ink">
                {a}
              </blockquote>
              <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-dim">
                {src}
              </p>
            </motion.figure>
          ))}
        </div>
      </RevealGroup>
    </section>
  );
}

/* ── harga ────────────────────────────────────────────────────────────── */

/**
 * Bagian harga.
 *
 * Tidak ada tingkatan berbayar, dan tidak ada "Hubungi kami" yang tidak
 * menghubungi siapa pun. Biayanya nol karena arsitekturnya membuatnya nol —
 * itulah klaimnya, dan tabel di bawah ini yang membuktikannya dapat diperiksa
 * baris demi baris.
 */
const BIAYA = [
  ['Basis data', 'PostgreSQL 16 di mesinmu', 'Rp 0'],
  ['Antrean & cache', 'Redis 7 di mesinmu', 'Rp 0'],
  ['OCR struk', 'Tesseract, dalam proses yang sama', 'Rp 0'],
  ['Model bahasa', 'Ollama lokal — dan opsional', 'Rp 0'],
  ['Surel', 'SMTP mana pun; Mailpit untuk pengembangan', 'Rp 0'],
  ['Hosting', 'Docker Compose, satu perintah', 'Listrikmu sendiri'],
] as const;

export function Harga() {
  return (
    <section id="harga" className="border-y border-line bg-[var(--surface)]/40">
      <div className="mx-auto max-w-4xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <Reveal>
            <p className="text-eyebrow text-[var(--color-holo)]">Biaya</p>
          </Reveal>
          <Reveal>
            <h2 className="text-h2 mt-4 text-balance">Tidak ada tingkatan. Tidak ada langganan.</h2>
          </Reveal>
          <Reveal>
            <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted">
              Bukan karena murah hati — karena tidak ada satu pun bagian yang menagih. Setiap baris
              di bawah ini dapat diperiksa di `docker-compose.yml`.
            </p>
          </Reveal>

          <Reveal>
            <div className="panel mt-10 overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">Rincian biaya berjalan per komponen</caption>
                <tbody>
                  {BIAYA.map(([komponen, cara, biaya], index) => (
                    <tr
                      key={komponen}
                      className={cn(
                        'transition-colors duration-150 hover:bg-[var(--surface-2)]',
                        index > 0 && 'border-t border-line',
                      )}
                    >
                      <th scope="row" className="px-5 py-4 text-left font-medium text-ink">
                        {komponen}
                      </th>
                      <td className="hidden px-5 py-4 text-muted sm:table-cell">{cara}</td>
                      <td className="numeric px-5 py-4 text-right text-[var(--color-positive)]">
                        {biaya}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </RevealGroup>
      </div>
    </section>
  );
}
