// Ops script for the account + sync tables (docs/2027-study-overhaul.md §7.2–§7.3).
// DB_* come from the environment, falling back to .env.local (variables already set win).
// Secret values are never printed; driver errors are redacted before printing.
//
//   node scripts/db-setup.mjs migrate                  idempotent DDL into DB_SCHEMA
//   NEW_USER_PASSWORD=... node scripts/db-setup.mjs create-user <username>
//                                                     create, or reset password + unlock
//   node scripts/db-setup.mjs users                    account count and usernames
//
// The TLS policy, password hashing, DDL and account SQL are loaded from src/server through the
// TypeScript transpiler, so this script and the Route Handlers share one implementation.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require(path.join(root, 'node_modules', 'typescript'));
const loaded = new Map();

function resolveLocal(specifier, fromFile) {
  const base = specifier.startsWith('@/')
    ? path.join(root, 'src', specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  return base.endsWith('.ts') ? base : `${base}.ts`;
}

/** CommonJS-transpiles a src TypeScript module; its relative and @/ imports load the same way. */
function loadTs(file) {
  const cached = loaded.get(file);
  if (cached) return cached.exports;
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const mod = { exports: {} };
  loaded.set(file, mod);
  const localRequire = (specifier) =>
    specifier.startsWith('.') || specifier.startsWith('@/') ? loadTs(resolveLocal(specifier, file)) : require(specifier);
  new Function('module', 'exports', 'require', outputText)(mod, mod.exports, localRequire);
  return mod.exports;
}

const server = (name) => loadTs(path.join(root, 'src', 'server', `${name}.ts`));
const { describeError, readDbEnv } = server('env');

function loadEnvLocal() {
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return;
  const { missingEnv, parseEnvFile } = server('env-file');
  Object.assign(process.env, missingEnv(parseEnvFile(fs.readFileSync(file, 'utf8')), process.env));
}

const USAGE = [
  'usage:',
  '  node scripts/db-setup.mjs migrate',
  '  NEW_USER_PASSWORD=<password> node scripts/db-setup.mjs create-user <username>',
  '  node scripts/db-setup.mjs users',
].join('\n');

async function migrate(pool, schema) {
  const { applyMigrations } = server('migrations');
  const client = await pool.connect();
  try {
    const applied = await applyMigrations(client, schema);
    console.log(applied.length > 0 ? `migrate: applied ${applied.join(', ')}` : 'migrate: already up to date');
  } finally {
    client.release();
  }
}

async function createUser(pool, schema, username) {
  if (!username) throw new Error('create-user needs a <username> argument');
  const password = process.env.NEW_USER_PASSWORD;
  if (!password) throw new Error('pass the password in the NEW_USER_PASSWORD environment variable');
  const { createOrResetUser } = server('admin');
  console.log(await createOrResetUser(pool, schema, username, password));
}

async function listUsers(pool, schema) {
  const { listUsernames } = server('admin');
  const names = await listUsernames(pool, schema);
  console.log(`users: ${names.length}`);
  for (const name of names) console.log(name);
}

const COMMANDS = new Map([
  ['migrate', migrate],
  ['create-user', createUser],
  ['users', listUsers],
]);

async function main() {
  const [command, arg] = process.argv.slice(2);
  const run = COMMANDS.get(command);
  if (!run) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  loadEnvLocal();
  const env = readDbEnv(process.env);
  const { buildPoolConfig } = server('db-config');
  const { Pool } = require('pg');
  const pool = new Pool(buildPoolConfig(env));
  pool.on('error', (err) => console.error(`db-setup: idle client error: ${describeError(err)}`));
  try {
    await run(pool, env.schema, arg);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`db-setup failed: ${describeError(err)}`);
  process.exitCode = 1;
});
