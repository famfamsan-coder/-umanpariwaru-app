import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { routineItemId, date, checked } = await request.json() as {
    routineItemId: number;
    date: string;
    checked: boolean;
  };

  const db = getDb();
  const checkedAt = checked ? new Date().toISOString() : null;

  const existing = await db.execute({
    sql: 'SELECT id FROM routine_checks WHERE routine_item_id = ? AND date = ?',
    args: [routineItemId, date],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO routine_checks (routine_item_id, date, checked, checked_at) VALUES (?, ?, ?, ?)',
      args: [routineItemId, date, checked ? 1 : 0, checkedAt],
    });
  } else {
    await db.execute({
      sql: 'UPDATE routine_checks SET checked = ?, checked_at = ? WHERE routine_item_id = ? AND date = ?',
      args: [checked ? 1 : 0, checkedAt, routineItemId, date],
    });
  }

  return new Response(JSON.stringify({ ok: true, checked }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
