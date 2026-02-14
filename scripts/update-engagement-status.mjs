#!/usr/bin/env node
/**
 * Auto-update GHL contact engagement_status based on relationship signals
 *
 * Promotes contacts from default 'lead' to appropriate status:
 *   active    — temp 60+ AND touchpoints > 5
 *   prospect  — has open opportunity OR (temp 30-59 AND touchpoints > 2)
 *   lead      — default / new contacts
 *   lapsed    — temp 0, days_since > 180, no open opps, had touchpoints > 0
 *   opted-out — untouched (manual only)
 *
 * Never demotes: active -> prospect, prospect -> lead, etc.
 * Only promotes up the ladder or marks as lapsed.
 *
 * Usage:
 *   node scripts/update-engagement-status.mjs           # Dry run
 *   node scripts/update-engagement-status.mjs --apply   # Update DB
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const applyMode = process.argv.includes('--apply');

// Status hierarchy (higher index = higher rank)
const STATUS_RANK = {
  'lead': 0,
  'prospect': 1,
  'active': 2,
  'lapsed': -1,    // special: only from lead/null
  'opted-out': 99, // never auto-change
  'dormant': -2,   // never auto-change
};

console.log(`\n=== Contact Engagement Status Update ===`);
console.log(`Mode: ${applyMode ? 'APPLY' : 'DRY RUN'}\n`);

// Helper: fetch all rows (bypasses 1000 row default limit)
async function fetchAll(table, select, filters = {}) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    for (const [key, val] of Object.entries(filters)) {
      query = query.eq(key, val);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// 1. Load all contacts
const contacts = await fetchAll('ghl_contacts', 'ghl_id, full_name, email, company_name, engagement_status, tags');
console.log(`Loaded ${contacts.length} contacts`);

// 2. Load relationship health
const health = await fetchAll('relationship_health', 'ghl_contact_id, temperature, days_since_contact, total_touchpoints, lcaa_stage');

const healthMap = new Map();
for (const h of health) {
  healthMap.set(h.ghl_contact_id, h);
}
console.log(`Loaded ${health.length} relationship health records`);

// 3. Load open opportunities
const { data: opps, error: oppsErr } = await supabase
  .from('ghl_opportunities')
  .select('ghl_contact_id, name, monetary_value')
  .eq('status', 'open');

if (oppsErr) {
  console.error('Failed to load opportunities:', oppsErr.message);
  process.exit(1);
}

const oppsMap = new Map();
for (const o of opps) {
  if (!o.ghl_contact_id) continue;
  const existing = oppsMap.get(o.ghl_contact_id) || [];
  existing.push(o);
  oppsMap.set(o.ghl_contact_id, existing);
}
console.log(`Loaded ${opps.length} open opportunities across ${oppsMap.size} contacts\n`);

// 4. Compute new status for each contact
const changes = [];
const stats = { active: 0, prospect: 0, lead: 0, lapsed: 0, skipped: 0, unchanged: 0 };

for (const contact of contacts) {
  const current = contact.engagement_status || 'lead';

  // Never touch opted-out or dormant contacts
  if (current === 'opted-out' || current === 'dormant') {
    stats.skipped++;
    continue;
  }

  const rh = healthMap.get(contact.ghl_id);
  const contactOpps = oppsMap.get(contact.ghl_id) || [];
  const hasOpenOpp = contactOpps.length > 0;

  // Compute target status
  let target = 'lead';

  if (rh) {
    const { temperature, days_since_contact, total_touchpoints } = rh;

    // Active: warm + engaged
    if (temperature >= 60 && total_touchpoints > 5) {
      target = 'active';
    }
    // Prospect: has deal OR meaningfully engaged
    else if (hasOpenOpp || (temperature >= 30 && total_touchpoints > 2)) {
      target = 'prospect';
    }
    // Lapsed: was engaged but gone cold for 6+ months with no deals
    else if (
      temperature === 0 &&
      days_since_contact > 180 &&
      total_touchpoints > 0 &&
      !hasOpenOpp
    ) {
      target = 'lapsed';
    }
  } else if (hasOpenOpp) {
    // No health record but has open deal
    target = 'prospect';
  }

  // Promotion-only rule: never demote active -> prospect, prospect -> lead
  // Exception: lapsed is allowed from lead
  const currentRank = STATUS_RANK[current] ?? 0;
  const targetRank = STATUS_RANK[target] ?? 0;

  if (target === 'lapsed' && current === 'lead') {
    // Allow lapse from lead
  } else if (targetRank <= currentRank) {
    stats.unchanged++;
    continue;
  }

  if (target === current) {
    stats.unchanged++;
    continue;
  }

  changes.push({
    ghl_id: contact.ghl_id,
    name: contact.full_name,
    company: contact.company_name,
    from: current,
    to: target,
    temp: rh?.temperature ?? null,
    touchpoints: rh?.total_touchpoints ?? 0,
    opps: contactOpps.length,
  });
  stats[target]++;
}

// 5. Report
console.log(`--- Changes Summary ---`);
console.log(`  -> active:   ${stats.active}`);
console.log(`  -> prospect: ${stats.prospect}`);
console.log(`  -> lapsed:   ${stats.lapsed}`);
console.log(`  unchanged:   ${stats.unchanged}`);
console.log(`  skipped:     ${stats.skipped}`);
console.log(`  total changes: ${changes.length}\n`);

// Show changes by category
const byTarget = {};
for (const c of changes) {
  if (!byTarget[c.to]) byTarget[c.to] = [];
  byTarget[c.to].push(c);
}

for (const [status, items] of Object.entries(byTarget)) {
  console.log(`\n--- Promoting to ${status.toUpperCase()} (${items.length}) ---`);
  for (const item of items.slice(0, 15)) {
    const parts = [
      `  ${item.name}`.padEnd(30),
      item.company ? `(${item.company})`.padEnd(25) : ''.padEnd(25),
      `${item.from} -> ${item.to}`,
      item.temp !== null ? `temp=${item.temp}` : '',
      `tp=${item.touchpoints}`,
      item.opps > 0 ? `opps=${item.opps}` : '',
    ].filter(Boolean);
    console.log(parts.join('  '));
  }
  if (items.length > 15) {
    console.log(`  ... and ${items.length - 15} more`);
  }
}

// 6. Apply if requested
if (applyMode && changes.length > 0) {
  console.log(`\nApplying ${changes.length} changes...`);

  // Batch by target status
  for (const [status, items] of Object.entries(byTarget)) {
    const ids = items.map(i => i.ghl_id);

    // Update in batches of 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase
        .from('ghl_contacts')
        .update({ engagement_status: status })
        .in('ghl_id', batch);

      if (error) {
        console.error(`  Error updating batch to ${status}:`, error.message);
      } else {
        console.log(`  Updated ${batch.length} contacts to ${status}`);
      }
    }
  }

  console.log('\nDone!');
} else if (changes.length > 0) {
  console.log(`\nDry run complete. Run with --apply to update ${changes.length} contacts.`);
} else {
  console.log('\nNo changes needed.');
}
