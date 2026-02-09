import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== VERIFYING PENDING RECEIPTS ===\n');

// Get all pending receipt_matches
const { data: pending } = await supabase
  .from('receipt_matches')
  .select('id, source_id, vendor_name, amount, transaction_date')
  .gte('transaction_date', '2025-10-01')
  .in('status', ['pending', 'email_suggested']);

console.log('Pending receipt matches:', pending?.length || 0);

// Get the corresponding xero_transactions to check has_attachments
const sourceIds = pending.map(p => p.source_id);

// Fetch in batches (Supabase doesn't like huge IN clauses)
const batchSize = 100;
let allTxns = [];
for (let i = 0; i < sourceIds.length; i += batchSize) {
  const batch = sourceIds.slice(i, i + batchSize);
  const { data: txns } = await supabase
    .from('xero_transactions')
    .select('xero_transaction_id, has_attachments, contact_name')
    .in('xero_transaction_id', batch);
  allTxns = allTxns.concat(txns || []);
}

// Create lookup
const txnLookup = {};
allTxns.forEach(t => {
  txnLookup[t.xero_transaction_id] = t;
});

// Find any pending items that ACTUALLY have attachments
const actuallyHaveReceipts = [];
const stillPending = [];

for (const item of pending) {
  const txn = txnLookup[item.source_id];
  if (txn?.has_attachments) {
    actuallyHaveReceipts.push(item);
  } else {
    stillPending.push(item);
  }
}

console.log('\nItems that actually have attachments (will resolve):', actuallyHaveReceipts.length);
actuallyHaveReceipts.slice(0, 10).forEach(r => console.log('  -', r.vendor_name, '$' + r.amount));

console.log('\nItems truly pending (no attachments):', stillPending.length);

// Resolve the ones that actually have receipts
if (actuallyHaveReceipts.length > 0) {
  const ids = actuallyHaveReceipts.map(r => r.id);
  const { error } = await supabase
    .from('receipt_matches')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'has_attachment_in_xero'
    })
    .in('id', ids);

  if (error) {
    console.error('Error resolving:', error.message);
  } else {
    console.log('\n✓ Resolved', ids.length, 'items that have attachments in Xero');
  }
}

// Show summary of what's truly pending
console.log('\n=== TRULY PENDING RECEIPTS ===');
const byVendor = {};
stillPending.forEach(p => {
  byVendor[p.vendor_name] = (byVendor[p.vendor_name] || 0) + 1;
});

console.log('\nBy vendor:');
Object.entries(byVendor)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([v, c]) => console.log('  ' + v + ': ' + c));

const { count } = await supabase
  .from('receipt_matches')
  .select('*', { count: 'exact', head: true })
  .gte('transaction_date', '2025-10-01')
  .in('status', ['pending', 'email_suggested']);

console.log('\n=== FINAL ===');
console.log('Pending (Oct 1+):', count);
