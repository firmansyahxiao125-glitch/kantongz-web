#!/usr/bin/env node
/**
 * Gerbang ALUR: empat fitur, dijalankan seperti manusia menjalankannya.
 *
 * ── APA YANG DIJAGA, DAN MENGAPA GERBANG LAIN TIDAK BISA ───────────────
 *
 * `interior.mjs` menjaga BENTUK halaman — satu judul, satu varian, nol
 * kontrol hantu. Uji satuan menjaga aritmetika. Di antara keduanya ada
 * ruang yang tidak dijaga siapa pun: apakah fiturnya benar-benar BEKERJA
 * dari ujung ke ujung, lewat peramban, terhadap API yang sungguhan.
 *
 * Empat alur yang seluruhnya menulis ke pembukuan:
 *
 *   struk     foto -> rancangan -> formulir terisi
 *   berulang  aturan -> dijalankan -> transaksi lahir, sekali saja
 *   impor     berkas -> pratinjau -> masuk; diunggah lagi -> nol kembar
 *   bawaan    sisa anggaran dibawa antar periode, dan dikatakan sebabnya
 *
 * ── TIDAK ADA BERKAS UJI YANG DISIMPAN DI REPOSITORI ───────────────────
 *
 * Gambar struk digambar dari SVG dan difoto headless; berkas CSV ditulis ke
 * direktori sementara. Fixture biner yang ikut ter-commit adalah berkas yang
 * tidak pernah dibaca siapa pun lagi dan tidak dapat diperiksa dalam diff.
 *
 * Jalankan:
 *   docker compose up -d          (di kantongz-api)
 *   npm run build && npx next start -p 3100
 *   node scripts/alur.mjs --email you@contoh.id --password '…'
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
  console.error('Butuh --email dan --password: gerbang ini menuntut sesi sungguhan.');
  process.exit(2);
}

const CAP = String(Date.now()).slice(-6);
const KERJA = mkdtempSync(join(tmpdir(), 'kz-alur-'));

let lulus = 0;
let gagal = 0;
const konsol = [];

function ok(nama, syarat, extra = '') {
  if (syarat) {
    lulus += 1;
    console.log(`  OK    ${nama} ${extra}`);
  } else {
    gagal += 1;
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

const PORT = 9446;

async function withChrome(fn) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${String(PORT)}`,
      `--user-data-dir=${join(KERJA, 'profil')}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
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
      /* Tidur DI LUAR `catch`. Versi pertama gerbang lain hanya tidur ketika
         fetch gagal — dan Chrome menjawab `/json/list` sebelum target
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
  await send('DOM.enable');
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

const goto = async (cdp, url, wait = 3000) => {
  await cdp.send('Page.navigate', { url });
  await sleep(wait);
};

const viewport = (cdp, width, height, mobile = false) =>
  cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });

/** Menyerahkan berkas ke `<input type=file>` ASLI — memicu `change` seperti manusia. */
async function serahkanBerkas(cdp, berkas) {
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: 'input[type=file]',
  });
  if (!nodeId) throw new Error('input berkas tidak ditemukan di halaman ini');
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: [berkas] });
}

/** Menunggu KEADAAN, bukan sekian detik. Peladen dingin membalas jauh lebih lambat. */
async function tunggu(cdp, expr, batas = 40) {
  for (let i = 0; i < batas; i += 1) {
    const nilai = await evaluate(cdp, expr);
    if (nilai) return nilai;
    await sleep(500);
  }
  return null;
}

const klik = (cdp, teks, dalam = 'document') =>
  evaluate(
    cdp,
    `(() => { const b=[...${dalam}.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(teks)});
      if(!b) throw new Error('tombol tidak ada: ' + ${JSON.stringify(teks)}); b.click(); return true; })()`,
  );

const dialog = (cdp) =>
  evaluate(
    cdp,
    `(() => { const d=document.querySelector('[role=dialog]'); if(!d) return null;
      return { judul: d.querySelector('h2')?.textContent.trim() ?? '',
               teks: d.innerText.replace(/\\s+/g,' ').trim(),
               tombol: [...d.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean),
               angka: [...d.querySelectorAll('li p:first-child')].map(p=>p.textContent.trim()) }; })()`,
  );

/* ── alur ─────────────────────────────────────────────────────────────── */

