#!/usr/bin/env node
/**
 * Gerbang AKSESIBILITAS.
 *
 * ── APA YANG DIJAGA, DAN MENGAPA GERBANG LAIN TIDAK BISA ───────────────
 *
 * `contrast` menjaga rasio warna. `interior` menjaga bentuk halaman.
 * `alur` menjaga fiturnya bekerja. Tidak satu pun dari ketiganya menjawab
 * pertanyaan yang paling menentukan: APAKAH HALAMAN INI DAPAT DIPAKAI TANPA
 * TETIKUS, DAN APAKAH ORANG TAHU DI MANA FOKUSNYA SEDANG BERADA.
 *
 * ── MENGAPA IA MENEKAN TAB SUNGGUHAN ───────────────────────────────────
 *
 * Urutan fokus dapat ditebak dari DOM, dan tebakan itu salah setiap kali ada
 * `position`, `order`, atau portal. Gerbang ini tidak menebak: ia mengirim
 * penekanan Tab lewat `Input.dispatchKeyEvent` dan membaca
 * `document.activeElement` sesudah masing-masing. Yang terukur karena itu
 * adalah urutan yang BENAR-BENAR dialami pengguna papan tik.
 *
 * Modalitas juga penting. `:focus-visible` hanya menyala kalau peramban yakin
 * fokusnya datang dari papan tik; `el.focus()` dari JavaScript tidak
 * meyakinkannya. Menekan Tab sungguhan menghilangkan seluruh keraguan itu.
 *
 * ── DIBANGUN SEBELUM DESAIN ULANG, BUKAN SESUDAH ───────────────────────
 *
 * Enam belas halaman akan didesain ulang. Gerbang yang lahir sesudahnya hanya
 * bisa mengaudit; gerbang yang lahir sebelumnya ikut merancang. Alasan yang
 * sama dengan menulis uji sebelum refaktor.
 *
 * Jalankan:
 *   npm run build && ./node_modules/.bin/next start -p 3100
 *   node scripts/akses.mjs --email you@contoh.id --password '…'
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = arg('base', 'http://localhost:3100');
const EMAIL = arg('email');
const PASSWORD = arg('password');

if (!EMAIL || !PASSWORD) {
  console.error('Butuh --email dan --password: halaman di balik login adalah inti gerbang ini.');
  process.exit(2);
}

/** Halaman publik — diperiksa SEBELUM masuk, karena sesudahnya ia mengalihkan. */
const PUBLIK = [
  ['muka', '/'],
  ['masuk', '/masuk'],
  ['daftar', '/daftar'],
  ['pulihkan', '/pulihkan'],
];

const INTERIOR = [
  ['dasbor', '/dasbor'],
  ['transaksi', '/transaksi'],
  ['dompet', '/dompet'],
  ['anggaran', '/anggaran'],
  ['tujuan', '/tujuan'],
  ['berulang', '/berulang'],
  ['analitik', '/analitik'],
  ['wawasan', '/wawasan'],
  ['asisten', '/asisten'],
  ['laporan', '/laporan'],
  ['profil', '/profil'],
  ['keamanan', '/keamanan'],
  ['pengaturan', '/pengaturan'],
];

const LAYAR = [
  ['lebar', 1440, 900, false],
  ['ponsel', 390, 844, true],
];

/** Tombol yang MEMBUKA dialog. "Pindai struk" dan "Impor CSV" sengaja tidak
 *  ikut: keduanya membuka pemilih berkas milik sistem, bukan dialog halaman. */
const PEMBUKA_DIALOG = /^(Catat transaksi|Buat aturan|Buat tujuan|Tambah dompet|Buat anggaran|Buat dompet)$/;

let lulus = 0;
let gagal = 0;
const temuan = [];

