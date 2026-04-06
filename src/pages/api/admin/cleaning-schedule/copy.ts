import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db';

// POST: copy previous month's schedule pattern to a new month for all spots of a role
export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { roleId, fromMonth, toMonth } = await request.json() as { roleId: number; fromMonth: string; toMonth: string };

  const db = getDb();

  // Get all spots for this role
  const spots = await db.execute({
    sql: 'SELECT id FROM cleaning_spots WHERE role_id = ?',
    args: [roleId],
  });

  // Get schedule entries from source month
  const fromEntries = await db.execute({
    sql: `SELECT cs.cleaning_spot_id, TO_CHAR(cs.date::date, 'DD') AS day
          FROM cleaning_schedule cs
          JOIN cleaning_spots sp ON sp.id = cs.cleaning_spot_id
          WHERE sp.role_id = ? AND cs.date LIKE ?`,
    args: [roleId, `${fromMonth}-%`],
  });

  // Determine target month's day count
  const [ty, tm] = toMonth.split('-').map(Number);
  const toMonthDays = new Date(ty, tm, 0).getDate();

  let inserted = 0;
  for (const entry of fromEntries.rows) {
    const day = entry.day as string;
    const dayNum = parseInt(day, 10);
    if (dayNum > toMonthDays) continue; // target month is shorter

    const toDate = `${toMonth}-${day}`;
    const spotId = entry.cleaning_spot_id as number;

    // Only insert if not already present
    const existing = await db.execute({
      sql: 'SELECT id FROM cleaning_schedule WHERE cleaning_spot_id = ? AND date = ?',
      args: [spotId, toDate],
    });
    if (!existing.rows[0]) {
      await db.execute({
        sql: 'INSERT INTO cleaning_schedule (cleaning_spot_id, date, status) VALUES (?, ?, ?)',
        args: [spotId, toDate, 'scheduled'],
      });
      inserted++;
    }
  }

  return new Response(JSON.stringify({ ok: true, inserted }), { headers: { 'Content-Type': 'application/json' } });
};
