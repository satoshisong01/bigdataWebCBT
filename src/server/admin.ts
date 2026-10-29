/**
 * Server-only: account administration for scripts/db-setup.mjs — accounts are created only by the
 * ops script, never by a signup route (docs §7.2). Loaded through the TypeScript transpiler.
 */
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isAcceptableNewPassword,
  isValidUsername,
  normalizeUsername,
} from './account-rules';
import { quoteSchema } from './env';
import type { SqlClient } from './migrations';
import { hashPassword } from './password';

export type CreateUserOutcome = 'created' | 'updated';

/** Creates the account, or for an existing one replaces the password, clears the lockout and revokes its sessions. */
export async function createOrResetUser(
  client: SqlClient,
  schemaName: string,
  rawUsername: string,
  password: string,
): Promise<CreateUserOutcome> {
  const s = quoteSchema(schemaName);
  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    throw new Error('username must be 1-64 chars of a-z 0-9 . _ @ - and start with a letter or digit');
  }
  if (!isAcceptableNewPassword(password)) {
    throw new Error(`password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`);
  }
  const hash = await hashPassword(password);
  // one statement (atomic even on a Pool): a reset is the recovery path for a compromised
  // account, so every existing session of it is revoked together with the password change
  const updated = await client.query(
    `with updated as (
       update ${s}.users set password_hash = $2, failed_attempts = 0, locked_until = null
        where username = $1 returning id
     ), revoked as (
       delete from ${s}.sessions where user_id in (select id from updated)
     )
     select id from updated`,
    [username, hash],
  );
  if (updated.rows.length > 0) return 'updated';
  await client.query(`insert into ${s}.users (username, password_hash) values ($1, $2)`, [username, hash]);
  return 'created';
}

export async function listUsernames(client: SqlClient, schemaName: string): Promise<string[]> {
  const s = quoteSchema(schemaName);
  const { rows } = await client.query(`select username from ${s}.users order by username`);
  return rows.map((row) => String(row.username));
}
