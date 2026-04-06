import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId, taskId } = params;
  const { completed } = await request.json() as { completed: boolean };
  const db = getDb();

  await db.execute({
    sql: 'UPDATE daily_tasks SET completed = ? WHERE id = ? AND store_id = ?',
    args: [completed ? 1 : 0, taskId ?? '', storeId ?? ''],
  });

  return new Response(JSON.stringify({ ok: true, completed }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId, taskId } = params;
  const db = getDb();

  await db.execute({
    sql: 'DELETE FROM daily_tasks WHERE id = ? AND store_id = ?',
    args: [taskId ?? '', storeId ?? ''],
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
