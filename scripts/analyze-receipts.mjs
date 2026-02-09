import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== BILLS (ACCPAY) from Oct 1, 2025 ===');
const { data: bills } = await supabase
  .from('xero_invoices')
  .select('contact_name, has_attachments, date, total, status')
  .eq('type', 'ACCPAY')
  .gte('date', '2025-10-01')
  .order('date', { ascending: false });

console.log('Total bills:', bills?.length || 0);
console.log('With attachments:', bills?.filter(b => b.has_attachments).length || 0);
console.log('WITHOUT attachments:', bills?.filter(b => !b.has_attachments).length || 0);

// Bills without attachments
const billsNoReceipt = bills?.filter(b => !b.has_attachments) || [];
console.log('\n=== BILLS NEEDING RECEIPTS ===');
const byVendor = {};
billsNoReceipt.forEach(b => {
  const v = b.contact_name || 'Unknown';
  if (!byVendor[v]) byVendor[v] = { count: 0, amount: 0, dates: [] };
  byVendor[v].count++;
  byVendor[v].amount += Math.abs(b.total || 0);
  byVendor[v].dates.push(b.date);
});

Object.entries(byVendor)
  .sort((a,b) => b[1].amount - a[1].amount)
  .forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.count} bills, $${stats.amount.toFixed(2)}`);
    console.log(`    Dates: ${stats.dates.join(', ')}`);
  });

console.log('\n=== TRANSACTIONS (Spend Money) from Oct 1, 2025 ===');
const { data: txns } = await supabase
  .from('xero_transactions')
  .select('contact_name, has_attachments, date, total, type')
  .gte('date', '2025-10-01')
  .order('date', { ascending: false });

const spendTxns = txns?.filter(t => t.type === 'SPEND' || t.type === 'SPEND MONEY') || [];
console.log('Total spend transactions:', spendTxns.length);
console.log('With attachments:', spendTxns.filter(t => t.has_attachments).length);
console.log('WITHOUT attachments:', spendTxns.filter(t => !t.has_attachments).length);

// Show transactions without attachments
const txnsNoReceipt = spendTxns.filter(t => !t.has_attachments);
console.log('\n=== SPEND TRANSACTIONS NEEDING RECEIPTS ===');
const txnByVendor = {};
txnsNoReceipt.forEach(t => {
  const v = t.contact_name || 'Unknown';
  if (!txnByVendor[v]) txnByVendor[v] = { count: 0, amount: 0 };
  txnByVendor[v].count++;
  txnByVendor[v].amount += Math.abs(t.total || 0);
});

Object.entries(txnByVendor)
  .sort((a,b) => b[1].amount - a[1].amount)
  .slice(0, 20)
  .forEach(([name, stats]) => {
    console.log(`  ${name}: ${stats.count} txns, $${stats.amount.toFixed(2)}`);
  });

console.log('\n=== COMPARE TO RECEIPT_MATCHES ===');
const { data: pending } = await supabase
  .from('receipt_matches')
  .select('vendor_name, amount, transaction_date')
  .gte('transaction_date', '2025-10-01')
  .in('status', ['pending', 'email_suggested']);

console.log('Current pending in receipt_matches:', pending?.length || 0);

// What's missing?
const pendingVendors = new Set(pending?.map(p => p.vendor_name.toLowerCase()) || []);
const actualMissing = [...new Set([...billsNoReceipt, ...txnsNoReceipt].map(x => x.contact_name))];
const notInQueue = actualMissing.filter(v => !pendingVendors.has((v || '').toLowerCase()));
console.log('\nVendors with missing receipts NOT in pending queue:');
notInQueue.forEach(v => console.log('  - ' + v));
