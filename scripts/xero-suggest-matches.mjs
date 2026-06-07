#!/usr/bin/env node
/**
 * Suggest deposit ↔ invoice matches for the unreconciled state.
 *
 * Two flows scored:
 *   1. AUTHORISED invoices (no Payment yet) → look for RECEIVE bank txns matching amount + date
 *   2. AUTHORISED Payments without bank-line link (is_reconciled=false) → look for matching RECEIVE
 *
 * Confidence = exact_amount(10) + contact_match(5) + date_within_30d(3)
 *
 * Usage:
 *   node scripts/xero-suggest-matches.mjs            # print top suggestions
 *   node scripts/xero-suggest-matches.mjs --csv      # machine-readable
 *   node scripts/xero-suggest-matches.mjs --apply    # auto-create Payments for high-confidence (score >= 13) matches
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CSV = args.includes('--csv');

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

function tokenize(s) {
  return new Set((s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 4));
}
function overlap(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

async function main() {
  // 1. AUTHORISED outstanding invoices
  const { data: outstanding } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_due, date, due_date')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED')
    .gt('amount_due', 0)
    .gte('date', '2025-04-01');

  // 2. RECEIVE bank txns
  const { data: receives } = await supabase
    .from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, bank_account, is_reconciled')
    .eq('type', 'RECEIVE').neq('status', 'DELETED')
    .gte('date', '2025-04-01');

  const candidates = [];
  for (const inv of (outstanding || [])) {
    const targetAmt = Number(inv.amount_due);
    const invTokens = tokenize(inv.contact_name);
    const matches = (receives || [])
      .filter(r => Math.abs(Number(r.total) - targetAmt) < 1)
      .filter(r => Math.abs(new Date(r.date) - new Date(inv.date)) < 90 * 86400000)
      .map(r => {
        let score = 10; // exact amount
        const recvTokens = tokenize(r.contact_name);
        const ovr = overlap(invTokens, recvTokens);
        if (ovr >= 1) score += 5;
        const daysOff = Math.abs(new Date(r.date) - new Date(inv.date)) / 86400000;
        if (daysOff < 30) score += 3;
        return { ...r, _score: score };
      })
      .sort((a, b) => b._score - a._score);

    if (matches.length > 0) {
      candidates.push({
        invoice_number: inv.invoice_number,
        contact: inv.contact_name,
        amount: inv.amount_due,
        invoice_date: inv.date,
        best: matches[0],
        n_matches: matches.length,
      });
    }
  }

  if (CSV) {
    console.log('invoice,contact,amount,invoice_date,deposit_date,deposit_contact,score');
    for (const c of candidates) {
      console.log(`${c.invoice_number},${c.contact},${c.amount},${c.invoice_date},${c.best.date},${c.best.contact_name || ''},${c.best._score}`);
    }
    return;
  }

  console.log(`\n=== Match suggestions ===`);
  console.log(`Found ${candidates.length} AUTHORISED invoices with at least one matching deposit.\n`);
  if (candidates.length === 0) {
    console.log('No matches. Either all is reconciled, or no bank deposits exist for outstanding amounts.');
    return;
  }

  console.log(`Score legend: 10=exact amount, +5 contact name overlap, +3 date within 30d. Max 18.\n`);
  console.log('Inv# / contact / $ / inv date  →  deposit date / deposit contact / score');
  console.log('-'.repeat(110));
  for (const c of candidates.sort((a, b) => b.best._score - a.best._score)) {
    const tag = c.best._score >= 13 ? '⭐' : c.best._score >= 10 ? ' ·' : ' ?';
    console.log(`${tag} ${c.invoice_number?.padEnd(10)} ${(c.contact || '').slice(0, 30).padEnd(30)} ${fmt(c.amount).padEnd(12)} ${c.invoice_date}  →  ${c.best.date}  ${(c.best.contact_name || 'unknown').slice(0, 30).padEnd(30)}  score=${c.best._score}`);
  }

  console.log(`\n${candidates.filter(c => c.best._score >= 13).length} high-confidence (⭐ score≥13)`);
  console.log(`${candidates.filter(c => c.best._score >= 10 && c.best._score < 13).length} medium ( · )`);
  console.log(`${candidates.filter(c => c.best._score < 10).length} low ( ? )`);
  console.log('\nTo apply high-confidence matches: node scripts/xero-suggest-matches.mjs --apply');
  console.log('To match individually: node scripts/xero-match-payment.mjs --invoice INV-XXXX --account "..." --amount X --date YYYY-MM-DD');

  if (APPLY) {
    const high = candidates.filter(c => c.best._score >= 13);
    if (high.length === 0) {
      console.log('\nNo high-confidence matches to apply.');
      return;
    }
    console.log(`\nApplying ${high.length} high-confidence matches...`);
    for (const c of high) {
      try {
        execSync(
          `node ${join(__dirname, 'xero-match-payment.mjs')} --invoice ${c.invoice_number} --account-id "${c.best.bank_account || 'NJ Marchesi T/as ACT Everyday'}" --amount ${c.amount} --date ${c.best.date}`,
          { stdio: 'inherit' }
        );
      } catch (e) {
        console.log(`  ✗ ${c.invoice_number}: ${e.message}`);
      }
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
