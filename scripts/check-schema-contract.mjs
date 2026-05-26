#!/usr/bin/env node
/**
 * Schema-contract checker (CLI) — fails when command-center code references a
 * table/column that doesn't exist in the live shared DB.
 *
 * Usage:
 *   node scripts/check-schema-contract.mjs            # check, print report, exit 1 on violations
 *   node scripts/check-schema-contract.mjs --json      # machine-readable report
 *   node scripts/check-schema-contract.mjs --snapshot  # refresh config/schema-snapshot.json from live
 *
 * Schema source: live DB if SUPABASE_SHARED_SERVICE_ROLE_KEY is set, else the committed
 * snapshot. If neither is available it ERRORS (never passes silently).
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  scanAll,
  resolveSchema,
  fetchLiveSchema,
  saveSnapshot,
  saveBaseline,
  loadBaseline,
  applyBaseline,
  diff,
} from './lib/schema-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const SNAPSHOT = join(REPO, 'config', 'schema-snapshot.json');
const ALLOWLIST = join(REPO, 'config', 'schema-contract-allowlist.json');
const BASELINE = join(REPO, 'config', 'schema-contract-baseline.json');
const ROOTS = [join(REPO, 'apps', 'command-center', 'src')];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const doSnapshot = args.includes('--snapshot');
const doBaseline = args.includes('--baseline');

function makeClient() {
  const url = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST)) return {};
  return JSON.parse(readFileSync(ALLOWLIST, 'utf8'));
}

async function main() {
  const supabase = makeClient();

  if (doSnapshot) {
    if (!supabase) {
      console.error('✗ --snapshot needs live DB creds (SUPABASE_SHARED_SERVICE_ROLE_KEY).');
      process.exit(2);
    }
    const schema = await fetchLiveSchema(supabase);
    const out = saveSnapshot(SNAPSHOT, schema, { db: 'tednluwflfhxyucgwigh (shared)' });
    console.log(`✓ snapshot written: ${SNAPSHOT}`);
    console.log(`  ${Object.keys(out.tables).length} tables/views captured.`);
    return;
  }

  const { schema, source } = await resolveSchema({ supabase, snapshotPath: SNAPSHOT });
  const { refs, dynamic } = scanAll(ROOTS, REPO);
  const allowlist = loadAllowlist();
  const result = diff(refs, schema, allowlist);

  if (doBaseline) {
    const out = saveBaseline(BASELINE, result);
    console.log(`✓ baseline written: ${BASELINE}`);
    console.log(`  ${out.count} known violations accepted (burn this down to 0).`);
    return;
  }

  const baseline = loadBaseline(BASELINE);
  const { newDeadTables, newDeadColumns, stale } = applyBaseline(result, baseline);

  if (asJson) {
    console.log(
      JSON.stringify({ source, ...result, newDeadTables, newDeadColumns, stale, dynamicCount: dynamic.length }, null, 2),
    );
  } else {
    printReport({ schema, source, refs, dynamic, result, baseline, newDeadTables, newDeadColumns, stale });
  }

  // Fail only on NEW drift (not in the baseline). Burn-down progress is reported, not failed.
  const newViolations = newDeadTables.length + newDeadColumns.length;
  process.exit(newViolations > 0 ? 1 : 0);
}

function printReport({ schema, source, refs, dynamic, result, baseline, newDeadTables, newDeadColumns, stale }) {
  const { deadTables, deadColumns, skipped, ok } = result;
  const totalViol = deadTables.length + deadColumns.length;
  console.log('━━━ Schema-contract check ━━━');
  console.log(`schema source : ${source} (${schema.tables.size} tables/views)`);
  console.log(`refs scanned  : ${refs.length} (${ok} ok, ${skipped.length} skipped)`);
  console.log(`dynamic .from : ${dynamic.length} (unverifiable — review manually)`);
  console.log(`baseline      : ${baseline.size} accepted · ${totalViol} present · ${stale.length} fixed (prunable)`);
  console.log('');

  // NEW drift — the only thing that fails CI.
  if (newDeadTables.length || newDeadColumns.length) {
    console.log(`🚨 NEW DRIFT (${newDeadTables.length + newDeadColumns.length}) — not in the baseline, FAILS the check:`);
    for (const r of newDeadTables) console.log(`   🔴 ${r.file}:${r.line}  dead table '${r.table}'`);
    for (const r of newDeadColumns)
      console.log(`   🟠 ${r.file}:${r.line}  ${r.table} → ${r.badColumns.join(', ')}`);
    console.log('');
    console.log('   Fix the query (or, if the table/column legitimately moved, update the baseline:');
    console.log('   node scripts/check-schema-contract.mjs --baseline).');
  }

  if (stale.length) {
    console.log(`✅ ${stale.length} baselined violation(s) FIXED — prune them (re-run --baseline):`);
    for (const s of stale) console.log(`   - ${s}`);
    console.log('');
  }

  if (!newDeadTables.length && !newDeadColumns.length) {
    if (totalViol === 0) console.log('✅ schema contract holds — no dead tables or columns anywhere.');
    else console.log(`✅ no NEW drift. ${totalViol} known violations remain in the burn-down baseline.`);
  } else {
    console.log(`✗ ${newDeadTables.length + newDeadColumns.length} NEW violation(s).`);
  }
}

function groupBy(arr, fn) {
  const m = new Map();
  for (const x of arr) {
    const k = fn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

main().catch((e) => {
  console.error('✗ schema-contract check errored:', e.message);
  process.exit(2);
});
