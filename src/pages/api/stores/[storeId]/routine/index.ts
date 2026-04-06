import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const period = url.searchParams.get('period') ?? 'morning';
  const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  const db = getDb();

  const result = await db.execute({
    sql: `SELECT
            ri.id,
            ri.role_id,
            ri.title,
            ri.sort_order,
            r.name  AS role_name,
            r.sort_order AS role_sort_order,
            COALESCE(rc.checked, 0) AS checked,
            rc.checked_at
          FROM routine_items ri
          JOIN roles r ON r.id = ri.role_id
          LEFT JOIN routine_checks rc
            ON rc.routine_item_id = ri.id AND rc.date = ?
          WHERE ri.store_id = ? AND ri.period = ?
          ORDER BY r.sort_order, ri.sort_order`,
    args: [date, storeId ?? '', period],
  });

  // Group by role
  const roleMap = new Map<number, { role_id: number; role_name: string; role_sort_order: number; items: object[] }>();
  for (const row of result.rows) {
    const rid = row.role_id as number;
    if (!roleMap.has(rid)) {
      roleMap.set(rid, {
        role_id: rid,
        role_name: row.role_name as string,
        role_sort_order: row.role_sort_order as number,
        items: [],
      });
    }
    roleMap.get(rid)!.items.push({
      id: row.id,
      title: row.title,
      sort_order: row.sort_order,
      checked: row.checked === 1,
      checked_at: row.checked_at,
    });
  }

  const roles = Array.from(roleMap.values()).sort((a, b) => a.role_sort_order - b.role_sort_order);

  return new Response(JSON.stringify({ roles, period, date }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
