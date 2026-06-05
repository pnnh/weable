import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";

export function runMigrations(): void {
  const dbPath = process.env.DB_PATH || "./.data/weable.db";
  const dir = path.dirname(path.resolve(dbPath));

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = drizzle({ connection: { source: dbPath } });

  migrate(db, { migrationsFolder: "./migrations" });

  console.log("✅ Migrations applied successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
