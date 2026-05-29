#!/usr/bin/env node
/**
 * Suggest partner-<type> / funder-<type> sub-tags for review (Phase 2.5 of the
 * GHL tag-canonicalization plan, thoughts/shared/plans/2026-05-29-ghl-tag-canonicalization.md).
 *
 * REVIEW-FIRST, DRY-RUN ONLY. Reads partner/funder contacts from the shared
 * Supabase DB, suggests a type from name/co-tag signals, and writes a review
 * markdown for Ben to confirm. It NEVER writes a tag — applying the confirmed
 * types to GHL is the paused Phase 3, done by a separate step.
 *
 * Approved taxonomy:
 *   partner-<delivery|community|government|strategic|referral>
 *   funder-<foundation|corporate|government|intermediary|individual>
 *
 * Usage:
 *   node scripts/suggest-audience-types.mjs            # write review file + summary
 *   node scripts/suggest-audience-types.mjs --verbose  # also print each row
 *
 * Env: SUPABASE_SHARED_URL/SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ·
 *      SUPABASE_SHARED_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY
 */

import '../lib/load-env.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');
const GONE = 'gone-from-ghl';

const SUPABASE_URL =
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env (SUPABASE_SHARED_URL / SUPABASE_SHARED_SERVICE_ROLE_KEY).');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FUNDER_SIGNALS = ['audience-funder', 'funder', 'goods-funder'];
const PARTNER_SIGNALS = ['audience-partner', 'partner'];

// Ordered heuristics — first match wins. Order matters: government/intermediary/
// corporate must beat the generic "Foundation"/"Trust" match.
function suggestFunderType(name) {
  const n = (name || '').toLowerCase();
  if (!n) return ['unknown', 'no name'];
  if (/\b(dewr|niaa|ilsc|department|dept\b|government|govt|commonwealth|minister)\b/.test(n))
    return ['funder-government', 'govt keyword'];
  if (/(australian communities foundation|funding network|philanthropy australia|frrr|foundation for rural|community foundation)/.test(n))
    return ['funder-intermediary', 'regrantor/network'];
  if (/\b(bhp|rio tinto|fortescue|qbe|minderoo|woodside|santos|origin energy|wesfarmers|glencore|newmont|telstra|nab|westpac)\b/.test(n))
    return ['funder-corporate', 'known corporate'];
  if (/(foundation|trust|charitable|philanthrop|endowment)/.test(n))
    return ['funder-foundation', 'foundation/trust keyword'];
  return ['unknown', 'needs review'];
}

function suggestPartnerType(name, tags) {
  const n = (name || '').toLowerCase();
  const t = tags.join(' ').toLowerCase();
  if (/\b(council|shire|city of|regional council|department|government|govt)\b/.test(n))
    return ['partner-government', 'govt/council in name'];
  if (/(aboriginal corporation|aboriginal council|land council|women'?s council|health service|acco|community store|community)/.test(n))
    return ['partner-community', 'community/ACCO in name'];
  if (/oonchiumpa/.test(n)) return ['partner-delivery', 'known delivery partner'];
  // hint only — strategic vs referral vs delivery needs human judgment
  const proj = [];
  if (/\bact-jh\b|justicehub|container-request|contained/.test(t)) proj.push('JusticeHub/CONTAINED');
  if (/\bact-gd\b|goods/.test(t)) proj.push('Goods');
  return ['?', proj.length ? 'manual — project: ' + proj.join(', ') : 'manual'];
}

function personLike(c) {
  // no company and a two-word full name → likely an individual
  return !c.company_name && (c.full_name || '').trim().split(/\s+/).length >= 2;
}

const md = (s) => (s == null ? '' : String(s).replace(/\|/g, '\\|').replace(/\n/g, ' '));

async function main() {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('full_name, first_name, last_name, company_name, email, tags, audience_segments')
    .or(`tags.ov.{${FUNDER_SIGNALS.join(',')}},tags.ov.{${PARTNER_SIGNALS.join(',')}}`)
    .limit(2000);
  if (error) { console.error('Query failed:', error.message); process.exit(1); }

  const rows = (data || []).filter((c) => !(c.tags || []).includes(GONE));
  const funders = [], partners = [];
  for (const c of rows) {
    const tags = c.tags || [];
    const name = c.company_name || c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ');
    const isFunder = FUNDER_SIGNALS.some((s) => tags.includes(s));
    const isPartner = PARTNER_SIGNALS.some((s) => tags.includes(s));
    if (isFunder) {
      let [type, why] = suggestFunderType(name);
      // Don't guess "individual" from a missing company — most no-company funder
      // contacts are people AT foundations, not individual donors. Flag for review.
      if (type === 'unknown' && personLike(c)) why = 'person, no org — confirm: individual donor vs org contact';
      funders.push({ name, email: c.email, type, why, segs: c.audience_segments || [] });
    }
    if (isPartner) {
      const [type, why] = suggestPartnerType(name, tags);
      partners.push({ name, email: c.email, type, why, segs: c.audience_segments || [] });
    }
  }

  const tally = (arr) => arr.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {});
  const section = (title, arr) => {
    const lines = [`## ${title} (${arr.length})`, '', '| Name | Email | Suggested type | Why | Confirm (edit) |', '|---|---|---|---|---|'];
    for (const r of arr.sort((a, b) => (a.type + a.name).localeCompare(b.type + b.name)))
      lines.push(`| ${md(r.name)} | ${md(r.email)} | ${md(r.type)} | ${md(r.why)} | |`);
    return lines.join('\n');
  };

  const out = [
    '# Audience type suggestions — REVIEW (dry-run, no tags written)',
    '',
    `Generated ${new Date().toISOString()}. Plan: thoughts/shared/plans/2026-05-29-ghl-tag-canonicalization.md (Phase 2.5).`,
    'Confirm/correct the "Suggested type" column, then a separate Phase-3 step writes the confirmed `partner-<type>`/`funder-<type>` tags to GHL. Rows marked `?` or `unknown` need a human call.',
    '',
    `Funder suggestions: ${JSON.stringify(tally(funders))}`,
    `Partner suggestions: ${JSON.stringify(tally(partners))}`,
    '',
    section('Funders', funders),
    '',
    section('Partners', partners),
    '',
  ].join('\n');

  const dir = join(__dirname, '..', 'thoughts', 'shared', 'reports');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'audience-type-suggestions.md');
  writeFileSync(path, out);

  console.log(`Funders: ${funders.length}  → ${JSON.stringify(tally(funders))}`);
  console.log(`Partners: ${partners.length} → ${JSON.stringify(tally(partners))}`);
  console.log(`Review file: ${path}`);
  if (VERBOSE) {
    for (const r of [...funders, ...partners]) console.log(`  ${r.type.padEnd(20)} ${r.name} <${r.email}>`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
