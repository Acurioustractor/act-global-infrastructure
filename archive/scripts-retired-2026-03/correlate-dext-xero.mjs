#!/usr/bin/env node

/**
 * Correlate Dext Forwarded Emails ↔ Xero Transactions
 *
 * Populates receipt_pipeline_status by matching unreconciled Xero transactions
 * against Dext forwarded emails, then determining which stage each transaction
 * is at in the receipt pipeline.
 *
 * Pipeline stages:
 *   missing_receipt     → No receipt email found for this transaction
 *   forwarded_to_dext   → Email found in dext_forwarded_emails (waiting for Dext to process)
 *   dext_processed      → Xero attachment appeared (Dext pushed the receipt)
 *   xero_bill_created   → Bill matched in Xero
 *   reconciled          → Transaction is reconciled in Xero
 *
 * Usage:
 *   node scripts/correlate-dext-xero.mjs              # Default: last 90 days
 *   node scripts/correlate-dext-xero.mjs --days 30    # Last 30 days
 *   node scripts/correlate-dext-xero.mjs --dry-run    # Preview without writing
 *   node scripts/correlate-dext-xero.mjs --verbose    # Detailed output
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const daysBack = (() => {
  const idx = args.indexOf('--days');
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 90;
})();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Secrets & Auth (same pattern as other scripts)
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
// Fuzzy matching helpers
// ============================================

/**
 * Normalize vendor name for fuzzy matching.
 * Strips common suffixes, lowercases, removes punctuation.
 */
