import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Penggabung kelas.
 *
 * `twMerge` di luar `clsx` bukan kelebihan: tanpa itu, kelas yang diteruskan
 * pemanggil tidak pernah bisa mengalahkan kelas bawaan komponen — `p-6` dari
 * luar akan berdampingan dengan `p-4` dari dalam, dan yang menang ditentukan
 * urutan di berkas CSS, bukan niat pemanggil.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
