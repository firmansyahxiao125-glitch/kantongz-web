/**
 * Tambalan tipis supaya `GLTFExporter` berjalan di Node.
 *
 * ── MENGAPA IA DIBUTUHKAN ──────────────────────────────────────────────
 *
 * `GLTFExporter` ditulis untuk peramban. Jalur binernya menyusun `Blob` lalu
 * membacanya kembali lewat `FileReader` — dan `FileReader` tidak ada di Node,
 * meskipun `Blob` ada sejak Node 18. Satu kelas hilang itulah satu-satunya
 * yang memisahkan "dapat mengekspor GLB di CI" dari "hanya dapat mengekspor
 * di dalam tab peramban".
 *
 * Yang ditambal SEDIKIT MUNGKIN: hanya `readAsArrayBuffer` dan
 * `readAsDataURL`, karena hanya itu yang dipanggil pengekspor. Tambalan yang
 * meniru seluruh spesifikasi FileReader akan lebih besar daripada yang
 * dipakai, dan setiap baris yang tidak dipakai adalah baris yang tidak
 * pernah diuji.
 *
 * Ia tidak menyentuh apa pun kalau lingkungannya sudah punya FileReader,
 * jadi berkas ini aman diimpor di mana saja.
 */

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReaderNode {
    constructor() {
      this.result = null;
      this.onloadend = null;
      this.onerror = null;
    }

    #selesai(janji, ubah) {
      janji
        .then((nilai) => {
          this.result = ubah(nilai);
          this.onloadend?.();
        })
        .catch((galat) => {
          if (this.onerror) this.onerror(galat);
          else throw galat;
        });
    }

    readAsArrayBuffer(blob) {
      this.#selesai(blob.arrayBuffer(), (b) => b);
    }

    readAsDataURL(blob) {
      this.#selesai(
        blob.arrayBuffer(),
        (b) => `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`,
      );
    }
  };
}
