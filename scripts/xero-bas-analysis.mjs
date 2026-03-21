#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let output = '';
const log = (msg) => {
  console.log(msg);
  output += msg + '\n';
};

log('🔍 ACT Xero Financial Analysis - BAS Preparation\n');
log('Generated: ' + new Date().toISOString());
log('=' .repeat(80));

const fmt = (val) => new Intl.NumberFormat('en-AU', { 
  style: 'currency', 
  currency: 'AUD',
  minimumFractionDigits: 2 
}).format(val || 0);

async function execSql(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    console.error('SQL Error:', error);
    throw error;
  }
  return data;
}

// Calculate GST from line items - INPUT = claimable GST, OUTPUT = collected GST
const gstCalc = `
  (SELECT COALESCE(SUM(
    CASE 
      WHEN li->>'tax_type' IN ('INPUT', 'OUTPUT') THEN (li->>'line_amount')::numeric * 0.1
      WHEN li->>'tax_type' IN ('INPUT2', 'OUTPUT2') THEN (li->>'line_amount')::numeric * 0.1
      WHEN li->>'tax_type' IN ('INPUTTAXED') THEN (li->>'line_amount')::numeric * 0.0909091  -- Tax inclusive
      ELSE 0 
    END
  ), 0)
  FROM jsonb_array_elements(line_items) li)
`;

const hasReceipt = `
  (has_attachments OR EXISTS (
    SELECT 1 FROM receipt_emails 
    WHERE receipt_emails.xero_transaction_id = xero_transactions.xero_transaction_id
  ))
`;

log('\n📊 Q2 FY26 (Oct-Dec 2025) SUMMARY');
log('-'.repeat(80));

const q2Summary = await execSql(`
  SELECT 
    type,
    COUNT(*) as transaction_count,
    SUM(total) as total_amount,
    SUM(${gstCalc}) as total_gst,
    SUM(CASE WHEN project_code IS NOT NULL THEN 1 ELSE 0 END) as tagged_count,
    SUM(CASE WHEN ${hasReceipt} THEN 1 ELSE 0 END) as with_receipts
  FROM xero_transactions
  WHERE date >= '2025-10-01' AND date <= '2025-12-31'
  GROUP BY type
  ORDER BY type
`);

log('\nTransaction Summary:');
q2Summary.forEach(row => {
  log(`\n${row.type}:`);
  log(`  Count: ${row.transaction_count}`);
  log(`  Total: ${fmt(row.total_amount)}`);
  log(`  GST: ${fmt(row.total_gst)}`);
  log(`  Tagged with projects: ${row.tagged_count} (${(row.tagged_count/row.transaction_count*100).toFixed(1)}%)`);
  log(`  With receipts: ${row.with_receipts} (${(row.with_receipts/row.transaction_count*100).toFixed(1)}%)`);
});

log('\n\n💰 Q2 FY26 - TOP 10 VENDORS BY SPEND');
log('-'.repeat(80));

const q2Vendors = await execSql(`
  SELECT 
    contact_name as vendor,
    COUNT(*) as transaction_count,
    SUM(total) as total_spend,
    SUM(${gstCalc}) as total_gst,
    SUM(CASE WHEN ${hasReceipt} THEN 1 ELSE 0 END) as receipts_count
  FROM xero_transactions
  WHERE date >= '2025-10-01' AND date <= '2025-12-31'
    AND type = 'SPEND'
  GROUP BY contact_name
  ORDER BY total_spend DESC
  LIMIT 10
`);

q2Vendors.forEach((v, i) => {
  log(`${i+1}. ${v.vendor}: ${fmt(v.total_spend)} (GST: ${fmt(v.total_gst)}) | ${v.transaction_count} transactions, ${v.receipts_count} with receipts`);
});

log('\n\n📊 Q3 FY26 (Jan-Mar 2026) SUMMARY (YTD)');
log('-'.repeat(80));

