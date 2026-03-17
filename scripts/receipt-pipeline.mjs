#!/usr/bin/env node

/**
 * Receipt Pipeline Orchestrator
 *
 * Single entry point for the entire receipt automation pipeline.
 * Runs phases sequentially or individually.
 *
 * Usage:
 *   node scripts/receipt-pipeline.mjs              # Full pipeline
 *   node scripts/receipt-pipeline.mjs capture      # Phase: capture from Gmail
 *   node scripts/receipt-pipeline.mjs match        # Phase: match to Xero
 *   node scripts/receipt-pipeline.mjs upload       # Phase: upload to Xero
 *   node scripts/receipt-pipeline.mjs tag          # Phase: project tagging
 *   node scripts/receipt-pipeline.mjs reconcile    # Phase: generate checklist
 *   node scripts/receipt-pipeline.mjs advise       # Phase: financial advisor
 *   node scripts/receipt-pipeline.mjs suggest      # Phase: calendar suggestions
 *   node scripts/receipt-pipeline.mjs status       # Pipeline health
 *   node scripts/receipt-pipeline.mjs report       # Full report (all phases)
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const phase = process.argv[2] || 'full';
const extraArgs = process.argv.slice(3).join(' ');

// Pipeline run tracking — unique ID per invocation
const PIPELINE_RUN_ID = process.env.PIPELINE_RUN_ID || randomUUID();

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function runScript(name, args = '') {
  const scriptPath = join(__dirname, name);
  const cmd = `node "${scriptPath}" ${args}`.trim();
  log(`>>> ${cmd}`);
  const startTime = Date.now();
  try {
    execSync(cmd, {
      stdio: 'inherit',
      timeout: 300000, // 5 min timeout
      env: { ...process.env, PIPELINE_RUN_ID },
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`  ✓ ${name} completed in ${elapsed}s`);
    return true;
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`  ERROR: ${name} failed with exit code ${err.status || 'unknown'} after ${elapsed}s`);
    return false;
  }
}

// ============================================================================
// PIPELINE STATUS
// ============================================================================

async function showStatus() {
  log('=== Receipt Pipeline Health ===\n');

  // Receipt emails by status
  const { data: statuses } = await supabase.rpc('exec_sql', {
    query: `SELECT status, count(*)::int as cnt,
      count(CASE WHEN source = 'gmail' THEN 1 END)::int as from_gmail,
      count(CASE WHEN source = 'dext_import' THEN 1 END)::int as from_dext
    FROM receipt_emails GROUP BY status ORDER BY cnt DESC`
  });

  let total = 0;
  console.log('  Receipt Pipeline:');
  for (const row of statuses || []) {
    total += row.cnt;
    const bar = '#'.repeat(Math.min(50, Math.round(row.cnt / 20)));
    console.log(`    ${row.status.padEnd(12)} ${String(row.cnt).padStart(5)}  ${bar}`);
  }
  console.log(`    ${'TOTAL'.padEnd(12)} ${String(total).padStart(5)}`);

  // Xero transaction coverage
  const { data: xeroStats } = await supabase.rpc('exec_sql', {
    query: `SELECT
      count(*)::int as total,
      count(CASE WHEN has_attachments THEN 1 END)::int as with_attachments,
      count(CASE WHEN project_code IS NOT NULL THEN 1 END)::int as tagged,
      count(CASE WHEN type IN ('SPEND','SPEND-TRANSFER') AND NOT has_attachments THEN 1 END)::int as spend_no_receipt
    FROM xero_transactions
    WHERE date >= (current_date - interval '90 days')`
  });

  if (xeroStats?.[0]) {
    const s = xeroStats[0];
    console.log('\n  Xero (last 90 days):');
    console.log(`    Transactions:     ${s.total}`);
    console.log(`    With attachments: ${s.with_attachments} (${Math.round(s.with_attachments / s.total * 100)}%)`);
    console.log(`    Project tagged:   ${s.tagged} (${Math.round(s.tagged / s.total * 100)}%)`);
    console.log(`    Spend no receipt: ${s.spend_no_receipt}`);
  }

  // Recent activity
  const { data: recent } = await supabase.rpc('exec_sql', {
    query: `SELECT source, status, count(*)::int as cnt, max(updated_at) as last_update
    FROM receipt_emails
    WHERE updated_at >= (current_timestamp - interval '7 days')
    GROUP BY source, status ORDER BY last_update DESC LIMIT 10`
  });

  if (recent?.length) {
    console.log('\n  Last 7 days:');
    for (const r of recent) {
      console.log(`    ${r.source.padEnd(12)} ${r.status.padEnd(10)} ${r.cnt} items  (${new Date(r.last_update).toLocaleDateString()})`);
    }
  }

  console.log('');
}

// ============================================================================
// PIPELINE PHASES
// ============================================================================

const PHASES = {
  capture: () => runScript('capture-receipts.mjs', `--days 3 ${extraArgs}`),
  match: () => runScript('match-receipts-to-xero.mjs', `--apply --ai ${extraArgs}`),
  upload: () => runScript('upload-receipts-to-xero.mjs', extraArgs),
  tag: () => runScript('tag-xero-transactions.mjs', `--apply ${extraArgs}`),
  suggest: () => runScript('suggest-receipts-from-calendar.mjs', extraArgs),
  reconcile: () => runScript('generate-reconciliation-checklist.mjs', extraArgs),
  advise: () => runScript('financial-advisor-agent.mjs', extraArgs),
};

async function runFull() {
  const runStart = Date.now();
  log(`=== Full Receipt Pipeline === (run: ${PIPELINE_RUN_ID.slice(0, 8)})\n`);
  const results = {};

  const sequence = ['capture', 'match', 'upload', 'tag'];
  for (const p of sequence) {
    log(`\n${'='.repeat(60)}`);
    log(`PHASE: ${p.toUpperCase()}`);
    log('='.repeat(60));
    results[p] = PHASES[p]();
  }

  const totalElapsed = ((Date.now() - runStart) / 1000).toFixed(1);
  const allPassed = Object.values(results).every(Boolean);
  const failedPhases = Object.entries(results).filter(([, ok]) => !ok).map(([p]) => p);

  log('\n' + '='.repeat(60));
  log(`PIPELINE ${allPassed ? 'COMPLETE' : 'FINISHED WITH ERRORS'} (${totalElapsed}s)`);
  log('='.repeat(60));

  for (const [p, success] of Object.entries(results)) {
    log(`  ${p.padEnd(12)} ${success ? '✓' : '✗ FAILED'}`);
  }

  // Record pipeline run to Supabase for tracking partial failures
  try {
    await supabase.rpc('exec_sql', {
      query: `INSERT INTO pipeline_runs (id, started_at, finished_at, status, phases, failed_phases, duration_s)
        VALUES ('${PIPELINE_RUN_ID}', '${new Date(runStart).toISOString()}', '${new Date().toISOString()}',
          '${allPassed ? 'success' : 'partial_failure'}',
          '${JSON.stringify(Object.keys(results))}',
          '${JSON.stringify(failedPhases)}',
          ${totalElapsed})
        ON CONFLICT (id) DO NOTHING`
    });
  } catch (err) {
    log(`  WARN: Could not record pipeline run: ${err.message}`);
  }

  // Show status after full run
  console.log('');
  await showStatus();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (phase === 'status') {
    await showStatus();
  } else if (phase === 'full') {
    await runFull();
  } else if (phase === 'report') {
    // Run all reporting phases
    PHASES.suggest?.();
    PHASES.reconcile?.();
    PHASES.advise?.();
  } else if (PHASES[phase]) {
    PHASES[phase]();
  } else {
    console.error(`Unknown phase: ${phase}`);
    console.error('Available: capture, match, upload, tag, suggest, reconcile, advise, status, report, full');
    process.exit(1);
  }
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
