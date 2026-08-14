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

> **Flake CI yang ditemukan dan ditutup — 14 Agustus 2026.** Gerbang peramban
> di CI (`typography`, `render`) gagal dua commit berturut-turut dengan pesan
> "Chrome tidak pernah membuka target halaman", lalu HIJAU pada commit
> berikutnya yang hanya mengubah markdown. Kode sama persis, hasil berbeda.
>
> Sebabnya bukan gelung polling yang salah — itu sudah benar. Sebabnya
> ANGGARAN WAKTUNYA: 60 × 250ms = 15 detik, cukup di laptop panas, tidak cukup
> di runner dingin yang sambil menyalakan peladen Next. Kini 40 detik, sebagai
> konstanta bernama `MAKS_TARGET` di keenam skrip gerbang sekaligus.
>
> Kalau gerbang peramban gagal lagi dengan kalimat itu, periksa dulu apakah
> runnernya kehabisan waktu — bukan apakah kodenya rusak.

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
| V2 | selesai | b36893b | contrast hijau (2 tema) · palette hijau · akses 455/455 · interior hijau · alur hijau · 63 uji · build 0 | token hangat + terang jadi bawaan per-permukaan |
| V2b | selesai | ini | contrast hijau · akses 455/455 · interior hijau · alur hijau · 63 uji · build 0 | bilah sisi arang lewat `.kanvas-gelap`, nilainya dipinjam dari tema gelap yang sudah diaudit |
| V3 | selesai | ini | contrast hijau · palette hijau · akses 455/455 · interior hijau · alur hijau · 63 uji · build 0 | empat kartu sebaris, cincin anggaran, kartu tujuan. Pemilih rentang tanggal DITUNDA — lihat catatan |
| V4a–V4l | selesai | ini | contrast hijau · palette hijau · akses 455/455 · interior hijau · alur hijau · 63 uji · build 0 | **nol perubahan kode dibutuhkan** — lihat catatan di bawah |

### V4 tidak menuntut penulisan ulang, dan itu diperiksa bukan diasumsikan

Spesifikasi V4 sendiri memperkirakannya: *"penghangatan token plus sapuan
kartu — bukan penulisan ulang"*. Ternyata bahkan sapuan kartunya tidak perlu.

Kedua belas halaman dibangun di atas primitif yang sama (`Card`, `CardBody`,
`CardHeader`, `PageHeader`, `Stat`, `Button`) dan seluruhnya membaca token,
bukan nilai. Jadi begitu V2 menghangatkan token dan V2b menggelapkan bilah
sisi, kedua belasnya ikut — tanpa satu baris pun disentuh.

Seluruh dua belas DILIHAT satu per satu pada 1440px, bukan disimpulkan dari
tiga: transaksi, dompet, anggaran, tujuan, berulang, analitik, wawasan,
asisten, laporan, profil, keamanan, pengaturan. Tangkapan layarnya ada di
direktori kerja sesi.

Satu pertanyaan konsistensi muncul dan terjawab: dasbor kini memakai CINCIN
untuk anggaran sementara halaman Anggaran memakai BATANG. Itu bukan
ketidakkonsistenan — cincin menjawab "secara keseluruhan aman atau tidak"
(satu angka gabungan), batang menjawab "di mana persisnya" (per kategori).
Dua pertanyaan berbeda memang berhak atas dua bentuk berbeda.

Mengarang perubahan per halaman agar item ini terlihat dikerjakan akan
menambah risiko tanpa menambah nilai. Yang dikerjakan adalah pemeriksaannya.
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
| T1 | selesai | 4b48f3d | ronin 27/27 · grafis 13/13 | subjek diganti; loader, tier, fallback, parallax utuh |
| T2 | selesai | 4b48f3d | ronin 27/27 | Plan B — primitif dalam kode; nol berkas biner, nol risiko lisensi |
| T3 | selesai | 58d58bd, 5aac5ec | ronin 27/27 · palet bersih | fresnel dijepit + pangkat 5; bara, cincin kontak, torii |
| T4 | selesai | 5aac5ec | ronin 27/27 · akses 455/455 | tetikus, gulir, Enter/Spasi/sentuh; Escape menutup |
| T5 | selesai | 4b48f3d | ronin 27/27 | tebasan membuka angka contoh, diumumkan `aria-live`, DISEBUT contoh |
| T6 | todo | — | — | 3D dalam aplikasi: kecil, dapat dimatikan |
| R1 | selesai | 58d58bd | palet + kontras hijau | token Ronin jadi ungu `#a855ff` |
| R2–R6 | selesai | 5aac5ec | ronin 27 · akses 455 · grafis 13 · palet bersih | sode berlapis, kusazuri, maedate, menpō, hakama, jubah, daishō, katana melengkung, cincin kontak, torii, kamera 7,4→5,9 |
| T7 | selesai | ini | grafis 13/13 · akses 455/455 · interior hijau · alur hijau · typography 15/0 · render 39/0 · contrast hijau · palette hijau · 63 uji · build 0 | dibangun SEBELUM samurainya, sama seperti E1 sebelum desain ulang |

