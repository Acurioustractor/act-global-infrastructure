#!/usr/bin/env node
/**
 * tagging-sweep.mjs — READ-ONLY cross-area project_code consistency sweep.
 *
 * Answers "what's actually not tagged right, across all areas" and "what could the shared resolver
 * fill vs what needs review". Writes NOTHING to any external system — emits a worklist only.
 *
 *   node scripts/tagging-sweep.mjs            # print report + write worklist
 *
 * Sections:
 *   1. Coverage by area (Xero txns/invoices, GHL opps, subscriptions)
 *   2. Cross-area conflicts via HARD links (GHL opp ↔ its linked Xero invoice) — proposed resolution
 *      = the invoice's code (Xero Project Tracking is the money SoR).
 *   3. Fill preview — run the resolver over UNTAGGED GHL opps + subs; bucket auto-fillable / review / none.
 *
 * Output: thoughts/shared/financials/tagging-sweep-<date>.{md,json}
 * Spec: thoughts/shared/plans/2026-06-03-unified-tagging-engine.md
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildResolverIndex, resolveProjectCode, normalizeCode, AUTO_APPLY_THRESHOLD } from './lib/project-resolver.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const today = new Date().toISOString().slice(0, 10);
const fmt$ = (n) => `$${Math.round(Number(n || 0)).toLocaleString('en-AU')}`;
const log = (m) => console.log(m);

async function sql(label, query) {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function main() {
  log(`\n🏷️  Tagging sweep — ${today} (read-only)\n`);

  // Registry → resolver index + vendor rules.
  const projects = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'project-codes.json'), 'utf-8')).projects;
  const index = buildResolverIndex(projects);
  const { data: vr } = await sb.from('vendor_project_rules').select('vendor_name, project_code');
  const vendorRules = new Map((vr || []).filter((r) => r.project_code).map((r) => [String(r.vendor_name).toLowerCase().trim(), r.project_code]));
  log(`Registry: ${index.validCodes.size} codes · vendor rules: ${vendorRules.size}\n`);

  // ── 1. Coverage by area ──────────────────────────────────────────────────
  const coverage = await sql('coverage', `
    SELECT 'xero_txns FY26' AS area, count(*) n, count(project_code) tagged FROM xero_transactions
      WHERE date >= '2025-07-01' AND (status IS NULL OR status<>'DELETED')
    UNION ALL SELECT 'xero_txns all', count(*), count(project_code) FROM xero_transactions WHERE (status IS NULL OR status<>'DELETED')
    UNION ALL SELECT 'xero_invoices', count(*), count(project_code) FROM xero_invoices
    UNION ALL SELECT 'ghl_opportunities', count(*), count(project_code) FROM ghl_opportunities
    UNION ALL SELECT 'subscriptions', count(*), count(*) FILTER (WHERE array_length(project_codes,1) > 0) FROM subscriptions`);
  log('1. COVERAGE BY AREA');
  for (const r of coverage) {
    const pct = Number(r.n) > 0 ? Math.round((Number(r.tagged) / Number(r.n)) * 100) : 0;
    log(`   ${String(r.area).padEnd(20)} ${String(r.tagged).padStart(5)}/${String(r.n).padEnd(5)} ${pct}%`);
  }

  // ── 2. Cross-area conflicts (GHL opp ↔ linked Xero invoice) ──────────────
  // Build invoice code lookup by every key the opp link might use.
  const invCodeByKey = new Map();
  let from = 0;
  for (;;) {
    const { data } = await sb.from('xero_invoices').select('id, xero_id, invoice_number, project_code').range(from, from + 999);
    for (const i of data || []) {
      if (!i.project_code) continue;
      for (const k of [i.id, i.xero_id, i.invoice_number]) if (k) invCodeByKey.set(String(k), i.project_code);
    }
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  const { data: linkedOpps } = await sb
    .from('ghl_opportunities')
    .select('id, name, project_code, xero_invoice_id')
    .not('xero_invoice_id', 'is', null);
  const conflicts = [];
  for (const o of linkedOpps || []) {
    const invCode = invCodeByKey.get(String(o.xero_invoice_id));
    if (!invCode || !o.project_code) continue;
    if (normalizeCode(o.project_code) !== normalizeCode(invCode)) {
      conflicts.push({ id: o.id, name: o.name, oppCode: normalizeCode(o.project_code), invoiceCode: normalizeCode(invCode), proposed: normalizeCode(invCode), reason: 'Xero invoice is the money SoR' });
    }
  }
  log(`\n2. CROSS-AREA CONFLICTS (opp ↔ linked invoice): ${conflicts.length}`);
  for (const c of conflicts.slice(0, 10)) log(`   opp ${c.oppCode} vs invoice ${c.invoiceCode} → ${c.proposed}  · ${(c.name || '').slice(0, 44)}`);

  // ── 3. Fill preview — resolver over UNTAGGED GHL opps + subs ──────────────
  const bucket = () => ({ auto: [], review: [], none: [] });
  const place = (arr, item) => (item.confidence >= AUTO_APPLY_THRESHOLD ? arr.auto : item.confidence > 0 ? arr.review : arr.none).push(item);

  const { data: untaggedOpps } = await sb.from('ghl_opportunities').select('id, name, pipeline_name, xero_invoice_id').is('project_code', null);
  const oppFill = bucket();
  for (const o of untaggedOpps || []) {
    const linkedCode = o.xero_invoice_id ? invCodeByKey.get(String(o.xero_invoice_id)) : null;
    const r = resolveProjectCode({ linkedCode, pipelineName: o.pipeline_name, text: o.name }, index, { vendorRules });
    place(oppFill, { id: o.id, name: o.name, pipeline: o.pipeline_name || null, ...r });
  }

  const { data: untaggedSubs } = await sb.from('subscriptions').select('id, vendor_name, purpose, category').or('project_codes.is.null,project_codes.eq.{}');
  const subFill = bucket();
  for (const s of untaggedSubs || []) {
    const r = resolveProjectCode({ vendorName: s.vendor_name, text: `${s.vendor_name} ${s.purpose || ''} ${s.category || ''}` }, index, { vendorRules });
    place(subFill, { id: s.id, name: s.vendor_name, category: s.category || s.purpose || null, ...r });
  }
  log(`\n3. FILL PREVIEW (untagged → resolver)`);
  log(`   GHL opps  (${(untaggedOpps || []).length} untagged): ${oppFill.auto.length} auto-fillable · ${oppFill.review.length} review · ${oppFill.none.length} no-match`);
  log(`   Subs      (${(untaggedSubs || []).length} untagged): ${subFill.auto.length} auto-fillable · ${subFill.review.length} review · ${subFill.none.length} no-match`);

  // ── Worklist out ──────────────────────────────────────────────────────────
  const coverageClean = coverage.map((r) => ({
    area: r.area, n: Number(r.n), tagged: Number(r.tagged),
    pct: Number(r.n) > 0 ? Math.round((Number(r.tagged) / Number(r.n)) * 100) : 0,
  }));
  const summary = {
    conflicts: conflicts.length,
    opps: { untagged: (untaggedOpps || []).length, auto: oppFill.auto.length, review: oppFill.review.length, none: oppFill.none.length },
    subs: { untagged: (untaggedSubs || []).length, auto: subFill.auto.length, review: subFill.review.length, none: subFill.none.length },
  };

  // Persist the run so the command-center can render it in prod (read-only view) — keeps the .mjs
  // resolver as the single engine (no TS fork). Non-fatal: the files are still written on failure.
  try {
    const { error } = await sb.from('tagging_sweep_runs').insert({ summary, coverage: coverageClean, conflicts, fill: { opps: oppFill, subs: subFill } });
    if (error) log(`   (warn) could not persist run: ${error.message}`);
    else log('   persisted run → tagging_sweep_runs');
  } catch (e) {
    log(`   (warn) could not persist run: ${e.message}`);
  }

  const worklist = { generatedAt: new Date().toISOString(), coverage: coverageClean, conflicts, fill: { opps: oppFill, subs: subFill } };
  const base = join(__dirname, '..', 'thoughts', 'shared', 'financials', `tagging-sweep-${today}`);
  writeFileSync(`${base}.json`, JSON.stringify(worklist, null, 2));
  const md = [
    `# Tagging sweep — ${today}`, '', '_Read-only. Worklist for the gated writers (Phase 3). No external writes performed._', '',
    '## Coverage', '', '| Area | Tagged | Total | % |', '|---|--:|--:|--:|',
    ...coverage.map((r) => `| ${r.area} | ${r.tagged} | ${r.n} | ${Number(r.n) > 0 ? Math.round((Number(r.tagged) / Number(r.n)) * 100) : 0}% |`),
    '', `## Cross-area conflicts (opp ↔ linked invoice): ${conflicts.length}`, '',
    ...(conflicts.length ? ['| Opp code | Invoice code | Proposed | Opportunity |', '|---|---|---|---|', ...conflicts.map((c) => `| ${c.oppCode} | ${c.invoiceCode} | **${c.proposed}** | ${(c.name || '').slice(0, 50)} |`)] : ['_None._']),
    '', '## Fill preview (untagged → what the resolver would assign)', '',
    `- **GHL opps** (${(untaggedOpps || []).length} untagged): ${oppFill.auto.length} auto-fillable · ${oppFill.review.length} review · ${oppFill.none.length} no-match`,
    `- **Subscriptions** (${(untaggedSubs || []).length} untagged): ${subFill.auto.length} auto-fillable · ${subFill.review.length} review · ${subFill.none.length} no-match`,
  ].join('\n');
  writeFileSync(`${base}.md`, md + '\n');
  log(`\n📄 Worklist → thoughts/shared/financials/tagging-sweep-${today}.{md,json}\n`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
