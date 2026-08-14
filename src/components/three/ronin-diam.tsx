'use client';

/**
 * Ronin yang diam — cadangan untuk tingkat `lite` dan `off`.
 *
 * ── INI BUKAN PERMINTAAN MAAF ──────────────────────────────────────────
 *
 * Orang yang gerak-nya dikurangi, atau yang perangkatnya tidak sanggup, berhak
 * merasa melihat produk yang SAMA — lebih tenang, bukan sisanya. Jadi
 * siluetnya utuh: caping, bahu zirah, badan meruncing, dan satu celah mata
 * yang menyala. Yang hilang hanya geraknya.
 *
 * Digambar dengan CSS, bukan gambar. Sebuah PNG akan menambah satu permintaan
 * jaringan dan satu berkas biner yang tidak dapat diperiksa dalam diff — untuk
 * bentuk yang seluruhnya tersusun dari lingkaran dan segitiga.
 *
 * Ukurannya SAMA dengan kanvasnya, jadi pergantian di perangkat `full` tidak
 * menggeser satu piksel pun tata letak.
 */
export function RoninDiam({ menebas = false }: { menebas?: boolean }) {
  return (
    <div className="grid size-full place-items-center" aria-hidden>
      <div className="relative aspect-square w-[min(78%,26rem)]">
        {/* kabut di belakang — yang memberi cahaya tempat berpijak */}
        <div
          className="absolute inset-[4%] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 46%, color-mix(in oklab, var(--color-ronin) 26%, transparent), transparent 66%)',
            filter: 'blur(18px)',
          }}
        />

        {/* caping — bentuk yang harus dikenali dalam sekejap */}
        <div
          className="absolute"
          style={{
            top: '19%',
            left: '27%',
            width: '46%',
            height: '13%',
            background: 'color-mix(in oklab, var(--color-ronin) 20%, black)',
            border: '1px solid color-mix(in oklab, var(--color-ronin) 62%, transparent)',
            clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
          }}
        />

        {/* kepala di bawah bayangan caping */}
        <div
          className="absolute rounded-full"
          style={{ top: '30%', left: '43%', width: '14%', height: '10%', background: 'color-mix(in oklab, var(--color-ronin) 14%, black)', border: '1px solid color-mix(in oklab, var(--color-ronin) 55%, transparent)' }}
        />
        {/* celah mata — satu-satunya bagian yang menyala */}
        <div
          className="absolute rounded-full"
          style={{
            top: '34%',
            left: '45%',
            width: '10%',
            height: '1.4%',
            background: 'var(--color-ronin-bright)',
            boxShadow: '0 0 12px var(--color-ronin)',
          }}
        />

        {/* bahu zirah, bersudut */}
        {[-1, 1].map((sisi) => (
          <div
            key={sisi}
            className="absolute rounded-sm"
            style={{
              top: '41%',
              left: sisi === -1 ? '28%' : '58%',
              width: '14%',
              height: '7%',
              background: 'color-mix(in oklab, var(--color-ronin) 30%, black)',
              border: '1px solid var(--color-ronin)',
              transform: `rotate(${String(sisi * 14)}deg)`,
            }}
          />
        ))}

        {/* badan meruncing */}
        <div
          className="absolute"
          style={{
            top: '45%',
            left: '39%',
            width: '22%',
            height: '26%',
            background: 'color-mix(in oklab, var(--color-ronin) 20%, black)',
            border: '1px solid color-mix(in oklab, var(--color-ronin) 62%, transparent)',
            clipPath: 'polygon(6% 0%, 94% 0%, 78% 100%, 22% 100%)',
          }}
        />

        {/* kaki, kuda-kuda */}
        {[-1, 1].map((sisi) => (
          <div
            key={sisi}
            className="absolute rounded-b"
            style={{
              top: '70%',
              left: sisi === -1 ? '41%' : '54%',
              width: '5%',
              height: '18%',
              background: 'color-mix(in oklab, var(--color-ronin) 14%, black)',
              border: '1px solid color-mix(in oklab, var(--color-ronin) 55%, transparent)',
              transform: `rotate(${String(sisi * 6)}deg)`,
            }}
          />
        ))}

        {/* katana — diam pada posisi istirahat, atau terangkat kalau
            ringkasannya sedang terbuka. Satu perbedaan kecil yang membuat
            cadangan ini ikut menanggapi, bukan sekadar gambar mati. */}
        <div
          className="absolute origin-left rounded-full transition-transform duration-500"
          style={{
            top: '52%',
            left: '60%',
            width: '30%',
            height: '0.9%',
            background: 'var(--color-ronin-bright)',
            boxShadow: '0 0 14px var(--color-ronin)',
            transform: `rotate(${menebas ? '-38deg' : '18deg'})`,
          }}
        />

        {/* bara — beberapa titik diam, ukurannya berbeda-beda */}
        {[
          { t: '22%', l: '18%', s: 3 },
          { t: '58%', l: '12%', s: 2 },
          { t: '34%', l: '82%', s: 4 },
          { t: '68%', l: '76%', s: 2 },
          { t: '12%', l: '62%', s: 3 },
          { t: '80%', l: '30%', s: 2 },
        ].map((b) => (
          <div
            key={`${b.t}${b.l}`}
            className="absolute rounded-full"
            style={{
              top: b.t,
              left: b.l,
              width: b.s,
              height: b.s,
              background: 'var(--color-ronin)',
              opacity: 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}
