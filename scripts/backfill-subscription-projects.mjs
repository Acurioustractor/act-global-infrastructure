#!/usr/bin/env node
/**
 * Subscription Project Tagger: Auto-assign project_codes to subscriptions
 *
 * Matches vendor_name against dext-supplier-rules.json aliases.
 * Defaults to ACT-IN for infrastructure subscriptions.
 *
 * Usage:
 *   node scripts/backfill-subscription-projects.mjs           # Dry run
 *   node scripts/backfill-subscription-projects.mjs --apply    # Apply changes
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

const supplierRules = JSON.parse(readFileSync(join(__dirname, '../config/dext-supplier-rules.json'), 'utf8'));
const applyMode = process.argv.includes('--apply');

// Build vendor → project_code map from supplier rules
function buildVendorMap() {
  const map = new Map(); // lowercase alias → tracking code

  for (const category of Object.values(supplierRules.auto_publish_rules || {})) {
    for (const vendor of category.vendors || []) {
      if (vendor.tracking && vendor.tracking !== 'ASK_USER') {
        const aliases = [vendor.name, ...(vendor.aliases || [])].map(a => a.toLowerCase());
        for (const alias of aliases) {
          map.set(alias, vendor.tracking);
        }
      }
    }
  }

  // Bank fees
  for (const vendor of supplierRules.bank_fees?.vendors || []) {
    if (vendor.tracking) {
      const aliases = [vendor.name, ...(vendor.aliases || [])].map(a => a.toLowerCase());
      for (const alias of aliases) {
        map.set(alias, vendor.tracking);
      }
    }
  }

  return map;
}

function matchVendor(vendorName, vendorMap) {
  if (!vendorName) return null;
  const lower = vendorName.toLowerCase().trim();

  // Exact match
  if (vendorMap.has(lower)) return vendorMap.get(lower);

  // Partial match - check if vendor name contains any alias
  for (const [alias, code] of vendorMap) {
    if (lower.includes(alias) || alias.includes(lower)) {
      return code;
    }
  }

  return null;
}

async function main() {
  console.log(`\n📦 Subscription Project Tagger ${applyMode ? '(APPLY MODE)' : '(DRY RUN)'}\n`);

  const vendorMap = buildVendorMap();

  // Fetch active subscriptions with empty or null project_codes
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, vendor_name, category, amount, billing_cycle, project_codes')
    .eq('account_status', 'active');

  if (error) {
    console.error('Error fetching subscriptions:', error.message);
    process.exit(1);
  }

  const untagged = subs.filter(s => !s.project_codes || s.project_codes.length === 0);
  const alreadyTagged = subs.filter(s => s.project_codes && s.project_codes.length > 0);

  console.log(`Total active: ${subs.length}, Already tagged: ${alreadyTagged.length}, Untagged: ${untagged.length}\n`);

  const updates = [];
  const noMatch = [];

  for (const sub of untagged) {
    const matched = matchVendor(sub.vendor_name, vendorMap);
    const projectCode = matched || 'ACT-IN'; // Default to infrastructure

    updates.push({
      id: sub.id,
      vendorName: sub.vendor_name,
      projectCode,
      source: matched ? 'vendor-match' : 'default-infra',
      amount: sub.amount,
    });
  }

  if (updates.length > 0) {
    console.log('Assignments:');
    for (const u of updates) {
      const amt = u.amount ? `$${Math.abs(u.amount).toFixed(2)}` : '-';
      console.log(`  ${u.projectCode} ← "${u.vendorName}" (${amt}) [${u.source}]`);
    }
    console.log();
  }

  console.log(`Summary: ${updates.length} to tag, ${alreadyTagged.length} already tagged\n`);

  if (applyMode && updates.length > 0) {
    console.log('Applying...');
    let applied = 0;
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ project_codes: [u.projectCode] })
        .eq('id', u.id);

      if (updateError) {
        console.error(`  Failed "${u.vendorName}": ${updateError.message}`);
      } else {
        applied++;
      }
    }
    console.log(`✅ Applied ${applied}/${updates.length}\n`);
  } else if (!applyMode && updates.length > 0) {
    console.log('Run with --apply to write changes.\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
