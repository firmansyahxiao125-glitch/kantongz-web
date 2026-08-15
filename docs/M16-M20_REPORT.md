# M16–M20 — laporan penutup

Apa yang dikerjakan, apa yang dibuktikan, dan **apa yang belum**.

Definisi kelima tonggaknya ada di `kantongz/docs/ARCHITECTURE.md` §7.3.
Berkas ini melaporkan hasilnya terhadap definisi itu, dengan angka dan nama
berkas — bukan dengan kata sifat.

---

## Angka gerbang, pada saat laporan ini ditulis

| gerbang | hasil | yang dijaganya |
|---|---|---|
| `akses` | **489 lulus** | 17 halaman × 2 lebar, Tab sungguhan lewat CDP |
| uji satuan | **97 lulus** | aritmetika periode, jadwal, Ronin, kesehatan |
| `alur` | **hijau** | empat fitur dari ujung ke ujung, tanpa menulis dua kali |
| `grafis` | **22 lulus** | fps, bobot JS, anggaran model, saklar 3D, T9 |
| `ronin` | **28 lulus** | karakter tergambar DAN menanggapi |
| `render` | **39 lulus, 0 gagal** | kontrak keluaran halaman muka, 0 galat konsol |
| `interior` | hijau | satu judul, satu varian, nol kontrol hantu |
| `contrast` | hijau | seluruh pasangan WCAG 2.1 AA, dua tema |
| `palette` | bersih | nol warna lewat pintu belakang |
| `typography` | hijau | Inter dan JetBrains Mono benar-benar dirender |

---

## M16 — sistem visual dua permukaan

**Selesai.**

Permukaan publik gelap-sinematik; dalam-aplikasi terang-hangat. Batas itu
dijaga oleh palet, bukan oleh kebiasaan: ungu hanya milik permukaan publik,
kuningan hanya berarti uang di dalam aplikasi.

Temuan paling berguna di sini adalah yang TIDAK menuntut pekerjaan: dua belas
halaman interior tidak perlu satu baris pun diubah, karena seluruhnya membaca
token. Itu bukan kebetulan — itu hasil gerbang palet yang sudah lama berdiri.
Yang dikerjakan pemeriksaannya, bukan penulisan ulangnya.

Satu cacat ditemukan dan diperbaiki di sini: menghangatkan `--surface-3`
menjatuhkan empat pasangan kontras. Yang diperbaiki permukaannya, bukan warna
sinyal yang sudah disetel.

## M17 — aksesibilitas sebagai gerbang, bukan audit

**Selesai.**

`akses` menekan Tab sungguhan lewat CDP, bukan menghitung elemen fokusabel di
DOM — keduanya sering berbeda, dan yang berbeda itulah cacatnya.

Dua cacat nyata ditemukan sebelum satu piksel didesain ulang: dialog tidak
pernah memindahkan fokus ke dalam, dan halaman muka tidak punya `<main>` sama
sekali padahal tautan "Lompat ke konten" sudah ada sejak lama.

Kemudian satu regresi yang saya sebabkan sendiri ditangkapnya: tombol Tebas
`inset-0` setinggi 480px membuat urutan fokus melompat ke atas. Perbaikannya
memperbaiki rancangannya juga — tombol tak terlihat adalah tombol yang tidak
diketahui siapa pun.

Hitungan titik henti tercatat di `PROGRESS.md`, dengan dua angka yang diberi
catatan: `keamanan` melaporkan 100 karena itu BATAS penjelajahnya, bukan
hitungannya.

## M18 — 3D publik yang benar-benar interaktif

**Selesai.**

Karakternya kini aset berpahat, dimuat lewat pipeline produksi terukur:
26,80 MB → **2,90 MB** (9,2×), dengan angka per tahap tercatat di
`PROGRESS.md`. Sumber aslinya disimpan di `aset-sumber/` dan tidak pernah
dikirim ke peramban.

