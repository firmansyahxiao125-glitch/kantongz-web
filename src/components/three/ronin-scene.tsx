'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DeferUntilIdle } from '@/components/three/defer';
import { RoninDiam } from '@/components/three/ronin-diam';
import type { KendaliRonin } from '@/components/three/ronin';
import { cn } from '@/lib/cn';
import { useGraphicsTier } from '@/lib/gpu';
import {
  DIAM_SEBELUM_ISTIRAHAT,
  type FaseRonin,
  majuFase,
  totalTebasan,
} from '@/lib/ronin';

/**
 * Panggung Ronin di halaman muka.
 *
 * ── PEMBAGIAN TUGAS ────────────────────────────────────────────────────
 *
 * Berkas ini memegang JAM dan KENDALI; `ronin.tsx` hanya menggambar. Jamnya
 * berjalan di sini — bukan di dalam `useFrame` — karena ia harus tetap berjalan
 * pada tingkat `off` dan `lite`, tempat kanvasnya tidak pernah ada. Orang yang
 * gerak-nya dikurangi tetap boleh menebas; yang berubah hanya bagaimana
 * hasilnya diperlihatkan.
 *
 * ── SATU KONTROL, DAN IA DAPAT DITEKAN PAPAN TIK ───────────────────────
 *
 * Interaksi yang hanya dapat dicapai tetikus adalah interaksi yang separuh
 * penontonnya tidak punya. Panggungnya sendiri adalah tombolnya: satu
 * perhentian Tab, bernama, dengan cincin fokus, menanggapi Enter dan Spasi
 * persis seperti klik.
 */

const LazyCanvas = dynamic(() => import('@/components/three/ronin-canvas'), {
  ssr: false,
  loading: () => <RoninDiam />,
});

/**
 * Angka yang muncul sesudah tebasan.
 *
 * Di halaman muka ini CONTOH, dan katanya disebut — "contoh" tertulis di
 * layar, bukan disembunyikan di komentar. Angka keuangan yang tampak nyata di
 * halaman pemasaran adalah kebohongan kecil yang tidak perlu.
 */
const CONTOH = [
  { label: 'Kekayaan bersih', nilai: 'Rp 34.748.000' },
  { label: 'Arus kas bulan ini', nilai: '+Rp 17.220.000' },
  { label: 'Dana darurat', nilai: '62% terkumpul' },
];

