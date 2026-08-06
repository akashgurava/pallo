import { unlinkSync, existsSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getConnection, reconnect } from "./index";
import { meta } from "./schema";
import { createLogger } from "../logger";

const log = createLogger("db");

/** Run migrations to ensure schema is up to date. */
export async function applyMigrations(): Promise<void> {
  const { db } = getConnection();
  log.info("applying migrations");
  await migrate(db, { migrationsFolder: "drizzle" });
  log.info("migrations applied");
}

/** Complete database reset: drop all tables/views/triggers, delete db file, reconnect, and re-apply migrations. */
export async function resetDatabase(): Promise<void> {
  log.info("resetting database");

  const { client } = getConnection();

  // 1. Drop all triggers, views, and tables dynamically (including __drizzle_migrations)
  try {
    await client.execute("PRAGMA foreign_keys = OFF;");

    const triggers = await client.execute("SELECT name FROM sqlite_master WHERE type='trigger'");
    for (const row of triggers.rows) {
      if (row[0]) {
        await client.execute(`DROP TRIGGER IF EXISTS \`${row[0]}\``);
      }
    }

    const views = await client.execute("SELECT name FROM sqlite_master WHERE type='view'");
    for (const row of views.rows) {
      if (row[0]) {
        await client.execute(`DROP VIEW IF EXISTS \`${row[0]}\``);
      }
    }

    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    for (const row of tables.rows) {
      if (row[0]) {
        await client.execute(`DROP TABLE IF EXISTS \`${row[0]}\``);
      }
    }
  } catch (err) {
    log.warn("Table drop error during reset", { error: err });
  } finally {
    try {
      await client.execute("PRAGMA foreign_keys = ON;");
    } catch {}
  }

  // 2. Attempt file unlinking for a 100% pristine SQLite file state
  try {
    client.close();
  } catch {}

  for (const f of ["pallo.db", "pallo.db-wal", "pallo.db-shm"]) {
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch (e) {
        log.warn(`Could not unlink ${f}`, { error: e });
      }
    }
  }

  // 3. Reconnect client & re-apply migrations from scratch
  reconnect();
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
