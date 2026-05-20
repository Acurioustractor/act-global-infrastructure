#!/usr/bin/env node
/**
 * finance-tagging-status.mjs — coverage + gap report for finance tagging.
 *
 * Consolidates the SQL audit that was being run manually each session into
 * a single script that produces:
 *   - Coverage % for ACCREC, ACCPAY, NAB Visa, ACT Everyday
 *   - Untagged-row counts + total amount
 *   - NM Personal stray rows (should be 0 per two-account rule)
 *   - Vendor breakdown of top untagged rows with suggested project codes
 *
 * Output: console summary + JSON file at thoughts/shared/reports/tagging-status-YYYY-MM-DD.json
 *
 * Usage:
 *   node scripts/finance-tagging-status.mjs           # console + JSON
 *   node scripts/finance-tagging-status.mjs --quiet   # JSON only
 *   node scripts/finance-tagging-status.mjs --telegram # also post summary to Telegram
 *
 * Created 2026-05-21 (S3 in finance-system-review-2026-05-21.md).
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ACT_BANK_ACCOUNTS, EXCLUDED_BANK_ACCOUNTS } from './lib/tagging-guard.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const POST_TELEGRAM = args.includes('--telegram');

const today = new Date().toISOString().slice(0, 10);

function log(msg) { if (!QUIET) console.log(msg); }
function fmtAud(n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

async function getInvoiceCoverage() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT
        type,
        CASE WHEN project_code IS NULL OR project_code = '' THEN 'untagged' ELSE 'tagged' END as state,
        count(*) as rows,
        round(sum(total)::numeric, 0) as total_amount
      FROM xero_invoices
      WHERE type IN ('ACCREC','ACCPAY')
      GROUP BY 1,2
    `
  });
  if (error) throw new Error(`Invoice coverage query failed: ${error.message}`);
  const out = { ACCREC: { tagged: 0, untagged: 0, taggedAmount: 0, untaggedAmount: 0 },
                ACCPAY: { tagged: 0, untagged: 0, taggedAmount: 0, untaggedAmount: 0 } };
  for (const row of data || []) {
    if (!out[row.type]) continue;
    out[row.type][row.state] = Number(row.rows);
    out[row.type][`${row.state}Amount`] = Number(row.total_amount || 0);
  }
  for (const t of ['ACCREC','ACCPAY']) {
    const totalRows = out[t].tagged + out[t].untagged;
    out[t].rowCoveragePct = totalRows > 0 ? Math.round(1000 * out[t].tagged / totalRows) / 10 : null;
    const totalAmt = out[t].taggedAmount + out[t].untaggedAmount;
    out[t].amountCoveragePct = totalAmt > 0 ? Math.round(1000 * out[t].taggedAmount / totalAmt) / 10 : null;
  }
  return out;
}

async function getTransactionCoverage() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT
        bank_account,
        CASE WHEN project_code IS NULL OR project_code = '' THEN 'untagged' ELSE 'tagged' END as state,
        count(*) as rows,
        round(sum(total)::numeric, 0) as total_amount
      FROM xero_transactions
      WHERE bank_account IS NOT NULL
        AND date >= '2026-01-01'
      GROUP BY 1, 2
    `
  });
  if (error) throw new Error(`Transaction coverage query failed: ${error.message}`);
  const byAccount = {};
  for (const row of data || []) {
    const acct = row.bank_account;
    if (!byAccount[acct]) byAccount[acct] = { tagged: 0, untagged: 0, taggedAmount: 0, untaggedAmount: 0 };
    byAccount[acct][row.state] = Number(row.rows);
    byAccount[acct][`${row.state}Amount`] = Number(row.total_amount || 0);
  }
  for (const acct of Object.keys(byAccount)) {
    const totalRows = byAccount[acct].tagged + byAccount[acct].untagged;
    byAccount[acct].rowCoveragePct = totalRows > 0 ? Math.round(1000 * byAccount[acct].tagged / totalRows) / 10 : null;
    byAccount[acct].isActAccount = ACT_BANK_ACCOUNTS.includes(acct);
    byAccount[acct].isExcluded = EXCLUDED_BANK_ACCOUNTS.includes(acct);
  }
  return byAccount;
}

async function getStrayTaggedExcludedRows() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT
        bank_account,
        project_code_source,
        count(*) as rows,
        round(sum(total)::numeric, 0) as total_amount
      FROM xero_transactions
      WHERE bank_account IN (${EXCLUDED_BANK_ACCOUNTS.map(a => `'${a.replace(/'/g, "''")}'`).join(',')})
        AND project_code IS NOT NULL
        AND project_code != ''
      GROUP BY 1, 2
      ORDER BY rows DESC
    `
  });
  if (error) throw new Error(`Stray rows query failed: ${error.message}`);
  return (data || []).map(r => ({
    bankAccount: r.bank_account,
    source: r.project_code_source,
    rows: Number(r.rows),
    totalAmount: Number(r.total_amount || 0),
  }));
}

async function getTopUntaggedVendors() {
  const { data, error } = await sb.rpc('exec_sql', {
    query: `
      SELECT
        i.contact_name,
        count(*) as rows,
        round(sum(i.total)::numeric, 0) as total_amount,
        (SELECT v.project_code FROM vendor_project_rules v
          WHERE lower(v.vendor_name) = lower(i.contact_name) LIMIT 1) as suggested_project
      FROM xero_invoices i
      WHERE i.type = 'ACCPAY'
        AND (i.project_code IS NULL OR i.project_code = '')
      GROUP BY i.contact_name
      ORDER BY total_amount DESC NULLS LAST
      LIMIT 20
    `
  });
  if (error) throw new Error(`Top vendors query failed: ${error.message}`);
  return (data || []).map(r => ({
    vendor: r.contact_name,
    rows: Number(r.rows),
    totalAmount: Number(r.total_amount || 0),
    suggestedProject: r.suggested_project,
  }));
}

async function main() {
  log(`\n=========================================`);
  log(`  Finance Tagging Status — ${today}`);
  log(`=========================================\n`);

  const [invoiceCov, txnCov, strayRows, topUntagged] = await Promise.all([
    getInvoiceCoverage(),
    getTransactionCoverage(),
    getStrayTaggedExcludedRows(),
    getTopUntaggedVendors(),
  ]);

  // Console output
  log('Invoice coverage (project_code presence):');
  log(`  ACCREC (incoming): ${invoiceCov.ACCREC.tagged}/${invoiceCov.ACCREC.tagged + invoiceCov.ACCREC.untagged} rows = ${invoiceCov.ACCREC.rowCoveragePct}% · ${fmtAud(invoiceCov.ACCREC.taggedAmount)} tagged / ${fmtAud(invoiceCov.ACCREC.untaggedAmount)} untagged`);
  log(`  ACCPAY (outgoing): ${invoiceCov.ACCPAY.tagged}/${invoiceCov.ACCPAY.tagged + invoiceCov.ACCPAY.untagged} rows = ${invoiceCov.ACCPAY.rowCoveragePct}% · ${fmtAud(invoiceCov.ACCPAY.taggedAmount)} tagged / ${fmtAud(invoiceCov.ACCPAY.untaggedAmount)} untagged`);

  log('\nTransaction coverage (CY2026, ACT accounts only):');
  for (const acct of ACT_BANK_ACCOUNTS) {
    if (txnCov[acct]) {
      const c = txnCov[acct];
      log(`  ${acct}: ${c.tagged}/${c.tagged + c.untagged} = ${c.rowCoveragePct}% · ${fmtAud(c.taggedAmount)} tagged`);
    }
  }

  log('\nExcluded-account stray-tagged rows (should be 0):');
  if (strayRows.length === 0) {
    log('  ✓ clean — no excluded-account rows tagged to ACT projects');
  } else {
    for (const s of strayRows) {
      log(`  ⚠ ${s.bankAccount} · source=${s.source} · ${s.rows} rows · ${fmtAud(s.totalAmount)}`);
    }
  }

  log('\nTop 10 untagged ACCPAY vendors:');
  for (const v of topUntagged.slice(0, 10)) {
    const suggest = v.suggestedProject ? `→ ${v.suggestedProject}` : '(no rule)';
    log(`  ${v.vendor.padEnd(45).slice(0, 45)} ${String(v.rows).padStart(3)} rows · ${fmtAud(v.totalAmount).padStart(8)} ${suggest}`);
  }

  // Write JSON report
  const report = {
    generated_at: new Date().toISOString(),
    date: today,
    invoice_coverage: invoiceCov,
    transaction_coverage: txnCov,
    excluded_account_stray_rows: strayRows,
    top_untagged_vendors: topUntagged,
    summary: {
      accrec_coverage_pct: invoiceCov.ACCREC.rowCoveragePct,
      accpay_coverage_pct: invoiceCov.ACCPAY.rowCoveragePct,
      nab_visa_coverage_pct: txnCov[ACT_BANK_ACCOUNTS[0]]?.rowCoveragePct || null,
      act_everyday_coverage_pct: txnCov[ACT_BANK_ACCOUNTS[1]]?.rowCoveragePct || null,
      stray_row_count: strayRows.reduce((s, r) => s + r.rows, 0),
      stray_amount: strayRows.reduce((s, r) => s + r.totalAmount, 0),
      auto_taggable_untagged: topUntagged.filter(v => v.suggestedProject).reduce((s, v) => s + v.rows, 0),
    },
  };

  const reportDir = join(process.cwd(), 'thoughts/shared/data/tagging-status');
  try { mkdirSync(reportDir, { recursive: true }); } catch {}
  const reportPath = join(reportDir, `${today}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\nReport saved: ${reportPath}`);

  // Optional Telegram push
  if (POST_TELEGRAM) {
    try {
      const { sendTelegram } = await import('./lib/telegram.mjs');
      const msg = [
        `📊 Tagging status ${today}`,
        ``,
        `ACCREC: ${invoiceCov.ACCREC.rowCoveragePct}% · ACCPAY: ${invoiceCov.ACCPAY.rowCoveragePct}%`,
        `NAB Visa: ${txnCov[ACT_BANK_ACCOUNTS[0]]?.rowCoveragePct ?? '—'}% · ACT Everyday: ${txnCov[ACT_BANK_ACCOUNTS[1]]?.rowCoveragePct ?? '—'}%`,
        ``,
        `Stray (excluded-acct tagged): ${report.summary.stray_row_count} rows · ${fmtAud(report.summary.stray_amount)}`,
        `Auto-taggable untagged: ${report.summary.auto_taggable_untagged} rows`,
      ].join('\n');
      await sendTelegram(msg);
      log('\n✓ Posted summary to Telegram');
    } catch (err) {
      log(`\n⚠ Telegram post failed: ${err.message}`);
    }
  }

  log('');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
