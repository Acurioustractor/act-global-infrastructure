#!/usr/bin/env node
/**
 * R&D Eligibility Tagger — classifies Xero transactions + bills for AusIndustry
 * R&D Tax Incentive claims using a 4-tier conservative model.
 *
 * Why: the existing auto-tag-fy26-transactions.mjs marks everything on an R&D
 * project code as eligible, which catches all travel and meals on those trips.
 * AusIndustry would disallow most of it in audit. This tagger uses a stricter
 * model that's defensible at audit.
 *
 * The 4-tier model:
 *   1. CORE_RD       — Dev tools, cloud compute, AI APIs, software services.
 *                      These are the tools of the trade for building software
 *                      and ML products. Auto-tag eligible, high confidence.
 *   2. SUPPORTING_RD — Contractor work with clear dev scope when tagged to a
 *                      known R&D project. Physical prototyping materials for
 *                      R&D-purpose builds. Auto-tag eligible, medium confidence.
 *   3. REVIEW        — Travel, accommodation, mixed-use hardware, uncertain
 *                      contractor work. These require human review — the
 *                      classification depends on WHY the trip/purchase happened.
 *                      Default to ineligible; flag for Nic/accountant review.
 *   4. INELIGIBLE    — Bank fees, food, general utilities, owner drawings,
 *                      insurance, ATO payments. High confidence not R&D.
 *
 * Conservatism principle: we'd rather under-claim defensibly than over-claim
 * and get hit with a clawback + penalties in audit.
 *
 * Writes: rd_eligible + rd_category on xero_transactions (column exists).
 * For xero_invoices (no rd columns), we classify in-memory and include in
 * the report only — classifications for bills can be persisted later if needed.
 *
 * Output: thoughts/shared/reports/rd-eligibility-fy{yy}-{date}.md
 *
 * Usage:
 *   node scripts/tag-rd-eligibility.mjs              # dry run, FY26
 *   node scripts/tag-rd-eligibility.mjs --apply      # write rd_* to xero_transactions
 *   node scripts/tag-rd-eligibility.mjs --fy 26
 *   node scripts/tag-rd-eligibility.mjs --sample 20  # preview 20 classifications per tier
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FY = args.includes('--fy') ? parseInt(args[args.indexOf('--fy') + 1]) : 26;
const SAMPLE = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1]) : 0;

const fyStart = `${2000 + FY - 1}-07-01`;
const fyEnd = `${2000 + FY}-06-30`;

// ============================================================================
// CLASSIFICATION RULES
// ============================================================================

// Tier 1: CORE R&D — dev tools, cloud compute, AI APIs.
// These are "tools of the trade" for building software and ML products.
// Defensible as core R&D expenditure at audit.
const CORE_RD_PATTERNS = [
  // AI / LLM APIs
  'anthropic', 'claude.ai', 'openai', 'chatgpt', 'gemini', 'perplexity',
  'cognition ai', 'cursor ai', 'cursor', 'ideogram', 'firecrawl',
  'runway', 'midjourney', 'stability ai', 'replicate',

  // Dev tools
  'github', 'gitlab', 'bitbucket', 'linear',
  'vercel', 'netlify', 'cloudflare',
  'supabase', 'firebase', 'mongodb', 'planetscale', 'neon',
  'render', 'fly.io', 'railway',
  'sentry', 'logrocket', 'datadog', 'new relic',
  'warp', 'kiro', 'docker', 'jetbrains',

  // Design / prototyping
  'figma', 'framer', 'sketch',

  // Collaboration for dev work
  'notion labs', 'notion', 'linear app',

  // Password / secrets management for dev
  'bitwarden', '1password',

  // Stripe for dev billing / infra
  'stripe',

  // Google Cloud Platform (NOT Google Workspace — that's general ops)
  'google cloud', 'google ai studio', 'google ai',

  // AWS (dev infra)
  'amazon web services', 'aws',

  // Media/AI dev
  'descript', 'elevenlabs',

  // Webhosting for product dev
  'webflow',
];

// Tier 2: SUPPORTING R&D — contractor work + physical prototyping.
// These are eligible when tagged to a known R&D project code OR when the
// vendor is a known R&D partner.
// R&D project codes (based on ACT's taxonomy):
const RD_PROJECT_CODES = new Set([
  'ACT-EL',    // Empathy Ledger
  'ACT-IN',    // ALMA / Intelligence
  'ACT-JH',    // JusticeHub
  'ACT-GD',    // Goods marketplace
  'ACT-BCV',   // Black Cockatoo Valley tech
  'ACT-PS',    // PICC Photo Kiosk
  'ACT-CAMP',  // CAMPFIRE
  'ACT-HARV',  // The Harvest
]);

// Known R&D contractors (auto-classify as supporting even without project code)
const RD_CONTRACTOR_PATTERNS = [
  'samuel hafer',       // dev contractor (confirm scope with Nic)
  'defy manufacturing', // physical build partner for BCV
  'defy',
  'joseph kirmos',      // dev contractor
  'thais pupio design', // design for R&D products
  'oonchiumpa',         // research partnership
];

// Tier 4: INELIGIBLE — high confidence not R&D.
// Bank fees, food, general utilities, owner drawings, insurance, tax.
const INELIGIBLE_PATTERNS = [
  // Bank fees
  'nab', 'nab fee', 'bank fee', 'merchant fee', 'dishonour', 'interest charge',
  'international fee', 'fx margin', 'atm fee', 'card fee', 'account fee',
  'account keeping', 'service fee',

  // Food / dining
  'cafe', 'restaurant', 'bar ', 'bistro', 'kitchen', 'pizzeria', 'sushi',
  'thai ', 'indian ', 'italian', 'chinese', 'brewing', 'brewery', 'wine ',
  'coffee', 'espresso', 'bakery', 'patisserie', 'diner', 'eatery',
  'flight bar witta', 'bay leaf cafe', 'moffat beach brewing', 'the pocket',
  'maleny food', 'frank food', 'umu kitchen', 'hanuman', 'uncle don',
  'the rusty rabbit', 'fisher', 'liberty maleny', 'golosa', 'reddy express',
  'maleny rumble', 'lasseters centre', 'the source bulk', 'alsahwa',
  'sunshine coast council',

  // Tax / government / insurance / legal
  'australian taxation office', 'ato', 'elders insurance',
  'residential tenancies', 'queensland government', 'department of transport',

  // Grocery / general retail
  'iga', 'coles', 'woolworths', 'foodbank',

  // Shared accommodation / events (general, not R&D)
  'humanitix', 'the funding network',

  // Taxi / parking / general travel ground
  'gm taxipay', 'taxi receipt', 'yellow cabs', 'bridgeclimb',
  'sydney domestic airport', 't3 domestic airport', 'car park',
  'hinterland aviation', 'airnorth',
];

// Tier 3: REVIEW — travel, mixed hardware, uncertain contractors.
// These DEFAULT to ineligible but get flagged for Nic/accountant review.
const REVIEW_PATTERNS = [
  // Travel (might be R&D-supporting if clearly tied to R&D activity)
  'qantas', 'virgin', 'uber', 'thrifty', 'avis', 'booking.com',
  'airbnb', 'qantas group accommodation', 'sunshine glamping',
  'loadshift', 'peak up transport',

  // General hardware / supplies (R&D if for prototyping, otherwise no)
  'bunnings', 'sydney tools', 'kennards hire', 'stratco', 'diggermate',
  'harvey norman', 'supercheap auto', 'bcf ', 'officeworks',
  'hatch electrical', 'allclass', 'only domains',
  'maleny hardware', 'maleny landscaping', 'the bolt king',

  // Large one-off purchases (review case-by-case)
  'zinus', '1300 washer', 'portabl', 'izzy mobile',
  'clearview towing', 'byo group',

  // Contractors without clear scope (Chris Witta, etc.)
  'chris witta', 'talbot sayer', 'palm island barge', 'cath mansfield',
  'aleisha j keating', 'suzanne anderson', 'ruma films',

  // Utilities that COULD support R&D operations
  'telstra', 'belong', 'agl', 'qantas insurance',

  // Specific services
  'tj', 'pure pest', 'mighty networks', 'linkedin', 'squarespace',
  'xero', 'xero australia', 'dialpad', 'highlevel', 'zapier',
  'paypal', 'docplay', 'apple',

  // Software that's general productivity, not dev-specific
  'google workspace', 'google', // review — G Workspace is general ops, GCP is R&D
];

function classify(contactName, projectCode, lineItems) {
  const name = (contactName || '').toLowerCase().trim();
  const proj = projectCode || null;

  // Skip BASEXCLUDED (owner drawings) entirely
  if (Array.isArray(lineItems) && lineItems.length > 0 &&
      lineItems.every(li => li?.tax_type === 'BASEXCLUDED')) {
    return { tier: 'SKIP', eligible: false, category: null, reason: 'BASEXCLUDED owner drawing' };
  }

  // TIER 4: INELIGIBLE (high confidence not R&D)
  for (const p of INELIGIBLE_PATTERNS) {
    if (name.includes(p)) {
      return { tier: 'INELIGIBLE', eligible: false, category: null, reason: `matches "${p}"` };
    }
  }

  // TIER 1: CORE R&D (software/dev tools, high confidence eligible)
  for (const p of CORE_RD_PATTERNS) {
    if (name.includes(p)) {
      return { tier: 'CORE_RD', eligible: true, category: 'core', reason: `core R&D tool: "${p}"` };
    }
  }

  // TIER 2: SUPPORTING R&D (contractors tagged to R&D project, or known R&D partners)
  for (const p of RD_CONTRACTOR_PATTERNS) {
    if (name.includes(p)) {
      if (proj && RD_PROJECT_CODES.has(proj)) {
        return { tier: 'SUPPORTING_RD', eligible: true, category: 'supporting', reason: `R&D contractor on ${proj}` };
      }
      return { tier: 'REVIEW', eligible: false, category: 'review', reason: `R&D contractor but no project code — review needed` };
    }
  }

  // TIER 3: REVIEW (travel, mixed hardware, uncertain)
  for (const p of REVIEW_PATTERNS) {
    if (name.includes(p)) {
      return { tier: 'REVIEW', eligible: false, category: 'review', reason: `needs human review: "${p}"` };
    }
  }

  // UNCLASSIFIED: default to review (conservative)
  return { tier: 'UNCLASSIFIED', eligible: false, category: 'review', reason: 'no rule match — review needed' };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`=== R&D Eligibility Tagger — FY${FY} ===`);
  console.log(`Range: ${fyStart} to ${fyEnd}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writes to xero_transactions)' : 'dry run'}\n`);

  // Load SPEND transactions (AUTHORISED, non-BASEXCLUDED), paginated
  const spend = [];
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, project_code, line_items, rd_eligible, rd_category, bank_account')
      .eq('status', 'AUTHORISED')
      .eq('type', 'SPEND')
      .gte('date', fyStart).lte('date', fyEnd)
      .order('total', { ascending: false })
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (error) { console.error('spend err:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    spend.push(...data);
    if (data.length < 1000) break;
  }

  // Load ACCPAY bills, paginated
  const bills = [];
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from('xero_invoices')
      .select('xero_id, contact_name, total, date, project_code, line_items, invoice_number, status')
      .eq('type', 'ACCPAY')
      .in('status', ['PAID', 'AUTHORISED'])
      .gte('date', fyStart).lte('date', fyEnd)
      .order('total', { ascending: false })
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (error) { console.error('bills err:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    bills.push(...data);
    if (data.length < 1000) break;
  }

  console.log(`Loaded ${spend.length} SPEND txns + ${bills.length} ACCPAY bills\n`);

  // Classify both
  const tiers = {
    CORE_RD: { rows: [], total: 0 },
    SUPPORTING_RD: { rows: [], total: 0 },
    REVIEW: { rows: [], total: 0 },
    INELIGIBLE: { rows: [], total: 0 },
    UNCLASSIFIED: { rows: [], total: 0 },
    SKIP: { rows: [], total: 0 },
  };

  for (const tx of spend) {
    const c = classify(tx.contact_name, tx.project_code, tx.line_items);
    const row = { ...tx, _classification: c, _source: 'spend' };
    tiers[c.tier].rows.push(row);
    if (c.tier !== 'SKIP') tiers[c.tier].total += Math.abs(Number(tx.total));
  }
  for (const bill of bills) {
    const c = classify(bill.contact_name, bill.project_code, bill.line_items);
    const row = { ...bill, _classification: c, _source: 'bill' };
    tiers[c.tier].rows.push(row);
    if (c.tier !== 'SKIP') tiers[c.tier].total += Math.abs(Number(bill.total));
  }

  // ========================================================================
  // REPORT
  // ========================================================================
  const totalEligible = tiers.CORE_RD.total + tiers.SUPPORTING_RD.total;
  const estimatedRefund = totalEligible * 0.435;
  const totalAll = Object.values(tiers).reduce((s, t) => s + t.total, 0);

  console.log('=== Classification Summary ===\n');
  const rows = [
    ['CORE_RD',      tiers.CORE_RD.rows.length,      tiers.CORE_RD.total,      '🟢 eligible (high confidence)'],
    ['SUPPORTING_RD',tiers.SUPPORTING_RD.rows.length,tiers.SUPPORTING_RD.total,'🟢 eligible (medium confidence)'],
    ['REVIEW',       tiers.REVIEW.rows.length,       tiers.REVIEW.total,       '🟡 flagged for human review'],
    ['UNCLASSIFIED', tiers.UNCLASSIFIED.rows.length, tiers.UNCLASSIFIED.total, '🟡 no rule match — review'],
    ['INELIGIBLE',   tiers.INELIGIBLE.rows.length,   tiers.INELIGIBLE.total,   '🔴 not R&D'],
    ['SKIP',         tiers.SKIP.rows.length,         0,                        '⚪ BASEXCLUDED (excluded)'],
  ];
  for (const [tier, n, total, label] of rows) {
    console.log(`  ${tier.padEnd(16)} ${String(n).padStart(5)} txns  $${total.toFixed(2).padStart(12)}  ${label}`);
  }
  console.log(`\n  TOTAL (non-skip):   ${(spend.length + bills.length - tiers.SKIP.rows.length).toString().padStart(5)} txns  $${totalAll.toFixed(2).padStart(12)}`);
  console.log(`\n  🎯 Confirmed R&D eligible:  $${totalEligible.toFixed(2)}`);
  console.log(`  🎯 Estimated refund (43.5%): $${estimatedRefund.toFixed(2)}`);
  console.log(`  ⚠ Plus review pile:         $${(tiers.REVIEW.total + tiers.UNCLASSIFIED.total).toFixed(2)} (could add ~$${((tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.435 * 0.3).toFixed(2)} if ~30% approved)`);

  // Sample mode — show N per tier
  if (SAMPLE > 0) {
    console.log(`\n=== Sample (first ${SAMPLE} per tier) ===`);
    for (const [tier, bucket] of Object.entries(tiers)) {
      if (tier === 'SKIP') continue;
      console.log(`\n  ${tier}:`);
      bucket.rows.slice(0, SAMPLE).forEach(r => {
        console.log(`    $${String(Math.abs(Number(r.total))).padStart(9)}  ${(r.contact_name || '?').slice(0,30).padEnd(30)}  ${r._classification.reason}`);
      });
    }
  }

  // ========================================================================
  // APPLY: write rd_eligible + rd_category back to xero_transactions
  // ========================================================================
  if (APPLY) {
    console.log('\n=== Applying to xero_transactions ===');
    // Batch updates: 100 per query
    const updates = [];
    for (const tx of spend) {
      const c = classify(tx.contact_name, tx.project_code, tx.line_items);
      if (c.tier === 'SKIP') continue;
      updates.push({
        id: tx.xero_transaction_id,
        rd_eligible: c.eligible,
        rd_category: c.category,
      });
    }
    console.log(`  Updating ${updates.length} xero_transactions rows...`);

    let applied = 0;
    for (let i = 0; i < updates.length; i += 200) {
      const batch = updates.slice(i, i + 200);
      // Supabase doesn't support bulk upsert across different values easily.
      // Group by (eligible, category) and update in batches.
      const groups = {};
      for (const u of batch) {
        const k = `${u.rd_eligible}|${u.rd_category || 'null'}`;
        if (!groups[k]) groups[k] = [];
        groups[k].push(u.id);
      }
      for (const [key, ids] of Object.entries(groups)) {
        const [eligibleStr, catStr] = key.split('|');
        const { error } = await sb.from('xero_transactions')
          .update({
            rd_eligible: eligibleStr === 'true',
            rd_category: catStr === 'null' ? null : catStr,
          })
          .in('xero_transaction_id', ids);
        if (error) { console.error('  UPDATE FAIL:', error.message); break; }
        applied += ids.length;
      }
      if (i % 1000 === 0 && i > 0) console.log(`    ${i}/${updates.length}`);
    }
    console.log(`  ✅ Applied: ${applied}/${updates.length}`);
  } else {
    console.log('\n(dry run — pass --apply to write rd_eligible to xero_transactions)');
  }

  // ========================================================================
  // MARKDOWN REPORT
  // ========================================================================
  const tierLabels = {
    CORE_RD: '🟢 CORE R&D (high confidence eligible)',
    SUPPORTING_RD: '🟢 SUPPORTING R&D (medium confidence eligible)',
    REVIEW: '🟡 REVIEW (flagged for human decision)',
    UNCLASSIFIED: '🟡 UNCLASSIFIED (no rule match — review)',
    INELIGIBLE: '🔴 INELIGIBLE (high confidence not R&D)',
  };

  const lines = [];
  lines.push(`# R&D Eligibility Classification — FY${FY}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Mode:** ${APPLY ? 'APPLIED to xero_transactions' : 'dry run'}`);
  lines.push(`**Range:** ${fyStart} to ${fyEnd}`);
  lines.push(`**Methodology:** Conservative 4-tier model. CORE = dev tools/cloud/AI APIs. SUPPORTING = contractor work on R&D projects. REVIEW = travel/hardware/mixed (default ineligible). INELIGIBLE = bank fees/food/general utilities.`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Tier | Count | Value | Status |`);
  lines.push(`|---|---:|---:|---|`);
  for (const [tier, n, total, label] of rows) {
    if (tier === 'SKIP') continue;
    lines.push(`| ${tier} | ${n} | $${total.toFixed(2)} | ${label} |`);
  }
  lines.push(`| **TOTAL (non-skip)** | **${spend.length + bills.length - tiers.SKIP.rows.length}** | **$${totalAll.toFixed(2)}** | |`);
  lines.push(``);
  lines.push(`## R&D claim estimate`);
  lines.push(``);
  lines.push(`**Confirmed R&D eligible:** $${totalEligible.toFixed(2)}`);
  lines.push(`**Estimated refund at 43.5%:** **$${estimatedRefund.toFixed(2)}**`);
  lines.push(``);
  lines.push(`**Review pile:** $${(tiers.REVIEW.total + tiers.UNCLASSIFIED.total).toFixed(2)} in ${tiers.REVIEW.rows.length + tiers.UNCLASSIFIED.rows.length} transactions`);
  lines.push(`If 30% of review pile is approved by Nic/accountant, refund adds ~$${((tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.435 * 0.3).toFixed(2)}`);
  lines.push(``);

  // Per-tier vendor breakdowns
  for (const [tier, label] of Object.entries(tierLabels)) {
    const bucket = tiers[tier];
    if (bucket.rows.length === 0) continue;
    lines.push(`## ${label}`);
    lines.push(``);
    // Group by vendor
    const byVendor = {};
    for (const r of bucket.rows) {
      const v = r.contact_name || '?';
      if (!byVendor[v]) byVendor[v] = { n: 0, total: 0, samples: [] };
      byVendor[v].n++;
      byVendor[v].total += Math.abs(Number(r.total));
      if (byVendor[v].samples.length < 3) byVendor[v].samples.push(r);
    }
    const sorted = Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total);
    lines.push(`| Vendor | Txns | Value | Reason |`);
    lines.push(`|---|---:|---:|---|`);
    for (const [v, d] of sorted.slice(0, 30)) {
      const reason = d.samples[0]._classification.reason;
      lines.push(`| ${v} | ${d.n} | $${d.total.toFixed(2)} | ${reason} |`);
    }
    if (sorted.length > 30) lines.push(`| ... | | | ${sorted.length - 30} more vendors |`);
    lines.push(``);
  }

  lines.push(`## Review workflow`);
  lines.push(`For the REVIEW + UNCLASSIFIED pile: Nic/accountant should go through the top vendors by value and for each one, answer:`);
  lines.push(`1. Was this transaction for an R&D activity? (Core: experimental dev work. Supporting: directly supporting that work.)`);
  lines.push(`2. If yes, promote to CORE_RD or SUPPORTING_RD.`);
  lines.push(`3. If no, confirm INELIGIBLE.`);
  lines.push(``);
  lines.push(`Priority order: start with the highest-value items first (each line >$5k has the most leverage).`);
  lines.push(``);
  lines.push(`## Conservative estimate vs optimistic estimate`);
  lines.push(`| Scenario | Eligible | Refund |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| Conservative (CORE + SUPPORTING only) | $${totalEligible.toFixed(2)} | **$${estimatedRefund.toFixed(2)}** |`);
  lines.push(`| +30% of REVIEW approved | $${(totalEligible + (tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.3).toFixed(2)} | $${((totalEligible + (tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.3) * 0.435).toFixed(2)} |`);
  lines.push(`| +50% of REVIEW approved | $${(totalEligible + (tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.5).toFixed(2)} | $${((totalEligible + (tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.5) * 0.435).toFixed(2)} |`);
  lines.push(`| Aggressive (100% of REVIEW approved) | $${(totalEligible + tiers.REVIEW.total + tiers.UNCLASSIFIED.total).toFixed(2)} | $${((totalEligible + tiers.REVIEW.total + tiers.UNCLASSIFIED.total) * 0.435).toFixed(2)} |`);
  lines.push(``);
  lines.push(`The conservative number is what you should quote in conversations. The review pile is upside if Nic/accountant can defend specific items.`);

  const reportPath = `thoughts/shared/reports/rd-eligibility-fy${FY}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
