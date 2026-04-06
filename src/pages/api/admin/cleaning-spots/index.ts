import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const roleId = url.searchParams.get('roleId') ?? '';
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, sort_order FROM cleaning_spots WHERE role_id = ? ORDER BY sort_order',
    args: [roleId],
  });
  return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { roleId, storeId, name } = await request.json() as { roleId: number; storeId: number; name: string };
  if (!name?.trim()) return new Response(JSON.stringify({ error: 'Cleaning spot name is required' }), { status: 400 });
  const db = getDb();
  const orderResult = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM cleaning_spots WHERE role_id = ?',
    args: [roleId],
  });
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: 'INSERT INTO cleaning_spots (store_id, role_id, name, sort_order) VALUES (?, ?, ?, ?) RETURNING id, name, sort_order',
    args: [storeId, roleId, name.trim(), next],
  });
  return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
