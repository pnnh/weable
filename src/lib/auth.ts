import { cookies } from 'next/headers';
import { headers } from 'next/headers';
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

type JwtPayload = {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
  common_name?: unknown;
};

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
    if (typeof atob !== 'undefined') {
      return atob(padded);
    }
    return null;
  } catch {
    return null;
  }
}

function parseJwtPayload(jwt: string): JwtPayload | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  const payloadText = decodeBase64Url(parts[1]);
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText) as JwtPayload;
  } catch {
    return null;
  }
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getCloudflareIdentity(jwt: string): { id: string; name: string; email: string } | null {
  const payload = parseJwtPayload(jwt);
  if (!payload) return null;

  const id = asNonEmptyString(payload.sub);
  const email = asNonEmptyString(payload.email);
  const name =
    asNonEmptyString(payload.name) ??
    asNonEmptyString(payload.preferred_username) ??
    asNonEmptyString(payload.common_name) ??
    email;

  if (!id || !email || !name) return null;
  return { id, name, email };
}

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
  const user = await getCurrentUserOrNull();
  if (!user) {
    throw new Error('Unable to resolve authenticated user from Cloudflare Access JWT or session cookie.');
  }
  return user;
}

// 与 getCurrentUser 相同的身份解析链，但生产环境无身份时返回 null 而非抛错，
// 供 /[lang]/console/api/* 路由返回 401 JSON 使用
export async function getCurrentUserOrNull(): Promise<CurrentUser | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const accessJwt =
    headerStore.get('cf-access-jwt-assertion') ??
    cookieStore.get('CF_Authorization')?.value ??
    cookieStore.get('cf_authorization')?.value;

  const cfIdentity = accessJwt ? getCloudflareIdentity(accessJwt) : null;
  if (cfIdentity) {
    return ensureUserRow(cfIdentity.id, cfIdentity.name, cfIdentity.email);
  }

  const userId = cookieStore.get('user_id')?.value;
  if (userId) {
    return ensureUserRow(userId, userId, `${userId}@local`);
  }

  if (process.env.NODE_ENV !== 'production') {
    return ensureUserRow(DEV_USER_BASE.id, DEV_USER_BASE.name, DEV_USER_BASE.email);
  }

  return null;
}
