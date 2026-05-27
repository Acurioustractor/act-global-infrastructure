#!/usr/bin/env node
/**
 * Partner newsletter drafter — per-recipient, monthly, private.
 *
 * Hybrid config (decided 2026-05-28): a bespoke entry in
 * wiki/narrative/partners.json[partners][slug] overrides everything; partners
 * with no entry fall back to `_default` + a live ghl_contacts lookup for the
 * recipient's real name / email / org. Works for the whole audience-partner list
 * (~271) without hand-curating each one, and never fabricates framing.
 *
 * Reads:
 *   - wiki/narrative/partners.json  (bespoke profile or _default fallback)
 *   - ghl_contacts                  (fallback name/email/org by email or ghl_id)
 *   - newsletter_candidates         (status='include', audiences contains 'partner',
 *                                    optionally filtered to the partner's project_codes)
 *   - OCAP guardrails on EL stories  (allowedVisibility = ['partner','public'])
 *
 * Writes:
 *   - newsletter_drafts (audience='partner', recipient_slug=<slug>)
 *
 * Usage:
 *   node scripts/draft-partner-newsletter.mjs <partner-ref> <edition-period> [--dry-run]
 *   node scripts/draft-partner-newsletter.mjs acme-recycling 2026-06
 *   node scripts/draft-partner-newsletter.mjs jane@acme.com 2026-06      # email fallback
 *   node scripts/draft-partner-newsletter.mjs <ghl-contact-id> 2026-06   # id fallback
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 *       2026-05-28-partner-brand-newsletter-drafters
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getSupabase,
  loadCandidates,
  ocapCheck,
  voiceGrade,
  draftBodyJSON,
  saveDraft,
} from './lib/newsletter-drafter.mjs';

const args = process.argv.slice(2);
const partnerRef = args[0];
const editionPeriod = args[1];
const dryRun = args.includes('--dry-run');

if (!partnerRef || !editionPeriod) {
  console.error('Usage: node scripts/draft-partner-newsletter.mjs <partner-ref> <edition-period> [--dry-run]');
  console.error('  <partner-ref> = partners.json slug, OR an email, OR a GHL contact id');
  console.error('Example: node scripts/draft-partner-newsletter.mjs acme-recycling 2026-06');
  process.exit(1);
}

const supabase = getSupabase();
const PARTNERS_PATH = fileURLToPath(new URL('../wiki/narrative/partners.json', import.meta.url));

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESOLVE PARTNER PROFILE (hybrid: partners.json → ghl_contacts fallback)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function resolvePartner(ref) {
  if (!existsSync(PARTNERS_PATH)) throw new Error(`partners.json missing at ${PARTNERS_PATH}`);
  const config = JSON.parse(readFileSync(PARTNERS_PATH, 'utf8'));
  const fallback = config._default || {};

  // 1. Bespoke entry by slug
  const bespoke = config.partners?.[ref];
  if (bespoke) {
    return {
      slug: ref,
      source: 'partners.json',
      name: bespoke.name || ref,
      primary_contact: bespoke.primary_contact || 'there',
      primary_email: bespoke.primary_email || null,
      stage: bespoke.stage || fallback.stage || 'active',
      tone: bespoke.tone || fallback.tone,
      framing_notes: bespoke.framing_notes || fallback.framing_notes,
      claims_to_lead_with: bespoke.claims_to_lead_with || fallback.claims_to_lead_with || [],
      claims_to_avoid: bespoke.claims_to_avoid || fallback.claims_to_avoid || [],
      project_codes: bespoke.project_codes || null,
    };
  }

  // 2. Fallback — look the contact up in GHL (by email, else by ghl_id)
  const isEmail = ref.includes('@');
  let q = supabase.from('ghl_contacts').select('ghl_id, full_name, first_name, last_name, email, company_name');
  q = isEmail ? q.ilike('email', ref) : q.eq('ghl_id', ref);
  const { data: contact, error } = await q.limit(1).maybeSingle();
  if (error) throw error;

  if (!contact) {
    throw new Error(
      `Partner '${ref}' not found in partners.json and no ghl_contacts match `
      + `(${isEmail ? 'email' : 'ghl_id'}='${ref}'). Add a bespoke entry to partners.json, `
      + `or pass an email / GHL contact id that exists in ghl_contacts.`,
    );
  }

  const displayName = contact.company_name || contact.full_name
    || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || ref;
  return {
    slug: slugify(contact.ghl_id ? `ghl-${contact.ghl_id}` : (contact.email || ref)),
    source: 'ghl_contacts',
    name: displayName,
    primary_contact: contact.first_name || contact.full_name || 'there',
    primary_email: contact.email || null,
    stage: fallback.stage || 'active',
    tone: fallback.tone,
    framing_notes: fallback.framing_notes,
    claims_to_lead_with: fallback.claims_to_lead_with || [],
    claims_to_avoid: fallback.claims_to_avoid || [],
    project_codes: null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROMPT (per-recipient partner update)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPrompt(partner, candidates, period) {
  const candidateLines = candidates.map((c) => {
    const proj = c.project_codes?.length ? ` [${c.project_codes.join(',')}]` : '';
    return `- (${c.source_type}, ${c.event_date}${proj}) ${c.title}${c.summary ? ` — ${c.summary}` : ''}${c.url ? ` [${c.url}]` : ''}`;
  }).join('\n');

  return `You are drafting a monthly update from A Curious Tractor (ACT) to a delivery partner / collaborator.

RECIPIENT: ${partner.name}
PRIMARY CONTACT: ${partner.primary_contact}
RELATIONSHIP STAGE: ${partner.stage}
EDITION: ${period}

VOICE TONE:
${partner.tone}

FRAMING NOTES (must shape every paragraph):
${partner.framing_notes}

CLAIMS TO LEAD WITH (feature where the content supports):
${(partner.claims_to_lead_with || []).map((c) => `  - ${c}`).join('\n') || '  (none — let the content lead)'}

CLAIMS TO AVOID:
${(partner.claims_to_avoid || []).map((c) => `  - ${c}`).join('\n') || '  (none)'}

RECENT ACTIVITY TO POTENTIALLY INCLUDE (use what's relevant to this partner; skip what isn't):
${candidateLines}

INSTRUCTIONS:
1. Draft a short monthly update from ACT to ${partner.primary_contact}, written partner-to-partner (we are fellow workers, not a sponsor and not a marketing list).
2. Format: 200-400 words. Three to four paragraphs. Greeting → what moved on the shared work → 1-2 specifics → the one thing next (an ask, an invite, or what we're bringing them).
3. VOICE DISCIPLINE (Curtis method):
   - Name the room (the concrete place where work happened)
   - Name the body (the person + action)
   - Load the abstract noun against the concrete
   - Stop the line before explanation
4. FORBIDDEN VOCAB (auto-fail if present): delve, crucial, pivotal, vital, tapestry, intricate, leverage, foster, cultivate, empower, unlock, transformative, journey, dedicated team
5. Plain English. No pitch-deck phrasing, no marketing tone, no thanking-the-funder register.
6. ALWAYS spell out "Australian Living Map of Alternatives (ALMA)" on first use.
7. Reference specific projects, not abstract ideas. Cite numbers/dates where they exist.
8. Sign off as ACT (Ben + Nic). Match the relationship stage's warmth.

ALSO PRODUCE 3 SUBJECT-LINE CANDIDATES:
- Each ≤ 80 characters
- Each anchored to the most concrete moment in the body
- Avoid: "Monthly update from...", rhetorical questions, exclamation marks
- Variety: one factual, one anchored to a moment, one straightforward

OUTPUT FORMAT (STRICT JSON, no prose, no markdown fence):
{
  "subject_candidates": ["...", "...", "..."],
  "body_md": "Hi ...,\\n\\n...body in markdown..."
}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n━━━ Draft partner newsletter: ${partnerRef} / ${editionPeriod} ━━━\n`);

  const partner = await resolvePartner(partnerRef);
  console.log(`📋 Partner: ${partner.name} (${partner.stage}) — resolved via ${partner.source}`);
  console.log(`   Slug: ${partner.slug}`);
  console.log(`   Primary contact: ${partner.primary_contact}${partner.primary_email ? ` <${partner.primary_email}>` : ' (no email on file)'}`);
  if (partner.project_codes?.length) console.log(`   Project filter: ${partner.project_codes.join(', ')}`);

  const { candidates, sinceDate, lastEdition } = await loadCandidates(supabase, {
    audience: 'partner',
    recipientSlug: partner.slug,
    projectCodes: partner.project_codes,
  });
  console.log(`\n📦 Candidates: ${candidates.length} 'include' for partner audience (event_date >= ${sinceDate}, last edition: ${lastEdition?.edition_period || 'never'})`);
  if (candidates.length === 0) {
    console.error(`\n❌ No candidates with status='include' AND audiences/auto_audiences contains 'partner'${partner.project_codes ? ` AND project_codes overlapping [${partner.project_codes.join(',')}]` : ''}.`);
    console.error(`   Promote candidates in Notion, or via SQL:`);
    console.error(`     UPDATE newsletter_candidates SET status='include' WHERE id IN (...);`);
    process.exit(1);
  }

  const { allowed, softWarnings } = ocapCheck(candidates, { allowedVisibility: ['partner', 'public'] });
  console.log(`   After OCAP: ${allowed.length} allowed, ${candidates.length - allowed.length} hard-gated`);
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
    buildPrompt(partner, allowed, editionPeriod),
    'draft-partner-newsletter',
  );
  console.log(`\n✓ Draft body: ${body_md.length} chars · ${subject_candidates.length} subject candidates`);
  for (const s of subject_candidates) console.log(`    "${s}"`);

  const grade = voiceGrade(body_md);
  console.log(`\n📐 Voice grade: ${grade.score}/100 (${grade.word_count} words${grade.ai_tells.length ? `, AI tells: ${grade.ai_tells.join(', ')}` : ', no AI tells'})`);

  const editionSlug = `partner-${partner.slug}-${editionPeriod.toLowerCase()}`;
  const status = grade.score >= 80 ? 'graded' : 'drafting';

  const data = await saveDraft(supabase, {
    edition_slug: editionSlug,
    audience: 'partner',
    recipient_slug: partner.slug,
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
  console.log(`\n--- DRAFT BODY ---\n${body_md}\n--- END ---`);
  if (grade.score < 80) console.log(`\n⚠️  Voice grade ${grade.score}/100 below 80 — edit before sending.`);
}

main().catch((e) => {
  console.error('Drafter failed:', e);
  process.exit(1);
});