const STRUK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300">
<rect width="100%" height="100%" fill="white"/>
<text x="20" y="45"  font-family="monospace" font-size="24" fill="black">INDOMARET</text>
<text x="20" y="90"  font-family="monospace" font-size="18" fill="black">09/08/2026</text>
<text x="20" y="140" font-family="monospace" font-size="18" fill="black">Kopi Susu      18.000</text>
<text x="20" y="170" font-family="monospace" font-size="18" fill="black">Roti Tawar     22.500</text>
<text x="20" y="230" font-family="monospace" font-size="22" fill="black">TOTAL       Rp 40.500</text>
</svg>`;

async function gambarStruk(cdp) {
  await viewport(cdp, 420, 300);
  await goto(
    cdp,
    `data:text/html,${encodeURIComponent(`<body style="margin:0">${STRUK_SVG}</body>`)}`,
    1200,
  );
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const berkas = join(KERJA, 'struk.png');
  writeFileSync(berkas, Buffer.from(data, 'base64'));
  await viewport(cdp, 1440, 900);
  return berkas;
}

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

  const tiba = await tunggu(cdp, `location.pathname !== '/masuk'`);
  if (!tiba) throw new Error('tidak pernah masuk — periksa kredensial dan API');
  await sleep(2000);
}

async function alurStruk(cdp) {
  console.log('\n--- Struk ---');
  const berkas = await gambarStruk(cdp);

  await goto(cdp, `${BASE}/transaksi`, 4500);
  ok('tombol "Pindai struk" ada', await evaluate(cdp, `[...document.querySelectorAll('button')].some(b=>/Pindai struk/.test(b.textContent))`));
  ok(
    'input berkas tidak dapat di-Tab',
    (await evaluate(cdp, `getComputedStyle(document.querySelector('input[type=file]')).display`)) === 'none',
  );

  await serahkanBerkas(cdp, berkas);
  const d = await tunggu(cdp, `document.querySelector('[role=dialog] h2')?.textContent.trim() ?? ''`);
  ok('dialog terbuka sesudah pindai', d === 'Periksa hasil pindai', `(${String(d)})`);

  const isi = await evaluate(
    cdp,
    `(() => { const d=document.querySelector('[role=dialog]'); if(!d) return null;
      return { jumlah: d.querySelector('input[type=number]')?.value ?? null,
               tanggal: d.querySelector('input[type=date]')?.value ?? null,
               merchant: [...d.querySelectorAll('input[type=text]')].map(i=>i.value).find(x=>x) ?? null,
               teks: d.innerText.replace(/\\s+/g,' ').trim(),
               simpan: [...d.querySelectorAll('button[type=submit]')].map(b=>b.textContent.trim()) }; })()`,
  );

  ok('jumlah terbaca dari struk', isi?.jumlah === '40500', `(${String(isi?.jumlah)})`);
  ok('merchant terbaca', /INDOMARET/i.test(isi?.merchant ?? ''), `(${String(isi?.merchant)})`);
  ok('tanggal terisi', /^\d{4}-\d{2}-\d{2}$/.test(isi?.tanggal ?? ''), `(${String(isi?.tanggal)})`);
  ok('baris sumber diperlihatkan', /TOTAL/i.test(isi?.teks ?? ''));
  ok('menyimpan tetap perbuatan manusia', isi?.simpan?.includes('Catat'), JSON.stringify(isi?.simpan));

  await evaluate(cdp, `document.querySelector('[role=dialog] button[aria-label=Tutup]').click()`);
  await sleep(600);
}

async function alurBerulang(cdp) {
  console.log('\n--- Berulang ---');
  const hariIni = new Date();
  const iso = `${String(hariIni.getFullYear())}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;
  const merchant = `Alur-${CAP}`;

  await goto(cdp, `${BASE}/berulang`, 4500);
  ok('tertaut dari navigasi', (await evaluate(cdp, `document.querySelectorAll('a[href="/berulang"]').length`)) > 0);

  await klik(cdp, 'Buat aturan');
  await sleep(900);
  await evaluate(
    cdp,
    `(() => {
      const set=(el,v)=>{const p = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);
        el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));};
      const D=document.querySelector('[role=dialog]');
      const byLabel=(t)=>{ const l=[...D.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(t));
        return l ? D.querySelector('#'+CSS.escape(l.getAttribute('for'))) : null; };
      set(byLabel('Nama aturan'), 'Uji Alur ${CAP}');
      set(byLabel('Jumlah'), '1750000');
      set(byLabel('Irama'), 'daily');
      set(byLabel('Mulai tanggal'), '${iso}');
      set(byLabel('Merchant'), '${merchant}');
    })()`,
  );
  await sleep(700);

  const kalimat = await evaluate(
    cdp,
    `[...document.querySelectorAll('[role=dialog] p')].map(p=>p.textContent.trim()).find(x=>/^Setiap /.test(x)) ?? ''`,
  );
  ok('irama dijelaskan sebagai kalimat', kalimat === 'Setiap hari', `("${String(kalimat)}")`);

  await evaluate(cdp, `document.querySelector('[role=dialog] button[type=submit]').click()`);
  const kartu = await tunggu(
    cdp,
    `(() => { const li=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Uji Alur ${CAP}'));
      return li ? li.innerText.replace(/\\s+/g,' ').trim() : ''; })()`,
  );
  ok('aturan muncul di daftar', Boolean(kartu));
  ok('menyebut kapan jatuhnya', /Jatuh hari ini/.test(kartu ?? ''));
  ok('menyebut belum pernah tercatat', /belum pernah tercatat/.test(kartu ?? ''));

  await klik(cdp, 'Jalankan sekarang');
  const sesudah = await tunggu(
    cdp,
    `(() => { const li=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Uji Alur ${CAP}'));
      return li && /sudah 1× tercatat/.test(li.textContent) ? li.innerText.replace(/\\s+/g,' ').trim() : ''; })()`,
  );
  ok('hitungannya bertambah sesudah dijalankan', Boolean(sesudah), `(${String(sesudah).slice(0, 70)})`);
  ok('jatuh temponya maju ke besok', /Jatuh besok/.test(sesudah ?? ''));

  /* Dijalankan lagi TIDAK menambah baris kedua. */
  await klik(cdp, 'Jalankan sekarang');
  await sleep(3500);
  await goto(cdp, `${BASE}/transaksi`, 4500);
  const berapa = await evaluate(cdp, `(document.body.innerText.match(/${merchant}/g) ?? []).length`);
  ok('dijalankan dua kali tetap SATU transaksi', berapa === 1, `(${String(berapa)})`);

  /* Dijeda supaya tidak menulis lagi pada jalanan gerbang berikutnya. */
  await goto(cdp, `${BASE}/berulang`, 4000);
  await evaluate(
    cdp,
    `(() => { const li=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Uji Alur ${CAP}'));
      [...li.querySelectorAll('button')].find(b=>b.textContent.trim()==='Jeda').click(); })()`,
  );
  const dijeda = await tunggu(
    cdp,
    `(() => { const li=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Uji Alur ${CAP}'));
      return li && /Dijeda/.test(li.textContent) ? '1' : ''; })()`,
  );
  ok('dapat dijeda', Boolean(dijeda));
}

