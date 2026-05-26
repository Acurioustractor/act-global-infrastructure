/**
 * Schema-contract scanner — "honest by construction" for the command center.
 *
 * Parses every Supabase `.from('<table>').select('<columns>')` reference in the
 * command-center source and asserts each table + column actually exists in the
 * live shared DB schema. A reference to a dead table or drifted column = a silent
 * zero in the UI, which is exactly what the 2026-05-26 trust-map audit found.
 *
 * Pure text parsing (no TS compile) so it runs anywhere supabase-js does.
 *
 * Exports:
 *   walkSourceFiles(roots)        -> string[] of .ts/.tsx files
 *   scanFile(path)                -> { refs, dynamic } for one file
 *   scanAll(roots)                -> { refs, dynamic } across roots
 *   fetchLiveSchema(supabase)     -> { tables:Set, columns:Map<table,Set> }
 *   loadSnapshot(path)/saveSnapshot(path, schema)
 *   diff(refs, schema, allowlist) -> { deadTables, deadColumns, skipped, ok }
 *
 * Run via scripts/check-schema-contract.mjs (CLI) or
 * scripts/tests/schema-contract.test.mjs (node --test).
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// ---------------------------------------------------------------------------
// 1. File walking
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.next', '_archived', '_archive', 'dist', '.git']);

/** Recursively collect .ts/.tsx files under the given roots. */
export function walkSourceFiles(roots) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) visit(full);
      else if (/\.tsx?$/.test(name)) out.push(full);
    }
  };
  for (const r of roots) visit(r);
  return out;
}

// ---------------------------------------------------------------------------
// 2. Source parsing
// ---------------------------------------------------------------------------

