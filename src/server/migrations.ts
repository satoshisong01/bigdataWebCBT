/**
 * Server-only: idempotent DDL of docs §7.2/§7.3 and its runner, used by
 * `node scripts/db-setup.mjs migrate` (loaded there through the TypeScript transpiler).
 * Every statement is `if not exists`; applied ids are recorded in <schema>.schema_migrations.
 */
import { quoteSchema } from './env';

/** The subset of pg's Client/Pool used by the ops code (one connection for migrations). */
export interface SqlClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export interface Migration {
  id: string;
  statements: (s: string) => string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    id: '001_auth',
    statements: (s) => [
      `create table if not exists ${s}.users (
        id bigserial primary key,
        username text not null unique,
        password_hash text not null,
        failed_attempts int not null default 0,
        locked_until timestamptz,
        created_at timestamptz not null default now(),
        last_login_at timestamptz)`,
      `create table if not exists ${s}.sessions (
        token_hash text primary key,
        user_id bigint not null references ${s}.users(id) on delete cascade,
        persistent boolean not null,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null,
        last_seen_at timestamptz not null default now())`,
      `create index if not exists sessions_user on ${s}.sessions (user_id)`,
    ],
  },
  {
    id: '002_sync',
    statements: (s) => [
      `create table if not exists ${s}.sync_records (
        user_id bigint not null references ${s}.users(id) on delete cascade,
        ns text not null,
        key text not null,
        value jsonb,
        updated_at timestamptz not null,
        device text not null,
        version bigint not null,
        primary key (user_id, ns, key))`,
      `create sequence if not exists ${s}.sync_version_seq`,
      `create index if not exists sync_records_user_version on ${s}.sync_records (user_id, version)`,
    ],
  },
];

async function inTransaction(client: SqlClient, work: () => Promise<void>): Promise<void> {
  await client.query('begin');
  try {
    await work();
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  }
}

/**
 * Creates the schema when missing (checked first: CREATE SCHEMA IF NOT EXISTS still needs the
 * database-level CREATE privilege), then applies pending migrations. Returns the applied ids.
 */
export async function applyMigrations(client: SqlClient, schemaName: string): Promise<string[]> {
  const s = quoteSchema(schemaName);
  const existing = await client.query('select 1 from pg_namespace where nspname = $1', [schemaName]);
  if (existing.rows.length === 0) await client.query(`create schema ${s}`);
  await client.query(
    `create table if not exists ${s}.schema_migrations (id text primary key, applied_at timestamptz not null default now())`,
  );
  const done = await client.query(`select id from ${s}.schema_migrations`);
  const applied = new Set(done.rows.map((row) => String(row.id)));
  const pending = MIGRATIONS.filter((m) => !applied.has(m.id));
  for (const migration of pending) {
    await inTransaction(client, async () => {
      for (const statement of migration.statements(s)) await client.query(statement);
      await client.query(`insert into ${s}.schema_migrations (id) values ($1)`, [migration.id]);
    });
  }
  return pending.map((m) => m.id);
}
