#!/usr/bin/env node
/**
 * build-foundation-act-signals.mjs — derive ACT's OWN relationship signals into
 * foundation_relationship_signals (which otherwise holds only scraped funder→grantee
 * evidence, 8 rows since 2026-04-10, no writer in the repo until this script).
 *
 * Three derived signal types, all from data ACT already generates:
 *   act_funded         — foundations that have actually paid ACT (PAID ACCREC invoices)
 *   act_pipeline       — foundations with a live grant opportunity carrying a ghl_opportunity_id
 *   act_email_contact  — foundations whose web domain appears in the Gmail comms spine
 *
 * Also fixes the Layer-3↔2 join: grant_opportunities.foundation_id is NULL even where
 * the foundation exists (e.g. all 4 QBE rows) — backfilled here by the same name match.
 *
 *   node scripts/build-foundation-act-signals.mjs            # dry-run (default): print proposed
 *   node scripts/build-foundation-act-signals.mjs --apply    # rebuild derived signals + backfill links
 *
 * Idempotent: --apply deletes ONLY rows with source_url LIKE 'act://%' (confidence='derived')
 * and re-inserts; scraped rows are never touched. Name matching is bidirectional containment
 * on normalised names (the Snow trap: invoice says "Snow Foundation", landscape says
 * "The Snow Foundation" — one-direction ILIKE misses it). Foundations <9 chars are skipped
 * (containment false-positive risk). All reads paginate past the 1000-row PostgREST cap.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const APPLY = process.argv.includes('--apply');
const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const sql = async (query) => {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw new Error(error.message);
  return data || [];
};
const log = (m) => console.log(m);

// paginate a supabase-js select past the 1000-row cap
async function pageAll(table, cols, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(sb.from(table).select(cols)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const norm = (s) => (s || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// bidirectional containment on normalised names; both sides must be substantial
const namesMatch = (a, b) => {
  const x = norm(a), y = norm(b);
  if (x.length < 9 || y.length < 9) return false;
  return x.includes(y) || y.includes(x);
};
const host = (url) => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return null; } };

// ── load the foundation landscape (11k rows, paginated) ─────────────────────
const foundations = await pageAll('foundations', 'id,name,website');
const substantial = foundations.filter((f) => norm(f.name).length >= 9);
log(`foundations: ${foundations.length} (${substantial.length} with substantial names)`);

const signals = [];   // rows to insert
const linkFixes = []; // { oppId, foundationId, oppName, fName }

// ── A. act_funded — PAID ACCREC invoices grouped by contact ─────────────────
const paid = await sql(`SELECT contact_name, count(*) n, round(sum(total)::numeric,2) paid,
  max(fully_paid_date)::date last_paid FROM xero_invoices
  WHERE type='ACCREC' AND status='PAID' AND contact_name IS NOT NULL
  GROUP BY 1 ORDER BY 3 DESC`);
for (const p of paid) {
  const f = substantial.find((x) => namesMatch(x.name, p.contact_name));
  if (!f) continue;
  signals.push({
    foundation_id: f.id, foundation_name: f.name, signal_type: 'act_funded',
    related_name: 'A Curious Tractor', source_url: 'act://xero/invoices',
    evidence_text: `Funded ACT: ${p.n} paid invoice(s) totalling $${Number(p.paid).toLocaleString('en-AU')} (last paid ${p.last_paid}) under Xero contact "${p.contact_name}"`,
    // strength is numeric(6,2) — a score, not dollars (dollars live in metadata.total_paid)
    strength: 100, confidence: 'derived',
    metadata: { invoices: p.n, total_paid: Number(p.paid), last_paid: p.last_paid, xero_contact: p.contact_name },
  });
}
log(`A. act_funded: ${signals.length} foundations matched from ${paid.length} paid contacts`);

// ── B. act_pipeline — grant_opportunities carrying a ghl_opportunity_id ─────
const opps = await pageAll('grant_opportunities', 'id,name,pipeline_stage,status,ghl_opportunity_id,foundation_id',
  (q) => q.not('ghl_opportunity_id', 'is', null));
let bCount = 0;
for (const o of opps) {
  const f = substantial.find((x) => namesMatch(x.name, o.name) || norm(o.name).includes(norm(x.name)));
  if (!f) continue;
  bCount++;
  signals.push({
    foundation_id: f.id, foundation_name: f.name, signal_type: 'act_pipeline',
    related_name: 'A Curious Tractor', source_url: `act://ghl/opportunity/${o.ghl_opportunity_id}`,
    evidence_text: `In ACT's grant pipeline: "${o.name}" (stage: ${o.pipeline_stage || 'unknown'})`,
    strength: 10, confidence: 'derived',
    metadata: { grant_opportunity_id: o.id, ghl_opportunity_id: o.ghl_opportunity_id, pipeline_stage: o.pipeline_stage },
  });
  if (!o.foundation_id) linkFixes.push({ oppId: o.id, foundationId: f.id, oppName: o.name, fName: f.name });
}
log(`B. act_pipeline: ${bCount} matched from ${opps.length} GHL-linked opportunities · ${linkFixes.length} foundation_id backfills`);

// ── C. act_email_contact — comms-spine domains vs foundation websites ───────
const domains = await sql(`SELECT lower(split_part(contact_email,'@',2)) dom, count(*) n,
  max(occurred_at)::date last_touch FROM communications_history
  WHERE contact_email IS NOT NULL AND contact_email LIKE '%@%' GROUP BY 1`);
const byHost = new Map();
for (const f of foundations) { const h = f.website && host(f.website); if (h) byHost.set(h, f); }
let cCount = 0;
for (const d of domains) {
  const f = byHost.get(d.dom);
  if (!f) continue;
  cCount++;
  signals.push({
    foundation_id: f.id, foundation_name: f.name, signal_type: 'act_email_contact',
    related_name: 'A Curious Tractor', source_url: `act://gmail-spine/${d.dom}`,
    evidence_text: `Email relationship: ${d.n} message(s) in the act.place comms spine with @${d.dom} (last touch ${d.last_touch})`,
    strength: Math.min(Number(d.n), 100), confidence: 'derived',
    metadata: { domain: d.dom, messages: Number(d.n), last_touch: d.last_touch },
  });
}
log(`C. act_email_contact: ${cCount} matched from ${domains.length} spine domains`);

// ── report / apply ───────────────────────────────────────────────────────────
log(`\nproposed: ${signals.length} derived signals · ${linkFixes.length} foundation_id backfills`);
for (const s of signals.slice(0, 20)) log(`  [${s.signal_type}] ${s.foundation_name} — ${s.evidence_text.slice(0, 100)}`);
if (signals.length > 20) log(`  … +${signals.length - 20} more`);
for (const l of linkFixes.slice(0, 8)) log(`  [link] "${l.oppName.slice(0, 60)}" → ${l.fName}`);

if (!APPLY) { log('\nDRY RUN — nothing written. Re-run with --apply.'); process.exit(0); }

// idempotent rebuild of the derived layer only
const { error: delErr } = await sb.from('foundation_relationship_signals')
  .delete().eq('confidence', 'derived').like('source_url', 'act://%');
if (delErr) throw new Error(`delete: ${delErr.message}`);
const { error: insErr, count } = await sb.from('foundation_relationship_signals')
  .insert(signals, { count: 'exact' });
if (insErr) throw new Error(`insert: ${insErr.message}`);
if ((count ?? signals.length) !== signals.length)
  log(`⚠ attempted ${signals.length} inserts, actual ${count} — INVESTIGATE`);
else log(`✓ inserted ${signals.length} derived signals (attempted = actual)`);

let fixed = 0;
for (const l of linkFixes) {
  const { error } = await sb.from('grant_opportunities').update({ foundation_id: l.foundationId }).eq('id', l.oppId).is('foundation_id', null);
  if (error) { log(`⚠ link ${l.oppId}: ${error.message}`); continue; }
  fixed++;
}
log(`✓ backfilled foundation_id on ${fixed}/${linkFixes.length} opportunities`);
