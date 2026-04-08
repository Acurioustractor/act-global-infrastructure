#!/usr/bin/env node
/**
 * Pair Bank Transfers — finds SPEND-TRANSFER / RECEIVE-TRANSFER pairs in Xero
 *
 * Internal bank-to-bank moves (e.g. NAB Everyday → NAB Visa) appear in Xero as
 * two separate transactions: a SPEND-TRANSFER on one account and a matching
 * RECEIVE-TRANSFER on another, same amount, same-or-next day. These don't need
 * receipts and shouldn't be on the "missing" list.
 *
 * This script finds candidate pairs and writes a report for the accountant to
 * rapidly reconcile as transfers in Xero. Does NOT write to Xero — output is
 * advisory only.
 *
 * Usage:
 *   node scripts/pair-bank-transfers.mjs Q2
 *   node scripts/pair-bank-transfers.mjs Q3
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26 (Jul-Sep 2025)' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26 (Oct-Dec 2025)' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26 (Jan-Mar 2026)' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26 (Apr-Jun 2026)' },
};

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const quarterArg = (process.argv[2] || 'Q3').toUpperCase();
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error('Use Q1|Q2|Q3|Q4'); process.exit(1); }

  // Fetch all transfer-type transactions in quarter (widen by 3 days each side for cross-quarter pairs)
  const transfers = await q(`
    SELECT xero_transaction_id, type, date, contact_name, bank_account,
           abs(total)::numeric(12,2) as amount, is_reconciled, total::numeric(12,2) as signed_total
    FROM xero_transactions
    WHERE type IN ('SPEND-TRANSFER', 'RECEIVE-TRANSFER')
      AND date >= '${quarter.start}'::date - interval '3 days'
      AND date <= '${quarter.end}'::date + interval '3 days'
    ORDER BY date, amount DESC
  `);

  const spends = transfers.filter(t => t.type === 'SPEND-TRANSFER');
  const receives = transfers.filter(t => t.type === 'RECEIVE-TRANSFER');
  console.log(`Transfer rows in window: ${spends.length} SPEND-TRANSFER, ${receives.length} RECEIVE-TRANSFER`);

  // Pair by amount + date (±2 days) + different bank accounts
  const used = new Set();
  const pairs = [];
  const unmatched = [];

  for (const s of spends) {
    const sDate = new Date(s.date);
    const candidates = receives
      .filter(r => !used.has(r.xero_transaction_id))
      .filter(r => Math.abs(Number(r.amount) - Number(s.amount)) < 0.01) // exact amount
      .filter(r => r.bank_account !== s.bank_account) // different accounts
      .filter(r => {
        const dayDiff = Math.abs((new Date(r.date) - sDate) / 86400000);
        return dayDiff <= 2;
      })
      .sort((a, b) => {
        const da = Math.abs(new Date(a.date) - sDate);
        const db = Math.abs(new Date(b.date) - sDate);
        return da - db;
      });

    if (candidates.length > 0) {
      const r = candidates[0];
      used.add(r.xero_transaction_id);
      used.add(s.xero_transaction_id);
      pairs.push({ spend: s, receive: r });
    } else {
      unmatched.push(s);
    }
  }

  const unmatchedReceives = receives.filter(r => !used.has(r.xero_transaction_id));

  // Only show pairs where at least one side is in the actual quarter (not just the window)
  const inQuarter = (d) => d >= quarter.start && d <= quarter.end;
  const quarterPairs = pairs.filter(p => inQuarter(p.spend.date) || inQuarter(p.receive.date));
  const quarterUnmatched = unmatched.filter(s => inQuarter(s.date));
  const quarterUnmatchedReceives = unmatchedReceives.filter(r => inQuarter(r.date));

  // Reporting
  const lines = [];
  lines.push(`# Bank Transfer Pairing — ${quarter.label}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().slice(0, 16)}`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Matched pairs:** ${quarterPairs.length} (${fmt(quarterPairs.reduce((s, p) => s + Number(p.spend.amount), 0))} moved between accounts)`);
  lines.push(`- **Unmatched SPEND-TRANSFER:** ${quarterUnmatched.length}`);
  lines.push(`- **Unmatched RECEIVE-TRANSFER:** ${quarterUnmatchedReceives.length}`);
  lines.push('');
  lines.push('> These are internal bank-to-bank moves. They do **not** need receipts. In Xero, reconcile each pair as "Transfer money" between the two bank accounts — this collapses both entries and removes them from the missing-receipt list.');
  lines.push('');

  if (quarterPairs.length > 0) {
    lines.push('## ✅ Matched Pairs — Reconcile as Transfer');
    lines.push('');
    lines.push('| Date | Amount | From | → | To | Both reconciled? |');
    lines.push('|---|---:|---|:-:|---|:-:|');
    for (const p of quarterPairs.sort((a, b) => Number(b.spend.amount) - Number(a.spend.amount))) {
      const bothRec = p.spend.is_reconciled && p.receive.is_reconciled ? '✅' : '❌';
      lines.push(`| ${p.spend.date} | ${fmt(p.spend.amount)} | ${p.spend.bank_account || '?'} | → | ${p.receive.bank_account || '?'} | ${bothRec} |`);
    }
    lines.push('');
  }

  if (quarterUnmatched.length > 0) {
    lines.push('## ⚠️ Unmatched SPEND-TRANSFER (no RECEIVE-TRANSFER counterpart found)');
    lines.push('');
    lines.push('These may be transfers to accounts that aren\'t synced to Xero (personal accounts, external bank), or a pairing window issue.');
    lines.push('');
    lines.push('| Date | Amount | Bank account | Contact |');
    lines.push('|---|---:|---|---|');
    for (const s of quarterUnmatched.sort((a, b) => Number(b.amount) - Number(a.amount))) {
      lines.push(`| ${s.date} | ${fmt(s.amount)} | ${s.bank_account || '?'} | ${s.contact_name || '-'} |`);
    }
    lines.push('');
  }

  if (quarterUnmatchedReceives.length > 0) {
    lines.push('## ⚠️ Unmatched RECEIVE-TRANSFER');
    lines.push('');
    lines.push('| Date | Amount | Bank account | Contact |');
    lines.push('|---|---:|---|---|');
    for (const r of quarterUnmatchedReceives.sort((a, b) => Number(b.amount) - Number(a.amount))) {
      lines.push(`| ${r.date} | ${fmt(r.amount)} | ${r.bank_account || '?'} | ${r.contact_name || '-'} |`);
    }
    lines.push('');
  }

  const outPath = path.join('thoughts/shared/reports', `bank-transfers-${quarterArg.toLowerCase()}-fy26-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outPath, lines.join('\n'));
  console.log(`\n✅ ${outPath}`);
  console.log(`   Pairs: ${quarterPairs.length} | Unmatched SPEND: ${quarterUnmatched.length} | Unmatched RECEIVE: ${quarterUnmatchedReceives.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
