/**
 * Server-only: the single PostgreSQL access point (docs §7.1), used from Node-runtime Route
 * Handlers. The Pool (max 2) is a module singleton cached on globalThis so dev HMR reuses it.
 * SQL text prefixes tables with `db.s`, the validated and quoted schema identifier.
 */
import { Pool } from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';
import { buildPoolConfig } from './db-config';
import { describeError, quoteSchema, readDbEnv } from './env';

export interface DbTx {
  /** quoted schema identifier, e.g. `"myschema"` → `${db.s}.users` */
  readonly s: string;
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<R>>;
}

export interface Db extends DbTx {
  /** BEGIN … COMMIT on one pooled connection; ROLLBACK and rethrow on error. */
  transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>;
}

type RawQuery = (text: string, values?: unknown[]) => Promise<QueryResult<QueryResultRow>>;

function runner(raw: RawQuery, s: string): DbTx {
  return {
    s,
    query: <R extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]) =>
      raw(text, values ? [...values] : undefined) as Promise<QueryResult<R>>,
  };
}

export function createDb(pool: Pool, schemaName: string): Db {
  const s = quoteSchema(schemaName);
  return {
    ...runner((text, values) => pool.query(text, values), s),
    async transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      let broken: Error | undefined;
      try {
        await client.query('begin');
        const result = await fn(runner((text, values) => client.query(text, values), s));
        await client.query('commit');
        return result;
      } catch (err) {
        await client.query('rollback').catch((rollbackErr: unknown) => {
          // the original error is rethrown below; a failed ROLLBACK only means the connection is unusable
          broken = rollbackErr instanceof Error ? rollbackErr : new Error('rollback failed');
        });
        throw err;
      } finally {
        client.release(broken);
      }
    },
  };
}

interface DbSingleton {
  pool: Pool;
  db: Db;
}

const globalForDb = globalThis as typeof globalThis & { __bigdataServerDb?: DbSingleton };

export function getDb(): Db {
  const cached = globalForDb.__bigdataServerDb;
  if (cached) return cached.db;
  const env = readDbEnv();
  const pool = new Pool(buildPoolConfig(env));
  pool.on('error', (err) => console.error('[db] idle client error:', describeError(err)));
  const created: DbSingleton = { pool, db: createDb(pool, env.schema) };
  globalForDb.__bigdataServerDb = created;
  return created.db;
}

/** Ends the cached pool (tests, scripts); the next getDb() creates a fresh one. */
export async function closeDb(): Promise<void> {
  const cached = globalForDb.__bigdataServerDb;
  if (!cached) return;
  globalForDb.__bigdataServerDb = undefined;
  await cached.pool.end();
}
