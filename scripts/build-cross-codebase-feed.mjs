#!/usr/bin/env node
/**
 * Cross-Codebase Feed Builder
 *
 * Scans ACT-ecosystem codebases + shared Supabase + Notion for last-24h
 * activity. Writes a JSON event stream + a human-readable markdown summary
 * to thoughts/shared/cross-codebase-feed/.
 *
 * Read by:
 *   - act-regenerative-studio/scripts/ask-act.mjs (cross-codebase RAG queries)
 *   - newsletter content selectors (filter by audience consent)
 *   - bot's search_wiki / get_daily_briefing tools
 *   - website's "what's new" widget
 *
 * Usage:
 *   node scripts/build-cross-codebase-feed.mjs            # last 24h
 *   node scripts/build-cross-codebase-feed.mjs --since 7d # last week
 *   node scripts/build-cross-codebase-feed.mjs --json     # JSON to stdout only
 *
 * PM2 cron: daily 7am AEST (matches existing ecosystem-digest cadence)
 *
 * Plan: act-communication-pipeline-2026-05-23
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const args = process.argv.slice(2);
const sinceArg = args.includes('--since') ? args[args.indexOf('--since') + 1] : '1d';
const jsonOnly = args.includes('--json');

// SCOPE — codebases to scan (must exist at these paths)
const CODEBASES = [
  { name: 'act-global-infrastructure', path: '/Users/benknight/Code/act-global-infrastructure' },
  { name: 'act-regenerative-studio', path: '/Users/benknight/Code/act-regenerative-studio' },
  { name: 'empathy-ledger-v2', path: '/Users/benknight/Code/empathy-ledger-v2' },
  { name: 'justicehub', path: '/Users/benknight/Code/justicehub' },
  { name: 'goods', path: '/Users/benknight/Code/goods' },
  { name: 'act-farm', path: '/Users/benknight/Code/act-farm' },
];

const FEED_DIR = '/Users/benknight/Code/act-global-infrastructure/thoughts/shared/cross-codebase-feed';
const today = new Date().toISOString().slice(0, 10);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COLLECTORS — each returns an array of typed events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gitLogSince(repo, since) {
  try {
    const out = execSync(
      `git -C "${repo.path}" log --since="${since}" --pretty=format:'%H|%aI|%an|%s' --no-merges`,
      { encoding: 'utf8' }
    );
    if (!out.trim()) return [];
    return out.split('\n').map(line => {
      const [sha, date, author, ...subjectParts] = line.split('|');
      return { sha, date, author, subject: subjectParts.join('|') };
    });
  } catch (e) {
    return []; // repo not a git repo or git missing
  }
}

function planTrailerOf(repo, sha) {
  try {
    const body = execSync(`git -C "${repo.path}" show -s --format=%B ${sha}`, { encoding: 'utf8' });
    const m = body.match(/^Plan:\s*([\w/.-]+)\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function collectCommitsWithPlanTrailers(repo, sinceDays) {
  const since = sinceDays || sinceArg;
  const commits = gitLogSince(repo, since);
  return commits.map(c => {
    const plan = planTrailerOf(repo, c.sha);
    return {
      type: 'commit',
      repo: repo.name,
      sha: c.sha.slice(0, 7),
      date: c.date,
      author: c.author,
      title: c.subject,
      plan_slug: plan,
    };
  });
}

function findRecentFiles(repo, subdir, sinceDays) {
  const dir = join(repo.path, subdir);
  if (!existsSync(dir)) return [];
  const sinceMs = Date.now() - parseSinceMs(sinceDays);
  const walk = (d) => {
    let out = [];
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); }
    catch { return out; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '_archive') continue;
        out = out.concat(walk(full));
      } else if (e.isFile() && e.name.endsWith('.md')) {
        try {
          const s = statSync(full);
          if (s.mtimeMs >= sinceMs) {
            out.push({
              path: full.replace(repo.path + '/', ''),
              mtime: new Date(s.mtimeMs).toISOString(),
              size: s.size,
            });
          }
        } catch {}
      }
    }
    return out;
  };
  return walk(dir);
}

function parseSinceMs(since) {
  const m = String(since).match(/^(\d+)([dhmw])$/);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  return n * ({ h: 3600, d: 86400, w: 604800, m: 60 }[unit] || 86400) * 1000;
}

function collectWikiUpdates(repo) {
  return findRecentFiles(repo, 'wiki', sinceArg).map(f => ({
    type: 'wiki_update',
    repo: repo.name,
    path: f.path,
    date: f.mtime,
    size_bytes: f.size,
  }));
}

function collectDecisions(repo) {
  return findRecentFiles(repo, 'thoughts/shared/decisions', sinceArg).map(f => ({
    type: 'decision_logged',
    repo: repo.name,
    path: f.path,
    date: f.mtime,
  }));
}

function collectHandoffs(repo) {
  return findRecentFiles(repo, 'thoughts/shared/handoffs', sinceArg).map(f => ({
    type: 'handoff_updated',
    repo: repo.name,
    path: f.path,
    date: f.mtime,
  }));
}

function collectPlans(repo) {
  return findRecentFiles(repo, 'thoughts/shared/plans', sinceArg).map(f => ({
    type: 'plan_updated',
    repo: repo.name,
    path: f.path,
    date: f.mtime,
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE — pull EL stories, wiki_pages, media uploads
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function collectFromSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('Skipping Supabase scans — SUPABASE env vars missing');
    return [];
  }
  const supabase = createClient(url, key);
  const sinceIso = new Date(Date.now() - parseSinceMs(sinceArg)).toISOString();
  const events = [];

  // wiki_pages (synced by studio's sync-canonical-wiki-pages.mjs)
  try {
    const { data } = await supabase
      .from('wiki_pages')
      .select('slug, title, source_path, updated_at, frontmatter')
      .gte('updated_at', sinceIso)
      .order('updated_at', { ascending: false })
      .limit(50);
    for (const p of data || []) {
      events.push({
        type: 'wiki_page_synced',
        slug: p.slug,
        title: p.title,
        source_path: p.source_path,
        date: p.updated_at,
        project: p.frontmatter?.canonical_code || null,
      });
    }
  } catch (e) { /* table may not exist locally */ }

  // EL storytellers / stories — try common table names
  for (const table of ['empathy_ledger_stories', 'el_stories', 'stories']) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id, title, storyteller_id, project_tags, consent_visibility, editorial_status, updated_at')
        .gte('updated_at', sinceIso)
        .limit(50);
      if (!error && data && data.length) {
        for (const s of data) {
          events.push({
            type: 'el_story_updated',
            table,
            id: s.id,
            title: s.title,
            storyteller_id: s.storyteller_id,
            project_tags: s.project_tags,
            consent_visibility: s.consent_visibility,
            editorial_status: s.editorial_status,
            date: s.updated_at,
          });
        }
        break;
      }
    } catch (e) { /* table doesn't exist, try next */ }
  }

  return events;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const all = [];
  for (const repo of CODEBASES) {
    if (!existsSync(repo.path)) continue;
    all.push(
      ...collectCommitsWithPlanTrailers(repo),
      ...collectWikiUpdates(repo),
      ...collectDecisions(repo),
      ...collectHandoffs(repo),
      ...collectPlans(repo),
    );
  }
  const supabaseEvents = await collectFromSupabase();
  all.push(...supabaseEvents);

  // Sort newest first
  all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const out = {
    generated_at: new Date().toISOString(),
    since: sinceArg,
    codebases: CODEBASES.map(c => c.name),
    event_count: all.length,
    events: all,
  };

  if (jsonOnly) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (!existsSync(FEED_DIR)) mkdirSync(FEED_DIR, { recursive: true });
  const jsonPath = join(FEED_DIR, `${today}.json`);
  const latestJsonPath = join(FEED_DIR, 'latest.json');
  const latestMdPath = join(FEED_DIR, 'latest.md');

  writeFileSync(jsonPath, JSON.stringify(out, null, 2));
  writeFileSync(latestJsonPath, JSON.stringify(out, null, 2));
  writeFileSync(latestMdPath, renderMarkdown(out));

  console.log(`✓ Feed written:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${latestJsonPath}`);
  console.log(`  ${latestMdPath}`);
  console.log(`  ${all.length} events from ${CODEBASES.length} codebases`);
}

