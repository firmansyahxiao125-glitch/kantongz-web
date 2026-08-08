'use client';

import { useState } from 'react';

import { Reveal } from '@/components/ui/reveal';
import { cn } from '@/lib/cn';

/**
 * Tanya jawab — SATU-SATUNYA bagian halaman muka yang benar-benar interaktif.
 *
 * Karena itu ia berdiri di berkasnya sendiri. `'use client'` menular ke seluruh
 * modul yang memuatnya: selama akordeon ini tinggal di `sections.tsx`, lima
 * bagian statis di sebelahnya ikut terseret menjadi Client Component dan ikut
 * dihidrasi tanpa satu pun alasan.
 *
 * Framer Motion sudah TIDAK dipakai di sini. Tinggi panel dianimasikan lewat
 * `grid-template-rows: 0fr → 1fr`, yang dikerjakan CSS sendiri — dan karena ia
 * transisi CSS, aturan `prefers-reduced-motion` di `globals.css` akhirnya
 * benar-benar menjangkaunya. Versi Framer-nya dulu hanya patuh karena ada
 * `MotionConfig` terpisah yang mengurusnya.
 */

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
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-holo)]">
          Tanya jawab
        </p>
      </Reveal>
      <Reveal index={1}>
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

              {/*
                `0fr → 1fr` dan bukan `height: 0 → auto`.

                Tinggi `auto` tidak dapat ditransisikan CSS; itulah sebabnya
                dulu dibutuhkan pustaka animasi hanya untuk membuka sebuah
                panel. Sebuah baris grid BISA — dan hasilnya tidak menuntut
                pengukuran apa pun di utas utama.
              */}
              <div
                id={`jawab-${String(index)}`}
                className="grid transition-[grid-template-rows] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">{a}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
