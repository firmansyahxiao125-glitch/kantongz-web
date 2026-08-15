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

### E2 — hitungan titik henti Tab, per halaman

Halaman yang angkanya berubah kelak adalah halaman yang strukturnya berubah.
Diukur `scripts/akses.mjs` dengan penekanan Tab SUNGGUHAN lewat CDP, bukan
dengan menghitung elemen fokusabel di DOM — keduanya sering berbeda, dan yang
berbeda itulah cacatnya.

| halaman | lebar | ponsel | | halaman | lebar | ponsel |
|---|---|---|---|---|---|---|
| muka | 27 | 20 | | analitik | 21 | 8 |
| masuk | 9 | 9 | | wawasan | 58 | 45 |
| daftar | 11 | 11 | | asisten | 26 | 13 |
| pulihkan | 6 | 6 | | laporan | 23 | 10 |
| dasbor | **35** | **22** | | profil | 21 | 8 |
| transaksi | 73 | 60 | | keamanan | **≥100** | **≥100** |
| dompet | 22 | 9 | | pengaturan | 25 | 12 |
| anggaran | 25 | 12 | | | | |
| tujuan | 25 | 12 | | | | |
| berulang | 86 | 73 | | | | |

**Dua angka menuntut catatan, dan keduanya ditulis apa adanya.**

`keamanan` melaporkan 100 di kedua lebar, dan itu BUKAN hitungan sebenarnya
melainkan BATAS penjelajahnya (`Math.min(perkiraan + 6, 100)`). Angka
sesungguhnya ≥100. Menuliskannya sebagai "100" akan menjadikan batas alat ukur
sebagai fakta tentang halaman — persis jenis kesalahan yang berkas ini ada
untuk mencegahnya. Halaman itu memang panjang: setiap sesi aktif menyumbang
tombol "Akhiri sesi" sendiri.

`dasbor` naik 26 -> 35 (lebar) dan 13 -> 22 (ponsel) pada langkah W1–W4: enam
pintasan aksi cepat ditambah hingga empat tautan peringatan. Kenaikan itu
DIHARAPKAN dan dicatat di sini supaya kenaikan berikutnya yang TIDAK
diharapkan langsung terlihat.

Seluruh angka disertai penegasan yang lebih keras daripada hitungannya
sendiri: setiap titik henti punya nama yang dapat dibacakan, punya penanda
fokus yang terlihat, tidak ada `tabindex` positif, dan urutannya tidak
melompat jauh ke atas di dalam satu tengara.

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
| V5 | selesai | b113caf | akses 489/489 | luapan mendatar dijaga di 17 halaman x 2 lebar, bukan diperiksa sekali |
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
| T6a | selesai | ini | grafis 19/19 · akses 489 | saklar "Efek 3D" di Pengaturan — mati berarti NOL kanvas |
| T6b | selesai | ini | grafis 22/22 · akses 489 | lencana 88px di dasbor — OPT-IN, bawaannya mati |
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
| T9 | selesai | ini | grafis 22/22 | 8 blok finansial dibandingkan, identik dengan 3D nyala vs mati |

### R13 — karakter pindah ke GLB humanoid berangka

| id | status | commit | gerbang | catatan |
|---|---|---|---|---|
| R13 | selesai | ini | akses 455 · grafis 14 · palet bersih · 83 uji · ronin 27/27 | humanoid GLB + animasi + kabuto berpahat; R-V3 dikalibrasi ulang |

Pipeline GLB DIBUKTIKAN dua arah sebelum satu baris karakter ditulis:
`GLTFLoader` dan `GLTFExporter` keduanya terpasang (three 0.185), `useGLTF` /
`useAnimations` ada di drei 10.7.8, dan ekspor GLB berjalan headless di Node
sesudah `FileReader` ditambal (`scripts/aset/node-gltf.mjs`).

**Batasan aset, dinyatakan sebelum memilih.** Repositori tidak punya satu pun
`.glb/.gltf/.fbx/.vrm`. Aset berbayar di luar anggaran; biner pihak ketiga
menuntut izin unduh dan verifikasi lisensi, dan berkas biner yang tidak dapat
diperiksa dalam diff melanggar nilai yang sudah dinyatakan berkas adegan ini
sejak awal. Jalan yang dipilih: GLB DIBANGUN dari sumber terbaca
(`scripts/aset/bangun-ronin.mjs`), sehingga yang di-commit tetap dapat
di-diff dan GLB-nya menjadi keluaran seperti bundel JavaScript.

