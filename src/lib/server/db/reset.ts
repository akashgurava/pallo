import { migrate } from "drizzle-orm/libsql/migrator";
import { getConnection, reconnect } from "./index.js";
import { meta } from "./schema.js";
import { createLogger } from "../logger.js";

const log = createLogger("db");

/** Run migrations to ensure schema is up to date. */
export async function applyMigrations(): Promise<void> {
  const { db } = getConnection();
  log.info("applying migrations");
  await migrate(db, { migrationsFolder: "drizzle" });
  log.info("migrations applied");
}

/** Drop all tables and reapply migrations. */
export async function resetDatabase(): Promise<void> {
  log.info("resetting database");

  // Reconnect in case the file was deleted externally
  reconnect();
  const { client } = getConnection();

  // Get all user tables dynamically to avoid missing new tables
  const rows = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const row of rows.rows) {
    const name = row[0] as string;
    await client.execute(`DROP TABLE IF EXISTS \`${name}\``);
  }
  await applyMigrations();
  log.info("database reset complete");
}

/** Store the current time as last_refresh in meta. */
export async function stampRefresh(): Promise<void> {
  const { db } = getConnection();
  const now = new Date().toISOString();
  await db
    .insert(meta)
    .values({ key: "last_refresh", value: now })
    .onConflictDoUpdate({ target: meta.key, set: { value: now } })
    .run();
  log.info("refresh timestamp stored", { timestamp: now });
}
