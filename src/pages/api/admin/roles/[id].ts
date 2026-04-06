import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const db = getDb();

  const roleResult = await db.execute({
    sql: 'SELECT id, name, sort_order, manual_content, responsibility_content FROM roles WHERE id = ?',
    args: [id ?? ''],
  });
  if (!roleResult.rows[0]) return new Response('Not found', { status: 404 });

  const checklistResult = await db.execute({
    sql: 'SELECT id, title, sort_order FROM role_checklist_items WHERE role_id = ? ORDER BY sort_order',
    args: [id ?? ''],
  });
  const taskResult = await db.execute({
    sql: 'SELECT id, title, sort_order FROM role_task_items WHERE role_id = ? ORDER BY sort_order',
    args: [id ?? ''],
  });

  return new Response(JSON.stringify({
    ...roleResult.rows[0],
    checklist_items: checklistResult.rows,
    task_items: taskResult.rows,
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const body = await request.json() as Record<string, unknown>;
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  if (typeof body.name === 'string' && body.name.trim()) { fields.push('name = ?'); args.push(body.name.trim()); }
  if (typeof body.manual_content === 'string') { fields.push('manual_content = ?'); args.push(body.manual_content); }
  if (typeof body.responsibility_content === 'string') { fields.push('responsibility_content = ?'); args.push(body.responsibility_content); }
  if (typeof body.sort_order === 'number') { fields.push('sort_order = ?'); args.push(body.sort_order); }

  if (!fields.length) return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
  args.push(id ?? '');
  await db.execute({ sql: `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, args });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM roles WHERE id = ?', args: [id ?? ''] });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
