#!/usr/bin/env node
/**
 * Apply the General-Expenses (account 429) recode to Xero — ACCPAY bills.
 *
 * SAFE BY DESIGN:
 *  - DRY RUN by default. Pass --apply to write.
 *  - Only ever changes AccountCode on lines currently coded 429. Preserves
 *    LineItemID, TaxType, Tracking, Quantity, UnitAmount, Description, totals.
 *  - High-confidence band only by default (explicit vendor rules). --band high+medium to include heuristics.
 *  - Hard-excludes every judgement item (TFN, MOL Nyrt, A Curious Tractor self-bill, Telford, founder).
 *  - GETs each bill fresh from Xero (full LineItems incl IDs) before modifying — never drops a line.
 *  - Logs before-state to scripts/output/ge-recode-revert-<ts>.json for reversibility.
 *
 * Usage:
 *   node scripts/apply-ge-recode-to-xero.mjs                       # dry run, high band
 *   node scripts/apply-ge-recode-to-xero.mjs --band high+medium    # dry run incl heuristics
 *   node scripts/apply-ge-recode-to-xero.mjs --one <invoiceID> --apply   # write a single bill (proof)
 *   node scripts/apply-ge-recode-to-xero.mjs --apply --limit 20     # write a capped batch
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : d; };
const APPLY = has('--apply');
const BAND = val('--band', 'high');            // 'high' | 'high+medium'
const LIMIT = parseInt(val('--limit', '9999'), 10);
const ONE = val('--one', null);
const GE = '429';
const FROM = '2025-10-01', TO = '2026-03-31';

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

// ---- chart code -> name ----
const chart = JSON.parse(readFileSync('config/xero-chart.json', 'utf8'));
const acctName = {};
for (const a of (chart.accounts || chart.Accounts || [])) acctName[String(a.code || a.Code)] = a.name || a.Name;

// ---- mapping (identical to generate-ge-recode-worklist.mjs) ----
const CATEGORY_TO_ACCT = {
  'materials & supplies': '446', 'materials & equipment': '446', 'materials': '446',
  'accommodation': '493', 'travel': '493', 'subscriptions': '485', 'software': '485',
  'sub-contractors': '486', 'subcontractors': '486', 'bank fees': '407', 'merchant fees': '411',
  'insurance': '433', 'rent': '469', 'utilities': '445', 'rates': '467',
  'repairs & maintenance': '473', 'repairs and maintenance': '473', 'freight': '425',
  'event-ticketing': '415', 'donations': '417', 'office': '453', 'printing': '461',
  'telephone & internet': '489', 'hire': '432', 'consulting & accounting': '412',
};
const VAGUE = new Set(['operations', 'other', 'general', 'income', '']);
function vendorHeuristic(name) {
  const n = (name || '').toLowerCase();
  if (/airbnb|hotel|motel|accommodation|home to holiday/.test(n)) return '493';
  if (/qantas|virgin|jetstar|flight|webjet/.test(n)) return '493';
  if (/kennards/.test(n)) return '432';
  if (/defy|plasticians|carla|1300 washer|smartwood|rw pacific|container|mounty|izzy mobile/.test(n)) return '446';
  if (/bunnings|maleny hardware|total tools|sand yard|edmonds|landscaping|ar equipment|clearview/.test(n)) return '446';
  if (/hatch electrical|hydraulink|allclass/.test(n)) return '473';
  if (/\bnab\b|paypal|stripe|merchant|bank/.test(n)) return '407';
  if (/sunshine coast council|council/.test(n)) return '467';
  if (/agl|energy|power|electricity/.test(n)) return '445';
  if (/joseph kirmos|sophie|hayden alexander|labour|contractor/.test(n)) return '486';
  if (/humanitix|woodford|folk festival|rumble room/.test(n)) return '415';
  if (/insurance/.test(n)) return '433';
  return null;
}
// Judgement items — NEVER auto-recode (need SL / a decision)
const EXCLUDE = /funding network|mol nyrt|a curious tractor|telford|^nicholas$|nicholas marchesi|the matnic/i;

function suggest(vendor, rule) {
  const cat = (rule?.category || '').toLowerCase();
  if (cat && !VAGUE.has(cat) && CATEGORY_TO_ACCT[cat]) return { code: CATEGORY_TO_ACCT[cat], conf: 'high', basis: `rule:${rule.category}` };
  const h = vendorHeuristic(vendor);
  if (h) return { code: h, conf: 'medium', basis: 'heuristic' };
  return { code: null, conf: 'review', basis: rule ? `vague:${rule.category}` : 'no-rule' };
}

// ---- Xero token (refresh + save rotation, identical logic to refresh-xero-token.mjs) ----
async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  if (!row?.refresh_token) throw new Error('No refresh token; run node scripts/xero-auth.mjs');
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}: ${await r.text()}`);
  const t = await r.json();
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000);
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'apply-ge-recode' }, { onConflict: 'id' });
  if (existsSync('.env.local')) {
    let body = readFileSync('.env.local', 'utf8');
    body = /^XERO_REFRESH_TOKEN=/m.test(body) ? body.replace(/^XERO_REFRESH_TOKEN=.*/m, `XERO_REFRESH_TOKEN=${t.refresh_token}`) : `${body.trimEnd()}\nXERO_REFRESH_TOKEN=${t.refresh_token}\n`;
    writeFileSync('.env.local', body);
  }
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function main() {
  console.log(`\n=== Apply GE (429) recode to Xero ${APPLY ? '*** APPLY ***' : '(DRY RUN)'} | band=${BAND} | limit=${LIMIT}${ONE ? ` | one=${ONE}` : ''} ===\n`);
  const token = await getAccessToken();
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');

  // candidate bills from Supabase (have a 429 line)
  let bills = [];
  for (let s = 0; ; s += 1000) {
    const { data, error } = await supabase.from('xero_invoices')
      .select('xero_id, invoice_number, contact_name, status, total, line_items')
      .eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID'])
      .gte('date', FROM).lte('date', TO).range(s, s + 999);
    if (error) throw error;
    bills = bills.concat(data); if (data.length < 1000) break;
  }
  const rulesRes = await supabase.from('vendor_project_rules').select('vendor_name, aliases, category');
  const ruleBy = {};
  for (const r of rulesRes.data || []) { ruleBy[(r.vendor_name || '').toLowerCase()] = r; for (const a of r.aliases || []) ruleBy[(a || '').toLowerCase()] = r; }

  // build candidate set
  let candidates = bills.filter(b => (b.line_items || []).some(li => String(li.account_code) === GE));
  if (ONE) candidates = candidates.filter(b => b.xero_id === ONE);
  const allowMedium = BAND === 'high+medium';

  const revert = []; let planned = 0, skipped = 0, applied = 0, failed = 0;
  for (const b of candidates) {
    if (planned >= LIMIT) break;
    if (EXCLUDE.test(b.contact_name || '')) { skipped++; continue; }
    const s = suggest(b.contact_name, ruleBy[(b.contact_name || '').toLowerCase()]);
    if (!s.code || s.conf === 'review') { skipped++; continue; }
    if (s.conf === 'medium' && !allowMedium) { skipped++; continue; }
    if (s.code === GE) { skipped++; continue; }

    // GET fresh from Xero (throttle to stay under Xero's 60 calls/min limit)
    await new Promise(r => setTimeout(r, 2500));
    const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${b.xero_id}`, { headers: xh(token) });
    if (!gr.ok) { console.log(`  ✗ GET ${b.contact_name} ${gr.status}`); failed++; continue; }
    const inv = (await gr.json()).Invoices?.[0];
    if (!inv?.LineItems?.length) { skipped++; continue; }
    const geLines = inv.LineItems.filter(li => String(li.AccountCode) === GE);
    if (!geLines.length) { skipped++; continue; }

    const updatedLines = inv.LineItems.map(li => {
      const base = { LineItemID: li.LineItemID, Description: li.Description, Quantity: li.Quantity, UnitAmount: li.UnitAmount, TaxType: li.TaxType, AccountCode: li.AccountCode, Tracking: li.Tracking || [] };
      if (String(li.AccountCode) === GE) base.AccountCode = s.code;   // ONLY change
      return base;
    });
    const geAmt = geLines.reduce((a, li) => a + Number(li.LineAmount || 0), 0);
    planned++;
    console.log(`  ${b.status.padEnd(10)} ${(b.contact_name || '').slice(0, 28).padEnd(28)} ${('$' + geAmt.toFixed(2)).padStart(11)}  429 → ${s.code} ${acctName[s.code] || ''} [${s.conf}/${s.basis}]`);

    if (APPLY) {
      revert.push({ invoiceID: b.xero_id, contact: b.contact_name, before: inv.LineItems.map(li => ({ LineItemID: li.LineItemID, AccountCode: li.AccountCode })) });
      const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${b.xero_id}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: b.xero_id, LineItems: updatedLines }] }) });
      if (pr.ok) { applied++; }
      else { failed++; console.log(`     ✗ POST ${pr.status}: ${(await pr.text()).slice(0, 200)}`); }
    }
  }

  console.log(`\n  planned=${planned} skipped=${skipped} ${APPLY ? `applied=${applied} failed=${failed}` : '(dry run — nothing written)'}`);
  if (APPLY && revert.length) {
    mkdirSync('scripts/output', { recursive: true });
    const f = `scripts/output/ge-recode-revert-${Date.now()}.json`;
    writeFileSync(f, JSON.stringify(revert, null, 2));
    console.log(`  revert log: ${f}`);
  }
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
