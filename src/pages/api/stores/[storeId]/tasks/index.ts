import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const db = getDb();

  const result = await db.execute({
    sql: `SELECT id, title, completed, created_at
          FROM daily_tasks
          WHERE store_id = ? AND date = ?
          ORDER BY completed ASC, created_at DESC`,
    args: [storeId ?? '', date],
  });

  const tasks = result.rows.map(r => ({
    id: r.id,
    title: r.title,
    completed: r.completed === 1,
    created_at: r.created_at,
  }));

  return new Response(JSON.stringify({ tasks, date }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const { title, date } = await request.json() as { title: string; date: string };

  if (!title?.trim()) {
    return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO daily_tasks (store_id, date, title, completed)
          VALUES (?, ?, ?, 0)`,
    args: [storeId ?? '', date, title.trim()],
  });

  const newTask = await db.execute({
    sql: 'SELECT id, title, completed, created_at FROM daily_tasks WHERE id = ?',
    args: [result.lastInsertRowid ?? ''],
  });

  const row = newTask.rows[0];
  return new Response(
    JSON.stringify({
      task: { id: row.id, title: row.title, completed: row.completed === 1, created_at: row.created_at },
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
};
