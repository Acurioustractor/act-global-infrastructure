# Layer B spec — gated API-delete for verified-safe duplicate phantoms

**Status:** SPEC (for approval — not built). **Author:** session 2026-06-02. **Tier:** 3 (Xero write — day-shift, human-in-loop, explicit verb).

## Purpose
Turn the **verified-safe PAID phantoms** from a duplicate worksheet into a single reviewed batch-delete via the Xero API, instead of N manual "Remove & Redo" clicks. Each phantom = an **unreconciled spend-money** that duplicates a **paid bill which holds the receipt**. Deleting it removes a double-counted expense (and, where GST-bearing, corrects 1B) with zero receipt loss.

## Hard prerequisite (learned 2026-06-02)
Layer B is only as safe as its **input list**. Naive auto-detection over-detects 5–7× (see removed `dup-triage` attempt: 119 "dups"/$15k vs trusted 22/$223). **Layer B must consume a TRUSTED, verified worksheet** (today: `gst-duplicate-fix-worksheet.md`, produced by `classify-duplicate-gst.mjs` + `dup-worksheet.mjs` against the curated recon-pack). A reliable Layer A detector is a prerequisite for running Layer B at scale; until then Layer B runs only against a hand-verified list.

## Scope
- **IN:** unreconciled spend-money where (a) a matching **PAID** bill exists, (b) `bill.has_attachments = true` (receipt safe), (c) the spend-money is `is_reconciled = false`.
- **OUT (stay manual / UI):**
  - **AUTHORISED** bills → require a UI **Match** (bank line → bill) after delete; API can't set IsReconciled.
  - **Reconciled** spend-money (e.g. Apple, Qantas) → require UI **Remove & Redo** then re-match.
  - **GST-free** big-dollar dups (Airbnb, Kennards, Defy) → zero BAS impact, defer to hygiene / Standard Ledger.

## Xero API mechanic
- Auth: **codebase OAuth** (`.xero-tokens.json`; MCP is broken). Rate limit 60/min → sleep ~1100ms between calls.
- Delete = `POST BankTransactions` with `{ BankTransactionID, Status: "DELETED" }`. Only works on **unreconciled** spend-money; Xero refuses reconciled ones (good — matches our IN-scope guard).
- Pre-flight each line with a live GET to confirm current state hasn't drifted from the worksheet (auto-reconcile may have changed things since the mirror sync).

## Guardrails (non-negotiable)
1. **Dry-run by default.** Prints a manifest: per line → BankTransactionID, vendor, amount, matched bill (status + has_attachments), GST. Nothing mutates without `--apply`.
2. **Explicit verb.** `--apply` AND the operator types "delete" — per Tier-3 trust rule.
3. **Tracer-first.** First run does exactly ONE delete, then stops for confirmation before the rest.
4. **Per-line safety predicate** (abort the line, don't guess) — see tests below.
5. **Never AFK.** Day-shift only; never queued into a loop/background backlog (AFK boundary rule).
6. **Batch cap + count confirm.** Refuse > N lines without re-confirm; print "about to delete X lines totalling $Y" and require y/N.
7. **Audit log.** Append each delete (id, amount, bill ref, timestamp) to `thoughts/shared/recon-pack/dup-delete-log-<label>.md` for provenance.

## TDD — safety tests written FIRST (red before green)
- ❌ never deletes a spend-money where `is_reconciled = true`
- ❌ never deletes when no matching bill found
- ❌ never deletes when matching bill `has_attachments = false`
- ❌ never deletes when matching bill status ∉ {PAID} (AUTHORISED is out-of-scope)
- ❌ never deletes when live GET state ≠ worksheet expectation (drift guard)
- ✅ dry-run mutates nothing (assert zero POSTs)
- ✅ with `--apply`, deletes exactly the IN-scope lines and logs each
- ✅ GST manifest total equals the worksheet's GST-bearing total (reconcile attempted vs expected)

## After a run
Re-run `prepare-bas.mjs <Q> --save`; assert 1B dropped by the manifest's GST total (attempted vs actual). Then the AUTHORISED + reconciled lines remain for manual UI handling.