Rangkanya sungguhan: pinggul, perut, dada, leher, kepala, dua bahu, dua lengan
berlengan-bawah dan telapak, dua paha, dua betis, dua telapak kaki. Tinggi 2,4
satuan = 7,5 kepala. Dua klip glTF: `diam` (4s) dan `tebas` (0,95s).

Yang paling menentukan bukan jumlah bagian melainkan CAHAYA BENTUK. Selama
shader-nya hanya fresnel, ia menggambar kontur dan tidak pernah menggambar
volume — dan sosok tanpa volume terbaca sebagai manekin kawat berapa pun pelat
yang ditambahkan. Setengah-Lambert berpangkat 3,2 dengan sorot spekular
per-bahan yang menutup jarak itu.

**Anggaran baru: `LANGIT_MODEL_KB = 280`.** Ketika karakternya pindah dari
primitif ke `public/ronin.glb`, beratnya berpindah ke kelas aset yang TIDAK
diukur gerbang mana pun — bundelnya justru mengecil dan 212 KiB masuk tanpa
satu pemeriksaan pun menyentuhnya. Gerbang yang membaik ketika beban bertambah
adalah gerbang yang berbohong, jadi kelas asetnya diberi anggarannya sendiri.

**R-V3 dikalibrasi ulang: penjaganya pindah statistik, bukan diturunkan.**

Ambang lama (gelap >= 28) dikalibrasi terhadap komposisi lama — sosok
prosedural kecil yang mengisi seperenam bingkai, disinari rim saja.
Komposisinya kini berubah total, dan pada sosok yang mengisi bingkai hampir
setiap piksel tubuh berada di atas ambang "gelap", sehingga ember itu cuma
menangkap pinggiran latar.

Yang menentukan bukan dugaan itu melainkan pengukuran keduanya pada komposisi
BARU:

| | `gelapPersen` | `terangPersen` |
|---|---|---|
| membanjir (uBentuk penuh, fresnel tanpa jepitan) | 14,1% | **42,0%** |
| benar | 16,0% | **33,9%** |
| pemisahan | 1,9 poin — buta | **8,1 poin — nyata** |

`gelapPersen` terbukti tidak peka terhadap hal yang dijaganya, jadi ia turun
status menjadi keterangan saja. Penjaganya pindah ke batas ATAS
`terangPersen` pada 38 — di antara kedua pengukuran dengan sisa di kedua
sisi. Arahnya masuk akal dan itulah sebabnya ia bekerja: permukaan yang
membanjir MENAMBAH piksel terang, bukan mengurangi piksel gelap — bagian yang
tadinya gelap tidak hilang, ia hanya tertimbun.

Bukti merah-sebelum-hijau dijalankan pada model terbaru, bukan diwarisi.
`ronin` kembali 27/27.

### W1–W4 — empat tambahan dasbor, nol titik akhir API baru

Setiap sinyal yang dibutuhkan sudah ada di `DashboardSummary`. Menambah
endpoint untuk menghitung ulang hal yang sudah dikirim berarti dua tempat yang
harus sepakat, dan dua tempat selalu berselisih pada akhirnya.

Logikanya murni di `src/lib/kesehatan.ts` — tanpa React, tanpa jaringan, tanpa
jam; waktu disuntikkan sebagai argumen. 14 uji baru, dan bukti merahnya
dijalankan: merusak arah laju menabung dan menggeser ambang 0,85 -> 0,80
menjatuhkan 3 uji sekaligus.

**W4 menjaga satu keputusan produk secara eksplisit.** Gamifikasi yang memberi
poin untuk TRANSAKSI menghadiahi pengeluaran — makin sering belanja, makin
tinggi angkanya. Pada aplikasi keuangan itu bukan cuma salah, itu berbahaya.
Keempat komponennya hanya membaik ketika uang penggunanya membaik: anggaran
dihormati, laju menabung, kemajuan tujuan, arus kas positif. Ada uji yang
menegaskannya, dan uji itu MERAH kalau arahnya dibalik.

