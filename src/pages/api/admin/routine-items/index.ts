import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const roleId = url.searchParams.get('roleId') ?? '';
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, period, title, sort_order FROM routine_items WHERE role_id = ? ORDER BY period, sort_order',
    args: [roleId],
  });
  return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { roleId, storeId, period, title } = await request.json() as { roleId: number; storeId: number; period: 'morning' | 'evening'; title: string };
  if (!title?.trim()) return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400 });
  if (period !== 'morning' && period !== 'evening') return new Response(JSON.stringify({ error: 'Invalid period' }), { status: 400 });
  const db = getDb();
  const orderResult = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM routine_items WHERE role_id = ? AND period = ?',
    args: [roleId, period],
  });
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: 'INSERT INTO routine_items (store_id, role_id, period, title, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING id, period, title, sort_order',
    args: [storeId, roleId, period, title.trim(), next],
  });
  return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
