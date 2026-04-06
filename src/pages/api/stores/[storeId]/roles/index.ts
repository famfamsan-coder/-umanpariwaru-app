import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const db = getDb();

  const result = await db.execute({
    sql: 'SELECT id, name, sort_order FROM roles WHERE store_id = ? ORDER BY sort_order',
    args: [storeId ?? ''],
  });

  return new Response(JSON.stringify({ roles: result.rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
