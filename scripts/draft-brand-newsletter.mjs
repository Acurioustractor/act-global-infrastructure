#!/usr/bin/env node
/**
 * Brand newsletter drafter — per-audience, fortnightly, PUBLIC.
 *
 * One edition for the whole brand list (no per-recipient personalisation). The
 * sent edition is also published to the public archive at act.place/newsletters.
 * Because it is public, the OCAP gate is the strictest of all audiences: EL
 * stories are only included when consent_visibility = 'public'.
 *
 * Reads:
 *   - newsletter_candidates  (status='include', audiences/auto_audiences contains 'brand')
 *   - OCAP guardrails on EL stories  (allowedVisibility = ['public'])
 *
 * Writes:
 *   - newsletter_drafts (audience='brand', recipient_slug=NULL, edition_slug='brand-<period>')
 *
 * Usage:
 *   node scripts/draft-brand-newsletter.mjs <edition-period> [--dry-run]
 *   node scripts/draft-brand-newsletter.mjs 2026-06-A
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 *       2026-05-28-partner-brand-newsletter-drafters
 */

import 'dotenv/config';
import {
  getSupabase,
  loadCandidates,
  ocapCheck,
  voiceGrade,
  draftBodyJSON,
  saveDraft,
} from './lib/newsletter-drafter.mjs';

const args = process.argv.slice(2);
const editionPeriod = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!editionPeriod) {
  console.error('Usage: node scripts/draft-brand-newsletter.mjs <edition-period> [--dry-run]');
  console.error('Example: node scripts/draft-brand-newsletter.mjs 2026-06-A');
  process.exit(1);
}

const supabase = getSupabase();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROMPT (per-audience public note — no named recipient)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPrompt(candidates, period) {
  const candidateLines = candidates.map((c) => {
    const proj = c.project_codes?.length ? ` [${c.project_codes.join(',')}]` : '';
    return `- (${c.source_type}, ${c.event_date}${proj}) ${c.title}${c.summary ? ` — ${c.summary}` : ''}${c.url ? ` [${c.url}]` : ''}`;
  }).join('\n');

  return `You are drafting the fortnightly PUBLIC newsletter from A Curious Tractor (ACT). One edition for everyone on the public list — no named recipient. It will also be published to a public web archive, so write for a general reader who follows ACT's work.

EDITION: ${period}

VOICE (ACT brand voice — Curtis method):
- Grounded, plain, specific. Field-notes from real places, not a press release.
- Name the room (the concrete place), name the body (the person + action), load the abstract noun against the concrete, stop the line before explanation.
- Warm but not promotional. We are letting people in on the work, not selling.

RECENT ACTIVITY ACROSS THE ECOSYSTEM (select the 3-5 strongest; skip the rest):
${candidateLines}

INSTRUCTIONS:
1. Draft a public fortnightly note from ACT. Open without a named person — e.g. "Hi from the farm," or a concrete cold open. Do NOT write "Dear [name]".
2. Format: 250-450 words. A short intro, then 3-5 short project highlights (each anchored to a place, a person, a number/date), then a one-line close inviting reply or a visit.
3. VOICE DISCIPLINE (Curtis method): name the room, name the body, load the abstract noun against the concrete, stop the line before explanation.
4. FORBIDDEN VOCAB (auto-fail if present): delve, crucial, pivotal, vital, tapestry, intricate, leverage, foster, cultivate, empower, unlock, transformative, journey, dedicated team
5. Plain English. No pitch-deck phrasing, no marketing tone, no savior narrative, no overclaiming.
6. ALWAYS spell out "Australian Living Map of Alternatives (ALMA)" on first use.
7. Reference specific projects, not abstract ideas. Cite numbers/dates where they exist.
8. Sign off as ACT (Ben + Nic).

ALSO PRODUCE 3 SUBJECT-LINE CANDIDATES:
- Each ≤ 80 characters
- Each anchored to the most concrete moment in the body
- Avoid: "Fortnightly update from...", rhetorical questions, exclamation marks
- Variety: one factual, one anchored to a story moment, one straightforward

OUTPUT FORMAT (STRICT JSON, no prose, no markdown fence):
{
  "subject_candidates": ["...", "...", "..."],
  "body_md": "Hi from the farm,\\n\\n...body in markdown..."
}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n━━━ Draft brand newsletter: ${editionPeriod} ━━━\n`);

  const { candidates, sinceDate, lastEdition } = await loadCandidates(supabase, {
    audience: 'brand',
    recipientSlug: null,
  });
  console.log(`📦 Candidates: ${candidates.length} 'include' for brand audience (event_date >= ${sinceDate}, last edition: ${lastEdition?.edition_period || 'never'})`);
  if (candidates.length === 0) {
    console.error(`\n❌ No candidates with status='include' AND audiences/auto_audiences contains 'brand'.`);
    console.error(`   Promote candidates in Notion, or via SQL:`);
    console.error(`     UPDATE newsletter_candidates SET status='include' WHERE id IN (...);`);
    process.exit(1);
  }

  // Brand is public → strictest gate: only 'public' EL stories.
  const { allowed, softWarnings } = ocapCheck(candidates, { allowedVisibility: ['public'] });
  console.log(`   After OCAP (public-only): ${allowed.length} allowed, ${candidates.length - allowed.length} hard-gated`);
  if (Object.keys(softWarnings).length) {
    console.log(`   ⚠️  Soft warnings: ${Object.keys(softWarnings).length} storytellers flagged`);
    for (const [sid, ws] of Object.entries(softWarnings)) console.log(`      ${sid}: ${ws.join(', ')}`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN — no LLM call, no DB write]');
    console.log(`  Would draft from ${allowed.length} candidates:`);
    for (const c of allowed.slice(0, 5)) console.log(`    - ${c.title.slice(0, 80)}`);
    return;
  }

  const { body_md, subject_candidates } = await draftBodyJSON(
    buildPrompt(allowed, editionPeriod),
    'draft-brand-newsletter',
  );
  console.log(`\n✓ Draft body: ${body_md.length} chars · ${subject_candidates.length} subject candidates`);
  for (const s of subject_candidates) console.log(`    "${s}"`);

  const grade = voiceGrade(body_md);
  console.log(`\n📐 Voice grade: ${grade.score}/100 (${grade.word_count} words${grade.ai_tells.length ? `, AI tells: ${grade.ai_tells.join(', ')}` : ', no AI tells'})`);

  const editionSlug = `brand-${editionPeriod.toLowerCase()}`;
  const status = grade.score >= 80 ? 'graded' : 'drafting';

  const data = await saveDraft(supabase, {
    edition_slug: editionSlug,
    audience: 'brand',
    recipient_slug: null,
    edition_period: editionPeriod,
    subject_candidates,
    selected_subject: subject_candidates[0],
    body_md,
    candidate_ids: allowed.map((c) => c.id),
    consent_warnings: Object.keys(softWarnings).length ? softWarnings : null,
    voice_grade_score: grade.score,
    voice_grade_details: grade.details,
    status,
    status_changed_at: new Date().toISOString(),
  });

  console.log(`\n✓ Draft saved: ${editionSlug} (id=${data.id.slice(0, 8)}..., status=${status})`);
  console.log(`   Public archive (after --mark-sent): act.place/newsletters/${editionSlug}`);
  console.log(`\n--- DRAFT BODY ---\n${body_md}\n--- END ---`);
  if (grade.score < 80) console.log(`\n⚠️  Voice grade ${grade.score}/100 below 80 — edit before sending.`);
}

main().catch((e) => {
  console.error('Drafter failed:', e);
  process.exit(1);
});
