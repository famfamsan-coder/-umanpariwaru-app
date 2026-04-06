import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const month  = url.searchParams.get('month')  ?? new Date().toISOString().slice(0, 7);
  const roleId = url.searchParams.get('roleId') ?? '';
  const db = getDb();

  // Roles for tab display
  const rolesResult = await db.execute({
    sql: 'SELECT id, name, sort_order FROM roles WHERE store_id = ? ORDER BY sort_order',
    args: [storeId ?? ''],
  });

  if (!roleId) {
    return new Response(JSON.stringify({
      roles: rolesResult.rows,
      spots: [],
      month,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Spots + schedule for this month
  const rows = await db.execute({
    sql: `SELECT
            cs.id   AS spot_id,
            cs.name AS spot_name,
            cs.sort_order,
            csch.id     AS schedule_id,
            csch.date,
            csch.status
          FROM cleaning_spots cs
          LEFT JOIN cleaning_schedule csch
            ON csch.cleaning_spot_id = cs.id
            AND csch.date LIKE ?
          WHERE cs.store_id = ? AND cs.role_id = ?
          ORDER BY cs.sort_order, csch.date`,
    args: [`${month}-%`, storeId ?? '', roleId],
  });

  // Group by spot
  const spotMap = new Map<number, { id: number; name: string; sort_order: number; schedule: Record<string, { id: number; status: string }> }>();
  for (const r of rows.rows) {
    const sid = r.spot_id as number;
    if (!spotMap.has(sid)) {
      spotMap.set(sid, {
        id: sid,
        name: r.spot_name as string,
        sort_order: r.sort_order as number,
        schedule: {},
      });
    }
    if (r.schedule_id) {
      spotMap.get(sid)!.schedule[r.date as string] = {
        id: r.schedule_id as number,
        status: r.status as string,
      };
    }
  }

  const spots = Array.from(spotMap.values()).sort((a, b) => a.sort_order - b.sort_order);

  return new Response(
    JSON.stringify({ roles: rolesResult.rows, spots, month }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
