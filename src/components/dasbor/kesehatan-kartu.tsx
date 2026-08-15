'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Info, ShieldCheck } from 'lucide-react';

import { Card, CardBody, CardTitle } from '@/components/ui/card';
import {
  hitungSkor,
  susunPeringatan,
  type MasukanKesehatan,
  type TingkatPeringatan,
} from '@/lib/kesehatan';

/**
 * W1 + W4: pusat peringatan dan skor kesehatan, dalam satu kartu.
 *
 * ── MENGAPA SATU KARTU, BUKAN DUA ──────────────────────────────────────
 *
 * Keduanya menjawab pertanyaan yang sama dari dua sisi: "apa keadaan uangku,
 * dan apa yang perlu kulakukan". Memisahkannya menjadi dua kartu memaksa mata
 * menghubungkannya sendiri, dan skor tanpa daftar tindakan hanyalah nilai
 * rapor tanpa penjelasan.
 *
 * ── ANGKANYA SELALU DIRINCI ────────────────────────────────────────────
 *
 * Skor tunggal tidak dapat ditindaklanjuti: orang yang melihat "62" tidak tahu
 * apa yang harus diubah. Keempat komponennya karena itu selalu tampil di
 * bawahnya, dengan nilai dan batasnya masing-masing.
 */

/**
 * Waktu ditangkap SEKALI saat modulnya dimuat, bukan tiap render.
 *
 * `Date.now()` di dalam render adalah fungsi tak murni, dan React Compiler
 * menolaknya dengan benar — nilai yang berbeda pada setiap render membuat
 * hasil render tidak dapat diramalkan.
 *
 * Menangkapnya sekali juga lebih tepat untuk apa yang diukur. Yang
 * dibandingkan tenggat dalam satuan HARI; jam yang bergerak di tengah sesi
 * tidak mengubah jawabannya, tetapi membuat daftar peringatan berpotensi
 * berubah di antara dua render tanpa satu data pun berubah.
 */
const DIMUAT = Date.now();

const IKON: Record<TingkatPeringatan, typeof AlertTriangle> = {
  bahaya: AlertTriangle,
  awas: Info,
  kabar: Info,
};

const WARNA: Record<TingkatPeringatan, string> = {
  bahaya: 'var(--color-danger)',
  awas: 'var(--color-warning)',
  kabar: 'var(--color-holo)',
};

export function KesehatanKartu({
  masukan,
}: {
  masukan: Omit<MasukanKesehatan, 'sekarang'>;
}) {
  const penuh: MasukanKesehatan = { ...masukan, sekarang: DIMUAT };
  const skor = hitungSkor(penuh);
  const peringatan = susunPeringatan(penuh);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Kesehatan keuangan</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Dihitung dari anggaran, tabungan, dan tujuanmu — bukan dari jumlah
              transaksi.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="numeric text-3xl leading-none text-ink">{skor.nilai}</p>
            <p className="mt-1 text-xs text-dim">dari 100</p>
          </div>
        </div>

        {/* Rincian: empat batang, masing-masing dengan angkanya sendiri. */}
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {skor.rincian.map((r) => (
            <div key={r.label}>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-muted">{r.label}</dt>
                <dd className="numeric text-xs text-dim">
                  {r.nilai}/{r.maks}
                </dd>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-brass)]"
                  style={{ width: `${String((r.nilai / r.maks) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-[0.14em] text-dim">
            Perlu perhatian
          </h3>

          {peringatan.length === 0 ? (
            /* Keadaan kosong yang MENJELASKAN, bukan ruang kosong. Daftar
               peringatan yang kosong adalah kabar baik, dan kabar baik yang
               tidak dikatakan terbaca sebagai fitur yang rusak. */
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="size-4 text-[var(--color-success)]" aria-hidden />
              Tidak ada yang mendesak. Anggaran dan tujuanmu masih di jalur.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {peringatan.slice(0, 4).map((p) => {
                const Ikon = IKON[p.tingkat];
                return (
                  <li key={p.id}>
                    <Link
                      href={p.tautan}
                      className="group flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-line-strong"
                    >
                      <Ikon
                        className="mt-0.5 size-4 shrink-0"
                        style={{ color: WARNA[p.tingkat] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{p.judul}</span>
                        <span className="block text-xs text-muted">{p.detail}</span>
                      </span>
                      <ArrowRight
                        className="mt-0.5 size-4 shrink-0 text-dim transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
