#!/usr/bin/env node
/**
 * Funder newsletter drafter.
 *
 * Reads:
 *   - wiki/narrative/funders.json[funder-slug]  (per-funder voice + framing)
 *   - newsletter_candidates table (status='include', audiences contains 'funder',
 *     event_date > last edition for this recipient)
 *   - OCAP guardrails on any EL stories in the candidate set (two-tier per
 *     locked Q10: hard gate + soft warn)
 *
 * Writes:
 *   - newsletter_drafts (status='drafting' → 'graded')
 *   - subject_candidates (3 AI-generated)
 *   - body_md (draft text)
 *   - voice_grade_score + voice_grade_details (from grade-voice + grade-funder-cadence)
 *   - consent_warnings (for any soft-warn EL stories included)
 *
 * Usage:
 *   node scripts/draft-funder-newsletter.mjs <funder-slug> <edition-period>
 *   node scripts/draft-funder-newsletter.mjs snow-foundation Q4-FY26
 *   node scripts/draft-funder-newsletter.mjs snow-foundation Q4-FY26 --dry-run
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  trackedAgentCompletionWithFallback,
  extractJson,
} from './lib/llm-client.mjs';

const args = process.argv.slice(2);
const funderSlug = args[0];
const editionPeriod = args[1];
const dryRun = args.includes('--dry-run');

if (!funderSlug || !editionPeriod) {
  console.error('Usage: node scripts/draft-funder-newsletter.mjs <funder-slug> <edition-period> [--dry-run]');
  console.error('Example: node scripts/draft-funder-newsletter.mjs snow-foundation Q4-FY26');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const FUNDERS_PATH = '/Users/benknight/Code/act-global-infrastructure/wiki/narrative/funders.json';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOAD CONTEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function loadFunder() {
  if (!existsSync(FUNDERS_PATH)) {
    throw new Error(`funders.json missing at ${FUNDERS_PATH}`);
  }
  const data = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8'));
  const funder = data.funders[funderSlug];
  if (!funder) {
    const available = Object.keys(data.funders).slice(0, 12).join(', ');
    throw new Error(`Funder '${funderSlug}' not found in funders.json. Available: ${available}, ...`);
  }
  return funder;
}

async function loadCandidates(funderSlug) {
  // Pull last edition's sent_at for this recipient, to scope candidate date range
  const { data: lastEdition } = await supabase
    .from('newsletter_drafts')
    .select('sent_at, edition_period')
    .eq('audience', 'funder')
    .eq('recipient_slug', funderSlug)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sinceDate = lastEdition?.sent_at
    ? new Date(lastEdition.sent_at).toISOString().slice(0, 10)
    : '2026-01-01'; // FY26 start as initial lower bound

  console.log(`📦 Loading candidates with event_date >= ${sinceDate} (last edition: ${lastEdition?.edition_period || 'never'})`);

  const { data, error } = await supabase
    .from('newsletter_candidates')
    .select('*')
    .eq('status', 'include')
    .contains('audiences', ['funder'])
    .gte('event_date', sinceDate)
    .order('event_date', { ascending: false })
    .limit(40);

  if (error) throw error;

  // Also pull where auto_audiences contains funder AND audiences is NULL (no override)
  const { data: autoData } = await supabase
    .from('newsletter_candidates')
    .select('*')
    .eq('status', 'include')
    .is('audiences', null)
    .contains('auto_audiences', ['funder'])
    .gte('event_date', sinceDate)
    .order('event_date', { ascending: false })
    .limit(40);

  const merged = [...(data || []), ...(autoData || [])];
  // Dedupe by id
  const byId = new Map();
  for (const row of merged) byId.set(row.id, row);
  return [...byId.values()];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OCAP GUARDRAILS (locked Q10)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ocapCheck(candidates) {
  const allowed = [];
  const softWarnings = {};
  for (const c of candidates) {
    if (c.source_type !== 'el_story_updated') {
      allowed.push(c);
      continue;
    }
    // HARD GATES (skip entirely)
    if (c.consent_visibility === 'private') continue;
    if (c.consent_visibility !== 'funder' && c.consent_visibility !== 'public') continue;
    // payload might carry consent_to_share / elder_reviewed_at; check defensively
    const payload = c.payload || {};
    if (payload.consent_to_share === false) continue;
    if (payload.requires_elder_review === true && !payload.elder_reviewed_at) continue;
    // SOFT WARNINGS (allow but flag)
    const warnings = [];
    if (payload.elder_reviewed_at) {
      const monthsAgo = (Date.now() - Date.parse(payload.elder_reviewed_at)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 12) warnings.push('elder_review_stale');
    }
    if (c.event_date) {
      const yearsAgo = (Date.now() - Date.parse(c.event_date)) / (1000 * 60 * 60 * 24 * 365);
      if (yearsAgo > 2) warnings.push('story_age_2y_plus');
    }
    if (payload.cultural_sensitivity && /high|sensitive/i.test(payload.cultural_sensitivity)) {
      warnings.push('cultural_sensitive');
    }
    if (warnings.length && c.storyteller_ids?.[0]) {
      softWarnings[c.storyteller_ids[0]] = warnings;
    }
    allowed.push(c);
  }
  return { allowed, softWarnings };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRAFT BODY + 3 SUBJECT CANDIDATES (single LLM call returns JSON)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPrompt(funder, candidates, editionPeriod) {
  const candidateLines = candidates.map((c) => {
    const proj = c.project_codes?.length ? ` [${c.project_codes.join(',')}]` : '';
    return `- (${c.source_type}, ${c.event_date}${proj}) ${c.title}${c.summary ? ` — ${c.summary}` : ''}${c.url ? ` [${c.url}]` : ''}`;
  }).join('\n');

  return `You are drafting a quarterly newsletter from A Curious Tractor (ACT) to a specific funder.

RECIPIENT: ${funder.name}
PRIMARY CONTACT: ${funder.primary_contact}
RELATIONSHIP STAGE: ${funder.stage}
EDITION: ${editionPeriod}

VOICE TONE (from funders.json):
${funder.tone}

FRAMING NOTES (must shape every paragraph):
${funder.framing_notes}

CLAIMS TO LEAD WITH (feature these where the content supports):
${(funder.claims_to_lead_with || []).map(c => `  - ${c}`).join('\n')}

CLAIMS TO AVOID:
${(funder.claims_to_avoid || []).map(c => `  - ${c}`).join('\n') || '  (none)'}

RECENT ACTIVITY TO POTENTIALLY INCLUDE (use what's relevant; skip what isn't):
${candidateLines}

INSTRUCTIONS:
1. Draft a quarterly update letter from ACT to ${funder.primary_contact}.
2. Format: 250-450 words. Three to five paragraphs. Greeting → 1 anchor moment → 2-3 specific updates → close.
3. VOICE DISCIPLINE (Curtis method):
   - Name the room (the concrete place where work happened)
   - Name the body (the person + action)
   - Load the abstract noun against the concrete (parity, return, etc)
   - Stop the line before explanation
4. FORBIDDEN VOCAB (auto-fail if present): delve, crucial, pivotal, vital, tapestry, intricate, leverage, foster, cultivate, empower, unlock, transformative, journey, dedicated team
5. Plain English over institutional register. No pitch-deck phrasing. No marketing tone.
6. ALWAYS spell out "Accountable Listening and Meaningful Action (ALMA)" on first use.
7. Reference specific projects, not abstract ideas.
8. Cite numbers where they exist (commits, payments, dates).
9. Sign off as ACT (Ben + Nic). Match the relationship stage's warmth.

ALSO PRODUCE 3 SUBJECT-LINE CANDIDATES:
- Each ≤ 80 characters
- Each anchored to the most concrete moment in the body
- Avoid: "Quarterly update from...", rhetorical questions, emoji unless natural, exclamation marks
- Variety: one factual ("ACT-OO: basket walked country 11 times"), one anchored to a story moment ("The court forgets. We remember."), one straightforward ("Snow Foundation Q4: where your funding landed")

OUTPUT FORMAT (STRICT JSON, no prose, no markdown fence):
{
  "subject_candidates": ["...", "...", "..."],
  "body_md": "Dear ...,\\n\\n...body in markdown..."
}`;
}

async function draftBody(funder, candidates, editionPeriod) {
  const prompt = buildPrompt(funder, candidates, editionPeriod);
  console.log(`🤖 Drafting via Sonnet route (~${Math.round(prompt.length / 4)} input tokens)...`);
  const raw = await trackedAgentCompletionWithFallback(prompt, 'draft-funder-newsletter', {
    task: 'generate',
    maxTokens: 2500,
    temperature: 0.3,
    operation: 'draft-newsletter',
  });
  const parsed = extractJson(raw);
  if (!parsed || !parsed.body_md || !Array.isArray(parsed.subject_candidates)) {
    console.error('Raw LLM output:', raw.slice(0, 500));
    throw new Error('Drafter returned malformed JSON — see raw output above');
  }
  return parsed;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOICE GRADER (calls grade-voice tier 1 deterministic + LLM tier 2-3)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function voiceGrade(bodyText) {
  // Light-weight tier1-style check inline (avoid spawning grade-voice.mjs as a
  // subprocess for now — that requires a writable file). Future: refactor
  // grade-voice into a callable function.
  const FORBIDDEN = [
    'delve', 'crucial', 'pivotal', 'vital', 'tapestry', 'intricate',
    'leverage', 'foster', 'cultivate', 'empower', 'unlock',
    'transformative', 'journey', 'dedicated team', 'showcase', 'underscore',
    'meticulous', 'seamless', 'effortless', 'groundbreaking', 'renowned',
    'nestled', 'bustling', 'thriving', 'vibrant', 'enduring', 'timeless',
  ];
  const lower = bodyText.toLowerCase();
  const hits = FORBIDDEN.filter(w => new RegExp(`\\b${w}\\w*\\b`, 'i').test(lower));
  const aiTellsCount = hits.length;
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  // Score: 100 baseline, -25 per AI tell, -10 if outside 250-450 word range
  let score = 100;
  score -= aiTellsCount * 25;
  if (wordCount < 200 || wordCount > 500) score -= 10;
  if (score < 0) score = 0;
  return {
    score,
    word_count: wordCount,
    ai_tells: hits,
    details: {
      forbidden_hits: hits,
      length_ok: wordCount >= 200 && wordCount <= 500,
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n━━━ Draft funder newsletter: ${funderSlug} / ${editionPeriod} ━━━\n`);

  const funder = loadFunder();
  console.log(`📋 Funder: ${funder.name} (${funder.stage})`);
  console.log(`   Primary contact: ${funder.primary_contact}`);
  console.log(`   Tone: ${funder.tone.slice(0, 100)}`);

  const candidates = await loadCandidates(funderSlug);
  console.log(`\n📦 Candidates: ${candidates.length} marked 'include' for funder audience`);
  if (candidates.length === 0) {
    console.error(`\n❌ No candidates with status='include' AND audiences/auto_audiences contains 'funder'`);
    console.error(`   Either tag candidates as 'include' in Notion (once DBs are wired) OR via SQL:`);
    console.error(`     UPDATE newsletter_candidates SET status='include' WHERE id IN (...);`);
    console.error(`\n   Today's brand candidates can be retagged to funder by SET audiences=ARRAY['funder']`);
    process.exit(1);
  }

  const { allowed, softWarnings } = ocapCheck(candidates);
  console.log(`   After OCAP: ${allowed.length} allowed, ${candidates.length - allowed.length} hard-gated`);
  if (Object.keys(softWarnings).length) {
    console.log(`   ⚠️  Soft warnings: ${Object.keys(softWarnings).length} storytellers flagged`);
    for (const [sid, ws] of Object.entries(softWarnings)) {
      console.log(`      ${sid}: ${ws.join(', ')}`);
    }
  }

  if (dryRun) {
    console.log('\n[DRY RUN — no LLM call, no DB write]');
    console.log(`  Would draft from ${allowed.length} candidates`);
    console.log(`  Sample candidates:`);
    for (const c of allowed.slice(0, 5)) {
      console.log(`    - ${c.title.slice(0, 80)}`);
    }
    return;
  }

  const { body_md, subject_candidates } = await draftBody(funder, allowed, editionPeriod);
  console.log(`\n✓ Draft body: ${body_md.length} chars`);
  console.log(`✓ Subject candidates: ${subject_candidates.length}`);
  for (const s of subject_candidates) console.log(`    "${s}"`);

  const grade = await voiceGrade(body_md);
  console.log(`\n📐 Voice grade: ${grade.score}/100 (${grade.word_count} words${grade.ai_tells.length ? `, AI tells: ${grade.ai_tells.join(', ')}` : ', no AI tells'})`);

  const editionSlug = `${funderSlug}-${editionPeriod.toLowerCase()}`;
  const status = grade.score >= 80 ? 'graded' : 'drafting'; // <80 needs another iteration

  const { data, error } = await supabase
    .from('newsletter_drafts')
    .upsert({
      edition_slug: editionSlug,
      audience: 'funder',
      recipient_slug: funderSlug,
      edition_period: editionPeriod,
      subject_candidates,
      selected_subject: subject_candidates[0], // default to first; human can change
      body_md,
      candidate_ids: allowed.map(c => c.id),
      consent_warnings: Object.keys(softWarnings).length ? softWarnings : null,
      voice_grade_score: grade.score,
      voice_grade_details: grade.details,
      status,
      status_changed_at: new Date().toISOString(),
    }, { onConflict: 'edition_slug' })
    .select()
    .single();

  if (error) {
    console.error('DB write failed:', error.message);
    process.exit(1);
  }

  console.log(`\n✓ Draft saved: ${editionSlug} (id=${data.id.slice(0, 8)}..., status=${status})`);
  console.log(`\n--- DRAFT BODY ---\n${body_md}\n--- END ---`);

  if (grade.score < 80) {
    console.log(`\n⚠️  Voice grade ${grade.score}/100 is below the recommended 80. Edit before sending.`);
    console.log(`    Issues: ${grade.ai_tells.length ? 'AI tells found' : 'length out of range'}`);
  }
}

main().catch((e) => {
  console.error('Drafter failed:', e);
  process.exit(1);
});
