#!/usr/bin/env node
/**
 * FY26 Auto-Tag Transactions
 *
 * Bulk auto-tags untagged Xero transactions for FY26 (Jul 2025 → Feb 2026).
 * Uses expanded vendor rules, Xero tracking codes, and keyword matching.
 * Flags R&D-eligible transactions for tax incentive claims.
 *
 * Usage:
 *   node scripts/auto-tag-fy26-transactions.mjs --dry-run    # Preview only
 *   node scripts/auto-tag-fy26-transactions.mjs              # Apply tags
 *   node scripts/auto-tag-fy26-transactions.mjs --report     # Generate report only
 */

import { createClient } from '@supabase/supabase-js';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes
const PROJECT_CODES = await loadProjectsConfig();

// FY26: 1 Jul 2025 → 30 Jun 2026
const FY26_START = '2025-07-01';
const FY26_END = '2026-06-30';

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_ONLY = process.argv.includes('--report');

// ============================================================================
// VENDOR RULES — Tier 1: Loaded from vendor_project_rules DB table
// ============================================================================

let VENDOR_RULES = [];

async function loadVendorRules() {
  const { data, error } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases, project_code, category, auto_apply');

  if (error) {
    console.error('Failed to load vendor rules from DB:', error.message);
    return;
  }

  VENDOR_RULES = (data || []).map(r => ({
    match: r.vendor_name,
    aliases: r.aliases || [],
    code: r.project_code,
    reason: r.category || 'Vendor rule',
    autoApply: r.auto_apply,
  }));

  // Add the SKIP rule for transfers (not stored in DB)
  VENDOR_RULES.push({ match: 'Transfer', code: 'SKIP', type: 'TRANSFER', reason: 'Bank-to-bank transfer' });

  console.log(`Loaded ${VENDOR_RULES.length} vendor rules from DB`);
}

// ============================================================================
// R&D ELIGIBLE PROJECTS AND SOFTWARE
// ============================================================================

const RD_ELIGIBLE_PROJECTS = new Set([
  'ACT-EL',  // Empathy Ledger — Core R&D
  'ACT-IN',  // ALMA knowledge system, bot/agent — Core R&D
  'ACT-JH',  // JusticeHub tech — Supporting R&D
  'ACT-GD',  // Goods marketplace tech — Supporting R&D
  'ACT-PS',  // PICC Photo Kiosk — Supporting R&D
  'ACT-CF',  // Confessional story booth — Supporting R&D
]);

// Software vendors whose spend is R&D-eligible (used in R&D projects)
const RD_SOFTWARE_VENDORS = new Set([
  'openai', 'anthropic', 'supabase', 'vercel', 'github',
  'notion', 'descript', 'figma',
]);

// ============================================================================
// TIER 2: Xero tracking code → project code
// ============================================================================

function matchTrackingCodes(lineItems) {
  if (!lineItems || !Array.isArray(lineItems)) return null;

  for (const li of lineItems) {
    const tracking = li.tracking || li.Tracking;
    if (!tracking || !Array.isArray(tracking)) continue;

    for (const tc of tracking) {
      const name = tc.Name || tc.name || '';
      const option = (tc.Option || tc.option || '').toLowerCase();

      if (!option) continue;

      // Match tracking value against project xero_tracking fields
      for (const [code, proj] of Object.entries(PROJECT_CODES.projects)) {
        const xeroTracking = (proj.xero_tracking || '').toLowerCase();
        if (xeroTracking && xeroTracking === option) {
          return { code, reason: `Xero tracking: ${name}=${tc.Option || tc.option}` };
        }
      }
    }
  }
  return null;
}

// ============================================================================
// TIER 3: Keyword matching on contact name and line item descriptions
// ============================================================================

