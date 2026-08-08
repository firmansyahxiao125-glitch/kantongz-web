import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Keputusan tingkat grafis.
 *
 * Fungsi ini menentukan apakah bundel Three.js seberat 341 KB diunduh sebuah
 * perangkat. Salahnya tidak menghasilkan satu pun galat: ponsel kelas menengah
 * yang keliru dinilai `full` akan mengunduh, mengurai, dan menjalankan WebGL
 * yang tidak sanggup dijalankannya — dan gejalanya hanya "aplikasinya lambat".
 *
 * `detectTier` membaca `window` dan `navigator`, jadi keduanya dipalsukan di
 * sini. Yang dipalsukan adalah LINGKUNGAN, bukan fungsinya — logikanya
 * dijalankan apa adanya.
 */

interface FakeEnv {
  reducedMotion?: boolean;
  coarsePointer?: boolean;
  width?: number;
  cores?: number | undefined;
  memory?: number | undefined;
  webgl?: boolean;
}

function fakeEnvironment(env: FakeEnv = {}): void {
  const {
    reducedMotion = false,
    coarsePointer = false,
    width = 1440,
    cores = 8,
    memory = 8,
    webgl = true,
  } = env;

  vi.stubGlobal('window', {
    innerWidth: width,
    matchMedia: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : coarsePointer,
    }),
  });

  vi.stubGlobal('navigator', { hardwareConcurrency: cores, deviceMemory: memory });

  /* Uji WebGL memanggil `document.createElement('canvas').getContext(...)`.
     Yang dipalsukan adalah keberhasilan pembuatan konteksnya, karena itulah
     satu-satunya jawaban jujur atas "apakah WebGL bekerja". */
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => (webgl ? { getExtension: () => ({ loseContext: () => undefined }) } : null),
    }),
  });
}

async function tier(): Promise<string> {
  /* Modul diimpor ULANG tiap kali: hasil uji WebGL disimpan di tingkat modul,
     dan cache yang terbawa antar-kasus membuat kasus kedua menguji jawaban
     kasus pertama. */
  vi.resetModules();
  const { detectTier } = await import('../gpu');
  return detectTier();
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('detectTier', () => {
  it('desktop mampu → full', async () => {
    fakeEnvironment();
    expect(await tier()).toBe('full');
  });

  it('gerak dikurangi MENANG atas kemampuan perangkat', async () => {
    /* Mesin terkuat sekalipun tidak boleh menjalankan adegan ketika penggunanya
       meminta gerak dikurangi. Ia tidak sedang meminta gerak yang lebih halus. */
    fakeEnvironment({ reducedMotion: true, cores: 32, memory: 64 });
    expect(await tier()).toBe('off');
  });

  it('WebGL gagal dibuat → off', async () => {
    fakeEnvironment({ webgl: false });
    expect(await tier()).toBe('off');
  });

  it('di bawah 4 inti → lite', async () => {
    fakeEnvironment({ cores: 2 });
    expect(await tier()).toBe('lite');
  });

  it('di bawah 4 GB → lite', async () => {
    fakeEnvironment({ memory: 2 });
    expect(await tier()).toBe('lite');
  });

  it('layar sentuh sempit → lite', async () => {
    fakeEnvironment({ coarsePointer: true, width: 375 });
    expect(await tier()).toBe('lite');
  });

  it('layar sentuh LEBAR tetap full — tablet bukan ponsel', async () => {
    fakeEnvironment({ coarsePointer: true, width: 1024 });
    expect(await tier()).toBe('full');
  });

  it('spesifikasi yang TIDAK dilaporkan diperlakukan sebagai cukup', async () => {
    /* Safari tidak mengirimkan `deviceMemory`. Menghukum peramban karena tidak
       membocorkan spesifikasi perangkat akan mematikan 3D untuk seluruh
       penggunanya. */
    fakeEnvironment({ cores: undefined, memory: undefined });
    expect(await tier()).toBe('full');
  });
});
