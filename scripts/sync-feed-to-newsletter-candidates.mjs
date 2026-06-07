#!/usr/bin/env node
/**
 * Cross-codebase feed → newsletter_candidates table.
 *
 * Reads thoughts/shared/cross-codebase-feed/latest.json (or specified file)
 * and upserts events into newsletter_candidates with computed auto_audiences
 * via the source-type deterministic rule (locked plan Q4).
 *
 * Source-type → audience mapping:
 *   commit (with Plan: trailer)        → ['brand'] (and 'partner' if project-tagged)
 *   plan_updated / decision_logged     → ['partner'] (if project-tagged) + ['funder'] (if money-linked)
 *   handoff_updated                    → ['brand'] (low priority, internal-ish but acceptable)
 *   wiki_update / wiki_page_synced     → ['brand'] (and 'partner' if project page)
 *   el_story_updated                   → audience from consent_visibility:
 *                                          'public'  → ['brand', 'partner', 'funder']
 *                                          'funder'  → ['funder']
 *                                          'partner' → ['partner']
 *                                          'private' → []  (never goes in newsletter)
 *   xero_payment                       → ['funder'] (with payer name as funder candidate)
 *
 * Run:
 *   node scripts/sync-feed-to-newsletter-candidates.mjs
 *   node scripts/sync-feed-to-newsletter-candidates.mjs --feed <path>
 *   node scripts/sync-feed-to-newsletter-candidates.mjs --dry-run
 *
 * PM2 cron: 30 7 * * * (daily 7:30am AEST, 30min after build-cross-codebase-feed at 7:00am)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const feedPath = args.includes('--feed')
  ? args[args.indexOf('--feed') + 1]
  : '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/cross-codebase-feed/latest.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCE-TYPE → AUDIENCE DETERMINISTIC MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function autoAudiencesFor(event) {
  const audiences = new Set();
  switch (event.type) {
    case 'commit':
      // Anything with a Plan: trailer is "what we shipped" → brand candidate.
      // Without trailer, internal noise — skip entirely (return []).
      if (event.plan_slug) {
        audiences.add('brand');
        if (event.project_codes?.length) audiences.add('partner');
      }
      break;
    case 'plan_updated':
    case 'decision_logged':
      // Decisions affect partners (project-leads) and funders (if money-touching).
      // We can't easily detect "money-touching" from filename, so default partner only.
      audiences.add('partner');
      break;
    case 'handoff_updated':
      // Handoffs are internal-ish — low-priority brand candidate.
      audiences.add('brand');
      break;
    case 'wiki_update':
    case 'wiki_page_synced':
      // Wiki updates are public-facing material — brand by default.
      audiences.add('brand');
      // Partner if it's a project wiki page.
      if (event.path?.includes('wiki/projects/') || event.project) {
        audiences.add('partner');
      }
      break;
    case 'el_story_updated':
      // Audience from consent_visibility.
      switch (event.consent_visibility) {
        case 'public':
          audiences.add('brand');
          audiences.add('partner');
          audiences.add('funder');
          break;
        case 'funder':
          audiences.add('funder');
          break;
        case 'partner':
          audiences.add('partner');
          break;
        case 'private':
        default:
          break;
      }
      // Storyteller themselves always gets their own story.
      if (event.storyteller_id) audiences.add('storyteller');
      break;
    case 'xero_payment':
      audiences.add('funder');
      break;
    default:
      // Unknown source types get no audience — silently skipped.
      break;
  }
  return [...audiences];
}

function sourceIdFor(event) {
  switch (event.type) {
    case 'commit':            return `${event.repo}/${event.sha}`;
    case 'plan_updated':
    case 'decision_logged':
    case 'handoff_updated':
    case 'wiki_update':       return `${event.repo}/${event.path}`;
    case 'wiki_page_synced':  return `wiki_page/${event.slug}`;
    case 'el_story_updated':  return `el_story/${event.id}`;
    case 'xero_payment':      return `xero_payment/${event.invoice_id}`;
    default:                  return JSON.stringify(event).slice(0, 200);
  }
}

function titleFor(event) {
  return event.title || event.path || event.slug || event.id || JSON.stringify(event).slice(0, 80);
}

function urlFor(event) {
  switch (event.type) {
    case 'commit':
      return `https://github.com/Acurioustractor/${event.repo}/commit/${event.sha}`;
    case 'wiki_update':
    case 'plan_updated':
    case 'decision_logged':
    case 'handoff_updated':
      return event.path
        ? `https://github.com/Acurioustractor/${event.repo}/blob/main/${event.path}`
        : null;
    default:
      return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  if (!existsSync(feedPath)) {
    console.error(`Feed not found: ${feedPath}`);
    console.error(`Run: node scripts/build-cross-codebase-feed.mjs`);
    process.exit(1);
  }
  const feed = JSON.parse(readFileSync(feedPath, 'utf8'));
  console.log(`📰 ${feed.event_count} events from ${feed.codebases.length} codebases (since ${feed.since})`);

  const candidates = [];
  let skipped = 0;
  for (const event of feed.events) {
    const auto_audiences = autoAudiencesFor(event);
    if (auto_audiences.length === 0) {
      skipped++;
      continue;
    }
    candidates.push({
      source_type: event.type,
      source_id: sourceIdFor(event),
      source_repo: event.repo || null,
      title: titleFor(event),
      summary: event.title || null,
      url: urlFor(event),
      event_date: (event.date || feed.generated_at).slice(0, 10),
      project_codes: event.project_codes || (event.project ? [event.project] : []),
      auto_audiences,
      consent_visibility: event.consent_visibility || null,
      storyteller_ids: event.storyteller_id ? [event.storyteller_id] : [],
      payload: event,
    });
  }

  console.log(`  → ${candidates.length} candidates eligible (${skipped} skipped: no audience)`);
  if (dryRun) {
    console.log('\n[DRY RUN — no DB writes]');
    const sample = candidates.slice(0, 5);
    for (const c of sample) {
      console.log(`  ${c.auto_audiences.join('+').padEnd(20)} ${c.source_type.padEnd(20)} ${c.title.slice(0, 80)}`);
    }
    if (candidates.length > 5) console.log(`  ...and ${candidates.length - 5} more`);
    return;
  }

  // Upsert in batches of 100 to avoid request-size limits.
  let written = 0;
  for (let i = 0; i < candidates.length; i += 100) {
    const batch = candidates.slice(i, i + 100);
    const { error, count } = await supabase
      .from('newsletter_candidates')
      .upsert(batch, { onConflict: 'source_type,source_id', count: 'exact' });
    if (error) {
      console.error(`Batch ${i / 100 + 1} failed:`, error.message);
      continue;
    }
    written += count ?? batch.length;
  }
  console.log(`✓ Upserted ${written} candidates into newsletter_candidates`);

  // Stats: status distribution
  const { data: stats } = await supabase
    .from('newsletter_candidates')
    .select('status, auto_audiences');
  if (stats) {
    const byStatus = {};
    const byAudience = {};
    for (const row of stats) {
      byStatus[row.status] = (byStatus[row.status] || 0) + 1;
      for (const aud of row.auto_audiences || []) {
        byAudience[aud] = (byAudience[aud] || 0) + 1;
      }
    }
    console.log('\nTable state:');
    console.log('  By status: ' + Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', '));
    console.log('  By auto_audience: ' + Object.entries(byAudience).map(([k, v]) => `${k}=${v}`).join(', '));
  }
}

main().catch((e) => {
  console.error('Sync failed:', e);
  process.exit(1);
});
