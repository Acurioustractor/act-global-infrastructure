#!/usr/bin/env node
/**
 * Suggest project tags for untagged rows by parsing the Dext OCR line description.
 *
 * Strategy:
 *   1. Dext writes "vendor — category — ACT-CODE" into the line description.
 *   2. When we mass-untag (e.g. the Jan-26 Harvest cutoff), we strip project_code
 *      but the line desc keeps the original code.
 *   3. This script grep-extracts ACT-* codes from line descs of currently untagged
 *      rows and surfaces them as suggestions.
 *
 * READ-ONLY by design. Per the auto-tagger guard rule, never auto-retags rows
 * with project_code_source LIKE 'manual%' — those were deliberately untagged.
 * Output goes to a markdown file for human review on /finance/transactions.
 *
 * Usage:
 *   node scripts/suggest-from-line-desc.mjs
 *   node scripts/suggest-from-line-desc.mjs --format=json   # machine-readable
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday'];
const SINCE = '2025-07-01';

// Load shared rules — same JSON the frontend reads
const RULES = JSON.parse(readFileSync(join(process.cwd(), 'config', 'tag-suggester-rules.json'), 'utf8'));
const HARVEST_CUTOFF = RULES._meta.harvest_cutoff;
const VENDOR_RULES = { ...RULES.vendor_rules, ...RULES.special_vendors };
const WITTA_VENDORS = new Set(RULES.witta_vendors);
const AMBIGUOUS_VENDORS = new Set(RULES.ambiguous_vendors);
const SPECIAL_VENDORS = RULES.special_vendors;

const args = process.argv.slice(2);
const FORMAT = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'md';

function extractCode(text) {
  if (!text) return null;
  const m = text.match(/ACT-[A-Z]{2,4}/);
  return m ? m[0] : null;
}

function firstLineDesc(line_items) {
  if (!Array.isArray(line_items)) return '';
  return line_items
    .map(li => li?.description || li?.Description || li?._ocr?.summary || '')
    .filter(Boolean)
    .join(' | ');
}

async function fetchAll(query) {
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

// Rules now loaded from config/tag-suggester-rules.json — see top-of-file constants.

function suggest(row) {
  const vendor = (row.contact_name || '').trim();
  const desc = firstLineDesc(row.line_items);

  // Tier A — Dext line desc explicit code (highest confidence)
  // BUT: Harvest cutoff policy overrides Dext for pre-2026-01-01 ACT-HV rows.
  // Dext-tagged those at the time but Ben's policy says Harvest only counts from Jan 26.
  const fromDesc = extractCode(desc);
  if (fromDesc) {
    if (fromDesc === 'ACT-HV' && row.date < HARVEST_CUTOFF) {
      return {
        code: 'ACT-FM',
        tier: 'A*',
        confidence: 'medium',
        reason: `Dext said ACT-HV but pre-Jan-26 cutoff → demoted to ACT-FM (farm general). Original: "${desc.slice(0, 70)}"`,
      };
    }
    return { code: fromDesc, tier: 'A', confidence: 'high', reason: `Dext line desc: "${desc.slice(0, 80)}"` };
  }

  // Tier B — vendor whitelist
  if (VENDOR_RULES[vendor]) {
    const r = VENDOR_RULES[vendor];
    return { code: r.code, tier: 'B', confidence: 'high', reason: `vendor whitelist: ${r.note}` };
  }
  if (SPECIAL_VENDORS[vendor]) {
    const r = SPECIAL_VENDORS[vendor];
    return { code: r.code, tier: 'B', confidence: 'medium', reason: `special: ${r.note}` };
  }

  // Tier C — Witta vendor + post-cutoff date = Harvest
  if (WITTA_VENDORS.has(vendor)) {
    if (row.date >= HARVEST_CUTOFF) {
      return { code: 'ACT-HV', tier: 'C', confidence: 'high', reason: `Witta vendor on/after ${HARVEST_CUTOFF}` };
    }
    return { code: 'ACT-FM', tier: 'C', confidence: 'medium', reason: `Witta vendor before Harvest cutoff (${HARVEST_CUTOFF}) — farm general` };
  }

  // Tier D — known-ambiguous: surface as "needs manual" with project distribution hint
  if (AMBIGUOUS_VENDORS.has(vendor)) {
    return { code: 'MANUAL', tier: 'D', confidence: 'manual', reason: `Known-ambiguous vendor (historic split across projects). Open the row, decide by context.` };
  }

  return null; // no suggestion
}

async function main() {
  console.log('Fetching untagged ACT rows since', SINCE);

  const billsQ = supabase
    .from('xero_invoices')
    .select('id, xero_id, date, contact_name, total, status, line_items, project_code, project_code_source')
    .eq('type', 'ACCPAY')
    .in('status', ['AUTHORISED', 'PAID'])
    .gte('date', SINCE)
    .is('project_code', null);
  const spendsQ = supabase
    .from('xero_transactions')
    .select('id, xero_transaction_id, date, contact_name, total, status, type, line_items, project_code, project_code_source, bank_account')
    .in('type', ['SPEND', 'SPEND-OVERPAYMENT'])
    .gte('date', SINCE)
    .is('project_code', null)
    .in('bank_account', ACT_ACCOUNTS);

  const [bills, spends] = await Promise.all([fetchAll(billsQ), fetchAll(spendsQ)]);

  // Dedupe bank payment of bill (same vendor, same amount, ±14 days)
  const paidBills = bills.filter(b => b.status === 'PAID');
  const dupeXids = new Set();
  for (const s of spends) {
    const sd = new Date(s.date).getTime();
    if (paidBills.some(b =>
      (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
      Number(b.total) === Number(s.total) &&
      Math.abs((new Date(b.date).getTime() - sd) / 86400000) <= 14
    )) dupeXids.add(s.xero_transaction_id);
  }

  const rows = [
    ...bills.map(b => ({
      src: 'bill', xid: b.xero_id, date: b.date, contact_name: b.contact_name, total: Number(b.total),
      line_items: b.line_items, project_code_source: b.project_code_source, bank_account: null,
    })),
    ...spends.filter(s => !dupeXids.has(s.xero_transaction_id)).map(s => ({
      src: s.type === 'SPEND' ? 'spend' : 'spend-overpay', xid: s.xero_transaction_id, date: s.date,
      contact_name: s.contact_name, total: Number(s.total),
      line_items: s.line_items, project_code_source: s.project_code_source, bank_account: s.bank_account,
    })),
  ];

  // Score each
  const tagged = [];
  const untagged = [];
  for (const r of rows) {
    const s = suggest(r);
    if (s) tagged.push({ ...r, suggestion: s });
    else untagged.push(r);
  }

  // Group suggestions by code → confidence → reason
  const byCode = new Map();
  for (const t of tagged) {
    const key = t.suggestion.code;
    const arr = byCode.get(key) || [];
    arr.push(t);
    byCode.set(key, arr);
  }
  const codeSummary = [...byCode.entries()]
    .map(([code, items]) => ({
      code,
      rows: items.length,
      total: items.reduce((a, x) => a + x.total, 0),
      byTier: {
        A: items.filter(x => x.suggestion.tier === 'A').length,
        'A*': items.filter(x => x.suggestion.tier === 'A*').length,
        B: items.filter(x => x.suggestion.tier === 'B').length,
        C: items.filter(x => x.suggestion.tier === 'C').length,
        D: items.filter(x => x.suggestion.tier === 'D').length,
      },
    }))
    .sort((a, b) => b.total - a.total);

  console.log(`\nInput: ${rows.length} untagged ACT rows (after dedup)`);
  console.log(`Suggested: ${tagged.length} (${Math.round(tagged.length / rows.length * 100)}%)`);
  console.log(`Still no suggestion: ${untagged.length}\n`);
  console.log('By suggested code:');
  for (const c of codeSummary) {
    console.log(`  ${c.code.padEnd(10)} ${String(c.rows).padStart(3)} rows  $${c.total.toFixed(2).padStart(10)}   tiers A=${c.byTier.A} A*=${c.byTier['A*']} B=${c.byTier.B} C=${c.byTier.C}`);
  }

  if (FORMAT === 'json') {
    const out = { input: rows.length, tagged: tagged.length, untagged: untagged.length, byCode: codeSummary, suggestions: tagged, unsuggested: untagged };
    writeFileSync('thoughts/shared/reports/tag-suggestions-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(out, null, 2));
    console.log('\nWrote JSON report.');
    return;
  }

  // Markdown report
  const today = new Date().toISOString().slice(0, 10);
  const md = [];
  md.push(`# Tagging suggestions from Dext line desc + vendor rules · ${today}`);
  md.push('');
  md.push(`Source: untagged ACT-only rows since ${SINCE} (NAB Visa #8815 + ACT Everyday).`);
  md.push(`Dedup: bank-payment-of-bill collapsed (same vendor/amount/±14d).`);
  md.push('');
  md.push(`- Input: **${rows.length}** untagged rows`);
  md.push(`- Got a suggestion: **${tagged.length}** (${Math.round(tagged.length / rows.length * 100)}%)`);
  md.push(`- No rule fired: **${untagged.length}**`);
  md.push('');
  md.push(`## Tiers`);
  md.push('');
  md.push(`- **A** — Dext line description contains explicit ACT-* code (highest confidence)`);
  md.push(`- **A\\*** — Dext said ACT-HV but pre-2026-01-01 cutoff overrides → ACT-FM`);
  md.push(`- **B** — Vendor whitelist (always one project in FY26 data)`);
  md.push(`- **C** — Date-bounded Witta vendor (post-cutoff = Harvest, pre = farm general)`);
  md.push(`- **D** — Known-ambiguous (Avis/Thrifty) — surfaced as MANUAL with no auto-tag`);
  md.push('');
  md.push(`## Summary by suggested code`);
  md.push('');
  md.push(`| Code | Rows | $ | A | A* | B | C | D |`);
  md.push(`|---|---|---|---|---|---|---|---|`);
  for (const c of codeSummary) {
    md.push(`| ${c.code} | ${c.rows} | $${c.total.toFixed(2)} | ${c.byTier.A} | ${c.byTier['A*']} | ${c.byTier.B} | ${c.byTier.C} | ${c.byTier.D} |`);
  }
  md.push('');

  // Per-code detail
  for (const c of codeSummary) {
    md.push(`### → ${c.code} · ${c.rows} rows · $${c.total.toFixed(2)}`);
    md.push('');
    md.push(`| Date | Vendor | $ | Src | Tier | Reason |`);
    md.push(`|---|---|---|---|---|---|`);
    const items = byCode.get(c.code).sort((a, b) => b.total - a.total);
    for (const r of items) {
      const reason = r.suggestion.reason.replace(/\|/g, '\\|').slice(0, 100);
      md.push(`| ${r.date} | ${r.contact_name} | $${r.total.toFixed(2)} | ${r.src} | ${r.suggestion.tier} | ${reason} |`);
    }
    md.push('');
  }

  // Unsuggested (manual review)
  if (untagged.length > 0) {
    md.push(`## No rule fired — manual review (${untagged.length} rows)`);
    md.push('');
    md.push(`| Date | Vendor | $ | Src | Line desc |`);
    md.push(`|---|---|---|---|---|`);
    for (const r of untagged.sort((a, b) => b.total - a.total)) {
      const desc = firstLineDesc(r.line_items).slice(0, 80).replace(/\|/g, '\\|');
      md.push(`| ${r.date} | ${r.contact_name} | $${r.total.toFixed(2)} | ${r.src} | ${desc} |`);
    }
    md.push('');
  }

  md.push(`## How to apply`);
  md.push('');
  md.push(`This script is **read-only by design** (per the auto-tagger guard).`);
  md.push(`Open <http://localhost:3002/finance/transactions?status=untagged> and bulk-tag using this report as the punch list.`);
  md.push(`For each Tier-A suggestion, the Dext line desc already carries the code — bulk-tagging is just confirming Dext's work.`);
  md.push('');

  const outPath = `thoughts/shared/reports/tag-suggestions-${today}.md`;
  writeFileSync(outPath, md.join('\n'));
  console.log(`\nReport: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
