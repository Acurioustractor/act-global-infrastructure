import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vendors that actually don't need receipts (bank fees, internal transfers)
const SKIP_VENDORS = [
  'nab fee', 'nab international fee', 'bank fee', 'eftpos fee', 'interest',
  'atm fee', 'account fee', 'monthly fee', 'service fee',
  'nicholas marchesi', 'nicholas',  // Internal transfers
  '2up spending',       // Internal account
  'gopayid', 'nab',     // Payment platform fees
];

function shouldSkip(vendorName) {
  if (!vendorName) return false;
  const v = vendorName.toLowerCase().trim();
  return SKIP_VENDORS.some(s => v.includes(s) || v === s);
}

console.log('=== REVERTING INCORRECT RESOLUTIONS ===\n');

// Get items incorrectly resolved as "bill_has_receipt"
const { data: incorrect } = await supabase
  .from('receipt_matches')
  .select('id, vendor_name, amount, transaction_date')
  .eq('resolved_by', 'bill_has_receipt')
  .gte('transaction_date', '2025-10-01');

console.log('Found', incorrect?.length || 0, 'items marked as bill_has_receipt');

// Filter: some should stay resolved (if vendor is a skip vendor), others should revert
const toRevert = [];
const keepResolved = [];

for (const item of (incorrect || [])) {
  if (shouldSkip(item.vendor_name)) {
    keepResolved.push(item);
  } else {
    toRevert.push(item);
  }
}

console.log('\nKeeping resolved (actually skip vendors):', keepResolved.length);
keepResolved.slice(0, 5).forEach(k => console.log('  -', k.vendor_name));

console.log('\nReverting to pending:', toRevert.length);
const byVendor = {};
toRevert.forEach(t => {
  byVendor[t.vendor_name] = (byVendor[t.vendor_name] || 0) + 1;
});
Object.entries(byVendor).sort((a,b) => b[1] - a[1]).slice(0, 15).forEach(([v, c]) => {
  console.log('  -', v + ':', c);
});

// Revert to pending
if (toRevert.length > 0) {
  const ids = toRevert.map(t => t.id);

  // Batch update
  const batchSize = 100;
  let updated = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error } = await supabase
      .from('receipt_matches')
      .update({
        status: 'pending',
        resolved_at: null,
        resolved_by: null
      })
      .in('id', batch);

    if (error) {
      console.error('Error updating batch:', error.message);
    } else {
      updated += batch.length;
    }
  }

  console.log('\n✓ Reverted', updated, 'items to pending');
}

// Final count
const { count } = await supabase
  .from('receipt_matches')
  .select('*', { count: 'exact', head: true })
  .gte('transaction_date', '2025-10-01')
  .in('status', ['pending', 'email_suggested']);

console.log('\n=== FINAL COUNT ===');
console.log('Pending receipts (Oct 1+):', count);
