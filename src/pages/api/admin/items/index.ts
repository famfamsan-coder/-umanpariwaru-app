import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

// POST: create a new role_checklist_item or role_task_item
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { roleId, type, title } = await request.json() as { roleId: number; type: 'checklist' | 'task'; title: string };
  if (!title?.trim()) return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400 });
  if (type !== 'checklist' && type !== 'task') return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });

  const table = type === 'checklist' ? 'role_checklist_items' : 'role_task_items';
  const db = getDb();
  const orderResult = await db.execute({
    sql: `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table} WHERE role_id = ?`,
    args: [roleId],
  });
  const next = (orderResult.rows[0] as unknown as { next: number }).next;
  const result = await db.execute({
    sql: `INSERT INTO ${table} (role_id, title, sort_order) VALUES (?, ?, ?) RETURNING id, title, sort_order`,
    args: [roleId, title.trim(), next],
  });
  return new Response(JSON.stringify({ ...result.rows[0], type }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
