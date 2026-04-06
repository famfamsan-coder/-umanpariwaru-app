import type { APIRoute } from 'astro';
import { getDb } from '../../../../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const { itemId, itemType, date } = await request.json() as {
    itemId: number;
    itemType: 'checklist' | 'task';
    date: string;
  };

  const db = getDb();

  // Check current state
  const existing = await db.execute({
    sql: 'SELECT checked FROM role_item_checks WHERE item_id = ? AND item_type = ? AND date = ?',
    args: [itemId, itemType, date],
  });

  let newChecked: boolean;
  if (existing.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO role_item_checks (item_id, item_type, date, checked) VALUES (?, ?, ?, 1)',
      args: [itemId, itemType, date],
    });
    newChecked = true;
  } else {
    newChecked = existing.rows[0].checked === 0;
    await db.execute({
      sql: 'UPDATE role_item_checks SET checked = ? WHERE item_id = ? AND item_type = ? AND date = ?',
      args: [newChecked ? 1 : 0, itemId, itemType, date],
    });
  }

  return new Response(JSON.stringify({ checked: newChecked }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