// `client.from('table')` — quoted literal only, capturing the client identifier (group 1) so
// we can route the ref to the right Supabase instance. Buffer.from(buf) / .from(variable) excluded.
const FROM_RE = /(?:([A-Za-z_$][\w$]*)\s*)?\.from\(\s*(['"`])([a-zA-Z_][a-zA-Z0-9_]*)\2\s*\)/g;
// `.from(identifier)` — dynamic table (reported, never failed).
const DYNAMIC_FROM_RE = /\.from\(\s*([A-Za-z_$][A-Za-z0-9_$.]*)\s*\)/g;
// first string arg of a `.select(...)` — handles single/double/backtick, multi-line backtick.
const SELECT_RE = /\.select\(\s*(['"`])([\s\S]*?)\1/;
// write ops reference the table but columns come from a JS object payload → table-only check.
const WRITE_RE = /\.(insert|upsert|update|delete)\(/;

/**
 * Build a map of local client identifier -> Supabase instance ('shared' | 'el' | 'media')
 * from a file's imports of `@/lib/supabase`. Handles `elSupabase as supabase` aliasing — the
 * storyteller routes rebind `supabase` to the EL v2 client, so their queries target a different DB.
 */
export function parseClientInstances(content) {
  const map = new Map();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*supabase[^'"]*)['"]/g;
  for (const m of content.matchAll(importRe)) {
    const path = m[2];
    if (path.includes('@supabase/')) continue; // the SDK, not a client instance
    for (const spec of m[1].split(',')) {
      const parts = spec.trim().split(/\s+as\s+/);
      const original = parts[0].trim();
      const local = (parts[1] || parts[0]).trim();
      if (!original) continue;
      let instance = 'shared';
      if (/^el/i.test(original)) instance = 'el';
      else if (/media/i.test(original)) instance = 'media';
      map.set(local, instance);
    }
  }
  return map;
}

/** byte offset -> 1-based line number */
function lineAt(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/**
 * Split a PostgREST select string into top-level column tokens, ignoring commas
 * inside parentheses (embedded resources like `rel(a,b)`).
 */
function splitTopLevel(selectStr) {
  const tokens = [];
  let depth = 0;
  let cur = '';
  for (const ch of selectStr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      tokens.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) tokens.push(cur);
  return tokens.map((t) => t.trim()).filter(Boolean);
}

/**
 * Reduce a column token to the bare base column name to validate, or null to skip.
 * Handles: `*`, `alias:real_col`, `col::cast`, `col->>'k'` / `col->'k'`, embedded `rel(...)`,
 * aggregates `count`, and whitespace/newlines.
 */
export function baseColumn(token) {
  let t = token.trim();
  if (!t) return null;
  if (t === '*') return null; // all-columns → table-only, nothing to validate
  if (t.includes('(')) return null; // embedded resource / aggregate → skip (table-only)
  // strip ::cast first (before the alias colon, so `date::text` doesn't read as alias `date`:`text`)
  if (t.includes('::')) t = t.split('::')[0].trim();
  // PostgREST rename `alias:real_col` — the real column is after the colon.
  if (t.includes(':')) t = t.split(':').pop().trim();
  // strip JSON path operators (-> / ->>)
  if (t.includes('->')) t = t.split('->')[0].trim();
  // strip any trailing .asc/.desc-ish or stray quotes
  t = t.replace(/['"`]/g, '').trim();
  if (!t || t === '*') return null;
  // a bare aggregate keyword
  if (t === 'count') return null;
  // anything left that isn't an identifier → skip rather than false-positive
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) return null;
  return t;
}

/**
 * Scan one source file. Returns { refs, dynamic }.
 *   refs:   [{ file, line, table, columns:[], hasStar, kind:'select'|'write'|'bare', selectDynamic }]
 *   dynamic:[{ file, line, expr }]  (dynamic .from(variable) near a query verb)
 */
export function scanFile(path, repoRoot = process.cwd()) {
  const content = readFileSync(path, 'utf8');
  const rel = relative(repoRoot, path);
  const refs = [];
  const clients = parseClientInstances(content);

  // Quoted-literal `client.from('table')` references.
  const matches = [...content.matchAll(FROM_RE)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const clientId = m[1];
    const table = m[3];
    const instance = clientId && clients.has(clientId) ? clients.get(clientId) : 'shared';
    const startIdx = m.index + m[0].length;
    const next = matches[i + 1];
    const endIdx = next ? next.index : content.length;
    const chunk = content.slice(startIdx, endIdx);

    const ref = {
      file: rel,
      line: lineAt(content, m.index),
      table,
      instance,
      columns: [],
      hasStar: false,
      kind: 'bare',
      selectDynamic: false,
    };

    const sel = chunk.match(SELECT_RE);
    if (sel) {
      ref.kind = 'select';
      const raw = sel[2];
      if (raw.includes('${')) {
        ref.selectDynamic = true; // template interpolation → can't trust columns → table-only
      } else {
        for (const tok of splitTopLevel(raw)) {
          if (tok.trim() === '*') ref.hasStar = true;
          const col = baseColumn(tok);
          if (col) ref.columns.push(col);
        }
      }
    } else if (WRITE_RE.test(chunk.slice(0, 200))) {
      ref.kind = 'write'; // insert/upsert/update/delete → table-only
    }
    refs.push(ref);
  }

  // Dynamic `.from(variable)` — only when a query verb follows (filters out Buffer.from etc.).
  const dynamic = [];
  for (const m of content.matchAll(DYNAMIC_FROM_RE)) {
    const expr = m[1];
    const after = content.slice(m.index + m[0].length, m.index + m[0].length + 120);
    if (/^\s*\.(select|insert|upsert|update|delete|eq|in|order|gte|lte|match|single|maybeSingle)\(/.test(after)) {
      dynamic.push({ file: rel, line: lineAt(content, m.index), expr });
    }
  }

  return { refs, dynamic };
}

/** Scan every .ts/.tsx under roots. */
export function scanAll(roots, repoRoot = process.cwd()) {
  const refs = [];
  const dynamic = [];
  for (const f of walkSourceFiles(roots)) {
    const r = scanFile(f, repoRoot);
    refs.push(...r.refs);
    dynamic.push(...r.dynamic);
  }
  return { refs, dynamic };
}

// ---------------------------------------------------------------------------
// 3. Live schema ground truth
// ---------------------------------------------------------------------------

/**
 * Fetch the public schema of the shared DB via the exec_sql RPC (repo convention).
 * Returns { tables:Set<string>, columns:Map<string, Set<string>> } covering tables AND views.
 */
export async function fetchLiveSchema(supabase) {
  // Aggregate to ONE row per table — a flat column list would be thousands of rows and
  // PostgREST silently caps results at ~1000 even through exec_sql (the F-sweep row-cap trap),
  // which truncated alphabetically and wrongly flagged xero_* tables as dead.
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT table_name, array_agg(column_name ORDER BY ordinal_position) AS columns
            FROM information_schema.columns
            WHERE table_schema = 'public'
            GROUP BY table_name
            ORDER BY table_name`,
  });
  if (error) throw new Error(`exec_sql failed: ${error.message}`);
  const rows = Array.isArray(data) ? data : data?.rows || [];
  if (!rows.length) throw new Error('exec_sql returned no schema rows');
  const columns = new Map();
  for (const row of rows) {
    const t = row.table_name;
    const cols = Array.isArray(row.columns) ? row.columns : [];
    columns.set(t, new Set(cols));
  }
  return { tables: new Set(columns.keys()), columns };
}

/** Serialize a fetched schema to a committed JSON snapshot. */
export function saveSnapshot(path, schema, meta = {}) {
  const obj = {
    generatedAt: new Date().toISOString(),
    ...meta,
    tables: Object.fromEntries([...schema.columns].map(([t, cols]) => [t, [...cols].sort()])),
  };
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
  return obj;
}

/** Load a snapshot JSON back into { tables, columns } form. */
export function loadSnapshot(path) {
  const obj = JSON.parse(readFileSync(path, 'utf8'));
  const columns = new Map();
  for (const [t, cols] of Object.entries(obj.tables || {})) {
    columns.set(t, new Set(cols));
  }
  return { tables: new Set(columns.keys()), columns, generatedAt: obj.generatedAt };
}

/** Resolve schema from live DB if creds present, else committed snapshot, else throw. */
export async function resolveSchema({ supabase, snapshotPath }) {
  if (supabase) {
    try {
      const live = await fetchLiveSchema(supabase);
      return { schema: live, source: 'live' };
    } catch (e) {
      if (snapshotPath && existsSync(snapshotPath)) {
        return { schema: loadSnapshot(snapshotPath), source: `snapshot (live failed: ${e.message})` };
      }
      throw e;
    }
  }
  if (snapshotPath && existsSync(snapshotPath)) {
    return { schema: loadSnapshot(snapshotPath), source: 'snapshot' };
  }
  throw new Error(
    'No schema source: set SUPABASE_SHARED_SERVICE_ROLE_KEY (live) or provide a committed snapshot. ' +
      'Refusing to pass silently.',
  );
}

// ---------------------------------------------------------------------------
// 4. Diff
// ---------------------------------------------------------------------------

/**
 * Compare scanned refs against the live schema.
 * allowlist = {
 *   crossInstanceTables: string[],  // live in EL v2 / media, not the shared DB — not "dead"
 *   ignoreFiles: string[],          // path substrings to skip entirely (non-shared client)
 *   ignoreColumns: { [table]: string[] }  // known false-positives (computed/RPC-returned)
 * }
 */
export function diff(refs, schema, allowlist = {}) {
  const crossInstance = new Set(allowlist.crossInstanceTables || []);
  const ignoreFiles = allowlist.ignoreFiles || [];
  const ignoreColumns = allowlist.ignoreColumns || {};
  const isIgnoredFile = (f) => ignoreFiles.some((p) => f.includes(p));

  const deadTables = [];
  const deadColumns = [];
  const skipped = [];
  let ok = 0;

  for (const ref of refs) {
    if (ref.instance && ref.instance !== 'shared') {
      skipped.push({ ...ref, reason: `${ref.instance}-instance-client` });
      continue;
    }
    if (isIgnoredFile(ref.file)) {
      skipped.push({ ...ref, reason: 'allowlisted-file' });
      continue;
    }
    if (crossInstance.has(ref.table)) {
      skipped.push({ ...ref, reason: 'cross-instance-table' });
      continue;
    }
    if (!schema.tables.has(ref.table)) {
      deadTables.push(ref);
      continue;
    }
    const tableCols = schema.columns.get(ref.table);
    const ignored = new Set(ignoreColumns[ref.table] || []);
    if (ref.selectDynamic || ref.kind === 'write' || ref.kind === 'bare') {
      ok++; // table verified; columns not statically checkable here
      continue;
    }
    const bad = ref.columns.filter((c) => !tableCols.has(c) && !ignored.has(c));
    if (bad.length) {
      deadColumns.push({ ...ref, badColumns: bad });
    } else {
      ok++;
    }
  }
  return { deadTables, deadColumns, skipped, ok };
}

// ---------------------------------------------------------------------------
// 5. Baseline ratchet — accept today's known violations, fail only on NEW drift.
// ---------------------------------------------------------------------------

/** Stable signature for a violation, independent of line number (so refactors don't churn it). */
export function violationSignature(ref, kind) {
  if (kind === 'table') return `${ref.file}::${ref.table}::TABLE`;
  return `${ref.file}::${ref.table}::${[...ref.badColumns].sort().join(',')}`;
}

/** Read the baseline JSON → Set of accepted signatures. Missing file = empty (strict). */
export function loadBaseline(path) {
  if (!existsSync(path)) return new Set();
  const obj = JSON.parse(readFileSync(path, 'utf8'));
  return new Set(obj.accepted || []);
}

/** Write the current violations as the accepted baseline (the burn-down checklist). */
export function saveBaseline(path, result) {
  const accepted = [
    ...new Set([
      ...result.deadTables.map((r) => violationSignature(r, 'table')),
      ...result.deadColumns.map((r) => violationSignature(r, 'column')),
    ]),
  ].sort();
  const obj = {
    _doc:
      'Known schema-contract violations accepted as of the date below. The test fails on any ' +
      'violation NOT in this list. Burn this down (archive dead-table routes, fix drifted columns) ' +
      'until empty, then delete the file for full strictness. Regenerate: node scripts/check-schema-contract.mjs --baseline',
    generatedAt: new Date().toISOString(),
    count: accepted.length,
    accepted,
  };
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
  return obj;
}

/**
 * Split diff results against the baseline.
 *   newDeadTables / newDeadColumns — violations NOT in the baseline (these FAIL the test).
 *   stale — baseline signatures no longer present (fixed; should be pruned from the baseline).
 */
export function applyBaseline(result, baseline) {
  const present = new Set();
  const newDeadTables = result.deadTables.filter((r) => {
    const sig = violationSignature(r, 'table');
    present.add(sig);
    return !baseline.has(sig);
  });
  const newDeadColumns = result.deadColumns.filter((r) => {
    const sig = violationSignature(r, 'column');
    present.add(sig);
    return !baseline.has(sig);
  });
  const stale = [...baseline].filter((sig) => !present.has(sig));
  return { newDeadTables, newDeadColumns, stale };
}
