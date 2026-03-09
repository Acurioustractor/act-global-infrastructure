#!/usr/bin/env node

/**
 * Monitor Receipt Pipeline — Daily Health Check
 *
 * Checks for stuck receipts, forwarding failures, and reconciliation gaps.
 * Writes findings to receipt_pipeline_status notes and logs alerts.
 *
 * Usage:
 *   node scripts/monitor-receipt-pipeline.mjs              # Full check
 *   node scripts/monitor-receipt-pipeline.mjs --verbose     # Detailed output
 *   node scripts/monitor-receipt-pipeline.mjs --dry-run     # Preview only
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
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
// Alert checks
// ============================================

async function main() {
  log('=== Receipt Pipeline Monitor ===');

  const supabase = getSupabase();
  const alerts = [];

  // 1. Stuck receipts (missing_receipt > 14 days old)
  log('Checking for stuck receipts...');
  const stuckCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: stuck } = await supabase
    .from('receipt_pipeline_status')
    .select('id, vendor_name, amount, transaction_date')
    .eq('stage', 'missing_receipt')
    .lt('transaction_date', stuckCutoff)
    .order('amount', { ascending: false });

  if (stuck?.length) {
    const totalStuck = stuck.reduce((sum, s) => sum + Math.abs(parseFloat(s.amount) || 0), 0);
    alerts.push({
      type: 'stuck_receipts',
      severity: totalStuck > 1000 ? 'critical' : 'warning',
      message: `${stuck.length} receipts stuck > 14 days ($${totalStuck.toLocaleString()})`,
      details: stuck.slice(0, 5).map(s =>
        `${s.vendor_name}: $${Math.abs(parseFloat(s.amount) || 0)} (${s.transaction_date})`
      ),
    });
    log(`  ALERT: ${stuck.length} stuck receipts ($${totalStuck.toLocaleString()})`);
  } else {
    log('  OK: No stuck receipts');
  }

  // 2. Forwarding failures (forwarded_to_dext > 3 days but no attachment in Xero)
  log('Checking for Dext forwarding failures...');
  const forwardCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: forwardStuck } = await supabase
    .from('receipt_pipeline_status')
    .select('id, vendor_name, amount, transaction_date, matched_at')
    .eq('stage', 'forwarded_to_dext')
    .lt('matched_at', forwardCutoff);

  if (forwardStuck?.length) {
    alerts.push({
      type: 'forwarding_failure',
      severity: 'warning',
      message: `${forwardStuck.length} emails forwarded to Dext > 3 days ago but no Xero attachment`,
      details: forwardStuck.slice(0, 5).map(s =>
        `${s.vendor_name}: $${Math.abs(parseFloat(s.amount) || 0)}`
      ),
    });
    log(`  ALERT: ${forwardStuck.length} forwarding failures`);
  } else {
    log('  OK: No forwarding failures');
  }

  // 3. High-value unreconciled (> $500)
  log('Checking for high-value unreconciled transactions...');
  const { data: highValue } = await supabase
    .from('receipt_pipeline_status')
    .select('id, vendor_name, amount, transaction_date, stage')
    .neq('stage', 'reconciled')
    .gt('amount', 500)
    .order('amount', { ascending: false });

  if (highValue?.length) {
    const totalHV = highValue.reduce((sum, s) => sum + Math.abs(parseFloat(s.amount) || 0), 0);
    alerts.push({
      type: 'high_value_unreconciled',
      severity: totalHV > 5000 ? 'critical' : 'warning',
      message: `${highValue.length} unreconciled transactions > $500 (total $${totalHV.toLocaleString()})`,
      details: highValue.slice(0, 5).map(s =>
        `${s.vendor_name}: $${Math.abs(parseFloat(s.amount) || 0)} [${s.stage}]`
      ),
    });
    log(`  ALERT: ${highValue.length} high-value unreconciled ($${totalHV.toLocaleString()})`);
  } else {
    log('  OK: No high-value unreconciled');
  }

  // 4. Pipeline summary stats
  log('Computing pipeline stats...');
  const { data: allPipeline } = await supabase
    .from('receipt_pipeline_status')
    .select('stage, amount');

  const stageCounts = {};
  let totalAmount = 0;
  for (const p of (allPipeline || [])) {
    stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
    totalAmount += Math.abs(parseFloat(p.amount) || 0);
  }

  const reconciledCount = stageCounts['reconciled'] || 0;
  const totalCount = (allPipeline || []).length;
  const reconciliationRate = totalCount > 0
    ? Math.round((reconciledCount / totalCount) * 100)
    : 0;

  log('');
  log('Pipeline Summary:');
  for (const [stage, count] of Object.entries(stageCounts)) {
    log(`  ${stage}: ${count}`);
  }
  log(`  Reconciliation rate: ${reconciliationRate}%`);
  log(`  Total pipeline value: $${totalAmount.toLocaleString()}`);

  // 5. Log results
  log('');
  if (alerts.length === 0) {
    log('All clear — no alerts');
  } else {
    log(`${alerts.length} alert(s) generated:`);
    for (const a of alerts) {
      log(`  [${a.severity.toUpperCase()}] ${a.message}`);
      if (VERBOSE && a.details) {
        for (const d of a.details) {
          log(`    - ${d}`);
        }
      }
    }
  }

  // 6. Record sync status
  await recordSyncStatus(supabase, 'receipt_pipeline_monitor', {
    success: true,
    recordCount: alerts.length,
  });

  log('Done.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
