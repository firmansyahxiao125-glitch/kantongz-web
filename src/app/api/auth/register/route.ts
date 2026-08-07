import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { callBackend, deviceOf, envelopeError, forward } from '@/lib/server/backend';
import type { PendingVerification } from '@/lib/contracts';

const schema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(254),
  password: z.string().min(1).max(512),
});

export async function POST(request: NextRequest): Promise<Response> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return envelopeError('unknown', 'permintaan tidak valid', 400);

  const device = await deviceOf(request.headers.get('user-agent'));
  const result = await callBackend<PendingVerification>('/v1/auth/register', {
    ...parsed.data,
    device,
  });

  return forward(result, device);
}
