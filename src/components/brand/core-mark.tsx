import { cn } from '@/lib/cn';

/**
 * Lambang merek — iris dua belas bilah.
 *
 * Bentuknya sengaja mengutip The Core dari aplikasi mobile: aperture dengan
 * simetri radial dua belas lipatan dan pupil hologram di tengah. Satu produk
 * yang lambangnya berbeda antar platform terbaca sebagai dua produk.
 */
export function CoreMark({ className }: { className?: string }) {
  const blades = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="KANTONGZ"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round">
        {blades.map((deg) => (
          <line key={deg} x1="24" y1="7" x2="24" y2="14" transform={`rotate(${String(deg)} 24 24)`} />
        ))}
      </g>
      <circle cx="24" cy="24" r="11" stroke="#C89440" strokeOpacity="0.85" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="5" fill="#00F5D4" fillOpacity="0.9" />
    </svg>
  );
}
