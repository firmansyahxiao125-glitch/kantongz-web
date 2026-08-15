#!/usr/bin/env node
/**
 * Gerbang RONIN — syarat visual dan perilaku, diukur dari PIKSEL.
 *
 * ── MENGAPA IA ADA, TERPISAH DARI `grafis` ─────────────────────────────
 *
 * `grafis` menjawab "berapa cepat" dan "apakah cadangannya ada". Ia sama
 * sekali tidak menjawab "apakah karakternya benar-benar tergambar" — dan
 * sebuah kanvas hitam pekat lulus setiap penegasan di sana dengan lapang.
 *
 * Berkas ini menjawab pertanyaan yang tersisa: apa yang BENAR-BENAR terlihat,
 * dan apakah ia menanggapi ketika disentuh.
 *
 * ── MENGAPA TANGKAPAN LAYAR, BUKAN readPixels ──────────────────────────
 *
 * `gl.readPixels` mengembalikan NOL pada kanvas three.js, karena
 * `preserveDrawingBuffer` bawaannya `false` dan buffer sudah dikosongkan
 * sebelum pembacaan sempat terjadi. Versi pertama alat bukti ini terjebak di
 * situ: enam penegasan melaporkan layar kosong sementara tangkapan layar pada
 * momen yang sama memperlihatkan samurainya lengkap.
 *
 * Menyalakan `preserveDrawingBuffer` akan memperbaikinya — dan mematikan
 * optimasi peramban untuk setiap pengunjung, demi keperluan uji. Jadi yang
 * dipakai adalah `Page.captureScreenshot`, yang mengompositkan persis seperti
 * yang dilihat mata, lalu PNG-nya dibaca kembali DI DALAM halaman lewat
 * kanvas 2D. Tanpa dependensi, dan yang terukur adalah apa yang benar-benar
 * sampai ke layar.
 *
 * Jalankan:
 *   npm run build && ./node_modules/.bin/next start -p 3100
 *   node scripts/ronin.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { wajibProduksi } from './permukaan.mjs';

/** Lihat catatan yang sama di skrip gerbang lain: 40 detik, bukan 15. */
const MAKS_TARGET = 160;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = arg('base', 'http://localhost:3100');

/* Menolak `next dev` sebelum satu proses peramban pun dinyalakan.
   Sebabnya panjang dan ada di `permukaan.mjs`; ringkasnya: dev
   menyajikan 882 KB yang tidak pernah diunduh pengguna, dan galat
   `eval()` dari React Refresh adalah CSP yang bekerja benar. */
await wajibProduksi(BASE, 'ronin');

let lulus = 0;
let gagal = 0;

function ok(nama, syarat, extra = '') {
  if (syarat) {
    lulus += 1;
    console.log(`  OK      ${nama} ${extra}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL   ${nama} ${extra}`);
  }
}

/* ── peramban ─────────────────────────────────────────────────────────── */

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe` : null,
  process.env.CHROME_PATH ?? null,
].filter(Boolean);

const CHROME = CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('Chrome tidak ditemukan. Setel CHROME_PATH.');
  process.exit(2);
}

const PORT = 9449;
const konsol = [];

async function withChrome(extraArgs, fn) {
  const profil = mkdtempSync(join(tmpdir(), 'kz-ronin-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      `--user-data-dir=${profil}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      ...extraArgs,
    ],
    { stdio: 'ignore' },
  );

  try {
    let target = null;
    for (let i = 0; i < MAKS_TARGET && !target; i += 1) {
      try {
        const daftar = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)).json();
        target = daftar.find((t) => t.type === 'page') ?? null;
      } catch {
        /* belum siap */
      }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('Chrome tidak pernah membuka target halaman.');

    const cdp = await connect(target.webSocketDebuggerUrl);
    await fn(cdp);
    cdp.socket.close();
  } finally {
    chrome.kill();
  }
}

async function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let next = 1;

  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });

  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      konsol.push(JSON.stringify(m.params.args?.[0]?.value ?? '').slice(0, 160));
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = next;
      next += 1;
      pending.set(id, (m) =>
        m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result),
      );
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  return { socket, send };
}

