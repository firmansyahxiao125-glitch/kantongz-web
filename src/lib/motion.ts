import type { Transition, Variants } from 'framer-motion';

/**
 * Kosakata gerak.
 *
 * Setiap animasi di aplikasi ini memakai salah satu dari yang ada di sini.
 * Durasi dan kurva yang ditulis di tempat pemakaian akan menyimpang dalam
 * sebulan, dan antarmuka yang setiap bagiannya bergerak sedikit berbeda
 * terbaca murah tanpa ada yang bisa menunjuk sebabnya.
 */

/** Kurva tanda tangan: cepat berangkat, mendarat lembut. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
} as const;

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };
export const springSoft: Transition = { type: 'spring', stiffness: 200, damping: 26, mass: 1 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.instant } },
};

/**
 * Induk untuk daftar. Anak-anaknya masuk berurutan, bukan serentak.
 *
 * Jeda 0.05 detik dipilih karena di bawah itu mata membacanya sebagai serentak,
 * dan di atas 0.09 daftar panjang terasa lamban menunggu giliran.
 */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/** Transisi antar halaman. Halus, dan tidak pernah menahan interaksi. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};
