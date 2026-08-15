#!/usr/bin/env node
/**
 * Gerbang GRAFIS: anggaran performa yang DIUKUR, bukan diharapkan.
 *
 * ── MENGAPA IA ADA ─────────────────────────────────────────────────────
 *
 * ROADMAP §7 aturan 4 berbunyi "target 60 FPS adalah syarat kelulusan, bukan
 * cita-cita". Sejak ditulis, tidak ada satu pun yang menegakkannya. Aturan
 * tanpa penegak adalah niat, dan niat tidak menahan apa pun ketika adegan
 * bertambah satu efek lagi.
 *
 * Berkas ini menegakkannya. Ia dibangun SEBELUM samurainya mendarat, dengan
 * alasan yang sama seperti `akses` dibangun sebelum desain ulang: gerbang yang
 * lahir sesudah pekerjaan hanya bisa mengaudit; yang lahir sebelumnya ikut
 * merancang.
 *
 * ── APA YANG DIUKUR, DAN YANG SENGAJA TIDAK ────────────────────────────
 *
 * Diukur: laju bingkai saat diam, bobot JavaScript, tingkat perangkat yang
 * benar-benar dipilih, keterbacaan salinan sebelum WebGL menyala, kebocoran
 * konteks antar-halaman, dan cadangan saat gerak dikurangi.
 *
 * TIDAK diukur: apakah adegannya indah. Tidak ada angka untuk itu, dan gerbang
 * yang berpura-pura punya akan mengubah selera menjadi kegagalan build.
 *
 * ── KEJUJURAN TENTANG PERENDER PERANGKAT LUNAK ─────────────────────────
 *
 * Chrome headless sering jatuh ke SwiftShader — perender perangkat lunak yang
 * tiga sampai sepuluh kali lebih lambat dari GPU mana pun. Menegaskan 55 fps di
 * atasnya berarti gerbang yang selalu merah di CI dan selalu hijau di laptop,
 * yaitu gerbang yang tidak berarti apa-apa.
 *
 * Jadi perendernya DIBACA lebih dulu. Kalau perangkat lunak, angka fps
 * dilaporkan sebagai keterangan dan penegasannya DILEWATI dengan mengatakannya
 * — bukan diam-diam diluluskan.
 *
 * Jalankan:
 *   npm run build && ./node_modules/.bin/next start -p 3100
 *   node scripts/grafis.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

/**
 * Berapa lama menunggu Chrome membuka target halamannya.
 *
 * 160 x 250ms = 40 detik. Lihat catatan yang sama di skrip gerbang lain:
 * lima belas detik cukup di laptop panas dan tidak cukup di runner dingin.
 */
const MAKS_TARGET = 160;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = arg('base', 'http://localhost:3100');

/**
 * Langit-langit bobot JavaScript halaman muka, dalam kilobita terkirim.
 *
 * Angka ini DICATAT, bukan ditebak: ia diukur pada jalanan pertama gerbang ini
 * dan dituliskan di sini. Toleransinya 15% — cukup untuk perubahan wajar,
 * tidak cukup untuk menelan satu pustaka baru tanpa ada yang sadar.
 *
 * Kalau ia perlu dinaikkan, naikkan DENGAN commit yang menjelaskan apa yang
 * ditambahkan dan mengapa itu layak. Menaikkannya diam-diam mengubah gerbang
 * ini menjadi stempel.
 */
const LANGIT_JS_KB = 1100;
const TOLERANSI = 1.15;

