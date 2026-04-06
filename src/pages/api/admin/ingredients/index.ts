import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const supplierId = url.searchParams.get('supplierId') ?? '';
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, name, unit, sort_order FROM ingredients WHERE supplier_id = ? ORDER BY sort_order',
    args: [supplierId],
  });
  return new Response(JSON.stringify(result.rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { supplierId, name, unit } = await request.json() as { supplierId: number; name: string; unit: string };
  if (!name?.trim()) return new Response(JSON.stringify({ error: 'Ingredient name is required' }), { status: 400 });
  const db = getDb();
  const orderResult = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ingredients WHERE supplier_id = ?',
    args: [supplierId],
  });
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: 'INSERT INTO ingredients (supplier_id, name, unit, sort_order) VALUES (?, ?, ?, ?) RETURNING id, name, unit, sort_order',
    args: [supplierId, name.trim(), unit?.trim() ?? '', next],
  });
  return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
