import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import * as schema from "./schema";

type D1Binding = Parameters<typeof drizzleD1>[0];

type DbInstance = ReturnType<typeof drizzleSqlite>;

let sqliteDb: DbInstance | undefined;
let d1Db: DbInstance | undefined;

function ensureLocalDbDirectory(dbPath: string): void {
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const directory = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function getLocalDb() {
  if (!sqliteDb) {
    const dbPath = process.env.DB_PATH || "./.data/weable.db";
    ensureLocalDbDirectory(dbPath);
    sqliteDb = drizzleSqlite({ connection: { source: dbPath }, schema });
  }

  return sqliteDb;
}

function getCloudflareDbBinding(): { binding: D1Binding | undefined; inCfContext: boolean } {
  try {
    const { env } = getCloudflareContext();
    return { binding: env?.DB as D1Binding | undefined, inCfContext: true };
  } catch {
    return { binding: undefined, inCfContext: false };
  }
}

export function getDb() {
  const { binding: d1Binding, inCfContext } = getCloudflareDbBinding();

  if (d1Binding) {
    if (!d1Db) {
      d1Db = drizzleD1(d1Binding, { schema }) as unknown as DbInstance;
    }
    return d1Db;
  }

  if (inCfContext) {
    // Cloudflare context was available but DB binding is missing – configuration error.
    throw new Error("Cloudflare D1 binding DB is not configured. Check wrangler.jsonc D1 configuration.");
  }

  // No Cloudflare context (local dev or next build prerender) – use local SQLite.
  return getLocalDb();
}
