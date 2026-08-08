import type { CSSProperties, ReactNode } from 'react';

/**
 * Gerak masuk — sebagai Server Component.
 *
 * ── MENGAPA BUKAN FRAMER MOTION LAGI ────────────────────────────────────
 *
 * Versi sebelumnya adalah `motion.div` dengan `whileInView`. Karena `'use
 * client'` menular ke SELURUH modul yang mengimpornya, satu pembungkus ini
 * membuat hampir setiap bagian halaman muka menjadi Client Component — dan
 * halaman yang isinya teks statis itu lalu dihidrasi seluruhnya di peramban.
 *
 * Biayanya diukur, bukan ditebak: `bootup-time` mencatat 791 ms evaluasi
 * skrip pada potongan kerangka kerja React, dan Total Blocking Time 1.103 ms.
 *
 * Yang di sini tidak mengirim satu byte JavaScript pun. Elemennya polos;
 * seluruh geraknya ada di `globals.css`, dan satu pengamat bersama di
 * `reveal-observer.tsx` yang menyalakannya.
 */

interface RevealProps {
  children: ReactNode;
  className?: string;
  /**
   * Urutan dalam kelompok — menghasilkan jeda berurutan, bukan serentak.
   *
   * Jeda 50 ms per langkah dipilih dengan alasan yang sama seperti sebelumnya:
   * di bawah itu mata membacanya sebagai serentak, di atas 90 ms daftar panjang
   * terasa lamban menunggu giliran.
   */
  index?: number;
}

/* `--i` dikirim lewat gaya sebaris karena ia BERBEDA per elemen. Itu satu
   properti kustom pada atribut `style`, bukan animasi — tidak ada yang perlu
   dijalankan peramban untuk membacanya. */
function order(index: number): CSSProperties | undefined {
  return index > 0 ? ({ '--i': index } as CSSProperties) : undefined;
}

/**
 * Muncul saat masuk viewport, SEKALI.
 *
 * Dipakai untuk yang ada di bawah lipatan. Elemen yang beranimasi ulang setiap
 * kali digulir melewatinya membuat halaman terasa gelisah, dan pada gulir cepat
 * ia terlihat berkedip — karena itu pengamat melepas targetnya setelah
 * pemunculan pertama, dan bukan `animation-timeline: view()` yang akan
 * membalik animasinya saat digulir naik.
 */
export function Reveal({ children, className, index = 0 }: RevealProps) {
  return (
    <div data-reveal="" className={className} style={order(index)}>
      {children}
    </div>
  );
}

/**
 * Muncul saat halaman dicat.
 *
 * Dipakai untuk yang ada di ATAS lipatan — hero. Isi yang sudah terlihat tidak
 * perlu menunggu pengamat memberitahu bahwa ia terlihat, dan menunggu berarti
 * isi paling penting di halaman ini bergantung pada JavaScript untuk muncul
 * sama sekali. Ini murni CSS, jadi ia berjalan bahkan pada muat pertama yang
 * skripnya masih dalam perjalanan.
 */
export function Rise({ children, className, index = 0 }: RevealProps) {
  return (
    <div data-rise="" className={className} style={order(index)}>
      {children}
    </div>
  );
}
