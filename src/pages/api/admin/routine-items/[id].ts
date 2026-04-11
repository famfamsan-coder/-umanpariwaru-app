import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const body = await request.json() as Record<string, unknown>;
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  if (typeof body.title === 'string' && body.title.trim()) { fields.push('title = ?'); args.push(body.title.trim()); }
  if (body.period === 'morning' || body.period === 'evening') { fields.push('period = ?'); args.push(body.period); }
  if (typeof body.sort_order === 'number') { fields.push('sort_order = ?'); args.push(body.sort_order); }

  if (!fields.length) return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
  args.push(id ?? '');
  await db.execute({ sql: `UPDATE routine_items SET ${fields.join(', ')} WHERE id = ?`, args });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM routine_items WHERE id = ?', args: [id ?? ''] });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
