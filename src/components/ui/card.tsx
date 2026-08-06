'use client';

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion';
import { forwardRef, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';

/**
 * Kartu.
 *
 * `Card` biasa untuk mayoritas; `TiltCard` hanya untuk panel utama yang
 * memang layak menarik perhatian. Kalau setiap kartu miring mengikuti kursor,
 * tidak ada satu pun yang terasa istimewa dan seluruh halaman terasa gelisah.
 */

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]',
        'shadow-[var(--shadow-soft)]',
        className,
      )}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-medium text-[var(--ink-muted)]', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />;
}

/** Batas kemiringan dalam derajat. Di atas ini kartu terbaca sebagai mainan,
 *  bukan sebagai kedalaman. */
const MAX_TILT = 6;

export interface TiltCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  /** Pendar yang mengikuti kursor. Mahal secara visual — pakai seperlunya. */
  glow?: boolean;
}

/**
 * Kartu dengan kemiringan perspektif mengikuti kursor.
 *
 * Seluruhnya `transform` — tidak ada properti tata letak yang berubah, jadi
 * tidak ada frame yang memicu reflow. Pegas lembut mencegah kartu menghentak
 * saat kursor bergerak cepat.
 */
export function TiltCard({ children, className, glow = false, ...rest }: TiltCardProps) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useMotionValue(0), springSoft);
  const rotateY = useSpring(useMotionValue(0), springSoft);

  /* Persen dihitung dari nilai gerak, bukan dari state React — kursor
     bergerak puluhan kali per detik dan setiap render adalah pemborosan. */
  const glowX = useTransform(px, (v) => `${String(v * 100)}%`);
  const glowY = useTransform(py, (v) => `${String(v * 100)}%`);
  const glowStyle = useMotionTemplate`radial-gradient(340px circle at ${glowX} ${glowY}, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 70%)`;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    px.set(x);
    py.set(y);
    rotateY.set((x - 0.5) * MAX_TILT * 2);
    rotateX.set((0.5 - y) * MAX_TILT * 2);
  }

  function handleLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: 'preserve-3d' }}
      className={cn(
        'group relative overflow-hidden rounded-[var(--radius-panel)]',
        'border border-[var(--line-strong)] bg-[var(--surface)]',
        'shadow-[var(--shadow-lift)] will-change-transform',
        className,
      )}
      {...rest}
    >
      {glow ? (
        <motion.div
          aria-hidden
          style={{ background: glowStyle }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      ) : null}
      <div className="relative" style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>
    </motion.div>
  );
}
