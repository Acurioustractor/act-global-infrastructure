# Finance Cockpit Consolidation — plan

**Date:** 2026-05-29 · **Goal:** ONE trustworthy finance surface to *always see current state*, **re-tag**, **find missing**, **see for certain when receipts are in Xero**, and **copilot into Xero to 100%** — on continuously-aligned data.
**Status:** Foundation DONE. **P1–P4 SHIPPED 2026-05-29** (commits `c593390` P1 · `e2dc9f7` P2 · `ef9206f` P3 · `d85984b` P4, branch `wip/xero-recon-recode-2026-05-29`, **not pushed**). tsc + eslint clean; endpoints verified vs live DB; routes 200. Pending: authenticated browser pass on the new client UI (TrustMeters strip + copilot inline re-tag) — shared browser was in use during build.

## Why this plan
The command-center finance UI is **over-built and fragmented**: ~23 live `/finance/*` routes incl. **four overlapping cockpits** (`/finance`, `/finance/command`, `/finance/workbench`, `/finance/overview`). Every capability you want already exists — but scattered, and (until today) on stale data. So this is **consolidation + trust**, not new sprawl.

## Foundation — DONE (2026-05-29)
- **Sync now aligns all the time.** `sync-xero-to-supabase.mjs` rewritten to pull by **modification date** (`If-Modified-Since`) not invoice date, so retro edits (recodes/voids/reconciles) are caught; `.xero-sync-state.json` cursor; **429 retry/back-off**. `xero-sync` (6-hourly) + `xero-bank-balances` re-enabled in PM2. Commit `5d5780a`.
- Result: Supabase now tracks Xero. The 90-bill recode is reflected (General Expenses `429`: $486K → $284K).

## Target: 3 surfaces (collapse 23 → ~6 nav entries)

### 1. STATE — `/finance/overview` (elevate as the home cockpit)
The "where are we right now" glance. Money in/out, runway, pile/alignment, **+ live trust meters**: reconciliation %, receipt-coverage %, recode-progress, **+ a "Xero data as of HH:MM" freshness badge**. 
*Folds in:* `/finance/command`, `/finance/money-alignment`, the workbench summary cards.

### 2. OPERATE — `/finance/xero-page-copilot` (elevate as the work surface)
The single work queue to get to 100%. It already classifies each bank line (`click_ok_existing_match`, `find_match_bill`, `create_with_evidence`, `transfer`…). Add: **re-tag inline**, **find-missing-receipt**, and a per-line **"receipt in Xero ✓/✗"** badge straight from `has_attachments`.
*Folds in:* `/finance/workbench`, `/finance/tagger-v2`, `/finance/receipts-triage`, `/finance/reconciliation`, `/finance/ai-suggestions`, `/finance/dext-push-audit`.

### 3. DRILL — `/finance/projects` + `/finance/audit`
Per-project P&L drill-down + the cleanup/exception queue. Keep as-is.

*(Reports — board / accountant / funders / revenue / pipeline — stay but move under a "Reports" group, not top-level.)*

## Cross-cutting components (build first — they deliver "trust" + "certainty")
- **`<FreshnessBadge>`** — "Xero data as of HH:MM (Nm ago)", green <6h / amber 6-12h / red >12h. Source: `.xero-sync-state.json` lastSync (expose via a tiny `/api/finance/sync-freshness` route) or `max(synced_at)`. Render on every finance surface header. *This is what makes any number trustworthy.*
- **`<ReceiptInXero>`** — ✓/✗/"pipeline-only" badge from `xero_transactions.has_attachments` / `xero_invoices.has_attachments`. Used everywhere a txn/bill row appears. *This is "see for certain when receipts are connected in Xero."*

## Build phases (phase-at-a-time; each ships independently)
- **P1 — Trust primitives:** ✅ `FreshnessBadge` (in finance layout header → every surface) + `ReceiptInXero` + `/api/finance/sync-freshness` (file lastSync → max(synced_at) fallback; green<6h/amber/red>12h). All 4 verified vs live DB.
- **P2 — STATE fold:** ✅ `/api/finance/trust-meters` (recon 65.6% · receipt 77.6% · tagging 96% · GE-429 catch-all $285,769/95 bills) + `<TrustMeters>` "Trust & Coverage" strip on overview (pile-mix folded up from command's API). `/finance/command` + `/finance/money-alignment` pages → redirect stubs to overview (their API routes stay live). *Decision: redirect both literally (Ben).*
- **P3 — OPERATE fold:** ✅ copilot made read-write (Ben's call, overriding its no-write design): `<RetagSelect>` inline re-tag (bills→transactions PATCH, bank lines→reconciliation/inbox tag; both manual-source) + `<ReceiptInXero>` ✓/✗ on bill candidates + find-missing-receipt CTA + OPERATE tab-bar. Bank lines are `bank_statement_lines` (not xero_transactions).
- **P4 — Nav cleanup:** ✅ finance sidebar collapsed to State · Operate · Drill (projects/audit/transactions/vendors/funders) · Reports. Operate work-tools moved to the copilot tab-bar; kept LIVE (no `_archived/` move — naive archiving 404s live pages per prior reviews). command/money-alignment stay redirect stubs.

## Guardrails
- Verify against fresh Supabase (sync now current). `npx tsc --noEmit` per file. Commit per phase.
- Don't delete routes — archive + redirect (the prior 2026-05-21/05-27 reviews showed naive archiving broke live pages).
- Build in a fresh context — this plan is the handoff.

## References
- Surface inventory + prior consolidation: `thoughts/shared/reviews/finance-system-review-2026-05-21.md` (QW2, B2).
- Reconciliation/receipts operating model: `thoughts/shared/reviews/2026-05-29-reconciliation-receipts-operating-model.md`.
- Nav: `apps/command-center/src/lib/nav-data.ts` (finance group ~line 110-156).
