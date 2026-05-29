#!/usr/bin/env node
/**
 * Generate the "General Expenses (429) recode worklist" for Standard Ledger.
 *
 * READ-ONLY. Writes a CSV + prints a summary. Does NOT touch Xero.
 *
 * Every ACCPAY bill line currently coded to account 429 (General Expenses) in the
 * given period, with a suggested target account (from vendor_project_rules.category
 * + vendor-name heuristics mapped to the live chart), a suggested project, a
 * confidence band, and judgement flags. SL reviews + applies in Xero.
 *
 * Usage: node scripts/generate-ge-recode-worklist.mjs [--from 2025-10-01] [--to 2026-03-31]
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : d; };
const FROM = arg('--from', '2025-10-01');
const TO = arg('--to', '2026-03-31');
const GE_CODE = '429';

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- chart of accounts: code -> name ---
const chart = JSON.parse(readFileSync('config/xero-chart.json', 'utf8'));
const acctArr = chart.accounts || chart.Accounts || [];
const acctName = {};
for (const a of acctArr) acctName[String(a.code || a.Code)] = a.name || a.Name;

// --- vendor_project_rules: vendor -> {category, project, rd} ---
const { data: rules } = await supabase
  .from('vendor_project_rules')
  .select('vendor_name, aliases, category, project_code, rd_eligible, xero_account_code');
const ruleByVendor = {};
for (const r of rules || []) {
  ruleByVendor[(r.vendor_name || '').toLowerCase()] = r;
  for (const al of r.aliases || []) ruleByVendor[(al || '').toLowerCase()] = r;
}

// --- category -> account code (from the live chart) ---
const CATEGORY_TO_ACCT = {
  'materials & supplies': '446', 'materials & equipment': '446', 'materials': '446',
  'accommodation': '493', 'travel': '493', 'subscriptions': '485', 'software': '485',
  'sub-contractors': '486', 'subcontractors': '486', 'bank fees': '407', 'merchant fees': '411',
  'insurance': '433', 'rent': '469', 'utilities': '445', 'rates': '467',
  'repairs & maintenance': '473', 'repairs and maintenance': '473', 'freight': '425',
  'event-ticketing': '415', 'donations': '417', 'office': '453', 'printing': '461',
  'telephone & internet': '489', 'hire': '432', 'consulting & accounting': '412',
};
// vague categories that should NOT auto-map (need review)
const VAGUE = new Set(['operations', 'other', 'general', 'income', '']);

// --- vendor-name heuristics (override / fill when no clear rule category) ---
function vendorHeuristic(name) {
  const n = (name || '').toLowerCase();
  if (/airbnb|hotel|motel|accommodation|home to holiday/.test(n)) return ['493', 'accommodation/travel'];
  if (/qantas|virgin|jetstar|flight|webjet/.test(n)) return ['493', 'flights'];
  if (/kennards/.test(n)) return ['432', 'equipment hire'];
  if (/defy|plasticians|carla|1300 washer|smartwood|rw pacific|container|mounty|izzy mobile/.test(n)) return ['446', 'goods materials'];
  if (/bunnings|maleny hardware|total tools|sand yard|edmonds|landscaping|ar equipment|clearview/.test(n)) return ['446', 'materials/hardware'];
  if (/hatch electrical|hydraulink|allclass/.test(n)) return ['473', 'repairs & maintenance'];
  if (/\bnab\b|paypal|stripe|merchant|bank/.test(n)) return ['407', 'bank/merchant fees'];
  if (/sunshine coast council|council/.test(n)) return ['467', 'rates & water'];
  if (/agl|energy|power|electricity/.test(n)) return ['445', 'light, power, heating'];
  if (/joseph kirmos|sophie|hayden alexander|labour|contractor/.test(n)) return ['486', 'sub-contractor labour'];
  if (/humanitix|woodford|folk festival|rumble room/.test(n)) return ['415', 'events/conferences'];
  if (/insurance/.test(n)) return ['433', 'insurance'];
  return null;
}

// --- pull ACCPAY bills in the period (paginate to be safe) ---
let bills = [];
for (let start = 0; ; start += 1000) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('invoice_number, date, status, total, project_code, has_attachments, contact_name, line_items')
    .eq('type', 'ACCPAY')
    .in('status', ['AUTHORISED', 'PAID'])
    .gte('date', FROM).lte('date', TO)
    .range(start, start + 999);
  if (error) { console.error(error); process.exit(1); }
  bills = bills.concat(data);
  if (data.length < 1000) break;
}

// --- explode to 429 line items + build worklist rows ---
const rows = [];
for (const b of bills) {
  for (const li of b.line_items || []) {
    if (String(li.account_code) !== GE_CODE) continue;
    const amt = Number(li.line_amount || 0);
    const rule = ruleByVendor[(b.contact_name || '').toLowerCase()];
    let suggCode = null, basis = null, conf = null;
    const cat = (rule?.category || '').toLowerCase();
    if (cat && !VAGUE.has(cat) && CATEGORY_TO_ACCT[cat]) { suggCode = CATEGORY_TO_ACCT[cat]; basis = `rule:${rule.category}`; conf = 'High'; }
    const heur = vendorHeuristic(b.contact_name);
    if (!suggCode && heur) { suggCode = heur[0]; basis = `heuristic:${heur[1]}`; conf = 'Medium'; }
    if (!suggCode) { suggCode = '429'; basis = rule ? `vague:${rule.category}` : 'no-rule'; conf = 'REVIEW'; }
    // judgement flags
    const flags = [];
    if (/funding network/i.test(b.contact_name)) flags.push('JUDGEMENT: fundraising platform — income/donation/grant, not general expense?');
    if (cat === 'income') flags.push('JUDGEMENT: rule category is Income on a bill');
    if (amt >= 20000 && conf !== 'High') flags.push('LARGE + uncertain');
    if (!b.has_attachments) flags.push('no receipt');
    rows.push({
      date: b.date, vendor: b.contact_name, inv: b.invoice_number || '', status: b.status,
      amount: amt, cur_project: b.project_code || '(none)',
      sugg_code: suggCode, sugg_name: acctName[suggCode] || suggCode,
      sugg_project: rule?.project_code || b.project_code || '', rd: rule?.rd_eligible ? 'Y' : '',
      confidence: conf, basis, flags: flags.join(' | '),
    });
  }
}
rows.sort((a, b) => b.amount - a.amount);

// --- write CSV ---
mkdirSync('scripts/output', { recursive: true });
const headers = ['date', 'vendor', 'invoice', 'status', 'amount', 'current_project', 'suggested_acct_code', 'suggested_acct_name', 'suggested_project', 'rd_eligible', 'confidence', 'basis', 'flags', 'SL_confirm_acct', 'SL_confirm_project'];
const csv = [headers.join(',')].concat(rows.map(r => [
  r.date, q(r.vendor), q(r.inv), r.status, r.amount.toFixed(2), r.cur_project,
  r.sugg_code, q(r.sugg_name), r.sugg_project, r.rd, r.confidence, q(r.basis), q(r.flags), '', '',
].join(','))).join('\n');
function q(s) { s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
const out = 'scripts/output/ge-recode-worklist.csv';
writeFileSync(out, csv);

// --- summary ---
const sum = (f) => rows.filter(f).reduce((s, r) => s + r.amount, 0);
const tot = sum(() => true);
const band = (c) => ({ n: rows.filter(r => r.confidence === c).length, amt: sum(r => r.confidence === c) });
const byVendor = {};
for (const r of rows) byVendor[r.vendor] = (byVendor[r.vendor] || 0) + r.amount;
const topV = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 12);

console.log(`\n=== General Expenses (429) recode worklist — ${FROM}..${TO} ===`);
console.log(`Lines: ${rows.length}   Total: $${tot.toFixed(2)}`);
console.log(`Bills scanned: ${bills.length}`);
console.log(`\nConfidence bands:`);
for (const c of ['High', 'Medium', 'REVIEW']) { const b = band(c); console.log(`  ${c.padEnd(7)} ${String(b.n).padStart(3)} lines  $${b.amt.toFixed(2)}`); }
console.log(`\nJudgement-flagged $: $${sum(r => r.flags.includes('JUDGEMENT')).toFixed(2)}`);
console.log(`No-receipt $:        $${sum(r => r.flags.includes('no receipt')).toFixed(2)}`);
console.log(`\nTop 12 vendors in General Expenses:`);
for (const [v, a] of topV) console.log(`  $${a.toFixed(2).padStart(11)}  ${v}`);
console.log(`\nCSV: ${out}`);