function matchKeywords(contactName, lineItems) {
  const lower = (contactName || '').toLowerCase();

  // Contact name → project keyword matching
  const KEYWORD_MAP = [
    { keywords: ['palm island', 'picc', 'bwgcolman'], code: 'ACT-PI' },
    { keywords: ['diagrama'], code: 'ACT-DG' },
    { keywords: ['justicehub', 'justice hub'], code: 'ACT-JH' },
    { keywords: ['empathy ledger'], code: 'ACT-EL' },
    { keywords: ['harvest', 'witta'], code: 'ACT-HV' },
    { keywords: ['goods'], code: 'ACT-GD' },
    { keywords: ['confessional'], code: 'ACT-CF' },
    { keywords: ['gold phone', 'goldphone'], code: 'ACT-GP' },
    { keywords: ['maningrida'], code: 'ACT-MN' },
    { keywords: ['bimberi'], code: 'ACT-BM' },
    { keywords: ['dadlab', 'dad lab'], code: 'ACT-DL' },
    { keywords: ['smart connect', 'smart recovery'], code: 'ACT-SM' },
    { keywords: ['qfcc'], code: 'ACT-QF' },
    { keywords: ['double disadvantage'], code: 'ACT-DD' },
    { keywords: ['10x10', 'retreat'], code: 'ACT-10' },
    { keywords: ['sxsw', 'south by southwest'], code: 'ACT-SX' },
    { keywords: ['westpac'], code: 'ACT-WE' },
    { keywords: ['bali'], code: 'ACT-BR' },
    { keywords: ['mingaminga', 'ranger'], code: 'ACT-MR' },
    { keywords: ['uncle allan'], code: 'ACT-UA' },
    { keywords: ['storm stories'], code: 'ACT-SS' },
    { keywords: ['fishers', 'oyster'], code: 'ACT-FO' },
    { keywords: ['contained'], code: 'ACT-CN' },
    { keywords: ['mounty yarns'], code: 'ACT-MY' },
    { keywords: ['sefa'], code: 'ACT-SE' },
    { keywords: ['murrup'], code: 'ACT-MU' },
    { keywords: ['oonchiumpa'], code: 'ACT-OO' },
    { keywords: ['rppp', 'precinct'], code: 'ACT-RP' },
    { keywords: ['elders room', 'hull river'], code: 'ACT-ER' },
  ];

  for (const { keywords, code } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { code, reason: `Keyword match: "${kw}" in contact name` };
      }
    }
  }

  // Also check line item descriptions
  if (lineItems && Array.isArray(lineItems)) {
    const allDescriptions = lineItems
      .map(li => (li.description || li.Description || '').toLowerCase())
      .join(' ');

    for (const { keywords, code } of KEYWORD_MAP) {
      for (const kw of keywords) {
        if (allDescriptions.includes(kw)) {
          return { code, reason: `Keyword match: "${kw}" in line item description` };
        }
      }
    }
  }

  return null;
}

// ============================================================================
// TIER 1: Vendor rule matching
// ============================================================================

function matchVendorRule(contactName, type) {
  if (!contactName) return null;
  const lower = contactName.toLowerCase();

  for (const rule of VENDOR_RULES) {
    // Type-specific rules
    if (rule.type && rule.type !== type) continue;

    // Check primary name
    if (lower.includes(rule.match.toLowerCase())) {
      return { code: rule.code, reason: rule.reason };
    }
    // Check aliases from DB
    if (rule.aliases) {
      for (const alias of rule.aliases) {
        if (lower.includes(alias.toLowerCase())) {
          return { code: rule.code, reason: rule.reason };
        }
      }
    }
  }
  return null;
}

// ============================================================================
// R&D ELIGIBILITY CHECK
// ============================================================================

