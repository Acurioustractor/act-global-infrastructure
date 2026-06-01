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
 *   Member    = has harvest-member or role:member (a committed member)
 *   Connected = newsletter_consent = true (genuinely opted in) and not a Member
 *   Curious   = everyone else (the default — the re-opt-in promotes them to Connected)
 *   Active/Steward are NOT auto-assigned (they need judgement) — event attendees + volunteers
 *   are listed as "Active candidates" for you to promote by hand.
 *
 *   node scripts/seat-harvest-membership-tiers.mjs            # DRY RUN
 *   node scripts/seat-harvest-membership-tiers.mjs --apply    # add tier: tags (no sends)
 */
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const GHL_H = { Authorization: `Bearer ${process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN}`,
  Version: '2021-07-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HARVEST = ['project:act-hv', 'act-hv', 'harvest-website', 'harvest-member', 'harvest', 'comms:harvest-newsletter', 'harvest-newsletter'];
const EVENT_OR_VOLUNTEER = ['eoi-gathering-march-2026', 'locals-day-march-2026', 'harvest-gathering-photos', 'photo-wall', 'interest:volunteer', 'interest-volunteer'];
const isHarvest = (tags) => tags.some(t => HARVEST.includes(t));
const gone = (tags) => tags.some(t => t.startsWith('gone-from-ghl'));

function tierFor(tags, consent) {
  if (tags.includes('harvest-member') || tags.includes('role:member')) return 'member';
  if (consent) return 'connected';
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
  const toTag = []; const activeCandidates = [];
  for (const c of harvest) {
    const tags = c.tags || [];
    const consent = c.newsletter_consent === true && !c.newsletter_unsubscribed_at;
    const tier = tierFor(tags, consent);
    dist[tier]++;
    const tierTag = `tier:${tier}`;
    if (!tags.includes(tierTag)) toTag.push({ ghl_id: c.ghl_id, tierTag });
    if (tags.some(t => EVENT_OR_VOLUNTEER.includes(t))) activeCandidates.push(c.ghl_id);
  }

  console.log('Seating (auto):');
  console.log(`  tier:member     ${dist.member}   (harvest-member / role:member)`);
  console.log(`  tier:connected  ${dist.connected}   (opted in: newsletter_consent=true)`);
  console.log(`  tier:curious    ${dist.curious}   (default — re-opt-in promotes them to Connected)`);
  console.log(`\nActive candidates (NOT auto-tagged — promote by hand if they truly show up): ${activeCandidates.length}`);
  console.log(`tier: tags to add: ${toTag.length}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply (adds tier: tags only, never sends).'); return; }

  console.log('\nApplying tier: tags (no workflow watches tier:, so no email can fire)...');
  let ok = 0, err = 0;
  for (const { ghl_id, tierTag } of toTag) {
    const r = await fetch(`https://services.leadconnectorhq.com/contacts/${ghl_id}/tags`,
      { method: 'POST', headers: GHL_H, body: JSON.stringify({ tags: [tierTag] }) });
    if (r.ok) ok++; else err++;
    if ((ok + err) % 50 === 0) console.log(`  ${ok + err}/${toTag.length} (errs ${err})`);
    await sleep(150);
  }
  console.log(`Tagged: ${ok}, errors (stale): ${err}. No emails sent — tier: tags only.`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
