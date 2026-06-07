#!/usr/bin/env node
/**
 * cost-drill-tracer.mjs — tracer-bullet for POST /api/finance/cost-reassign.
 *
 * Proves the full reversible path on ONE real line before any bulk reassign:
 *   1. pick the smallest ACT-IN SPEND line, snapshot {project_code, project_code_source}
 *   2. reassign it ACT-IN → ACT-JH via the live API; verify mirror + applied.prevCode
 *   3. undo (reassign back to prevCode) via the API; verify mirror restored
 *   4. restore the original project_code_source so the row is byte-intact
 *
 * Read-write to our Supabase mirror only (reversible); never touches Xero.
 * Run: node scripts/cost-drill-tracer.mjs
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.COST_DRILL_BASE || 'http://localhost:3002';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const assert = (cond, msg) => { if (!cond) { console.error(`❌ FAIL: ${msg}`); process.exit(1); } else console.log(`✓ ${msg}`); };

async function reassign(decisions) {
  const res = await fetch(`${BASE}/api/finance/cost-reassign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }),
  });
  const data = await res.json();
  if (!res.ok) { console.error('reassign error', data); process.exit(1); }
  return data;
}
async function readRow(id) {
  const { data, error } = await supabase.from('xero_transactions').select('id, project_code, project_code_source, total, contact_name').eq('id', id).single();
  if (error) { console.error(error); process.exit(1); }
  return data;
}

// 1. pick smallest ACT-IN SPEND line
const { data: picks, error } = await supabase
  .from('xero_transactions')
  .select('id, project_code, project_code_source, total, contact_name')
  .eq('project_code', 'ACT-IN').eq('type', 'SPEND')
  .gt('total', 0).order('total', { ascending: true }).limit(1);
if (error || !picks?.length) { console.error('no ACT-IN SPEND line found', error); process.exit(1); }
const line = picks[0];
const TARGET = 'ACT-JH';
console.log(`\nTracer line: ${line.id}\n  ${line.contact_name} · $${line.total} · was ${line.project_code} (source=${line.project_code_source})\n`);

// 2. reassign ACT-IN → ACT-JH
const r1 = await reassign([{ kind: 'transaction', id: line.id, code: TARGET }]);
assert(r1.appliedCount === 1, `apply: 1 row reassigned (got ${r1.appliedCount})`);
assert(r1.applied[0].prevCode === line.project_code, `apply: prevCode = ${line.project_code} (got ${r1.applied[0].prevCode})`);
const after1 = await readRow(line.id);
assert(after1.project_code === TARGET, `mirror: project_code now ${TARGET}`);
assert(after1.project_code_source === 'manual', `mirror: source now 'manual' (auto-tagger protected)`);

// 3. undo: reassign back to prevCode
const r2 = await reassign([{ kind: 'transaction', id: line.id, code: r1.applied[0].prevCode }]);
assert(r2.appliedCount === 1, `undo: 1 row reassigned`);
assert(r2.applied[0].prevCode === TARGET, `undo: prevCode = ${TARGET} (proves it was applied)`);
const after2 = await readRow(line.id);
assert(after2.project_code === line.project_code, `mirror: project_code restored to ${line.project_code}`);

// 4. restore original source so the row is byte-intact
if (after2.project_code_source !== line.project_code_source) {
  const { error: upErr } = await supabase
    .from('xero_transactions')
    .update({ project_code_source: line.project_code_source })
    .eq('id', line.id);
  if (upErr) { console.error('source restore failed', upErr); process.exit(1); }
}
const final = await readRow(line.id);
assert(final.project_code === line.project_code && final.project_code_source === line.project_code_source,
  `final: row byte-intact (project_code=${final.project_code}, source=${final.project_code_source})`);

console.log('\n✅ Tracer passed — reassign + undo + restore verified end-to-end. Row unchanged.');
