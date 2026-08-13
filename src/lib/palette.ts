/**
 * Warna untuk adegan 3D.
 *
 * ── MENGAPA BERKAS INI ADA ──────────────────────────────────────────────
 *
 * Three.js menuntut NILAI. `new THREE.Color()` dan `<meshStandardMaterial
 * color=…>` tidak bisa membaca `var(--color-holo)` — tidak ada kaskade CSS di
 * dalam kanvas WebGL. Jadi warna adegan mau tidak mau adalah salinan kedua dari
 * palet, dan salinan kedua selalu menyimpang.
 *
 * Yang bisa dilakukan bukan menghapus salinannya, melainkan membuat
 * penyimpangannya BERISIK: `scripts/palette.mjs` membaca `globals.css` dan
 * membandingkan setiap entri `TOKEN` di bawah dengan token bernama sama. Nilai
 * yang diubah di satu tempat saja memerahkan gerbang, bukan diam-diam lolos ke
 * produksi.
 *
 * ── APA YANG DITEMUKAN KETIKA BERKAS INI DIBUAT ─────────────────────────
 *
 * Tiga warna terlarang sedang dirender di halaman muka, dan ketiganya masuk
 * lewat nilai bawaan prop yang tidak pernah dilewatkan pemanggilnya:
 *
 *   AiCore            edge   = '#00f5d4'   cyan yang globals.css nyatakan dibuang
 *   TransactionStreams color = '#00f5d4'   cyan yang sama
 *   OrbitObjects      accent = '#3b82f6'   biru bawaan Tailwind
 *
 * `ai-core.tsx` bahkan sudah memuat komentar "diambil dari token tema oleh
 * pemanggil, bukan ditulis di sini". Mekanismenya dibangun, propnya ada, dan
 * TIDAK ADA satu pun pemanggil yang melewatkannya — jadi yang benar-benar
 * dirender selalu nilai bawaannya. Komentar yang menyatakan niat tidak
 * menjalankan apa pun; gerbang menjalankannya.
 */

/**
 * Disalin dari `globals.css`. Setiap kunci wajib punya token `--color-<kunci
 * dalam kebab-case>` dengan nilai yang sama persis, dan gerbang memaksanya.
 */
export const TOKEN = {
  holo: '#7fe3ff',
  holoBright: '#b8f0ff',
  brass: '#c89440',
  brassSpec: '#fff4dc',
  titaniumBase: '#3a4150',
  titaniumRaised: '#4a5262',
  titaniumRim: '#e8edf6',
  identityNone: '#7f7f8b',
} as const;

/**
 * Warna material yang BUKAN token, dan memang tidak seharusnya menjadi token.
 *
 * Sistem desain mengatur antarmuka — permukaan, tinta, sinyal. Bulu beruang dan
 * kuning logam koin tidak muncul di antarmuka mana pun, jadi mengangkatnya
 * menjadi token akan menambah kosakata yang tidak pernah dipakai di luar satu
 * adegan. Nilainya tetap dikumpulkan di sini supaya larangan "tidak ada hex di
 * dalam komponen" tetap dapat ditegakkan tanpa pengecualian per berkas.
 */
export const MATERIAL = {
  /* Beruang. Bulu lebih gelap dari titanium.base supaya siluetnya terbaca di
     atas panel, dan hidung/mata nyaris hitam — pantulan pada bola mata datang
     dari specular, bukan dari warna dasarnya. */
  fur: '#2a2f3a',
  nearBlack: '#0b0e14',
  black: '#000000',

  /* Inti AI: biru laut dalam sebagai dasar gradien shader. Bukan biru Tailwind
     mana pun — dicari supaya tepi hologram di atasnya tetap terbaca sebagai
     cahaya, bukan sebagai garis. */
  coreDeep: '#0b2a4a',

  /* Emas koin dan batangan. SENGAJA berbeda dari kuningan: kuningan adalah
     isyarat uang di ANTARMUKA (DESIGN §1.4) dan nilainya dijaga ketat, sedangkan
     ini benda fisik di dalam adegan yang memantulkan tiga sumber cahaya. */
  goldCoin: '#f0b429',
  goldBar: '#d4a017',
  goldBarEmissive: '#7a5c00',
} as const;

/**
 * Warna bawaan untuk kategori yang dibuat pengguna.
 *
 * Kategori punya paletnya SENDIRI, terpisah dari sistem desain, dan itu
 * keharusan: DESIGN.md menyisakan sedikit warna dan seluruhnya sudah punya arti
 * — kuningan hanya uang, hologram hanya informasi, hijau/merah/kuning adalah
 * sinyal. Memakai salah satunya untuk kategori melemahkan isyarat yang paling
 * ketat dijaga dokumen itu.
 *
 * Nilai ini adalah warna "Lainnya" pada palet kategori di `kantongz-api`
 * (`src/modules/ledger/seed.ts`). Ia bawaan, bukan pilihan: pengguna memilih
 * sendiri lewat pemilih warna, dan bawaannya tidak boleh mendahului pilihan itu.
 *
 * Ia menunjuk ke `TOKEN.identityNone` dan bukan menyalin nilainya: keduanya
 * memang berarti hal yang sama — belum ada identitas yang dipilih — dan dua
 * literal dengan satu arti adalah dua tempat untuk menyimpang.
 */
export const CATEGORY_DEFAULT = TOKEN.identityNone;
