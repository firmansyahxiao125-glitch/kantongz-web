'use client';

import { useEffect } from 'react';

/**
 * Satu pengamat untuk seluruh halaman.
 *
 * Menggantikan satu instans `whileInView` PER ELEMEN yang dipasang Framer
 * Motion. Bedanya bukan gaya penulisan: yang lama menuntut setiap bagian
 * halaman menjadi Client Component supaya bisa memegang pengamatnya sendiri,
 * dan yang baru tidak menuntut apa pun dari mereka — mereka kembali menjadi
 * HTML statis, dan berkas ini satu-satunya yang dikirim ke peramban.
 *
 * Komponen ini TIDAK merender apa-apa. Ia hanya menyalakan atribut, dan CSS
 * yang mengerjakan sisanya.
 */
export function RevealObserver() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-reveal=""]');
    if (items.length === 0) return;

    const showAll = () => {
      for (const el of items) el.dataset.reveal = 'in';
    };

    /* Tanpa IntersectionObserver, isinya ditampilkan seluruhnya seketika.
       Halaman tanpa animasi tetap halaman; halaman yang isinya tidak pernah
       muncul adalah halaman kosong. */
    if (!('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          /* Dilepas begitu muncul. Inilah `once: true` yang lama: tanpa ini,
             elemen akan diamati seumur halaman tanpa satu pun alasan. */
          observer.unobserve(entry.target);
        }
      },
      {
        /*
         * Ambang NOL, dengan tepi bawah ditarik masuk 10%.
         *
         * `threshold: 0.2` — yang dipakai versi Framer — tidak pernah terpenuhi
         * oleh elemen yang lebih tinggi daripada layar: seperlima dari elemen
         * setinggi 1,5 layar tidak pernah terlihat sekaligus. Menggeser tepi
         * bawah memberi pemicu yang sama enaknya dan berlaku untuk SEMUA
         * tinggi elemen.
         */
        threshold: 0,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    for (const el of items) observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