const q3Summary = await execSql(`
  SELECT 
    type,
    COUNT(*) as transaction_count,
    SUM(total) as total_amount,
    SUM(${gstCalc}) as total_gst,
    SUM(CASE WHEN project_code IS NOT NULL THEN 1 ELSE 0 END) as tagged_count,
    SUM(CASE WHEN ${hasReceipt} THEN 1 ELSE 0 END) as with_receipts
  FROM xero_transactions
  WHERE date >= '2026-01-01' AND date <= '2026-03-31'
  GROUP BY type
  ORDER BY type
`);

log('\nTransaction Summary:');
q3Summary.forEach(row => {
  log(`\n${row.type}:`);
  log(`  Count: ${row.transaction_count}`);
  log(`  Total: ${fmt(row.total_amount)}`);
  log(`  GST: ${fmt(row.total_gst)}`);
  log(`  Tagged with projects: ${row.tagged_count} (${(row.tagged_count/row.transaction_count*100).toFixed(1)}%)`);
  log(`  With receipts: ${row.with_receipts} (${(row.with_receipts/row.transaction_count*100).toFixed(1)}%)`);
});

log('\n\n💰 Q3 FY26 - TOP 10 VENDORS BY SPEND');
log('-'.repeat(80));

const q3Vendors = await execSql(`
  SELECT 
    contact_name as vendor,
    COUNT(*) as transaction_count,
    SUM(total) as total_spend,
    SUM(${gstCalc}) as total_gst,
    SUM(CASE WHEN ${hasReceipt} THEN 1 ELSE 0 END) as receipts_count
  FROM xero_transactions
  WHERE date >= '2026-01-01' AND date <= '2026-03-31'
    AND type = 'SPEND'
  GROUP BY contact_name
  ORDER BY total_spend DESC
  LIMIT 10
`);

q3Vendors.forEach((v, i) => {
  log(`${i+1}. ${v.vendor}: ${fmt(v.total_spend)} (GST: ${fmt(v.total_gst)}) | ${v.transaction_count} transactions, ${v.receipts_count} with receipts`);
});

log('\n\n🧾 GST ANALYSIS');
log('-'.repeat(80));

const gstAnalysis = await execSql(`
  SELECT 
    CASE 
      WHEN date >= '2025-10-01' AND date <= '2025-12-31' THEN 'Q2 FY26'
      WHEN date >= '2026-01-01' AND date <= '2026-03-31' THEN 'Q3 FY26'
    END as quarter,
    type,
    COUNT(*) as transaction_count,
    SUM(${gstCalc}) as total_gst,
    SUM(CASE WHEN NOT ${hasReceipt} THEN 1 ELSE 0 END) as missing_receipts,
    SUM(CASE WHEN NOT ${hasReceipt} THEN ${gstCalc} ELSE 0 END) as gst_at_risk
  FROM xero_transactions
  WHERE (date >= '2025-10-01' AND date <= '2025-12-31')
     OR (date >= '2026-01-01' AND date <= '2026-03-31')
  GROUP BY quarter, type
  ORDER BY quarter, type
`);

gstAnalysis.forEach(row => {
  log(`\n${row.quarter} - ${row.type}:`);
  log(`  Total GST: ${fmt(row.total_gst)}`);
  log(`  Transactions without receipts: ${row.missing_receipts}`);
  log(`  GST at risk (missing receipts): ${fmt(row.gst_at_risk)}`);
});

log('\n\n⚠️  RECEIPT COVERAGE GAPS');
log('-'.repeat(80));

const receiptGaps = await execSql(`
  SELECT 
    CASE 
      WHEN date >= '2025-10-01' AND date <= '2025-12-31' THEN 'Q2 FY26'
      WHEN date >= '2026-01-01' AND date <= '2026-03-31' THEN 'Q3 FY26'
    END as quarter,
    COUNT(*) as missing_count,
    SUM(total) as total_amount,
    SUM(${gstCalc}) as total_gst
  FROM xero_transactions
  WHERE ((date >= '2025-10-01' AND date <= '2025-12-31')
     OR (date >= '2026-01-01' AND date <= '2026-03-31'))
    AND type = 'SPEND'
    AND ABS(total) > 82.50
    AND NOT ${hasReceipt}
  GROUP BY quarter
  ORDER BY quarter
`);

