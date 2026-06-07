# Plan — GHL Tag Canonicalization

> Status: DRAFT for approval. No tag writes, no GHL writes, no sends until Ben approves an execution phase. Sourced from live data 2026-05-29 (see `thoughts/shared/handoffs/2026-05-29-ghl-tier1-prep-pack.md`).

## Goal

Collapse duplicate/competing encodings of the same concept down to one canonical tag each, so that audience segments are reliably addressable and the send-list engine (`assign-audience-segments.mjs`) + a future `audience_segment` enum column compute against one truth instead of 3-4 spellings.

## Non-goals

- Not deleting the deliberate sub-taxonomies (`interest-*`, `goods-tier-*`, `goods-stage-*`, `goods-role-*`, per-project newsletter lists). Those stay.
- Not touching `gone-from-ghl*` (328) except to confirm they remain excluded from every send.
- Not triggering any automated email. This plan is safe-by-construction against the GHL workflows (see Safety).

## Why (live evidence, full population)

174 distinct tags; 41% used once. Same concept spelled 3-4 ways. Tags carry the entire segmentation load (no `audience_segment` column), so the sprawl is load-bearing, not cosmetic.

## The canonicalization map

### Frozen map (Ben's decisions, 2026-05-29)

Action `merge` = add canonical, then remove legacy. `rename` = add new tag, remove old. `keep` = leave as-is.

| Concept | Action | Canonical (keep) | Legacy → removed | Contacts touched |
|---|---|---|---|---|
| Storyteller | merge | `audience-storyteller` (34) | `storyteller` (287), `Storyteller` (87) | ~374 |
| Partner | cleanup + **type** | `audience-partner` + new `partner-<type>` | remove redundant `partner` (45/48 already have audience-partner; 3 bare-only to review) | ~48 |
| Funder | cleanup + **type** | `audience-funder` + new `funder-<type>` | remove redundant `funder` (28/35 have audience-funder; **7 are `gone-from-ghl` → exclude**) | ~35 |
| Goods project | merge | `act-gd` (475) | `project:act-gd` (215), **`goods` (255)** | ~470 |
| Main ACT newsletter | rename | **`act-newsletter`** (new) | `newsletter` (82) | ~82 |

**Kept as deliberate sub-taxonomies (NOT touched):** `goods-funder` (42, Goods-specific funder sub-tag), `goods-newsletter` (187), `harvest-newsletter` (72), all `interest-*`, `goods-tier-*`, `goods-stage-*`, `goods-role-*`.

Notes:
- `goods` (255) merges to `act-gd` per Ben — the bare `goods` tag only; the `goods-*` family is untouched.
- Bare `newsletter` → `act-newsletter` (the main ACT newsletter) so there's no ambiguous catch-all; per-project lists stay.
- Optional enrichment (Ben to confirm later): also add `audience-funder` to the 42 `goods-funder` contacts so they're in the funder segment while keeping the Goods sub-tag.

## Partner & Funder type taxonomy (PROPOSED — Ben to edit, 2026-05-29)

Ben chose to add a TYPE dimension rather than a flat audience tag. Proposed controlled vocab (sub-tags alongside `audience-partner` / `audience-funder`; project + stage tags still carry the rest of the context):

**Partner types** (`partner-<type>`):
- `partner-delivery` — on-Country / community implementers (e.g. Oonchiumpa, community stores, councils running programs)
- `partner-community` — ACCOs / community organisations
- `partner-government` — agencies, councils, departments acting as partners
- `partner-strategic` — ecosystem allies / co-designers
- `partner-referral` — distribution / lead-source partners

**Funder types** (`funder-<type>`):
- `funder-foundation` — independent philanthropic trusts (Snow, Paul Ramsay, Ian Potter, Brian M Davis, Bryan, Mjd, Yeperenye Trust, Centrecorp, NAACT)
- `funder-corporate` — company-linked foundations / CSR (QBE, BHP, Rio Tinto, Fortescue, Minderoo)
- `funder-government` — govt grants (REAL Innovation Fund/DEWR, NIAA, ILSC)
- `funder-intermediary` — regrantors / networks (Australian Communities Foundation, The Funding Network, Philanthropy Australia, FRRR)
- `funder-individual` — individual / major donors
- (`funder-faith` / `funder-serviceclub` — only if Ben wants them split out; else fold into intermediary/community)

**Classification method (review-first, no fabrication):** a script suggests a type per contact from signals (company name patterns, email domain, co-tags, GrantScope funder records, Supporter Journey pipeline), writes a review CSV/Notion list. **Ben confirms each before any tag is written.** Unclassifiable → left untyped, flagged. This is its own phase (P2.5), gated on approval; ~48 partners + ~28 live funders to confirm.

## Safety — why this won't fire automated emails

The risk: a GHL workflow with a "Contact Tag added" trigger would fire when we ADD a canonical tag. Findings so far (prep pack §9): the one live marketing automation (`Harvest - Member Welcome`) is **form-triggered**, and the rest are form/event/contact-sync triggered. Guard regardless:

