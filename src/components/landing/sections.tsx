'use client';

import { motion } from 'framer-motion';
import {
  Boxes,
  Brain,
  Camera,
  Code2,
  Database,
  Layers,
  Lock,
  MessageSquare,
  Radar,
  ServerCog,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

import { Reveal, RevealGroup } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Bagian-bagian halaman muka.
 *
 * SELURUH angka dan kalimat di berkas ini menggambarkan apa yang benar-benar
 * ada di repositori ini. Tidak ada logo perusahaan yang tidak memakainya,
 * tidak ada testimoni yang tidak pernah diucapkan, dan tidak ada metrik
 * pertumbuhan yang tidak pernah diukur. Halaman muka portofolio yang memalsukan
 * pelanggan adalah hal pertama yang akan diperiksa pembacanya, dan satu-satunya
 * yang akan diingatnya.
 */

/* ── kemampuan ───────────────────────────────────────────────────────── */

const KEMAMPUAN = [
  {
    icon: Radar,
    title: 'Anomali & langganan hantu',
    body: 'Z-score per kategori menandai pengeluaran janggal. Tagihan dengan interval DAN nominal yang stabil dikenali sebagai langganan — lalu yang tidak tersentuh berbulan-bulan ditandai.',
    proof: 'Deterministik. Tanpa model, tanpa kunci API.',
    milestone: 'M10',
  },
  {
    icon: TrendingUp,
    title: 'Proyeksi arus kas',
    body: 'Perkiraan 30/60/90 hari dengan pita ketidakpastian yang melebar sebanding akar waktu. Bila datanya belum cukup, itu dinyatakan — bukan disamarkan sebagai pita lebar.',
    proof: 'Regresi atas riwayatmu sendiri.',
    milestone: 'M12',
  },
  {
    icon: MessageSquare,
    title: 'Bertanya ke datamu',
    body: 'Sepuluh maksud dikenali deterministik dari kalimat biasa. Setiap angka dihitung server dari basis data, dan setiap jawaban membawa asal-usulnya.',
    proof: 'Pertanyaan di luar jangkauan dijawab "belum bisa" — bukan dikarang.',
    milestone: 'M13',
  },
  {
    icon: Camera,
    title: 'Snap-Struk',
    body: 'Foto struk dibaca OCR yang berjalan di server ini sendiri. Merchant, total, dan tanggal mengisi formulir; kamu tinggal memeriksa.',
    proof: 'Tesseract lokal. Tidak ada gambar yang meninggalkan mesinmu.',
    milestone: 'M6',
  },
  {
    icon: Brain,
    title: 'Ringkasan naratif',
    body: 'Kalimat ringkasan disusun model bahasa lokal lewat Ollama bila tersedia, dan oleh templat bila tidak. Angkanya selalu dari server, tidak pernah dari model.',
    proof: 'Sumber kalimat ditampilkan apa adanya di layar.',
    milestone: 'M11',
  },
  {
    icon: Lock,
    title: 'Keamanan lebih dulu',
    body: 'Argon2id 64 MiB, keluarga token dengan deteksi pemakaian ulang, pengikatan perangkat, dan jejak audit berantai hash yang perusakannya terdeteksi.',
    proof: 'Penguncian diperiksa SEBELUM sandi dibandingkan.',
    milestone: 'M3, M14',
  },
] as const;

export function Kemampuan() {
  return (
    <section id="fitur" className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <RevealGroup>
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Kemampuan
          </p>
        </Reveal>
        <Reveal>
          <h2 className="text-h2 mt-4 text-balance font-semibold">
            Bukan aplikasi pencatat.
            <span className="block text-muted">Sistem operasi keuangan.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {KEMAMPUAN.map(({ icon: Icon, title, body, proof, milestone }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="edge-light group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-[var(--surface)] p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-line-strong bg-[var(--surface-2)]">
                  <Icon className="size-5 text-[var(--color-accent)]" aria-hidden />
                </span>
                <span className="numeric rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-faint">
                  {milestone}
                </span>
              </div>

              <h3 className="mt-5 text-base font-medium">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>

              {/* Klaim tanpa dasar adalah brosur. Baris ini yang membedakan. */}
              <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-faint">
                {proof}
              </p>
            </motion.article>
          ))}
        </div>
      </RevealGroup>
    </section>
  );
}

/* ── arsitektur ──────────────────────────────────────────────────────── */

const LAPISAN = [
  {
    icon: Smartphone,
    name: 'Klien',
    stack: 'Expo · React Native 0.86 · Next.js 16 · React 19',
    note: 'Aplikasi mobile dan web berbagi kontrak yang sama. Web menyimpan refresh token di cookie httpOnly lewat BFF; mobile menyimpannya di keystore perangkat.',
  },
  {
    icon: ServerCog,
    name: 'API',
    stack: 'Node 22 · Fastify 5 · zod · jose (RS256)',
    note: 'Amplop data/error tunggal, OpenAPI 3.1 yang ditegakkan uji — rute yang tidak terdokumentasi membuat suite merah.',
  },
  {
    icon: Brain,
    name: 'Kecerdasan',
    stack: 'Deterministik dulu · Ollama opsional',
    note: 'Aturan, statistik, dan regresi mengerjakan seluruh angka. Model bahasa hanya menyusun kalimat, dan aplikasi berjalan penuh tanpanya.',
  },
  {
    icon: Database,
    name: 'Data',
    stack: 'PostgreSQL 16 · Redis 7 · Drizzle ORM',
    note: 'Saldo tidak pernah disimpan — dihitung dari buku besar. Transfer adalah SATU baris dengan dua dompet, ditegakkan CHECK constraint.',
  },
  {
    icon: Boxes,
    name: 'Infrastruktur',
    stack: 'Docker Compose · Mailpit · migrasi sekali-jalan',
    note: 'Satu perintah menyalakan seluruh tumpukan di mesin lokal. Tanpa akun, tanpa kunci API, tanpa biaya berulang.',
  },
  {
    icon: Layers,
    name: 'Pengujian',
    stack: 'Vitest · PGlite · uji paritas',
    note: 'PGlite menjalankan PostgreSQL sungguhan di dalam uji, jadi CHECK constraint dan perencana kueri ikut teruji — bukan tiruan yang selalu setuju.',
  },
] as const;

export function Arsitektur() {
  return (
    <section id="arsitektur" className="border-y border-line bg-[var(--surface)]/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Arsitektur
            </p>
          </Reveal>
          <Reveal>
            <h2 className="text-h2 mt-4 max-w-2xl text-balance font-semibold">
              Enam lapisan, seluruhnya berjalan di satu laptop
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-[var(--line)] md:grid-cols-2 lg:grid-cols-3">
            {LAPISAN.map(({ icon: Icon, name, stack, note }) => (
              <motion.div key={name} variants={fadeUp} className="bg-[var(--surface)] p-6">
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-muted" aria-hidden />
                  <h3 className="text-sm font-semibold">{name}</h3>
                </div>
                <p className="numeric mt-2 text-xs leading-relaxed text-[var(--color-accent)]">
                  {stack}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{note}</p>
              </motion.div>
            ))}
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── tanya jawab ─────────────────────────────────────────────────────── */

const TANYA = [
  {
    q: 'Apakah ini butuh kunci API berbayar?',
    a: 'Tidak. Seluruh aplikasi berjalan tanpa satu pun kunci. Kategorisasi, anomali, langganan, proyeksi, dan jawaban asisten seluruhnya deterministik. Ringkasan naratif memakai Ollama bila tersedia di mesinmu, dan jatuh ke templat bila tidak — tanpa pesan galat, tanpa fitur yang hilang.',
  },
  {
    q: 'Ke mana data keuanganku pergi?',
    a: 'Ke PostgreSQL di mesin yang kamu jalankan sendiri. Foto struk dibaca OCR yang berjalan di proses backend yang sama. Tidak ada penyedia pihak ketiga di jalur data mana pun.',
  },
  {
    q: 'Mengapa jumlah uang berupa bilangan bulat?',
    a: 'Karena pecahan biner tidak dapat mewakili nilai desimal dengan tepat, dan galat pembulatan pada uang adalah uang yang hilang. Nilainya disimpan dalam satuan terkecil yang beredar — untuk rupiah itu rupiah utuh, bukan sen, karena sen tidak beredar.',
  },
  {
    q: 'Apakah saldo disimpan di basis data?',
    a: 'Tidak. Saldo dihitung dari buku besar setiap kali diminta. Saldo yang disimpan akan menyimpang dari transaksinya pada kegagalan pertama di tengah jalan, dan menyimpang tanpa satu pun galat.',
  },
  {
    q: 'Apakah ini produk komersial?',
    a: 'Bukan. Ini proyek portofolio dan tugas akhir, dibangun dengan standar produksi. Datanya di demo mana pun adalah data buatan.',
  },
  {
    q: 'Bagaimana kalau perangkatku tidak kuat menjalankan 3D?',
    a: 'Halaman ini memeriksanya sebelum menyalakan apa pun, dan menurunkan mutu atau mematikannya sepenuhnya. Kalau kamu meminta gerak dikurangi lewat pengaturan sistem, tidak ada satu pun animasi yang berjalan.',
  },
] as const;

export function TanyaJawab() {
  const [terbuka, setTerbuka] = useState<number | null>(0);

  return (
    <section id="tanya-jawab" className="mx-auto max-w-3xl px-4 py-24 sm:py-32">
      <RevealGroup>
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Tanya jawab
          </p>
        </Reveal>
        <Reveal>
          <h2 className="text-h2 mt-4 text-balance font-semibold">Yang biasanya ditanyakan</h2>
        </Reveal>

        <div className="mt-10 divide-y divide-[var(--line)] border-y border-line">
          {TANYA.map(({ q, a }, index) => {
            const open = terbuka === index;

            return (
              <Reveal key={q}>
                <h3>
                  <button
                    type="button"
                    /* Kontrol asli, bukan div yang diberi `onClick`: pembaca
                       layar mengumumkan keadaan buka-tutupnya lewat
                       `aria-expanded`, dan papan ketik mendapat fokus tanpa
                       satu baris pun kode tambahan. */
                    aria-expanded={open}
                    aria-controls={`jawab-${String(index)}`}
                    onClick={() => {
                      setTerbuka(open ? null : index);
                    }}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-[15px] font-medium text-ink">{q}</span>
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-muted',
                        'transition-transform duration-[var(--dur-fast)]',
                        open && 'rotate-45',
                      )}
                    >
                      +
                    </span>
                  </button>
                </h3>

                <motion.div
                  id={`jawab-${String(index)}`}
                  initial={false}
                  animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">{a}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </RevealGroup>
    </section>
  );
}

/* ── repositori ──────────────────────────────────────────────────────── */

const REPO = [
  { nama: 'kantongz-api', isi: 'Fastify · Drizzle · PostgreSQL · Redis', uji: '262 uji' },
  { nama: 'kantongz-web', isi: 'Next.js 16 · React 19 · Three.js', uji: '26 rute' },
  { nama: 'kantongz', isi: 'Expo · React Native · expo-router', uji: '44 uji' },
] as const;

export function Repositori() {
  return (
    <section id="repositori" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <Reveal>
            <div className="flex items-center gap-2.5">
              <Code2 className="size-5 text-muted" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Kode
              </p>
            </div>
          </Reveal>
          <Reveal>
            <h2 className="text-h2 mt-4 max-w-2xl text-balance font-semibold">
              Tiga repositori, satu kontrak
            </h2>
          </Reveal>
          <Reveal>
            <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted">
              Kontrak API dibagikan apa adanya antara ketiganya. Ketika sebuah rute berubah, uji
              kesetaraan OpenAPI dan suite paritas mobile keduanya menjadi merah sebelum ada
              seorang pun yang menjalankan aplikasinya.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {REPO.map(({ nama, isi, uji }) => (
              <motion.div
                key={nama}
                variants={fadeUp}
                className="rounded-[var(--radius-card)] border border-line bg-[var(--surface)] p-5"
              >
                <p className="numeric text-sm text-ink">{nama}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{isi}</p>
                <p className="numeric mt-3 text-xs text-[var(--color-success)]">{uji}</p>
              </motion.div>
            ))}
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── keamanan ────────────────────────────────────────────────────────── */

const JAMINAN = [
  ['Argon2id 64 MiB', 'Sandi tidak pernah disimpan, hanya diverifikasi. Parameternya dipilih supaya satu percobaan tebakan berbiaya nyata.'],
  ['Keluarga token', 'Refresh token yang dipakai dua kali mencabut SELURUH keluarganya. Token yang bocor kehilangan gunanya begitu pencurinya memakainya.'],
  ['Pengikatan perangkat', 'Token membawa identitas perangkat. Yang berpindah ke perangkat lain ditolak, bukan diperingatkan.'],
  ['Jejak audit berantai', 'Tiap baris memuat hash baris sebelumnya. Menghapus satu baris memutus rantai sesudahnya, dan pemutusan itu terdeteksi.'],
  ['Gagal-TERTUTUP', 'Ketika Redis tidak dapat dihubungi, penguncian dianggap AKTIF. Sistem yang gagal-terbuka mengubah gangguan menjadi jendela serangan.'],
  ['Penyensoran log', 'Sandi, token, dan kode verifikasi disensor sebelum tertulis. Diuji terhadap keluaran pino sungguhan, bukan dengan membaca kode.'],
] as const;

export function Keamanan() {
  return (
    <section id="keamanan" className="border-y border-line bg-[var(--surface)]/40">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
        <RevealGroup>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Keamanan
                </p>
              </Reveal>
              <Reveal>
                <h2 className="text-h2 mt-4 text-balance font-semibold">
                  Dirancang dengan satu pertanyaan
                </h2>
              </Reveal>
              <Reveal>
                <p className="mt-5 text-pretty leading-relaxed text-muted">
                  Apa yang terjadi kalau ini gagal? Setiap keputusan berikut dibuat dengan
                  menjawab itu lebih dulu — dan beberapa di antaranya membuat jalur
                  bahagia sedikit lebih lambat. Itu pertukaran yang disengaja.
                </p>
              </Reveal>
            </div>

            <ul className="space-y-3">
              {JAMINAN.map(([title, body]) => (
                <motion.li
                  key={title}
                  variants={fadeUp}
                  className="flex gap-4 rounded-xl border border-line bg-[var(--surface)] p-5"
                >
                  <Lock className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" aria-hidden />
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="mt-1.5 text-sm leading-relaxed text-muted">{body}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}

export { stagger };
