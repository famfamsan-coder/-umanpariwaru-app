import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

type Status = 'scheduled' | 'completed' | 'incomplete' | 'passed';

// POST: toggle (upsert) a single cleaning schedule entry
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { spotId, date, status } = await request.json() as { spotId: number; date: string; status: Status | null };
  const db = getDb();

  if (status === null) {
    // Delete the entry
    await db.execute({
      sql: 'DELETE FROM cleaning_schedule WHERE cleaning_spot_id = ? AND date = ?',
      args: [spotId, date],
    });
    return new Response(JSON.stringify({ ok: true, action: 'deleted' }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Upsert
  const existing = await db.execute({
    sql: 'SELECT id FROM cleaning_schedule WHERE cleaning_spot_id = ? AND date = ?',
    args: [spotId, date],
  });

  if (existing.rows[0]) {
    await db.execute({
      sql: 'UPDATE cleaning_schedule SET status = ? WHERE id = ?',
      args: [status, (existing.rows[0] as unknown as { id: number }).id],
    });
  } else {
    await db.execute({
      sql: 'INSERT INTO cleaning_schedule (cleaning_spot_id, date, status) VALUES (?, ?, ?)',
      args: [spotId, date, status],
    });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
