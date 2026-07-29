import { existsSync, writeFileSync } from 'node:fs';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema.js';

const DB_PATH = 'pallo.db';

function ensureFile(): void {
	if (!existsSync(DB_PATH)) {
		writeFileSync(DB_PATH, '');
	}
}

function connect(): { client: Client; db: LibSQLDatabase<typeof schema> } {
	ensureFile();
	const client = createClient({ url: `file:${DB_PATH}` });
	const db = drizzle(client, { schema });
	return { client, db };
}

let conn = connect();

/** Get a live client, reconnecting if the db file was removed. */
export function getConnection(): { client: Client; db: LibSQLDatabase<typeof schema> } {
	if (!existsSync(DB_PATH)) {
		conn = connect();
	}
	return conn;
}

/** Reconnect (call after reset operations that invalidate the connection). */
export function reconnect(): void {
	conn = connect();
}

/** Runs pending migrations on startup. */
export function ready(): Promise<void> {
	const { db } = getConnection();
	return migrate(db, { migrationsFolder: 'drizzle' });
}
