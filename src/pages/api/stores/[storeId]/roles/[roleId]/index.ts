import type { APIRoute } from 'astro';
import { getDb } from '../../../../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId, roleId } = params;
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const roleResult = await db.execute({
    sql: 'SELECT id, name, manual_content, responsibility_content FROM roles WHERE id = ? AND store_id = ?',
    args: [roleId ?? '', storeId ?? ''],
  });

  if (!roleResult.rows[0]) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  const checklistResult = await db.execute({
    sql: `SELECT ci.id, ci.title, ci.sort_order,
            COALESCE(rc.checked, 0) as checked
          FROM role_checklist_items ci
          LEFT JOIN role_item_checks rc
            ON rc.item_id = ci.id AND rc.item_type = 'checklist' AND rc.date = ?
          WHERE ci.role_id = ?
          ORDER BY ci.sort_order`,
    args: [today, roleId ?? ''],
  });

  const taskResult = await db.execute({
    sql: `SELECT ti.id, ti.title, ti.sort_order,
            COALESCE(rc.checked, 0) as checked
          FROM role_task_items ti
          LEFT JOIN role_item_checks rc
            ON rc.item_id = ti.id AND rc.item_type = 'task' AND rc.date = ?
          WHERE ti.role_id = ?
          ORDER BY ti.sort_order`,
    args: [today, roleId ?? ''],
  });

  return new Response(
    JSON.stringify({
      ...roleResult.rows[0],
      checklist_items: checklistResult.rows,
      task_items: taskResult.rows,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
