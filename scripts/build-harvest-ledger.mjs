#!/usr/bin/env node
/**
 * Builds the consolidated ACT-HV (Harvest) cost ledger:
 *   - All ACCPAY bills (excl VOIDED)
 *   - All SPEND/SPEND-OVERPAYMENT bank txns
 *   - Detects payment-against-bill overlap (vendor+amount+date±14d) so cost
 *     is counted once
 *   - Annotates with audit notes from the 2026-05-17 review
 *   - Outputs Markdown to thoughts/shared/handoffs/act-hv-final-ledger-2026-05-17.md
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function firstDescr(lineItems) {
  if (!Array.isArray(lineItems) || !lineItems.length) return '';
  // prefer OCR summary if mirrored
  for (const li of lineItems) {
    if (li && li._ocr && li._ocr.summary) return li._ocr.summary;
  }
  return lineItems.map(li => (li?.description || li?.Description || '')).filter(Boolean).join(' | ');
}

function audit(row) {
  const id = row.xero_id;
  const name = (row.contact_name || '').toLowerCase();
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE — to void (Kennedy\'s 10t decking, charged twice)';
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return 'St Mary\'s Cathedral decking 10t @ $700 + delivery (real paid incl. CC surcharge)';
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return 'St Mary\'s Cathedral decking 2.5t + recycled pine + Karri T&G';
  if (row.contact_name === 'Flight Bar Witta') return '⚠ MISCODED — NT/SA/Melb/HK travel, should be ACT-OO or other';
  if (row.contact_name === 'Claire Marchesi' && Number(row.total) === 8888) return '? purpose unconfirmed';
  if (name.includes('longara')) return 'Milk crates (2nd hand assorted)';
  if (id === 'eb06f68e-d3f5-4075-b2d6-bda9a912196f') return '? Maleny Hotel meal — review tag';
  if (name.includes('maleny landscaping')) return 'Landscape (mulch/soil), not timber';
  if (name.includes('savage landscape')) return 'Landscape: soil/compost';
  if (name.includes('kennards hire')) return 'Equipment hire';
  if (name.includes('liberty') || name === '7-eleven') return 'Fuel';
  if (name.includes('nest in witta') || name.startsWith('cj') || name.includes('frank food') || name.includes('mapleton')) return 'Local cafe/meal';
  if (name.includes('rnm carpentry')) return 'Carpentry labour';
  if (name.includes('kennedy')) return 'Recycled/heritage timber';
  if (name.includes('smartwood')) return 'Timber';
  if (name.includes('carbatec') || name.includes('total tools') || name.includes('bolt king') || name.includes('hydraulink')) return 'Tools/hardware';
  if (name.includes('thais pupio')) return 'Design';
  if (name.includes('sophie deirdre hickey') || name.includes('tnt plastering')) return 'Trade/contractor';
  if (name.includes('chris witta')) return 'Local site work (Chris @ Witta)';
  if (name.includes('bunnings') || name.includes('maleny hardware')) return 'Hardware/materials';
  if (name.includes('iga') || name.includes('woolworths') || name.includes('fisher')) return '? Groceries / catering — review tag';
  return '';
}

async function fetchAll(table, query) {
  const rows = [];
  let from = 0; const size = 1000;
  while (true) {
    const { data, error } = await query.range(from, from + size - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return rows;
}

async function main() {
  // ACT-HV = Harvest, spend from 1 Jan 2026 only; exclude deleted/voided bank txns
  // (DELETED ghosts inflated the total by ~$21K — caught 2026-06-26).
  const HV_START = '2026-01-01';
  const bills = await fetchAll('xero_invoices', sb.from('xero_invoices')
    .select('xero_id, date, contact_name, total, status, invoice_number, line_items')
    .eq('project_code', 'ACT-HV').eq('type', 'ACCPAY').in('status', ['AUTHORISED','PAID']).gte('date', HV_START));
  const spends = await fetchAll('xero_transactions', sb.from('xero_transactions')
    .select('xero_transaction_id, date, contact_name, total, status, type, line_items')
    .eq('project_code', 'ACT-HV').in('type', ['SPEND','SPEND-OVERPAYMENT'])
    .not('status', 'in', '("DELETED","VOIDED")').gte('date', HV_START));

  // build matched-payment set
  const paidBills = bills.filter(b => b.status === 'PAID');
  const matchedSpendIds = new Set();
  for (const s of spends) {
    const sDate = new Date(s.date);
    const match = paidBills.find(b =>
      (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
      Number(b.total) === Number(s.total) &&
      Math.abs((new Date(b.date) - sDate) / 86400000) <= 14
    );
    if (match) matchedSpendIds.add(s.xero_transaction_id);
  }

  const unified = [
    ...bills.map(b => ({ source: 'bill', xero_id: b.xero_id, date: b.date, contact_name: b.contact_name, total: Number(b.total), status: b.status, ref: b.invoice_number || '', descr: firstDescr(b.line_items), overlap: '' })),
    ...spends.map(s => ({ source: s.type === 'SPEND' ? 'spend' : 'spend-overpay', xero_id: s.xero_transaction_id, date: s.date, contact_name: s.contact_name, total: Number(s.total), status: s.status, ref: '', descr: firstDescr(s.line_items), overlap: matchedSpendIds.has(s.xero_transaction_id) ? 'payment-of-bill (excluded from sum)' : '' })),
  ];

  unified.sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source) || a.contact_name.localeCompare(b.contact_name));

  // Compute totals
  const billsSum = bills.reduce((a, b) => a + Number(b.total), 0);
  const spendsUnmatchedSum = spends.filter(s => !matchedSpendIds.has(s.xero_transaction_id)).reduce((a, s) => a + Number(s.total), 0);
  const rawTotal = billsSum + spendsUnmatchedSum;

  // Confirmed/probable exclusions
  const exclusionDup = unified.find(r => r.xero_id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d')?.total || 0;
  const exclusionMiscoded = spends.filter(s => s.contact_name === 'Flight Bar Witta').reduce((a, s) => a + Number(s.total), 0);

  // Render Markdown
  const md = [];
  md.push('# ACT-HV (Harvest) — Final Cost Ledger');
  md.push('');
  md.push(`_Generated 2026-05-17 from Supabase \`tednluwflfhxyucgwigh\`. Project code \`ACT-HV\` only. Rows are bills (ACCPAY excl VOIDED) plus bank SPEND txns. Where a SPEND row matches a PAID bill (vendor+amount+date±14d) it's flagged as \`payment-of-bill\` and excluded from the cost sum to avoid double-count._`);
  md.push('');
  md.push('## Headline');
  md.push('');
  md.push('| Bucket | Count | $ |');
  md.push('|---|---:|---:|');
  md.push(`| Bills (ACCPAY, AUTHORISED+PAID, excl VOID) | ${bills.length} | ${fmt(billsSum)} |`);
  md.push(`| Bank SPEND not matched to a paid bill | ${spends.length - matchedSpendIds.size} | ${fmt(spendsUnmatchedSum)} |`);
  md.push(`| Bank SPEND that IS a payment of a bill (excluded) | ${matchedSpendIds.size} | ${fmt(spends.filter(s => matchedSpendIds.has(s.xero_transaction_id)).reduce((a,s)=>a+Number(s.total),0))} |`);
  md.push(`| **Raw total cost commitment** | | **${fmt(rawTotal)}** |`);
  md.push('');
  md.push('### Audit-driven adjustments');
  md.push('');
  md.push('| Adjustment | $ | Note |');
  md.push('|---|---:|---|');
  md.push(`| ⚠ Confirmed duplicate (Kennedy's 2026-04-24 $8,525) | -${fmt(exclusionDup)} | Same invoice posted twice; real paid amount = $8,594.91 (the other row, incl CC surcharge) |`);
  md.push(`| ⚠ Miscoded — Flight Bar Witta NT/SA/Melb/HK travel | -${fmt(exclusionMiscoded)} | Should be ACT-OO (or other); 24 bank txns all auto-tagged from feed |`);
  md.push(`| **Net Harvest cost — best estimate** | | **${fmt(rawTotal - exclusionDup - exclusionMiscoded)}** |`);
  md.push('');
  md.push('### Notable items inside the totals');
  md.push('');
  md.push('- **St Mary\'s Cathedral decking — 12.5 tonnes @ $700/t = $8,750** (embedded in Kennedy\'s 2026-04-24 [$7,000 / 10t] + 2026-05-07 [$1,750 / 2.5t])');
  md.push('- **Local Maleny / Sunshine Coast spend** ≈ $24,228.82 across 63 bills (excl ambiguous + Brisbane/out-of-region)');
  md.push('- **Longara milk crates** $9,400.96 across 3 deliveries (Feb / Apr / May 2026)');
  md.push('- **Maleny Landscaping "Hardwood Chip /m³"** is mulch, not timber — correctly recorded in Xero, only flag for narrative reports');
  md.push('- **Claire Marchesi $8,888 (2025-04-22)** has no description or receipt — purpose still unconfirmed');
  md.push('');
  md.push('## Full chronological ledger');
  md.push('');
  md.push('| Date | Src | Vendor | $ | Status | Description | Audit note | Overlap | Link |');
  md.push('|---|---|---|---:|---|---|---|---|---|');
  for (const r of unified) {
    const note = audit(r);
    const desc = (r.descr || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 180);
    const link = r.source === 'bill'
      ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${r.xero_id}`
      : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${r.xero_id}`;
    md.push(`| ${r.date} | ${r.source} | ${r.contact_name} | ${fmt(r.total)} | ${r.status} | ${desc} | ${note} | ${r.overlap} | [open](${link}) |`);
  }
  md.push('');
  md.push('---');
  md.push('');
  md.push('## Build provenance');
  md.push('');
  md.push('- Source script: `scripts/build-harvest-ledger.mjs`');
  md.push('- Date generated: 2026-05-17');
  md.push('- Data freshness: as of last sync of `xero_invoices` + `xero_transactions` to Supabase (`tednluwflfhxyucgwigh`)');
  md.push('- OCR enrichment: descriptions for previously-empty rows pulled from `xero_transactions.line_items[]._ocr.summary` (run via `scripts/ocr-bank-txn-attachments.mjs`, Gemini 2.5 Flash Lite)');
  md.push('- Excludes VOIDED bills (7 rows, $11,423.76) — not a Harvest cost');
  md.push('- RECEIVE txns (3 rows, $100.50) excluded as cost ledger');
  md.push('- ACCREC inbound revenue ($187,080 across 9 invoices) not shown — this is the cost view');

  const outPath = 'thoughts/shared/handoffs/act-hv-final-ledger-2026-05-17.md';
  writeFileSync(outPath, md.join('\n'));
  console.log(`Written: ${outPath}`);
  console.log(`Rows: ${unified.length} (bills ${bills.length}, spends ${spends.length}, matched ${matchedSpendIds.size})`);
  console.log(`Raw: ${fmt(rawTotal)}`);
  console.log(`Net (after dup + miscoded): ${fmt(rawTotal - exclusionDup - exclusionMiscoded)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
