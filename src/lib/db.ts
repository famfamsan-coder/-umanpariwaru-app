import postgres from 'postgres';

type Row = Record<string, unknown>;

interface QueryResult {
  rows: Row[];
  lastInsertRowid?: number;
}

interface DbQuery {
  sql: string;
  args?: (string | number | null)[];
}

let _sql: ReturnType<typeof postgres> | null = null;

function getConnection() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _sql = postgres(url, { ssl: 'require', max: 5, idle_timeout: 20 });
  }
  return _sql;
}

export function getDb() {
  const sql = getConnection();

  return {
    async execute(query: string | DbQuery): Promise<QueryResult> {
      const sqlStr = typeof query === 'string' ? query : query.sql;
      const args = typeof query === 'string' ? [] : (query.args ?? []);

      // Convert ? placeholders to $1, $2, ...
      let idx = 0;
      const pgSql = sqlStr.replace(/\?/g, () => `$${++idx}`);

      // Auto-append RETURNING id for INSERT statements
      const upper = pgSql.trim().toUpperCase();
      const isInsert = upper.startsWith('INSERT');
      const finalSql = isInsert && !upper.includes('RETURNING')
        ? pgSql + ' RETURNING id'
        : pgSql;

      const result = await sql.unsafe(finalSql, args as (string | number | null)[]);
      const rows = [...result] as Row[];

      const lastInsertRowid = isInsert && rows[0]?.id != null
        ? Number(rows[0].id)
        : undefined;

      return { rows, lastInsertRowid };
    },

    async executeMultiple(sqlStr: string): Promise<void> {
      const statements = sqlStr.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await sql.unsafe(stmt);
      }
    },
  };
}

// Tables are created in Supabase dashboard.
// This function is kept for compatibility with seed.ts.
export async function initializeDatabase(): Promise<void> {
  console.log('✅ Database initialization complete');
}
