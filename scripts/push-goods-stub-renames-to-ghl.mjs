#!/usr/bin/env node
/**
 * Push the 14 goods-contact stub renames (and JV Trust company_name backfill)
 * from Supabase to GHL. Safe to re-run — idempotent.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const STUB_GHL_IDS = [
  'dJ1Y9UKZTdh8wNIWBY0n', 'njoAmMmD94nzpOjyzAus', 'XxdQ2V1KPuNmpEI1RlGr',
  'OHCxJA8daszAWVVVVPrf', 'SYhvJjn05QVkvbFJPhGv', 'FMrW22L6dDI45KoPVYfV',
  'z54hf3IrFhNzQeMW6Gzv', 'hFSl19Su4LbrBuJ3J6Tz', 'c0n7ndKiUlKYR6huBQn0',
  'qvh2D31s2PpIjDKhmg9E', 'OSWHIOCG3vHdyAEHot6F', 'Eqcko6VbVFA0XQfV0mVY',
  'QD8Y6J35dqP72hZsWSTN', 'bymOHIStCNF8Rv7b6BPF',
];

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const ghl = createGHLService();

const { data, error } = await supabase
  .from('ghl_contacts')
  .select('ghl_id, first_name, last_name, full_name, company_name, email')
  .in('ghl_id', STUB_GHL_IDS);

if (error) { console.error('Supabase error:', error.message); process.exit(1); }

console.log(`Pushing ${data.length} renames to GHL...\n`);

let ok = 0, fail = 0;
for (const c of data) {
  const updates = {
    firstName: c.first_name || '',
    lastName: c.last_name || '',
  };
  if (c.company_name) updates.companyName = c.company_name;

  try {
    await ghl.updateContact(c.ghl_id, updates);
    console.log(`  OK   ${c.ghl_id}  ${c.full_name}  (${c.email})`);
    ok++;
    await new Promise(r => setTimeout(r, 150));
  } catch (e) {
    console.error(`  FAIL ${c.ghl_id}  ${c.full_name} — ${e.message}`);
    fail++;
  }
}

console.log(`\nDone. ${ok} ok, ${fail} failed.`);
