import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { callBackend, deviceOf, envelopeError, forward } from '@/lib/server/backend';

const schema = z.object({
  ticket: z.string().min(1).max(256),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(1).max(512),
});

/**
 * Reset TIDAK menghasilkan sesi (§11), jadi tidak ada refresh token yang perlu
 * dipindahkan ke kuki. Pengguna masuk kembali dengan sandi barunya.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return envelopeError('unknown', 'permintaan tidak valid', 400);

  const device = await deviceOf(request.headers.get('user-agent'));
  const result = await callBackend<Record<string, never>>(
    '/v1/auth/password/reset',
    parsed.data,
  );

  return forward(result, device);
}
