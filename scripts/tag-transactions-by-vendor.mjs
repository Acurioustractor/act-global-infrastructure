#!/usr/bin/env node
/**
 * Transaction Tagger: Auto-assign project_code to xero_transactions and xero_invoices
 *
 * Three-tier matching:
 *   Tier 1: Vendor/contact name fuzzy match against dext-supplier-rules.json aliases
 *   Tier 2: Line items tracking array match against xero_tracking values
 *   Tier 3: Description/reference keyword match against project ghl_tags
 *
 * Usage:
 *   node scripts/tag-transactions-by-vendor.mjs           # Dry run
 *   node scripts/tag-transactions-by-vendor.mjs --apply    # Apply changes
 *   node scripts/tag-transactions-by-vendor.mjs --stats    # Show current coverage stats
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load configs
const supplierRules = JSON.parse(readFileSync(join(__dirname, '../config/dext-supplier-rules.json'), 'utf8'));
const projectCodes = JSON.parse(readFileSync(join(__dirname, '../config/project-codes.json'), 'utf8'));

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const statsMode = args.includes('--stats');

// Build lookup structures
function buildVendorMap() {
  const vendorMap = []; // { aliases: string[], projectCode: string, vendorName: string }

  // Flatten all vendor categories from supplier rules
  for (const category of Object.values(supplierRules.auto_publish_rules || {})) {
    for (const vendor of category.vendors || []) {
      if (vendor.tracking && vendor.tracking !== 'ASK_USER') {
        vendorMap.push({
          vendorName: vendor.name,
          aliases: [vendor.name, ...(vendor.aliases || [])].map(a => a.toLowerCase()),
          trackingCode: vendor.tracking,
        });
      }
    }
  }

  // Bank fees
  for (const vendor of supplierRules.bank_fees?.vendors || []) {
    if (vendor.tracking) {
      vendorMap.push({
        vendorName: vendor.name,
        aliases: [vendor.name, ...(vendor.aliases || [])].map(a => a.toLowerCase()),
        trackingCode: vendor.tracking,
      });
    }
  }

  // Project-specific
  for (const vendor of supplierRules.auto_publish_rules?.project_specific?.vendors || []) {
    if (vendor.tracking) {
      vendorMap.push({
        vendorName: vendor.name,
        aliases: [vendor.name, ...(vendor.aliases || [])].map(a => a.toLowerCase()),
        trackingCode: vendor.tracking,
      });
    }
  }

  return vendorMap;
}

function buildTrackingToProjectMap() {
  // xero_tracking value → ACT project code
  const map = {};
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    if (project.xero_tracking) {
      map[project.xero_tracking.toLowerCase()] = code;
    }
  }
  return map;
}

function buildKeywordMap() {
  // keyword → ACT project code (from ghl_tags)
  const map = [];
  for (const [code, project] of Object.entries(projectCodes.projects)) {
    if (project.ghl_tags) {
      for (const tag of project.ghl_tags) {
        map.push({ keyword: tag.toLowerCase(), code });
      }
    }
    // Also match project name
    map.push({ keyword: project.name.toLowerCase(), code });
  }
  // Sort by keyword length descending (longer matches first to avoid false positives)
  map.sort((a, b) => b.keyword.length - a.keyword.length);
  return map;
}

function resolveTrackingToProject(trackingCode, trackingToProjectMap) {
  // Direct match from tracking code to project code
  // Some tracking codes ARE project codes (ACT-IN, ACT-GD, ACT-HV etc)
  if (trackingCode.startsWith('ACT-')) return trackingCode;

  const lower = trackingCode.toLowerCase();
  if (trackingToProjectMap[lower]) return trackingToProjectMap[lower];

  return null;
}

// Tier 1: Match contact_name against vendor aliases
function matchVendor(contactName, vendorMap) {
  if (!contactName) return null;
  const lower = contactName.toLowerCase().trim();

  for (const vendor of vendorMap) {
    for (const alias of vendor.aliases) {
      if (lower.includes(alias) || alias.includes(lower)) {
        return { trackingCode: vendor.trackingCode, vendorName: vendor.vendorName };
      }
    }
  }
  return null;
}

// Tier 2: Match line_items tracking arrays
function matchLineItemsTracking(lineItems, trackingToProjectMap) {
  if (!lineItems || !Array.isArray(lineItems)) return null;

  for (const item of lineItems) {
    const tracking = item.tracking || item.Tracking || [];
    if (!Array.isArray(tracking)) continue;

    for (const t of tracking) {
      const name = (t.Name || t.name || t.Option || t.option || '').toLowerCase();
      if (name && trackingToProjectMap[name]) {
        return trackingToProjectMap[name];
      }
      // Check nested option
      const option = t.Option || t.option;
      if (typeof option === 'string') {
        const optLower = option.toLowerCase();
        if (trackingToProjectMap[optLower]) return trackingToProjectMap[optLower];
      }
    }
  }
  return null;
}

// Tier 3: Match description/reference text against keywords
function matchKeywords(text, keywordMap) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const { keyword, code } of keywordMap) {
    // Require word boundary-ish matching (at least 3 chars to avoid false positives)
    if (keyword.length >= 3 && lower.includes(keyword)) {
      return code;
    }
  }
  return null;
}

async function showStats() {
  const { data: total } = await supabase
    .from('xero_transactions')
    .select('id', { count: 'exact', head: true });

  const { data: tagged } = await supabase
    .from('xero_transactions')
    .select('id', { count: 'exact', head: true })
    .not('project_code', 'is', null);

  const { data: byProject } = await supabase.rpc('exec_sql', {
    query: `SELECT project_code, COUNT(*) as count FROM xero_transactions WHERE project_code IS NOT NULL GROUP BY project_code ORDER BY count DESC`
  });

  const totalCount = total?.length ?? 0;
  const taggedCount = tagged?.length ?? 0;

  // Use count from response headers
  const { count: totalC } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true });

  const { count: taggedC } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .not('project_code', 'is', null);

  console.log('\n📊 Transaction Coverage Stats');
  console.log('═'.repeat(50));
  console.log(`Total transactions:  ${totalC}`);
  console.log(`Tagged:              ${taggedC}`);
  console.log(`Untagged:            ${totalC - taggedC}`);
  console.log(`Coverage:            ${totalC > 0 ? ((taggedC / totalC) * 100).toFixed(1) : 0}%`);

  // By project distribution
  const { data: distribution } = await supabase
    .from('xero_transactions')
    .select('project_code')
    .not('project_code', 'is', null);

  if (distribution) {
    const counts = {};
    for (const row of distribution) {
      counts[row.project_code] = (counts[row.project_code] || 0) + 1;
    }
    console.log('\n📁 Distribution by Project:');
    for (const [code, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${code.padEnd(12)} ${count}`);
    }
  }
}

async function tagTransactions() {
  const vendorMap = buildVendorMap();
  const trackingToProjectMap = buildTrackingToProjectMap();
  const keywordMap = buildKeywordMap();

  console.log(`\n🏷️  Transaction Tagger ${applyMode ? '(APPLY MODE)' : '(DRY RUN)'}`);
  console.log('═'.repeat(50));
  console.log(`Vendor rules:     ${vendorMap.length}`);
  console.log(`Tracking codes:   ${Object.keys(trackingToProjectMap).length}`);
  console.log(`Keywords:         ${keywordMap.length}`);

  // Fetch untagged transactions (paginated)
  let allUntagged = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('id, contact_name, line_items, total, date, type, bank_account')
      .is('project_code', null)
      .range(offset, offset + pageSize - 1)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    allUntagged.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`\nUntagged transactions: ${allUntagged.length}`);

  const stats = { tier1: 0, tier2: 0, tier3: 0, unmatched: 0 };
  const matches = []; // { id, projectCode, source, tier }

  for (const tx of allUntagged) {
    let projectCode = null;
    let source = null;

    // Tier 1: Vendor match
    const vendorMatch = matchVendor(tx.contact_name, vendorMap);
    if (vendorMatch) {
      projectCode = resolveTrackingToProject(vendorMatch.trackingCode, trackingToProjectMap);
      if (projectCode) {
        source = 'vendor_rule';
        stats.tier1++;
      }
    }

    // Tier 2: Line items tracking
    if (!projectCode) {
      projectCode = matchLineItemsTracking(tx.line_items, trackingToProjectMap);
      if (projectCode) {
        source = 'tracking_match';
        stats.tier2++;
      }
    }

    // Tier 3: Keyword match on contact_name + line item descriptions
    if (!projectCode) {
      let searchText = [tx.contact_name, tx.bank_account].filter(Boolean).join(' ');
      // Also extract descriptions from line_items JSONB
      if (Array.isArray(tx.line_items)) {
        for (const li of tx.line_items) {
          if (li.Description || li.description) searchText += ' ' + (li.Description || li.description);
        }
      }
      projectCode = matchKeywords(searchText, keywordMap);
      if (projectCode) {
        source = 'keyword_match';
        stats.tier3++;
      }
    }

    if (projectCode) {
      matches.push({ id: tx.id, projectCode, source });
    } else {
      stats.unmatched++;
    }
  }

  console.log('\n📊 Matching Results');
  console.log('─'.repeat(40));
  console.log(`Tier 1 (Vendor):    ${stats.tier1}`);
  console.log(`Tier 2 (Tracking):  ${stats.tier2}`);
  console.log(`Tier 3 (Keyword):   ${stats.tier3}`);
  console.log(`Total matched:      ${stats.tier1 + stats.tier2 + stats.tier3}`);
  console.log(`Unmatched:          ${stats.unmatched}`);

  const totalTx = allUntagged.length;
  const matchedCount = stats.tier1 + stats.tier2 + stats.tier3;
  const newCoverage = totalTx > 0 ? (matchedCount / totalTx * 100).toFixed(1) : '0';
  console.log(`\nNew coverage of untagged: ${newCoverage}%`);

  // Show sample matches
  if (matches.length > 0) {
    console.log('\n📋 Sample Matches (first 20):');
    for (const m of matches.slice(0, 20)) {
      const tx = allUntagged.find(t => t.id === m.id);
      const desc = (tx?.contact_name || 'N/A').substring(0, 40);
      console.log(`  ${m.projectCode.padEnd(10)} ← ${desc.padEnd(42)} [${m.source}]`);
    }
  }

  // Apply updates
  if (applyMode && matches.length > 0) {
    console.log(`\n⏳ Applying ${matches.length} updates...`);

    // Batch update in chunks of 50
    const chunkSize = 50;
    let applied = 0;

    for (let i = 0; i < matches.length; i += chunkSize) {
      const chunk = matches.slice(i, i + chunkSize);

      for (const match of chunk) {
        const { error } = await supabase
          .from('xero_transactions')
          .update({
            project_code: match.projectCode,
            project_code_source: match.source,
          })
          .eq('id', match.id);

        if (error) {
          console.error(`  Error updating ${match.id}:`, error.message);
        } else {
          applied++;
        }
      }

      process.stdout.write(`  Updated ${Math.min(applied, matches.length)}/${matches.length}\r`);
    }

    console.log(`\n✅ Applied ${applied} updates`);
  }

  // Also tag invoices
  console.log('\n📄 Checking invoices...');

  let allUntaggedInvoices = [];
  offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('xero_invoices')
      .select('id, contact_name, reference, line_items, total, date, type, tracking_option_1, tracking_option_2')
      .is('project_code', null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching invoices:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    allUntaggedInvoices.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Untagged invoices: ${allUntaggedInvoices.length}`);

  const invoiceStats = { tier1: 0, tier2: 0, tier3: 0, unmatched: 0 };
  const invoiceMatches = [];

  for (const inv of allUntaggedInvoices) {
    let projectCode = null;
    let source = null;

    const vendorMatch = matchVendor(inv.contact_name, vendorMap);
    if (vendorMatch) {
      projectCode = resolveTrackingToProject(vendorMatch.trackingCode, trackingToProjectMap);
      if (projectCode) { source = 'vendor_rule'; invoiceStats.tier1++; }
    }

    // Tier 2: Check tracking_option columns + line_items tracking
    if (!projectCode) {
      // Check tracking_option_1 and tracking_option_2 first (direct Xero tracking)
      for (const opt of [inv.tracking_option_1, inv.tracking_option_2]) {
        if (opt) {
          const resolved = trackingToProjectMap[opt.toLowerCase()];
          if (resolved) { projectCode = resolved; break; }
        }
      }
      if (!projectCode) {
        projectCode = matchLineItemsTracking(inv.line_items, trackingToProjectMap);
      }
      if (projectCode) { source = 'tracking_match'; invoiceStats.tier2++; }
    }

    if (!projectCode) {
      let searchText = [inv.reference, inv.contact_name].filter(Boolean).join(' ');
      if (Array.isArray(inv.line_items)) {
        for (const li of inv.line_items) {
          if (li.Description || li.description) searchText += ' ' + (li.Description || li.description);
        }
      }
      projectCode = matchKeywords(searchText, keywordMap);
      if (projectCode) { source = 'keyword_match'; invoiceStats.tier3++; }
    }

    if (projectCode) {
      invoiceMatches.push({ id: inv.id, projectCode, source });
    } else {
      invoiceStats.unmatched++;
    }
  }

  console.log(`Invoice matches: ${invoiceMatches.length} (T1:${invoiceStats.tier1} T2:${invoiceStats.tier2} T3:${invoiceStats.tier3})`);

  if (applyMode && invoiceMatches.length > 0) {
    let applied = 0;
    for (const match of invoiceMatches) {
      const { error } = await supabase
        .from('xero_invoices')
        .update({
          project_code: match.projectCode,
          project_code_source: match.source,
        })
        .eq('id', match.id);

      if (!error) applied++;
    }
    console.log(`✅ Applied ${applied} invoice updates`);
  }

  // Final coverage estimate
  const { count: finalTotal } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true });

  const { count: alreadyTagged } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .not('project_code', 'is', null);

  const projectedTagged = (alreadyTagged || 0) + matchedCount;
  const projectedCoverage = finalTotal > 0 ? ((projectedTagged / finalTotal) * 100).toFixed(1) : '0';

  console.log('\n📈 Coverage Summary');
  console.log('─'.repeat(40));
  console.log(`Before:  ${alreadyTagged}/${finalTotal} (${finalTotal > 0 ? ((alreadyTagged / finalTotal) * 100).toFixed(1) : 0}%)`);
  console.log(`After:   ${projectedTagged}/${finalTotal} (${projectedCoverage}%)`);

  if (!applyMode) {
    console.log('\n💡 Run with --apply to save changes');
  }
}

// Main
if (statsMode) {
  await showStats();
} else {
  await tagTransactions();
}
