#!/usr/bin/env node

/**
 * Exempt Internal Transfers & Reimbursements from Receipt Requirements
 *
 * Covers:
 *   - Null contact_name (bank transfers, internal movements)
 *   - Nicholas Marchesi (founder reimbursements)
 *   - Orange Sky Laund (related entity payments)
 *   - 2Up Spending (card account transfers)
 *   - Chris Witta (property-related, invoiced separately)
 *   - Nest In Witta (property-related)
 *   - Small misc purchases under $20 (parking, kiosks, etc.)
 *
 * Usage:
 *   node scripts/exempt-internal-transfers.mjs              # Dry run (default)
 *   node scripts/exempt-internal-transfers.mjs --apply      # Write to DB
 *   node scripts/exempt-internal-transfers.mjs --verbose    # Show every match
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
// Exemption rules
// ============================================

const EXEMPTION_RULES = [
  {
    name: 'Internal transfer (null contact)',
    reason: 'internal_transfer',
    match: (txn) => !txn.contact_name || txn.contact_name.trim() === '',
  },
  {
    name: 'Founder reimbursement (Nicholas Marchesi)',
    reason: 'founder_reimbursement',
    match: (txn) => (txn.contact_name || '').toLowerCase().includes('nicholas marchesi'),
  },
  {
    name: 'Related entity (Orange Sky)',
    reason: 'related_entity',
    match: (txn) => (txn.contact_name || '').toLowerCase().includes('orange sky'),
  },
  {
    name: 'Card transfer (2Up Spending)',
    reason: 'card_transfer',
    match: (txn) => (txn.contact_name || '').toLowerCase().includes('2up spending'),
  },
  {
    name: 'Property payment (Chris Witta / Nest In Witta)',
    reason: 'property_payment',
    match: (txn) => {
      const name = (txn.contact_name || '').toLowerCase();
      return name.includes('chris witta') || name.includes('nest in witta');
    },
  },
];

// ============================================
// Main
// ============================================

async function main() {
  log('=== Internal Transfer & Reimbursement Exemption ===');
  log(APPLY ? 'MODE: APPLY' : 'MODE: DRY RUN');

  const supabase = getSupabase();

  // Fetch ALL SPEND transactions (paginated)
  log('Fetching SPEND transactions...');
  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, type, project_code')
      .in('type', ['SPEND', 'ACCPAY', 'SPEND-TRANSFER'])
      .eq('status', 'AUTHORISED')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`Fetch error: ${error.message}`);
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  log(`  Loaded ${transactions.length} transactions`);

  // Check what's already exempt
  const { data: existing } = await supabase
    .from('receipt_matches')
    .select('source_id')
    .eq('source_type', 'transaction')
    .eq('status', 'no_receipt_needed');

  const alreadyExempt = new Set((existing || []).map(e => e.source_id));
  log(`  ${alreadyExempt.size} already exempt`);

  // Apply rules
  const matched = [];
  const ruleStats = {};

  for (const txn of transactions) {
    if (alreadyExempt.has(txn.xero_transaction_id)) continue;

    for (const rule of EXEMPTION_RULES) {
      if (rule.match(txn)) {
        matched.push({ txn, rule });
        ruleStats[rule.name] = (ruleStats[rule.name] || { count: 0, value: 0 });
        ruleStats[rule.name].count++;
        ruleStats[rule.name].value += Math.abs(parseFloat(txn.total) || 0);
        verbose(`  ${rule.name}: ${txn.contact_name || '(null)'} | $${Math.abs(parseFloat(txn.total) || 0).toFixed(2)} | ${txn.date}`);
        break; // First matching rule wins
      }
    }
  }

  const totalValue = matched.reduce((s, m) => s + Math.abs(parseFloat(m.txn.total) || 0), 0);

  log('');
  log(`Found ${matched.length} transactions to exempt ($${totalValue.toFixed(2)})`);
  log('');
  log('By rule:');
  for (const [name, stats] of Object.entries(ruleStats)) {
    log(`  ${name}: ${stats.count} ($${stats.value.toFixed(0)})`);
  }

  if (matched.length === 0) {
    log('Nothing to exempt.');
    return;
  }

  if (!APPLY) {
    log('\nDRY RUN — use --apply to write to DB');
    return;
  }

  // Write to receipt_matches
  log('\nWriting to receipt_matches...');
  const now = new Date().toISOString();
  let matchesWritten = 0;

  for (let i = 0; i < matched.length; i += 50) {
    const batch = matched.slice(i, i + 50).map(({ txn, rule }) => ({
      source_type: 'transaction',
      source_id: txn.xero_transaction_id,
      vendor_name: txn.contact_name,
      amount: Math.abs(parseFloat(txn.total) || 0),
      transaction_date: txn.date,
      category: 'other',
      status: 'no_receipt_needed',
      resolved_at: now,
      resolved_by: 'no_receipt',
      resolution_notes: `${rule.reason}: ${rule.name}`,
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

  // Write to receipt_pipeline_status
  log('Writing to receipt_pipeline_status...');
  let pipelineWritten = 0;

  for (let i = 0; i < matched.length; i += 50) {
    const batch = matched.slice(i, i + 50).map(({ txn, rule }) => ({
      xero_transaction_id: txn.xero_transaction_id,
      stage: 'reconciled',
      vendor_name: txn.contact_name,
      amount: Math.abs(parseFloat(txn.total) || 0),
      transaction_date: txn.date,
      notes: `Exempt: ${rule.reason}`,
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