log('\nTransactions > $82.50 without receipts (GST threshold):');
receiptGaps.forEach(row => {
  log(`\n${row.quarter}:`);
  log(`  Missing receipts: ${row.missing_count}`);
  log(`  Total spend: ${fmt(row.total_amount)}`);
  log(`  GST credits at risk: ${fmt(row.total_gst)}`);
});

log('\n\nR&D Project Transactions (missing receipts):');
const rdGaps = await execSql(`
  SELECT 
    project_code,
    COUNT(*) as missing_count,
    SUM(total) as total_amount,
    SUM(${gstCalc}) as total_gst
  FROM xero_transactions
  WHERE ((date >= '2025-10-01' AND date <= '2025-12-31')
     OR (date >= '2026-01-01' AND date <= '2026-03-31'))
    AND type = 'SPEND'
    AND project_code IS NOT NULL
    AND NOT ${hasReceipt}
  GROUP BY project_code
  ORDER BY total_amount DESC
  LIMIT 10
`);

if (rdGaps.length > 0) {
  rdGaps.forEach(row => {
    log(`  ${row.project_code}: ${row.missing_count} transactions, ${fmt(row.total_amount)} (GST: ${fmt(row.total_gst)})`);
  });
} else {
  log('  ✅ All R&D project transactions have receipts!');
}

log('\n\n🔍 PATTERNS & ANOMALIES');
log('-'.repeat(80));

log('\nLargest single transactions (Q2 + Q3):');
const largeTransactions = await execSql(`
  SELECT 
    date,
    contact_name,
    total,
    type,
    ${gstCalc} as gst_amount,
    ${hasReceipt} as has_receipt
  FROM xero_transactions
  WHERE ((date >= '2025-10-01' AND date <= '2025-12-31')
     OR (date >= '2026-01-01' AND date <= '2026-03-31'))
  ORDER BY ABS(total) DESC
  LIMIT 10
`);

largeTransactions.forEach((t, i) => {
  const receiptStatus = t.has_receipt ? '✅' : '❌';
  log(`${i+1}. ${t.date} - ${t.contact_name}: ${fmt(t.total)} (${t.type}) GST: ${fmt(t.gst_amount)} ${receiptStatus}`);
});

log('\n\nRecurring subscriptions (vendors appearing 2+ times):');
const recurring = await execSql(`
  SELECT 
    contact_name,
    COUNT(*) as occurrence_count,
    SUM(total) as total_spend,
    ROUND(AVG(total)::numeric, 2) as avg_amount
  FROM xero_transactions
  WHERE ((date >= '2025-10-01' AND date <= '2025-12-31')
     OR (date >= '2026-01-01' AND date <= '2026-03-31'))
    AND type = 'SPEND'
  GROUP BY contact_name
  HAVING COUNT(*) >= 2
  ORDER BY occurrence_count DESC, total_spend DESC
  LIMIT 15
`);

recurring.forEach((r, i) => {
  log(`${i+1}. ${r.contact_name}: ${r.occurrence_count}× payments, ${fmt(r.total_spend)} total (avg ${fmt(r.avg_amount)})`);
});

log('\n\nNew vendors (first transaction in Q2/Q3 FY26):');
const newVendors = await execSql(`
  WITH vendor_first_date AS (
    SELECT contact_name, MIN(date) as first_date
    FROM xero_transactions
    WHERE type = 'SPEND'
    GROUP BY contact_name
  )
  SELECT 
    t.contact_name,
    vfd.first_date,
    COUNT(*) as transaction_count,
    SUM(t.total) as total_spend
  FROM xero_transactions t
  JOIN vendor_first_date vfd ON t.contact_name = vfd.contact_name
  WHERE vfd.first_date >= '2025-10-01'
    AND vfd.first_date <= '2026-03-31'
    AND t.type = 'SPEND'
  GROUP BY t.contact_name, vfd.first_date
  ORDER BY total_spend DESC
  LIMIT 10
`);

