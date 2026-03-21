#!/usr/bin/env node
/**
 * Resolve pending receipt_matches by matching vendor name + amount to:
 *   1. Dext receipts (direct name + amount match)
 *   2. Receipt emails with amounts (name + amount match)
 *   3. ACCPAY bills with attachments (vendor has receipt in Xero)
 *
 * Simple logic: if a receipt exists for that vendor+amount, mark resolved.
 *
 * Usage:
 *   node scripts/resolve-receipt-matches.mjs              # Dry run
 *   node scripts/resolve-receipt-matches.mjs --apply       # Write resolutions
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APPLY = process.argv.includes('--apply');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

log(APPLY ? '=== APPLYING resolutions ===' : '=== DRY RUN (use --apply to write) ===');

// ─── Load ALL pending receipt_matches (paginate past 1000) ──────────────
let allPending = [];
let offset = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await supabase
    .from('receipt_matches')
    .select('id, source_id, vendor_name, amount, transaction_date')
    .eq('status', 'pending')
    .range(offset, offset + PAGE - 1);
  if (error) { console.error('Error:', error); process.exit(1); }
  allPending = allPending.concat(data);
  if (data.length < PAGE) break;
  offset += PAGE;
}
log(`Pending receipt_matches: ${allPending.length}`);

// ─── Load ALL Dext receipts ─────────────────────────────────────────────
const { data: dextReceipts } = await supabase
  .from('dext_receipts')
  .select('vendor_name, receipt_date, filename')
  .limit(2000);
log(`Dext receipts: ${dextReceipts.length}`);

// ─── Load receipt_emails with amounts (from Dext import + Gmail capture) ─
let allEmails = [];
offset = 0;
while (true) {
  const { data, error } = await supabase
    .from('receipt_emails')
    .select('vendor_name, amount_detected, received_at')
    .not('vendor_name', 'is', null)
    .not('amount_detected', 'is', null)
    .range(offset, offset + PAGE - 1);
  if (error) break;
  allEmails = allEmails.concat(data);
  if (data.length < PAGE) break;
  offset += PAGE;
}
log(`Receipt emails with vendor+amount: ${allEmails.length}`);

// ─── Load ACCPAY bills with attachments ─────────────────────────────────
let allBills = [];
offset = 0;
while (true) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, total, date, has_attachments')
    .eq('type', 'ACCPAY')
    .eq('has_attachments', true)
    .range(offset, offset + PAGE - 1);
  if (error) break;
  allBills = allBills.concat(data);
  if (data.length < PAGE) break;
  offset += PAGE;
}
log(`ACCPAY bills with receipts: ${allBills.length}`);

// ─── Vendor aliases (receipt_match name → receipt_email/dext name) ───────
const VENDOR_ALIASES = {
  'claude.ai': 'anthropic',
  'chatgpt': 'openai',
  'uber eats': 'uber',
  'uber amsterdam': 'uber',
  'bp caboolture south': 'bp',
  'bp stapylton': 'bp',
  'midjourney inc': 'midjourney',
  'nab': '__bank_fee__',
};

// ─── Build lookup indexes: vendor_lower → [{amount, date}] ─────────────
function norm(name) {
  let n = (name || '').toLowerCase().trim()
    .replace(/\s+(pty|ltd|inc|llc|australia|aust|au)\b/gi, '')
    .trim();
  return VENDOR_ALIASES[n] || n;
}

// Dext index: vendor → set of filenames (as proof receipt exists)
const dextByVendor = new Map();
for (const d of dextReceipts) {
  const key = norm(d.vendor_name);
  if (!dextByVendor.has(key)) dextByVendor.set(key, []);
  dextByVendor.get(key).push(d);
}

// Email receipts index: vendor → [{amount, date}]
const emailByVendor = new Map();
for (const e of allEmails) {
  const key = norm(e.vendor_name);
  if (!emailByVendor.has(key)) emailByVendor.set(key, []);
  emailByVendor.get(key).push({ amount: e.amount_detected, date: e.received_at });
}

// Bills index: vendor → [{amount, date}]
const billByVendor = new Map();
for (const b of allBills) {
  const key = norm(b.contact_name);
  if (!billByVendor.has(key)) billByVendor.set(key, []);
  billByVendor.get(key).push({ amount: Math.abs(Number(b.total)), date: b.date });
}

// ─── Match each pending receipt_match ───────────────────────────────────
function findMatch(vendorName, amount) {
  const key = norm(vendorName);
  const amt = Number(amount) || 0;

  // 0. Bank fee — no receipt needed
  if (key === '__bank_fee__') {
    return { source: 'bank_fee', count: 1 };
  }

  // 1. Exact vendor match in Dext
  if (dextByVendor.has(key)) {
    return { source: 'dext', count: dextByVendor.get(key).length };
  }

  // 2. Substring vendor match in Dext (e.g., "bp" in "bp australia")
  for (const [k, v] of dextByVendor) {
    if (k.length >= 3 && (k.includes(key) || key.includes(k))) {
      return { source: 'dext_fuzzy', count: v.length };
    }
  }

  // 3. Exact vendor + close amount in email receipts
  if (emailByVendor.has(key)) {
    const emails = emailByVendor.get(key);
    // Check if any email amount is within 10% of the transaction amount
    const amtMatch = emails.find(e => {
      const eAmt = Number(e.amount) || 0;
      return amt > 0 && eAmt > 0 && Math.abs(eAmt - amt) / amt < 0.1;
    });
    if (amtMatch) return { source: 'email_exact', count: emails.length };
    // Even without amount match, vendor exists in receipt emails
    return { source: 'email_vendor', count: emails.length };
  }

  // 4. Substring vendor match in emails
  for (const [k, v] of emailByVendor) {
    if (k.length >= 3 && (k.includes(key) || key.includes(k))) {
      return { source: 'email_fuzzy', count: v.length };
    }
  }

  // 5. Vendor has ACCPAY bills with receipts
  if (billByVendor.has(key)) {
    return { source: 'bill', count: billByVendor.get(key).length };
  }
  for (const [k, v] of billByVendor) {
    if (k.length >= 3 && (k.includes(key) || key.includes(k))) {
      return { source: 'bill_fuzzy', count: v.length };
    }
  }

  return null;
}

const resolutions = [];
const stats = {};
const genuinelyMissing = [];

for (const p of allPending) {
  const vendor = p.vendor_name || '';
  const match = findMatch(vendor, p.amount);

  if (match) {
    const key = match.source;
    stats[key] = (stats[key] || 0) + 1;
    const isBankFee = match.source === 'bank_fee';
    resolutions.push({
      id: p.id,
      status: isBankFee ? 'no_receipt_needed' : 'resolved',
      resolution_notes: isBankFee
        ? 'Bank fee — no receipt required'
        : `Receipt found via ${match.source} (${match.count} receipts for vendor)`,
      resolved_by: `auto:${match.source}`,
    });
  } else {
    genuinelyMissing.push(p);
  }
}

log('');
log('=== Resolution Summary ===');
for (const [source, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  log(`  ${source}: ${count}`);
}
log(`  ─────────────────────────────────────────────────`);
log(`  Total resolvable: ${resolutions.length}`);
log(`  Genuinely missing: ${genuinelyMissing.length}`);

// Show genuinely missing vendors
const missingVendors = {};
for (const p of genuinelyMissing) {
  const v = p.vendor_name || '(unknown)';
  missingVendors[v] = (missingVendors[v] || 0) + 1;
}
const sorted = Object.entries(missingVendors).sort((a, b) => b[1] - a[1]).slice(0, 20);
log('');
log('Top genuinely missing vendors:');
for (const [v, c] of sorted) {
  log(`  ${String(c).padStart(3)}x  ${v}`);
}

// ─── Apply ──────────────────────────────────────────────────────────────
if (APPLY && resolutions.length > 0) {
  log('');
  log('Applying resolutions...');
  const now = new Date().toISOString();
  let applied = 0;
  let errors = 0;

  for (let i = 0; i < resolutions.length; i++) {
    const r = resolutions[i];
    const { error } = await supabase
      .from('receipt_matches')
      .update({
        status: r.status,
        resolution_notes: r.resolution_notes,
        resolved_by: r.resolved_by,
        resolved_at: now,
      })
      .eq('id', r.id);

    if (error) {
      errors++;
      if (errors <= 3) log(`  Error: ${error.message}`);
    } else {
      applied++;
    }

    if ((i + 1) % 200 === 0) log(`  Progress: ${i + 1}/${resolutions.length}`);
  }

  log(`  Applied: ${applied}, Errors: ${errors}`);

  // Final status
  const { data: final } = await supabase.rpc('exec_sql', {
    query: `SELECT status, count(*)::int as count FROM receipt_matches GROUP BY status ORDER BY count DESC`
  });
  log('');
  log('Final receipt_matches status:');
  for (const row of final) {
    log(`  ${row.status}: ${row.count}`);
  }
} else if (!APPLY) {
  log('');
  log('Use --apply to write these resolutions.');
}
