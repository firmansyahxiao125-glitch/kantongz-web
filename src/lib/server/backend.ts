import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import type { AuthErrorCode } from '@/lib/contracts';

/**
 * Lapisan BFF.
 *
 * Alasan lapisan ini ada hanya satu: refresh token tidak boleh pernah sampai ke
 * JavaScript peramban. Kontrak backend (M3_SPEC §17) mengembalikannya di badan
 * respons — benar untuk aplikasi mobile, yang menyimpannya di keystore sistem.
 * Peramban tidak punya keystore. Satu-satunya penyimpanan yang tidak terbaca
 * XSS di peramban adalah kuki `httpOnly`, dan hanya server yang bisa menulisnya.
 *
 * Jadi: rute ini memanggil backend, menyimpan refresh token ke kuki `httpOnly`,
 * dan hanya meneruskan access token ke klien — yang menyimpannya di memori.
 *
 * Kontrak backend TIDAK diubah sama sekali. Ini adaptor, bukan penulisan ulang.
 */

const BACKEND = process.env.API_URL ?? 'http://localhost:3000';

export const REFRESH_COOKIE = 'kz_rt';
export const DEVICE_COOKIE = 'kz_did';

/** Sama dengan umur refresh token di §4.1. Kuki yang hidup lebih lama dari
 *  tokennya hanya menghasilkan 401 yang membingungkan. */
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Identitas perangkat hidup lebih lama dari token mana pun: §15 mengikat
 *  keluarga token ke perangkat, dan identitas yang hilang lebih dulu akan
 *  terbaca sebagai token berpindah perangkat lalu mencabut seluruh keluarga. */
const DEVICE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface DevicePayload {
  deviceId: string;
  platform: 'web';
  model: string;
  appVersion: string;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

/**
 * Identitas perangkat ditentukan server, bukan klien.
 *
 * Klien yang memilih `deviceId` sendiri dapat menyamar sebagai perangkat lain
 * dan memicu pencabutan keluarga token milik orang itu. Nilainya disimpan di
 * kuki `httpOnly` dan diperbarui pada setiap respons auth.
 */
export async function deviceOf(userAgent: string | null): Promise<DevicePayload> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;

  return {
    deviceId: existing && existing.length >= 8 ? existing : `web-${crypto.randomUUID()}`,
    platform: 'web',
    /* Bukan sidik jari: hanya nama peramban, dipotong, supaya daftar perangkat
       di Pusat Keamanan dapat dibaca manusia. */
    model: (userAgent ?? 'peramban').slice(0, 120),
    appVersion: APP_VERSION,
  };
}

function setDeviceCookie(response: NextResponse, deviceId: string): void {
  response.cookies.set({
    name: DEVICE_COOKIE,
    value: deviceId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEVICE_MAX_AGE_SECONDS,
  });
}

export interface BackendEnvelope<T> {
  data?: T;
  error?: { code: AuthErrorCode; message: string; details: unknown; retryAfter: number | null };
  meta?: { requestId: string };
}

export interface BackendResult<T> {
  status: number;
  body: BackendEnvelope<T>;
}

/**
 * Memanggil backend dan mengembalikan amplopnya apa adanya.
 *
 * Kegagalan jaringan diterjemahkan ke amplop yang sama supaya klien hanya
 * mengenal satu bentuk — dan `network` memang salah satu kode yang beku.
 */
export async function callBackend<T>(path: string, body: unknown): Promise<BackendResult<T>> {
  try {
    const response = await fetch(`${BACKEND}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    return {
      status: response.status,
      body: (await response.json()) as BackendEnvelope<T>,
    };
  } catch {
    return {
      status: 0,
      body: {
        error: {
          code: 'network',
          message: 'backend tidak dapat dihubungi',
          details: null,
          retryAfter: null,
        },
      },
    };
  }
}

interface TokenBearing {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}

/** Bentuk yang dikembalikan ke klien: sama dengan aslinya, minus refresh token. */
export type Stripped<T> = T extends { tokens: TokenBearing }
  ? Omit<T, 'tokens'> & { tokens: Omit<TokenBearing, 'refreshToken'> }
  : T extends TokenBearing
    ? Omit<T, 'refreshToken'>
    : T;

function extractRefresh(data: unknown): { refreshToken: string; rest: unknown } | null {
  if (typeof data !== 'object' || data === null) return null;

  const record = data as Record<string, unknown>;

  if (typeof record.refreshToken === 'string') {
    const { refreshToken, ...rest } = record;
    return { refreshToken, rest };
  }

  const tokens = record.tokens;
  if (typeof tokens === 'object' && tokens !== null) {
    const inner = tokens as Record<string, unknown>;
    if (typeof inner.refreshToken === 'string') {
      const { refreshToken, ...restTokens } = inner;
      return { refreshToken, rest: { ...record, tokens: restTokens } };
    }
  }

  return null;
}

/**
 * Meneruskan hasil backend ke klien setelah memindahkan refresh token ke kuki.
 *
 * `secure` mengikuti protokol: memaksanya di `http://localhost` membuat kuki
 * tidak pernah tersimpan dan seluruh alur masuk gagal tanpa pesan.
 */
export function forward<T>(result: BackendResult<T>, device: DevicePayload): NextResponse {
  const found = extractRefresh(result.body.data);

  const response = found
    ? NextResponse.json({ ...result.body, data: found.rest }, { status: result.status })
    : NextResponse.json(result.body, { status: result.status || 502 });

  if (found) {
    response.cookies.set({
      name: REFRESH_COOKIE,
      value: found.refreshToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REFRESH_MAX_AGE_SECONDS,
    });
  }

  /* Ditulis ulang pada setiap respons, termasuk yang gagal — identitas
     perangkat harus stabil justru ketika alurnya sedang tidak mulus. */
  setDeviceCookie(response, device.deviceId);

  return response;
}

export function clearRefreshCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export function envelopeError(
  code: AuthErrorCode,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, details: null, retryAfter: null } },
    { status },
  );
}
