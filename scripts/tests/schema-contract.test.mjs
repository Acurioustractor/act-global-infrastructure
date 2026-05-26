/**
 * Schema-contract test — "honest by construction" for the command center.
 *
 * 1. Unit tests pin the parser behaviour (no DB needed).
 * 2. The integration test asserts no NEW schema drift beyond the committed baseline
 *    (config/schema-contract-baseline.json) — it fails the moment a query references a
 *    table/column that doesn't exist in the live shared DB. Burn the baseline to 0 for
 *    full strictness.
 *
 * Schema source: live DB if SUPABASE_SHARED_SERVICE_ROLE_KEY is set, else the committed
 * snapshot (config/schema-snapshot.json). If NEITHER is available the test ERRORS — it
 * never passes silently.
 *
 * Run: node --test scripts/tests/schema-contract.test.mjs
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import '../../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import {
  baseColumn,
  parseClientInstances,
  scanFile,
  scanAll,
  fluentChainAfter,
  resolveSchema,
  loadBaseline,
  applyBaseline,
  diff,
} from '../lib/schema-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const SNAPSHOT = join(REPO, 'config', 'schema-snapshot.json');
const ALLOWLIST = join(REPO, 'config', 'schema-contract-allowlist.json');
const BASELINE = join(REPO, 'config', 'schema-contract-baseline.json');
const ROOTS = [join(REPO, 'apps', 'command-center', 'src')];

// ---------------------------------------------------------------------------
// Unit: column-token normalization
// ---------------------------------------------------------------------------
describe('baseColumn', () => {
  it('passes through a plain column', () => assert.equal(baseColumn('total'), 'total'));
  it('skips *', () => assert.equal(baseColumn('*'), null));
  it('skips embedded resources rel(...)', () => assert.equal(baseColumn('contact:ghl_contacts(name)'), null));
  it('takes the real column after an alias colon', () => assert.equal(baseColumn('amount:total'), 'total'));
  it('strips a ::cast', () => assert.equal(baseColumn('date::text'), 'date'));
  it('strips a -> json path', () => assert.equal(baseColumn("metadata->>'k'"), 'metadata'));
  it('skips count aggregate', () => assert.equal(baseColumn('count'), null));
});

// ---------------------------------------------------------------------------
// Unit: client-instance resolution (the EL-alias trap)
// ---------------------------------------------------------------------------
describe('parseClientInstances', () => {
  it('classifies a shared import', () => {
    const m = parseClientInstances(`import { supabase } from '@/lib/supabase'`);
    assert.equal(m.get('supabase'), 'shared');
  });
  it('classifies `elSupabase as supabase` as the EL instance', () => {
    const m = parseClientInstances(`import { elSupabase as supabase } from '@/lib/supabase'`);
    assert.equal(m.get('supabase'), 'el');
  });
  it('ignores the @supabase/supabase-js SDK import', () => {
    const m = parseClientInstances(`import { createClient } from '@supabase/supabase-js'`);
    assert.equal(m.has('createClient'), false);
  });
});

// ---------------------------------------------------------------------------
// Unit: scanFile parsing on synthetic source (multi-line, star, write, EL-aliased)
// ---------------------------------------------------------------------------
describe('scanFile', () => {
  let dir;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'schema-contract-'));
  });

  const write = (name, content) => {
    const p = join(dir, name);
    writeFileSync(p, content);
    return p;
  };

  it('extracts table + columns from a multi-line chained query', () => {
    const p = write('a.ts', `import { supabase } from '@/lib/supabase'\nawait supabase\n  .from('xero_transactions')\n  .select('id, total, type')\n  .eq('x', 1)`);
    const { refs } = scanFile(p, dir);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].table, 'xero_transactions');
    assert.equal(refs[0].instance, 'shared');
    assert.deepEqual(refs[0].columns.sort(), ['id', 'total', 'type']);
  });

  it('marks select(*) as table-only (no column claims)', () => {
    const p = write('b.ts', `import { supabase } from '@/lib/supabase'\nsupabase.from('projects').select('*', { count: 'exact', head: true })`);
    const { refs } = scanFile(p, dir);
    assert.equal(refs[0].columns.length, 0);
    assert.equal(refs[0].hasStar, true);
  });

  it('routes an EL-aliased client to the el instance', () => {
    const p = write('c.ts', `import { elSupabase as supabase } from '@/lib/supabase'\nsupabase.from('storyteller_master_analysis').select('id, headline')`);
    const { refs } = scanFile(p, dir);
    assert.equal(refs[0].instance, 'el');
  });

  it('does NOT treat Buffer.from / dynamic .from(var) as table refs', () => {
    const p = write('d.ts', `const b = Buffer.from(x);\nconst t = 'foo';\ndb.from(t).select('a')`);
    const { refs, dynamic } = scanFile(p, dir);
    assert.equal(refs.length, 0); // no quoted-literal .from
    assert.ok(dynamic.some((d) => d.expr === 't'));
  });

  it('extracts filter/order column args from a fluent chain', () => {
    const p = write('e.ts', `import { supabase } from '@/lib/supabase'\nawait supabase.from('xero_transactions').select('id').eq('type', 'SPEND').gte('date', d).is('project_code', null).order('total', { ascending: false })`);
    const { refs } = scanFile(p, dir);
    assert.deepEqual(refs[0].filterColumns.sort(), ['date', 'project_code', 'total', 'type']);
  });

  it('validates filter columns even under select(*) (write/star refs)', () => {
    const p = write('e2.ts', `import { supabase } from '@/lib/supabase'\nsupabase.from('projects').select('*').eq('ghost_col', 1)`);
    const { refs } = scanFile(p, dir);
    assert.equal(refs[0].hasStar, true);
    assert.deepEqual(refs[0].filterColumns, ['ghost_col']);
  });

  it('scopes filter columns to the fluent chain, not the whole text chunk', () => {
    // Regression for the contacts/all false positive: an inline `.from('projects')` sub-query
    // whose chain ends, followed by `.order()` calls on a *different* builder variable. Chunk-based
    // attribution wrongly blamed `projects` for `full_name`/`tags`; chain-scoping must not.
    const p = write('f.ts', [
      `import { supabase } from '@/lib/supabase'`,
      `let query = base.from('ghl_contacts').select('*')`,
      `if (project) {`,
      `  const { data } = await supabase.from('projects').select('code').eq('code', project).limit(1)`,
      `  query = query.contains('tags', [x])`,
      `}`,
      `query = query.order('full_name', { ascending: true })`,
    ].join('\n'));
    const { refs } = scanFile(p, dir);
    const projectsRef = refs.find((r) => r.table === 'projects');
    assert.deepEqual(projectsRef.filterColumns.sort(), ['code']); // NOT full_name / tags
  });
});

// ---------------------------------------------------------------------------
// Unit: fluent-chain walker (parses one query's attached method chain)
// ---------------------------------------------------------------------------
describe('fluentChainAfter', () => {
  it('stops at the end of the statement (next line is a new statement, not a .method)', () => {
    const src = `from('x').select('a').eq('b', 1)\nquery = query.order('c')`;
    const chain = fluentChainAfter(src, src.indexOf(')') + 1); // just after from('x')
    assert.ok(chain.includes(".eq('b', 1)"));
    assert.ok(!chain.includes('order')); // the reassigned-variable call is excluded
  });

  it('is string/paren aware (args containing parens or quotes do not end the chain early)', () => {
    const src = `from('x').or('a.eq.1,b.eq.2').eq('c', fn(1, 2)).limit(3)`;
    const chain = fluentChainAfter(src, src.indexOf(')') + 1);
    assert.ok(chain.includes(".eq('c', fn(1, 2))"));
    assert.ok(chain.includes('.limit(3)'));
  });
});

// ---------------------------------------------------------------------------
// Integration: no NEW drift beyond the baseline
// ---------------------------------------------------------------------------
describe('command-center schema contract', () => {
  it('has no schema drift beyond the committed baseline', async () => {
    const url = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

    // Honest by construction: error loudly if there is no schema source at all.
    const { schema, source } = await resolveSchema({ supabase, snapshotPath: SNAPSHOT });
    assert.ok(schema.tables.size > 100, `schema looks truncated (${schema.tables.size} tables) — source: ${source}`);

    const allowlist = existsSync(ALLOWLIST) ? JSON.parse(readFileSync(ALLOWLIST, 'utf8')) : {};
    const { refs } = scanAll(ROOTS, REPO);
    const result = diff(refs, schema, allowlist);
    const baseline = loadBaseline(BASELINE);
    const { newDeadTables, newDeadColumns } = applyBaseline(result, baseline);

    const lines = [
      ...newDeadTables.map((r) => `🔴 ${r.file}:${r.line} dead table '${r.table}'`),
      ...newDeadColumns.map((r) => `🟠 ${r.file}:${r.line} ${r.table} → ${r.badColumns.join(', ')}`),
    ];
    assert.equal(
      newDeadTables.length + newDeadColumns.length,
      0,
      `NEW schema drift (not in baseline) — fix the query or run \`node scripts/check-schema-contract.mjs --baseline\`:\n${lines.join('\n')}`,
    );
  });
});