newVendors.forEach((v, i) => {
  log(`${i+1}. ${v.contact_name} (first: ${v.first_date}): ${fmt(v.total_spend)} (${v.transaction_count} transactions)`);
});

log('\n\n📄 INVOICES ANALYSIS');
log('-'.repeat(80));

log('\nOutstanding Receivables (ACCREC):');
const receivables = await execSql(`
  SELECT 
    status,
    COUNT(*) as invoice_count,
    SUM(total) as total_amount,
    SUM(total_tax) as total_gst,
    SUM(amount_due) as amount_outstanding
  FROM xero_invoices
  WHERE type = 'ACCREC'
    AND status != 'PAID'
  GROUP BY status
  ORDER BY status
`);

if (receivables.length > 0) {
  receivables.forEach(r => {
    log(`  ${r.status}: ${r.invoice_count} invoices, ${fmt(r.total_amount)} total (GST: ${fmt(r.total_gst)}), ${fmt(r.amount_outstanding)} outstanding`);
  });
  
  const overdueReceivables = await execSql(`
    SELECT 
      contact_name,
      invoice_number,
      date,
      due_date,
      total,
      amount_due,
      CURRENT_DATE - due_date as days_overdue
    FROM xero_invoices
    WHERE type = 'ACCREC'
      AND status IN ('AUTHORISED', 'SUBMITTED')
      AND due_date < CURRENT_DATE
    ORDER BY due_date ASC
    LIMIT 10
  `);
  
  if (overdueReceivables.length > 0) {
    log('\n  ⚠️  Overdue receivables:');
    overdueReceivables.forEach(inv => {
      log(`    ${inv.contact_name} - #${inv.invoice_number}: ${fmt(inv.amount_due)} (${inv.days_overdue} days overdue, due ${inv.due_date})`);
    });
  }
} else {
  log('  ✅ No outstanding receivables');
}

log('\n\nOutstanding Payables (ACCPAY):');
const payables = await execSql(`
  SELECT 
    status,
    COUNT(*) as invoice_count,
    SUM(total) as total_amount,
    SUM(total_tax) as total_gst,
    SUM(amount_due) as amount_outstanding
  FROM xero_invoices
  WHERE type = 'ACCPAY'
    AND status != 'PAID'
  GROUP BY status
  ORDER BY status
`);

if (payables.length > 0) {
  payables.forEach(p => {
    log(`  ${p.status}: ${p.invoice_count} invoices, ${fmt(p.total_amount)} total (GST: ${fmt(p.total_gst)}), ${fmt(p.amount_outstanding)} outstanding`);
  });
  
  const overduePayables = await execSql(`
    SELECT 
      contact_name,
      invoice_number,
      date,
      due_date,
      total,
      amount_due,
      CURRENT_DATE - due_date as days_overdue
    FROM xero_invoices
    WHERE type = 'ACCPAY'
      AND status IN ('AUTHORISED', 'SUBMITTED')
      AND due_date < CURRENT_DATE
    ORDER BY due_date ASC
    LIMIT 10
  `);
  
  if (overduePayables.length > 0) {
    log('\n  ⚠️  Overdue payables:');
    overduePayables.forEach(inv => {
      log(`    ${inv.contact_name} - #${inv.invoice_number}: ${fmt(inv.amount_due)} (${inv.days_overdue} days overdue, due ${inv.due_date})`);
    });
  }
} else {
  log('  ✅ No outstanding payables');
}

log('\n' + '='.repeat(80));
log('✅ Analysis complete\n');

// Save to file
const reportPath = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports/xero-bas-analysis-2026-03-17.md';
fs.mkdirSync('/Users/benknight/Code/act-global-infrastructure/thoughts/shared/reports', { recursive: true });
fs.writeFileSync(reportPath, output);
console.log(`\n📄 Report saved to: ${reportPath}`);
