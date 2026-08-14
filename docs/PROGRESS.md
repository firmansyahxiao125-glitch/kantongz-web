# PROGRESS — program KANTONGZ M16–M20

Tulang punggung program ini. Dibaca lebih dulu di setiap sesi, ditulis sesudah
setiap item, dan di-commit bersama pekerjaannya sendiri supaya ia tidak pernah
berselisih dengan repositori.

## Cara membacanya

`status` salah satu dari: `todo` · `berjalan` · `selesai` · `dikembalikan` · `terhalang`

- **`selesai` menuntut angka gerbang tertulis di barisnya.** Tanpa angka, ia
  bukan selesai — ia hanya terasa selesai.
- **`terhalang` menuntut satu kalimat** yang menyebut persis apa yang
  menghalanginya. Item terhalang yang dicatat jujur adalah hasil kerja; repo
  yang diam-diam rusak bukan.
- Kolom `commit` bertuliskan `ini` berarti barisnya ikut di dalam commit yang
  menuntaskannya. Itu satu-satunya cara baris dan pekerjaannya tidak pernah
  terpisah — hash tidak dapat ditulis ke dalam commit yang belum ada.

## Protokol lanjut sesi

1. Baca berkas ini.
2. Jalankan seluruh gerbang, pastikan garis dasar di bawah masih berdiri.
3. Lanjutkan dari baris pertama yang belum `selesai`. Jangan pernah mengulang
   yang sudah `selesai`.

## Garis dasar

Diverifikasi 14 Agustus 2026, pada `kantongz-api@6970cda` dan `kantongz-web@1a0d584`.
Turun di bawah angka mana pun di sini adalah regresi.

| | |
|---|---|
| api | 455 uji · typecheck 0 · lint 0 |
| web | 63 uji · typecheck 0 · lint 0 · build 0 |
| gerbang | interior hijau · alur hijau · security 21/21 · palette 4/4 · contrast hijau |
| CI | hijau di ubuntu-latest, kedua repositori, termasuk pekerjaan `keamanan` |

> Catatan verifikasi: `security` sempat gagal pada jalanan pertama sesi ini.
> Penyebabnya BUKAN kode — sebuah proses API liar di porta 3999, sisa uji CI
> sebelumnya, berbagi basis data yang sama dengan bahan kunci yang berbeda.
> Sesudah dimatikan: 21 lulus, 0 gagal. Kalau gerbang email gagal tanpa sebab
> yang jelas, periksa dulu apakah ada instans API kedua yang masih hidup.

---

## Langkah 1 — gerbang aksesibilitas lebih dulu

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| E1 | selesai | ini | akses 455/455 · interior hijau · alur hijau · contrast hijau · palette hijau · 63 uji · build 0 | 2 cacat nyata ditemukan dan diperbaiki — lihat di bawah |

### Yang ditemukan E1, dan diperbaiki

1. **Dialog tidak pernah memindahkan fokus ke dalam.** `dialog.tsx` baris 17
   menjanjikannya sejak ditulis; kodenya hanya mengerjakan separuh pulangnya.
   Pengguna papan tik yang membuka dialog tetap tertinggal fokusnya di tombol
   pembuka, dan harus menyeberangi seluruh halaman di belakang untuk mencapai
   formulir yang baru saja ia minta. Diperbaiki: panel difokus saat terbuka
   (`tabIndex={-1}`, jadi tidak menambah perhentian Tab), `autoFocus` yang lebih
   spesifik tetap dihormati.

2. **Halaman muka tidak punya `<main>` sama sekali.** Tautan "Lompat ke konten"
   sudah ada sejak lama dan menunjuk ke sebuah `<section>`. Pembaca layar yang
   melompat antar-tengara menemukan header, nav, sebelas section, dan footer —
   tanpa satu pun yang berkata "isi halamannya mulai di sini". Diperbaiki:
   `<main id="konten">` membungkus isinya, `id` pindah ke tengara sungguhan.

### Hitungan titik henti Tab — garis dasar

Halaman yang angkanya berubah kelak adalah halaman yang strukturnya berubah.

| halaman | lebar | ponsel | | halaman | lebar | ponsel |
|---|---|---|---|---|---|---|
| muka | 26 | 19 | | analitik | 21 | 8 |
| masuk | 9 | 9 | | wawasan | 39 | 26 |
| daftar | 11 | 11 | | asisten | 26 | 13 |
| pulihkan | 6 | 6 | | laporan | 23 | 10 |
| dasbor | 26 | 13 | | profil | 21 | 8 |
| transaksi | 73 | 60 | | keamanan | 84 | 71 |
| dompet | 22 | 9 | | pengaturan | 22 | 9 |
| anggaran | 25 | 12 | | | | |
| tujuan | 25 | 12 | | | | |
| berulang | 41 | 28 | | | | |