Skornya selalu dirinci. Angka tunggal tidak dapat ditindaklanjuti: orang yang
melihat "62" tidak tahu apa yang harus diubah.

**W1 menyaring, bukan menumpahkan.** Anggaran ditandai pada 85% — bukan 90%,
karena pada 90% sebagian besar orang sudah tidak punya ruang mengubah apa pun,
dan peringatan yang datang terlambat hanya menambah rasa bersalah tanpa
menambah pilihan. Tujuan hanya disebut kalau TERTINGGAL LAJU; menandai setiap
tujuan yang belum selesai akan melatih orang mengabaikan seluruh daftarnya.

**W3 menolak foto stok atas tiga alasan.** Lisensi yang harus dijaga selamanya;
berat yang mengalahkan seluruh anggaran halaman dikalikan jumlah tujuan; dan
yang paling menentukan — kejujuran. Foto pantai di atas tujuan bernama "Dana
darurat" menjanjikan sesuatu yang bukan miliknya. Sampulnya dihitung dari `id`
lewat hash, jadi tujuan yang sama selalu mendapat sampul yang sama.

### `alur` hijau penuh — pencemaran CSV akhirnya tertutup

Penegasan impor membaca `innerText` sekali sesudah impor dan menyimpulkan
barisnya tidak masuk kalau tidak ketemu. Itu benar hanya selama buku besarnya
pendek — dan akun uji SELALU terisi, itulah gunanya. Dua puluh lima baris
pertama berhenti memuat yang baru diimpor, dan gerbangnya melaporkan kegagalan
pada impor yang berhasil sempurna.

Buktinya bahkan sudah ada di pemeriksaan sesudahnya: unggahan kedua menemukan
ketiga barisnya sebagai duplikat. Dua penegasan yang berselisih tentang data
yang sama berarti salah satu mengukur hal yang salah.

Kini "Muat lebih banyak" ditekan sampai penandanya muncul, dengan batas keras.

### T6b + T9 — lencana dasbor, dan biayanya diukur sebelum diputuskan

Lencana 88 piksel di samping judul Dasbor: ikosahedron kuningan berputar
lambat, tanpa pascaproses, tanpa partikel. Warnanya KUNINGAN bukan ungu —
ungu identitas permukaan publik, dan kuningan sudah punya arti tetap di dalam
aplikasi: uang.

**Ia OPT-IN, dan itu keputusan yang diambil dari angka.** Diukur sebelum dan
sesudah:

| | JavaScript dasbor | potongan three/fiber/drei |
|---|---|---|
| sebelum | 389 KB | 0 |
| sesudah (lencana hidup) | **624 KB** | 1 |
| selisih | **+235 KB (+60%)** | |

Di halaman muka biaya seperti itu wajar: permukaan publik memang menjual, dan
pengunjung datang sekali. Dasbor dibuka setiap hari, sering di jaringan yang
mahal, untuk membaca angka uang sendiri. Memasangnya secara bawaan berarti
setiap pengguna membayar hiasan yang tidak pernah ia minta — untuk 88 piksel
yang tidak menyampaikan satu informasi pun.

Jadi pilihannya menjadi tiga, dengan harganya tertulis di layar:
**Mati** (gambar diam di mana pun) · **Otomatis** (halaman muka saja —
bawaan) · **Penuh** (termasuk lencana dasbor, +235 KB).

Cadangannya cakram kuningan bergradien berukuran SAMA PERSIS. Tata letak yang
bergeser di sebelah angka uang jauh lebih buruk daripada tidak ada lencana.

**T9 membuktikannya, dan tidak dengan tangkapan layar.** Yang dibandingkan
teks DAN kotak batas setiap blok finansial di dasbor, dengan lencana mati lalu
hidup: 8 blok, identik. Perbandingan piksel akan gagal karena lencananya
memang berbeda — dan itu satu-satunya yang boleh berbeda.

Gerbangnya juga memeriksa bahwa bawaannya benar-benar NOL kanvas di dalam
aplikasi. Opt-in yang diam-diam menyala bukan opt-in.