function normalizeVendor(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(pty|ltd|inc|llc|corp|limited|global|australia|au)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Check if two vendor names are likely the same.
 * Uses normalized substring matching — if either contains the other.
 */
function vendorsMatch(a, b) {
  const na = normalizeVendor(a);
  const nb = normalizeVendor(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Substring match (e.g. "openai" matches "openaiinc")
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

/**
 * Check if amounts match within tolerance (±5%).
 */
function amountsMatch(a, b) {
  if (a == null || b == null) return false;
  const numA = Math.abs(parseFloat(a));
  const numB = Math.abs(parseFloat(b));
  if (numA === 0 && numB === 0) return true;
  const diff = Math.abs(numA - numB);
  const avg = (numA + numB) / 2;
  return diff / avg <= 0.05;
}

/**
 * Check if two dates are within N days of each other.
 */
function datesWithinDays(dateA, dateB, days = 3) {
  if (!dateA || !dateB) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

// ============================================
// Main pipeline correlation
// ============================================

async function main() {
  log('=== Receipt Pipeline Correlation ===');
  log(`Looking back ${daysBack} days${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const supabase = getSupabase();
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // 1. Fetch all SPEND/ACCPAY transactions in the window (paginated for >1000)
  log('Fetching Xero SPEND/ACCPAY transactions...');
  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error: txError } = await supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, has_attachments, is_reconciled, status')
      .in('type', ['SPEND', 'ACCPAY', 'SPEND-TRANSFER'])
      .gte('date', cutoffDate)
      .eq('status', 'AUTHORISED')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (txError) throw new Error(`Failed to fetch transactions: ${txError.message}`);
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  log(`  Found ${transactions.length} SPEND/ACCPAY transactions (${page + 1} pages)`);

  // 2. Fetch ALL Dext forwarded emails (not filtered by window — receipts may have been forwarded at any time)
  log('Fetching Dext forwarded emails...');
  const { data: dextEmails, error: dextError } = await supabase
    .from('dext_forwarded_emails')
    .select('id, gmail_message_id, vendor, subject, original_date, forwarded_at');

  if (dextError) throw new Error(`Failed to fetch Dext emails: ${dextError.message}`);
  log(`  Found ${dextEmails.length} Dext forwarded emails`);

  // 2b. Fetch receipt_matches exemptions (no_receipt_needed)
  log('Fetching receipt exemptions...');
  const exemptSet = new Set();
  let exemptPage = 0;
  while (true) {
    const { data: exemptions, error: exemptError } = await supabase
      .from('receipt_matches')
      .select('source_id')
      .eq('source_type', 'transaction')
      .eq('status', 'no_receipt_needed')
      .range(exemptPage * PAGE_SIZE, (exemptPage + 1) * PAGE_SIZE - 1);

    if (exemptError) { log(`  Warning: Could not fetch exemptions: ${exemptError.message}`); break; }
    for (const e of (exemptions || [])) exemptSet.add(e.source_id);
    if (!exemptions || exemptions.length < PAGE_SIZE) break;
    exemptPage++;
  }
  log(`  Found ${exemptSet.size} exempt transactions (no_receipt_needed)`);

  // 3. Fetch existing pipeline records to avoid re-processing
  const { data: existingPipeline } = await supabase
    .from('receipt_pipeline_status')
    .select('xero_transaction_id, stage');

  const existingMap = new Map();
  for (const p of (existingPipeline || [])) {
    existingMap.set(p.xero_transaction_id, p.stage);
  }

  // 4. Determine stage for each transaction
  const upserts = [];
  const stats = {
    missing_receipt: 0,
    forwarded_to_dext: 0,
    dext_processed: 0,
    reconciled: 0,
    skipped_existing: 0,
  };

  for (const txn of transactions) {
    const txnId = txn.xero_transaction_id;

    // Determine pipeline stage
    let stage = 'missing_receipt';
    let dextEmailId = null;
    let gmailMessageId = null;
    let matchedAt = null;

    // Stage: reconciled (highest priority — includes exemptions)
    if (txn.is_reconciled || exemptSet.has(txnId)) {
      stage = 'reconciled';
    }
    // Stage: dext_processed (attachment appeared in Xero)
    else if (txn.has_attachments) {
      stage = 'dext_processed';
    }
    // Stage: forwarded_to_dext (found matching Dext email)
    else {
      // Try to match against Dext forwarded emails
      // Use wide date window (30 days) since backfilled receipts may be months apart
      // Fall back to vendor-only match if no date match (receipt exists, just can't pin exact date)
      let bestMatch = null;
      for (const dext of dextEmails) {
        const vendorOk = vendorsMatch(txn.contact_name, dext.vendor);
        if (!vendorOk) continue;

        const dateOk = datesWithinDays(txn.date, dext.original_date || dext.forwarded_at, 30);
        if (dateOk) {
          bestMatch = dext;
          break; // Exact vendor + date match — use it
        }
        // Vendor matches but date doesn't — keep as fallback
        if (!bestMatch) bestMatch = dext;
      }

      if (bestMatch) {
        stage = 'forwarded_to_dext';
        dextEmailId = bestMatch.id;
        gmailMessageId = bestMatch.gmail_message_id;
        matchedAt = new Date().toISOString();
        verbose(`  Matched: ${txn.contact_name} $${txn.total} → Dext email "${bestMatch.subject}"`);
      }
    }

    // Skip if stage hasn't changed
    const existingStage = existingMap.get(txnId);
    if (existingStage === stage) {
      stats.skipped_existing++;
      continue;
    }

    stats[stage] = (stats[stage] || 0) + 1;

    upserts.push({
      xero_transaction_id: txnId,
      dext_forwarded_email_id: dextEmailId,
      gmail_message_id: gmailMessageId,
      stage,
      vendor_name: txn.contact_name,
      amount: Math.abs(parseFloat(txn.total) || 0),
      transaction_date: txn.date,
      matched_at: matchedAt,
      updated_at: new Date().toISOString(),
    });
  }

  log('');
  log('Pipeline Results:');
  log(`  Missing receipt:    ${stats.missing_receipt}`);
  log(`  Forwarded to Dext:  ${stats.forwarded_to_dext}`);
  log(`  Dext processed:     ${stats.dext_processed}`);
  log(`  Reconciled:         ${stats.reconciled}`);
  log(`  Unchanged (skip):   ${stats.skipped_existing}`);
  log(`  Total to upsert:    ${upserts.length}`);

  // 5. Write to database
  if (!DRY_RUN && upserts.length > 0) {
    log('Writing pipeline status...');
    // Batch in groups of 100
    for (let i = 0; i < upserts.length; i += 100) {
      const batch = upserts.slice(i, i + 100);
      const { error: upsertError } = await supabase
        .from('receipt_pipeline_status')
        .upsert(batch, { onConflict: 'xero_transaction_id' });

      if (upsertError) {
        log(`  Error writing batch ${i / 100 + 1}: ${upsertError.message}`);
      } else {
        verbose(`  Wrote batch ${i / 100 + 1} (${batch.length} records)`);
      }
    }
    log(`  Wrote ${upserts.length} pipeline records`);
  } else if (DRY_RUN) {
    log('DRY RUN — no records written');
  }

  // 6. Record sync status
  await recordSyncStatus(supabase, 'receipt_pipeline_correlation', {
    success: true,
    recordCount: upserts.length,
  });

  log('Done.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
