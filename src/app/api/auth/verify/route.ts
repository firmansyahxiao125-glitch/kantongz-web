import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { callBackend, deviceOf, envelopeError, forward } from '@/lib/server/backend';
import type { Session } from '@/lib/contracts';

const schema = z.object({
  ticket: z.string().min(1).max(256),
  code: z.string().min(4).max(12),
});

export async function POST(request: NextRequest): Promise<Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return envelopeError('unknown', 'permintaan tidak valid', 400);

  const device = await deviceOf(request.headers.get('user-agent'));
  const result = await callBackend<Session>('/v1/auth/verify', { ...parsed.data, device });

  return forward(result, device);
}
