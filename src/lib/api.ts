import type { AuthErrorCode } from '@/lib/contracts';

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
  code: AuthErrorCode;
  message: string;
  details: unknown;
  retryAfter: number | null;
}

export class ApiError extends Error {
  readonly code: AuthErrorCode;
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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Rute publik tidak menyertakan `Authorization`. M3_SPEC §2. */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && accessToken) headers.authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ?? null,
      credentials: 'omit',
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
    throw new ApiError(error, response.status, requestId);
  }

  return payload?.data as T;
}
