/**
 * Server-only: DB connection settings from environment variables (docs §7.1).
 * Error messages name the variable but never echo its value (public repo, platform logs).
 * Also loaded by scripts/db-setup.mjs through the TypeScript transpiler — no runtime imports here.
 */

export interface DbEnv {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  /** validated, unquoted schema name */
  schema: string;
  /** base64 of the CA certificate PEM — required for any non-local host (enforced in db-config) */
  caPemB64?: string;
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

const SCHEMA_RE = /^[a-z_][a-z0-9_]{0,62}$/;
const REQUIRED_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA'] as const;
/** values that drivers may echo in error text (e.g. `password authentication failed for user "…"`) */
const SECRET_KEYS = ['DB_PASS', 'DB_CA_PEM_B64', 'DB_USER', 'DB_HOST', 'DB_NAME'] as const;
const IPV4_ANYWHERE_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

export function isValidSchemaName(name: string): boolean {
  return SCHEMA_RE.test(name);
}

/** Validated, double-quoted schema identifier for SQL text (the regex admits no quote characters). */
export function quoteSchema(name: string): string {
  if (!isValidSchemaName(name)) throw new Error('DB_SCHEMA must match ^[a-z_][a-z0-9_]{0,62}$');
  return `"${name}"`;
}

export function readDbEnv(source: EnvSource = process.env): DbEnv {
  const missing = REQUIRED_KEYS.filter((key) => !source[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
  }
  const port = Number(source.DB_PORT?.trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }
  const schema = (source.DB_SCHEMA ?? '').trim();
  if (!isValidSchemaName(schema)) {
    throw new Error('DB_SCHEMA must match ^[a-z_][a-z0-9_]{0,62}$');
  }
  const ca = source.DB_CA_PEM_B64?.trim();
  return {
    host: (source.DB_HOST ?? '').trim(),
    port,
    user: (source.DB_USER ?? '').trim(),
    password: source.DB_PASS ?? '',
    database: (source.DB_NAME ?? '').trim(),
    schema,
    ...(ca ? { caPemB64: ca } : {}),
  };
}

/** Masks DB credential values and IPv4 addresses so error text is safe to log or print. */
export function redactSecrets(text: string, source: EnvSource = process.env): string {
  const secrets = SECRET_KEYS.map((key) => ({ key, value: source[key]?.trim() ?? '' }))
    .filter((s) => s.value.length > 0)
    .sort((a, b) => b.value.length - a.value.length);
  const masked = secrets.reduce((acc, s) => acc.split(s.value).join(`<${s.key}>`), text);
  return masked.replace(IPV4_ANYWHERE_RE, '<ip>');
}

/** One-line, redacted description of an error (name, driver code, message) for logs. */
export function describeError(err: unknown, source: EnvSource = process.env): string {
  if (!(err instanceof Error)) return redactSecrets(String(err), source);
  const code = (err as { code?: unknown }).code;
  const label = typeof code === 'string' ? `${err.name} [${code}]` : err.name;
  return redactSecrets(`${label}: ${err.message}`, source);
}
