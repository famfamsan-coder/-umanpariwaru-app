export interface SessionData {
  id: number;
  username: string;
  role: 'admin' | 'staff';
}

const sessions = new Map<string, SessionData>();

export function createSession(data: SessionData): string {
  const token = crypto.randomUUID();
  sessions.set(token, data);
  return token;
}

export function getSession(token: string): SessionData | null {
  return sessions.get(token) ?? null;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}