function ok(nama, syarat, extra = '') {
  if (syarat) {
    lulus += 1;
  } else {
    gagal += 1;
    temuan.push(`${nama} ${extra}`);
    console.log(`  GAGAL ${nama} ${extra}`);
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

const PORT = 9447;
const PROFIL = mkdtempSync(join(tmpdir(), 'kz-akses-'));
const konsol = [];

async function withChrome(fn) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      `--user-data-dir=${PROFIL}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
    ],
    { stdio: 'ignore' },
  );

  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i += 1) {
      try {
        const daftar = await (await fetch(`http://127.0.0.1:${String(PORT)}/json/list`)).json();
        target = daftar.find((t) => t.type === 'page') ?? null;
      } catch {
        /* belum siap */
      }
      /* Tidur DI LUAR catch: Chrome menjawab /json/list sebelum target
         halamannya ada, jadi enam puluh percobaan habis dalam milidetik. */
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('Chrome tidak pernah menjawab');

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

const goto = async (cdp, url, wait = 3500) => {
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

async function tekan(cdp, key, { shift = false } = {}) {
  const kode = { Tab: 9, Escape: 27, Enter: 13 }[key];
  const params = {
    windowsVirtualKeyCode: kode,
    nativeVirtualKeyCode: kode,
    code: key,
    key,
    modifiers: shift ? 8 : 0,
  };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...params });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
}

/* ── potongan yang disuntik ke halaman ────────────────────────────────── */

/**
 * Nama ter-akses, dihitung mendekati spesifikasi accname.
 *
 * Bukan implementasi penuh — yang penuh butuh pohon aksesibilitas peramban.
 * Yang di sini menutup seluruh bentuk yang benar-benar dipakai basis kode ini,
 * dan urutannya mengikuti urutan spesifikasi: aria-label, aria-labelledby,
 * <label>, teks, alt gambar di dalamnya, lalu title.
 */
const ACCNAME = `
  const teksDari = (ids) => (ids || '').split(/\\s+/).filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
  const accName = (el) => {
    const l = el.getAttribute('aria-label'); if (l && l.trim()) return l.trim();
    const lb = teksDari(el.getAttribute('aria-labelledby')); if (lb) return lb;
    if (el.labels && el.labels.length) {
      const t = [...el.labels].map(x => x.textContent).join(' ').trim(); if (t) return t;
    }
    const teks = (el.innerText || '').trim(); if (teks) return teks;
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && img.alt.trim()) return img.alt.trim();
    const ttl = el.getAttribute('title'); if (ttl && ttl.trim()) return ttl.trim();
    if (el.value && (el.type === 'submit' || el.type === 'button')) return String(el.value).trim();
    return '';
  };`;

/** Terlihat DAN terpapar. Yang `display:none` tidak ada di pohon aksesibilitas
 *  sama sekali, jadi menuntut label untuknya adalah temuan palsu. */
const TERLIHAT = `
  const terlihat = (el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden'
        && r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]');
  };`;

const PENANDA = `
  const penanda = (el) => el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (el.className ? '.' + String(el.className).trim().split(/\\s+/).slice(0,2).join('.') : '')
    + ' «' + (accName(el) || (el.innerText||'').trim() || '').slice(0,28) + '»';`;

/* ── pemeriksaan statis ───────────────────────────────────────────────── */

/**
 * Halaman yang TIDAK menuntut wilayah aria-live.
 *
 * Wilayah langsung ada untuk mengumumkan perubahan yang terjadi tanpa
 * berpindah halaman: roti panggang, galat formulir, hasil yang tiba. Halaman
 * muka hari ini statis — ia hanya bercerita lalu menautkan ke pendaftaran.
 * Menuntut wilayah langsung di sana berarti memaksa menambahkan wilayah kosong
 * yang tidak akan pernah mengumumkan apa pun, dan wilayah kosong melatih
 * pembaca layar mengabaikan wilayah yang sungguhan.
 *
 * MASUK DAFTAR saat T4 mendarat: tebasan mengubah isi halaman tanpa navigasi,
 * dan sejak itu ia wajib mengumumkan dirinya.
 */
const TANPA_LIVE = new Set(['muka']);

