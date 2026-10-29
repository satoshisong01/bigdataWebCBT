/**
 * Minimal dotenv-compatible parser used by scripts/db-setup.mjs and the opt-in DB integration test
 * (the app itself gets .env.local from Next). One KEY=VALUE per line, optional `export `, `#`
 * comments, '…' "…" `…` quoting (\n and \r expanded inside double quotes). No $VAR expansion.
 * Never logs anything. Loaded through the TypeScript transpiler — no runtime imports here.
 */

const LINE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/;
const QUOTED_RE = /^(['"`])((?:\\\1|(?!\1)[\s\S])*)\1/;

function parseValue(rest: string): string {
  const raw = rest.trim();
  const quoted = QUOTED_RE.exec(raw);
  if (quoted) {
    const inner = quoted[2];
    return quoted[1] === '"' ? inner.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : inner;
  }
  const hash = raw.indexOf('#');
  return (hash === -1 ? raw : raw.slice(0, hash)).trim();
}

export function parseEnvFile(text: string): Record<string, string> {
  const entries = text
    .split(/\r?\n/)
    .map((line) => LINE_RE.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m): [string, string] => [m[1], parseValue(m[2])]);
  return Object.fromEntries(entries);
}

/** Values to add to an environment: keys that are already set win (dotenv semantics). */
export function missingEnv(parsed: Readonly<Record<string, string>>, current: Readonly<Record<string, string | undefined>>): Record<string, string> {
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => current[key] === undefined));
}