### T6a — saklar efek 3D, dan mengapa ia berdiri terpisah dari deteksi

`detectTier` menjawab "sanggupkah perangkat ini". Ia tidak pernah dapat
menjawab "maukah orangnya" — dan keduanya sering berlawanan: mesin yang
sanggup tetap boleh dimiliki seseorang yang baterainya tinggal sedikit,
tetheringnya mahal, atau terganggu oleh gerak tanpa menyalakan
`prefers-reduced-motion` di tingkat sistem.

Disimpan di `localStorage`, bukan di server: ia sifat PERANGKAT, bukan sifat
akun. Yang mematikannya di ponsel tua belum tentu mau mematikannya di desktop.

Dibaca lewat `useSyncExternalStore`, bukan `useState` + `useEffect`. Yang
kedua membaca `localStorage` di dalam efek lalu memanggil `setState` seketika
— satu render tambahan tiap pemuatan, dan pola yang lint repositori ini tolak
dengan benar. `localStorage` memang keadaan yang hidup DI LUAR React.

Gerbangnya memeriksa NOL KANVAS, bukan nol piksel: saklar yang hanya
menyembunyikan adegan tanpa membatalkan unduhannya bukan saklar — ia tetap
membakar baterai dan kuota yang justru ingin dihemat. Terbukti penuh -> off ->
0 kanvas -> cadangan tetap tergambar dan dapat ditekan -> kembali penuh.

**T6b belum dikerjakan, dan alasannya diukur.** Halaman aplikasi saat ini
tidak memuat three.js sama sekali. Menaruh 3D di dalamnya berarti setiap
pembukaan dasbor membayar bundel itu, pada permukaan yang ROADMAP §7.1
tetapkan tenang dan terang-hangat. Ia akan dikerjakan sebagai aksen KECIL yang
dimuat malas dan hanya pada tingkat `full`, dengan T9 membuktikan angka dan
tata letak finansialnya tidak bergeser sedikit pun antara 3D nyala dan mati.

### R15 — sumber model diganti aset berpahat, dengan pipeline produksi

| id | status | commit | gerbang | catatan |
|---|---|---|---|---|
| R15 | selesai | ini | ronin 28 · akses 455 · render 39 · grafis 14 · contrast · palet · interior · typography · 83 uji | aset pengguna, 26,8 MB -> 2,90 MB |

**Sumber tetap aman.** `aset-sumber/ronin-sumber.glb` menyimpan GLB mentah apa
adanya dan TIDAK pernah dikirim ke peramban. Yang disajikan hasil
`scripts/aset/olah-glb.mjs`.

**Audit sumber (`scripts/aset/periksa-glb.mjs`):** 26,80 MB · 557.421 segitiga
· 0 skin · 0 klip animasi · 1 material PBR (baseColor + normal + metalRough,
3 tekstur 2048²).

**Pengurangan terukur, per tahap:**

| tahap | sebelum | sesudah | faktor |
|---|---|---|---|
| tekstur 2048² -> 1024² | 8,98 MB | 0,56 MB | 16× |
| geometri (gugus kisi 0,022) | 557.421 tri | 58.921 tri | 9,5× |
| indeks uint32 -> uint16 | 4 B | 2 B | 2× |
| **total** | **26,80 MB** | **2,90 MB** | **9,2×** |

Sapuan kisi diukur, bukan ditebak: 0,010 -> 180k tri / 7,03 MB · 0,016 -> 92k /
4,25 MB · **0,022 -> 59k / 2,83 MB** · 0,030 -> 39k / 2,27 MB.

**LOD mobile TIDAK dibuat, dan itu keputusan bukan kelalaian.** Arsitektur tier
yang sudah ada tidak pernah mengunduh three.js maupun GLB pada `lite`/`off` —
ponsel mendapat komposisi DOM. Menambah LOD kedua berarti aset yang tidak
pernah diminta siapa pun.