async function periksaStatis(cdp, nama, layar) {
  const f = await evaluate(
    cdp,
    `(() => { ${ACCNAME} ${TERLIHAT} ${PENANDA}
      const fokusabel = [...document.querySelectorAll(
        'a[href],button,input:not([type=hidden]),select,textarea,[tabindex],[contenteditable=""],[contenteditable="true"]')]
        .filter(el => terlihat(el) && el.getAttribute('tabindex') !== '-1' && !el.disabled);

      const heading = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(terlihat).map(h => ({ level: Number(h.tagName[1]), teks: h.innerText.trim().slice(0,40) }));
      const lompat = [];
      for (let i = 1; i < heading.length; i += 1) {
        if (heading[i].level - heading[i-1].level > 1) {
          lompat.push('h' + heading[i-1].level + ' -> h' + heading[i].level + ' pada "' + heading[i].teks + '"');
        }
      }

      return {
        fokusabel: fokusabel.length,
        tanpaNama: fokusabel.filter(el => !accName(el)).map(penanda),
        tabindexPositif: [...document.querySelectorAll('[tabindex]')]
          .filter(e => Number(e.getAttribute('tabindex')) > 0).map(penanda),
        main: document.querySelectorAll('main').length,
        h1: [...document.querySelectorAll('h1')].filter(terlihat).length,
        lompatHeading: lompat,
        kontrolTanpaLabel: [...document.querySelectorAll(
            'input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')]
          .filter(el => terlihat(el))
          .filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
          .map(penanda),
        gambarTanpaAlt: [...document.querySelectorAll('img')].filter(terlihat)
          .filter(el => el.getAttribute('alt') === null).map(penanda),
        svgTelanjang: [...document.querySelectorAll('svg')]
          .filter(s => !s.hasAttribute('aria-hidden') && !s.hasAttribute('aria-label')
                    && !s.hasAttribute('role') && !s.closest('[aria-hidden="true"]')
                    && !s.closest('button,a,[role=button]'))
          .length,
        /* LELUHURNYA ikut dihitung, sama seperti setiap pemeriksaan lain di
           berkas ini. React Three Fiber merender kanvasnya di dalam sebuah div
           pembungkus, dan aria-hidden yang diberikan ke komponen Canvas
           mendarat di pembungkus itu — kanvasnya memang tersembunyi dari pohon
           aksesibilitas, hanya bukan lewat atributnya sendiri.

           Tanpa backtick di komentar ini, dan itu disengaja: potongan ini
           hidup di dalam template literal, dan satu backtick menutup
           stringnya. Jebakan yang sama pernah menjatuhkan interior.mjs. */
        kanvasTelanjang: [...document.querySelectorAll('canvas')]
          .filter(c => !c.hasAttribute('aria-hidden') && !c.hasAttribute('aria-label')
                    && !c.closest('[aria-hidden="true"]')).map(penanda),
        live: document.querySelectorAll('[aria-live],[role=status],[role=alert]').length,
      };
    })()`,
  );

  const p = `${nama}/${layar}`;
  ok(`${p} · setiap kontrol punya nama`, f.tanpaNama.length === 0, JSON.stringify(f.tanpaNama.slice(0, 4)));
  ok(`${p} · tidak ada tabindex positif`, f.tabindexPositif.length === 0, JSON.stringify(f.tabindexPositif.slice(0, 3)));
  ok(`${p} · tepat satu <main>`, f.main === 1, `(${String(f.main)})`);
  ok(`${p} · tepat satu <h1> terlihat`, f.h1 === 1, `(${String(f.h1)})`);
  ok(`${p} · heading tidak melompat tingkat`, f.lompatHeading.length === 0, JSON.stringify(f.lompatHeading.slice(0, 3)));
  ok(`${p} · setiap kolom formulir berlabel`, f.kontrolTanpaLabel.length === 0, JSON.stringify(f.kontrolTanpaLabel.slice(0, 4)));
  ok(`${p} · setiap gambar punya alt`, f.gambarTanpaAlt.length === 0, JSON.stringify(f.gambarTanpaAlt.slice(0, 3)));
  ok(`${p} · tidak ada svg telanjang`, f.svgTelanjang === 0, `(${String(f.svgTelanjang)})`);
  ok(`${p} · setiap kanvas berlabel atau disembunyikan`, f.kanvasTelanjang.length === 0, JSON.stringify(f.kanvasTelanjang));
  if (!TANPA_LIVE.has(nama)) ok(`${p} · ada wilayah aria-live`, f.live > 0, `(${String(f.live)})`);

  return f.fokusabel;
}

