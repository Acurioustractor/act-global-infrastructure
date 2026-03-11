#!/usr/bin/env node

/**
 * Exempt Bank Fees from Receipt Requirements
 *
 * Bank fees (NAB, etc.) don't have receipts — they ARE the receipt.
 * This script bulk-marks them as 'no_receipt_needed' in receipt_matches
 * and 'reconciled' in receipt_pipeline_status.
 *
 * Usage:
 *   node scripts/exempt-bank-fees.mjs              # Dry run (default)
 *   node scripts/exempt-bank-fees.mjs --apply      # Actually write to DB
 *   node scripts/exempt-bank-fees.mjs --verbose    # Detailed output
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Secrets & Auth
// ============================================

let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();
    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// ============================================
// Bank fee patterns
// ============================================

const BANK_FEE_PATTERNS = [
  // Exact matches (case-insensitive via DB)
  'NAB',
  'NAB Fee',
  'NAB International Fee',
  'NAB Card Fee',
  'NAB Merchant Fee',
  'National Australia Bank',
  // Generic patterns
  'Bank Fee',
  'Bank Charge',
  'Bank Interest',
  'Account Fee',
  'Monthly Account Fee',
  'Annual Card Fee',
  'Merchant Fee',
  'Foreign Currency Fee',
  'International Transaction Fee',
  'ATM Fee',
  'Overdraft Fee',
  'Dishonour Fee',
  // Other banks (in case they show up)
  'CBA Fee',
  'ANZ Fee',
  'Westpac Fee',
];

// ============================================
// Main
// ============================================

async function main() {
  log('=== Bank Fee Exemption ===');
  log(APPLY ? 'MODE: APPLY (writing to DB)' : 'MODE: DRY RUN (preview only)');

  const supabase = getSupabase();

  // Fetch ALL SPEND transactions (paginated)
  log('Fetching SPEND transactions...');
  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, type')
      .in('type', ['SPEND', 'SPEND-TRANSFER'])
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`Fetch error: ${error.message}`);
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  log(`  Loaded ${transactions.length} SPEND transactions`);

  // Find bank fee transactions
  const bankFees = [];
  for (const txn of transactions) {
    const name = (txn.contact_name || '').toLowerCase();
    const isMatch = BANK_FEE_PATTERNS.some(pattern => {
      const p = pattern.toLowerCase();
      return name === p || name.includes(p);
    });

    if (isMatch) {
      bankFees.push(txn);
      verbose(`  Match: ${txn.contact_name} | $${Math.abs(parseFloat(txn.total) || 0).toFixed(2)} | ${txn.date}`);
    }
  }

  const totalValue = bankFees.reduce((sum, t) => sum + Math.abs(parseFloat(t.total) || 0), 0);

  log('');
  log(`Found ${bankFees.length} bank fee transactions ($${totalValue.toFixed(2)})`);

  if (bankFees.length === 0) {
    log('Nothing to exempt.');
    return;
  }

  // Group by vendor name for summary
  const byVendor = {};
  for (const txn of bankFees) {
    const v = txn.contact_name || 'Unknown';
    byVendor[v] = (byVendor[v] || 0) + 1;
  }
  log('By vendor:');
  for (const [vendor, count] of Object.entries(byVendor).sort((a, b) => b[1] - a[1])) {
    log(`  ${vendor}: ${count}`);
  }

  if (!APPLY) {
    log('\nDRY RUN — use --apply to write to DB');
    return;
  }

  // Upsert into receipt_matches as 'no_receipt_needed'
  log('\nWriting to receipt_matches...');
  const now = new Date().toISOString();
  let matchesWritten = 0;

  for (let i = 0; i < bankFees.length; i += 50) {
    const batch = bankFees.slice(i, i + 50).map(txn => ({
      source_type: 'transaction',
      source_id: txn.xero_transaction_id,
      vendor_name: txn.contact_name,
      amount: Math.abs(parseFloat(txn.total) || 0),
      transaction_date: txn.date,
      category: 'other',
      status: 'no_receipt_needed',
      resolved_at: now,
      resolved_by: 'no_receipt',
      resolution_notes: 'Bank fee — no receipt exists',
    }));

    const { error } = await supabase
      .from('receipt_matches')
      .upsert(batch, { onConflict: 'source_type,source_id' });

    if (error) {
      log(`  Error batch ${Math.floor(i / 50) + 1}: ${error.message}`);
    } else {
      matchesWritten += batch.length;
    }
  }

  log(`  Wrote ${matchesWritten} receipt_matches records`);

  // Upsert into receipt_pipeline_status as 'reconciled'
  log('Writing to receipt_pipeline_status...');
  let pipelineWritten = 0;

  for (let i = 0; i < bankFees.length; i += 50) {
    const batch = bankFees.slice(i, i + 50).map(txn => ({
      xero_transaction_id: txn.xero_transaction_id,
      stage: 'reconciled',
      vendor_name: txn.contact_name,
      amount: Math.abs(parseFloat(txn.total) || 0),
      transaction_date: txn.date,
      notes: 'Bank fee exempt — no receipt needed',
      updated_at: now,
    }));

    const { error } = await supabase
      .from('receipt_pipeline_status')
      .upsert(batch, { onConflict: 'xero_transaction_id' });

    if (error) {
      log(`  Error batch ${Math.floor(i / 50) + 1}: ${error.message}`);
    } else {
      pipelineWritten += batch.length;
    }
  }

  log(`  Wrote ${pipelineWritten} pipeline_status records`);
  log('\nDone.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
