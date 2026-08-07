'use client';

/**
 * Pengganti tanpa WebGL.
 *
 * Siluet beruang yang sama — kepala, dua telinga, badan — digambar dengan CSS.
 * BUKAN kotak kosong: pengunjung yang gerak-nya dikurangi tetap bertemu maskot
 * yang sama, hanya saja diam.
 */
export function StaticMascot() {
  return (
    <div className="grid size-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[min(62%,20rem)]">
        {/* halo inti */}
        <div
          className="absolute inset-[6%] rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, color-mix(in oklab, var(--color-holo) 30%, transparent), transparent 62%)',
            filter: 'blur(10px)',
          }}
        />
        {/* telinga */}
        {[-1, 1].map((side) => (
          <div
            key={side}
            className="absolute size-[19%] rounded-full"
            style={{
              background: 'var(--surface-4)',
              top: '17%',
              left: side === -1 ? '18%' : '63%',
            }}
          />
        ))}
        {/* kepala */}
        <div
          className="absolute rounded-full"
          style={{ inset: '22% 24% 34% 24%', background: 'var(--surface-4)' }}
        />
        {/* badan */}
        <div
          className="absolute rounded-full"
          style={{ inset: '58% 16% 4% 16%', background: 'var(--surface-3)' }}
        />
        {/* visor — satu-satunya bagian yang menyala, sama seperti di 3D */}
        <div
          className="absolute size-[7%] rounded-full border-2"
          style={{ top: '42%', left: '36%', borderColor: 'var(--color-holo)' }}
        />
      </div>
    </div>
  );
}
