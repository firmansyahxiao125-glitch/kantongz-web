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
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]',
        'shadow-[var(--shadow-soft)]',
        className,
      )}
      {...rest}
    />
  );
});

/**
 * Judul kartu.
 *
 * `<h2>` karena `PageHeader` sudah memegang `<h1>` halaman — kartu adalah
 * tingkat berikutnya, dan pembaca layar yang melompat antar-heading harus
 * menemukan struktur itu, bukan lompatan h1 langsung ke h3.
 *
 * Kelasnya diambil dari varian yang MEMANG sudah paling banyak dipakai
 * (`text-sm font-semibold text-ink`, 16 kali), bukan dikarang baru. Sebelum ini
 * peran yang sama ditulis dengan LIMA kelas berbeda dan tiga jarak bawah yang
 * berbeda — `mb-4`, `mb-3`, dan tanpa jarak — dua di antaranya berada di
 * halaman yang sama. `globals.css` sudah menuliskan sendiri akibatnya untuk
 * radius, dan berlaku persis sama di sini: mata membaca "hampir" sebagai
 * kecerobohan jauh sebelum akal menemukan sebabnya.
 */
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-ink', className)} {...rest} />;
}

/**
 * Kepala kartu: judul, dan aksi opsional di sisi kanan.
 *
 * Dipakai DI DALAM `CardBody`, karena itu ia membawa jarak bawahnya sendiri.
 * Satu tempat yang memutuskan jarak itu adalah alasan seluruh kartu di aplikasi
 * ini akhirnya berbaris pada garis yang sama.
 *
 * `items-baseline`: judul dan tautan aksi punya ukuran teks berbeda (14px dan
 * 12px), dan menengahkannya secara vertikal membuat kedua garis dasarnya
 * meleset — selisih yang tidak pernah disadari tetapi selalu terbaca sebagai
 * tata letak yang longgar.
 */
export function CardHeader({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('mb-4 flex items-baseline justify-between gap-4', className)}>
      {title === undefined ? children : <CardTitle>{title}</CardTitle>}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
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
  const glowStyle = useMotionTemplate`radial-gradient(340px circle at ${glowX} ${glowY}, color-mix(in oklab, var(--color-holo) 14%, transparent), transparent 70%)`;

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
        'group relative overflow-hidden rounded-[var(--radius-xl)]',
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