**Anggaran dinaikkan 280 -> 3200 KiB, dengan dasar tertulis.** 280 benar untuk
model yang dibangun dari primitif dan tidak pernah realistis untuk aset
berpahat bertekstur. Yang dikerjakan lebih dulu MENGURANGI (9,2×), bukan
melonggarkan. Yang membuatnya dapat diterima bukan besarnya melainkan siapa
yang membayarnya: hanya tingkat `full`, di belakang `DeferUntilIdle`, sesudah
halaman dapat dipakai. Terukur sesudahnya: 179 fps, bobot JS tidak bergerak.

**Gerbangnya sendiri diperbaiki lebih dulu.** Ia memeriksa `public/ronin.glb`
— nama yang benar ketika ditulis, dan diam-diam salah begitu aset produksinya
berganti nama. Ia melaporkan 166 KiB dengan lapang sementara yang diunduh 2,9
MB. Kini ia mengukur SELURUH `.glb` di `public/`.

### Animasi: pilihan A, dan alasannya

Aset ini **tidak punya skeleton dan tidak punya klip animasi**. Itu tidak
diklaim sebaliknya di mana pun.

Pilihan **A** diambil: karakter statis, digerakkan pada tingkat OBJEK oleh
mesin keadaan yang sudah ada (`lib/ronin.ts`) — badan memuntir, condong,
tersentak pada tebasan, ditambah hover, parallax penunjuk, gulir, dan guncangan
kamera. Seluruh interaksi yang sudah terbukti tetap bekerja karena sumber
kebenarannya tidak berubah.

**B (merig ulang) tidak dikerjakan** karena tidak dapat dilakukan dengan
perkakas yang ada: auto-rigger menuntut unggahan ke layanan luar dan akun, dan
merig manual 557k segitiga adalah pekerjaan Blender, bukan pekerjaan repositori
ini. Pipeline-nya sudah menerima GLB berangka — kalau kelak dikirim versi yang
sudah dirig, adaptor di `ronin-model.tsx` memakai klipnya secara otomatis dan
jalur objek dimatikan sendiri.

### Dua galat CSP, dan mengapa keduanya berbeda

**Ditolak:** `unsafe-eval` untuk decoder Meshopt berbasis WASM. Decoder itu
tidak dipakai sama sekali — asetnya tidak dikompresi Draco maupun Meshopt —
jadi melubangi kebijakan demi jalur kode mati adalah pertukaran salah arah.
Yang dimatikan decodernya.

**Diterima:** `blob:` pada `img-src` DAN `connect-src`. `GLTFLoader` menyerahkan
tekstur tertanam sebagai URL blob, dan `ImageBitmapLoader` MENGAMBILNYA dengan
`fetch` — yang diatur `connect-src`, bukan `img-src`. Mengizinkan satu saja
membuat gambarnya dapat dipasang tetapi tetap tidak dapat diambil. Jejaknya
menyesatkan: pesannya "Couldn't load texture" menunjuk URL blob yang pada detik
yang sama terbukti dapat diurai — `createImageBitmap` atasnya mengembalikan
1024x1024. Yang gagal pengambilannya, bukan penguraiannya. Lingkupnya sempit:
URL blob hanya dapat dibuat skrip origin ini dari byte yang sudah ada di origin
ini, dan tidak dapat menunjuk host mana pun di luar.

### R-V1 ditulis ulang terhadap karakter final

"Tanda tangan caping" menjaga elemen desain yang sudah dua kali diganti.
Sekarang: **bahu lebih lebar dari kepala** — sifat yang berlaku untuk setiap
sosok manusia dan tidak untuk gumpalan. Diukur pada piksel terang di pita
tengah supaya lingkungan tidak ikut terhitung. Terukur 151px / 26px = 5,81×
terhadap ambang 1,5.

### R7 + R8 — hero tiga kolom dan kartu angka

| id | status | commit | gerbang | catatan |
|---|---|---|---|---|
| R7+R8 | selesai | ini | ronin 28 · akses 455 · render 39 · grafis 14 · contrast · palet · interior · 83 uji | copy kiri · Ronin tengah · kartu kanan |

Keadaan `terbuka` TURUN, bukan naik. Kartunya harus tahu kapan tebasan
membukanya, dan cara paling langsung — mengangkatnya ke `page.tsx` — tidak
dapat dipakai: halaman muka adalah komponen peladen, dan satu `useState` di
sana mengubah SELURUH halaman menjadi klien, termasuk elemen LCP-nya. Jadi
dibuat satu komponen klien kecil (`hero-ronin.tsx`) yang membungkus panggung
dan kartunya saja.

