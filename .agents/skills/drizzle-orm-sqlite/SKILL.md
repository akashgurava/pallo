---
name: drizzle-orm-sqlite
description: Best practices for Drizzle ORM schema definitions, SQLite queries, and type safety in SvelteKit.
---

# Drizzle ORM & SQLite Guidelines

- **Schema Location**: Define all tables, relations, and enums in `src/lib/server/db/schema.ts`.
- **Database Client**: Import the initialized Drizzle DB client from `$lib/server/db`.
- **Type Safety**: Infer schema types using `InferSelectModel<typeof tableName>` / `InferInsertModel<typeof tableName>` or export explicit TypeScript types from `src/lib/types.ts`.
- **Migrations**: Always run `pnpm drizzle-kit generate` to create SQL migrations or `pnpm drizzle-kit push` for dev schema syncing.
- **Data Integrity**: Enforce canonical ordering on commutative data (e.g. `parent1_id <= parent2_id` for breeding pairs) at query/insert boundaries.
