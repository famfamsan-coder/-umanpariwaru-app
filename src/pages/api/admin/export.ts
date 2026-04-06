import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db';

export const GET: APIRoute = async ({ url, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const today = new Date().toISOString().split('T')[0];
  const from    = url.searchParams.get('from') ?? today;
  const to      = url.searchParams.get('to')   ?? today;
  const storeId = url.searchParams.get('storeId') ?? null;
  const db = getDb();

  const args: (string | number)[] = [from, to];
  let storeFilter = '';
  if (storeId) {
    storeFilter = 'AND s.store_id = ?';
    args.push(storeId);
  }

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
          WHERE ir.date BETWEEN ? AND ?
          ${storeFilter}
          ORDER BY ir.date, st.sort_order, s.sort_order, i.sort_order`,
    args,
  });

  const BOM = '\uFEFF';
  const header = 'Date,Store,Supplier,Ingredient,Unit,Current Stock,Required,Order Qty';
  const lines = rows.rows.map(r =>
    [r.date, r.store_name, r.supplier_name, r.ingredient_name,
     r.unit, r.current_stock, r.required_amount, r.order_amount]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = BOM + [header, ...lines].join('\r\n');

  const label = storeId ? `store${storeId}` : 'all';
  const filename = `inventory_${label}_${from}_${to}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
};
