# Reconciliation Cockpit — command-center feature plan

**Created:** 2026-06-01 · **Status:** PLAN (not built) · **Owner:** Ben + Claude · **Trigger:** the Dext→Xero card reconciliation mess (surcharges + duplicates + 818 floaters)

## Problem (what we proved this session)
Reconciling the NAB Visa is slow + error-prone because of THREE compounding issues, none visible in Xero's own UI:
1. **Surcharge gaps** — the bank charges receipt amount + a card surcharge (Centre Trailer: bank $424.91 vs $420 bill = $4.91). Exact-amount matching fails everywhere; you must search by name + add an Adjustment.
2. **Duplicates** — Dext published most receipts as **bills**, and the bank feed *also* created spend-lines → the same purchase exists twice (105 in Oct–Dec, $67.7K; RNM $26,845 the biggest).
3. **Dext coding stranded** — 664 receipts carry account+project+image in Dext, but ~half didn't reach Xero, and the bank lines were never matched to the bills that did. 818 unmatched items float in Xero.

**Hard constraint:** the Xero API **cannot set `IsReconciled`** (UI-only). So a cockpit can *prepare, code, dedupe-flag, and push receipts/bills* — but the final reconcile click stays in Xero (Ben/SL). Design around this.

## The data foundation (already built, committed this session)
The matching engine exists as scripts — the cockpit wraps them in an API:
- `scripts/reconcile-line-lookup.mjs` — per-line: MATCH bill (+surcharge) / DUPLICATE / CREATE with **learned Dext coding** (vendor → most-common account+project) + heuristic fallback.
- `scripts/build-sl-reconcile-sheet.mjs` — full per-line sheet (the bulk view).
- `scripts/diagnose-dext-vs-xero.mjs`, `sweep-dext-to-bank-lines.mjs` — the diagnosis.
First step of the build = lift the shared matching logic into `apps/command-center/src/lib/finance/reconcile.ts` (typed, unit-tested) so the API and scripts share one source of truth.

## Phases

### Phase 1 — Read-only Reconciliation Cockpit (Tier 1–2, buildable night-shift)
Route: `apps/command-center/src/app/finance/reconcile/page.tsx` + `api/finance/reconcile/route.ts`.
- **Per-line cards**, grouped by action: 🔗 MATCH (search-name + surcharge to add) · ♻️ DUPLICATE (which dup to delete) · 🆕 CREATE (Dext coding + receipt image inline) · ✏️ CREATE-by-hand (learned/heuristic suggestion).
- **Receipt image inline** (the Dext `rbnk.me` URL) so coding is eyeball-verifiable.
- **Judgment controls** (persisted to a `reconcile_decisions` table, NOT Xero): assign project, mark personal→Drawings, resolve an unknown vendor, accept/override the suggested code. This is the *human-in-loop* surface — exactly the "judgment calls" lane.
- **Surcharge + duplicate badges**; filter by trip/location, by action, by ≥$ threshold.
- **Export**: the worklist for Xero/SL (the sheet), reflecting Ben's decisions.
- Money-math (totals, surcharge sums, dup value) → **TDD first** per the finance rule.

### Phase 2 — Xero write-back (Tier 3, day-shift, explicit go per batch)
Uses the existing Xero OAuth (`scripts/sync-xero-to-supabase.mjs` client; the API CAN create + attach):
- **Create coded bill/spend** from a CREATE line (account+project+contact) via `create-bank-transaction` / bill API.
- **Attach the Dext receipt image** to the Xero transaction (download `rbnk.me` → Xero Attachments API) — the "add receipt to Xero" ask.
- **Flag/void the duplicate** for deletion (surface it; deletion itself stays a reviewed action).
- Dedup-safe: never create where a bill/txn already exists; verify attempted-vs-actual.
- **Still cannot reconcile** — output is "ready to reconcile in Xero," Ben/SL clicks.

## The simple way to scale it up in Xero + activate (the honest process answer)
The cockpit is *visibility + receipt-staging*; the **activation is mostly Xero process, not custom code:**
1. **Fix Dext publish config** so receipts publish once, correctly (as the right type), and **stop the duplicates at source.**
2. **Xero bank rules** for the recurring vendors (Uber/Qantas/Webflow/Bunnings/SaaS) → auto-code future lines (Phase-1 cockpit surfaces the rule candidates).
3. **SL bulk-clears the backlog** — match bills, add surcharge adjustments, delete the 105 duplicates, drain the 818. The full sheet is their worklist.
4. **Cockpit going forward** = the weekly triage surface: new lines, missing receipts, dup alerts, before they pile up again.

## Guards / constraints
- Two-account rule; exclude DELETED/VOIDED; PostgREST/exec_sql 1000-cap → paginate (see `reconciliation-worklist.mjs` guard).
- Xero writes are Tier 3 — never batch-write unattended; explicit go per batch; verify counts.
- Don't trust fuzzy vendor matches blind — cockpit shows the receipt image for human confirm.

## Recommended build order
Phase 1 read-only cockpit first (fresh context — this session is long), shipped + verified, THEN Phase 2 writes with Ben in the loop.
