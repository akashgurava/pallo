import { existsSync, writeFileSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

const DB_PATH = "pallo.db";

function ensureFile(): void {
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, "");
  }
}

/** Get a new connection every time without caching. */
export function getConnection(): { client: Client; db: LibSQLDatabase<typeof schema> } {
  ensureFile();
  const client = createClient({ url: `file:${DB_PATH}` });
  const db = drizzle(client, { schema });
  return { client, db };
}

/** Reconnect helper (delegates directly to getConnection). */
export function reconnect(): void {
  getConnection();
}

/** Runs pending migrations on startup. */
export function ready(): Promise<void> {
  const { db } = getConnection();
  return migrate(db, { migrationsFolder: "drizzle" });
}