async function alurImpor(cdp) {
  console.log('\n--- Impor ---');
  /*
   * Nama dompet diambil dari PENYARING halaman Transaksi, satu-satunya tempat
   * daftar dompet muncul apa adanya. Versi pertama gerbang ini menyapu
   * `body.innerText` dengan ekspresi reguler dan memungut "Lompat ke konten" —
   * tautan lewati-navigasi — lalu seluruh lima baris berkas uji ditolak karena
   * dompetnya tidak ada. Gerbang yang menebak nama hanya hijau secara
   * kebetulan.
   */
  await goto(cdp, `${BASE}/transaksi`, 5000);
  const dompetNyata = await evaluate(
    cdp,
    `(() => { const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>/Semua dompet/.test(o.textContent)));
      if(!s) return ''; const o=[...s.options].map(x=>x.textContent.trim()).filter(x=>x && !/^Semua/.test(x));
      return o[0] ?? ''; })()`,
  );

  ok('nama dompet ditemukan untuk berkas uji', Boolean(dompetNyata), `(${String(dompetNyata)})`);
  if (!dompetNyata) return;

  await goto(cdp, `${BASE}/laporan`, 7000);

  const csv = [
    'Tanggal,Jenis,Dompet,Kategori,Merchant,Catatan,Jumlah',
    `14/08/2026,Pengeluaran,${dompetNyata},,Kopi ${CAP},"Rapat pagi, berdua",25.000`,
    `15/08/2026,Pengeluaran,${dompetNyata},,Bensin ${CAP},,150.000`,
    `16/08/2026,Pemasukan,${dompetNyata},,Bonus ${CAP},,2.500.000`,
    `17/08/2026,Pengeluaran,Dompet Yang Tidak Ada,,Hantu ${CAP},,10.000`,
    `kemarin,Pengeluaran,${dompetNyata},,Rusak ${CAP},,10.000`,
  ].join('\r\n');

  const berkas = join(KERJA, `impor-${CAP}.csv`);
  writeFileSync(berkas, `\uFEFF${csv}\r\n`, 'utf8');

  ok(
    'impor berdiri di sebelah ekspor',
    await evaluate(
      cdp,
      `(() => { const b=[...document.querySelectorAll('button')].map(x=>x.textContent.trim());
        return b.some(x=>/Impor CSV/.test(x)) && b.some(x=>/Unduh CSV/.test(x)); })()`,
    ),
  );

  await serahkanBerkas(cdp, berkas);
  let d = await tunggu(cdp, `document.querySelector('[role=dialog] h2')?.textContent.trim() ?? ''`);
  ok('pratinjau terbuka', d === 'Periksa sebelum mengimpor', `(${String(d)})`);

  let isi = await dialog(cdp);
  ok('mengatakan belum ada yang tersimpan', /Belum ada satu baris pun yang tersimpan/.test(isi?.teks ?? ''));
  ok('3 akan masuk, 0 sudah ada, 2 dilewati', JSON.stringify(isi?.angka) === '["3","0","2"]', JSON.stringify(isi?.angka));
  ok('menyebut NOMOR baris yang rusak', /baris 5/.test(isi?.teks ?? '') && /baris 6/.test(isi?.teks ?? ''));

  await klik(cdp, 'Impor 3 baris', `document.querySelector('[role=dialog]')`);
  await sleep(4500);

  await goto(cdp, `${BASE}/transaksi`, 4500);
  const teks = await evaluate(cdp, `document.body.innerText`);
  ok('ketiganya masuk ke buku besar', teks.includes(`Kopi ${CAP}`) && teks.includes(`Bensin ${CAP}`) && teks.includes(`Bonus ${CAP}`));
  ok('yang rusak TIDAK masuk', !teks.includes(`Rusak ${CAP}`) && !teks.includes(`Hantu ${CAP}`));
  ok('titik ribuan dibaca benar', /Rp\s25\.000/.test(teks) && /Rp\s2\.500\.000/.test(teks));
  ok('tanggal hari-dulu dibaca benar', /14 Agu|14 Agustus/.test(teks));

  /* Diunggah lagi: TIDAK menggandakan apa pun. */
  await goto(cdp, `${BASE}/laporan`, 7000);
  await serahkanBerkas(cdp, berkas);
  d = await tunggu(cdp, `document.querySelector('[role=dialog] h2')?.textContent.trim() ?? ''`);
  isi = await dialog(cdp);
  ok('unggah kedua: 0 akan masuk, 3 sudah ada', JSON.stringify(isi?.angka) === '["0","3","2"]', JSON.stringify(isi?.angka));
  ok('tombolnya mati dan mengatakan alasannya', isi?.tombol?.includes('Tidak ada yang baru'), JSON.stringify(isi?.tombol));

  await klik(cdp, 'Batal', `document.querySelector('[role=dialog]')`);
  await sleep(600);
}