Interaksi yang dibuktikan gerbang: penunjuk (delta 143), hover diuji TERPISAH
tanpa gerakan tetikus (delta 530), klik (54,5% bingkai berubah), Enter, Spasi,
sentuh, gulir, Escape. Tiga tingkat grafis punya cadangan yang dirancang, dan
saklar pengguna membuat "mati" berarti **nol kanvas**, bukan sekadar
tersembunyi.

Jalan ke sini panjang dan salah beberapa kali. Yang paling menentukan: selama
shader-nya hanya fresnel, ia menggambar KONTUR dan tidak pernah menggambar
volume — dan tidak ada jumlah pelat yang bisa memperbaiki itu. Cahaya bentuk
yang menutupnya.

## M19 — dasbor yang memberi tahu, bukan sekadar menampilkan

**Selesai.**

Peringatan dan skor kesehatan diturunkan dari `DashboardSummary` yang sudah
ada — nol titik akhir API baru. Logikanya murni di `src/lib/kesehatan.ts`,
diuji sebagai aritmetika biasa (14 uji), dengan bukti merah dijalankan.

Satu keputusan produk dijaga uji: skor **turun** ketika belanja bertambah.
Gamifikasi yang memberi poin untuk transaksi menghadiahi pengeluaran, dan pada
aplikasi keuangan itu bukan cuma salah — itu berbahaya.

Lencana 3D dasbor dibuat **opt-in** setelah biayanya diukur: 389 → 624 KB,
+60% pada halaman yang dibuka setiap hari. Harganya tertulis di layar.

## M20 — ditutup dengan bukti, termasuk bukti yang belum ada

**Sebagian. Dan bagian yang belum dinyatakan apa adanya.**

Selesai: laporan ini, 18 tangkapan layar difoto ulang 15 Agustus 2026 di
`kantongz/docs/screenshots/`, dan `docs/UX_SCRIPT.md` berisi tujuh tugas
berbatas waktu.

**Belum: `docs/A11Y_MANUAL.md`.** Daftar periksanya ditulis; tidak satu kotak
pun dicentang. Alat otomatis memeriksa STRUKTUR — ia tidak dapat memeriksa
apakah struktur itu masuk akal ketika DIBACAKAN. Tombol bernama "Tombol 3"
lolos seluruh 489 pemeriksaan dan tetap tidak berguna bagi orang yang
mendengarnya.

Sampai daftar itu dijalankan dengan NVDA dan VoiceOver oleh manusia,
aksesibilitas KANTONGZ **terbukti sebagian**. Menyebutnya selesai berdasarkan
gerbang otomatis saja adalah klaim yang tidak dimiliki siapa pun di sini.

---

## Yang sengaja TIDAK dikerjakan, dan alasannya

**LOD mobile untuk aset 3D.** Arsitektur tingkat yang sudah ada tidak pernah
mengunduh three.js maupun GLB pada `lite`/`off` — ponsel mendapat komposisi
DOM. Menambah LOD kedua berarti aset yang tidak pernah diminta siapa pun.

**Merig ulang aset menjadi humanoid berangka.** Menuntut unggahan ke layanan
luar dan akun, atau pekerjaan Blender. Adaptor di `ronin-model.tsx` sudah
menerima GLB berangka: kalau versi yang dirig dikirim kelak, klipnya dipakai
otomatis dan jalur objeknya mati sendiri. Sampai itu terjadi, **tidak ada klaim
animasi kerangka di mana pun** — asetnya statis, dan digerakkan pada tingkat
objek oleh mesin keadaan yang sama.

**`unsafe-eval` untuk decoder Meshopt.** Ditolak. Decodernya tidak dipakai
sama sekali; melubangi kebijakan keamanan demi jalur kode mati adalah
pertukaran salah arah. Yang dimatikan decodernya.

---

## Sisa program

Langkah 7–10 belum dikerjakan: F1/F2/F5 (gambar struk, pulihkan dari ekspor,
akurasi OCR), G1/G2 (pengingat jatuh tempo, kategori otomatis), X1/F3/F4/G3/X2
(split transaksi, penghapusan sungguhan, dompet bersama — dengan uji
karakterisasi sebelum dan gerbang keamanan sesudah), dan H1 yang harus
**ditanyakan**, bukan diputuskan sendiri.
