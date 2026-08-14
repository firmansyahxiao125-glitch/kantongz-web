import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { callBackend, deviceOf, envelopeError, forward } from '@/lib/server/backend';
import type { Session } from '@/lib/contracts';

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(512),
  /* Longgar SENGAJA: kolom yang sama menerima kode TOTP enam digit MAUPUN kode
     pemulihan bertanda hubung. Skema yang hanya menerima enam digit menolak
     kode pemulihan sebelum API sempat memeriksanya. */
  totpCode: z.string().trim().min(6).max(20).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return envelopeError('unknown', 'permintaan tidak valid', 400);

  const device = await deviceOf(request.headers.get('user-agent'));
  const result = await callBackend<Session>('/v1/auth/sign-in', { ...parsed.data, device });

  return forward(result, device);
}