1. **Trigger pre-check (blocking).** Before any write, confirm none of the CANONICAL target tags (`audience-storyteller`, `audience-partner`, `audience-funder`, `act-gd`) are "Contact Tag added" enrolment triggers on any published workflow. (DONE 2026-05-29: confirmed — the only Contact-Tag triggers in use are `act-inquiry` and a CONTAINED-launch tag; no canonical/legacy merge-target tag is a trigger.)
2. **Pause-during-migration option.** If any target tag IS a trigger, temporarily unpublish that workflow for the migration window, then republish. (Tier 2 GHL change — explicit approval.)
3. **Canary first.** Apply to 2-3 contacts, then watch `conversations_search-conversation?lastMessageAction=automated&lastMessageDirection=outbound` for any new send in the next few minutes. Zero new sends → proceed.
4. **Idempotency + manual-tag respect.** Mirror the existing guard pattern (`pushback-ghl-project-tags` writes a reversible manifest; taggers skip `project_code_source LIKE 'manual%'`). Add canonical before removing legacy so no contact is ever momentarily untagged.
5. **Rate limit + manifest.** Batch through `scripts/lib/ghl-api-service.mjs` with throttling; write a per-contact before/after manifest enabling exact `--revert`.

## Execution phases (each gated on Ben's go)

- **Phase 0 — finalize map.** Resolve the 3 needs-decision rows + the 4 ambiguous-workflow triggers (glance list). Output: frozen canonical map.
- **Phase 1 — Supabase source of truth.** Add an audience field to `ghl_contacts`, populate by deterministic mapping from canonical tags. Migration SQL written, applied explicitly (Tier 3 — needs Ben's go), verified. No GHL writes.
  - **Design decision (the data forced this):** contacts are genuinely MULTI-audience — e.g. Tanya Turner carries both `audience-partner` and `audience-storyteller`. A single `audience_segment` enum would lose that. **Recommend `audience_segments text[]`** (values constrained to funder/partner/storyteller/brand/buyer/community) so multi-membership is preserved, plus an optional `primary_audience` text for the lead segment. Ben to confirm single-vs-array before the migration is written.
- **Phase 2 — dry-run report.** Script reads each legacy tag, prints exactly which contacts would gain/lose which tags + total counts. No writes. Ben reviews.
- **Phase 3 — canary.** 2-3 contacts, add-canonical-then-remove-legacy, watch for automated sends. Verify in GHL + Supabase.
- **Phase 4 — batch.** Full migration via manifest, throttled, with the trigger-guard active. Re-sweep after (manual-tag guard).
- **Phase 5 — verify + enforce.** Confirm counts; add tag-allowlist validation to every `sync-*-to-ghl` script so new variants can't reappear; weekly singleton-tag flag.

## Task ledger

- [x] P0: Ben resolved needs-decision rows — `goods`→merge to `act-gd`; `goods-funder`→keep sub-tag; `newsletter`→rename `act-newsletter`, per-project lists kept (2026-05-29)
- [x] P0: Triggers confirmed (2026-05-29 via screenshots) — Contact-Tag triggers in use = `act-inquiry` (Contact→Universal Inquiry, live) + a CONTAINED-launch tag (Contained launch 2025, draft, no tag selected). **No merge/rename target tag is a trigger → tag canonicalization is send-safe.**
- [ ] P0: Ben confirms single `audience_segment` vs `audience_segments text[]` (recommend array — contacts are multi-audience)
- [x] P1: Migration APPLIED + backfilled (2026-05-29). `audience_segments` populated: 710 contacts segmented (60 multi-segment), funder 87 / partner 274 / storyteller 313 / brand 114; buyer+community deferred (no clean source tag). Verified on prod.
- [ ] P2: Dry-run mapping report; Ben review
- [~] P2.5: Classifier built + run (`scripts/suggest-audience-types.mjs`, dry-run). Review file `thoughts/shared/reports/audience-type-suggestions.md`. Auto-typed: funders 21/80 (corporate 4 / foundation 13 / intermediary 4), partners 52/271 (community 31 / govt 20 / delivery 1). **Needs Ben's manual call: 59 funders + 219 partners.** Applying types to GHL = paused Phase 3.
- [ ] P3: Canary 2-3 contacts; confirm zero automated sends
- [ ] P4: Batch migration with manifest; re-sweep
- [ ] P5: Allowlist validation in sync scripts; weekly singleton flag

## Decision log

| Decision | Status | Note |
|---|---|---|
| Canonical scheme = `audience-*` for audiences | Accepted | Matches the documented operating model |
| Keep per-project newsletter lists separate | Accepted (Ben) | They map to distinct send audiences |
| `goods` (255) → merge to `act-gd` | Accepted (Ben) | Bare tag only; `goods-*` family untouched |
| `goods-funder` → keep as sub-tag | Accepted (Ben) | Optional: also add `audience-funder` to those 42 |
| bare `newsletter` → rename `act-newsletter` | Accepted (Ben) | No ambiguous catch-all; per-project lists stay |
| Partner/funder get a TYPE dimension (not flat merge) | Accepted (Ben) | Taxonomy proposed above; Ben to edit the type lists |
| audience field shape | `text[]` drafted | Migration `20260529000000_ghl_contacts_audience_segments.sql` written (DDL only); pending Ben confirm + apply (Tier 3) |
| Any merge-target tag is a workflow trigger? | Resolved: NO | Triggers in use = `act-inquiry` (live) + CONTAINED-launch (draft); none of storyteller/funder/partner/goods/newsletter. Merges send-safe. |
| Workflow hygiene flags | Noted | `Contained launch 2025` draft has empty tag-filter + a broken pipeline action; `Harvest - Follow Welcome` is published with no trigger (inert). |

## Verification log

_(to fill during execution — every count attempted vs actual; every canary send-check)_

## Rollback

Per-contact before/after manifest (JSON) written in Phase 4; `--revert` re-applies the prior tag set. Supabase `audience_segment` column is additive (drop column to revert Phase 1).

## Changelog

- 2026-05-29: Plan drafted (no writes). Awaiting Phase 0 decisions.
