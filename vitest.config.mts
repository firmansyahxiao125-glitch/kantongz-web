import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Runner uji aplikasi web.
 *
 * Cakupannya SEMPIT dan disengaja: hanya logika MURNI di bawah `src/lib`.
 * Komponen React tidak diuji di sini — merendernya menuntut lingkungan DOM
 * lengkap, dan yang benar-benar bisa salah pada komponen ini adalah tata letak
 * dan kontras, yang keduanya sudah dijaga gerbang lain (audit kontras di CI,
 * dan pemeriksaan Lighthouse aksesibilitas).
 *
 * Yang diuji di sini adalah fungsi yang salahnya TIDAK terlihat di layar
 * sampai terlambat: pembagian nol pada persentase uang, dan keputusan tingkat
 * grafis yang menentukan apakah bundel 341 KB diunduh ponsel.
 */
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