## Langkah 2 — sistem visual: dua permukaan

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| V1 | todo | — | — | permukaan publik: landing + masuk + daftar + pulihkan |
| V2 | todo | — | — | token permukaan dalam-aplikasi, terang jadi bawaan |
| V3 | todo | — | — | dasbor — **titik henti manusia Y5 #2** |
| V4a | todo | — | — | transaksi |
| V4b | todo | — | — | dompet |
| V4c | todo | — | — | anggaran |
| V4d | todo | — | — | tujuan |
| V4e | todo | — | — | berulang |
| V4f | todo | — | — | analitik |
| V4g | todo | — | — | wawasan |
| V4h | todo | — | — | asisten |
| V4i | todo | — | — | laporan |
| V4j | todo | — | — | profil |
| V4k | todo | — | — | keamanan |
| V4l | todo | — | — | pengaturan |
| V5 | todo | — | — | layar sambutan mobile: luapan mendatar ke NOL + max-width |
| V6 | selesai | ini | dokumen saja — tidak ada gerbang yang tersentuh | ROADMAP §7.1 di repo `kantongz`; §7 utuh, tidak dihapus |

> Halaman pertama yang selesai adalah **titik henti manusia Y5 #1** — ia
> menetapkan arah untuk lima belas sisanya.

> **Urutan di dalam Langkah 2 disesuaikan, dan ini alasannya.** V1 (permukaan
> publik) dikerjakan BERSAMA Langkah 3, bukan sebelum Langkah 2. Keduanya
> berbagi satu bahasa visual yang sama — gelap, sinematik, digerakkan 3D — dan
> mengerjakan halaman muka lebih dulu berarti menatanya dua kali: sekali untuk
> warnanya, sekali lagi ketika samurainya mendarat.
>
> Urutan yang dijalankan: **V2 → V3 → V4a…V4l → (Langkah 3 + V1 + V5)**.
> Dasbor karena itu menjadi halaman pertama yang didesain ulang, dan ia memang
> yang paling menentukan arah — ia juga sudah menjadi titik henti Y5 #2.

## Langkah 3 — 3D publik "Ronin"

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| T1 | todo | — | — | ganti SUBJEKNYA saja; pertahankan loader, tier, fallback, parallax |
| T2 | todo | — | — | aset: Plan A (CC0) atau Plan B (primitif dalam kode) |
| T3 | todo | — | — | pencahayaan: siluet, rim, emisif, fresnel, bara, kabut |
| T4 | todo | — | — | mouse · scroll · TEBASAN (tetikus DAN papan tik) — **titik henti Y5 #3** |
| T5 | todo | — | — | terikat data, bukan dekorasi |
| T6 | todo | — | — | 3D dalam aplikasi: kecil, dapat dimatikan |
| T7 | todo | — | — | `npm run grafis` — anggaran fps diukur, bukan diharapkan |
| T8 | todo | — | — | tingkat `off` mendapat komposisi diam yang dirancang |
| T9 | todo | — | — | 3D tidak boleh merusak UI finansial |

## Langkah 4 — tambahan dasbor

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| W1 | todo | — | — | pusat notifikasi |
| W2 | todo | — | — | kisi aksi cepat |
| W3 | todo | — | — | sampul tujuan (tanpa foto stok) |
| W4 | todo | — | — | gamifikasi — XP untuk kesehatan keuangan, bukan belanja |

## Langkah 5 — validasi manusia

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| E2 | todo | — | — | penjelajahan papan tik, hitungan tab-stop per halaman |
| E3 | todo | — | — | `docs/UX_SCRIPT.md`, tujuh tugas berbatas waktu |
| E4 | todo | — | — | `docs/A11Y_MANUAL.md` — menunggu manusia, jangan diklaim selesai |

## Langkah 6 — menutup M16–M20

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| D1 | todo | — | — | definisikan M16–M20 satu per satu |
| D2 | todo | — | — | `docs/M16-M20_REPORT.md` |
| D3 | todo | — | — | 18 tangkapan layar difoto ulang |

## Langkah 7 — penutupan celah yang aman

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| F1 | todo | — | — | simpan gambar struk, buang EXIF |
| F2 | todo | — | — | pulihkan dari ekspor |
| F5 | todo | — | — | ukur akurasi OCR, ≥40 struk sintetis |

## Langkah 8 — fitur murah bernilai tinggi

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| G1 | todo | — | — | pengingat jatuh tempo, idempoten |
| G2 | todo | — | — | kategori otomatis dari merchant — menyarankan, tidak memutuskan |

## Langkah 9 — tiga yang berisiko, paling akhir

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| X1 | todo | — | — | uji karakterisasi SEBELUM F3 dan G3 |
| F3 | todo | — | — | split transaksi — JANGAN buang `category_id` |
| F4 | todo | — | — | penghapusan sungguhan — mati secara bawaan |
| G3 | todo | — | — | dompet bersama — satu penyelesai, gagal-tertutup |
| X2 | todo | — | — | gerbang keamanan sesudah F3 dan G3, IDOR tak berubah |

## Langkah 10 — satu keputusan

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| H1 | todo | — | — | PWA atau paritas Expo — TANYAKAN, jangan memilih sendiri |

---

## Yang terhalang

Belum ada.

## Tanda periksa git

| tanda | menandai |
|---|---|
| `pra-step1` | garis dasar terverifikasi sebelum program dimulai |
