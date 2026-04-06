import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { storeId } = params;
  const from = url.searchParams.get('from') ?? new Date().toISOString().split('T')[0];
  const to = url.searchParams.get('to') ?? from;
  const db = getDb();

  const rows = await db.execute({
    sql: `SELECT
            ir.date,
            st.name  AS store_name,
            s.name   AS supplier_name,
            i.name   AS ingredient_name,
            i.unit,
            COALESCE(ir.current_stock,  0) AS current_stock,
            COALESCE(ir.required_amount,0) AS required_amount,
            COALESCE(ir.order_amount,   0) AS order_amount
          FROM inventory_records ir
          JOIN ingredients i  ON i.id  = ir.ingredient_id
          JOIN suppliers   s  ON s.id  = i.supplier_id
          JOIN stores      st ON st.id = s.store_id
          WHERE s.store_id = ? AND ir.date BETWEEN ? AND ?
          ORDER BY ir.date, s.sort_order, i.sort_order`,
    args: [storeId ?? '', from, to],
  });

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const header = 'Date,Store,Supplier,Ingredient,Unit,Current Stock,Required,Order Qty';
  const lines = rows.rows.map(r =>
    [r.date, r.store_name, r.supplier_name, r.ingredient_name,
     r.unit, r.current_stock, r.required_amount, r.order_amount]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = BOM + [header, ...lines].join('\r\n');

  const filename = from === to
    ? `inventory_${from}.csv`
    : `inventory_${from}_${to}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
};