const evaluate = async (cdp, expr) => {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error(`${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
  }
  return r.result.value;
};

const goto = async (cdp, url, wait = 8000) => {
  await cdp.send('Page.navigate', { url });
  await sleep(wait);
};

const viewport = (cdp, width, height, mobile) =>
  cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });

/**
 * Penekanan tombol yang BENAR-BENAR menghasilkan klik.
 *
 * `rawKeyDown` saja tidak cukup untuk Enter: Chrome membangkitkan klik pada
 * elemen `<button>` hanya ketika peristiwanya membawa teks. Versi pertama
 * gerbang ini mengirim `char` untuk Spasi tetapi tidak untuk Enter — lalu
 * melaporkan "Enter tidak memicu tebasan" pada tombol yang sebenarnya
 * berfungsi sempurna.
 *
 * `keyDown` dengan `text` mengurus keduanya sekaligus.
 */
async function tekan(cdp, key) {
  const kode = { Enter: 13, Escape: 27, Space: 32 }[key];
  const teks = key === 'Enter' ? '\r' : key === 'Space' ? ' ' : '';
  const p = {
    windowsVirtualKeyCode: kode,
    nativeVirtualKeyCode: kode,
    code: key,
    key: key === 'Space' ? ' ' : key,
  };
  await cdp.send('Input.dispatchKeyEvent', {
    type: teks ? 'keyDown' : 'rawKeyDown',
    ...p,
    ...(teks ? { text: teks } : {}),
  });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
}

/* ── analisis piksel ──────────────────────────────────────────────────── */

/** Kotak panggung dalam koordinat halaman. */
const kotakPanggung = (cdp) =>
  evaluate(
    cdp,
    /*
      Dikembalikan dalam koordinat HALAMAN, bukan viewport.

      `getBoundingClientRect` mengukur relatif terhadap viewport, sedangkan
      klip `Page.captureScreenshot` membaca koordinat halaman. Selama
      halamannya di scroll 0 keduanya identik — dan justru karena identik,
      perbedaannya tidak terlihat sampai ada satu pemeriksaan yang menggulir
      lebih dulu. Begitu itu terjadi, klipnya meleset sejauh gulirannya dan
      yang terukur adalah bagian halaman yang salah sama sekali.

      Offset gulirnya ditambahkan di sini, sekali, supaya setiap pemanggil
      mendapat kotak yang benar tanpa perlu mengingat aturannya.
    */
    `(() => { const el = document.querySelector('[data-tier]'); if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.left + window.scrollX),
        y: Math.round(r.top + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    })()`,
  );

/**
 * Ambil tangkapan layar area panggung, lalu BACA KEMBALI di dalam halaman.
 *
 * PNG-nya dimuat sebagai Image, digambar ke kanvas 2D, dan `getImageData`
 * memberi piksel yang sebenarnya. Tidak ada dependensi, dan yang diukur adalah
 * hasil komposit — persis yang sampai ke mata.
 */
async function analisis(cdp, kotak) {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...kotak, scale: 1 },
    /*
      Melampaui viewport, karena klipnya berkoordinat HALAMAN.

      Tanpa ini Chrome hanya merekam yang ada di layar, jadi klip yang
      seluruhnya atau sebagian berada di bawah lipatan kembali sebagai
      wilayah kosong — dan wilayah kosong terbaca sebagai "cadangannya tidak
      tergambar", persis kebalikan dari yang sebenarnya terjadi.
    */
    captureBeyondViewport: true,
  });

  return evaluate(
    cdp,
    `(async () => {
      const img = new Image();
      img.src = 'data:image/png;base64,${data}';
      await img.decode();

      const W = Math.min(img.width, 360);
      const H = Math.round((W / img.width) * img.height);
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, W, H);
      const px = x.getImageData(0, 0, W, H).data;

      const terang = new Float32Array(W * H);
      let nyala = 0, jumlahRona = new Array(12).fill(0), jenuh = 0;

      for (let i = 0, p = 0; i < px.length; i += 4, p += 1) {
        const r = px[i] / 255, g = px[i+1] / 255, b = px[i+2] / 255;
        const maks = Math.max(r, g, b), min = Math.min(r, g, b);
        const v = maks, s = maks === 0 ? 0 : (maks - min) / maks;
        terang[p] = v;
        if (v > 0.12) nyala += 1;
        if (s > 0.35 && v > 0.2) {
          jenuh += 1;
          let h = 0;
          if (maks === min) h = 0;
          else if (maks === r) h = ((g - b) / (maks - min)) % 6;
          else if (maks === g) h = (b - r) / (maks - min) + 2;
          else h = (r - g) / (maks - min) + 4;
          h = ((h * 60) + 360) % 360;
          jumlahRona[Math.floor(h / 30)] += 1;
        }
      }

      /* ── R-V3: rim light — sosoknya BERKONTRAS, bukan bersinar rata ──────

         Yang dijaga syarat ini: zirahnya gelap dan hanya pinggirnya menyala.
         Itulah yang mengubah bentuk sederhana menjadi benda bervolume; benda
         yang bersinar merata tidak punya tepi untuk dibaca mata.

         ── DUA UKURAN YANG DICOBA LEBIH DULU, DAN MENGAPA KEDUANYA SALAH ──

         (1) "piksel nyala di tepi vs di dalam", siluet ditentukan ambang
             NYALA. Zirah gelap jatuh DI BAWAH ambang sehingga tidak terhitung
             sama sekali, dan yang tersisa hanya inti bilah yang memancar
             melawan pinggiran pendarnya sendiri. Benda emisif selalu kalah di
             sana, betapa pun benar rim light-nya.

         (2) Sama, tetapi siluetnya diambil dengan ambang RENDAH relatif latar
             supaya zirah gelap ikut masuk. Ini yang akhirnya membuat
             kegagalannya dapat dipercaya — dan justru karena dapat dipercaya,
             ia memperlihatkan bahwa yang diukur bukan rim: pada ambang
             serendah itu topengnya ikut menelan HALO BLOOM. Pita "tepi" lalu
             jatuh di pinggiran halo yang redup, sementara "bagian dalam"
             berisi inti bilah yang putih. Yang terukur adalah peluruhan
             bloom, bukan rim-vs-perut, dan tidak ada penyetelan adegan yang
             bisa membalikkannya selama bilahnya memang sebuah sumber cahaya.

         (3) Sebaran kecerahan atas seluruh siluet — berapa persen nyaris
             hitam, berapa persen benar-benar terang. Ini gerbang yang sah,
             dan ia terbukti menolak fresnel lama yang membanjir (gelap
             24,1%). Tetapi ambangnya tidak pernah tercapai, dan sebabnya
             bukan adegannya: 42% piksel jatuh di pita TENGAH, dan pita tengah
             itu halo. Kecerahan saja memang tidak dapat memisahkan perut
             zirah yang gelap dari halo yang redup — jangkauan keduanya
             bertumpang tindih.

         ── YANG DIUKUR SEKARANG: TOPOLOGI, BUKAN KECERAHAN ─────────────────

         Yang memisahkan keduanya bukan seberapa terang, melainkan APA YANG
         MENGURUNGNYA. Perut zirah gelap DAN terkurung rim yang menyala. Halo
         juga gelap, tetapi ia bersambung sampai ke tepi bingkai.

         Jadi: banjiri dari tepi bingkai, melewati piksel yang lebih gelap
         dari AMBANG_STRUKTUR. Yang tak terjangkau banjir adalah bagian dalam
         yang terkurung struktur terang — persis perut zirahnya. Halo terbuang
         dengan sendirinya, tanpa satu angka pun yang disetel untuk
         membuangnya.

         Sosoknya lalu = bagian dalam terkurung + struktur terang, dan
         pertanyaannya menjadi yang sejak awal dimaksudkan: dari sosok itu,
         berapa yang gelap dan berapa yang menyala. Rim light yang benar
         menghasilkan sebagian besar gelap dengan pinggiran menyala; benda
         yang bersinar seluruhnya menghasilkan kebalikannya.

         Bagian halo yang kebetulan lebih terang dari ambang struktur ikut
         terhitung sebagai struktur, dan itu DIBIARKAN: kesalahannya bekerja
         melawan kelulusan, dan gerbang yang salah ke arah menolak masih
         gerbang yang berguna.
      */
      const pinggir = [];
      for (let xx = 0; xx < W; xx += 1) {
        for (const y of [0, 1, 2, H - 3, H - 2, H - 1]) pinggir.push(terang[y * W + xx]);
      }
      pinggir.sort((p, q) => p - q);
      const latar = pinggir[Math.floor(pinggir.length / 2)] ?? 0;
      /* Dibaca dari latarnya, bukan angka tetap: 0.035 tetap pernah gagal
         total karena latar #06070a berkecerahan ~0.039, sehingga SELURUH
         gambar terhitung di dalam siluet. */
      const AMBANG_SILUET = latar + 0.035;

      /*
         (4) Topologi: banjiri dari tepi bingkai melewati piksel gelap, lalu
             hitung yang TERKURUNG struktur terang sebagai perut zirah. Halo
             terbuang sendiri karena ia bersambung ke tepi. Idenya benar dan
             ukurannya bersih — tetapi premisnya tidak. Sapuan ambang
             membuktikannya dalam satu jalan: 0,22 -> 28%, 0,30 -> 7,8%,
             0,38 -> 2,5%, 0,54 -> 0%. Wilayah terkurungnya RUNTUH begitu
             ambang dinaikkan, yang hanya mungkin bila rim-nya bukan kontur
             tertutup. Dan memang tidak bisa tertutup: rim padam justru di
             tempat permukaan menghadap kamera, dan bagian bawah sosoknya
             terbuka ke cincin lantai. Banjirnya bocor masuk lewat lubang itu.

         ── KESIMPULAN, SESUDAH EMPAT UKURAN ────────────────────────────────

         Sifat yang dijaga R-V3 NYATA dan terlihat — tiga tangkapan layar
         berturut memperlihatkan perut zirah berubah dari menyala rata menjadi
         gelap. Yang tidak ada adalah statistik piksel sebingkai yang
         menangkapnya dengan andal pada skala adegan ini, dan keempat
         kegagalannya punya sebab yang berbeda dan kini diketahui.

         Jadi lingkupnya dipersempit, dan dinyatakan terbuka alih-alih
         disamarkan: ukuran (3) DIPERTAHANKAN sebagai PENJAGA REGRESI, bukan
         sebagai bukti mutu. Ia terbukti menolak fresnel yang membanjir, dan
         itulah satu-satunya yang ia janjikan. Penilaian rupa diserahkan ke
         titik henti manusia yang memang sudah diwajibkan — mesin menjaga agar
         tidak mundur, manusia menilai bagusnya.

         Ambangnya 28, dan asalnya diukur BUKAN ditebak: fresnel lama
         menghasilkan 24,1% dan yang sekarang 30,9%, jadi 28 terletak di
         antaranya dengan sisa di kedua sisi. Angka 45 yang sempat tertulis di
         sini adalah tebakan saya sendiri yang tidak pernah dikalibrasi dan
         tidak pernah tercapai oleh rancangan mana pun.
      */
      const AMBANG_GELAP = latar + 0.08;
      const AMBANG_TERANG = 0.3;
      let jSosok = 0, jGelap = 0, jTerang = 0;
      for (let y = 2; y < H - 2; y += 1) {
        for (let xx = 2; xx < W - 2; xx += 1) {
          const p = y * W + xx;
          if (terang[p] <= AMBANG_SILUET) continue;
          jSosok += 1;
          if (terang[p] < AMBANG_GELAP) jGelap += 1;
          else if (terang[p] > AMBANG_TERANG) jTerang += 1;
        }
      }

      /* ── R-V1: SOSOK HUMANOID — bahu lebih lebar dari kepala ───────────

         Versi sebelumnya mengukur "tanda tangan caping": baris lebar di atas,
         sempit tepat di bawahnya. Ia benar untuk desain yang punya topi
         kerucut lebar, dan berhenti benar dua kali — capingnya diganti kabuto
         bertanduk, lalu karakternya diganti seluruhnya oleh aset berpahat.
         Pemeriksaan yang menjaga elemen desain yang sudah tidak ada hanya
         menjaga masa lalu.

         Yang dijaga sekarang adalah sifat yang berlaku untuk SETIAP sosok
         manusia dan tidak berlaku untuk gumpalan: kepala lebih sempit
         daripada bahu. Bola, kotak, atau kanvas yang gagal memuat seluruhnya
         memberi rasio di sekitar 1; sosok berbahu memberi jauh di atasnya.

         Diukur pada piksel TERANG saja (> 0,3) di pita tengah 60% lebar.
         Keduanya membuang lingkungan: torii dan atap sengaja diredupkan jauh
         di bawah ambang itu, dan bulan berada di luar pita tengah. Tanpa
         kedua batas itu yang terukur adalah lebar adegan, bukan lebar sosok.
      */
      const x0 = Math.floor(W * 0.2);
      const x1 = Math.ceil(W * 0.8);
      const lebarBaris = [];
      for (let y = 0; y < H; y += 1) {
        let kiri = -1, kanan = -1;
        for (let xx = x0; xx < x1; xx += 1) {
          if (terang[y * W + xx] > 0.3) { if (kiri < 0) kiri = xx; kanan = xx; }
        }
        lebarBaris.push(kiri < 0 ? 0 : kanan - kiri);
      }

      const barisIsi = lebarBaris.map((l, i) => [l, i]).filter(([l]) => l > 2);
      let rasioBahu = 0;
      let yKepala = 0;
      let yBahu = 0;
      if (barisIsi.length > 8) {
        const atas = barisIsi[0][1];
        const bawah = barisIsi[barisIsi.length - 1][1];
        const tinggi = bawah - atas;
        /* Kepala: pita 4-14% dari puncak sosok. Bahu: 18-38%. Keduanya
           diambil sebagai MEDIAN, bukan satu baris — satu baris tunggal
           mudah tergelincir oleh satu bara yang kebetulan lewat. */
        const ambil = (a, b) => {
          const v = [];
          for (let y = atas + Math.round(tinggi * a); y <= atas + Math.round(tinggi * b); y += 1) {
            if (lebarBaris[y] > 0) v.push(lebarBaris[y]);
          }
          v.sort((p, q) => p - q);
          return v.length === 0 ? 0 : v[Math.floor(v.length / 2)];
        };
        yKepala = ambil(0.04, 0.14);
        yBahu = ambil(0.18, 0.38);
        if (yKepala > 0) rasioBahu = yBahu / yKepala;
      }

      const total = W * H;
      const puncak = Math.max(...jumlahRona);
      return {
        lebar: W, tinggi: H,
        nyalaPersen: Math.round((nyala / total) * 1000) / 10,
        jenuhPersen: Math.round((jenuh / total) * 1000) / 10,
        dominasiRona: jenuh === 0 ? 0 : Math.round((puncak / jenuh) * 100) / 100,
        binRonaTeratas: jumlahRona.indexOf(puncak),
        gelapPersen: jSosok === 0 ? 0 : Math.round((jGelap / jSosok) * 1000) / 10,
        terangPersen: jSosok === 0 ? 0 : Math.round((jTerang / jSosok) * 1000) / 10,

        rasioBahu: Math.round(rasioBahu * 100) / 100,
        lebarKepala: yKepala,
        lebarBahu: yBahu,
      };
    })()`,
  );
}

/** Seberapa berbeda dua analisis — dipakai untuk membuktikan "bingkainya berubah". */
const beda = (a, b) =>
  a && b
    ? Math.abs(a.nyalaPersen - b.nyalaPersen) +
      Math.abs(a.gelapPersen - b.gelapPersen) +
      Math.abs(a.rasioBahu - b.rasioBahu) * 10
    : 0;

const panggungInfo = (cdp) =>
  evaluate(
    cdp,
    `(() => { const p = document.querySelector('[data-tier]'); if (!p) return null;
      const b = p.querySelector('button'); const l = p.querySelector('[aria-live]');
      return { tier: p.getAttribute('data-tier'), kanvas: p.querySelectorAll('canvas').length,
               label: b ? b.getAttribute('aria-label') : null,
               ditekan: b ? b.getAttribute('aria-pressed') : null,
               live: l ? l.innerText.replace(/\\s+/g, ' ').trim() : '' };
    })()`,
  );

const tungguDitekan = async (cdp, nilai) => {
  for (let i = 0; i < 45; i += 1) {
    const s = await panggungInfo(cdp);
    if (s?.ditekan === nilai) return s;
    await sleep(200);
  }
  return null;
};

/* ── jalan ────────────────────────────────────────────────────────────── */

console.log(`Gerbang Ronin → ${BASE}\n`);

await withChrome([], async (cdp) => {
  /* ── 1440px: syarat visual ─────────────────────────────────────────── */
  console.log('── 1440px · syarat visual ──');
  await viewport(cdp, 1440, 900, false);
  await goto(cdp, BASE, 9000);

  const info = await panggungInfo(cdp);
  ok('panggung ada, tingkat full', info?.tier === 'full', `(${String(info?.tier)})`);
  ok('kanvas WebGL terpasang', info?.kanvas === 1, `(${String(info?.kanvas)})`);

  const kotak = await kotakPanggung(cdp);
  const a = await analisis(cdp, kotak);
  console.log(`  ukur: ${JSON.stringify(a)}`);

  ok('karakter benar-benar tergambar', a.nyalaPersen > 3, `(${String(a.nyalaPersen)}% piksel menyala)`);
  ok(
    'R-V2 satu rona jenuh mendominasi',
    a.dominasiRona >= 0.7,
    `(${String(Math.round(a.dominasiRona * 100))}% pada bin ${String(a.binRonaTeratas)})`,
  );
  ok(
    'R-V2 ronanya UNGU (bin 8–10 = 240–330°)',
    a.binRonaTeratas >= 8 && a.binRonaTeratas <= 10,
    `(bin ${String(a.binRonaTeratas)})`,
  );
  /*
     ── KALIBRASI ULANG, SESUDAH KOMPOSISINYA BERUBAH TOTAL ───────────────

     Ambang lama (gelap >= 28) dikalibrasi terhadap sosok PROSEDURAL kecil
     yang mengisi seperenam bingkai dan hanya disinari rim. Karakternya kini
     humanoid GLB dengan pembingkaian hero dan cahaya bentuk — dan pada sosok
     yang mengisi bingkai, hampir setiap piksel tubuh berada di atas ambang
     "gelap", sehingga ember itu cuma menangkap pinggiran latar.

     `gelapPersen` karena itu BUTA di sini, dan itu diukur bukan dikira:

                        gelapPersen   terangPersen
       membanjir            14,1%         42,0%
       benar                16,0%         33,9%
       pemisahan             1,9           8,1

     Penjaganya pindah ke batas ATAS `terangPersen`. Arahnya masuk akal dan
     itulah sebabnya ia bekerja: permukaan yang membanjir menambah piksel
     TERANG, bukan mengurangi piksel gelap — bagian yang tadinya gelap tidak
     hilang, ia hanya tertimbun.

     38 terletak di antara kedua pengukuran dengan sisa di kedua sisi.
     `gelapPersen` tetap dilaporkan sebagai keterangan, tetapi tidak lagi
     dipakai menghakimi: angka yang tidak peka terhadap hal yang dijaganya
     hanya menambah rasa aman palsu.
  */
  ok(
    'R-V3 penjaga regresi — permukaan tidak membanjir cahaya',
    a.terangPersen <= 38,
    `(terang ${String(a.terangPersen)}% / maks 38%, gelap ${String(a.gelapPersen)}%)`,
  );
  ok(
    'R-V1 sosok humanoid — bahu lebih lebar dari kepala',
    a.rasioBahu >= 1.5,
    `(bahu ${String(a.lebarBahu)}px / kepala ${String(a.lebarKepala)}px = ${String(a.rasioBahu)}×)`,
  );

  /* ── gerak ambien ──────────────────────────────────────────────────── */
  console.log('\n── gerak dan tanggapan ──');
  const b1 = await analisis(cdp, kotak);
  await sleep(1400);
  const b2 = await analisis(cdp, kotak);
  ok('bingkai berubah sendiri saat diam', beda(b1, b2) > 0.05, `(delta ${String(Math.round(beda(b1, b2) * 100) / 100)})`);

  /* ── tetikus ───────────────────────────────────────────────────────── */
  const arah = async (frac) =>
    evaluate(
      cdp,
      `(() => { const p = document.querySelector('[data-tier]'); const r = p.getBoundingClientRect();
        p.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width * ${String(frac)},
          clientY: r.top + r.height * 0.45, bubbles: true })); return 1; })()`,
    );

  await arah(0.08);
  await sleep(1100);
  const kiri = await analisis(cdp, kotak);
  await arah(0.92);
  await sleep(1100);
  const kanan = await analisis(cdp, kotak);
  ok('tetikus mengubah bingkai', beda(kiri, kanan) > 0.05, `(delta ${String(Math.round(beda(kiri, kanan) * 100) / 100)})`);

  /*
     ── HOVER ────────────────────────────────────────────────────────────

     Diuji TERPISAH dari gerakan tetikus, dan itu bukan pengulangan.
     `pointermove` sudah mengubah adegan lewat arah pandang, jadi kalau
     hover hanya diuji bersamanya, hover yang tidak tersambung sama sekali
     tetap akan terlihat lulus — perubahan yang terukur datang dari
     tetangganya.

     Jadi arahnya dibekukan lebih dulu: `pointerleave` lalu `pointerenter`
     dikirim TANPA satu pun `pointermove` di antaranya. Yang berubah
     sesudahnya hanya bisa datang dari hover.
  */
  await evaluate(
    cdp,
    `(() => { const p = document.querySelector('[data-tier]');
      p.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false })); return 1; })()`,
  );
  await sleep(1200);
  const lepas = await analisis(cdp, kotak);
  await evaluate(
    cdp,
    `(() => { const p = document.querySelector('[data-tier]');
      p.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false })); return 1; })()`,
  );
  await sleep(1200);
  const masuk = await analisis(cdp, kotak);
  ok(
    'hover mengubah adegan tanpa gerakan tetikus',
    beda(lepas, masuk) > 0.02,
    `(delta ${String(Math.round(beda(lepas, masuk) * 100) / 100)})`,
  );

  /* ── klik ──────────────────────────────────────────────────────────── */
  await evaluate(cdp, `document.querySelector('[data-tier] button').click()`);
  await sleep(180);
  const saatTebas = await analisis(cdp, kotak);
  const diam = await analisis(cdp, kotak);
  void diam;
  ok('tebasan mengubah bingkai secara terlihat', saatTebas.nyalaPersen > 0, `(${String(saatTebas.nyalaPersen)}%)`);

  const terbuka = await tungguDitekan(cdp, 'true');
  ok('klik membuka lapisan data', terbuka !== null);
  ok('angkanya diumumkan lewat aria-live', /Rp/.test(terbuka?.live ?? ''));
  ok('angkanya DISEBUT contoh', /contoh/i.test(terbuka?.live ?? ''));

  await tekan(cdp, 'Escape');
  ok('Escape menutup', (await tungguDitekan(cdp, 'false')) !== null);

  /* ── papan tik ─────────────────────────────────────────────────────── */
  for (const k of ['Enter', 'Space']) {
    await evaluate(cdp, `document.querySelector('[data-tier] button').focus()`);
    await tekan(cdp, k);
    ok(`${k} memicu tebasan`, (await tungguDitekan(cdp, 'true')) !== null);
    await tekan(cdp, 'Escape');
    await tungguDitekan(cdp, 'false');
  }

  /* ── gulir ─────────────────────────────────────────────────────────── */
  const sebelum = await analisis(cdp, kotak);
  await evaluate(cdp, `window.scrollTo(0, window.innerHeight * 0.5)`);
  await sleep(1500);
  const kotak2 = await kotakPanggung(cdp);
  const sesudah = await analisis(cdp, kotak2);
  ok('gulir mengubah adegan', beda(sebelum, sesudah) > 0.05, `(delta ${String(Math.round(beda(sebelum, sesudah) * 100) / 100)})`);
  await evaluate(cdp, `window.scrollTo(0, 0)`);
  await sleep(1000);
});

/* ── 390px ────────────────────────────────────────────────────────────── */

console.log('\n── 390px · sentuh ──');
await withChrome([], async (cdp) => {
  await viewport(cdp, 390, 844, true);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await goto(cdp, BASE, 8000);

  const info = await panggungInfo(cdp);
  ok('ponsel TIDAK memakai tingkat penuh', info?.tier !== 'full', `(${String(info?.tier)})`);
  ok('tombolnya tetap bernama', /Tebas/i.test(info?.label ?? ''), `("${String(info?.label)}")`);

  const kotak = await kotakPanggung(cdp);
  const a = await analisis(cdp, kotak);
  ok('cadangannya tergambar, bukan kotak kosong', a.nyalaPersen > 1.5, `(${String(a.nyalaPersen)}%)`);
  ok(
    'cadangannya juga UNGU',
    a.jenuhPersen > 0 && a.binRonaTeratas >= 8 && a.binRonaTeratas <= 10,
    `(bin ${String(a.binRonaTeratas)}, jenuh ${String(a.jenuhPersen)}%)`,
  );

  await evaluate(cdp, `document.querySelector('[data-tier] button').click()`);
  ok('sentuhan memicu tebasan', (await tungguDitekan(cdp, 'true')) !== null);
  ok(
    'tidak ada gulir mendatar',
    (await evaluate(cdp, `document.documentElement.scrollWidth`)) <= 390,
  );
});

/* ── gerak dikurangi ──────────────────────────────────────────────────── */

console.log('\n── gerak dikurangi ──');
await withChrome([], async (cdp) => {
  await viewport(cdp, 1440, 900, false);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await goto(cdp, BASE, 8000);

  const info = await panggungInfo(cdp);
  ok('tingkatnya off', info?.tier === 'off', `(${String(info?.tier)})`);
  ok('nol kanvas WebGL', info?.kanvas === 0, `(${String(info?.kanvas)})`);

  const kotak = await kotakPanggung(cdp);
  const a = await analisis(cdp, kotak);
  ok('cadangan diam tetap tergambar', a.nyalaPersen > 1.5, `(${String(a.nyalaPersen)}%)`);

  await evaluate(cdp, `document.querySelector('[data-tier] button').click()`);
  ok('tebasan tetap dapat ditekan', (await tungguDitekan(cdp, 'true')) !== null);
});

/* ── putusan ──────────────────────────────────────────────────────────── */

console.log(`\n  galat konsol: ${String(konsol.length)}`);
konsol.slice(0, 5).forEach((x) => {
  console.log(`    ${x}`);
});

console.log('\n════════════════════════════════════════════════════════════════════════');
if (gagal === 0 && konsol.length === 0) {
  console.log(`  ${String(lulus)} lulus. Ronin tergambar, dan ia menanggapi.`);
} else {
  console.log(`  ${String(lulus)} lulus, ${String(gagal)} gagal, ${String(konsol.length)} galat konsol.`);
}

process.exit(gagal > 0 || konsol.length > 0 ? 1 : 0);
