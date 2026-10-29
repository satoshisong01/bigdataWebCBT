/**
 * Server-only: account input rules used by both the auth routes and scripts/db-setup.mjs
 * (loaded there through the TypeScript transpiler — no runtime imports here).
 */

export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

const USERNAME_RE = /^[a-z0-9][a-z0-9._@-]{0,63}$/;

/** Login ids are case-insensitive: phone keyboards often capitalize the first letter. */
export function normalizeUsername(raw: string): string {
  return raw.normalize('NFKC').trim().toLowerCase();
}

/** Expects a normalized username. */
export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function isAcceptableNewPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}
