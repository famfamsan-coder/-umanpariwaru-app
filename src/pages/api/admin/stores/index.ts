import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const db = getDb();
  const result = await db.execute('SELECT id, name FROM stores ORDER BY sort_order, id');
  return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { name } = await request.json() as { name: string };
  if (!name?.trim()) return new Response(JSON.stringify({ error: 'Store name is required' }), { status: 400 });
  const db = getDb();
  const orderResult = await db.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM stores');
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: 'INSERT INTO stores (name, sort_order) VALUES (?, ?) RETURNING id, name',
    args: [name.trim(), next],
  });
  return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
