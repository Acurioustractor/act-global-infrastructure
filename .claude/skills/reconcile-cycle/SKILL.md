---
name: reconcile-cycle
description: Drives the NAB Visa #8815 card-line reconciliation cockpit — matches bank lines to Xero bills/txns, flags duplicates and card surcharges, codes the rest, and learns from each pass. Use when reconciling the card, hunting duplicate bills, chasing unmatched card lines, the Dext→Xero mess, or "what's unreconciled on the Visa". Read-only: it prepares and flags; the reconcile click stays in Xero.
triggers:
  - "reconcile the card"
  - "reconcile the NAB Visa"
  - "what's unmatched"
  - "card duplicates"
  - "duplicate bills"
  - "Dext vs Xero"
  - "weekly reconcile"
  - "reconciliation cockpit"
allowed-tools: [Read, Bash, Grep, Glob, WebFetch]
---

# Reconcile Cycle Skill

The weekly triage operator for the NAB Visa #8815. Knows what every unreconciled card
line should become in Xero — match a bill, kill a duplicate, or create a coded
transaction — remembers the duplicates and vendor aliases it has already resolved, and
gets sharper each pass. Pairs with `bas-cycle` (whole-quarter GST/acquittal); this skill
is per-line card reconciliation only.

## The hard boundary — read first

The **Xero API cannot set `IsReconciled`** (UI-only). This skill *prepares, codes,
dedupes-flags and stages* — it does **not** press reconcile. The final match + reconcile
click stays with Ben/Standard Ledger in the Xero UI. Phase-2 Xero write-back (create a
coded bill, attach the receipt) is a **Tier-3, day-shift** step — never batch-write
unattended; see `references/phase2-xero-writeback.md`.

## The 6 verdicts (first rule that fires wins)

Each unreconciled card line is matched against fresh Xero data and classified:

1. **♻️ DUPLICATE** — a bill AND a card txn both match → Dext made a bill and the bank
   feed made a spend-line for the same purchase. Match the bill, **delete the duplicate txn**.
2. **✍️ APPROVE DRAFT** — a DRAFT bill matches → approve it, then match.
3. **🔗 MATCH BILL** — an approved/paid bill matches → match it; add any surcharge as an Adjustment.
4. **🔗 MATCH TXN** — an *unreconciled* card txn already in Xero matches → match it.
5. **✅ ALREADY IN XERO** — a matching txn exists but is **already reconciled** → the charge is
   already entered. Verify/reconcile the bank line; **do NOT create** (would duplicate). This is the
   recurring-subscription trap (e.g. Belong $35/mo) — the tracer-bullet found ~20 such lines mis-filed
   as CREATE before this verdict existed.
6. **🆕 CREATE** — nothing matches → create a coded transaction (project + receipt from the
   receipt pipeline if found, else learned project, else a heuristic guess to confirm).

A match needs **all three** gates: amount (`exact` <0.5¢, or `surcharge` ≤$15 **and** ≤6% of
the reference), date (±12 days), and a **shared vendor token** (amount alone never matches).

## Money guards — read before quoting any total

1. **Two-account rule.** ACT card spend lives only in **NAB Visa ACT #8815**. (The other ACT
   account is NJ Marchesi T/as ACT Everyday.) Exclude `NM Personal` + `ACT Maximiser`.
2. **Exclude DELETED/VOIDED** rows from every match set and total (NULL-safe `IS DISTINCT FROM`).
3. **Sum in SQL, not supabase-js.** Bills (1.5k) / txns (1.7k) / receipts (2.4k) each exceed the
   PostgREST 1000-row cap; the cockpit pages past it, ad-hoc `.select()` does not.
4. **Surcharge ≠ duplicate.** A bank line that's receipt + a small card fee is ONE purchase with a
   surcharge, not a second purchase. The band (≤$15 and ≤6%) keeps them apart.
5. **Verify before lodging.** Reconcile any figure against the canonical accrual P&L
   (`project_monthly_financials`) — a silent wrong number is the expensive failure.

## Surfaces & commands (run from repo root)

- **Cockpit (operate):** `https://command.act.place/finance/reconcile` — per-line cards grouped by
  verdict, surcharge/duplicate/receipt badges, bill+txn pairs, receipt image inline. API:
  `/api/finance/reconcile`. Engine (typed, tested): `apps/command-center/src/lib/finance/reconcile.ts`.
- **Per-line co-pilot (script):** `node scripts/reconcile-line-lookup.mjs <dext.csv>` — exact CLI
  verdict per line against fresh Xero data.
- **Weekly digest (cron nudge):** `node scripts/weekly-card-reconcile.mjs` — 5-line "what needs attention" off the live cockpit engine. The 30-min weekly loop; see `workflows/weekly-triage.md`.
- **Worklists for SL:** `node scripts/reconciliation-worklist.mjs` → `scripts/output/reconciliation-worklist-*.md`.
- **Full SL sheet:** `node scripts/build-sl-reconcile-sheet.mjs`.
- **Diagnosis:** `node scripts/diagnose-dext-vs-xero.mjs` · `node scripts/build-reconcile-map.mjs`.

## Workflows

- `workflows/weekly-triage.md` — run the cockpit → work DUPLICATES first → MATCHES → CREATES → export.
- `workflows/tracer-bullet.md` — prove ONE line end-to-end in Xero before any batch.

## References

- `references/matching-engine.md` — the cascade + surcharge band, mapped to `reconcile.ts`.
- `references/confirmed-duplicates.md` — **learning loop**: duplicates the cockpit flagged + the human verdict.
- `references/vendor-aliases.md` — **learning loop**: bank descriptor → real vendor (improves matching).
- `references/coding-patterns.md` — **learning loop**: vendor/keyword → project + account, so CREATE lines auto-code higher each pass.
- `references/phase2-xero-writeback.md` — Tier-3 runbook for the (not-yet-wired) Xero writes.

## How this skill learns

After each reconcile pass: append newly-confirmed duplicates and their fate to
`references/confirmed-duplicates.md`, and any new bank-descriptor→vendor mapping to
`references/vendor-aliases.md`. Next pass starts by reading both, so the cockpit stops
re-surfacing settled lines and matches messy descriptors it has seen before.

## Current state (2026-06-01 — dated, will drift)

Read-only Phase 1 live + **tracer-bullet passed** (Airbnb duplicate, Hatch surcharge, Belong create all
verified against Xero). FY26 NAB Visa: 459 unreconciled lines · $257,139.18. Cockpit verdict:
70 match · 41 duplicate ($24,727 double-counted) · 20 already-in-Xero · 328 create · 32 surcharges ($69.58).
The tracer surfaced + fixed a class of false-CREATE (matching a reconciled txn → would duplicate).
**Proven → routed.** Phase-2 writes: NOT wired (Tier-3, day-shift; `references/phase2-xero-writeback.md`).
Live working state: `thoughts/shared/handoffs/money-state-of-play/current.md`.
