#!/usr/bin/env node

/**
 * ACT Finance Engine — Unified Orchestrator
 *
 * Single entry point for all finance operations.
 *
 * Usage:
 *   node scripts/finance-engine.mjs                    # Full pipeline
 *   node scripts/finance-engine.mjs capture            # Capture receipts from Gmail
 *   node scripts/finance-engine.mjs match              # Match receipts to Xero
 *   node scripts/finance-engine.mjs upload             # Upload to Xero
 *   node scripts/finance-engine.mjs tag                # Tag transactions with projects
 *   node scripts/finance-engine.mjs reconcile          # Generate reconciliation checklist
 *   node scripts/finance-engine.mjs advise             # Run financial advisor
 *   node scripts/finance-engine.mjs status             # Pipeline health
 *   node scripts/finance-engine.mjs --self-test        # Run all tests
 *   node scripts/finance-engine.mjs health             # Full system health check
 */

import '../lib/load-env.mjs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptsDir = __dirname;

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-')) || 'full';
const isSelfTest = args.includes('--self-test');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// SELF-TEST: Run all test suites and report
// ============================================================================

async function selfTest() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         ACT Finance Engine — Self-Test                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const testFiles = [
    'scripts/tests/receipt-matcher.test.mjs',
    'scripts/tests/receipt-classifier.test.mjs',
    'scripts/tests/finance-integration.test.mjs',
  ];

  const results = [];
  const rootDir = join(__dirname, '..');

  for (const testFile of testFiles) {
    const label = testFile.replace('scripts/tests/', '').replace('.test.mjs', '');
    process.stdout.write(`  ${label.padEnd(30)}`);
    const startTime = Date.now();

    try {
      const output = execSync(`node --test ${testFile}`, {
        cwd: rootDir,
        timeout: 120000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Parse TAP output for pass/fail counts
      const passMatch = output.match(/# pass (\d+)/);
      const failMatch = output.match(/# fail (\d+)/);
      const pass = passMatch ? parseInt(passMatch[1]) : 0;
      const fail = failMatch ? parseInt(failMatch[1]) : 0;

      results.push({ label, pass, fail, elapsed, ok: fail === 0 });
      console.log(`✓ ${pass} passed  (${elapsed}s)`);
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const output = (err.stdout || '') + (err.stderr || '');
      const passMatch = output.match(/# pass (\d+)/);
      const failMatch = output.match(/# fail (\d+)/);
      const pass = passMatch ? parseInt(passMatch[1]) : 0;
      const fail = failMatch ? parseInt(failMatch[1]) : '?';

      results.push({ label, pass, fail, elapsed, ok: false });
      console.log(`✗ FAILED  ${pass} passed, ${fail} failed  (${elapsed}s)`);
    }
  }

  // Summary
  const totalPass = results.reduce((sum, r) => sum + r.pass, 0);
  const totalFail = results.reduce((sum, r) => sum + (typeof r.fail === 'number' ? r.fail : 1), 0);
  const allPassed = results.every(r => r.ok);

  console.log('');
  console.log('─'.repeat(60));
  console.log(`  ${allPassed ? '✓ ALL PASSED' : '✗ FAILURES DETECTED'}  ${totalPass} passed, ${totalFail} failed`);
  console.log('─'.repeat(60));
  console.log('');

  // Module health checks
  console.log('  Module health:');
  const modules = [
    ['finance/common', './lib/finance/common.mjs', ['createSupabase', 'log', 'retry', 'parseArgs']],
    ['finance/xero-client', './lib/finance/xero-client.mjs', ['createXeroClient']],
    ['finance/receipt-classifier', './lib/finance/receipt-classifier.mjs', ['isLikelyReceipt', 'extractAmount', 'extractReceiptFromHtml']],
    ['finance/capture', './lib/finance/capture.mjs', ['captureFromGmail', 'suggestFromCalendar']],
    ['finance/classify', './lib/finance/classify.mjs', ['matchReceipts', 'tagTransactions']],
    ['finance/reconcile', './lib/finance/reconcile.mjs', ['uploadToXero', 'generateChecklist']],
    ['finance/report', './lib/finance/report.mjs', ['runAdvisor', 'dailyBriefing']],
    ['finance/comply', './lib/finance/comply.mjs', ['generateRdEvidencePack', 'prepareBas', 'checkEntityReadiness']],
    ['finance/index', './lib/finance/index.mjs', ['createXeroClient', 'createSupabase', 'isLikelyReceipt', 'captureFromGmail', 'matchReceipts']],
  ];

  for (const [name, path, exports] of modules) {
    try {
      const mod = await import(join(__dirname, path));
      const missing = exports.filter(e => !mod[e]);
      if (missing.length === 0) {
        console.log(`    ${name.padEnd(30)} ✓ ${exports.length} exports`);
      } else {
        console.log(`    ${name.padEnd(30)} ✗ missing: ${missing.join(', ')}`);
      }
    } catch (err) {
      console.log(`    ${name.padEnd(30)} ✗ import failed: ${err.message}`);
    }
  }

  // Database connectivity
  console.log('');
  console.log('  Database:');
  try {
    const { createSupabase } = await import('./lib/finance/common.mjs');
    const supabase = createSupabase();

    const { data: entity } = await supabase
      .from('act_entities')
      .select('code')
      .eq('code', 'ACT-ST')
      .single();
    console.log(`    act_entities              ✓ (${entity?.code || 'found'})`);

    const { error: prError } = await supabase
      .from('pipeline_runs')
      .select('id')
      .limit(1);
    console.log(`    pipeline_runs             ${prError ? '✗ ' + prError.message : '✓'}`);

    const { data: cols } = await supabase.rpc('exec_sql', {
      query: `SELECT count(*)::int as cnt FROM information_schema.columns
        WHERE table_name IN ('xero_transactions','xero_invoices','receipt_emails')
        AND column_name = 'entity_code'`
    });
    console.log(`    entity_code columns       ✓ (${cols?.[0]?.cnt || 0}/3 tables)`);
  } catch (err) {
    console.log(`    Supabase connection       ✗ ${err.message}`);
  }

  // Xero
  console.log('');
  console.log('  Xero:');
  if (process.env.XERO_CLIENT_ID) {
    try {
      const { createXeroClient } = await import('./lib/finance/xero-client.mjs');
      const { createSupabase } = await import('./lib/finance/common.mjs');
      const xero = await createXeroClient(createSupabase());
      const token = xero.getAccessToken();
      console.log(`    OAuth2 token              ✓ (${token ? 'valid' : 'needs refresh'})`);
      const org = await xero.get('Organisation');
      console.log(`    API connectivity          ✓ (${org.Organisations?.[0]?.Name || 'connected'})`);
    } catch (err) {
      console.log(`    API connectivity          ✗ ${err.message}`);
    }
  } else {
    console.log('    OAuth2 credentials        - not configured (XERO_CLIENT_ID missing)');
  }

  // Operational health dashboard
  console.log('');
  console.log('  Operational health:');
  try {
    const { createSupabase } = await import('./lib/finance/common.mjs');
    const supabase = createSupabase();

    // Xero sync freshness
    const { data: lastSync } = await supabase
      .from('xero_transactions')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    const syncAge = lastSync?.updated_at
      ? Math.round((Date.now() - new Date(lastSync.updated_at).getTime()) / (1000 * 60 * 60))
      : null;
    const syncOk = syncAge !== null && syncAge < 24;
    console.log(`    Xero sync                 ${syncOk ? '✓' : '⚠'} ${syncAge !== null ? syncAge + 'h ago' : 'no data'}`);

    // Transaction counts
    const { count: txCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true });
    console.log(`    Transactions              ✓ ${(txCount || 0).toLocaleString()} total`);

    // Receipt matching
    const { count: withReceipts } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('has_attachments', true);
    const receiptPct = txCount ? Math.round(((withReceipts || 0) / txCount) * 100) : 0;
    console.log(`    Receipt coverage          ${receiptPct >= 60 ? '✓' : '⚠'} ${receiptPct}% (${withReceipts || 0} with attachments)`);

    // Project tagging
    const { count: taggedCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .not('project_code', 'is', null);
    const tagPct = txCount ? Math.round(((taggedCount || 0) / txCount) * 100) : 0;
    console.log(`    Project tagging           ${tagPct >= 90 ? '✓' : '⚠'} ${tagPct}% coverage`);

    // Subscriptions
    const { count: subCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active');
    console.log(`    Subscriptions             ✓ ${subCount || 0} active`);

    // BAS readiness (current quarter)
    const now = new Date();
    const qEnd = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 0);
    const daysUntilBAS = Math.ceil((new Date(qEnd.getFullYear(), qEnd.getMonth() + 1, 28) - now) / (1000 * 60 * 60 * 24));
    const basReady = tagPct >= 95 && receiptPct >= 60;
    console.log(`    BAS due                   ${basReady ? '✓' : '⚠'} ${daysUntilBAS}d — ${tagPct}% tagged, ${receiptPct}% receipted`);

    // Cash runway (from financial_snapshots)
    const { data: latestSnapshot } = await supabase
      .from('financial_snapshots')
      .select('closing_balance, expenses, income, month')
      .order('month', { ascending: false })
      .limit(6);
    if (latestSnapshot && latestSnapshot.length > 0) {
      const balance = latestSnapshot[0].closing_balance || 0;
      const avgBurn = latestSnapshot.reduce((sum, s) => sum + Math.max(0, (s.expenses || 0) - (s.income || 0)), 0) / latestSnapshot.length;
      const runway = avgBurn > 0 ? (balance / avgBurn).toFixed(1) : '∞';
      const runwayOk = parseFloat(runway) >= 6 || runway === '∞';
      console.log(`    Cash runway               ${runwayOk ? '✓' : '← ATTENTION'} ${runway} months`);
    }

    // Recent pipeline runs
    const { data: recentRuns } = await supabase
      .from('pipeline_runs')
      .select('status, finished_at, duration_s, failed_phases')
      .order('finished_at', { ascending: false })
      .limit(3);
    if (recentRuns && recentRuns.length > 0) {
      const lastRun = recentRuns[0];
      const runAge = lastRun.finished_at
        ? Math.round((Date.now() - new Date(lastRun.finished_at).getTime()) / (1000 * 60 * 60))
        : null;
      const runOk = lastRun.status === 'success';
      console.log(`    Last pipeline run         ${runOk ? '✓' : '✗'} ${lastRun.status} ${runAge !== null ? runAge + 'h ago' : ''} (${lastRun.duration_s?.toFixed(0) || '?'}s)`);
      if (!runOk && lastRun.failed_phases) {
        try {
          const failed = JSON.parse(lastRun.failed_phases);
          if (failed.length > 0) console.log(`      Failed: ${failed.join(', ')}`);
        } catch {}
      }
    }

    // Error aggregation (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentErrors } = await supabase
      .from('integration_events')
      .select('event_type')
      .eq('status', 'error')
      .gte('created_at', weekAgo);
    if (recentErrors && recentErrors.length > 0) {
      const grouped = {};
      for (const e of recentErrors) {
        grouped[e.event_type] = (grouped[e.event_type] || 0) + 1;
      }
      console.log(`    Errors (7d)               ⚠ ${recentErrors.length} total`);
      for (const [type, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
        console.log(`      ${type}: ${count}`);
      }
    } else {
      console.log(`    Errors (7d)               ✓ none`);
    }
  } catch (err) {
    console.log(`    Operational health        ✗ ${err.message}`);
  }

  console.log('');
  process.exit(allPassed ? 0 : 1);
}

// ============================================================================
// PIPELINE: Module-based orchestration
// ============================================================================

async function runPipeline(phases) {
  const { randomUUID } = await import('crypto');
  const runId = process.env.PIPELINE_RUN_ID || randomUUID();
  process.env.PIPELINE_RUN_ID = runId;

  const startTime = Date.now();
  log(`=== Finance Engine Pipeline === (run: ${runId.slice(0, 8)})`);
  log(`Phases: ${phases.join(' → ')}\n`);

  const results = {};

  for (const phase of phases) {
    log(`${'─'.repeat(50)}`);
    log(`PHASE: ${phase.toUpperCase()}`);
    log('─'.repeat(50));

    const result = await COMMANDS[phase]();
    results[phase] = result;

    if (!result.ok) {
      log(`  ✗ ${phase} failed — continuing with remaining phases`);
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const allPassed = Object.values(results).every(r => r.ok);

  log(`\n${'═'.repeat(50)}`);
  log(`PIPELINE ${allPassed ? 'COMPLETE' : 'FINISHED WITH ERRORS'} (${totalElapsed}s)`);
  log('═'.repeat(50));

  for (const [phase, result] of Object.entries(results)) {
    log(`  ${phase.padEnd(14)} ${result.ok ? '✓' : '✗ FAILED'}  (${result.elapsed?.toFixed(1) || '?'}s)`);
  }

  // Record pipeline run
  try {
    const { createSupabase } = await import('./lib/finance/common.mjs');
    const supabase = createSupabase();
    const failedPhases = Object.entries(results).filter(([, r]) => !r.ok).map(([p]) => p);
    await supabase.from('pipeline_runs').upsert({
      id: runId,
      started_at: new Date(startTime).toISOString(),
      finished_at: new Date().toISOString(),
      status: allPassed ? 'success' : 'partial_failure',
      phases: JSON.stringify(phases),
      failed_phases: JSON.stringify(failedPhases),
      duration_s: parseFloat(totalElapsed),
    }, { onConflict: 'id' });
  } catch { /* non-critical */ }

  return allPassed;
}

// ============================================================================
// COMMAND REGISTRY
// ============================================================================

const COMMANDS = {
  // Core pipeline phases
  capture: async () => {
    const { captureFromGmail } = await import('./lib/finance/capture.mjs');
    return captureFromGmail({ days: 3 });
  },
  match: async () => {
    const { matchReceipts } = await import('./lib/finance/classify.mjs');
    return matchReceipts({ apply: true, ai: true });
  },
  upload: async () => {
    const { uploadToXero } = await import('./lib/finance/reconcile.mjs');
    return uploadToXero();
  },
  tag: async () => {
    const { tagTransactions } = await import('./lib/finance/classify.mjs');
    return tagTransactions({ apply: true });
  },

  // Reporting
  suggest: async () => {
    const { suggestFromCalendar } = await import('./lib/finance/capture.mjs');
    return suggestFromCalendar();
  },
  reconcile: async () => {
    const { generateChecklist } = await import('./lib/finance/reconcile.mjs');
    return generateChecklist();
  },
  advise: async () => {
    const { runAdvisor } = await import('./lib/finance/report.mjs');
    return runAdvisor();
  },

  // Compliance
  rd: async () => {
    const { generateRdEvidencePack } = await import('./lib/finance/comply.mjs');
    return generateRdEvidencePack();
  },
  bas: async () => {
    const { prepareBas } = await import('./lib/finance/comply.mjs');
    return prepareBas();
  },
  entity: async () => {
    const { checkEntityReadiness } = await import('./lib/finance/comply.mjs');
    const result = await checkEntityReadiness();
    console.log(`\nEntities: ${result.entities.map(e => e.code).join(', ')}`);
    if (result.gaps.length) {
      console.log('Gaps:');
      result.gaps.forEach(g => console.log(`  - ${g}`));
    } else {
      console.log('No gaps — entity model is clean.');
    }
    return { ok: result.ok, output: '', elapsed: 0 };
  },
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (isSelfTest) {
    return selfTest();
  }

  if (command === 'health') {
    return selfTest();
  }

  if (command === 'full') {
    const ok = await runPipeline(['capture', 'match', 'upload', 'tag']);
    process.exit(ok ? 0 : 1);
  }

  if (command === 'report') {
    const ok = await runPipeline(['suggest', 'reconcile', 'advise']);
    process.exit(ok ? 0 : 1);
  }

  if (command === 'comply') {
    const ok = await runPipeline(['rd', 'bas', 'entity']);
    process.exit(ok ? 0 : 1);
  }

  if (command === 'all') {
    const ok = await runPipeline([
      'capture', 'match', 'upload', 'tag',
      'suggest', 'reconcile', 'advise',
      'rd', 'bas',
    ]);
    process.exit(ok ? 0 : 1);
  }

  if (command === 'status') {
    // Delegate to receipt-pipeline status for now
    execSync(`node "${join(scriptsDir, 'receipt-pipeline.mjs')}" status`, { stdio: 'inherit' });
    return;
  }

  if (COMMANDS[command]) {
    const result = await COMMANDS[command]();
    process.exit(result.ok ? 0 : 1);
  }

  console.error(`Unknown command: ${command}`);
  console.error('');
  console.error('Usage: node scripts/finance-engine.mjs <command>');
  console.error('');
  console.error('Pipeline:');
  console.error('  full         Run core pipeline (capture → match → upload → tag)');
  console.error('  report       Run reporting (suggest → reconcile → advise)');
  console.error('  comply       Run compliance (R&D → BAS → entity check)');
  console.error('  all          Run everything');
  console.error('');
  console.error('Individual:');
  console.error('  capture      Capture receipts from Gmail');
  console.error('  match        Match receipts to Xero transactions');
  console.error('  upload       Upload matched receipts to Xero');
  console.error('  tag          Tag transactions with project codes');
  console.error('  suggest      Suggest receipts from calendar events');
  console.error('  reconcile    Generate reconciliation checklist');
  console.error('  advise       Run financial advisor analysis');
  console.error('  rd           Generate R&D evidence pack');
  console.error('  bas          Prepare BAS data');
  console.error('  entity       Check entity transition readiness');
  console.error('');
  console.error('System:');
  console.error('  health       Full system health check');
  console.error('  status       Pipeline status dashboard');
  console.error('  --self-test  Run test suite + health checks');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
