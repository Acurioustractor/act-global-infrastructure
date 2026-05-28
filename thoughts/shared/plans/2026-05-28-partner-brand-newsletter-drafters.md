---
title: Partner + brand newsletter drafters + public brand archive
slug: 2026-05-28-partner-brand-newsletter-drafters
status: proposed
created: 2026-05-28
plan_trailer: partner-brand-newsletter-drafters
related:
  - act-communication-pipeline-2026-05-23-locked
  - thoughts/shared/handoffs (comms-crm-operating-system memory)
---

# Partner + brand newsletter drafters + public brand archive

## Goal

Extend the ACT communication pipeline (funder drafter already live, "Snow MVP")
with two more audiences from `config/audience-segments.json`:

- **partner** — per-recipient monthly editions (hybrid config: `partners.json`
  bespoke override + live `ghl_contacts` fallback for the long tail of ~271).
- **brand** — per-audience fortnightly public edition, archived publicly at
  `act.place/newsletters/<slug>`.

Stop criteria: both drafter scripts run clean in `--dry-run`; the website
`/newsletters` routes typecheck + build; plan committed on a feature branch.
**Out of scope this session:** unified content calendar (next item), Gmail/GHL
send automation, migrating the funder script onto the shared lib, storyteller
own-story-back + delivery feedback loop.

## Context (verified 2026-05-28)

- `newsletter_drafts`: `recipient_slug` nullable ✓ (brand → null), unique on
  `edition_slug`, already has `body_html`, `ghl_campaign_id`, `notion_page_id`.
- `newsletter_candidates`: 207 rows. `auto_audiences` carries brand on 181,
  partner on 30. Only 5 rows are `status='include'` (all funder); 202 `proposed`.
  → drafters build correctly but produce real output only once brand/partner
  candidates are promoted to `include` (same curation gate the funder MVP uses).
- Website reads Supabase server-side via `getSupabaseServerClient()`
  (`apps/website/src/lib/supabase/server.ts`, service role) → archive route reads
  `newsletter_drafts` directly in a server component, no RLS policy needed.
- `/blog/[slug]` is the styling/structure precedent (ReactMarkdown body, server
  component, `revalidate = 60`, `generateStaticParams`).

## Files

### New — scripts
1. `scripts/lib/newsletter-drafter.mjs` — shared lib (avoid triplicating funder's
   ~150 lines). Exports: `getSupabase()`, `loadCandidates(supabase,{audience,
   recipientSlug,projectCodes})`, `ocapCheck(candidates,{allowedVisibility})`
   (generalised — funder hard-gate visibility list becomes a parameter),
   `voiceGrade(body)`, `draftBodyJSON(prompt,opName)`, `saveDraft(supabase,fields)`.
   Funder script left untouched (protect the working Snow MVP); migrate later.
2. `scripts/draft-partner-newsletter.mjs` — `<partner-ref> <edition-period>
   [--dry-run]`. Resolve profile: `partners.json.partners[ref]` if present, else
   treat ref as email (`@`) or ghl contact id → look up `ghl_contacts` for real
   name/email/org, merge with `_default` generic voice. Candidates scoped to
   `audience='partner'` (+ profile.project_codes filter if set). OCAP
   allowedVisibility `['partner','public']`. Save audience='partner',
   recipient_slug=slug, edition_slug=`partner-<slug>-<period>`.
3. `scripts/draft-brand-newsletter.mjs` — `<edition-period> [--dry-run]`. No
   recipient. Candidates `audience='brand'`. OCAP allowedVisibility `['public']`
   (strictest — public archive). General ACT brand voice prompt (inline Curtis
   rules, "Dear friends of ACT", multi-project). Save audience='brand',
   recipient_slug=null, edition_slug=`brand-<period>`.

### New — config
4. `wiki/narrative/partners.json` — mirrors funders.json shape. `_default`
   generic partner voice profile (honest, not impersonating a real partner) +
   empty `partners: {}` for Ben to curate bespoke entries. Schema documented in
   `description`.

### New — website (apps/website)
5. `src/lib/newsletters.ts` — `fetchSentBrandEditions(limit)` +
   `fetchBrandEditionBySlug(slug)` via `getSupabaseServerClient()`; return
   `[]`/`null` if client null. Filters audience='brand', status='sent'.
6. `src/app/newsletters/page.tsx` — index of sent brand editions (blog-list style,
   no images). `revalidate = 60`.
7. `src/app/newsletters/[slug]/page.tsx` — single edition, ReactMarkdown body_md,
   subject as title, `generateStaticParams` from sent editions, `notFound()` else.

## Schema-first checks before coding
- `information_schema.columns` for `ghl_contacts` (name/email/org column names)
  before writing the partner resolver — do not assume.

## Verification
- `node scripts/draft-partner-newsletter.mjs <ref> 2026-06 --dry-run` → candidate
  load + OCAP + resolver run, no LLM/DB write; graceful empty-candidate message.
- `node scripts/draft-brand-newsletter.mjs 2026-06 --dry-run`.
- `npx tsc --noEmit` in `apps/website` (or `pnpm --filter @act/website build`) for
  the new routes.
- Optional live draft: promote a couple of `proposed` brand/partner candidates to
  `include` to generate one real draft (only if Ben wants an end-to-end demo).

## Tiers / safety
- All Tier 1: new local files, local scripts, `--dry-run`, local commit on
  `wip/newsletter-drafters-2026-05-28`. No push / PR / send without explicit verb.
- No GHL writes (partner resolver only READS `ghl_contacts`).

## Decision log
- Partner config = **hybrid** (Ben, 2026-05-28): bespoke `partners.json` override
  + live ghl_contacts fallback. Rationale: 271 partners can't be hand-curated like
  48 funders; hybrid is usable now + no fabricated framing.
- Brand archive = **build now** (Ben, 2026-05-28): dedicated `/newsletters` route
  reading sent brand editions (not folded into /blog).