/**
 * Langit-langit MODEL 3D, terpisah dari JavaScript.
 *
 * ── MENGAPA ANGGARAN KEDUA, BUKAN MENUMPANG YANG PERTAMA ───────────────
 *
 * `LANGIT_JS_KB` mengukur JavaScript, dan hanya JavaScript. Ketika karakter
 * pindah dari primitif dalam kode ke sebuah GLB, beratnya berpindah ke kelas
 * aset yang TIDAK DIUKUR gerbang mana pun — bundelnya justru mengecil,
 * angkanya membaik, dan megabita masuk tanpa satu pemeriksaan pun
 * menyentuhnya. Gerbang yang membaik ketika beban bertambah adalah gerbang
 * yang berbohong.
 *
 * ── DINAIKKAN 280 -> 3200, DAN INI SELURUH DASARNYA ────────────────────
 *
 * 280 KiB benar untuk model yang dibangun sendiri dari primitif. Ia TIDAK
 * pernah realistis untuk aset berpahat dengan tekstur PBR, dan memaksanya ke
 * sana berarti membuang persis mutu yang membuat aset itu dipilih.
 *
 * Yang dilakukan lebih dulu adalah MENGURANGI, bukan melonggarkan. Angkanya
 * diukur di tiap tahap oleh `scripts/aset/olah-glb.mjs`:
 *
 *   sumber                26,80 MB   557.421 segitiga   3 tekstur 2048²
 *   tekstur -> 1024²       -8,42 MB  (8,98 -> 0,56 MB, turun 16x)
 *   geometri -> kisi 0,022 -15,5 MB  (557.421 -> 58.921 segitiga, turun 9,5x)
 *   indeks uint32 -> uint16                (verteks muat di bawah 65.536)
 *   PRODUKSI               2,90 MB   turun 9,2x dari sumber
 *
 * Sesudah itu 2,90 MB adalah lantainya, bukan pilihan malas: menurunkannya
 * lagi menuntut memangkas siluet yang justru menjadi alasan aset ini ada.
 *
 * Yang membuat angka ini dapat diterima bukan besarnya melainkan SIAPA YANG
 * MEMBAYARNYA. Aset ini hanya diunduh pada tingkat `full`, di belakang
 * `DeferUntilIdle`, sesudah halaman dapat dipakai. Tingkat `lite` dan `off`
 * tidak pernah mengunduh three.js apalagi GLB — ponsel mendapat komposisi DOM,
 * jadi tidak satu byte pun dari angka ini sampai ke sana.
 *
 * Diukur sesudahnya: 179 fps pada tingkat `full`, dan bobot JavaScript tidak
 * bergerak (606 KB).
 *
 * 3200 memberi kelonggaran ~8% di atas 2969 KiB — cukup untuk penyetelan
 * kecil, tidak cukup untuk menelan aset kedua tanpa ada yang sadar.
 *
 * Diukur dari BERKAS di disk, bukan dari lalu lintas jaringan: ukurannya
 * deterministik, tidak bergantung kompresi peladen, dan tetap dapat diperiksa
 * di CI tanpa menyalakan peramban.
 */
const LANGIT_MODEL_KB = 3200;

/** Ambang laju bingkai per tingkat. Di bawah ini adalah kegagalan. */
const AMBANG = { full: 55, lite: 30 };

let lulus = 0;
let gagal = 0;
let dilewati = 0;

function ok(nama, syarat, extra = '') {
  if (syarat) {
    lulus += 1;
    console.log(`  OK      ${nama} ${extra}`);
  } else {
    gagal += 1;
    console.log(`  GAGAL   ${nama} ${extra}`);
  }
}

