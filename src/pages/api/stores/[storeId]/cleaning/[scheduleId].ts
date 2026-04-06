import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

type Status = 'scheduled' | 'completed' | 'incomplete' | 'passed';
const VALID: Status[] = ['scheduled', 'completed', 'incomplete', 'passed'];

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { scheduleId } = params;
  const { status } = await request.json() as { status: Status };

  if (!VALID.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: 'UPDATE cleaning_schedule SET status = ? WHERE id = ?',
    args: [status, scheduleId ?? ''],
  });

  return new Response(JSON.stringify({ ok: true, status }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