Kartunya selalu terlihat, hanya samar sebelum ditebas. Menyembunyikannya
sampai ditebas akan membuat tebasan terasa berarti — dan membuat pengunjung
yang tidak pernah menebas melihat kolom kosong lalu menyimpulkan halamannya
rusak.

### Empat cacat yang ditemukan mengerjakan R7, semuanya di luar dugaan

**1. Judul MELUAP menimpa Ronin.** `--text-display` memakai `vw`, dan itu
benar selama judulnya menguasai lebar layar. Di hero tiga kolom ia hanya
memiliki sepertiganya, sementara ukurannya tetap dihitung dari keseluruhan:
"mengawasinya" tumbuh ke ~550px di dalam kolom ~430px. Yang salah bukan
ukurannya melainkan APA YANG DIUKUR, jadi satuannya yang diganti — `cqw`
membaca lebar wadahnya sendiri (`.text-display-kolom`). Token aslinya tidak
disentuh, sehingga halaman lain tidak ikut mengecil.

**2. Galat CSP dari WebAssembly.** `useGLTF` memasang decoder Draco dan
Meshopt secara bawaan; Meshopt berbasis WASM, dan `WebAssembly.instantiate`
ditolak CSP halaman ini. Gerbang `render` menangkapnya sebagai
`unhandledrejection`. Menambahkan `unsafe-eval` demi decoder yang tidak
dipakai adalah pertukaran yang salah arah — `ronin.glb` dibangun sendiri dan
tidak dikompresi keduanya, jadi keduanya dimatikan.

**3. Klip tangkapan layar berkoordinat SALAH.** `getBoundingClientRect`
mengukur relatif viewport; klip `Page.captureScreenshot` membaca koordinat
halaman. Selama halamannya di scroll 0 keduanya identik — dan justru karena
identik, perbedaannya tak terlihat sampai ada pemeriksaan yang menggulir
lebih dulu.

**4. Cadangan ponsel diukur di wilayah kosong.** Di 390px panggungnya duduk
di y=779 dengan viewport 844: 78% klipnya di bawah lipatan, jadi rerata yang
terukur adalah rerata ruang kosong. Ia lulus sebelumnya hanya karena kebetulan
lebih banyak yang terlihat — pengukuran yang benar/salahnya bergantung pada
tinggi kolom teks di atasnya bukan pengukuran, melainkan undian.
`captureBeyondViewport` membuatnya tidak lagi bergantung pada posisi.

### R14 — siluet rujukan, hover, dan parallax kepala

| id | status | commit | gerbang | catatan |
|---|---|---|---|---|
| R14 | selesai | ini | ronin 28/28 · akses 455 · grafis 14 · palet bersih · 83 uji | kuwagata, dua katana, haori, hover, parallax kepala/dada |

Rujukan kedua memperlihatkan bahwa jaraknya SILUET, bukan detail permukaan.
Empat pembentuknya ditambahkan: tanduk kuwagata, dua katana menyilang ke
bawah, haori panjang yang jatuh dari bahu, dan pose simetris menghadap depan.

Tiga kesalahan ditangkap sendiri sepanjang jalan, dan ketiganya jenis yang
hanya terlihat dari tangkapan layar:

- Tanduk pertama LENYAP — satu torus ber-arc dengan tiga sumbu rotasi tidak
  dapat diramalkan arahnya. Diganti rantai ruas yang posisinya dihitung.
- Sudut bilah pertama menumpuk di atas rotasi lengan sehingga bilahnya
  MENDATAR: sosoknya terbaca bersayap, bukan bersenjata.
- Cahaya kunci sempat dipasang `roninBright`, dan karena kunci mendominasi
  hampir seluruh permukaan, seisi sosoknya PUDAR jadi lavender kelabu. Yang
  pucat harus menjadi yang lemah: kunci jenuh, isi pucat.

Haori versi pertama mulai sempit setinggi dada lalu melebar — dan sempit di
atas lalu melebar ke bawah adalah definisi ROK. Digantung dari bahu, ia
terbaca sebagai pakaian luar.

