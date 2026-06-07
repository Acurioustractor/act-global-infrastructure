---
title: GHL CRM Taxonomy & Pipeline System — Audit + Target Design
status: Draft (for Ben's review — no destructive changes made)
date: 2026-06-08
type: concept
summary: Full audit of the GHL location (12 pipelines · 61 contact custom fields in 8 folders · 31 opportunity fields · ~150 distinct tags), the problems found, a target taxonomy, a per-pipeline enrichment spec, and a gated migration path. Source of truth for any GHL tag/field cleanup.
relates_to: wiki/concepts/the-field.md · wiki/concepts/energy-orbit.md · wiki/concepts/ecosystem-value-exchange.md · scripts/enrich-ghl-grants.mjs
---

# GHL CRM Taxonomy & Pipeline System

> Read before any GHL tag/field cleanup. The pipelines grew organically; this is the one coherent map + the target. **Nothing destructive has been done — this is the design.** Bulk tag deletes / field merges are Tier 2/3 GHL writes that need Ben's explicit go, tracer-first.

## 1. Current state (audit 2026-06-08, live GHL `agzsSZWgovjwgpcoASWG`)

- **12 pipelines:** A Curious Tractor · Empathy Ledger · Goods Supporter Journey · Goods — Buyer Pipeline · Goods — Demand Register · Grants · Harvest Inbox · Harvest Membership Journey · Supporters & Donors · The Shop pipeline · Universal Inquiry.
- **61 contact custom fields** across 8 folders (parentIds): core/project (`F8Bx4ybeA6...`), comms/logistics (`7JjAfS8v...`), engagement-AI (`4cdopfBq...`), consent/cultural (`ccsXEDOj...`), identity (`InHrGJRq...`), storyteller (`N1hyUzNg...`), advocacy (`kRaGWryb...`), Goods commerce (`DTBataRh...`).
- **31 opportunity custom fields** (1 folder `2uKy5KYp...`) — incl. the 8 grant-enrichment fields added 2026-06-07.
- **~150 distinct contact tags**, dominated by 8 healthy namespaces but riddled with a parallel flat legacy set.

## 2. Problems found

**P1 — Dual taxonomy (the big one).** Every concept is tagged two ways:

| Concept | Namespaced (keep) | Legacy flat duplicate (migrate→delete) |
|---|---|---|
| Project | `project:act-gd` (894 uses/19 codes) | `goods` (287), `act-gd` (491), `act-hv` (95), `act-jh` (55), `justicehub` (90), `empathy ledger` (267, **has a space**) |
| Role | `role:funder/partner/storyteller` (704/19) | `funder` (36), `partner` (49), `storyteller` (285), **`Storyteller` (87 — case dup)**, `audience-funder` (84), `audience-partner` (277), `audience-brand` (119) |
| Comms | `comms:goods-newsletter` (1130/10) | `goods-newsletter` (210), `newsletter` (84) |
| Interest | `interest:membership` (444/15) | `interest-membership` (49), `interest-community` (46), `interest-events` (43), `interest-markets` (36), `interest-workshops` (35) |
| Goods sub-state | (belongs in role/tier/place) | `goods-supporter` (113), `goods-nurture` (69), `goods-warm` (45), `goods-inquiry` (126), `goods-funder` (49), `goods-communitycontrolled` (39), `goods-state-nt` (53), `goods-gmail-active` (39) |

**P2 — Two warmth systems running in parallel.** `ring:5/15/50/150/out` (56 uses — Field/Dunbar relationship closeness) vs `tier:curious/connected/member` (149 — engagement stage). They measure different things but overlap in use and confuse "how close" with "how engaged." Pick one axis per question (see §3).

**P3 — Operational cruft as tags.** `gone-from-ghl` (326) + `gone-from-ghl-2026-05-27` (301) are migration artifacts; `harvest-website` (179), `eoi-gathering-march-2026` (49) are sources that should be `source:event:*` / `source:website`. ~900 tag-uses are noise.

**P4 — Inconsistent formatting.** `source: footer` (space after colon) vs `source:footer`; `Storyteller` vs `storyteller`; `empathy ledger` (space, no namespace). Breaks every filter that assumes a clean key.

**P5 — Redundant / wrong-typed custom fields.**
- **5 project-tagging fields** all doing the job `project:` tags already do: `Project Designation` · `Project Interest` · `Project Links` · `Project Role` · `Seeds`.
- **Duplicate field:** `how_did_you_hear` AND `How did you hear about us?`.
- **Engagement scoring spread across 4 fields, two as TEXT that should be numeric:** `engagement_score` (TEXT), `engagement_tier` (TEXT), `engagement_scored_at`, `Relationship Score` (NUMERICAL). Can't sort/filter on a TEXT score.
- **Overlap:** `Interests` (RADIO) vs `Volunteer Interests` (MULTI); `communication_preference` vs `best_contact_time`.

## 3. Target taxonomy (the canonical namespaces)

One namespace per question. Lowercase, colon-delimited, no spaces, no flat synonyms.

| Namespace | Question it answers | Values | Authority |
|---|---|---|---|
| `project:` | Which ACT project(s)? | act-core/gd/hv/jh/el/oo/ra/ce/cn/fa/mr/ca/bg/cf/fm/gl/in/rp · watch | the 18 project codes |
| `role:` | What is this person/org TO us? | funder · partner · supplier · buyer · supporter · storyteller · advisor · community · community-controlled · elder · gov · council · land-council · researcher · media · health-service · housing-provider | one or more |
| `comms:` | Which automated stream may reach them? | act-newsletter · goods/harvest/justicehub-newsletter · funder/partner/buyer/supporter-drip · nurture | **lane:community ⇒ NONE** |
| `interest:` | What do they care about? | community · events · markets · workshops · storytelling · justice-reform · sustainability · garden · food · volunteer · membership · washer · container · venue · festivals | self-declared |
| `tier:` | How engaged (the ladder)? | curious → connected → member → active → steward | ONE, advances |
| `ring:` | How close (the Field/Dunbar)? | 5 · 15 · 50 · 150 · out | ONE, hand-curated |
| `place:` | Where? | state (nt/qld/…) · community:* · city | one or more |
| `source:` | How did they enter? | website · footer · inbound · event:<slug> · gmail-discovery · grantscope · prospect-push · beeper · social · empathy-ledger | set once |
| `lane:` | Community line (the guardrail) | community | **if present: no `comms:` drips, ever** |

**Warmth resolution (P2):** keep BOTH but make them orthogonal and never substitute — `ring:` = relationship closeness (who Ben tends, hand-set), `tier:` = funnel stage (auto-advanced by behaviour). A person can be `ring:50` + `tier:curious` (close but not yet activated). Document this so they stop being used interchangeably.

## 4. Custom-field consolidation

**Keep (the spine):**
- **Identity:** preferred_name, pronouns, ABN, CivicGraph Profile, supabase_user_id, electorate.
- **Consent/cultural (OCAP-critical — never touch without care):** consent_status, ai_processing_consent, newsletter_consent, Consent Source, Consent Timestamp, indigenous_status, cultural_protocols, mukurtu_node_community.
- **Goods commerce:** Order Number/Total, Product Type, Community, Beds/Washers delivered, Last delivery date, Goods·Asset ID, Goods·Sponsor Dedication.
- **Engagement (after fix):** collapse to `Relationship Score` (NUMERICAL) + `engagement_tier` (→ mirror of `tier:` tag) + `Last AI Action` / `First Action Date` / `Last Ask Date`. **Retype `engagement_score` to numeric or delete.**

**Merge / retire:**
- 5 project fields → **drop in favour of `project:` tags** (keep `Seeds` only if it means "origin project" distinct from current). Pick ONE if a field is needed for forms; retire the rest.
- `how_did_you_hear` + `How did you hear about us?` → one field, map to `source:`.
- `Interests` (RADIO) → fold into `interest:` tags or `Volunteer Interests`.

## 5. Per-pipeline enrichment (what each pipeline SHOULD carry)

The grants enrichment (§ `enrich-ghl-grants.mjs`) is the model — every pipeline's opportunities should be triageable at a glance. Opportunity custom fields already exist for most of this; the gap is *populating* them per pipeline.

| Pipeline | Add / populate on its opps | Why |
|---|---|---|
| **Grants** | ✅ done — Funder, Fit score, Amount range, What it funds, Eligibility, Focus areas, Geography, Discovery source, Submission link/date | triage queue without opening URLs |
| **Goods — Buyer Pipeline** | Goods:Beds, Goods:Washers (exist!), Capital status, Amount basis, Community, Next reporting action | unit economics + delivery proof on the card |
| **Goods Supporter Journey** | Capital status, Funding type=Philanthropic, Last ask date, Impact-report fields (exist) | moves-management at a glance |
| **Goods — Demand Register** | Community, Goods:Beds/Washers (the *need* qty), place | the unmet-need asset to show funders |
| **Harvest Membership Journey** | Funding type=Community contribution, interest tags | membership cultivation |
| **The Shop pipeline** | Product Type, Order Total | retail stocking funnel |
| **Empathy Ledger** | story_consent_status, story count, consent fields | OCAP gate on the card |
| **Universal Inquiry / Harvest Inbox** | source, suggested action | routing |

**Cross-pipeline win:** the contact-level `tier:`/`ring:` and `role:` should surface on opportunity cards via the linked contact, so warmth shows where you work deals.

## 6. Migration path (gated — nothing runs without Ben's go)

Tracer-first, never a blind bulk rewrite (the community-line breach risk is real — see §7).

1. **Mapping script (read-only, build first):** `scripts/ghl-taxonomy-migrate.mjs --dry-run` — for each legacy flat tag, the namespaced target (table in §2/§3), counts, and the exact add/remove plan per contact. Output a worksheet, write nothing.
2. **Tracer:** apply to 1 contact end-to-end, verify in GHL UI.
3. **Bucketed apply (Tier 2, per Ben's verb):** migrate one namespace at a time (e.g. all `goods-newsletter`→`comms:goods-newsletter` first), re-verify community-line guard after each (no `comms:` drip lands on a `lane:community` person).
4. **Cruft sweep:** delete `gone-from-ghl*` artifacts last, after confirming nothing filters on them.
5. **Fields:** retype `engagement_score`→numeric, dedupe the two how-did-you-hear fields, decide the 5→1 project-field collapse.

## 7. Guardrail baked in

Any tag migration MUST re-assert the community-line rule: a contact carrying `lane:community` or `role:community`/`role:storyteller` gets **zero** `comms:*-drip` / newsletter tags. The 2026-06-07 strip (Kristy Bloomfield, Shaun Fisher, Rachel Atkinson) fixed the current breaches; the migration script must check this invariant on every write, not re-introduce it. See `scripts/strip-community-line-tags.mjs`.

## What this buys

From "two tag systems, 61 fields, ~150 tags, can't trust a filter" → **one namespace per question, deduped fields, every pipeline card triageable, the community line enforced in code.** Smart-lists and the energy-orbit reads stop missing people who were tagged the "other" way.