async function alurBawaan(cdp) {
  console.log('\n--- Bawaan sisa ---');
  await goto(cdp, `${BASE}/anggaran`, 6000);

  const baca = `(() => { const li=[...document.querySelectorAll('main li')].find(x=>/Bawa sisa|Hentikan bawaan/.test(x.textContent));
    if(!li) return null; const bar=li.querySelector('[role=progressbar]');
    return { teks: li.innerText.replace(/\\s+/g,' ').trim(),
             persen: bar ? Number(bar.getAttribute('aria-valuenow')) : null,
             tombol: [...li.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean) }; })()`;

  const mati = await evaluate(cdp, baca);
  if (!mati) {
    ok('ada anggaran untuk diuji', false, '(buat satu anggaran lebih dulu)');
    return;
  }

  ok('keadaan mati dinyatakan apa adanya', /sisanya hangus tiap periode/.test(mati.teks));
  ok('tombolnya berbunyi "Bawa sisa"', mati.tombol.includes('Bawa sisa'), JSON.stringify(mati.tombol));

  await evaluate(
    cdp,
    `(() => { const li=[...document.querySelectorAll('main li')].find(x=>/Bawa sisa/.test(x.textContent));
      [...li.querySelectorAll('button')].find(b=>b.textContent.trim()==='Bawa sisa').click(); })()`,
  );
  const nyala = await tunggu(
    cdp,
    `(() => { const li=[...document.querySelectorAll('main li')].find(x=>/Hentikan bawaan/.test(x.textContent));
      return li ? li.innerText.replace(/\\s+/g,' ').trim() : ''; })()`,
  );
  ok('dapat dinyalakan', Boolean(nyala));
  ok(
    'keadaan menyala DIJELASKAN, bukan sekadar ditandai',
    /Sisa dibawa ke periode berikutnya|Bawaan \+|Utang /.test(nyala ?? ''),
    `(${String(nyala).slice(0, 90)})`,
  );

  const persen = await evaluate(cdp, baca);
  ok(
    'persen tetap dalam batas wajar',
    typeof persen?.persen === 'number' && persen.persen >= 0 && persen.persen <= 100,
    `(${String(persen?.persen)}%)`,
  );

  /* Dikembalikan ke keadaan semula: gerbang yang meninggalkan jejak akan
     menghijau berbeda pada jalanan berikutnya. */
  await evaluate(
    cdp,
    `(() => { const li=[...document.querySelectorAll('main li')].find(x=>/Hentikan bawaan/.test(x.textContent));
      [...li.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hentikan bawaan').click(); })()`,
  );
  const lagi = await tunggu(
    cdp,
    `(() => { const li=[...document.querySelectorAll('main li')].find(x=>/Bawa sisa/.test(x.textContent));
      return li ? '1' : ''; })()`,
  );
  ok('dapat dimatikan lagi', Boolean(lagi));
}

