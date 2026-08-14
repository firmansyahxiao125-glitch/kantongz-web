import type { ErrorCode } from '@/lib/contracts';

/**
 * Klien HTTP.
 *
 * Satu tempat yang tahu tentang amplop `data`/`error` (M3_SPEC §18), tentang
 * `Authorization`, dan tentang penyegaran token. Setiap pemanggil di atasnya
 * hanya melihat data atau `ApiError` — tidak ada satu pun komponen yang
 * menyentuh `fetch` secara langsung.
 */

export interface ApiMeta {
  requestId: string;
}

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details: unknown;
  retryAfter: number | null;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly retryAfter: number | null;

  constructor(body: ApiErrorBody, status: number, requestId?: string) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = body.retryAfter;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Token akses hidup di memori, TIDAK di `localStorage`.
 *
 * `localStorage` terbuka terhadap XSS: satu skrip pihak ketiga yang tersuntik
 * dapat membacanya dan mengirimkannya ke mana pun. Konsekuensinya sesi web
 * tidak bertahan setelah muat ulang — keputusan yang sama persis dengan yang
 * diambil aplikasi mobile di M2.2, dan alasannya sama.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Rute publik tidak menyertakan `Authorization`. M3_SPEC §2. */
  auth?: boolean;
  /**
   * Rute BFF milik Next.js sendiri, bukan backend.
   *
   * Rute inilah satu-satunya yang boleh membawa kuki — di situ refresh token
   * tinggal, dan `credentials: 'omit'` pada panggilan backend memastikan kuki
   * itu tidak pernah ikut ke lintas-asal.
   */
  absolute?: boolean;
  signal?: AbortSignal;
  /**
   * Badan MENTAH, dikirim apa adanya beserta tipe kontennya sendiri.
   *
   * Dipakai satu rute: pemindaian struk, yang menerima byte gambar langsung
   * dan bukan JSON. Membungkus gambar sebagai base64 di dalam JSON akan
   * menumbuhkannya sepertiga dan memaksa peladen menguraikannya dua kali.
   */
  raw?: { body: BodyInit; contentType: string };
}

/**
 * Penangan 401.
 *
 * Didaftarkan `lib/session` saat modulnya dimuat. Dibalik seperti ini supaya
 * `api` tidak mengimpor `session` yang mengimpor `api` — lingkaran impor yang
 * urutan evaluasinya bergantung pada modul mana yang kebetulan dimuat lebih
 * dulu, dan yang gagal secara berbeda antara server dan peramban.
 */
let onUnauthorized: (() => Promise<boolean>) | null = null;

export function setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void {
  onUnauthorized = handler;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

async function send<T>(path: string, options: RequestOptions, mayRetry: boolean): Promise<T> {
  const { method = 'GET', body, auth = true, absolute = false, signal, raw } = options;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (raw) headers['content-type'] = raw.contentType;
  else if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(absolute ? path : `${BASE_URL}${path}`, {
      method,
      headers,
      body: raw ? raw.body : body === undefined ? undefined : JSON.stringify(body),
      signal: signal ?? null,
      credentials: absolute ? 'same-origin' : 'omit',
    });
  } catch {
    /* Kegagalan jaringan tidak punya amplop. Kodenya tetap dari kontrak yang
       sama supaya lapisan di atas hanya mengenal satu bentuk galat. */
    throw new ApiError(
      {
        code: 'network',
        message: 'Tidak bisa terhubung ke server. Periksa koneksimu, lalu coba lagi.',
        details: null,
        retryAfter: null,
      },
      0,
    );
  }

  const requestId = response.headers.get('x-request-id') ?? undefined;

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: ApiErrorBody }
    | null;

  if (!response.ok || payload?.error) {
    const error = payload?.error ?? {
      code: 'unknown' as const,
      message: 'Terjadi kesalahan yang tidak terduga.',
      details: null,
      retryAfter: null,
    };

    /*
     * Satu percobaan ulang, dan hanya satu. Access token berumur sepuluh menit
     * sementara halaman bisa terbuka berjam-jam; tanpa ini setiap permintaan
     * pertama setelah jeda panjang akan gagal di depan pengguna. Percobaan
     * kedua tidak ditawarkan: bila penyegaran sudah berhasil dan hasilnya masih
     * 401, yang salah bukan tokennya.
     */
    if (
      mayRetry &&
      auth &&
      !absolute &&
      response.status === 401 &&
      error.code === 'session_expired' &&
      onUnauthorized &&
      (await onUnauthorized())
    ) {
      return send<T>(path, options, false);
    }

    throw new ApiError(error, response.status, requestId);
  }

  return payload?.data as T;
}