### Angka garis dasar grafis

| | terukur | ambang |
|---|---|---|
| laju bingkai tingkat `full` | 93 fps | ≥ 55 |
| bobot JavaScript halaman muka | 584 KB | langit 1100 KB + 15% |
| tingkat di 390px sentuh | `lite` | bukan `full` |
| gerak dikurangi | `off`, 0 kanvas, 6 bagian tercat | cadangan yang dirancang |
| WebGL diblokir | `off`, 9408 karakter tetap terbaca | menurun, tidak mengosong |

Perendernya dibaca lebih dulu; kalau perangkat lunak (SwiftShader di CI),
penegasan fps DILEWATI dengan mengatakannya — bukan diam-diam diluluskan.
| T8 | selesai | 5aac5ec | ronin 27/27 · grafis 13/13 | cadangan diam diwarnai ulang ke palet Ronin; kelabu titanium dibuang |
| T9 | todo | — | — | 3D tidak boleh merusak UI finansial |

### Dua hal yang HARUS diketahui sebelum melanjutkan Ronin

**R-V3 dipersempit menjadi penjaga regresi, dan ambangnya diturunkan 45 → 28.**
Empat ukuran piksel dicoba dan keempatnya gagal menangkap "rim light" dengan
sebab yang berbeda dan kini tercatat lengkap di `scripts/ronin.mjs`: dominasi
benda emisif, halo bloom yang menelan topeng siluet, jangkauan kecerahan perut
zirah yang bertumpang tindih dengan halo, dan — dibuktikan lewat sapuan ambang
— rim yang bukan kontur tertutup sehingga banjir topologis bocor masuk.
Sifat visualnya NYATA dan terlihat di tangkapan layar berturut; yang tidak ada
adalah statistik sebingkai yang andal pada skala ini. Angka 45 adalah tebakan
yang tidak pernah dikalibrasi dan tidak pernah dicapai rancangan mana pun; 28
diukur di antara fresnel membanjir (24,1%) dan yang sekarang (30,9%), dan
bukti merahnya diulang pada model terbaru. Penilaian rupa ada di titik henti
manusia — mesin menjaga agar tidak mundur, manusia menilai bagusnya.

**`alur` MERAH karena pencemaran data, bukan karena fiturnya.**
Fikstur CSV-nya memakai tanggal MUTLAK `14–17/08/2026`. Tiga dari empat
barisnya bertanggal masa depan, dan daftar transaksi urut menurun — jadi
puluhan jalan gerbang sebelumnya meninggalkan baris `Bonus …` bertanggal
16 Agu 2026 yang menempel permanen di puncak dan mengisi seluruh 25 baris
halaman pertama. Setiap transaksi baru terdorong keluar, termasuk milik alur
berulang. Impornya sendiri BEKERJA: unggahan kedua menemukan ketiga barisnya
sebagai duplikat.

Sumbernya sudah ditutup (tanggal kini dihitung mundur dari hari ini, dan baris
pembukti "hari-dulu" memilih tanggal lampau yang harinya ≤12 supaya
penafsiran bulan-dulu benar-benar mungkin). Baris lama TIDAK dihapus — data
tidak boleh dimusnahkan. Dua jalan tersisa, keputusan pengguna: (a) tunggu
sampai 17 Agu 2026 lewat, sesudah itu barisnya jatuh ke masa lalu dan berhenti
mendominasi; (b) ubah penegasan `alur` agar menyaring baris ber-`CAP`-nya
sendiri alih-alih memindai halaman pertama — lebih tahan, dan tidak bergantung
pada isi buku besar.

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

**V3 · pemilih rentang tanggal di dasbor — DITUNDA, bukan dilupakan.**

Mockup memperlihatkan pemilih "1 – 7 Mei 2025" di kepala dasbor. `GET
/v1/dashboard` tidak menerima parameter rentang apa pun; seluruh angkanya
dihitung untuk BULAN BERJALAN, dan itu tertanam di `service.ts`.

Memasang pemilihnya sekarang berarti memasang kontrol yang tidak mengubah satu
angka pun di bawahnya — kontrol palsu, yang jauh lebih buruk daripada tidak ada
kontrol. Yang dibutuhkan lebih dulu adalah pekerjaan API: `dashboard(deps,
userId, range)` beserta seluruh turunannya.

Dijadwalkan sebagai pekerjaan API tersendiri sesudah Langkah 4. Sampai itu ada,
kepala dasbor mengatakan apa adanya: "Ringkasan keuanganmu bulan ini."

## Tanda periksa git

| tanda | menandai |
|---|---|
| `pra-step1` | garis dasar terverifikasi sebelum program dimulai |