/* ── penjelajahan papan tik SUNGGUHAN ─────────────────────────────────── */

/**
 * Menekan Tab berulang kali dan mencatat apa yang benar-benar terjadi.
 *
 * Satu lintasan menjawab empat pertanyaan sekaligus: berapa titik henti yang
 * ada, apakah fokusnya TERLIHAT di masing-masing, apakah urutannya melompat
 * mundur, dan apakah ada jebakan yang tidak bisa ditinggalkan.
 */
async function jelajahTab(cdp, nama, layar, perkiraan) {
  /*
   * Dua persiapan sekaligus.
   *
   * 1. Potret gaya SEBELUM difokus, supaya "terlihat" berarti BERUBAH saat
   *    difokus — bukan sekadar punya bayangan yang memang selalu ada.
   * 2. Nomor unik pada setiap elemen. Versi pertama gerbang ini mengenali
   *    elemen dari labelnya yang dipotong, dan sepuluh baris sesi yang
   *    seluruhnya bernama "Akhiri sesi Chrome (headless…)" terbaca sebagai
   *    satu elemen yang berulang — yaitu jebakan papan tik yang tidak pernah
   *    ada. Nomor tidak pernah bertabrakan.
   */
  await evaluate(
    cdp,
    `(() => { ${TERLIHAT}
      window.__akses = new Map();
      let n = 0;
      for (const el of document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')) {
        if (!terlihat(el)) continue;
        el.setAttribute('data-akses-idx', String(n)); n += 1;
        const cs = getComputedStyle(el);
        window.__akses.set(el, cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.boxShadow);
      }
      document.body.focus();
      return n;
    })()`,
  );

  const batas = Math.min(Math.max(perkiraan + 6, 12), 100);
  const henti = [];
  const tanpaTanda = [];
  let terjebak = null;
  let berturut = 0;

  for (let i = 0; i < batas; i += 1) {
    await tekan(cdp, 'Tab');
    const a = await evaluate(
      cdp,
      `(() => { ${ACCNAME} ${PENANDA}
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const cs = getComputedStyle(el);
        const kini = cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.boxShadow;
        const awal = (window.__akses && window.__akses.get(el)) || '';
        const r = el.getBoundingClientRect();
        const tanah = el.closest('nav,header,main,aside,footer,[role=dialog]');
        return {
          idx: el.getAttribute('data-akses-idx'),
          tanda: penanda(el),
          atas: Math.round(r.top),
          tanah: tanah ? tanah.tagName + (tanah.getAttribute('role') || '') : '-',
          berubah: awal !== '' && kini !== awal,
          adaCincin: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
        };
      })()`,
    );

    /* Fokus keluar dari dokumen — itu ujung yang wajar, bukan jebakan. */
    if (a === null) break;

    const terakhir = henti[henti.length - 1];
    if (terakhir && a.idx !== null && a.idx === terakhir.idx) {
      /*
       * Elemen yang sama dua kali BELUM tentu jebakan.
       *
       * `<input type="date">` punya ruas hari/bulan/tahun di dalamnya, dan Tab
       * berpindah antar-ruas sementara `document.activeElement` tidak berubah.
       * Tiga ruas berarti tiga pengulangan yang sah. Yang lebih dari itu tidak
       * punya penjelasan selain fokus yang tidak bisa pergi.
       */
      berturut += 1;
      if (berturut > 3) {
        terjebak = a.tanda;
        break;
      }
      continue;
    }
    berturut = 0;

    /* Sudah berputar kembali ke awal: satu siklus penuh, berhenti. */
    if (henti.length > 0 && a.idx !== null && a.idx === henti[0].idx) break;

    if (!a.berubah && !a.adaCincin) tanpaTanda.push(a.tanda);
    henti.push(a);
  }

  const p = `${nama}/${layar}`;
  ok(`${p} · fokus terlihat di setiap titik henti`, tanpaTanda.length === 0, JSON.stringify(tanpaTanda.slice(0, 4)));
  ok(`${p} · tidak ada jebakan papan tik`, terjebak === null, terjebak ? `(${terjebak})` : '');

  /*
   * Lompatan mundur DI DALAM satu wilayah saja yang dilaporkan.
   *
   * Versi pertama gerbang ini hanya mengukur jaraknya, dan menuduh setiap
   * halaman: fokus yang berpindah dari "Pengaturan" — item terakhir di kaki
   * bilah sisi — ke kotak "Cari" di kepala halaman melompat ratusan piksel ke
   * atas, dan itu justru urutan yang BENAR. Bilah sisi memang dilewati lebih
   * dulu, seluruhnya, baru isi halaman.
   *
   * Yang benar-benar cacat adalah lompatan mundur di dalam WILAYAH yang sama
   * — di sana tidak ada alasan struktural apa pun, dan yang tersisa hanyalah
   * susunan DOM yang tidak sejalan dengan susunan yang dilihat mata.
   */
  const mundur = [];
  for (let i = 1; i < henti.length; i += 1) {
    const dari = henti[i - 1];
    const ke = henti[i];
    if (dari.tanah === ke.tanah && dari.atas - ke.atas > 240) {
      mundur.push(`${dari.tanah}: ${dari.tanda} -> ${ke.tanda}`);
    }
  }
  ok(`${p} · urutan fokus tidak melompat jauh ke atas`, mundur.length === 0, JSON.stringify(mundur.slice(0, 2)));

  return henti.length;
}

