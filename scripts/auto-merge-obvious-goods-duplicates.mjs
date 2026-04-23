#!/usr/bin/env node
/**
 * Auto-merge obvious Goods contact duplicates.
 *
 * Conservative rules — only merges the clearest cases:
 *
 *   TIER 1 — auto-created-from-xero orphans (my seed-script artifacts)
 *     If a Goods contact has tag 'auto-created-from-xero' AND another
 *     Goods contact exists with the same company_name (case-insensitive)
 *     that has richer data (email, phone, or real first+last name),
 *     merge the orphan into the rich contact.
 *
 *   TIER 2 — exact email duplicates
 *     Two Goods contacts with the exact same (non-null, non-empty) email
 *     are the same person. Keep the one with more tags + longer
 *     communication history.
 *
 *   TIER 3 — exact full_name duplicates with matching company
 *     Two Goods contacts with the same full_name AND same company_name,
 *     keep the one with an email. Common pattern from email auto-ingest
 *     creating name-only stubs.
 *
 * Everything else stays for human review in the /goods UI.
 *
 * Usage:
 *   node scripts/auto-merge-obvious-goods-duplicates.mjs --dry-run   # plan
 *   node scripts/auto-merge-obvious-goods-duplicates.mjs             # execute
 *
 * Uses the command-center merge API (localhost:3010) so FK handling
 * stays consistent. Assumes dev server is running.
 */

import { createClient } from '@supabase/supabase-js';
import './lib/load-env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const MERGE_API = process.env.COMMAND_CENTER_URL || 'http://localhost:3010';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function scoreContactRichness(c) {
  let score = 0;
  if (c.email && c.email.trim()) score += 10;
  if (c.phone && c.phone.trim()) score += 5;
  if (c.first_name && c.first_name !== 'Accounts') score += 3;
  if (c.last_name) score += 2;
  if (c.website) score += 2;
  if (c.company_name) score += 1;
  score += (c.tags?.length ?? 0);
  score += (c.stories_count ?? 0) * 2;
  score -= (c.tags?.includes('auto-created-from-xero') ? 20 : 0);
  if (c.last_contact_date) score += 5;
  return score;
}

