#!/usr/bin/env node
/**
 * Seat Harvest contacts on the belonging ladder — adds the tier: tag from their current tags.
 * Step 3 of the Harvest clean-system blueprint (act-belonging-model.md).
 *
 * SAFE BY DESIGN: it ONLY adds tier: tags (tier:member/connected/curious). No workflow
 * triggers on tier: tags, so this CANNOT fire an automated email even if workflows are live.
 * It never touches role:/interest:/comms: tags (those are workflow-watched) and never sends.
 *
 * Seating logic (conservative — auto-seat the clear rungs, flag Active/Steward for manual):
 *   Member    = active in Mighty, or has harvest-member / role:member
 *   Connected = an existing, unambiguous tier:connected relationship tag
 *   Curious   = everyone else
 *   Active/Steward are NOT auto-assigned (they need judgement) — event attendees + volunteers
 *   are listed as "Active candidates" for you to promote by hand.
 *
 * Newsletter consent is intentionally separate from the relationship tier. Opting in makes a
 * contact sendable; it does not prove that the person is Connected or a Member.
 *
 *   node scripts/seat-harvest-membership-tiers.mjs            # DRY RUN
 *   node scripts/seat-harvest-membership-tiers.mjs --apply    # add tier: tags (no sends)
 */
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HARVEST = ['project:act-hv', 'act-hv', 'harvest-website', 'harvest-member', 'harvest', 'comms:harvest-newsletter', 'harvest-newsletter'];
const EVENT_OR_VOLUNTEER = ['eoi-gathering-march-2026', 'locals-day-march-2026', 'harvest-gathering-photos', 'photo-wall', 'interest:volunteer', 'interest-volunteer'];
const TIER_TAGS = ['tier:curious', 'tier:connected', 'tier:member', 'tier:active', 'tier:steward'];
const HAND_PROMOTED = ['tier:active', 'tier:steward'];
const isHarvest = (tags) => tags.some(t => HARVEST.includes(t));
const gone = (tags) => tags.some(t => t.startsWith('gone-from-ghl'));

function tierFor(tags) {
  if (tags.includes('platform:mighty-active') || tags.includes('harvest-member') || tags.includes('role:member')) return 'member';
  if (tags.includes('tier:connected')) return 'connected';
  return 'curious';
}

async function main() {
  console.log(`=== Seat Harvest on the belonging ladder — ${APPLY ? 'APPLY (tags only, NO sends)' : 'DRY RUN'} ===`);
  const all = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('ghl_contacts')
      .select('ghl_id, tags, newsletter_consent, newsletter_unsubscribed_at').range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break; from += 1000;
  }
  const harvest = all.filter(c => isHarvest(c.tags || []) && !gone(c.tags || []));
  console.log(`Live Harvest contacts: ${harvest.length}\n`);

  const dist = { member: 0, connected: 0, curious: 0 };
  const toTag = []; const activeCandidates = []; const conflicts = []; let sendReady = 0;
  for (const c of harvest) {
    const tags = c.tags || [];
    if (tags.includes('comms:harvest-newsletter') && c.newsletter_consent === true && !c.newsletter_unsubscribed_at && !tags.includes('lane:community')) sendReady++;
    const tierTags = tags.filter(t => TIER_TAGS.includes(t));
    if (new Set(tierTags).size > 1) {
      conflicts.push(c.ghl_id);
      continue;
    }
    // Active and Steward are set by hand; never add a lower tier on top of them.
    if (tierTags.some(t => HAND_PROMOTED.includes(t))) continue;
    const tier = tierFor(tags);
    dist[tier]++;
    const tierTag = `tier:${tier}`;
    if (!tags.includes(tierTag)) toTag.push({ ghl_id: c.ghl_id, tierTag });
    if (tags.some(t => EVENT_OR_VOLUNTEER.includes(t))) activeCandidates.push(c.ghl_id);
  }

  console.log('Seating (auto):');
  console.log(`  tier:member     ${dist.member}   (Mighty active / explicit member evidence)`);
  console.log(`  tier:connected  ${dist.connected}   (existing explicit relationship tier)`);
  console.log(`  tier:curious    ${dist.curious}   (default)`);
  console.log(`\nNewsletter send-ready (separate from tier): ${sendReady}`);
  console.log(`Conflicting tier tags skipped for review: ${conflicts.length}`);
  console.log(`\nActive candidates (NOT auto-tagged — promote by hand if they truly show up): ${activeCandidates.length}`);
  console.log(`tier: tags to add: ${toTag.length}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply (adds tier: tags only, never sends).'); return; }

  console.log('\nApplying tier: tags (no workflow watches tier:, so no email can fire)...');
  const ghl = createGHLService();
  let ok = 0;
  const failed = [];
  for (const { ghl_id, tierTag } of toTag) {
    try {
      await ghl.addTagToContact(ghl_id, tierTag);
      ok++;
    } catch (e) {
      failed.push(`${ghl_id} ${tierTag}: ${e.message}`);
    }
    if ((ok + failed.length) % 50 === 0) console.log(`  ${ok + failed.length}/${toTag.length} (failed ${failed.length})`);
    await sleep(150);
  }
  console.log(`Tagged ${ok} of ${toTag.length}. No emails sent — tier: tags only.`);
  if (failed.length) {
    console.error(`FAILED ${failed.length}:`);
    for (const line of failed) console.error(`  ${line}`);
    process.exitCode = 1;
  }
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
