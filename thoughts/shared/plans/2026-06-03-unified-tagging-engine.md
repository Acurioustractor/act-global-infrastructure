# Plan: Unified project-code tagging engine + cross-area sweep

> Slug: `2026-06-03-unified-tagging-engine`
> Created: 2026-06-03
> Status: Phase 1 shipped · Phase 2 tracer DONE · cockpit UI shipped · 9/11 conflicts resolved (2 "your call" left)
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
- [x] **T3:** Surface in command-center via a `tagging_sweep_runs` table (prod-safe, no TS resolver fork — the `.mjs` sweep persists each run; the app reads it). Migration `20260603000000_tagging_sweep_runs.sql` applied + verified; sweep persists a run; read-only API `/api/finance/tagging-sweep`; page `/finance/tagging` ("Tagging health" — coverage bars · conflicts table · fill preview); front-door tile added. tsc+eslint clean, 0 console errors.

### Phase-3 guard (recorded from the T2 first run)
The gated writer must NOT auto-apply the **ACT-CA catch-all** from a pipeline hint when a linked invoice
gives a sharper code — that lazy default is exactly what produced the 11 conflicts. Treat
pipeline→ACT-CA as review-only; always prefer a linked-invoice code.

### Phase 2 — tracer (one record, end-to-end, gated)
- [x] **T4 (2026-06-03):** Proved the path end-to-end on ONE GHL opp via the live endpoint — "On Country Photo Studio" `ACT-CA`→`ACT-PI` (linked invoice INV-0262 = PICC). Apply → DB confirmed; **undo (re-apply prevCode `ACT-CA`) → DB reverted** → re-apply `ACT-PI`; re-run sweep: conflicts 11→10, opp gone from the list. Reversibility proven.

### Phase 2.5 — retag cockpit (UI front-door for the gated writes) — SHIPPED 2026-06-03
The writes turned out to be **Supabase-mirror-only** (`ghl_opportunities.project_code` / `subscriptions.project_codes`), i.e. our operating DB — reversible, NOT a live GHL CRM write. So the "save across all" surface is a command-center cockpit, not a script run.
- [x] **`POST /api/finance/tagging-apply`** — accepts `decisions[{kind:opp|sub,id,code}]`, validates each code against the `projects` registry, captures prev-values, batch-updates grouped by code, returns `applied[]` with `{prevCode,newCode}` so the UI can **Undo**. No new table (before-values live in the sweep snapshot + the apply response). tsc clean.
- [x] **`/finance/tagging` rebuilt → "Retag & reconcile" cockpit** — coverage bars (make-sense) · conflicts per-row (lazy `ACT-CA` default-accept; specific-vs-specific flagged **"your call"** + default-keep; per-row override dropdown) · auto-fills grouped-by-code, collapsible, pre-checked, uncheck outliers · no-match info · sticky **Apply N** bar + post-apply **Undo last apply**. Verified rendering against live data, 0 console errors.
- [x] **11/11 conflicts resolved — sweep now 0.**
  - 9 lazy `ACT-CA` invoice-wins (1 tracer + 8 batch) via the endpoint.
  - **Homeland "Goods" (INV-0303, $44k):** the *invoice* was mis-tagged — all 5 line items are Goods ("Indestructible Washing Machine", "Stretch Bed", "Goods on Country Program Support", "Delivery of Goods", "Goods in Kind"). Re-tagged invoice `ACT-JH`→`ACT-GD` + `project_code_source='manual'` (prev source was `xero_tracking`). Moves $44k revenue JH→GD. Kept opp `ACT-GD`.
  - **BG Fit / Green Fox (Ben's call: JusticeHub revenue):** 3 Green Fox milestone invoices (INV-0245/46/47, $27k total, all `ACT-JH`) = the engagement; opp `ACT-BG`→`ACT-JH` so they agree. Invoices unchanged.
  - **Xero tracking backfill DONE (2026-06-03, Ben's go):** ran `apply-xero-tracking-backfill.mjs --project=ACT-GD --invoice=INV-0303 --apply` (added a precise `--invoice=` scope flag). Set `ACT-GD — Goods` Project Tracking on all 5 lines; harness verified totals byte-intact ($44,000/$44,000) + option confirmed; revert log `scripts/output/xero-tracking-backfill-revert-INV-0303.json`. Xero ↔ mirror now agree on ACT-GD.
- [x] **Auto-fills APPLIED (2026-06-03, Ben's go):** 204 opps + 29 subs via the live endpoint, 0 failed. Pre-checked the auto bucket for the lazy-default trap first — **0 ACT-CA-via-pipeline** (opps resolved ACT-HV ×110 / ACT-GD ×94 by pipeline; subs ACT-IN ×27 / ACT-DO / ACT-OO by vendor rule). Re-sweep: **opps 64%→90% (694/769), subs 49%→91% (62/68)**; 0 auto-fillable left. Remaining untagged = 75 opp + 6 sub **no-match** only (need human codes, not the resolver's job).

### Phase 3 — gated per-area writers (day-shift, Tier 2/3, explicit go each)
- [x] **T5/T6 superseded by the cockpit** — opp + sub writers are the `/api/finance/tagging-apply` endpoint, driven from the cockpit. (Script-based bulk writer still available if AFK volume ever needs it.)
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
| 2026-06-03 | Homeland INV-0303 → ACT-GD (fix the invoice, not the opp) | Line items 100% Goods; invoice was mis-tagged ACT-JH — the "invoice wins" default was wrong here | yes (manual-protected) |
| 2026-06-03 | BG Fit opp → ACT-JH (it's JusticeHub revenue) | Ben's call: 3 Green Fox milestone invoices ($27k) all deliberately ACT-JH = the engagement | yes |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| GHL opps 64% project_code / 58% pile; subs 49%; Xero FY26 ~100%; $3.7M pre-FY26 untagged | ✅ | coverage SQL across all areas | 2026-06-03 |
| Xero Project Tracking is the durable money SoR (sync-down + gated backfill up) | ✅ | read `sync-xero-to-supabase.mjs::detectProjectFromTracking` + `backfill-xero-tracking.mjs` | 2026-06-03 |
| A Xero-only review surface already exists (`tagger-v2` + `tagger-queue`, with confidence/suggestedProject) | ✅ | read the route + page | 2026-06-03 |
| Resolver precedence produces correct codes on a tracer opp | ✅ | T4: On Country Photo Studio ACT-CA→ACT-PI via live endpoint; invoice INV-0262=PICC; apply+undo+reapply; sweep 11→10 | 2026-06-03 |
| Apply endpoint writes only our Supabase mirror (reversible), validates codes vs registry | ✅ | route reads `projects` registry, rejects unknown codes; updates `ghl_opportunities`/`subscriptions` only; returns prevCode for undo | 2026-06-03 |
| 8 clean lazy ACT-CA conflicts resolved, 2 specific-vs-specific left for human | ✅ | batch apply via endpoint, re-sweep → 2 conflicts (BG Fit, Homeland Goods) | 2026-06-03 |

## Provenance

- **Data sources:** `xero_transactions`, `xero_invoices`, `ghl_opportunities`, `opportunities_unified`, `subscriptions`, `config/project-codes.json`, `config/project-identity-rules.json`. Shared Supabase `tednluwflfhxyucgwigh`.
- **Unverified assumptions:** the $3.7M untagged is collectible-as-historical-backfill (mostly pre-FY26, some under Standard-Ledger lock — may be left as-is); fuzzy vendor↔contact links are advisory only.
- **Generated by:** hybrid (grill-with-docs with Ben → Claude).
