#!/usr/bin/env node
/**
 * Strip `lane:community` from community-controlled ORGS that a CivicGraph/Goods
 * import wrongly stamped with the OCAP individual-protection lane.
 *
 * Target = contacts with BOTH `lane:community` AND `role:community-controlled`,
 * EXCLUDING any that also carry `role:storyteller` (protect genuine individuals).
 * We remove ONLY `lane:community`; `role:community-controlled` + partner/buyer
 * roles stay (accurate). These become normal reachable partner/buyer orgs.
 *
 * Default = DRY RUN (list only). Pass --apply to execute. Fully reversible:
 * re-add `lane:community` to the logged ghl_ids.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RL = 1100;

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log(`\n=== Strip lane:community from community-controlled orgs — ${APPLY ? 'APPLY' : 'DRY_RUN'} ===\n`);

  // Pull candidates from the mirror (small set; single page is plenty)
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .contains('tags', ['lane:community', 'role:community-controlled'])
    .not('ghl_id', 'is', null)
    .range(0, 999);
  if (error) { console.error('Mirror query failed:', error.message); process.exit(1); }

  // An ORG entity: name carries an org keyword OR email is a CivicGraph import address.
  // Everything else is treated as an INDIVIDUAL and HELD (never strip an individual's OCAP lane).
  const ORG_RE = /corporation|council|store|board|congress|alliance|trust|centre|homelands|housing|resources|\balpa\b|land\s*council|health|services|cooperative|aboriginal/i;
  const isOrg = (c) => (c.email || '').endsWith('@goods.civicgraph.io') || ORG_RE.test(c.full_name || '');

  // Safety: never strip a genuine storyteller, even if also org-tagged.
  const candidates = (data || []).filter((c) => !(c.tags || []).includes('role:storyteller'));
  const targets = candidates.filter(isOrg);            // orgs → strip
  const held = candidates.filter((c) => !isOrg(c));    // individuals → hold + flag

  console.log(`Candidates (lane:community + role:community-controlled): ${(data || []).length}`);
  console.log(`ORG entities to strip lane:community from: ${targets.length}`);
  console.log(`INDIVIDUALS held (lane kept — protective, your call): ${held.length}\n`);
  targets.forEach((c, i) => console.log(`  STRIP ${String(i + 1).padStart(2)}. ${c.full_name?.trim() || '(no name)'}  <${c.email || 'no-email'}>  ${c.ghl_id}`));
  console.log('');
  held.forEach((c, i) => console.log(`  HOLD  ${String(i + 1).padStart(2)}. ${c.full_name?.trim() || '(no name)'}  <${c.email || 'no-email'}>  ${c.ghl_id}`));

  const results = { mode: APPLY ? 'APPLY' : 'DRY_RUN', stamp: '2026-06-08', count: targets.length,
    heldIndividuals: held.map((c) => ({ ghl_id: c.ghl_id, name: c.full_name?.trim(), email: c.email })), actions: [] };

  if (APPLY) {
    const svc = createGHLService();
    console.log('\nStripping lane:community (keeping role:community-controlled + all other tags)...');
    for (const c of targets) {
      try {
        await svc.removeTagFromContact(c.ghl_id, 'lane:community');
        await sleep(RL);
        results.actions.push({ ghl_id: c.ghl_id, name: c.full_name?.trim(), tagsBefore: c.tags, removed: ['lane:community'], ok: true });
        console.log(`  ✓ ${c.full_name?.trim()}`);
      } catch (e) {
        results.actions.push({ ghl_id: c.ghl_id, name: c.full_name?.trim(), error: String(e?.message || e), ok: false });
        console.error(`  ✗ ${c.full_name?.trim()}: ${e?.message || e}`);
      }
    }
  }

  const path = `thoughts/shared/reviews/2026-06-08_lane-community-org-strip-${APPLY ? 'log' : 'plan'}.json`;
  writeFileSync(path, JSON.stringify(results, null, 2));
  const okCount = results.actions.filter((a) => a.ok).length;
  console.log(`\n${APPLY ? `Stripped ${okCount}/${targets.length}.` : 'Dry run — no writes.'}  → ${path}`);
  console.log('Reverse with: re-add lane:community to the ghl_ids in the log.\n');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
