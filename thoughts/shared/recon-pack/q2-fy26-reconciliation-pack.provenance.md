# Provenance — Q2 FY26 NAB Visa Reconciliation Pack

**Report:** `q2-fy26-reconciliation-pack.md` · **Generated:** 2026-06-01 · **Author:** Claude (reconcile-cycle skill + workflow) for Ben/Standard Ledger.

## What this is
A prepared, READ-ONLY worklist for reconciling the 241 unreconciled NAB Visa #8815 debit lines for 1 Oct – 31 Dec 2025 ($169,713.03). It does not write to Xero; it tells the human exactly what to do per line.

## Sources (what was queried directly)
- **Card lines, bills, txns, already-in-Xero, surcharges** — the reconcile cockpit engine `apps/command-center/src/lib/finance/reconcile.ts` via `/api/finance/reconcile?start=2025-10-01&end=2025-12-31`, which reads `bank_statement_lines`, `xero_invoices` (ACCPAY), `xero_transactions` (SPEND on #8815), `receipt_emails`. Snapshot saved: `q2-full.json`.
- **Duplicate verdicts (24)** — workflow run `wf_8a6fed36` (2 agents). Saved: `q2-scope-results.json`.
- **Create codings (186 = 19 + 167)** + **already-in-Xero verdicts (14)** — workflow runs `wf_8a6fed36` (19) + `wf_d50f6372` (167 in 8 batches; 14 already). 

## Verified vs inferred vs unverified
- **VERIFIED (queried the source):** the classification of every line (match/duplicate/already/create), all dollar amounts, the bill/txn pairing for duplicates, the surcharge deltas. The money invariant holds: duplicate + match + already + create = **$169,713.03** = the unreconciled total (checked in the generator).
- **VERIFIED by agent judgement (high confidence):** the 2 rejected duplicates — Townsville City Council ≠ Sunshine Coast Council (different merchant); Good Morning Coffee $58.74 (collision, $55.96 is the true match). 24 high-confidence creates (transfers, ATO, clear vendors).
- **INFERRED (agent proposal, needs human confirm):** all 186 create codings. Project + account are *guesses* from vendor name, location and clustering — because the receipt pipeline (`receipt_emails`) had a project for only ~2 of these lines. Medium-confidence codings name a single likely project ("confirm site"); low-confidence ones are genuine uncertainty.
- **UNVERIFIED / flagged for the human:** the 🔴 Decide tier (92 lines, $20,517) — including 22 possibly-personal items and 4 unknown vendors. Personal-vs-business and unknown-vendor identity cannot be resolved from the data.

## Gaps / caveats
- **No account categories in the DB** for these lines — `receipt_emails` carries project + image but not the Xero account code, so accounts are heuristic. The Dext CSV (point-in-time) had categories but is not wired into the live path.
- **Recurring-subscription trap** is handled (the `already_reconciled` verdict added 2026-06-01 after a tracer-bullet found ~20 lines that would have been false CREATEs); the already-in-Xero verdicts distinguish "reconcile against existing" vs "actually needs create" by date.
- **The reconcile click itself is not automatable** (Xero API limitation). This pack minimises but cannot eliminate the manual Xero work.

## Reproducibility
1. `curl '/api/finance/reconcile?limit=500&start=2025-10-01&end=2025-12-31'` → `q2-full.json`.
2. Workflow scripts: `q2-reconcile-scope-test-wf_4033144f-9bc.js`, `q2-reconcile-full-wf_d50f6372-878.js` (in the session workflows dir).
3. Pack generator: the `_genpack.mjs` logic (combines the three JSON snapshots, tiers by effort, checks the money invariant).
4. Re-run the cockpit any time for a fresh classification; codings are the agents' proposals as of 2026-06-01.
