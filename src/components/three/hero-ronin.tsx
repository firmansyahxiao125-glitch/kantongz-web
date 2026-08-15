'use client';

import { useState } from 'react';

import { RoninScene, CONTOH } from '@/components/three/ronin-scene';

/**
 * Kolom kanan hero: Ronin di tengah, kartu angka di sampingnya.
 *
 * ── MENGAPA KOMPONEN INI ADA SAMA SEKALI ───────────────────────────────
 *
 * Kartunya harus tahu kapan tebasan membukanya, dan keadaan itu hidup di
 * dalam `RoninScene`. Cara paling langsung — mengangkat keadaannya ke
 * `page.tsx` — TIDAK dapat dipakai: halaman muka adalah komponen peladen,
 * dan menambahkan satu `useState` di sana mengubah seluruh halaman menjadi
 * komponen klien. Yang hilang bukan sekadar kerapian: elemen LCP halaman ini
 * ada di halaman itu, dan memindahkannya ke klien berarti ia menunggu
 * JavaScript sebelum tergambar.
 *
 * Jadi keadaannya turun, bukan naik. Berkas ini satu-satunya bagian hero yang
 * menjadi klien, dan ia hanya membungkus dua hal yang memang perlu berbicara
 * satu sama lain.
 */
export function HeroRonin({ className }: { className?: string }) {
  const [terbuka, setTerbuka] = useState(false);

  return (
    <div className={className}>
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:gap-5">
        {/*
          `ringkasan="sr-only"` — dan itu bukan menyembunyikan sesuatu.

          Panggungnya tetap memegang wilayah `aria-live`-nya sendiri, karena
          perubahan yang terjadi tanpa berpindah halaman harus tetap
          diumumkan. Yang berubah hanya di mana angkanya DILIHAT: sesudah
          kartu berdiri di sebelahnya, menampilkannya dua kali berarti
          pembaca layar mendengarnya dua kali dan mata membacanya dua kali.
        */}
        <RoninScene
          className="mx-auto aspect-square w-full max-w-[26rem]"
          ringkasan="sr-only"
          onUbah={setTerbuka}
        />

        <KartuContoh terbuka={terbuka} />
      </div>

      <p className="mt-4 text-center text-xs text-dim">
        <span className="text-muted">Ronin</span> — penjaga bukumu. Tekan Tebas untuk
        melihat ringkasan contoh
      </p>
    </div>
  );
}

/**
 * Kartu angka di kolom ketiga.
 *
 * ── SELALU TERLIHAT, TIDAK PERNAH KOSONG ───────────────────────────────
 *
 * Godaannya adalah menyembunyikan kartunya sampai ditebas, supaya tebasannya
 * terasa berarti. Itu keliru: pengunjung yang tidak pernah menebas — yaitu
 * sebagian besar — melihat kolom kosong dan menyimpulkan halamannya rusak.
 *
 * Jadi kartunya selalu ada, hanya SAMAR sebelum ditebas dan tegas sesudahnya.
 * Yang diberikan tebasan bukan keberadaannya melainkan kejelasannya, dan itu
 * cukup untuk terasa sebagai sebab-akibat tanpa menyandera isinya.
 *
 * ── ANGKANYA DISEBUT CONTOH, DI LAYAR ──────────────────────────────────
 *
 * Bukan di komentar, bukan di atribut. Angka keuangan yang tampak nyata di
 * halaman pemasaran adalah kebohongan kecil yang tidak perlu, dan satu label
 * menghapusnya seluruhnya.
 */
function KartuContoh({ terbuka }: { terbuka: boolean }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] p-4 backdrop-blur-md transition-opacity duration-500"
      style={{ opacity: terbuka ? 1 : 0.45 }}
    >
      <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-dim">Angka contoh</p>
      <dl className="space-y-3">
        {CONTOH.map((c) => (
          <div key={c.label}>
            <dt className="text-xs text-muted">{c.label}</dt>
            <dd className="numeric mt-0.5 text-sm text-ink">{c.nilai}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
