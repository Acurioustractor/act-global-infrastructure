#!/usr/bin/env node
/**
 * BAS Retrospective — post-mortem tool for a completed BAS quarter.
 *
 * Analyzes:
 *   - Final coverage per path (6-path model)
 *   - Top unreceipted vendors by value
 *   - Bank-level reconciliation status
 *   - Deleted/voided zombie count
 *   - Patterns by vendor (counts, values, avg amount)
 *   - What the quarter teaches the skill
 *
 * Writes:
 *   .claude/skills/bas-cycle/references/q{N}-fy{YY}-retro.md
 *
 * The retro file becomes permanent institutional knowledge — append learnings
 * to references/quarterly-learnings.md via manual review of the retro.
 *
 * Usage:
 *   node scripts/bas-retrospective.mjs Q1
 *   node scripts/bas-retrospective.mjs Q1 --fy 26
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const FY_ARG = args.includes('--fy') ? parseInt(args[args.indexOf('--fy') + 1]) : 26;
const quarterArg = args.find(a => /^Q[1-4]$/i.test(a));
if (!quarterArg) { console.error('Usage: bas-retrospective.mjs Q1 [--fy 26]'); process.exit(1); }
const Q = quarterArg.toUpperCase();

const QUARTERS_BY_FY = (fy) => {
  const yr1 = 2000 + fy - 1;
  const yr2 = 2000 + fy;
  return {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30`, label: `Q1 FY${fy}` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31`, label: `Q2 FY${fy}` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31`, label: `Q3 FY${fy}` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30`, label: `Q4 FY${fy}` },
  };
};

const quarter = QUARTERS_BY_FY(FY_ARG)[Q];
const fmt = (n) => '$' + Number(n || 0).toFixed(2);

// Same classifier as bas-completeness.mjs
const NO_RECEIPT_EXACT = new Set(['nab','nab fee','nab international fee','nab fx margin','bank fee','dishonour fee','merchant fee','service fee','stripe fee','paypal fee','interest charge','interest','bank interest','account fee']);
function classifyNoReceipt(tx) {
  const name = (tx.contact_name || '').toLowerCase().trim();
  if (NO_RECEIPT_EXACT.has(name)) return 'bank_fee';
  if (name.includes('bank fee') || name.includes('dishonour') || name.includes('interest charge') || name.includes('international fee') || name.includes('fx margin') || name.includes('card fee') || name.includes('atm fee')) return 'bank_fee';
  if (tx.type === 'SPEND-TRANSFER' || tx.type === 'RECEIVE-TRANSFER') return 'bank_transfer';
  if (Array.isArray(tx.line_items) && tx.line_items.length > 0 && tx.line_items.every(li => li.tax_type === 'BASEXCLUDED')) return 'owner_drawing';
  if (name.startsWith('nm ') || name === 'nicholas marchesi') return 'owner_drawing';
  return null;
}

async function main() {
  console.log(`=== BAS Retrospective — ${quarter.label} ===\n`);

  // 1. Load all SPEND/TRANSFER (non-deleted) for the quarter
  const { data: allTxns } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, type, has_attachments, status, line_items, bank_account, is_reconciled')
    .in('type', ['SPEND', 'SPEND-TRANSFER'])
    .eq('status', 'AUTHORISED')
    .gte('date', quarter.start)
    .lte('date', quarter.end)
    .order('total', { ascending: false });

  // 2. Load deleted shadows (for retrospective awareness)
  const { data: deletedTxns } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date')
    .in('type', ['SPEND', 'SPEND-TRANSFER'])
    .eq('status', 'DELETED')
    .gte('date', quarter.start)
    .lte('date', quarter.end);

  // 3. Load bills for bill-link heuristic
  const lo = new Date(new Date(quarter.start).getTime() - 30*86400000).toISOString().slice(0,10);
  const hi = new Date(new Date(quarter.end).getTime() + 30*86400000).toISOString().slice(0,10);
  const { data: bills } = await sb.from('xero_invoices')
    .select('xero_id, contact_name, total, date, has_attachments')
    .eq('type', 'ACCPAY')
    .neq('status', 'DELETED')
    .neq('status', 'VOIDED')
    .gte('date', lo).lte('date', hi);
  const billsByVendor = new Map();
  for (const b of bills || []) {
    const k = (b.contact_name || '').toLowerCase().split(' ')[0];
    if (!billsByVendor.has(k)) billsByVendor.set(k, []);
    billsByVendor.get(k).push(b);
  }

  // 4. Classify
  const paths = { DIRECT: [], BILL_LINKED: [], NO_RECEIPT_NEEDED: [], MISSING: [] };
  for (const tx of allTxns || []) {
    if (tx.has_attachments) { paths.DIRECT.push(tx); continue; }
    const reason = classifyNoReceipt(tx);
    if (reason) { paths.NO_RECEIPT_NEEDED.push({ ...tx, _reason: reason }); continue; }
    // bill-link heuristic
    const name = (tx.contact_name || '').toLowerCase();
    const firstToken = name.split(' ')[0];
    const candidates = billsByVendor.get(firstToken) || [];
    const txDate = new Date(tx.date).getTime();
    const amt = Math.abs(Number(tx.total));
    const bill = candidates.find(b => {
      if (!b.has_attachments) return false;
      const dd = Math.abs(txDate - new Date(b.date).getTime()) / 86400000;
      if (dd > 14) return false;
      return Math.abs(amt - Number(b.total)) <= 0.50;
    });
    if (bill) { paths.BILL_LINKED.push({ ...tx, _bill: bill }); continue; }
    paths.MISSING.push(tx);
  }

  const total = allTxns.length;
  const totalValue = allTxns.reduce((s, t) => s + Math.abs(Number(t.total)), 0);
  const missingValue = paths.MISSING.reduce((s, t) => s + Math.abs(Number(t.total)), 0);
  const covered = total - paths.MISSING.length;
  const coveredValue = totalValue - missingValue;

  // 5. Vendor patterns — unreceipted vendors grouped
  const vendorStats = {};
  for (const t of paths.MISSING) {
    const v = t.contact_name || '?';
    if (!vendorStats[v]) vendorStats[v] = { n: 0, total: 0, txns: [] };
    vendorStats[v].n++;
    vendorStats[v].total += Math.abs(Number(t.total));
    vendorStats[v].txns.push(t);
  }
  const sortedVendors = Object.entries(vendorStats).sort((a, b) => b[1].total - a[1].total);

  // 6. Deleted shadows
  const deletedValue = (deletedTxns || []).reduce((s, t) => s + Math.abs(Number(t.total)), 0);

  // 7. Bank account breakdown
  const byBank = {};
  for (const t of paths.MISSING) {
    const b = t.bank_account || '?';
    if (!byBank[b]) byBank[b] = { n: 0, total: 0 };
    byBank[b].n++;
    byBank[b].total += Math.abs(Number(t.total));
  }

  // ========================================================================
  // RENDER RETRO
  // ========================================================================
  const lines = [];
  lines.push(`# ${quarter.label} — BAS Retrospective`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Quarter range:** ${quarter.start} → ${quarter.end}`);
  lines.push(``);
  lines.push(`## Final coverage (6-path model)`);
  lines.push(``);
  lines.push(`| Path | Count | Value | % count | % value |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const [k, v] of Object.entries(paths)) {
    const val = v.reduce((s, t) => s + Math.abs(Number(t.total)), 0);
    const pc = ((v.length / total) * 100).toFixed(1);
    const pv = ((val / totalValue) * 100).toFixed(1);
    lines.push(`| ${k} | ${v.length} | ${fmt(val)} | ${pc}% | ${pv}% |`);
  }
  lines.push(`| **TOTAL** | **${total}** | **${fmt(totalValue)}** | 100% | 100% |`);
  lines.push(``);
  lines.push(`**Covered (paths 1-3):** ${covered} / ${total} = **${((covered/total)*100).toFixed(1)}%** by count`);
  lines.push(`**Covered value:** ${fmt(coveredValue)} / ${fmt(totalValue)} = **${((coveredValue/totalValue)*100).toFixed(1)}%** by value`);
  lines.push(``);

  lines.push(`## Zombie state`);
  lines.push(`- DELETED/VOIDED txns in mirror: ${(deletedTxns || []).length}`);
  lines.push(`- Value: ${fmt(deletedValue)}`);
  lines.push(`- Status: ${((deletedTxns || []).length === 0) ? '✅ clean' : '⚠ needs patching via sync-deleted-xero-state.mjs or status filter'}`);
  lines.push(``);

  lines.push(`## Top unreceipted vendors (real gap)`);
  lines.push(``);
  lines.push(`| Vendor | Txns | Value | Pattern | Next-time action |`);
  lines.push(`|---|---:|---:|---|---|`);
  for (const [v, d] of sortedVendors.slice(0, 25)) {
    const pattern = vendorPattern(v, d);
    const action = vendorAction(v, d);
    lines.push(`| ${v} | ${d.n} | ${fmt(d.total)} | ${pattern} | ${action} |`);
  }
  lines.push(``);

  lines.push(`## By bank account`);
  lines.push(``);
  lines.push(`| Account | Missing txns | Missing value |`);
  lines.push(`|---|---:|---:|`);
  for (const [b, d] of Object.entries(byBank).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${b} | ${d.n} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  lines.push(`## Patterns the next quarter should apply`);
  lines.push(``);
  const learnings = extractLearnings(sortedVendors, paths, (deletedTxns || []).length);
  for (const l of learnings) lines.push(`- ${l}`);
  lines.push(``);

  lines.push(`## Appendix — full MISSING chase list`);
  lines.push(``);
  lines.push(`| Date | Vendor | Amount | Bank |`);
  lines.push(`|---|---|---:|---|`);
  for (const t of paths.MISSING.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))) {
    lines.push(`| ${t.date} | ${t.contact_name || '?'} | ${fmt(Math.abs(t.total))} | ${t.bank_account || '?'} |`);
  }

  // Write to skill's references
  const retroPath = `.claude/skills/bas-cycle/references/q${Q.slice(1)}-fy${FY_ARG}-retro.md`;
  const dir = dirname(retroPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(retroPath, lines.join('\n'));

  console.log(`\n=== Summary ===`);
  console.log(`  Total txns: ${total}`);
  console.log(`  Covered: ${covered} (${((covered/total)*100).toFixed(1)}%)`);
  console.log(`  Covered value: ${fmt(coveredValue)} (${((coveredValue/totalValue)*100).toFixed(1)}%)`);
  console.log(`  Missing: ${paths.MISSING.length} (${fmt(missingValue)})`);
  console.log(`  Deleted shadows: ${(deletedTxns || []).length} (${fmt(deletedValue)})`);
  console.log(`\nRetro written: ${retroPath}`);
  console.log(`\nNext step: manually review the retro, extract learnings into .claude/skills/bas-cycle/references/quarterly-learnings.md`);
}

function vendorPattern(vendor, data) {
  const v = vendor.toLowerCase();
  const avg = data.total / data.n;
  if (v.includes('qantas')) return `avg ${fmt(avg)}, connector bill exists`;
  if (v.includes('uber')) return `avg ${fmt(avg)}, ${data.n > 20 ? 'frequent small' : 'occasional'}`;
  if (v.includes('stripe') || v.includes('webflow') || v.includes('anthropic') || v.includes('openai') || v.includes('claude') || v.includes('vercel')) return `SaaS, avg ${fmt(avg)}`;
  if (v.includes('apple')) return `subscription, avg ${fmt(avg)}`;
  if (data.n === 1 && data.total > 1000) return 'one-off large payment';
  if (data.n === 1 && data.total < 82.50) return 'one-off small, under GST threshold';
  return data.n > 5 ? 'recurring small' : 'mixed';
}

function vendorAction(vendor, data) {
  const v = vendor.toLowerCase();
  if (v.includes('qantas')) return 'Xero UI Find & Match';
  if (v.includes('uber')) return 'Bulk bill-to-txn sync; enable Uber Business';
  if (v.includes('webflow')||v.includes('stripe')||v.includes('anthropic')||v.includes('openai')||v.includes('claude')||v.includes('vercel')||v.includes('notion')) return 'Gmail deep search';
  if (v.includes('apple')) return 'Check Apple receipts email';
  if (data.n === 1 && data.total > 1000) return 'Contractor — chase invoice PDF';
  return data.total < 10 ? 'Write-off accept' : 'Chase vendor';
}

function extractLearnings(sortedVendors, paths, deletedCount) {
  const out = [];
  if (deletedCount > 0) {
    out.push(`${deletedCount} DELETED/VOIDED txns were in the mirror — ensure status filter is applied in every downstream query`);
  }
  const topVendor = sortedVendors[0];
  if (topVendor && topVendor[1].total > 1000) {
    out.push(`Largest vendor gap: ${topVendor[0]} (${fmt(topVendor[1].total)}) — ${topVendor[1].n > 10 ? 'bulk reconciliation pattern needed' : 'targeted chase'}`);
  }
  const connectorVendors = sortedVendors.filter(([v]) => /qantas|uber|webflow|stripe|virgin|booking/.test(v.toLowerCase()));
  if (connectorVendors.length > 0) {
    const total = connectorVendors.reduce((s, [, d]) => s + d.total, 0);
    out.push(`Connector vendors with unreceipted bank txns: ${connectorVendors.length} vendors, ${fmt(total)} — run sync-bill-attachments-to-txns.mjs next quarter earlier in the cycle`);
  }
  const bankFeePath6 = paths.NO_RECEIPT_NEEDED.filter(t => t._reason === 'bank_fee').length;
  if (bankFeePath6 > 50) {
    out.push(`${bankFeePath6} bank-fee txns were correctly excluded — classification rules working`);
  }
  const ownerDrawings = paths.NO_RECEIPT_NEEDED.filter(t => t._reason === 'owner_drawing').length;
  if (ownerDrawings > 0) {
    out.push(`${ownerDrawings} owner-drawing txns excluded (BASEXCLUDED) — filter working correctly`);
  }
  if (paths.BILL_LINKED.length > 0) {
    out.push(`${paths.BILL_LINKED.length} txns had a matching bill but weren't auto-copied — run sync-bill-attachments-to-txns.mjs --apply to close the loop`);
  }
  if (paths.MISSING.length === 0) {
    out.push(`🎉 ZERO missing receipts — the first fully-clean quarter`);
  }
  return out;
}

main().catch(e => { console.error(e); process.exit(1); });
