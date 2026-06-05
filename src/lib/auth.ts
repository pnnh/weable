import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/index';
import { users } from '@/db/schema';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  bio: string | null;
}

const DEV_USER_BASE = {
  id: process.env.DEV_USER_ID ?? 'dev-user-001',
  name: process.env.DEV_USER_NAME ?? 'Dev User',
  email: process.env.DEV_USER_EMAIL ?? 'dev@local',
};

async function ensureUserRow(id: string, name: string, email: string): Promise<CurrentUser> {
  const db = getDb();
  db.insert(users)
    .values({ id, name, email })
    .onConflictDoNothing()
    .run();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length > 0) {
    return { id: rows[0].id, name: rows[0].name, email: rows[0].email, nickname: rows[0].nickname ?? null, bio: rows[0].bio ?? null };
  }
  return { id, name, email, nickname: null, bio: null };
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const base = userId
    ? { id: userId, name: userId, email: `${userId}@local` }
    : DEV_USER_BASE;
  return ensureUserRow(base.id, base.name, base.email);
}
