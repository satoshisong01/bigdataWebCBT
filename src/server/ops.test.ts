// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createOrResetUser, listUsernames } from './admin';
import { MIGRATIONS, applyMigrations } from './migrations';
import type { SqlClient } from './migrations';
import { verifyPassword } from './password';

interface Call {
  text: string;
  values?: unknown[];
}

type Responder = (text: string) => Array<Record<string, unknown>>;

function fakeClient(respond: Responder = () => []): { client: SqlClient; calls: Call[] } {
  const calls: Call[] = [];
  const client: SqlClient = {
    async query(text, values) {
      calls.push({ text, values });
      return { rows: respond(text) };
    },
  };
  return { client, calls };
}

const compact = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('applyMigrations', () => {
  it('creates a missing schema, then applies every migration in its own transaction', async () => {
    const { client, calls } = fakeClient();
    expect(await applyMigrations(client, 'study_app')).toEqual(['001_auth', '002_sync']);
    const texts = calls.map((c) => compact(c.text));
    expect(texts[0]).toBe('select 1 from pg_namespace where nspname = $1');
    expect(calls[0].values).toEqual(['study_app']);
    expect(texts[1]).toBe('create schema "study_app"');
    expect(texts[2]).toContain('create table if not exists "study_app".schema_migrations');
    expect(texts.filter((t) => t === 'begin')).toHaveLength(2);
    expect(texts.filter((t) => t === 'commit')).toHaveLength(2);
    expect(calls.filter((c) => c.text.startsWith('insert into')).map((c) => c.values)).toEqual([['001_auth'], ['002_sync']]);
  });

  it('skips an existing schema and already-applied migrations', async () => {
    const { client, calls } = fakeClient((text) => {
      if (text.includes('pg_namespace')) return [{ '?column?': 1 }];
      if (text.startsWith('select id from')) return [{ id: '001_auth' }];
      return [];
    });
    expect(await applyMigrations(client, 'study_app')).toEqual(['002_sync']);
    expect(calls.some((c) => c.text.startsWith('create schema'))).toBe(false);
  });

  it('does nothing when everything is applied', async () => {
    const { client, calls } = fakeClient((text) =>
      text.startsWith('select id from') ? MIGRATIONS.map((m) => ({ id: m.id })) : [{ x: 1 }],
    );
    expect(await applyMigrations(client, 'study_app')).toEqual([]);
    expect(calls.some((c) => c.text === 'begin')).toBe(false);
  });

  it('rolls back and rethrows when a statement fails', async () => {
    const calls: string[] = [];
    const client: SqlClient = {
      async query(text) {
        calls.push(compact(text));
        if (text.includes('create table if not exists "study_app".sessions')) throw new Error('boom');
        return { rows: [] };
      },
    };
    await expect(applyMigrations(client, 'study_app')).rejects.toThrow('boom');
    expect(calls.at(-1)).toBe('rollback');
    expect(calls.some((t) => t.startsWith('insert into'))).toBe(false);
  });

  it('refuses an invalid schema before touching the DB', async () => {
    const { client, calls } = fakeClient();
    await expect(applyMigrations(client, 'Bad-Schema')).rejects.toThrow('DB_SCHEMA must match');
    expect(calls).toHaveLength(0);
  });

  it('qualifies every object with the quoted schema (spec DDL §7.2/§7.3)', () => {
    const ddl = MIGRATIONS.flatMap((m) => m.statements('"s"')).map(compact);
    for (const statement of ddl) expect(statement).toMatch(/ "s"\./);
    const all = ddl.join('\n');
    expect(all).toContain('username text not null unique');
    expect(all).toContain('failed_attempts int not null default 0');
    expect(all).toContain('token_hash text primary key');
    expect(all).toContain('persistent boolean not null');
    expect(all).toContain('references "s".users(id) on delete cascade');
    expect(all).toContain('value jsonb,');
    expect(all).toContain('primary key (user_id, ns, key)');
    expect(all).toContain('create sequence if not exists "s".sync_version_seq');
    expect(all).toContain('create index if not exists sync_records_user_version on "s".sync_records (user_id, version)');
    expect(all).toContain('create index if not exists sessions_user on "s".sessions (user_id)');
  });
});

describe('createOrResetUser', () => {
  it('creates a new account with a normalized username and an scrypt hash', async () => {
    const { client, calls } = fakeClient();
    expect(await createOrResetUser(client, 'study_app', '  New_User ', 'first-pass')).toBe('created');
    const [update, insert] = calls;
    expect(update.values?.[0]).toBe('new_user');
    expect(compact(insert.text)).toBe('insert into "study_app".users (username, password_hash) values ($1, $2)');
    const hash = String(insert.values?.[1]);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword('first-pass', hash)).toBe(true);
  });

  it('resets the password, clears the lockout and revokes the sessions of an existing account', async () => {
    const { client, calls } = fakeClient((text) => (text.startsWith('with updated') ? [{ id: '1' }] : []));
    expect(await createOrResetUser(client, 'study_app', 'old_user', 'second-pass')).toBe('updated');
    expect(calls).toHaveLength(1);
    const sql = compact(calls[0].text);
    expect(sql).toContain('set password_hash = $2, failed_attempts = 0, locked_until = null');
    expect(sql).toContain('delete from "study_app".sessions where user_id in (select id from updated)');
  });

  it.each([
    ['bad name', 'first-pass', 'username must be'],
    ['', 'first-pass', 'username must be'],
    ['someone', '12345', 'password must be 6-72 characters'],
    ['someone', 'x'.repeat(73), 'password must be 6-72 characters'],
  ])('rejects %j / password before any query', async (username, password, message) => {
    const { client, calls } = fakeClient();
    await expect(createOrResetUser(client, 'study_app', username, password)).rejects.toThrow(message);
    expect(calls).toHaveLength(0);
  });
});

describe('listUsernames', () => {
  it('returns usernames in order', async () => {
    const { client, calls } = fakeClient(() => [{ username: 'a' }, { username: 'b' }]);
    expect(await listUsernames(client, 'study_app')).toEqual(['a', 'b']);
    expect(compact(calls[0].text)).toBe('select username from "study_app".users order by username');
  });
});
