import type { APIRoute } from 'astro';
import { getDb } from '../../../../../lib/db';

interface Record {
  ingredient_id: number;
  current_stock: number;
  required_amount: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { date, records } = await request.json() as { date: string; records: Record[] };

  if (!date || !Array.isArray(records)) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }

  const db = getDb();

  for (const rec of records) {
    const current = Math.max(rec.current_stock ?? 0, 0);
    const required = Math.max(rec.required_amount ?? 0, 0);
    const order = Math.max(required - current, 0);

    const existing = await db.execute({
      sql: 'SELECT id FROM inventory_records WHERE ingredient_id = ? AND date = ?',
      args: [rec.ingredient_id, date],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: `UPDATE inventory_records
              SET current_stock = ?, required_amount = ?, order_amount = ?
              WHERE ingredient_id = ? AND date = ?`,
        args: [current, required, order, rec.ingredient_id, date],
      });
    } else {
      await db.execute({
        sql: `INSERT INTO inventory_records (ingredient_id, date, current_stock, required_amount, order_amount)
              VALUES (?, ?, ?, ?, ?)`,
        args: [rec.ingredient_id, date, current, required, order],
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, saved: records.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