async function pickKeeper(candidates) {
  const scored = candidates.map(c => ({ ...c, _score: scoreContactRichness(c) }));
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

async function mergeViaApi(keepId, mergeIds) {
  const res = await fetch(`${MERGE_API}/api/goods/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keepId, mergeIds }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`merge API ${res.status}: ${body.error ?? 'unknown'}`);
  return body;
}

async function main() {
  console.log(`[auto-merge] mode=${DRY_RUN ? 'dry-run' : 'live'} api=${MERGE_API}`);

  // ━━━ Load all Goods-tagged contacts
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, phone, company_name, website, tags, stories_count, last_contact_date, created_at')
    .contains('tags', ['goods']);

  if (error) throw error;
  console.log(`[auto-merge] ${contacts.length} Goods-tagged contacts loaded`);

  const merges = [];  // {tier, keepId, mergeIds, reason}
  const consumed = new Set();  // ghl_ids already slated for merge

  // ━━━ TIER 1: auto-created-from-xero orphans
  const orphans = contacts.filter(c => c.tags?.includes('auto-created-from-xero'));
  for (const orphan of orphans) {
    if (consumed.has(orphan.ghl_id)) continue;
    const orgName = (orphan.last_name || orphan.full_name.replace(/^accounts\s+/i, '')).trim();
    if (!orgName) continue;

    // Find richer contacts with matching company (case-insensitive, no trailing punctuation)
    const normalizedOrg = orgName.replace(/,\s*$/, '').trim().toLowerCase();
    const matches = contacts.filter(c =>
      c.ghl_id !== orphan.ghl_id &&
      !c.tags?.includes('auto-created-from-xero') &&
      !consumed.has(c.ghl_id) &&
      (
        (c.company_name && c.company_name.toLowerCase().replace(/,\s*$/, '').trim() === normalizedOrg) ||
        (c.full_name && c.full_name.toLowerCase().includes(normalizedOrg.slice(0, 15)))
      )
    );

    if (matches.length === 0) {
      if (VERBOSE) console.log(`  ? orphan ${orphan.full_name}: no rich match for "${orgName}"`);
      continue;
    }

    const sorted = await pickKeeper([orphan, ...matches]);
    if (sorted[0].ghl_id === orphan.ghl_id) {
      if (VERBOSE) console.log(`  ? orphan ${orphan.full_name}: is already the richest? skipping`);
      continue;
    }

    merges.push({
      tier: 1,
      keepId: sorted[0].ghl_id,
      keepName: sorted[0].full_name || sorted[0].company_name,
      mergeIds: [orphan.ghl_id],
      mergeNames: [orphan.full_name],
      reason: `orphan "${orphan.full_name}" → existing "${sorted[0].full_name || sorted[0].company_name}"`,
    });
    consumed.add(orphan.ghl_id);
  }

  // ━━━ TIER 2: exact email duplicates
  const byEmail = new Map();
  for (const c of contacts) {
    if (consumed.has(c.ghl_id)) continue;
    if (!c.email || !c.email.trim()) continue;
    const key = c.email.trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key).push(c);
  }

  for (const [email, group] of byEmail) {
    if (group.length < 2) continue;
    if (group.some(c => consumed.has(c.ghl_id))) continue;
    const sorted = await pickKeeper(group);
    const [keeper, ...losers] = sorted;
    merges.push({
      tier: 2,
      keepId: keeper.ghl_id,
      keepName: `${keeper.full_name} <${keeper.email}>`,
      mergeIds: losers.map(c => c.ghl_id),
      mergeNames: losers.map(c => c.full_name),
      reason: `email "${email}" appears ${group.length}× — keeping richest`,
    });
    for (const l of losers) consumed.add(l.ghl_id);
  }

  // ━━━ TIER 3: exact full_name + same company, one with email
  const byNameCompany = new Map();
  for (const c of contacts) {
    if (consumed.has(c.ghl_id)) continue;
    if (!c.full_name || !c.full_name.trim()) continue;
    const name = c.full_name.trim().toLowerCase();
    const company = (c.company_name || '').trim().toLowerCase();
    if (!company) continue;  // need company to be confident
    const key = `${name}|${company}`;
    if (!byNameCompany.has(key)) byNameCompany.set(key, []);
    byNameCompany.get(key).push(c);
  }

  for (const [key, group] of byNameCompany) {
    if (group.length < 2) continue;
    if (group.some(c => consumed.has(c.ghl_id))) continue;
    // Require at least one contact with an email
    if (!group.some(c => c.email && c.email.trim())) continue;
    const sorted = await pickKeeper(group);
    const [keeper, ...losers] = sorted;
    merges.push({
      tier: 3,
      keepId: keeper.ghl_id,
      keepName: `${keeper.full_name} @ ${keeper.company_name}`,
      mergeIds: losers.map(c => c.ghl_id),
      mergeNames: losers.map(c => c.full_name),
      reason: `name+company "${key}" appears ${group.length}×`,
    });
    for (const l of losers) consumed.add(l.ghl_id);
  }

  // ━━━ Report plan
  const byTier = { 1: [], 2: [], 3: [] };
  for (const m of merges) byTier[m.tier].push(m);

  console.log(`\n[auto-merge] plan: ${merges.length} merge operations`);
  console.log(`  Tier 1 (auto-created-from-xero orphans): ${byTier[1].length}`);
  console.log(`  Tier 2 (same email):                     ${byTier[2].length}`);
  console.log(`  Tier 3 (same name+company):              ${byTier[3].length}`);
  const contactsMerged = merges.reduce((sum, m) => sum + m.mergeIds.length, 0);
  console.log(`  Contacts that will be deleted:           ${contactsMerged}`);
  console.log();

  for (const tier of [1, 2, 3]) {
    if (byTier[tier].length === 0) continue;
    console.log(`=== Tier ${tier} ===`);
    for (const m of byTier[tier]) {
      console.log(`  KEEP "${m.keepName}"`);
      for (const n of m.mergeNames) console.log(`    ← merge "${n}"`);
      console.log(`    reason: ${m.reason}`);
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log('[auto-merge] dry-run — no changes made');
    return;
  }

  // ━━━ Execute
  let ok = 0, failed = 0;
  for (const m of merges) {
    try {
      await mergeViaApi(m.keepId, m.mergeIds);
      ok++;
      if (VERBOSE) console.log(`  ✓ merged ${m.mergeIds.length} into ${m.keepName}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ failed ${m.keepName}: ${err.message}`);
    }
  }

  console.log(`\n[auto-merge] done: ${ok} successful, ${failed} failed`);
}

main().catch(err => {
  console.error(`[auto-merge] FAILED: ${err.message}`);
  process.exit(1);
});