**Anggaran ditutup dengan menghemat.** Model sempat 286,4 KiB terhadap batas
280 dan gerbang menolaknya. Sebabnya pemborosan nyata: tiap `pasang()`
membangun geometrinya sendiri, jadi dua katana menyimpan empat belas bentuk
identik masing-masing. Kembarannya disatukan sebelum ekspor — 49 disatukan,
286,4 -> 166,4 KiB, dan anggarannya tidak disentuh.

**Cahaya isi juga tertangkap gerbang.** Menambahkannya mendorong
`terangPersen` ke 39,9% terhadap batas 38. Yang dikecilkan isinya, bukan
ambangnya: 0,14 -> 0,07, dan mantel — permukaan terluas sekarang —
digelapkan. Turun ke 33,5%.

**Hover diuji TERPISAH dari gerakan tetikus.** `pointermove` sudah mengubah
adegan lewat arah pandang, jadi hover yang diuji bersamanya akan terlihat
lulus meskipun tidak tersambung sama sekali. Arahnya dibekukan lebih dulu;
yang berubah sesudahnya hanya bisa datang dari hover. Delta 530.

Parallax kini menggerakkan kepala dan dada, bukan hanya memutar akar. Memutar
akar saja menggerakkan orangnya seperti patung di atas meja putar; yang
membuatnya terbaca MEMANDANG adalah kepala yang mendahului dan badan yang
menyusul lebih lambat.

Satu aturan lint dimatikan, sadar dan sempit: `react-hooks/immutability` pada
tiga baris yang memutar simpul GLB. Aturannya memodelkan nilai turunan hook
sebagai tak-boleh-diubah — benar untuk nilai React, tetapi `scene` adalah graf
adegan three.js, dan memutasinya tiap bingkai adalah seluruh alasan `useFrame`
ada. `useAnimations` milik drei memutasi simpul yang sama pada bingkai yang
sama.

### Review visual karakter — status jujur

Struktur TERCAPAI: humanoid penuh, kepala dan leher, dua bahu, dua lengan dan
telapak, torso dan pinggang, dua kaki terpisah, dua telapak kaki, proporsi
manusia, berdiri di platform, katana terbaca sebagai pedang, dan kedalaman
material yang nyata sejak cahaya bentuk masuk.

BELUM tercapai terhadap rujukan: fidelitas sculpt. Siluetnya kini terbaca —
samurai bertanduk, mata menyala, dua katana melengkung, mantel panjang,
lingkaran lantai, torii — tetapi hasilnya tetap gaya low-poly ter-stilisasi,
bukan setara sculpt high-poly di gambar rujukan. Itu plafon model
bangun-sendiri, dan plafon itu sudah disampaikan terbuka; pengguna memilih
melanjutkan jalur ini dengan sadar.

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
| W1 | selesai | ini | 97 uji · akses 489 · interior · kontras | peringatan diturunkan dari data yang sudah ada, nol API baru |
| W2 | selesai | ini | akses 489 · interior | enam pintasan, semuanya `Link` |
| W3 | selesai | ini | palet bersih · akses 489 | sampul DIBANGKITKAN dari id, deterministik |
| W4 | selesai | ini | 97 uji (14 baru, 3 bukti merah) | skor 4 komponen, tidak pernah naik karena belanja |

## Langkah 5 — validasi manusia

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| E2 | selesai | ini | akses 489/489 | hitungan tercatat di Langkah 1, dengan dua angka yang diberi catatan |
| E3 | selesai | ini | dokumen saja | `docs/UX_SCRIPT.md` — tujuh tugas, batas waktunya ALARM bukan target |
| E4 | **terhalang** | ini | — | `docs/A11Y_MANUAL.md` ditulis; MENUNGGU MANUSIA menjalankannya dengan NVDA/VoiceOver. Tidak boleh diklaim selesai oleh siapa pun yang tidak menjalankannya |

