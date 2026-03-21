#!/usr/bin/env node
/**
 * Check how many Dext receipts are actually already reconciled in Xero
 * under different vendor names. The real gap analysis.
 */
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', {encoding:'utf8'}).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, {encoding:'utf8'});
    secretCache = {};
    for (const s of JSON.parse(result)) secretCache[s.key] = s.value;
    return secretCache;
  } catch (e) { return {}; }
}
function getSecret(n) { return (loadSecrets())[n] || process.env[n]; }
const sb = createClient(
  getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL'),
  getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY')
);

// Load all Xero SPEND transactions (paginated)
const allTxns = [];
let page = 0;
while (true) {
  const {data} = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, is_reconciled, has_attachments')
    .in('type', ['SPEND','ACCPAY','SPEND-TRANSFER'])
    .eq('status', 'AUTHORISED')
    .order('date', {ascending: false})
    .range(page * 1000, (page + 1) * 1000 - 1);
  allTxns.push(...(data || []));
  if (!data || data.length < 1000) break;
  page++;
}

// Load unmatched Dext receipts
const {data: dext} = await sb.from('dext_receipts')
  .select('vendor_name, receipt_date, xero_transaction_id, filename')
  .is('xero_transaction_id', null);

console.log(`Total Xero SPEND: ${allTxns.length}`);
console.log(`Reconciled: ${allTxns.filter(t => t.is_reconciled).length}`);
console.log(`Has attachments: ${allTxns.filter(t => t.has_attachments).length}`);
console.log(`Unmatched Dext receipts: ${dext.length}\n`);

// For each unmatched Dext receipt, see if there's a Xero txn around that date
// that IS reconciled (meaning Dext already matched it under a different name)
let alreadyReconciled = 0;
let hasAttachment = 0;
let trulyOrphan = 0;

for (const d of dext) {
  if (!d.receipt_date) { trulyOrphan++; continue; }

  const dDate = new Date(d.receipt_date);
  // Find any Xero txn within 14 days of this receipt
  const nearby = allTxns.filter(t => {
    const tDate = new Date(t.date);
    const diffDays = Math.abs(dDate - tDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 14;
  });

  const reconciledNearby = nearby.filter(t => t.is_reconciled);
  const attachNearby = nearby.filter(t => t.has_attachments);

  if (attachNearby.length > 0) {
    hasAttachment++;
  } else if (reconciledNearby.length > 0) {
    alreadyReconciled++;
  } else {
    trulyOrphan++;
  }
}

console.log('=== Unmatched Dext Receipts Analysis ===');
console.log(`Near a reconciled Xero txn:    ${alreadyReconciled} (likely already matched by Dext)`);
console.log(`Near a txn with attachment:    ${hasAttachment} (receipt already in Xero)`);
console.log(`No nearby Xero txn at all:     ${trulyOrphan} (may be ACCPAY bills or missing from bank feed)`);

// Show the truly orphan ones
console.log(`\n=== Truly orphan Dext receipts (${trulyOrphan}) ===`);
const orphans = [];
for (const d of dext) {
  if (!d.receipt_date) { orphans.push(d); continue; }
  const dDate = new Date(d.receipt_date);
  const nearby = allTxns.filter(t => {
    const tDate = new Date(t.date);
    return Math.abs(dDate - tDate) / (1000 * 60 * 60 * 24) <= 14;
  });
  const hasAny = nearby.some(t => t.is_reconciled || t.has_attachments);
  if (!hasAny) orphans.push(d);
}

const byVendor = {};
for (const d of orphans) {
  const v = d.vendor_name || 'Unknown';
  byVendor[v] = (byVendor[v] || 0) + 1;
}
for (const [v, c] of Object.entries(byVendor).sort((a,b) => b[1]-a[1]).slice(0, 20)) {
  console.log(`  ${v}: ${c}`);
}