function lewati(nama, sebab) {
  dilewati += 1;
  console.log(`  LEWAT   ${nama} — ${sebab}`);
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

const PORT = 9448;

async function withChrome(extraArgs, fn) {
  const profil = mkdtempSync(join(tmpdir(), 'kz-grafis-'));
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
      /* Tidur DI LUAR catch — Chrome menjawab /json/list sebelum target
         halamannya ada. */
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

const goto = async (cdp, url, wait = 4500) => {
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

/* ── pengukuran ───────────────────────────────────────────────────────── */

/** Perender yang benar-benar dipakai, dibaca dari WebGL itu sendiri. */
const perender = (cdp) =>
  evaluate(
    cdp,
    `(() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'tidak ada webgl';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const nama = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return String(nama);
      } catch (e) { return 'galat: ' + e.message; }
    })()`,
  );

const LUNAK = /swiftshader|llvmpipe|software|mesa offscreen/i;

/**
 * Laju bingkai selama `detik`, sebagai MEDIAN antar-bingkai.
 *
 * Median dan bukan rata-rata: satu bingkai tersendat 400ms — pengumpul sampah,
 * kompilasi shader — menarik rata-rata jauh ke bawah dan membuat adegan yang
 * mulus terlihat gagal. Median menjawab pertanyaan yang sebenarnya: "seperti
 * apa rasanya SEBAGIAN BESAR waktu".
 */
async function ukurFps(cdp, detik = 10) {
  await evaluate(
    cdp,
    `(() => {
      window.__fps = [];
      let last = performance.now();
      const tick = (t) => { window.__fps.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      return true;
    })()`,
  );
  await sleep(detik * 1000);
  return evaluate(
    cdp,
    `(() => {
      const d = (window.__fps || []).slice(5).sort((a,b) => a-b);
      if (d.length < 10) return null;
      const med = d[Math.floor(d.length / 2)];
      return Math.round(1000 / med);
    })()`,
  );
}

/** Kilobita JavaScript yang benar-benar TERKIRIM, bukan yang diminta. */
const bobotJs = (cdp) =>
  evaluate(
    cdp,
    `(() => {
      const r = performance.getEntriesByType('resource')
        .filter(e => e.initiatorType === 'script' || /\\.js(\\?|$)/.test(e.name));
      const total = r.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0);
      return Math.round(total / 1024);
    })()`,
  );

/* ── jalan ────────────────────────────────────────────────────────────── */

console.log(`Gerbang grafis → ${BASE}\n`);

/* ── 1. tingkat penuh: laju bingkai, bobot, tingkat yang dipilih ──────── */

await withChrome([], async (cdp) => {
  await viewport(cdp, 1440, 900, false);

  /*
   * SALINAN LEBIH DULU, WEBGL BELAKANGAN.
   *
   * Diperiksa pada 900ms — jauh sebelum bundel 3D selesai diunduh dan
   * dikompilasi. Halaman muka yang judulnya baru muncul setelah WebGL menyala
   * adalah halaman yang kosong selama tiga detik pertama di koneksi mana pun
   * yang bukan serat optik, dan tiga detik itulah seluruh kesempatan yang ia
   * punya.
   */
  await cdp.send('Page.navigate', { url: BASE });
  await sleep(900);
  const dini = await evaluate(
    cdp,
    `(() => {
      const h1 = document.querySelector('h1');
      const cta = [...document.querySelectorAll('a,button')].filter(e => e.offsetParent !== null);
      return {
        judul: h1 ? h1.innerText.trim().slice(0, 40) : null,
        cta: cta.length,
        kanvas: document.querySelectorAll('canvas').length,
      };
    })()`,
  );

  console.log('── tingkat penuh · 1440px ──');
  ok('judul terbaca sebelum WebGL menyala', Boolean(dini.judul), `("${String(dini.judul)}")`);
  ok('ada aksi yang dapat diklik sejak awal', dini.cta > 0, `(${String(dini.cta)} tautan/tombol)`);

  await sleep(4000);

  const gpu = await perender(cdp);
  const lunak = LUNAK.test(gpu);
  console.log(`  perender: ${gpu}${lunak ? '  (PERANGKAT LUNAK)' : ''}`);

  const tier = await evaluate(
    cdp,
    `document.querySelector('[data-tier]')?.getAttribute('data-tier') ?? 'tidak ada'`,
  );
  ok('tingkat grafis terbaca di DOM', tier !== 'tidak ada', `(${String(tier)})`);

  const kb = await bobotJs(cdp);
  const langit = Math.round(LANGIT_JS_KB * TOLERANSI);
  /* ── anggaran MODEL 3D ────────────────────────────────────────────────
     Berat yang berpindah dari bundel ke berkas aset tetap berat. Diukur di
     sini supaya perpindahan itu tidak pernah terbaca sebagai penghematan. */
  {
    /*
       SELURUH .glb di `public/`, bukan satu nama berkas.

       Versi pertama memeriksa `public/ronin.glb` — nama yang benar ketika ia
       ditulis, dan diam-diam salah begitu aset produksinya berganti nama
       menjadi `ronin-kustom.glb`. Hasilnya gerbang yang melaporkan 166 KiB
       dengan lapang sementara yang benar-benar diunduh peramban 2,9 MB.

       Gerbang yang menyebut nama berkas hanya menjaga berkas itu. Yang
       dijaga sebenarnya adalah BERAT ASET 3D yang dikirim, jadi yang diukur
       seluruh isinya — dan menambah berkas kedua tidak lagi menjadi cara
       menyelinap lewat.
    */
    const dirPublic = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
    const daftar = existsSync(dirPublic)
      ? readdirSync(dirPublic).filter((f) => f.toLowerCase().endsWith('.glb'))
      : [];
    const kbTotal = daftar.reduce((s2, f) => s2 + statSync(join(dirPublic, f)).size / 1024, 0);
    ok(
      'total model 3D di bawah anggarannya',
      daftar.length > 0 && kbTotal <= LANGIT_MODEL_KB,
      `(${kbTotal.toFixed(1)} KiB / ${String(LANGIT_MODEL_KB)} KiB · ${daftar.join(', ') || 'tidak ada .glb'})`,
    );
  }

  ok(
    `bobot JavaScript di bawah langit-langit`,
    kb <= langit,
    `(${String(kb)} KB, langit ${String(langit)} KB)`,
  );

  const fps = await ukurFps(cdp, 10);
  if (lunak) {
    lewati(
      `laju bingkai tingkat ${String(tier)}`,
      `perender perangkat lunak — ${String(fps)} fps dilaporkan sebagai keterangan, bukan sebagai hasil`,
    );
  } else if (tier === 'full' || tier === 'lite') {
    ok(
      `laju bingkai tingkat ${String(tier)} ≥ ${String(AMBANG[tier])}`,
      (fps ?? 0) >= AMBANG[tier],
      `(${String(fps)} fps)`,
    );
  } else {
    lewati('laju bingkai', `tingkatnya ${String(tier)}, tidak ada yang dianimasikan`);
  }

  /* Kebocoran konteks: pergi dan kembali beberapa kali, lalu pastikan WebGL
     masih dapat dibuat. Konteks yang bocor menghabiskan jatah peramban, dan
     gejalanya baru muncul pada kunjungan kelima — jauh dari tempat sebabnya. */
  for (let i = 0; i < 3; i += 1) {
    await goto(cdp, `${BASE}/masuk`, 1800);
    await goto(cdp, BASE, 2600);
  }
  const masihBisa = await perender(cdp);
  ok(
    'tidak ada kebocoran konteks WebGL antar-halaman',
    !/tidak ada webgl|galat/.test(masihBisa),
    `(${masihBisa.slice(0, 40)})`,
  );
});

/* ── 2. ponsel: tidak boleh tingkat penuh ─────────────────────────────── */

console.log('\n── ponsel 390px ──');
await withChrome([], async (cdp) => {
  await viewport(cdp, 390, 844, true);
  /*
   * `setTouchEmulationEnabled`, BUKAN sekadar `mobile: true`.
   *
   * `detectTier` menuntut `(pointer: coarse)`, dan metrik perangkat saja tidak
   * mengubah jenis penunjuk yang dilaporkan peramban. Tanpa baris ini gerbang
   * melaporkan tingkat `full` di lebar 390px dan menuduh aplikasinya — padahal
   * yang tidak lengkap adalah emulasinya.
   */
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await goto(cdp, BASE, 6000);

  const tier = await evaluate(
    cdp,
    `document.querySelector('[data-tier]')?.getAttribute('data-tier') ?? 'tidak ada'`,
  );
  ok(
    'ponsel TIDAK menjalankan tingkat penuh',
    tier !== 'full',
    `(${String(tier)}) — panas dan baterai, bukan kemampuan`,
  );
});

/* ── 2b. SAKLAR PENGGUNA: mati berarti benar-benar mati ────────────────
   Deteksi perangkat menjawab "sanggupkah", dan tidak pernah dapat menjawab
   "maukah". Saklar yang hanya menyembunyikan adegan tanpa membatalkan
   unduhannya bukan saklar — ia tetap membakar baterai dan kuota yang justru
   ingin dihemat orangnya. Jadi yang diperiksa NOL KANVAS, bukan nol piksel. */

console.log('\n── saklar efek 3D ──');
await withChrome([], async (cdp) => {
  await viewport(cdp, 1440, 900, false);
  await goto(cdp, BASE, 8000);
  const sebelum = await evaluate(cdp, `document.querySelector('[data-tier]')?.getAttribute('data-tier')`);
  ok('bawaan: tingkat penuh', sebelum === 'full', `(${String(sebelum)})`);

  await evaluate(cdp, `localStorage.setItem('kantongz.efek3d','mati')`);
  await goto(cdp, BASE, 8000);
  const tier = await evaluate(cdp, `document.querySelector('[data-tier]')?.getAttribute('data-tier')`);
  const kanvas = await evaluate(cdp, `document.querySelectorAll('[data-tier] canvas').length`);
  const tombol = await evaluate(
    cdp,
    `document.querySelector('[data-tier] button')?.getAttribute('aria-label') ?? ''`,
  );
  ok('dimatikan: tingkat off', tier === 'off', `(${String(tier)})`);
  ok('dimatikan: NOL kanvas WebGL', kanvas === 0, `(${String(kanvas)})`);
  ok('dimatikan: tebasan tetap dapat ditekan', /Tebas/i.test(tombol), `("${String(tombol).slice(0, 26)}")`);

  await evaluate(cdp, `localStorage.removeItem('kantongz.efek3d')`);
  await goto(cdp, BASE, 8000);
  const pulih = await evaluate(cdp, `document.querySelector('[data-tier]')?.getAttribute('data-tier')`);
  ok('dikembalikan ke otomatis: penuh lagi', pulih === 'full', `(${String(pulih)})`);
});

/* ── 3. gerak dikurangi: nol kanvas, dan cadangan yang dirancang ──────── */

console.log('\n── gerak dikurangi ──');
await withChrome([], async (cdp) => {
  await viewport(cdp, 1440, 900, false);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await goto(cdp, BASE, 6000);

  const f = await evaluate(
    cdp,
    `(() => {
      const wadah = document.querySelector('[data-tier]');
      const r = wadah ? wadah.getBoundingClientRect() : null;
      return {
        tier: wadah ? wadah.getAttribute('data-tier') : 'tidak ada',
        kanvas: document.querySelectorAll('canvas').length,
        tinggi: r ? Math.round(r.height) : 0,
        /*
         * Bagian yang BENAR-BENAR TERCAT, bukan jumlah teks atau <svg>.
         *
         * Versi pertama pemeriksaan ini menghitung innerText dan elemen
         * gambar, lalu menuduh cadangan yang justru dirancang dengan baik:
         * siluetnya digambar dari div ber-latar dan ber-radius, tanpa satu
         * huruf maupun satu <svg> pun. Nol bukan berarti kosong — ia berarti
         * pemeriksanya melihat ke tempat yang salah.
         *
         * Yang ditanyakan sekarang persis yang dimaksud: berapa bagian yang
         * meninggalkan piksel di layar.
         */
        tercat: wadah
          ? [...wadah.querySelectorAll('*')].filter((el) => {
              const cs = getComputedStyle(el);
              const b = el.getBoundingClientRect();
              if (b.width < 2 || b.height < 2) return false;
              const adaLatar = cs.backgroundImage !== 'none'
                || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
              const adaGaris = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0;
              return adaLatar || adaGaris;
            }).length
          : 0,
        judul: document.querySelector('h1')?.innerText.trim().slice(0, 40) ?? null,
      };
    })()`,
  );

  ok('tingkatnya off', f.tier === 'off', `(${String(f.tier)})`);
  ok('nol kanvas WebGL', f.kanvas === 0, `(${String(f.kanvas)})`);
  ok('halamannya tetap punya judul', Boolean(f.judul), `("${String(f.judul)}")`);
  /* Cadangan yang DIRANCANG, bukan persegi kosong. Orang yang meminta gerak
     dikurangi berhak merasa melihat produk yang sama, lebih tenang — bukan
     merasa diberi sisanya. */
  ok(
    'cadangannya komposisi yang dirancang, bukan kotak kosong',
    f.tercat >= 3 && f.tinggi > 40,
    JSON.stringify(f),
  );
});

/* ── 4. WebGL diblokir: menurun, tidak mengosong ──────────────────────── */

console.log('\n── WebGL diblokir ──');
await withChrome(['--disable-3d-apis'], async (cdp) => {
  await viewport(cdp, 1440, 900, false);
  await goto(cdp, BASE, 6000);

  const f = await evaluate(
    cdp,
    `(() => ({
      kanvas: document.querySelectorAll('canvas').length,
      judul: document.querySelector('h1')?.innerText.trim().slice(0, 40) ?? null,
      teks: (document.querySelector('main')?.innerText || '').trim().length,
      tier: document.querySelector('[data-tier]')?.getAttribute('data-tier') ?? 'tidak ada',
    }))()`,
  );

  ok('tanpa WebGL tingkatnya off', f.tier === 'off', `(${String(f.tier)})`);
  ok('halamannya MENURUN, bukan mengosong', f.teks > 200 && Boolean(f.judul), `(${String(f.teks)} karakter)`);
});

/* ── putusan ──────────────────────────────────────────────────────────── */

console.log('\n════════════════════════════════════════════════════════════════════════');
if (gagal === 0) {
  console.log(`  ${String(lulus)} lulus, ${String(dilewati)} dilewati dengan alasan tertulis.`);
  console.log('  Anggaran performa ditegakkan, bukan diharapkan.');
} else {
  console.log(`  ${String(lulus)} lulus, ${String(gagal)} gagal, ${String(dilewati)} dilewati.`);
}

process.exit(gagal > 0 ? 1 : 0);
