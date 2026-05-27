#!/usr/bin/env node
/**
 * Cross-match a Dext CSV export against currently-unreceipted Xero rows.
 *
 * Input:  /Users/benknight/Downloads/nicholas-marchesi-2026-05-18.csv (or via --csv=path)
 * Output: thoughts/shared/reports/dext-match-report-YYYY-MM-DD.md
 *
 * Matching rules:
 *   1. Amount exact (AUD)
 *   2. Date within ±5 days (handles bank-settle lag vs receipt date)
 *   3. Vendor fuzzy match (case-insensitive substring of one in the other)
 *
 * Read-only. Outputs a punch list with direct Dext permalinks for manual upload to Xero.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday'];
const args = process.argv.slice(2);
const CSV = args.find(a => a.startsWith('--csv='))?.split('=')[1]
  || '/Users/benknight/Downloads/nicholas-marchesi-2026-05-18.csv';

function parseDate(s) {
  // "17-May-2026" → Date
  if (!s) return null;
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const m = /(\d+)-([A-Za-z]+)-(\d+)/.exec(s);
  if (!m) return null;
  return new Date(parseInt(m[3]), months[m[2]], parseInt(m[1]));
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(',');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Naive CSV split — fields here don't seem to contain commas based on the sample
    const parts = line.split(',');
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j].trim()] = (parts[j] || '').trim();
    rows.push(row);
  }
  return rows;
}

function vendorOverlap(a, b) {
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  // Substring either direction
  if (na.includes(nb) || nb.includes(na)) return true;
  // First word match (after normalising)
  const wa = na.split(' ')[0], wb = nb.split(' ')[0];
  if (wa.length >= 4 && wa === wb) return true;
  return false;
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

async function main() {
  console.log(`Reading ${CSV}`);
  const csvText = readFileSync(CSV, 'utf8');
  const dextRows = parseCSV(csvText).map(r => ({
    itemId: r['Item ID'],
    status: r['Status'],
    submittedBy: r['Submitted by'],
    date: parseDate(r['Date']),
    supplier: r['Supplier'],
    amount: parseFloat((r['Total Amount'] || '0').replace(/,/g, '')),
    permalink: r['Permalink'],
  })).filter(r => r.amount > 0 && r.date);
  console.log(`Parsed ${dextRows.length} Dext rows`);

  console.log('Fetching unreceipted Xero rows…');
  const [bills, spends] = await Promise.all([
    fetchAll(supabase.from('xero_invoices').select('id, xero_id, date, contact_name, total, status, project_code').eq('type', 'ACCPAY').in('status', ['AUTHORISED','PAID']).gte('date', '2025-07-01').eq('has_attachments', false)),
    fetchAll(supabase.from('xero_transactions').select('id, xero_transaction_id, date, contact_name, total, type, project_code, bank_account').in('type', ['SPEND','SPEND-OVERPAYMENT']).gte('date', '2025-07-01').in('bank_account', ACT_ACCOUNTS).eq('has_attachments', false)),
  ]);
  const unreceipted = [
    ...bills.map(b => ({ src: 'bill', xeroId: b.xero_id, date: new Date(b.date), contact: b.contact_name, total: Number(b.total), project: b.project_code, xeroLink: `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${b.xero_id}` })),
    ...spends.map(s => ({ src: 'spend', xeroId: s.xero_transaction_id, date: new Date(s.date), contact: s.contact_name, total: Number(s.total), project: s.project_code, xeroLink: `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${s.xero_transaction_id}` })),
  ];
  console.log(`  → ${unreceipted.length} unreceipted Xero rows`);

  // Match
  const matches = [];
  const ambiguous = [];
  for (const d of dextRows) {
    const candidates = unreceipted.filter(u =>
      Math.abs(u.total - d.amount) < 0.01 &&
      Math.abs((u.date.getTime() - d.date.getTime()) / 86400000) <= 5
    );
    if (candidates.length === 0) continue;
    // Prefer vendor match
    const vendorMatch = candidates.find(c => vendorOverlap(c.contact, d.supplier));
    if (vendorMatch) {
      matches.push({ dext: d, xero: vendorMatch, confidence: 'high' });
    } else if (candidates.length === 1) {
      // amount+date unique → medium confidence
      matches.push({ dext: d, xero: candidates[0], confidence: 'medium' });
    } else {
      ambiguous.push({ dext: d, candidates });
    }
  }

  // Output
  const today = new Date().toISOString().slice(0, 10);
  const md = [];
  md.push(`# Dext → unreceipted-Xero match report · ${today}`);
  md.push('');
  md.push(`Source: \`${CSV}\``);
  md.push(`Dext rows: ${dextRows.length} · Unreceipted Xero rows: ${unreceipted.length}`);
  md.push(`Matches: **${matches.length}** (${matches.filter(m=>m.confidence==='high').length} high confidence · ${matches.filter(m=>m.confidence==='medium').length} medium)`);
  md.push(`Ambiguous (multiple candidates): ${ambiguous.length}`);
  md.push('');
  md.push(`## How to use`);
  md.push(`For each row below, click the Dext link to download the receipt, then click the Xero link to upload it to the matched bill/spend.`);
  md.push('');

  const totalMatchedAmount = matches.reduce((a, m) => a + m.dext.amount, 0);
  md.push(`**Total amount of matched receipts: $${totalMatchedAmount.toFixed(2)}**`);
  md.push('');

  // Group by confidence
  for (const conf of ['high', 'medium']) {
    const group = matches.filter(m => m.confidence === conf).sort((a, b) => b.dext.amount - a.dext.amount);
    if (group.length === 0) continue;
    md.push(`## ${conf === 'high' ? '🟢 High confidence (vendor + amount + date)' : '🟡 Medium confidence (amount + date unique, vendor mismatch)'} — ${group.length} matches`);
    md.push('');
    md.push(`| Date | Vendor (Dext / Xero) | $ | Project | Dext receipt | Xero row |`);
    md.push(`|---|---|---|---|---|---|`);
    for (const m of group) {
      const dateStr = m.dext.date.toISOString().slice(0, 10);
      md.push(`| ${dateStr} | ${m.dext.supplier} / ${m.xero.contact} | $${m.dext.amount.toFixed(2)} | ${m.xero.project || '—'} | [Dext](${m.dext.permalink}) | [${m.xero.src}](${m.xero.xeroLink}) |`);
    }
    md.push('');
  }

  if (ambiguous.length > 0) {
    md.push(`## ⚠ Ambiguous — multiple Xero candidates for one Dext receipt (${ambiguous.length})`);
    md.push('');
    md.push(`These need eyeball — same amount on close dates across multiple vendors.`);
    md.push('');
    md.push(`| Dext date | Dext supplier | $ | Candidates |`);
    md.push(`|---|---|---|---|`);
    for (const a of ambiguous.slice(0, 30)) {
      const candList = a.candidates.map(c => `${c.contact} (${c.src})`).join(' · ');
      md.push(`| ${a.dext.date.toISOString().slice(0, 10)} | ${a.dext.supplier} | $${a.dext.amount.toFixed(2)} | ${candList} |`);
    }
    md.push('');
  }

  const outPath = `thoughts/shared/reports/dext-match-report-${today}.md`;
  writeFileSync(outPath, md.join('\n'));

  console.log(`\nSUMMARY:`);
  console.log(`  Matches: ${matches.length} (${matches.filter(m=>m.confidence==='high').length} high · ${matches.filter(m=>m.confidence==='medium').length} medium)`);
  console.log(`  Ambiguous: ${ambiguous.length}`);
  console.log(`  Total matched amount: $${totalMatchedAmount.toFixed(2)}`);
  console.log(`\nReport: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
