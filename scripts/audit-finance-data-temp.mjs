#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../apps/command-center/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 FINANCE DATA AUDIT\n' + '='.repeat(80) + '\n');

// 1. Subscriptions audit
console.log('📦 SUBSCRIPTIONS TABLE');
console.log('-'.repeat(80));

const { data: subs, error: subsError } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('account_status', 'active')
  .order('amount', { ascending: false });

if (subsError) {
  console.error('Subscriptions error:', subsError.message);
} else if (subs) {
  console.log(`Total active subscriptions: ${subs.length}`);
  
  const withProjects = subs.filter(s => s.project_codes && s.project_codes.length > 0);
  const withoutProjects = subs.filter(s => !s.project_codes || s.project_codes.length === 0);
  
  console.log(`✅ With project_codes: ${withProjects.length} (${Math.round(withProjects.length / subs.length * 100)}%)`);
  console.log(`❌ Without project_codes: ${withoutProjects.length} (${Math.round(withoutProjects.length / subs.length * 100)}%)\n`);
  
  console.log('Top 10 by cost:');
  subs.slice(0, 10).forEach((s, i) => {
    const projects = s.project_codes?.join(', ') || 'NONE';
    const vendor = s.vendor_name || s.provider || 'Unknown';
    const amount = s.amount || s.cost_per_cycle || 0;
    const cycle = s.billing_cycle || 'unknown';
    console.log(`${(i+1).toString().padStart(2)}. ${vendor.padEnd(20)} $${amount.toString().padStart(8)} ${cycle.padEnd(10)} [${projects}]`);
  });
  
  if (withoutProjects.length > 0) {
    console.log('\n⚠️  Subscriptions missing project codes:');
    withoutProjects.slice(0, 20).forEach(s => {
      const vendor = s.vendor_name || s.provider || 'Unknown';
      const cat = s.category || 'unknown';
      console.log(`   - ${vendor} (${cat})`);
    });
    if (withoutProjects.length > 20) {
      console.log(`   ... and ${withoutProjects.length - 20} more`);
    }
  }
}

// 2. Xero transactions audit
console.log('\n\n💳 XERO_TRANSACTIONS TABLE');
console.log('-'.repeat(80));

const { count: totalTxns, error: txnCountError } = await supabase
  .from('xero_transactions')
  .select('*', { count: 'exact', head: true });

const { count: taggedTxns, error: taggedError } = await supabase
  .from('xero_transactions')
  .select('*', { count: 'exact', head: true })
  .not('project_code', 'is', null)
  .neq('project_code', '');

if (!txnCountError && !taggedError) {
  const percentTagged = totalTxns > 0 ? Math.round(taggedTxns / totalTxns * 100) : 0;
  console.log(`Total transactions: ${totalTxns}`);
  console.log(`✅ With project_code: ${taggedTxns} (${percentTagged}%)`);
  console.log(`❌ Without project_code: ${totalTxns - taggedTxns} (${100 - percentTagged}%)\n`);
}

// Top untagged contacts
const { data: untaggedContacts, error: untaggedError2 } = await supabase
  .from('xero_transactions')
  .select('contact_name')
  .or('project_code.is.null,project_code.eq.')
  .order('date', { ascending: false });

if (!untaggedError2 && untaggedContacts) {
  const contactCounts = {};
  untaggedContacts.forEach(t => {
    const name = t.contact_name || 'Unknown';
    contactCounts[name] = (contactCounts[name] || 0) + 1;
  });
  
  const sorted = Object.entries(contactCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('Top 20 untagged contacts by transaction count:');
  sorted.forEach(([name, count], i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${name.padEnd(40)} ${count.toString().padStart(4)} txns`);
  });
}

// 3. Xero invoices audit
console.log('\n\n📄 XERO_INVOICES TABLE');
console.log('-'.repeat(80));

const { count: totalInv, error: invCountError } = await supabase
  .from('xero_invoices')
  .select('*', { count: 'exact', head: true });

const { count: taggedInv, error: taggedInvError } = await supabase
  .from('xero_invoices')
  .select('*', { count: 'exact', head: true })
  .not('project_code', 'is', null)
  .neq('project_code', '');

if (!invCountError && !taggedInvError) {
  const percentTagged = totalInv > 0 ? Math.round(taggedInv / totalInv * 100) : 0;
  console.log(`Total invoices: ${totalInv}`);
  console.log(`✅ With project_code: ${taggedInv} (${percentTagged}%)`);
  console.log(`❌ Without project_code: ${totalInv - taggedInv} (${100 - percentTagged}%)`);
}

// 4. Financial snapshots audit
console.log('\n\n💰 FINANCIAL_SNAPSHOTS TABLE');
console.log('-'.repeat(80));

const { data: snapshots, error: snapError } = await supabase
  .from('financial_snapshots')
  .select('*')
  .eq('is_projection', false)
  .order('month', { ascending: false })
  .limit(5);

if (snapError) {
  console.error('Error:', snapError);
} else if (!snapshots || snapshots.length === 0) {
  console.log('⚠️  No financial snapshots found');
} else {
  console.log(`Recent snapshots: ${snapshots.length}`);
  console.log('\nStructure check:');
  const sample = snapshots[0];
  console.log(`  - Has month: ${!!sample.month}`);
  console.log(`  - Has income: ${!!sample.income}`);
  console.log(`  - Has expenses: ${!!sample.expenses}`);
  console.log(`  - Has income_breakdown: ${!!sample.income_breakdown}`);
  console.log(`  - Has expense_breakdown: ${!!sample.expense_breakdown}`);
  
  const incomeBreakdownStr = JSON.stringify(sample.income_breakdown || {});
  const expenseBreakdownStr = JSON.stringify(sample.expense_breakdown || {});
  const hasProjectCodes = incomeBreakdownStr.includes('ACT-') || expenseBreakdownStr.includes('ACT-');
  
  console.log(`  - Has project-level breakdowns: ${hasProjectCodes}`);
  
  console.log('\nLatest snapshot:');
  console.log(`  Month: ${sample.month}`);
  console.log(`  Income: $${sample.income}`);
  console.log(`  Expenses: $${sample.expenses}`);
  console.log(`  Net: $${sample.net || (sample.income - sample.expenses)}`);
  
  if (sample.income_breakdown && Object.keys(sample.income_breakdown).length > 0) {
    const sources = Object.keys(sample.income_breakdown);
    console.log(`\n  Income sources (${sources.length}): ${sources.slice(0, 5).join(', ')}${sources.length > 5 ? '...' : ''}`);
  } else {
    console.log('\n  ⚠️  Income breakdown is empty');
  }
  
  if (sample.expense_breakdown && Object.keys(sample.expense_breakdown).length > 0) {
    const vendors = Object.keys(sample.expense_breakdown);
    console.log(`  Expense vendors (${vendors.length}): ${vendors.slice(0, 5).join(', ')}${vendors.length > 5 ? '...' : ''}`);
  } else {
    console.log('  ⚠️  Expense breakdown is empty');
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Audit complete\n');