/* ── fokus dialog ─────────────────────────────────────────────────────── */

async function periksaDialog(cdp, nama) {
  const pembuka = await evaluate(
    cdp,
    `(() => {
      const b = [...document.querySelectorAll('button')]
        .find(x => ${PEMBUKA_DIALOG.toString()}.test(x.textContent.trim()) && !x.disabled);
      if (!b) return null;
      b.setAttribute('data-akses-pembuka', '1');
      return b.textContent.trim();
    })()`,
  );
  if (!pembuka) return false;

  /* DIFOKUS lebih dulu, baru diklik. Menekan tombol dengan tetikus memang
     memfokusnya; `.click()` dari kode tidak. Tanpa ini, fokus saat dialog
     terbuka ada di <body>, dan pemeriksaan "kembali ke pembukanya" menguji
     keadaan yang tidak pernah dialami manusia mana pun. */
  await evaluate(
    cdp,
    `(() => { const b = document.querySelector('[data-akses-pembuka]'); b.focus(); b.click(); })()`,
  );
  await sleep(900);

  const masuk = await evaluate(
    cdp,
    `(() => { const d = document.querySelector('[role=dialog]');
      return d ? d.contains(document.activeElement) : null; })()`,
  );
  ok(`${nama} · dialog memindahkan fokus ke dalam`, masuk === true, `(${String(masuk)})`);

  await tekan(cdp, 'Escape');
  await sleep(700);

  const kembali = await evaluate(
    cdp,
    `(() => {
      const tertutup = !document.querySelector('[role=dialog]');
      const b = document.querySelector('[data-akses-pembuka]');
      return { tertutup, kembali: b === document.activeElement };
    })()`,
  );
  ok(`${nama} · Escape menutup dialog`, kembali.tertutup === true);
  ok(`${nama} · fokus kembali ke pembukanya`, kembali.kembali === true);
  return true;
}

