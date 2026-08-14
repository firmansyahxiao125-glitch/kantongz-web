# KANTONGZ Web

Aplikasi web KANTONGZ. Next.js 16 (Turbopack), React 19, Tailwind v4, Framer
Motion, React Three Fiber.

Dokumentasi proyek lengkap ada di [`../kantongz/README.md`](../kantongz/README.md).

---

## Menjalankan

```bash
npm ci
npm run dev
```

Berjalan di **http://localhost:3100** — bukan 3000, karena API sudah memakainya.
Portanya ditulis di skrip `dev` itu sendiri, bukan diserahkan ke bawaan Next:
tanpa itu `npm run dev` mendarat di 3000 dan bertabrakan dengan API pada
perintah pertama yang diketik orang.

3100 adalah porta yang dipakai SELURUH perkakas repositori ini — gerbang
peramban di CI, `npm run screenshots`, dan skrip verifikasi — dan asalnya sudah
ada di daftar CORS pengembangan `kantongz-api/docker-compose.yml`.

Membutuhkan API yang berjalan:

```bash
cd ../kantongz-api && docker compose up -d
```

| Perintah | Isi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi (`output: 'standalone'`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run interior` | Gerbang 12 halaman interior (butuh API + akun; lihat bawah) |
| `npm run screenshots` | Tangkapan layar dokumentasi (butuh Chrome) |

### Gerbang halaman interior

`typography` dan `render` menjaga halaman muka — halaman publik yang dapat
dibuka tanpa sesi, dan keduanya berjalan di CI. Dua belas halaman di balik
login tidak dapat diperiksa di sana: mereka menuntut API hidup, basis data, dan
satu akun berdata, sementara alur peramban CI hanya menyalakan peladen
standalone tanpa backend sama sekali.

`npm run interior` menutup celah itu secara LOKAL. Yang diukur pada keluaran
terender, bukan pada nama kelas di sumber:

- satu `<h1>` per halaman, dan tidak ada lompatan tingkat heading;
- judul kartu seragam — varian (ukuran, tebal) dihitung dari `getComputedStyle`;
- nominal uang memakai mono, untuk elemen yang isinya memang hanya angka;
- kontrol yang tak terlihat TETAPI masih dapat ditekan di layar sentuh —
  opacity efektif dikalikan sepanjang rantai leluhur, bukan opacity elemennya
  sendiri;
- nol luapan horizontal, nol galat konsol.

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js &
npm run interior -- --email you@contoh.id --password '…'
```

Statusnya **lokal, bukan CI**, dan itu dinyatakan apa adanya alih-alih
disamarkan. Gerbang ini sudah menemukan empat cacat nyata yang lolos typecheck,
lint, uji unit, build, kontras, dan palet.

---

## Bentuk kode

```
src/
├── app/
│   ├── (app)/          ← rute terlindungi, dibungkus AppShell
│   ├── (auth)/         ← masuk, daftar, pulihkan
│   ├── api/auth/*      ← BFF: cookie httpOnly ↔ Bearer
│   └── page.tsx        ← halaman muka
├── components/
│   ├── charts/         ← SVG tulis-tangan; tanpa pustaka grafik
│   ├── landing/        ← bagian halaman muka
│   ├── shell/          ← sidebar, palet perintah, transisi halaman
│   ├── three/          ← adegan React Three Fiber
│   └── ui/             ← primitif
└── lib/
    ├── gpu.ts          ← tingkat grafis perangkat
    ├── motion.ts       ← kosakata gerak
    └── server/         ← hanya berjalan di server
```

---

## Tiga hal yang perlu diketahui sebelum mengubah apa pun

### 1. Refresh token tidak pernah menyentuh JavaScript peramban

Rute `/api/auth/*` adalah **BFF**. Ia menukar kredensial dengan backend,
menyimpan refresh token di cookie `httpOnly`, dan hanya mengembalikan access
token ke halaman. `localStorage` dapat dibaca skrip mana pun yang berhasil masuk
ke halaman; cookie `httpOnly` tidak.

Identitas perangkat untuk sesi web dibuat **server**, bukan diambil dari
sidik jari peramban.

### 2. Grafik digambar sendiri

`area-chart.tsx`, `donut-chart.tsx`, dan `sparkline.tsx` adalah SVG tulis-tangan.
Pustaka grafik membawa 40–120 KB untuk menggambar dua garis, memaksakan temanya
sendiri yang harus dilawan, dan merender ulang seluruh kanvas pada tiap gerakan
kursor.

Keduanya memakai `preserveAspectRatio="none"`, jadi SVG meregang mengikuti
induknya tanpa `ResizeObserver`. **Konsekuensinya:** apa pun selain garis akan
terpipihkan — lingkaran menjadi lonjong, huruf menjadi lebar. Titik sorot dan
label karena itu digambar sebagai HTML **di atas** SVG, bukan di dalamnya.

### 3. 3D memeriksa perangkat sebelum menyala

`lib/gpu.ts` memilih satu dari tiga tingkat, **sekali**, lalu memegangnya:

| Tingkat | Syarat | Yang berjalan |
|---|---|---|
| `off` | Gerak dikurangi, atau WebGL gagal dibuat | Pengganti statis |
| `lite` | < 4 inti / < 4 GB / layar sentuh sempit | DPR 1, tanpa pascaproses |
| `full` | Selebihnya | Bloom, kedalaman medan, kerapatan penuh |

`Stage` mewajibkan prop `fallback` — bukan opsional. Adegan tanpa pengganti
berarti halaman kehilangan pusat visualnya pada perangkat lemah.

Three.js dimuat lewat `next/dynamic` dengan `ssr: false`. Pengunjung bertingkat
`off` tidak pernah mengunduh satu byte pun darinya.

---

## Gerak

Durasi dan kurva hidup di token CSS (`globals.css`) dan dibaca CSS maupun Framer
Motion. Dua sumber durasi adalah dua sumber penyimpangan.

`MotionConfig reducedMotion="user"` dipasang di `providers.tsx`. **Ini wajib:**
Framer menganimasikan lewat gaya sebaris dan `requestAnimationFrame`, jadi
aturan `prefers-reduced-motion` di CSS tidak pernah menyentuhnya.

---

## Yang tidak ada di sini, dan mengapa

| Tidak ada | Alasan |
|---|---|
| Pustaka grafik | Dua `path` dan satu tooltip tidak membutuhkan 120 KB |
| GSAP, Motion One, Lottie | Framer Motion sudah mengerjakan seluruhnya, termasuk gerak terkait-gulir |
| Puppeteer / Playwright | Skrip tangkapan layar memakai Chrome yang sudah ada lewat CDP |
| Pustaka komponen | Primitif di `ui/` berjumlah belasan berkas dan seluruhnya dapat dibaca |
