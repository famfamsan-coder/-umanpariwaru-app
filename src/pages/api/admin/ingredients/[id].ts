import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const body = await request.json() as Record<string, unknown>;
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  if (typeof body.name === 'string' && body.name.trim()) { fields.push('name = ?'); args.push(body.name.trim()); }
  if (typeof body.unit === 'string') { fields.push('unit = ?'); args.push(body.unit.trim()); }
  if (typeof body.sort_order === 'number') { fields.push('sort_order = ?'); args.push(body.sort_order); }

  if (!fields.length) return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
  args.push(id ?? '');
  await db.execute({ sql: `UPDATE ingredients SET ${fields.join(', ')} WHERE id = ?`, args });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM ingredients WHERE id = ?', args: [id ?? ''] });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
