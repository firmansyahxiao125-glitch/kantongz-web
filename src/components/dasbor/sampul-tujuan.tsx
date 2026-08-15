'use client';

/**
 * W3: sampul tujuan — DIBANGKITKAN, bukan foto stok.
 *
 * ── MENGAPA BUKAN FOTO ─────────────────────────────────────────────────
 *
 * Foto stok untuk tujuan keuangan salah pada tiga tingkat sekaligus.
 *
 * Lisensi: setiap foto menuntut jejak hak pakai yang harus dijaga selamanya,
 * dan ini proyek tanpa anggaran aset.
 *
 * Berat: satu foto sampul mengalahkan seluruh anggaran halaman ini, dan
 * dikalikan jumlah tujuan.
 *
 * Dan yang paling menentukan — KEJUJURAN. Foto pantai di atas tujuan bernama
 * "Dana darurat" menjanjikan sesuatu yang bukan miliknya. Tujuan keuangan
 * adalah angka dan waktu, bukan suasana.
 *
 * ── DETERMINISTIK DARI id ──────────────────────────────────────────────
 *
 * Sampulnya dihitung dari `id` lewat hash kecil, jadi tujuan yang sama SELALU
 * mendapat sampul yang sama — di setiap perangkat, setiap muat ulang, setiap
 * tangkapan layar dokumentasi. Sampul yang berubah sendiri terbaca sebagai
 * data yang berubah sendiri.
 */

/** FNV-1a 32-bit. Kecil, tanpa dependensi, dan sebarannya cukup rata untuk
 *  memilih di antara belasan kemungkinan. */
function hash(teks: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < teks.length; i += 1) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Rona diambil dari palet yang SUDAH ada, bukan dari roda warna penuh.
 *
 * Rona acak akan menabrak arti yang sudah dijaga ketat sistem desain ini —
 * hijau, merah, dan kuning adalah sinyal, dan kuningan hanya uang. Yang
 * dipakai di sini turunan kuningan dan hologram saja, dengan sudut yang
 * berbeda-beda supaya tetap dapat dibedakan satu sama lain.
 */
export function SampulTujuan({
  id,
  nama,
  warna,
  className,
}: {
  id: string;
  nama: string;
  warna?: string | null;
  className?: string;
}) {
  const h = hash(id);
  const sudut = h % 360;
  const geser = 24 + (h >> 9) % 40;
  const dasar = warna ?? 'var(--color-brass)';

  return (
    <div
      className={className}
      aria-hidden
      style={{
        background: `linear-gradient(${String(sudut)}deg,
          color-mix(in oklab, ${dasar} 78%, transparent),
          color-mix(in oklab, var(--color-holo) ${String(geser)}%, ${dasar}) 100%)`,
      }}
    >
      {/*
        Inisial, bukan ikon. Ikon menuntut seseorang memilih ikon yang tepat
        untuk setiap tujuan yang mungkin dibuat pengguna — pekerjaan yang tidak
        pernah selesai. Huruf pertama selalu ada dan selalu benar.
      */}
      <span className="grid size-full place-items-center text-lg font-semibold text-[color-mix(in_oklab,black_62%,transparent)]">
        {nama.trim().charAt(0).toUpperCase() || '•'}
      </span>
    </div>
  );
}
