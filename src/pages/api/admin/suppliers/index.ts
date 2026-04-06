import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const storeId = url.searchParams.get('storeId') ?? '';
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, sort_order FROM suppliers WHERE store_id = ? ORDER BY sort_order',
    args: [storeId],
  });
  return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { storeId, name } = await request.json() as { storeId: number; name: string };
  if (!name?.trim()) return new Response(JSON.stringify({ error: 'Supplier name is required' }), { status: 400 });
  const db = getDb();
  const orderResult = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM suppliers WHERE store_id = ?',
    args: [storeId],
  });
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: 'INSERT INTO suppliers (store_id, name, sort_order) VALUES (?, ?, ?) RETURNING id, name, sort_order',
    args: [storeId, name.trim(), next],
  });
  return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