async function alurSempit(cdp) {
  console.log('\n--- 390px ---');
  await viewport(cdp, 390, 844, true);

  for (const [nama, jalur] of [
    ['berulang', '/berulang'],
    ['anggaran', '/anggaran'],
    ['laporan', '/laporan'],
  ]) {
    await goto(cdp, `${BASE}${jalur}`, 5000);

    /*
     * Menunggu roti panggang hilang lebih dulu.
     *
     * Sonner memasangnya `position: fixed` dengan lebar yang untuk sesaat
     * melampaui viewport sebelum animasinya selesai. Versi pertama gerbang ini
     * mengukur tepat pada saat itu dan melaporkan `scrollWidth: 391` di
     * Laporan — cacat yang lenyap begitu halamannya dibuka sendirian, yaitu
     * bentuk kegagalan palsu yang paling mahal: nyata di gerbang, tidak dapat
     * ditemukan siapa pun.
     */
    await tunggu(cdp, `document.querySelectorAll('[data-sonner-toast]').length === 0 ? '1' : ''`, 20);

    /* Yang meluap DISEBUT namanya. Angka `391` tanpa elemennya memaksa orang
       mencari sendiri, dan di halaman dengan tabel itu berarti menyerah. */
    const ukur = await evaluate(
      cdp,
      `(() => {
        /* Yang berada di dalam wadah bergulir sendiri TIDAK dihitung meluap.
           Tabel lebar di dalam \`overflow-x-auto\` memang melewati tepi layar —
           itulah gunanya wadah itu, dan halamannya tetap tidak bergeser. */
        const tergulung=(el)=>{
          for(let p=el.parentElement; p && p!==document.documentElement; p=p.parentElement){
            const o=getComputedStyle(p).overflowX;
            if(o==='auto'||o==='scroll'||o==='hidden'||o==='clip') return true;
          }
          return false;
        };
        const meluap=[...document.querySelectorAll('main *')]
          .filter(e=>e.getBoundingClientRect().right > innerWidth + 0.5 && !tergulung(e))
          .slice(0,3)
          .map(e=>({ tag:e.tagName, cls:String(e.className).slice(0,60), kanan:Math.round(e.getBoundingClientRect().right) }));
        return { gulir: document.documentElement.scrollWidth,
                 potong: [...document.querySelectorAll('main p, main span')]
                   .filter(e=>e.scrollWidth>e.clientWidth+2 && !e.className.includes('truncate')).length,
                 meluap }; })()`,
    );
    ok(
      `${nama}: tanpa gulir mendatar & tanpa teks terpotong`,
      ukur.gulir <= 390 && ukur.potong === 0,
      JSON.stringify(ukur),
    );
  }

  await viewport(cdp, 1440, 900);
}

/* ── jalan ────────────────────────────────────────────────────────────── */

console.log(`Gerbang alur → ${BASE}\n`);
mkdirSync(KERJA, { recursive: true });

await withChrome(async (cdp) => {
  await viewport(cdp, 1440, 900);
  await masuk(cdp);

  await alurStruk(cdp);
  await alurBerulang(cdp);
  await alurImpor(cdp);
  await alurBawaan(cdp);
  await alurSempit(cdp);
});

console.log(`\n  galat konsol: ${String(konsol.length)}`);
konsol.slice(0, 5).forEach((x) => {
  console.log(`    ${x}`);
});

console.log('\n════════════════════════════════════════════════════════════════════════');
if (gagal === 0 && konsol.length === 0) {
  console.log('  Empat alur bekerja dari ujung ke ujung, dan tidak menulis dua kali.');
} else {
  console.log(`  ${String(gagal)} gagal, ${String(konsol.length)} galat konsol.`);
}

process.exit(gagal > 0 || konsol.length > 0 ? 1 : 0);
