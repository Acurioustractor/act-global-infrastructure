#!/usr/bin/env node
/**
 * Funder GHL contact cleanup — three phases:
 *
 *   1. MERGE DUPLICATES — group by email; if >1 record per email,
 *      pick canonical (most tags), union tags across all duplicates,
 *      delete the non-canonical records.
 *
 *   2. TAG UNTAGGED — find contacts in funder orgs that have no
 *      goods-* / funder / partner tags; apply the standard set
 *      based on org (e.g. all snow-foundation contacts get
 *      goods-newsletter + act-gd at minimum).
 *
 *   3. (No deletions outside duplicate-merge.)
 *
 * Default = DRY RUN (no API writes). --apply to execute.
 *
 * Usage:
 *   node scripts/clean-funder-ghl-contacts.mjs                  # dry run
 *   node scripts/clean-funder-ghl-contacts.mjs --apply          # execute
 *   node scripts/clean-funder-ghl-contacts.mjs --skip-merge     # tags only
 *   node scripts/clean-funder-ghl-contacts.mjs --skip-tag       # merge only
 *   node scripts/clean-funder-ghl-contacts.mjs --funder snow-foundation
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { createGHLService } from './lib/ghl-api-service.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const skipMerge = args.includes('--skip-merge');
const skipTag = args.includes('--skip-tag');
const onlyFunder = args.includes('--funder') ? args[args.indexOf('--funder') + 1] : null;

const ghl = createGHLService();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNDER SEARCH TERMS + STANDARD TAGS PER FUNDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FUNDERS = [
  {
    slug: 'snow-foundation',
    queries: ['snowfoundation.org.au', 'Grimsley', 'Lagelee'],
    domainMatch: '@snowfoundation.org.au',
    defaultTags: ['goods', 'goods-newsletter', 'act-gd'],
    funderTags: ['funder', 'goods-funder'], // applied to known funders
  },
  {
    slug: 'minderoo',
    queries: ['minderoo.org', 'Stronach'],
    domainMatch: '@minderoo.org',
    defaultTags: ['contained', 'partner'],
    funderTags: ['funder', 'paused'],
  },
  {
    slug: 'qbe-catalysing-impact',
    queries: ['socialimpacthub.org', 'Catalysing'],
    domainMatch: '@socialimpacthub.org',
    defaultTags: ['goods', 'goods-newsletter', 'act-gd', 'qbe-catalysing-impact'],
    funderTags: ['funder', 'partner'],
  },
  {
    slug: 'dusseldorp-forum',
    queries: ['dusseldorp.org', 'Duffy', 'Fyfe'],
    domainMatch: '@dusseldorp.org.au',
    defaultTags: ['goods', 'goods-newsletter', 'justicehub', 'partner', 'act-gd', 'act-jh'],
    funderTags: ['funder', 'goods-funder'],
  },
  {
    slug: 'jcf',
    queries: ['anne.gripper', 'Canavan'],
    domainMatch: null, // multiple emails
    defaultTags: ['goods', 'goods-newsletter', 'justicehub', 'act-gd', 'act-jh'],
    funderTags: ['funder', 'goods-funder'],
  },
  {
    slug: 'centrecorp',
    queries: ['centrecorp.com.au', 'Centrecorp'],
    domainMatch: '@centrecorp.com.au',
    defaultTags: ['goods', 'goods-supporter', 'goods-newsletter', 'act-gd'],
    funderTags: ['funder', 'goods-funder'],
  },
  {
    slug: 'streetsmart-australia',
    queries: ['streetsmartaustralia.org', 'StreetSmart'],
    domainMatch: '@streetsmartaustralia.org',
    defaultTags: ['goods', 'goods-newsletter', 'justicehub', 'act-gd', 'act-jh'],
    funderTags: ['funder', 'goods-funder', 'partner'],
  },
  {
    slug: 'rotary-eclub-outback',
    queries: ['marlowcanete', 'Pene Curtis', 'Greg Marlow'],
    domainMatch: null,
    defaultTags: ['goods', 'goods-newsletter', 'act-gd'],
    funderTags: ['funder', 'goods-funder'],
  },
  {
    slug: 'paul-ramsay-foundation',
    queries: ['paulramsayfoundation', 'Frazer'],
    domainMatch: '@paulramsayfoundation.org.au',
    defaultTags: ['goods', 'goods-newsletter', 'justicehub', 'partner', 'act-gd', 'act-jh'],
    funderTags: ['funder', 'goods-funder'],
  },
  {
    slug: 'tim-fairfax',
    queries: ['tfff.org', 'Katie Norman'],
    domainMatch: '@tfff.org.au',
    defaultTags: ['goods', 'goods-supporter', 'goods-newsletter', 'act-gd'],
    funderTags: ['funder'], // Katie is hands-on rather than primary funder yet
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEARCH + DEDUPE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gatherContactsFor(funder) {
  const byId = new Map();
  for (const q of funder.queries) {
    try {
      const contacts = await ghl.searchContacts(q);
      for (const c of contacts || []) byId.set(c.id, c);
    } catch (e) {
      console.warn(`  query "${q}" failed: ${e.message.slice(0, 100)}`);
    }
  }
  // Filter by domain if specified
  let all = [...byId.values()];
  if (funder.domainMatch) {
    all = all.filter(c => (c.email || '').toLowerCase().includes(funder.domainMatch));
  }
  return all;
}

function pickCanonical(records) {
  // Canonical = record with most tags. Ties broken by most-recent updatedAt.
  return [...records].sort((a, b) => {
    const t = (b.tags?.length || 0) - (a.tags?.length || 0);
    if (t !== 0) return t;
    return (b.dateUpdated || '').localeCompare(a.dateUpdated || '');
  })[0];
}

function unionTags(records) {
  const tags = new Set();
  for (const r of records) for (const t of r.tags || []) tags.add(t);
  return [...tags];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n${apply ? '🔥 APPLY' : '🔍 DRY RUN'} — GHL funder contact cleanup\n`);

  const summary = { mergedRecords: 0, deletedRecords: 0, taggedContacts: 0, errors: 0 };

  for (const funder of FUNDERS) {
    if (onlyFunder && funder.slug !== onlyFunder) continue;
    console.log(`\n━━━ ${funder.slug} ━━━`);

    const contacts = await gatherContactsFor(funder);
    if (contacts.length === 0) {
      console.log('  (no contacts found)');
      continue;
    }
    console.log(`  Found ${contacts.length} contact(s)`);

    const deletedIds = new Set();

    // ─── DUPE DETECTION ───────────────────────────────────────────────
    if (!skipMerge) {
      const byEmail = new Map();
      for (const c of contacts) {
        const email = (c.email || '').toLowerCase();
        if (!email || email.includes('.placeholder')) continue;
        if (!byEmail.has(email)) byEmail.set(email, []);
        byEmail.get(email).push(c);
      }

      for (const [email, group] of byEmail) {
        if (group.length < 2) continue;
        const canonical = pickCanonical(group);
        const dupes = group.filter(r => r.id !== canonical.id);
        const allTags = unionTags(group);
        const missingFromCanonical = allTags.filter(t => !(canonical.tags || []).includes(t));

        console.log(`  ⚠ DUPLICATE: ${email}`);
        console.log(`    Keep:   ${canonical.id} — tags(${(canonical.tags || []).length}): ${(canonical.tags || []).slice(0,6).join(', ')}${(canonical.tags || []).length > 6 ? ' …' : ''}`);
        for (const d of dupes) {
          console.log(`    Delete: ${d.id} — tags(${(d.tags || []).length}): ${(d.tags || []).slice(0,6).join(', ')}`);
        }
        if (missingFromCanonical.length) {
          console.log(`    Add to canonical: ${missingFromCanonical.join(', ')}`);
        }

        if (apply) {
          // Add union tags to canonical
          for (const t of missingFromCanonical) {
            try {
              await ghl.addTagToContact(canonical.id, t);
            } catch (e) {
              console.error(`    tag failed (${t}): ${e.message.slice(0,80)}`);
              summary.errors++;
            }
          }
          // Delete dupes
          for (const d of dupes) {
            try {
              await ghl.deleteContact(d.id);
              deletedIds.add(d.id);
              summary.deletedRecords++;
              console.log(`    ✓ deleted ${d.id}`);
            } catch (e) {
              console.error(`    delete failed (${d.id}): ${e.message.slice(0,80)}`);
              summary.errors++;
            }
          }
          summary.mergedRecords++;
        } else {
          // In dry-run, mark dupes so tag phase doesn't propose tags on records about to be deleted
          for (const d of dupes) deletedIds.add(d.id);
        }
      }
    }

    // ─── TAG UNTAGGED ─────────────────────────────────────────────────
    if (!skipTag) {
      // Skip records that were merged/deleted (either actually or proposed)
      const remaining = contacts.filter(c => !deletedIds.has(c.id));
      for (const c of remaining) {
        const current = new Set(c.tags || []);
        const missing = funder.defaultTags.filter(t => !current.has(t));
        if (missing.length === 0) continue;

        const email = (c.email || '').toLowerCase();
        if (!email || email.includes('.placeholder')) continue; // skip placeholder records

        console.log(`  + TAG: ${c.firstName || ''} ${c.lastName || ''} (${email})`);
        console.log(`    add: ${missing.join(', ')}`);

        if (apply) {
          for (const t of missing) {
            try {
              await ghl.addTagToContact(c.id, t);
              summary.taggedContacts++;
            } catch (e) {
              console.error(`    tag failed (${t}): ${e.message.slice(0,80)}`);
              summary.errors++;
            }
          }
        }
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(apply ? '🔥 APPLY summary:' : '🔍 DRY RUN — would do:');
  console.log(`  Duplicate groups merged: ${summary.mergedRecords}`);
  console.log(`  Records deleted: ${summary.deletedRecords}`);
  console.log(`  Tags added: ${summary.taggedContacts}`);
  if (summary.errors) console.log(`  Errors: ${summary.errors}`);
  if (!apply) console.log('\n  Re-run with --apply to execute.');
}

main().catch(e => { console.error('Cleanup failed:', e); process.exit(1); });
