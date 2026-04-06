import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const body = await request.json() as Record<string, unknown>;
  const type = body.type as 'checklist' | 'task' | undefined;
  if (type !== 'checklist' && type !== 'task') return new Response(JSON.stringify({ error: 'Type is required' }), { status: 400 });
  const table = type === 'checklist' ? 'role_checklist_items' : 'role_task_items';
  const db = getDb();

  const fields: string[] = [];
  const args: (string | number | null)[] = [];
  if (typeof body.title === 'string' && body.title.trim()) { fields.push('title = ?'); args.push(body.title.trim()); }
  if (typeof body.sort_order === 'number') { fields.push('sort_order = ?'); args.push(body.sort_order); }

  if (!fields.length) return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
  args.push(id ?? '');
  await db.execute({ sql: `UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`, args });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { id } = params;
  const body = await request.json() as { type: 'checklist' | 'task' };
  const table = body.type === 'checklist' ? 'role_checklist_items' : 'role_task_items';
  const db = getDb();
  await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id ?? ''] });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
