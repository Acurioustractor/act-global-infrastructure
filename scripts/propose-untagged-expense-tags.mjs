// Propose project_code tags for the FY26 untagged expenses (ACCPAY bills + SPEND txns).
// READ-ONLY: writes a review artifact + a JSON apply-list. No DB writes.
// Confidence: vendor-rule match = HIGH; description/contact keyword = MED; neither = REVIEW.
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FY = '2025-07-01';
const PROJECTS = (await loadProjectsConfig()).projects || {};

// Vendor rules (same source the auto-tagger uses)
const { data: vrules } = await sb.from('vendor_project_rules').select('vendor_name, aliases, project_code');
const vendorMap = (vrules || []).map(r => ({
  code: r.project_code,
  aliases: [r.vendor_name, ...(r.aliases || [])].filter(Boolean).map(a => a.toLowerCase()),
}));

// Description/contact keyword map from project names + xero_tracking aliases
const kw = [];
for (const [code, p] of Object.entries(PROJECTS)) {
  const terms = new Set();
  if (p.name) terms.add(p.name.toLowerCase());
  if (p.xero_tracking) terms.add(String(p.xero_tracking).toLowerCase());
  for (const a of p.xero_tracking_aliases || []) terms.add(String(a).toLowerCase());
  for (const t of p.ghl_tags || []) terms.add(String(t).toLowerCase());
  kw.push({ code, terms: [...terms].filter(t => t.length >= 4) });
}

function matchVendor(name) {
  const n = (name || '').toLowerCase();
  if (!n) return null;
  for (const v of vendorMap) for (const a of v.aliases) if (a.length >= 3 && n.includes(a)) return v.code;
  return null;
}
function matchKeyword(text) {
  const t = (text || '').toLowerCase();
  if (!t) return null;
  for (const k of kw) for (const term of k.terms) if (t.includes(term)) return k.code;
  return null;
}

async function pullUntagged() {
  const out = [];
  const { data: bills } = await sb.from('xero_invoices')
    .select('id, invoice_number, contact_name, total, date, line_items')
    .eq('type', 'ACCPAY').is('project_code', null)
    .not('status', 'in', '(VOIDED,DELETED)').gte('date', FY);
  for (const b of bills || []) out.push({
    kind: 'bill', table: 'xero_invoices', id: b.id, ref: b.invoice_number,
    contact: b.contact_name, amount: Math.abs(+b.total || 0), date: b.date,
    desc: b.line_items?.[0]?.description || '',
  });
  let from = 0;
  for (;;) {
    const { data } = await sb.from('xero_transactions')
      .select('id, contact_name, total, date, line_items')
      .in('type', ['SPEND', 'SPEND-OVERPAYMENT']).is('project_code', null)
      .gte('date', FY).range(from, from + 999);
    for (const s of data || []) out.push({
      kind: 'spend', table: 'xero_transactions', id: s.id, ref: s.contact_name,
      contact: s.contact_name, amount: Math.abs(+s.total || 0), date: s.date,
      desc: s.line_items?.[0]?.description || '',
    });
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

const items = await pullUntagged();
for (const it of items) {
  const v = matchVendor(it.contact);
  if (v) { it.suggest = v; it.conf = 'HIGH'; it.via = 'vendor-rule'; continue; }
  const k = matchKeyword(`${it.contact} ${it.desc}`);
  if (k) { it.suggest = k; it.conf = 'MED'; it.via = 'keyword'; continue; }
  it.suggest = ''; it.conf = 'REVIEW'; it.via = '';
}

items.sort((a, b) => (a.conf > b.conf ? 1 : a.conf < b.conf ? -1 : b.amount - a.amount));
const byConf = c => items.filter(i => i.conf === c);
const sum = arr => arr.reduce((s, i) => s + i.amount, 0);

// Markdown artifact
const codeName = c => (PROJECTS[c]?.name ? `${c} — ${PROJECTS[c].name}` : c);
let md = `# Untagged expense tag proposal — ${items.length} items ($${Math.round(sum(items)).toLocaleString()})\n\n`;
md += `_FY26 (from ${FY}), excl. voided. Apply target: Supabase mirror, source \`manual-bulk-2026-05-30\` (manual-guard protected)._\n\n`;
md += `| Confidence | Items | $ |\n|---|---|---|\n`;
for (const c of ['HIGH', 'MED', 'REVIEW']) md += `| ${c} | ${byConf(c).length} | $${Math.round(sum(byConf(c))).toLocaleString()} |\n`;
md += `\n`;
for (const c of ['HIGH', 'MED', 'REVIEW']) {
  const rows = byConf(c);
  if (!rows.length) continue;
  md += `## ${c} (${rows.length})${c === 'HIGH' ? ' — vendor-rule matches' : c === 'MED' ? ' — keyword matches' : ' — no signal, need your call'}\n\n`;
  md += `| # | kind | date | contact | desc | $ | → suggest | via |\n|---|---|---|---|---|---|---|---|\n`;
  rows.forEach((it, i) => {
    const idx = items.indexOf(it);
    md += `| ${idx} | ${it.kind} | ${it.date} | ${(it.contact || '').slice(0, 28)} | ${(it.desc || '').slice(0, 32).replace(/\|/g, '/')} | $${Math.round(it.amount).toLocaleString()} | ${it.suggest ? codeName(it.suggest) : '—'} | ${it.via} |\n`;
  });
  md += `\n`;
}

const artifact = 'thoughts/shared/financials/2026-05-30-untagged-expense-tag-proposal.md';
writeFileSync(artifact, md);
writeFileSync('scripts/output/untagged-expense-proposal.json', JSON.stringify(items, null, 2));
console.log(`${items.length} items: HIGH ${byConf('HIGH').length} · MED ${byConf('MED').length} · REVIEW ${byConf('REVIEW').length}`);
console.log(`$ total $${Math.round(sum(items)).toLocaleString()}  (HIGH $${Math.round(sum(byConf('HIGH'))).toLocaleString()})`);
console.log(`Artifact: ${artifact}`);
console.log(`Apply-list: scripts/output/untagged-expense-proposal.json`);
