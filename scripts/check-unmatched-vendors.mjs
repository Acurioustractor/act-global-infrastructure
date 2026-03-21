#!/usr/bin/env node
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await sb.from('receipt_emails')
  .select('vendor_name, amount_detected, status')
  .in('status', ['review', 'captured'])
  .not('vendor_name', 'is', null)
  .order('amount_detected', { ascending: false })
  .limit(500);

const byVendor = {};
for (const r of data || []) {
  const v = r.vendor_name || 'UNKNOWN';
  byVendor[v] = byVendor[v] || { count: 0, total: 0 };
  byVendor[v].count++;
  byVendor[v].total += parseFloat(r.amount_detected || 0);
}

const sorted = Object.entries(byVendor).sort((a,b) => b[1].total - a[1].total);
console.log('Top unmatched vendors by $ value:');
for (const [v, s] of sorted.slice(0, 30)) {
  console.log(`  ${v.padEnd(40)} $${s.total.toFixed(2).padStart(10)}  (${s.count} receipts)`);
}
console.log(`\nTotal: ${sorted.length} vendors, ${data.length} receipts`);
