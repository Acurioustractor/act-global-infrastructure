#!/usr/bin/env node

/**
 * Analyze Missing Receipts
 *
 * Cross-references Xero transactions against receipt_pipeline_status,
 * receipt_matches, and dext_receipts to produce a clear picture of:
 *   1. What's covered (receipt found or exempted)
 *   2. What's findable (vendor has portal/email we can pull from)
 *   3. What's genuinely missing (physical purchases, cash, etc.)
 *
 * Usage:
 *   node scripts/analyze-missing-receipts.mjs              # Full report
 *   node scripts/analyze-missing-receipts.mjs --json       # JSON output
 *   node scripts/analyze-missing-receipts.mjs --verbose    # Show every transaction
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const VERBOSE = args.includes('--verbose');

function log(msg) {
  if (!JSON_MODE) console.log(msg);
}

// ============================================
// Secrets & Auth
// ============================================

let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();
    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// ============================================
// Vendor classification
// ============================================

// Vendors where receipts can be downloaded from portals
const PORTAL_VENDORS = new Set([
  'openai', 'anthropic', 'vercel', 'supabase', 'github', 'stripe',
  'aws', 'google', 'adobe', 'xero', 'canva', 'notion', 'webflow',
  'zapier', 'railway', 'upstash', 'dialpad', 'squarespace', 'hostinger',
  'perplexity', 'bitwarden', 'highlevel', 'gohighlevel',
  'telstra', 'agl', 'origin energy', 'racq', 'aami',
  'qantas', 'virgin australia', 'uber', 'airbnb', 'booking.com',
  'apple', 'amazon', 'paypal', 'paddle',
]);

// Vendors where no receipt is expected
const NO_RECEIPT_VENDORS = new Set([
  'nab', 'national australia bank', 'commonwealth bank', 'cba',
  'anz', 'westpac', 'bank fee', 'bank charge', 'bank interest',
  'atm', 'transfer', 'internal transfer',
]);

// Physical/cash purchases — receipt may exist but not digital
const PHYSICAL_VENDORS = new Set([
  'bunnings', 'woolworths', 'kmart', 'coles', 'aldi',
  'bp', 'shell', 'caltex', 'ampol', '7-eleven',
  'dominos', 'mcdonalds', 'subway',
  'officeworks', 'jb hi-fi',
]);

function classifyVendor(contactName) {
  if (!contactName) return 'unknown';
  const name = contactName.toLowerCase().trim();

  if (NO_RECEIPT_VENDORS.has(name) ||
      [...NO_RECEIPT_VENDORS].some(v => name.includes(v))) {
    return 'no_receipt_needed';
  }

  if (PORTAL_VENDORS.has(name) ||
      [...PORTAL_VENDORS].some(v => name.includes(v))) {
    return 'portal_downloadable';
  }

  if (PHYSICAL_VENDORS.has(name) ||
      [...PHYSICAL_VENDORS].some(v => name.includes(v))) {
    return 'physical_purchase';
  }

  return 'unknown';
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Missing Receipts Analysis ===\n');

  const supabase = getSupabase();

  // 1. Fetch ALL SPEND/ACCPAY transactions (paginated)
  log('Loading transactions...');
  const transactions = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, type, has_attachments, is_reconciled, project_code')
      .in('type', ['SPEND', 'ACCPAY', 'SPEND-TRANSFER'])
      .eq('status', 'AUTHORISED')
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`Fetch error: ${error.message}`);
    transactions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }

  // 2. Fetch pipeline status
  const pipelineMap = new Map();
  let pipePage = 0;
  while (true) {
    const { data } = await supabase
      .from('receipt_pipeline_status')
      .select('xero_transaction_id, stage')
      .range(pipePage * PAGE_SIZE, (pipePage + 1) * PAGE_SIZE - 1);

    for (const p of (data || [])) pipelineMap.set(p.xero_transaction_id, p.stage);
    if (!data || data.length < PAGE_SIZE) break;
    pipePage++;
  }

  // 3. Fetch receipt_matches exemptions
  const exemptSet = new Set();
  let exemptPage = 0;
  while (true) {
    const { data } = await supabase
      .from('receipt_matches')
      .select('source_id')
      .eq('source_type', 'transaction')
      .eq('status', 'no_receipt_needed')
      .range(exemptPage * PAGE_SIZE, (exemptPage + 1) * PAGE_SIZE - 1);

    for (const e of (data || [])) exemptSet.add(e.source_id);
    if (!data || data.length < PAGE_SIZE) break;
    exemptPage++;
  }

  // 4. Fetch dext_receipts for matching
  const { data: dextReceipts } = await supabase
    .from('dext_receipts')
    .select('vendor_name, receipt_date, xero_transaction_id');

  const dextMatchedIds = new Set(
    (dextReceipts || [])
      .filter(r => r.xero_transaction_id)
      .map(r => r.xero_transaction_id)
  );

  // 5. Classify every transaction
  log(`Analyzing ${transactions.length} transactions...\n`);

  const categories = {
    reconciled: [],           // is_reconciled or exempt
    has_attachment: [],        // has_attachments in Xero
    dext_matched: [],          // matched via dext_receipts
    in_pipeline: [],           // forwarded_to_dext or dext_processed
    portal_downloadable: [],   // vendor has portal — we can get it
    physical_purchase: [],     // physical store — may have paper receipt
    unknown_vendor: [],        // can't classify — need manual review
  };

  for (const txn of transactions) {
    const id = txn.xero_transaction_id;
    const pipelineStage = pipelineMap.get(id);

    // Already covered
    if (txn.is_reconciled || exemptSet.has(id) || pipelineStage === 'reconciled') {
      categories.reconciled.push(txn);
      continue;
    }
    if (txn.has_attachments || pipelineStage === 'dext_processed') {
      categories.has_attachment.push(txn);
      continue;
    }
    if (pipelineStage === 'forwarded_to_dext') {
      categories.in_pipeline.push(txn);
      continue;
    }
    if (dextMatchedIds.has(id)) {
      categories.dext_matched.push(txn);
      continue;
    }

    // Missing — classify by vendor type
    const vendorClass = classifyVendor(txn.contact_name);
    if (vendorClass === 'no_receipt_needed') {
      categories.reconciled.push(txn);
    } else if (vendorClass === 'portal_downloadable') {
      categories.portal_downloadable.push(txn);
    } else if (vendorClass === 'physical_purchase') {
      categories.physical_purchase.push(txn);
    } else {
      categories.unknown_vendor.push(txn);
    }
  }

  // 6. Compute totals
  const sum = (arr) => arr.reduce((s, t) => s + Math.abs(parseFloat(t.total) || 0), 0);

  const report = {
    total_transactions: transactions.length,
    total_value: sum(transactions),
    categories: {
      reconciled: { count: categories.reconciled.length, value: sum(categories.reconciled) },
      has_attachment: { count: categories.has_attachment.length, value: sum(categories.has_attachment) },
      dext_matched: { count: categories.dext_matched.length, value: sum(categories.dext_matched) },
      in_pipeline: { count: categories.in_pipeline.length, value: sum(categories.in_pipeline) },
      portal_downloadable: { count: categories.portal_downloadable.length, value: sum(categories.portal_downloadable) },
      physical_purchase: { count: categories.physical_purchase.length, value: sum(categories.physical_purchase) },
      unknown_vendor: { count: categories.unknown_vendor.length, value: sum(categories.unknown_vendor) },
    },
    coverage_pct: ((categories.reconciled.length + categories.has_attachment.length + categories.dext_matched.length + categories.in_pipeline.length) / transactions.length * 100).toFixed(1),
  };

  // Covered = reconciled + has_attachment + dext_matched + in_pipeline
  const covered = report.categories.reconciled.count + report.categories.has_attachment.count +
                  report.categories.dext_matched.count + report.categories.in_pipeline.count;

  if (JSON_MODE) {
    // Add vendor breakdowns for missing categories
    report.portal_vendors = groupByVendor(categories.portal_downloadable);
    report.physical_vendors = groupByVendor(categories.physical_purchase);
    report.unknown_vendors = groupByVendor(categories.unknown_vendor);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty print
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`TOTAL: ${transactions.length} transactions ($${sum(transactions).toFixed(0)})`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  log('✅ COVERED:');
  log(`  Reconciled/exempt:     ${categories.reconciled.length} ($${sum(categories.reconciled).toFixed(0)})`);
  log(`  Has attachment (Xero): ${categories.has_attachment.length} ($${sum(categories.has_attachment).toFixed(0)})`);
  log(`  Dext matched:          ${categories.dext_matched.length} ($${sum(categories.dext_matched).toFixed(0)})`);
  log(`  In Dext pipeline:      ${categories.in_pipeline.length} ($${sum(categories.in_pipeline).toFixed(0)})`);
  log(`  ── Coverage: ${covered}/${transactions.length} (${report.coverage_pct}%)`);
  log('');
  log('🔍 FINDABLE (vendor portals — download receipts):');
  const portalVendors = groupByVendor(categories.portal_downloadable);
  for (const [vendor, items] of portalVendors.slice(0, 20)) {
    log(`  ${vendor}: ${items.length} ($${sum(items).toFixed(0)})`);
  }
  if (portalVendors.length > 20) log(`  ... and ${portalVendors.length - 20} more vendors`);
  log(`  ── Subtotal: ${categories.portal_downloadable.length} ($${sum(categories.portal_downloadable).toFixed(0)})`);
  log('');
  log('🏪 PHYSICAL PURCHASES (may have paper receipt):');
  const physVendors = groupByVendor(categories.physical_purchase);
  for (const [vendor, items] of physVendors) {
    log(`  ${vendor}: ${items.length} ($${sum(items).toFixed(0)})`);
  }
  log(`  ── Subtotal: ${categories.physical_purchase.length} ($${sum(categories.physical_purchase).toFixed(0)})`);
  log('');
  log('❓ UNKNOWN (need manual review):');
  const unknownVendors = groupByVendor(categories.unknown_vendor);
  for (const [vendor, items] of unknownVendors.slice(0, 30)) {
    log(`  ${vendor}: ${items.length} ($${sum(items).toFixed(0)})`);
  }
  if (unknownVendors.length > 30) log(`  ... and ${unknownVendors.length - 30} more vendors`);
  log(`  ── Subtotal: ${categories.unknown_vendor.length} ($${sum(categories.unknown_vendor).toFixed(0)})`);

  log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('NEXT ACTIONS:');
  log(`  1. Download ${categories.portal_downloadable.length} receipts from vendor portals → forward to Dext`);
  log(`  2. Locate ${categories.physical_purchase.length} physical receipts (scan/photo → Dext)`);
  log(`  3. Review ${categories.unknown_vendor.length} unknown vendors — classify or exempt`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (VERBOSE) {
    log('\n--- DETAIL: Portal downloadable ---');
    for (const txn of categories.portal_downloadable) {
      log(`  ${txn.date} | ${txn.contact_name} | $${Math.abs(parseFloat(txn.total) || 0).toFixed(2)} | ${txn.project_code || 'untagged'}`);
    }
    log('\n--- DETAIL: Unknown vendor ---');
    for (const txn of categories.unknown_vendor) {
      log(`  ${txn.date} | ${txn.contact_name} | $${Math.abs(parseFloat(txn.total) || 0).toFixed(2)} | ${txn.project_code || 'untagged'}`);
    }
  }
}

function groupByVendor(transactions) {
  const groups = {};
  for (const txn of transactions) {
    const v = txn.contact_name || 'Unknown';
    if (!groups[v]) groups[v] = [];
    groups[v].push(txn);
  }
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
