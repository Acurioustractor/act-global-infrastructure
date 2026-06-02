# Plan: Unified project-code tagging engine + cross-area sweep

> Slug: `2026-06-03-unified-tagging-engine`
> Created: 2026-06-03
> Status: draft (Phase 1 ready to build)
> Owner: Ben (build: Claude)
> Decision: [[2026-06-03-unified-project-code-resolver]] (ADR) · Concept: [[project-code-resolution]]

## Objective

Make operational `project_code` tagging consistent and well-maintained across every area (Xero
txns/invoices, GHL opportunities, subscriptions, `opportunities_unified`) by consolidating the
scattered tag→code logic into one shared resolver, surfacing low-confidence/conflicting tags for
review, and closing the coverage gaps (GHL opps 64%→90%+, subs 49%→high) — without silently writing
wrong tags or breaking the per-area source-of-truth model.

## Grilled decisions (the spec — see ADR for full rationale)

1. **Scope = operational `project_code` layer** (money + opps + subs). The GHL **contact**-tag
   taxonomy stays a separate, consistent-but-untouched system.
2. **Per-area SoR, unified by the registry.** Registry = code set + mapping; Xero Project Tracking =
   money-row SoR; resolver = GHL opps/subs; `opportunities_unified` = projection.
3. **Shared resolver** returns `{code, confidence, source}` under fixed precedence (manual → system tag
   → linked-record → registry direct → name/keyword fuzzy; legacy normalised). Auto-apply high only;
   low → review queue; never overwrite manual.
4. **Read-only sweep** → reconciliation worklist; **separate gated writer** applies high-confidence /
   hard-link fixes tracer-first. Fuzzy → review.
5. **Rollout:** engine + read-only first → tracer → gated writes.

## Task Ledger

### Phase 1 — engine + read-only (AFK-safe, no external writes, all local/Tier-1)
- [x] **T1 (TDD):** `scripts/lib/project-resolver.mjs` — `resolveProjectCode(signals) → {code, confidence, source}`. Pure, registry-sourced. Consolidates `project-code-resolver` prefix/alias rules + `align-ghl-opportunities` PIPELINE_MAP/keyword scorer + vendor rules + legacy-wrapper normalisation. **13/13 tests** (`scripts/tests/project-resolver.test.mjs`) pin precedence + each signal + legacy normalisation + manual-protection + valid-code guard.
- [x] **T2:** `scripts/tagging-sweep.mjs` — READ-ONLY cross-area diagnostic. Coverage by area + cross-area conflicts via the `xero_invoice_id` hard link + a resolver fill-preview (auto/review/none). Emits `thoughts/shared/financials/tagging-sweep-<date>.{md,json}`. **First run (2026-06-03):** 11 opp↔invoice conflicts; 202/277 untagged opps + 29/35 untagged subs auto-fillable.
- [ ] **T3:** Surface in command-center. NOTE (discovered): a file-reading route won't work in prod (no FS on Vercel) and re-porting the resolver to TS would fork the logic. Decide the surface mechanism (sweep writes a `tagging_sweep_runs` table the API reads · vs · TS resolver port) — its own increment.

### Phase-3 guard (recorded from the T2 first run)
The gated writer must NOT auto-apply the **ACT-CA catch-all** from a pipeline hint when a linked invoice
gives a sharper code — that lazy default is exactly what produced the 11 conflicts. Treat
pipeline→ACT-CA as review-only; always prefer a linked-invoice code.

### Phase 2 — tracer (one record, end-to-end, gated)
- [ ] **T4:** Prove the path on ONE GHL opp: resolve → (if it has a paid `xero_invoice_id`) propagate the invoice's code back → write the single opp `project_code` (gated, logged, revert-able). Verify it shows correctly on the dashboard + sweep reports zero conflict for it.

### Phase 3 — gated per-area writers (day-shift, Tier 2/3, explicit go each)
- [ ] **T5:** GHL opps gated writer — auto-apply high-confidence resolutions (the 64%→90%+ fill), low → review queue. Tracer batch of 1 → verify → batch.
- [ ] **T6:** Subscriptions gated writer (49%→high), same pattern.
- [ ] **T7:** Reconciliation writer — apply approved hard-link conflict fixes from the worklist (e.g. invoice→opp propagation). Xero backfill stays on the existing `apply-xero-tracking-backfill.mjs` harness.
- [ ] **T8:** Rebuild `opportunities_unified` as a projection so it reflects the corrected bases.

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-06-03 | Scope = operational project_code only | Contact-taxonomy has its own plan + 26-workflow risk | yes |
| 2026-06-03 | Per-area SoR unified by registry | Matches existing Xero-tracking-as-durable + period locks | hard (other code depends) |
| 2026-06-03 | Shared resolver, confidence + provenance + review queue | One place for mapping; wrong auto-tag corrupts P&L | hard |
| 2026-06-03 | Sweep read-only → worklist; gated writer tracer-first | AFK-safe detection, day-shift writes | yes |
| 2026-06-03 | Engine + read-only first, then tracer, then writes | Tracer-bullet rule + AFK boundary | yes |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| GHL opps 64% project_code / 58% pile; subs 49%; Xero FY26 ~100%; $3.7M pre-FY26 untagged | ✅ | coverage SQL across all areas | 2026-06-03 |
| Xero Project Tracking is the durable money SoR (sync-down + gated backfill up) | ✅ | read `sync-xero-to-supabase.mjs::detectProjectFromTracking` + `backfill-xero-tracking.mjs` | 2026-06-03 |
| A Xero-only review surface already exists (`tagger-v2` + `tagger-queue`, with confidence/suggestedProject) | ✅ | read the route + page | 2026-06-03 |
| Resolver precedence produces correct codes on a tracer opp | pending | T4 | — |

## Provenance

- **Data sources:** `xero_transactions`, `xero_invoices`, `ghl_opportunities`, `opportunities_unified`, `subscriptions`, `config/project-codes.json`, `config/project-identity-rules.json`. Shared Supabase `tednluwflfhxyucgwigh`.
- **Unverified assumptions:** the $3.7M untagged is collectible-as-historical-backfill (mostly pre-FY26, some under Standard-Ledger lock — may be left as-is); fuzzy vendor↔contact links are advisory only.
- **Generated by:** hybrid (grill-with-docs with Ben → Claude).
