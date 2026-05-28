/**
 * Shared building blocks for the ACT newsletter drafters.
 *
 * Extracted from scripts/draft-funder-newsletter.mjs so the partner + brand
 * drafters don't re-duplicate candidate loading, the OCAP gate, voice grading,
 * the LLM call and the DB write. The funder drafter is deliberately left on its
 * own inline copy for now (it's the live "Snow MVP" — migrate it later).
 *
 * The prompt itself stays in each drafter (it's audience-specific); everything
 * around the prompt lives here.
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 *       2026-05-28-partner-brand-newsletter-drafters
 */

import { createClient } from '@supabase/supabase-js';
import {
  trackedAgentCompletionWithFallback,
  extractJson,
} from './llm-client.mjs';

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANDIDATE LOADING
// Scopes by the last *sent* edition for this audience (+ recipient, when the
// audience is per-recipient). Brand is per-audience → recipientSlug is null and
// we scope by audience alone.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function loadCandidates(
  supabase,
  { audience, recipientSlug = null, projectCodes = null, sinceFallback = '2026-01-01', limit = 40 },
) {
  let lastQ = supabase
    .from('newsletter_drafts')
    .select('sent_at, edition_period')
    .eq('audience', audience)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1);
  lastQ = recipientSlug ? lastQ.eq('recipient_slug', recipientSlug) : lastQ.is('recipient_slug', null);
  const { data: lastEdition } = await lastQ.maybeSingle();

  const sinceDate = lastEdition?.sent_at
    ? new Date(lastEdition.sent_at).toISOString().slice(0, 10)
    : sinceFallback;

  const applyCommon = (q) => {
    q = q.eq('status', 'include').gte('event_date', sinceDate).order('event_date', { ascending: false }).limit(limit);
    if (projectCodes?.length) q = q.overlaps('project_codes', projectCodes);
    return q;
  };

  // Manual audience override
  const { data, error } = await applyCommon(
    supabase.from('newsletter_candidates').select('*').contains('audiences', [audience]),
  );
  if (error) throw error;

  // Auto-classified, no manual override
  const { data: autoData } = await applyCommon(
    supabase.from('newsletter_candidates').select('*').is('audiences', null).contains('auto_audiences', [audience]),
  );

  const byId = new Map();
  for (const row of [...(data || []), ...(autoData || [])]) byId.set(row.id, row);
  return { candidates: [...byId.values()], sinceDate, lastEdition };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OCAP GUARDRAILS (locked Q10), generalised per audience.
//
// allowedVisibility is the set of consent_visibility values an EL story may
// carry to be included. funder→['funder','public'], partner→['partner','public'],
// brand→['public'] (strictest, since brand is publicly archived). A null/unknown
// visibility is always gated out. Non-EL candidates (payments, milestones) pass
// unconditionally — they carry no storyteller consent.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ocapCheck(candidates, { allowedVisibility = ['public'] } = {}) {
  const allowed = [];
  const softWarnings = {};
  for (const c of candidates) {
    if (c.source_type !== 'el_story_updated') {
      allowed.push(c);
      continue;
    }
    // HARD GATES (skip entirely)
    if (c.consent_visibility === 'private') continue;
    if (!allowedVisibility.includes(c.consent_visibility)) continue;
    const payload = c.payload || {};
    if (payload.consent_to_share === false) continue;
    if (payload.requires_elder_review === true && !payload.elder_reviewed_at) continue;
    // SOFT WARNINGS (allow but flag for double-confirm before send)
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
// VOICE GRADER — lightweight tier-1 forbidden-vocab + length check.
// (Mirrors draft-funder-newsletter.mjs; the heavier LLM graders run separately.)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FORBIDDEN = [
  'delve', 'crucial', 'pivotal', 'vital', 'tapestry', 'intricate',
  'leverage', 'foster', 'cultivate', 'empower', 'unlock',
  'transformative', 'journey', 'dedicated team', 'showcase', 'underscore',
  'meticulous', 'seamless', 'effortless', 'groundbreaking', 'renowned',
  'nestled', 'bustling', 'thriving', 'vibrant', 'enduring', 'timeless',
];

export function voiceGrade(bodyText, { minWords = 200, maxWords = 500 } = {}) {
  const lower = bodyText.toLowerCase();
  const hits = FORBIDDEN.filter((w) => new RegExp(`\\b${w}\\w*\\b`, 'i').test(lower));
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  let score = 100;
  score -= hits.length * 25;
  if (wordCount < minWords || wordCount > maxWords) score -= 10;
  if (score < 0) score = 0;
  return {
    score,
    word_count: wordCount,
    ai_tells: hits,
    details: { forbidden_hits: hits, length_ok: wordCount >= minWords && wordCount <= maxWords },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LLM DRAFT — single call returns { subject_candidates[], body_md }.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function draftBodyJSON(prompt, opName, opts = {}) {
  const { maxTokens = 2500, temperature = 0.3, operation = 'draft-newsletter' } = opts;
  console.log(`🤖 Drafting via LLM route (~${Math.round(prompt.length / 4)} input tokens)...`);
  const raw = await trackedAgentCompletionWithFallback(prompt, opName, {
    task: 'generate',
    maxTokens,
    temperature,
    operation,
  });
  const parsed = extractJson(raw);
  if (!parsed || !parsed.body_md || !Array.isArray(parsed.subject_candidates)) {
    console.error('Raw LLM output:', String(raw).slice(0, 500));
    throw new Error('Drafter returned malformed JSON — see raw output above');
  }
  return parsed;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAVE — upsert keyed on edition_slug.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function saveDraft(supabase, fields) {
  const { data, error } = await supabase
    .from('newsletter_drafts')
    .upsert(fields, { onConflict: 'edition_slug' })
    .select()
    .single();
  if (error) {
    console.error('DB write failed:', error.message);
    throw error;
  }
  return data;
}