function checkRdEligible(projectCode, contactName) {
  if (!projectCode || projectCode === 'SKIP') return false;

  // Project-level R&D eligibility
  if (RD_ELIGIBLE_PROJECTS.has(projectCode)) return true;

  // Software vendor R&D eligibility (even if tagged to non-R&D project, the software itself may be R&D)
  const lower = (contactName || '').toLowerCase();
  for (const vendor of RD_SOFTWARE_VENDORS) {
    if (lower.includes(vendor)) return true;
  }

  return false;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('FY26 AUTO-TAG TRANSACTIONS');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : REPORT_ONLY ? 'REPORT ONLY' : 'LIVE (will write tags)'}`);
  console.log(`Period: ${FY26_START} → ${FY26_END}`);
  console.log('='.repeat(70));
  console.log();

  // Load vendor rules from DB
  await loadVendorRules();

  // Fetch all FY26 transactions
  const { data: allTxns, error: allErr } = await supabase
    .from('xero_transactions')
    .select('id, xero_transaction_id, contact_name, type, total, date, project_code, project_code_source, line_items')
    .gte('date', FY26_START)
    .lte('date', FY26_END)
    .order('date', { ascending: true });

  if (allErr) {
    console.error('Failed to fetch transactions:', allErr);
    process.exit(1);
  }

  const total = allTxns.length;
  const alreadyTagged = allTxns.filter(t => t.project_code && t.project_code !== '');
  const untagged = allTxns.filter(t => !t.project_code || t.project_code === '');

  console.log(`Total FY26 transactions: ${total}`);
  console.log(`Already tagged: ${alreadyTagged.length} (${pct(alreadyTagged.length, total)})`);
  console.log(`Untagged: ${untagged.length} (${pct(untagged.length, total)})`);
  console.log();

  // Classify each untagged transaction
  const results = {
    autoTagged: [],    // Will be tagged
    skipped: [],       // Transfer/non-allocable
    flaggedReview: [], // Needs human review
    rdEligible: [],    // R&D eligible transactions (tagged + newly tagged)
  };

  for (const tx of untagged) {
    // Tier 1: Vendor rules
    let match = matchVendorRule(tx.contact_name, tx.type);

    // Tier 2: Xero tracking codes
    if (!match) {
      match = matchTrackingCodes(tx.line_items);
    }

    // Tier 3: Keyword matching
    if (!match) {
      match = matchKeywords(tx.contact_name, tx.line_items);
    }

    if (match) {
      if (match.code === 'SKIP') {
        results.skipped.push({ ...tx, reason: match.reason });
      } else {
        const rdEligible = checkRdEligible(match.code, tx.contact_name);
        results.autoTagged.push({
          id: tx.id,
          contact_name: tx.contact_name,
          type: tx.type,
          total: tx.total,
          date: tx.date,
          project_code: match.code,
          reason: match.reason,
          rd_eligible: rdEligible,
        });
        if (rdEligible) {
          results.rdEligible.push({ ...tx, project_code: match.code });
        }
      }
    } else {
      // Categorize for review
      const category = categorizeForReview(tx);
      results.flaggedReview.push({ ...tx, reviewCategory: category });
    }
  }

  // Also check already-tagged for R&D eligibility
  for (const tx of alreadyTagged) {
    if (checkRdEligible(tx.project_code, tx.contact_name)) {
      results.rdEligible.push(tx);
    }
  }

  // ========== REPORT ==========
  printReport(results, total, alreadyTagged.length, untagged.length);

  // ========== WRITE ==========
  if (!DRY_RUN && !REPORT_ONLY && results.autoTagged.length > 0) {
    console.log('\nApplying tags...');
    let written = 0;
    let errors = 0;

    // Batch by 50
    for (let i = 0; i < results.autoTagged.length; i += 50) {
      const batch = results.autoTagged.slice(i, i + 50);

      for (const tx of batch) {
        const { error } = await supabase
          .from('xero_transactions')
          .update({
            project_code: tx.project_code,
            project_code_source: 'auto-fy26-review',
          })
          .eq('id', tx.id);

        if (error) {
          console.error(`  Error tagging ${tx.id}: ${error.message}`);
          errors++;
        } else {
          written++;
        }
      }

      process.stdout.write(`  ${Math.min(i + 50, results.autoTagged.length)}/${results.autoTagged.length}\r`);
    }

    console.log(`\nDone: ${written} tagged, ${errors} errors`);

    // Final coverage
    const newTagged = alreadyTagged.length + written;
    console.log(`\nNew coverage: ${newTagged}/${total} (${pct(newTagged, total)})`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: No changes written. Remove --dry-run to apply. ---');
  }
}

// ============================================================================
// REVIEW CATEGORIZATION
// ============================================================================

function categorizeForReview(tx) {
  const name = (tx.contact_name || '').toLowerCase();
  const amount = Math.abs(Number(tx.total) || 0);

  // Possible personal (food, cafes, entertainment)
  const personalKeywords = ['cafe', 'coffee', 'restaurant', 'bar', 'pub', 'mcdonalds',
    'kfc', 'subway', 'dominos', 'pizza', 'sushi', 'thai', 'chinese',
    'indian', 'noodle', 'burger', 'chicken', 'bakery', 'gelato',
    'cinema', 'netflix', 'spotify', 'gym', 'fitness'];
  for (const kw of personalKeywords) {
    if (name.includes(kw)) return 'possible_personal';
  }

  // Needs receipt (SPEND > $50 without clear vendor)
  if (tx.type === 'SPEND' && amount > 50 && !tx.contact_name) {
    return 'needs_receipt';
  }

  // Unknown vendor
  if (!tx.contact_name || tx.contact_name === '(No contact)') {
    return 'unknown_vendor';
  }

  // Needs project assignment — known vendor but unclear project
  return 'needs_project';
}

// ============================================================================
// REPORTING
// ============================================================================

function printReport(results, total, alreadyTagged, untaggedCount) {
  const { autoTagged, skipped, flaggedReview, rdEligible } = results;

  console.log('\n' + '='.repeat(70));
  console.log('AUTO-TAG RESULTS');
  console.log('='.repeat(70));

  // Summary
  const newTagged = alreadyTagged + autoTagged.length;
  console.log(`\nWill auto-tag: ${autoTagged.length} transactions`);
  console.log(`Skipped (transfers): ${skipped.length}`);
  console.log(`Flagged for review: ${flaggedReview.length}`);
  console.log(`\nProjected coverage: ${alreadyTagged} + ${autoTagged.length} = ${newTagged}/${total} (${pct(newTagged, total)})`);

  // Auto-tagged breakdown by project
  console.log('\n--- Auto-Tag Breakdown by Project ---');
  const byProject = {};
  for (const tx of autoTagged) {
    if (!byProject[tx.project_code]) {
      byProject[tx.project_code] = { count: 0, total: 0, reasons: new Set() };
    }
    byProject[tx.project_code].count++;
    byProject[tx.project_code].total += Math.abs(Number(tx.total) || 0);
    byProject[tx.project_code].reasons.add(tx.reason);
  }

  const sortedProjects = Object.entries(byProject).sort((a, b) => b[1].count - a[1].count);
  for (const [code, data] of sortedProjects) {
    const name = PROJECT_CODES.projects[code]?.name || code;
    console.log(`  ${code.padEnd(8)} ${name.padEnd(30)} ${String(data.count).padStart(5)} txns  $${Math.round(data.total).toLocaleString().padStart(10)}`);
    for (const r of data.reasons) {
      console.log(`           └─ ${r}`);
    }
  }

  // Flagged for review breakdown
  console.log('\n--- Flagged for Review ---');
  const reviewCats = {};
  for (const tx of flaggedReview) {
    const cat = tx.reviewCategory;
    if (!reviewCats[cat]) reviewCats[cat] = { count: 0, total: 0, samples: [] };
    reviewCats[cat].count++;
    reviewCats[cat].total += Math.abs(Number(tx.total) || 0);
    if (reviewCats[cat].samples.length < 5) {
      reviewCats[cat].samples.push(`${tx.contact_name || '(none)'} — $${Math.abs(Number(tx.total)).toFixed(2)} (${tx.date})`);
    }
  }

  const categoryLabels = {
    needs_project: 'Needs Project Assignment',
    needs_receipt: 'Needs Receipt (SPEND >$50)',
    possible_personal: 'Possible Personal',
    unknown_vendor: 'Unknown Vendor',
  };

  for (const [cat, data] of Object.entries(reviewCats)) {
    console.log(`\n  ${categoryLabels[cat] || cat}: ${data.count} txns ($${Math.round(data.total).toLocaleString()})`);
    for (const s of data.samples) {
      console.log(`    • ${s}`);
    }
    if (data.count > 5) console.log(`    ... and ${data.count - 5} more`);
  }

  // R&D Summary
  console.log('\n--- R&D Tax Incentive Summary ---');
  const rdByProject = {};
  let rdTotal = 0;
  for (const tx of rdEligible) {
    const code = tx.project_code;
    if (!rdByProject[code]) rdByProject[code] = { count: 0, total: 0 };
    const amount = Math.abs(Number(tx.total) || 0);
    rdByProject[code].count++;
    rdByProject[code].total += amount;
    rdTotal += amount;
  }

  for (const [code, data] of Object.entries(rdByProject).sort((a, b) => b[1].total - a[1].total)) {
    const name = PROJECT_CODES.projects[code]?.name || code;
    const rdType = ['ACT-EL', 'ACT-IN'].includes(code) ? 'Core' : 'Supporting';
    console.log(`  ${code.padEnd(8)} ${name.padEnd(30)} ${rdType.padEnd(12)} ${String(data.count).padStart(5)} txns  $${Math.round(data.total).toLocaleString().padStart(10)}`);
  }

  console.log(`\n  Total R&D-eligible spend: $${Math.round(rdTotal).toLocaleString()}`);
  console.log(`  43.5% refund potential:   $${Math.round(rdTotal * 0.435).toLocaleString()}`);
  if (rdTotal < 20000) {
    console.log(`  ⚠️  Below $20K minimum threshold — need $${Math.round(20000 - rdTotal).toLocaleString()} more R&D spend`);
    console.log(`     (Note: Labour/wages are the biggest R&D expense — not yet included)`);
  } else {
    console.log(`  ✅ Above $20K minimum threshold`);
  }

  // Missing receipts
  const needsReceipt = flaggedReview.filter(t => t.reviewCategory === 'needs_receipt');
  if (needsReceipt.length > 0) {
    console.log('\n--- Missing Receipts (SPEND >$50, no contact) ---');
    const sorted = needsReceipt.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    for (const tx of sorted.slice(0, 20)) {
      console.log(`  ${tx.date}  $${Math.abs(Number(tx.total)).toFixed(2).padStart(10)}  ${tx.contact_name || '(no contact)'}`);
    }
    if (sorted.length > 20) console.log(`  ... and ${sorted.length - 20} more`);
  }
}

function pct(n, total) {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