/* ── masuk ────────────────────────────────────────────────────────────── */

async function masuk(cdp) {
  await goto(cdp, `${BASE}/masuk`, 3000);
  await evaluate(
    cdp,
    `(() => {
      const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
        el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
      const inp=[...document.querySelectorAll('input')];
      set(inp.find(i=>i.type==='email'), ${JSON.stringify(EMAIL)});
      set(inp.find(i=>i.type==='password'), ${JSON.stringify(PASSWORD)});
    })()`,
  );
  await sleep(400);
  await evaluate(cdp, `document.querySelector('button[type=submit]').click()`);

  for (let i = 0; i < 40; i += 1) {
    if ((await evaluate(cdp, `location.pathname`)) !== '/masuk') return;
    await sleep(500);
  }
  throw new Error('tidak pernah masuk — periksa kredensial dan API');
}

/* ── jalan ────────────────────────────────────────────────────────────── */

console.log(`Gerbang aksesibilitas → ${BASE}\n`);

const tabStop = {};

await withChrome(async (cdp) => {
  /* Halaman publik lebih dulu, selagi belum ada sesi: sesudah masuk,
     /masuk dan /daftar mengalihkan dan tidak dapat diperiksa lagi. */
  for (const [layar, w, h, mobile] of LAYAR) {
    console.log(`── ${layar} ${String(w)}px · publik ──`);
    await viewport(cdp, w, h, mobile);
    for (const [nama, jalur] of PUBLIK) {
      await goto(cdp, `${BASE}${jalur}`, 4000);
      const n = await periksaStatis(cdp, nama, layar);
      tabStop[`${nama}/${layar}`] = await jelajahTab(cdp, nama, layar, n);
    }
  }

  await viewport(cdp, 1440, 900, false);
  await masuk(cdp);
  await sleep(2000);

  for (const [layar, w, h, mobile] of LAYAR) {
    console.log(`── ${layar} ${String(w)}px · interior ──`);
    await viewport(cdp, w, h, mobile);
    for (const [nama, jalur] of INTERIOR) {
      await goto(cdp, `${BASE}${jalur}`, 5000);
      const n = await periksaStatis(cdp, nama, layar);
      tabStop[`${nama}/${layar}`] = await jelajahTab(cdp, nama, layar, n);
    }
  }

  /* Dialog diperiksa di lebar saja — perilaku fokusnya tidak bergantung
     lebar, dan membukanya dua kali hanya melipatgandakan waktu. */
  console.log('── dialog ──');
  await viewport(cdp, 1440, 900, false);
  for (const [nama, jalur] of INTERIOR) {
    await goto(cdp, `${BASE}${jalur}`, 4500);
    await periksaDialog(cdp, nama);
  }
});

/* ── hitungan titik henti ─────────────────────────────────────────────── */

console.log('\n  Titik henti Tab per halaman — halaman yang angkanya berubah');
console.log('  kelak adalah halaman yang strukturnya berubah:\n');
const kunci = Object.keys(tabStop).sort();
for (let i = 0; i < kunci.length; i += 3) {
  console.log(
    '   ' +
      kunci
        .slice(i, i + 3)
        .map((k) => `${k.padEnd(20)}${String(tabStop[k]).padStart(3)}`)
        .join('   '),
  );
}

console.log(`\n  galat konsol: ${String(konsol.length)}`);
konsol.slice(0, 5).forEach((x) => {
  console.log(`    ${x}`);
});

console.log('\n════════════════════════════════════════════════════════════════════════');
if (gagal === 0 && konsol.length === 0) {
  console.log(`  ${String(lulus)} pemeriksaan lulus. Dapat dipakai tanpa tetikus.`);
} else {
  console.log(`  ${String(lulus)} lulus, ${String(gagal)} gagal, ${String(konsol.length)} galat konsol.`);
}

process.exit(gagal > 0 || konsol.length > 0 ? 1 : 0);