export function RoninScene({ className }: { className?: string }) {
  const tier = useGraphicsTier();
  const [terbuka, setTerbuka] = useState(false);
  const panggung = useRef<HTMLDivElement>(null);

  const kendali = useRef<KendaliRonin>({
    fase: 'diam',
    t: 0,
    gulir: 0,
    arah: { x: 0, y: 0 },
  });

  /* Sejak kapan tidak ada masukan. Sesudah ambangnya, ia hanyut kembali ke
     pose istirahat — bukan membeku di mana pun kursor terakhir berada. */
  const sepi = useRef(0);

  /* ── jam ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    let raf = 0;
    let lalu = performance.now();

    const detak = (kini: number): void => {
      const delta = Math.min((kini - lalu) / 1000, 0.05);
      lalu = kini;

      const k = kendali.current;
      k.t += delta;
      sepi.current += delta;

      const maju = majuFase(k.fase, k.t);
      if (maju.fase !== k.fase) {
        k.fase = maju.fase;
        k.t = maju.t;
        if (maju.fase === 'terbuka') setTerbuka(true);
      }

      /* Hanyut kembali ke tengah kalau sudah lama tidak disentuh. */
      if (sepi.current > DIAM_SEBELUM_ISTIRAHAT) {
        k.arah.x += (0 - k.arah.x) * Math.min(1, delta * 1.6);
        k.arah.y += (0 - k.arah.y) * Math.min(1, delta * 1.6);
      }

      raf = requestAnimationFrame(detak);
    };

    raf = requestAnimationFrame(detak);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── gulir ────────────────────────────────────────────────────────── */

  useEffect(() => {
    const hitung = (): void => {
      const el = panggung.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      /* Kemajuan diukur sepanjang SATU layar penuh sesudah panggung menyentuh
         puncak. Mengukurnya terhadap tinggi dokumen membuat koreografinya
         bergantung pada panjang halaman, dan panjang halaman berubah setiap
         kali ada bagian yang ditambahkan. */
      const maju = (0 - r.top) / Math.max(window.innerHeight, 1);
      kendali.current.gulir = Math.max(0, Math.min(1, maju));
    };

    hitung();
    window.addEventListener('scroll', hitung, { passive: true });
    window.addEventListener('resize', hitung);
    return () => {
      window.removeEventListener('scroll', hitung);
      window.removeEventListener('resize', hitung);
    };
  }, []);

  /* ── penunjuk: tetikus DAN sentuhan ───────────────────────────────── */

  const arahkan = useCallback((clientX: number, clientY: number) => {
    const el = panggung.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    kendali.current.arah.x = ((clientX - r.left) / r.width) * 2 - 1;
    kendali.current.arah.y = ((clientY - r.top) / r.height) * 2 - 1;
    sepi.current = 0;
  }, []);

  /* ── tebasan ──────────────────────────────────────────────────────── */

  const tebas = useCallback(() => {
    const k = kendali.current;
    sepi.current = 0;

    if (k.fase === 'terbuka') {
      k.fase = 'diam';
      k.t = 0;
      setTerbuka(false);
      return;
    }
    /* Menebas selagi menebas diabaikan. Ayunan yang dimulai ulang di tengah
       ayunan terbaca sebagai kedutan, bukan sebagai dua tebasan. */
    if (k.fase !== 'diam') return;

    k.fase = 'ancang';
    k.t = 0;
  }, []);

  const tutup = useCallback(() => {
    const k = kendali.current;
    if (k.fase !== 'terbuka') return;
    k.fase = 'diam';
    k.t = 0;
    setTerbuka(false);
    sepi.current = 0;
  }, []);

  useEffect(() => {
    if (!terbuka) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') tutup();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [terbuka, tutup]);

  return (
    <div
      ref={panggung}
      className={cn('relative', className)}
      data-tier={tier}
      onPointerMove={(e) => {
        arahkan(e.clientX, e.clientY);
      }}
      /*
        Menekan panggungnya juga menebas — tetapi lewat PENUNJUK saja.

        Ini sengaja tidak dijadikan `role="button"` dan tidak diberi
        `tabIndex`: kendali papan tiknya sudah ada di bawah, dan menambah
        perhentian Tab kedua yang melakukan hal yang sama persis hanya
        memperpanjang perjalanan tanpa menambah kemampuan.

        Klik yang berasal DARI tombolnya diabaikan, kalau tidak satu tekanan
        akan menebas dua kali dan lapisannya langsung tertutup lagi.
      */
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) tebas();
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) arahkan(t.clientX, t.clientY);
      }}
    >
      {tier === 'full' ? (
        <DeferUntilIdle fallback={<RoninDiam />}>
          <LazyCanvas kendali={kendali} />
        </DeferUntilIdle>
      ) : (
        /* `lite` TIDAK mengunduh three.js sama sekali — keputusan yang sudah
           diukur sebelumnya: satu bundel 341 KiB menghasilkan Total Blocking
           Time 3.130 ms pada emulasi ponsel. Yang tampil adalah komposisi diam
           yang dirancang, dan tebasannya tetap dapat ditekan: yang berubah
           hanya bagaimana hasilnya diperlihatkan. */
        <RoninDiam menebas={terbuka} />
      )}

      {/*
        TOMBOLNYA TERLIHAT, DAN ITU PERBAIKAN — BUKAN KOMPROMI.

        Versi sebelumnya menjadikan SELURUH panggung satu tombol `inset-0`
        yang tak terlihat. Niatnya benar (tebasan harus dapat dicapai papan
        tik), tetapi hasilnya salah dua kali.

        Pertama, gerbang `akses` menolaknya, dan alasannya sah: kotak
        fokusnya setinggi 480 piksel dengan puncak jauh di atas baris CTA,
        jadi Tab dari "Masuk ke akun" melompat ke atas melewati ambang 240
        piksel. Pengguna papan tik kehilangan tempatnya di halaman.

        Kedua — dan ini lebih penting daripada gerbangnya — tombol tak
        terlihat adalah tombol yang tidak diketahui siapa pun. Satu-satunya
        petunjuk keberadaannya adalah cincin fokus yang baru muncul SESUDAH
        seseorang menebak untuk menekan Tab ke sana.

        Jadi kendalinya menjadi tombol sungguhan di bawah panggung: terlihat,
        bernama, dan berada persis di tempat urutan bacanya. Menekan
        panggungnya sendiri TETAP menebas lewat penunjuk — kesenangan itu
        tidak hilang, ia hanya berhenti menjadi satu-satunya jalan masuk.
      */}
      <button
        type="button"
        onClick={tebas}
        aria-pressed={terbuka}
        aria-label={
          terbuka
            ? 'Tutup ringkasan keuangan contoh'
            : 'Tebas — perlihatkan ringkasan keuangan contoh'
        }
        className="absolute inset-x-0 bottom-0 z-20 mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_78%,transparent)] px-4 py-2 text-xs font-medium text-ink backdrop-blur-md transition-colors outline-none hover:border-[var(--color-ronin)] focus-visible:ring-2 focus-visible:ring-[var(--color-ronin)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      >
        <span aria-hidden>{terbuka ? '✕' : '⚔'}</span>
        {terbuka ? 'Tutup' : 'Tebas'}
        <span className="sr-only">
          {terbuka ? 'Ringkasan terbuka. Tekan Escape untuk menutup.' : 'Tekan untuk menebas.'}
        </span>
      </button>

      {/*
        Lapisan data. `aria-live` supaya perubahan yang terjadi TANPA
        berpindah halaman tetap diumumkan — halaman muka masuk daftar wajib
        wilayah langsung sejak tebasan ada, persis seperti dicatat `akses`.
      */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-4 bottom-14 z-10"
      >
        {terbuka ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_82%,transparent)] p-4 backdrop-blur-md">
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-dim">
              Angka contoh
            </p>
            <dl className="space-y-1.5">
              {CONTOH.map((c) => (
                <div key={c.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted">{c.label}</dt>
                  <dd className="numeric text-sm text-ink">{c.nilai}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { totalTebasan };
export type { FaseRonin };
