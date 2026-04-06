import { getDb } from './db';
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'staff';
}

export async function findUser(username: string, password: string): Promise<User | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, username, password_hash, role FROM users WHERE username = ?',
    args: [username],
  });
  const row = result.rows[0];
  if (!row) return null;

  const valid = await verifyPassword(password, row.password_hash as string);
  if (!valid) return null;

  return {
    id: row.id as number,
    username: row.username as string,
    role: row.role as 'admin' | 'staff',
  };
}