function renderMarkdown(out) {
  const byType = {};
  for (const e of out.events) {
    (byType[e.type] ||= []).push(e);
  }
  const order = [
    'commit', 'plan_updated', 'decision_logged', 'handoff_updated',
    'wiki_update', 'wiki_page_synced', 'el_story_updated',
  ];
  const sortedTypes = [
    ...order.filter(t => byType[t]),
    ...Object.keys(byType).filter(t => !order.includes(t)),
  ];

  const lines = [
    `# Cross-codebase feed — ${out.generated_at.slice(0, 10)}`,
    ``,
    `> Activity since ${out.since} · ${out.event_count} events across ${out.codebases.length} codebases`,
    ``,
  ];

  for (const type of sortedTypes) {
    const events = byType[type];
    lines.push(`## ${type} (${events.length})`);
    lines.push('');
    for (const e of events.slice(0, 20)) {
      lines.push(formatEvent(e));
    }
    if (events.length > 20) lines.push(`- _...and ${events.length - 20} more_`);
    lines.push('');
  }

  return lines.join('\n');
}

function formatEvent(e) {
  switch (e.type) {
    case 'commit':
      return `- \`${e.sha}\` (${e.repo}${e.plan_slug ? ` · plan: ${e.plan_slug}` : ''}) — ${e.title}`;
    case 'plan_updated':
    case 'decision_logged':
    case 'handoff_updated':
    case 'wiki_update':
      return `- ${e.repo}: \`${e.path}\` (${e.date.slice(0, 10)})`;
    case 'wiki_page_synced':
      return `- ${e.title || e.slug}${e.project ? ` · ${e.project}` : ''} (synced ${e.date.slice(0, 10)})`;
    case 'el_story_updated':
      return `- ${e.title}${e.consent_visibility ? ` · ${e.consent_visibility}` : ''}${e.storyteller_id ? ` · ${e.storyteller_id}` : ''}`;
    default:
      return `- ${JSON.stringify(e).slice(0, 120)}`;
  }
}

main().catch(e => {
  console.error('Feed builder failed:', e);
  process.exit(1);
});
