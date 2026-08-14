/**
 * Nama peramban yang dapat dibaca manusia, dari User-Agent.
 *
 * ── MENGAPA BUKAN SEKADAR MEMOTONG UA ──────────────────────────────────
 *
 * BFF pernah menyimpan `userAgent.slice(0, 120)` dengan komentar yang
 * menjanjikan "hanya nama peramban, supaya daftar perangkat di Pusat Keamanan
 * dapat dibaca manusia". Yang tersimpan sebenarnya:
 *
 *   Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML,
 *   like Gecko) Chrome/151.0.0.0 Safari/537.36
 *
 * Begitu daftar sesi benar-benar ada, baris itu menjadi satu-satunya hal yang
 * dibaca pengguna untuk menjawab "apakah ini perangkatku" — dan ia tidak
 * menjawab apa pun. Di layar sempit ia juga meremukkan seluruh baris menjadi
 * elipsis, cacat yang persis sama dengan yang baru diperbaiki di Anggaran.
 *
 * ── DIPAKAI DI DUA SISI, DAN ITU DISENGAJA ─────────────────────────────
 *
 * BFF memakainya saat MENULIS sesi baru. Antarmuka memakainya saat MEMBACA —
 * sebab sesi yang sudah terlanjur tersimpan tetap membawa UA panjangnya, dan
 * memperbaiki penulisan saja meninggalkan setiap baris lama tidak terbaca.
 *
 * URUTANNYA ADALAH ATURANNYA. Edge memuat "Chrome" di UA-nya, Chrome memuat
 * "Safari", dan Safari memuat "Mozilla" — jadi yang paling spesifik diperiksa
 * lebih dulu. Salah urutan membuat setiap peramban dilaporkan sebagai Chrome.
 *
 * BUKAN SIDIK JARI: versi, arsitektur, dan daftar plugin sengaja dibuang.
 * Satu kata tidak cukup untuk melacak siapa pun.
 */

const COCOK: [RegExp, string][] = [
  [/\bEdg[A-Z]?\//, 'Edge'],
  [/\bOPR\/|\bOpera\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bHeadlessChrome\//, 'Chrome (headless)'],
  [/\bChrome\/|\bCriOS\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

export function namaPeramban(userAgent: string | null): string {
  const ua = userAgent ?? '';
  if (ua.length === 0) return 'Peramban';
  for (const [pola, nama] of COCOK) if (pola.test(ua)) return nama;
  return 'Peramban';
}

/**
 * Label perangkat untuk daftar sesi.
 *
 * `model` yang PENDEK dibiarkan apa adanya — klien mobile mengirim nama
 * perangkat sungguhan ("Pixel 8"), dan menerjemahkannya menjadi "Peramban"
 * akan membuang informasi yang justru paling berguna. Hanya yang berbentuk
 * User-Agent yang diringkas.
 */
export function labelPerangkat(platform: string, model: string | null): string {
  if (model === null || model.trim().length === 0) return platform;
  /* Ambang 48: nama perangkat sungguhan tidak sepanjang itu, User-Agent
     selalu jauh lebih panjang. */
  if (model.length <= 48 && !model.includes('Mozilla/')) return model;
  return namaPeramban(model);
}
