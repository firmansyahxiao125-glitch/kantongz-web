import type { NextRequest } from 'next/server';

import {
  callBackend,
  clearRefreshCookie,
  deviceOf,
  envelopeError,
  forward,
  readRefreshCookie,
} from '@/lib/server/backend';
import type { AuthTokens } from '@/lib/contracts';

/**
 * Penyegaran token.
 *
 * Klien tidak mengirim apa pun: refresh token datang dari kuki `httpOnly` dan
 * identitas perangkat dari kuki kedua. Itulah yang membuat rute ini tidak dapat
 * dipanggil dari skrip pihak ketiga dengan token milik orang lain.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const refreshToken = await readRefreshCookie();
  if (!refreshToken) return envelopeError('session_expired', 'tidak ada sesi', 401);

  const device = await deviceOf(request.headers.get('user-agent'));
  const result = await callBackend<AuthTokens>('/v1/auth/refresh', { refreshToken, device });

  const response = forward(result, device);

  /* Rotasi yang ditolak berarti keluarga tokennya sudah dicabut — kuki yang
     tertinggal hanya akan menghasilkan 401 berulang pada setiap muat halaman. */
  if (result.status === 401) return clearRefreshCookie(response);

  return response;
}
