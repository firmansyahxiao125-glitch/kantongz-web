'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CoreMark } from '@/components/brand/core-mark';
import { cn } from '@/lib/cn';
import { NAV } from '@/lib/nav';
import { spring } from '@/lib/motion';

/**
 * Navigasi samping.
 *
 * Penanda halaman aktif adalah SATU elemen yang berpindah antar butir
 * (`layoutId`), bukan latar yang menyala dan padam di dua tempat. Perbedaannya
 * terlihat: yang satu terbaca sebagai satu objek yang bergerak, yang lain
 * sebagai dua lampu yang kebetulan bergantian.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/dasbor"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-2 py-1 text-[15px] font-semibold tracking-tight text-ink"
      >
        <CoreMark className="size-7" />
        KANTONGZ
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-dim">
              {group.label}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                        active ? 'text-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="sidebar-aktif"
                          transition={spring}
                          className="absolute inset-0 rounded-lg bg-[var(--surface-3)] ring-1 ring-[var(--line-strong)]"
                          aria-hidden
                        />
                      ) : null}
                      <Icon size={17} className="relative shrink-0" aria-hidden />
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
