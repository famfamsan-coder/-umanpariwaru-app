import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const db = getDb();

  const rows = await db.execute({
    sql: `SELECT
            s.id   AS supplier_id,
            s.name AS supplier_name,
            s.sort_order AS supplier_order,
            i.id   AS ingredient_id,
            i.name AS ingredient_name,
            i.unit,
            i.sort_order AS ingredient_order,
            ir.current_stock,
            ir.required_amount,
            ir.order_amount
          FROM suppliers s
          JOIN ingredients i ON i.supplier_id = s.id
          LEFT JOIN inventory_records ir
            ON ir.ingredient_id = i.id AND ir.date = ?
          WHERE s.store_id = ?
          ORDER BY s.sort_order, i.sort_order`,
    args: [date, storeId ?? ''],
  });

  // Group by supplier
  const supplierMap = new Map<number, {
    id: number; name: string; sort_order: number;
    ingredients: object[];
  }>();

  for (const r of rows.rows) {
    const sid = r.supplier_id as number;
    if (!supplierMap.has(sid)) {
      supplierMap.set(sid, {
        id: sid,
        name: r.supplier_name as string,
        sort_order: r.supplier_order as number,
        ingredients: [],
      });
    }
    supplierMap.get(sid)!.ingredients.push({
      id: r.ingredient_id,
      name: r.ingredient_name,
      unit: r.unit,
      sort_order: r.ingredient_order,
      current_stock: r.current_stock ?? null,
      required_amount: r.required_amount ?? null,
      order_amount: r.order_amount ?? null,
    });
  }

  const suppliers = Array.from(supplierMap.values())
    .sort((a, b) => a.sort_order - b.sort_order);

  return new Response(JSON.stringify({ suppliers, date }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
