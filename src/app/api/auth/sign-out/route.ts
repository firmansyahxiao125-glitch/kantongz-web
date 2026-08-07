import type { NextRequest } from 'next/server';

import {
  callBackend,
  clearRefreshCookie,
  deviceOf,
  forward,
  readRefreshCookie,
} from '@/lib/server/backend';

/**
 * Keluar SELALU berhasil, sama seperti rute backend-nya (§6).
 *
 * Kuki dibersihkan lebih dulu dan tanpa syarat: pengguna yang menekan "keluar"
 * harus benar-benar keluar dari peramban ini meski backend sedang tidak dapat
 * dihubungi.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const refreshToken = await readRefreshCookie();
  const device = await deviceOf(request.headers.get('user-agent'));

  if (refreshToken) {
    await callBackend<Record<string, never>>('/v1/auth/sign-out', { refreshToken });
  }

  return clearRefreshCookie(forward({ status: 200, body: { data: {} } }, device));
}
