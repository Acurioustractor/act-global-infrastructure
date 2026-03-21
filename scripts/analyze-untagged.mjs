#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Sample untagged transactions
const { data: untagged } = await sb.from('xero_transactions')
  .select('contact_name, total, date, type, bank_account, is_reconciled')
  .is('project_code', null)
  .order('date', { ascending: false })
  .limit(40);

console.log('=== SAMPLE UNTAGGED TRANSACTIONS (newest 40) ===');
for (const tx of untagged || []) {
  console.log(`  ${tx.date} | ${(tx.contact_name||'NO CONTACT').padEnd(40)} | $${(tx.total||0).toFixed(2).padStart(10)} | ${(tx.type||'').padEnd(8)} | recon:${tx.is_reconciled}`);
}

// Frequency of untagged by vendor
const { data: freq } = await sb.rpc('exec_sql', {
  query: `SELECT contact_name, COUNT(*) as cnt, SUM(ABS(total)) as total_amount
          FROM xero_transactions
          WHERE project_code IS NULL
          GROUP BY contact_name
          ORDER BY cnt DESC
          LIMIT 30`
});
console.log('\n=== TOP UNTAGGED VENDORS (by frequency) ===');
for (const r of freq || []) {
  console.log(`  ${String(r.cnt).padStart(4)}x | $${Number(r.total_amount).toFixed(0).padStart(10)} | ${r.contact_name || 'NULL CONTACT'}`);
}

// Untagged invoices
const { data: invFreq } = await sb.rpc('exec_sql', {
  query: `SELECT contact_name, COUNT(*) as cnt, SUM(ABS(total)) as total_amount
          FROM xero_invoices
          WHERE project_code IS NULL
          GROUP BY contact_name
          ORDER BY cnt DESC
          LIMIT 15`
});
console.log('\n=== TOP UNTAGGED INVOICE CONTACTS ===');
for (const r of invFreq || []) {
  console.log(`  ${String(r.cnt).padStart(4)}x | $${Number(r.total_amount).toFixed(0).padStart(10)} | ${r.contact_name || 'NULL CONTACT'}`);
}

// Check existing rules
const { count } = await sb.from('vendor_project_rules').select('*', { count: 'exact', head: true });
console.log(`\nVendor project rules in DB: ${count}`);

const { data: allRules } = await sb.from('vendor_project_rules').select('vendor_name, aliases, project_code');
const ruleNames = new Set();
for (const r of allRules || []) {
  ruleNames.add(r.vendor_name.toLowerCase());
  for (const a of r.aliases || []) ruleNames.add(a.toLowerCase());
}

// Find vendor names NOT covered by rules
const allUntaggedNames = (freq || []).map(r => r.contact_name).filter(Boolean);
const missing = allUntaggedNames.filter(n => {
  const lower = n.toLowerCase();
  for (const rule of ruleNames) {
    if (lower.includes(rule) || rule.includes(lower)) return false;
  }
  return true;
});
console.log(`\nUntagged vendors with NO matching rule (${missing.length}):`);
for (const n of missing) {
  const row = freq.find(r => r.contact_name === n);
  console.log(`  ${String(row.cnt).padStart(4)}x | $${Number(row.total_amount).toFixed(0).padStart(10)} | ${n}`);
}

// Reconciliation status of untagged
const { data: reconStats } = await sb.rpc('exec_sql', {
  query: `SELECT is_reconciled, COUNT(*) as cnt
          FROM xero_transactions
          WHERE project_code IS NULL
          GROUP BY is_reconciled`
});
console.log('\n=== RECONCILIATION STATUS OF UNTAGGED ===');
for (const r of reconStats || []) {
  console.log(`  is_reconciled=${r.is_reconciled}: ${r.cnt}`);
}

// Date range of untagged
const { data: dateRange } = await sb.rpc('exec_sql', {
  query: `SELECT MIN(date) as earliest, MAX(date) as latest FROM xero_transactions WHERE project_code IS NULL`
});
console.log('\n=== DATE RANGE OF UNTAGGED ===');
for (const r of dateRange || []) {
  console.log(`  ${r.earliest} to ${r.latest}`);
}

// Check Xero tracking on untagged
const { data: withTracking } = await sb.rpc('exec_sql', {
  query: `SELECT COUNT(*) as cnt FROM xero_transactions WHERE project_code IS NULL AND line_items::text LIKE '%Tracking%'`
});
console.log('\n=== UNTAGGED WITH XERO TRACKING CODES ===');
console.log(`  ${withTracking?.[0]?.cnt || 0} transactions have Tracking in line_items`);

// Check type breakdown of untagged
const { data: typeBreak } = await sb.rpc('exec_sql', {
  query: `SELECT type, COUNT(*) as cnt, SUM(ABS(total)) as total FROM xero_transactions WHERE project_code IS NULL GROUP BY type ORDER BY cnt DESC`
});
console.log('\n=== UNTAGGED BY TYPE ===');
for (const r of typeBreak || []) {
  console.log(`  ${(r.type||'NULL').padEnd(15)} ${String(r.cnt).padStart(5)} txns | $${Number(r.total).toFixed(0).padStart(10)}`);
}