## Langkah 6 — menutup M16–M20

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| D1 | selesai | ini | dokumen saja | `ARCHITECTURE.md` §7.3 — kelimanya dengan syarat kelulusan berupa ANGKA, bukan kata sifat |
| D2 | selesai | ini | dokumen saja | termasuk bagian "yang sengaja TIDAK dikerjakan" |
| D3 | selesai | ini | 18 berkas, 15 Agu 2026 | `kantongz/docs/screenshots/` |

## Langkah 7 — penutupan celah yang aman

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| F1 | todo | — | — | simpan gambar struk, buang EXIF |
| F2 | todo | — | — | pulihkan dari ekspor |
| F5 | todo | — | — | ukur akurasi OCR, ≥40 struk sintetis |

## Langkah 8 — fitur murah bernilai tinggi

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| G1 | selesai | `061bb5b` | 522 uji · keamanan 21/21 · pengingat 8/8 | pengingat jatuh tempo, idempoten — kunci `pengingat:{aturan}:{TANGGAL-JATUH-TEMPO}`, bukan tanggal kirim; dijaga indeks unik `outbox_idempotency`, tanpa tabel baru. Gerbang runtime menemukan `.map()` atas `decryptColumn` membungkam SELURUH pemindaian karena 2 dari 9 baris disandikan kunci lain — kini dilewati per baris dan dicatat sebagai peringatan |
| G2 | selesai | `7d0ee93` | 549 uji · OpenAPI 10/10 | kategori otomatis dari merchant — **menyarankan, tidak memutuskan**: rute GET yang tidak menulis apa pun, dijaga uji yang mengukur jumlah transaksi sebelum/sesudah. Riwayat pengguna mengalahkan kamus; keyakinan dari KONSISTENSI, bukan banyaknya data. Uji mutasi menemukan `includes` mentah membuat "PT INDUSTRI JAYA"→Pulsa, "MOTORS ABC"→Kesehatan |

## Langkah 9 — tiga yang berisiko, paling akhir

| id | status | commit | gerbang saat selesai | catatan |
|---|---|---|---|---|
| X1 | selesai | `8e9d8f5` | 8 uji · matriks IDOR 10 rute | uji karakterisasi SEBELUM F3 dan G3 — menemukan 4 kesalahan saya sendiri: `GET /v1/transactions/:id` tidak ada, verba ditebak salah, tabrakan 409 anggaran, dan tiga muatan gagal validasi sehingga kepemilikan tak pernah tercapai |
| F3 | selesai | `3006b76` | 582 uji · keamanan 21/21 · OpenAPI 10/10 | split transaksi — `category_id` TETAP, mengikuti pecahan terbesar. Agregasi `LEFT JOIN` sadar-pecahan; tak menghitung ganda karena invarian jumlah-harus-sama. **Verifikasi runtime menemukan** migrasi tanpa entri jurnal Drizzle lulus 578 uji lalu tak pernah jalan di produksi — ditutup gerbang `jurnal-migrasi` |
| F4 | selesai | `4cd1a23` | 601 uji · keamanan 21/21 · templat 3/3 | penghapusan sungguhan — **mati secara bawaan**. Tiga penghalang: `PURGE_ENABLED`, `dryRun:false`, dan masa tunggu ≥7 hari (dijepit, bukan ditolak). Runtime membuktikan rutenya menolak di SETIAP jalur; tidak pernah dinyalakan pada basis data mana pun |
| G3 | selesai | `0ae0548` | 627 uji · keamanan 21/21 · OpenAPI hijau | dompet bersama — **satu penyelesai**, ditegakkan gerbang yang memindai `src` dan merah bila izin dompet diputuskan di luar `akses-dompet.ts`. Gerbang itu merah lebih dulu pada `repository.ts`, yang lalu berhenti memutuskan. Gagal-tertutup: peran asing ditolak, bukan diturunkan |
| X2 | selesai | `71e3590` | keamanan **39/39** (21 lama + 18 baru) | gerbang keamanan sesudah F3 dan G3 — 21 pemeriksaan IDOR lama TIDAK bergeser satu pun. Tiga bug di gerbangnya sendiri ditemukan pada jalanan pertama, ketiganya bentuk yang menghasilkan hijau palsu (`J()` tak di-`await`; DELETE ber-`Content-Type` tanpa badan ditolak 400 karena sebab tak berhubungan) |

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
