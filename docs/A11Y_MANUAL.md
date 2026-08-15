# A11Y_MANUAL — yang mesin TIDAK dapat membuktikan

> **STATUS: MENUNGGU MANUSIA. BELUM DIJALANKAN.**
>
> Berkas ini adalah daftar periksa, bukan laporan. Tidak satu pun kotak di
> bawah boleh dicentang oleh siapa pun yang tidak benar-benar menjalankannya
> dengan perangkat lunak yang disebut. Sampai itu terjadi, aksesibilitas
> KANTONGZ **terbukti sebagian** — dan mengatakannya "selesai" berdasarkan
> gerbang otomatis saja adalah klaim yang tidak dimiliki siapa pun di sini.

---

## Apa yang SUDAH terbukti otomatis

`scripts/akses.mjs` menjalankan 489 pemeriksaan pada 17 halaman × 2 lebar,
dengan penekanan Tab sungguhan lewat CDP. Yang dijaganya:

- setiap titik henti Tab punya nama yang dapat dibacakan
- penanda fokus benar-benar TERLIHAT (gayanya berubah saat difokus)
- nol `tabindex` positif
- tepat satu `<main>` dan satu `<h1>` yang terlihat per halaman
- heading tidak melompat tingkat
- setiap kontrol formulir punya label
- setiap `<img>` punya `alt`, setiap `<svg>` dan `<canvas>` punya peran
- urutan fokus tidak melompat jauh ke atas di dalam satu tengara
- dialog memindahkan fokus ke dalam, Escape menutup, fokus kembali ke pemicu
- nol luapan mendatar

`scripts/contrast.mjs` memverifikasi seluruh pasangan warna terhadap WCAG
2.1 AA, pada kedua tema.

## Mengapa itu tidak cukup

Alat otomatis memeriksa STRUKTUR. Ia tidak dapat memeriksa apakah struktur itu
MASUK AKAL ketika dibacakan. Sebuah tombol bernama "Tombol 3" lolos setiap
pemeriksaan di atas dan tetap tidak berguna bagi orang yang mendengarnya.

Yang di bawah ini hanya dapat dijawab manusia dengan perangkat lunaknya.

---

## 1. Pembaca layar — NVDA + Firefox (Windows)

- [ ] Halaman muka dibacakan berurutan tanpa satu bagian pun terlewat
- [ ] Panggung Ronin diumumkan sebagai satu tombol bernama, BUKAN sebagai
      kanvas atau sebagai deretan elemen kosong
- [ ] Menekan Tebas membuat angka contoh dibacakan lewat `aria-live`, dan kata
      "contoh" ikut terdengar
- [ ] Daftar transaksi dapat dijelajahi dengan mode tabel NVDA; setiap kolom
      punya header yang dibacakan
- [ ] Nominal uang dibacakan sebagai angka yang dapat dipahami, bukan digit
      satu per satu
- [ ] Dialog "Catat transaksi" mengumumkan dirinya saat terbuka
- [ ] Pesan galat formulir dibacakan SAAT muncul, bukan hanya saat difokus
- [ ] Peringatan "Perlu perhatian" di dasbor dibacakan dengan tingkatnya
      (bahaya/awas), bukan hanya teksnya

## 2. Pembaca layar — VoiceOver + Safari (macOS/iOS)

- [ ] Rotor menampilkan daftar heading yang masuk akal untuk setiap halaman
- [ ] Rotor menampilkan tengara: banner, navigation, main, contentinfo
- [ ] Gestur usap di iOS menjangkau seluruh kontrol tanpa ada yang terlewat
- [ ] Grafik dan cincin kemajuan punya deskripsi teks yang berarti, bukan
      "gambar"

## 3. Perbesaran dan teks besar

- [ ] Zoom peramban 200%: tidak ada teks terpotong, tidak ada gulir mendatar
- [ ] Zoom 400% pada 1280px: isinya menyusun ulang, tidak menghilang
- [ ] Ukuran font sistem dinaikkan ke maksimum di iOS/Android: tata letak
      tetap dapat dipakai
- [ ] Mode teks tebal sistem tidak merusak lebar kolom angka

## 4. Papan tik saja — tanpa tetikus sama sekali

- [ ] Seluruh tujuh tugas di `UX_SCRIPT.md` dapat diselesaikan
- [ ] Tautan "Lompat ke konten" muncul saat difokus dan benar-benar melompat
- [ ] Tidak ada jebakan fokus di mana pun, termasuk di dalam dialog
- [ ] Urutan Tab terasa masuk akal, bukan sekadar tidak melompat ke atas

## 5. Gerak dan warna

- [ ] `prefers-reduced-motion` menghentikan SELURUH gerak, bukan hanya
      adegan 3D
- [ ] Antarmuka tetap dapat dipahami dalam mode grayscale — tidak ada
      informasi yang HANYA disampaikan warna
- [ ] Diperiksa dengan simulator deuteranopia dan protanopia: sinyal
      naik/turun masih dapat dibedakan

## 6. Kognitif

- [ ] Tidak ada batas waktu yang tidak dapat diperpanjang
- [ ] Tindakan merusak selalu dapat dibatalkan atau menuntut konfirmasi
- [ ] Pesan galat menyebut APA yang salah dan APA yang harus dilakukan, bukan
      kode

---

## Cara mencatat hasilnya

Setiap kotak yang GAGAL ditulis di sini juga, dengan tanggal, perangkat lunak,
versinya, dan langkah persis untuk mengulangnya. Kegagalan yang dicatat adalah
hasil kerja; daftar centang penuh tanpa catatan adalah daftar yang tidak
pernah dijalankan.

Ketika seluruh daftar sudah dijalankan, ganti STATUS di puncak berkas ini
dengan tanggal, nama penguji, dan versi perangkat lunaknya — dan barulah
`docs/PROGRESS.md` boleh menandai E4 `selesai`.
