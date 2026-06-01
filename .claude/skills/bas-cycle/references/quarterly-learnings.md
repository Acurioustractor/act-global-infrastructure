# Quarterly Learnings — Accumulated Knowledge

This file accumulates patterns, discoveries, and lessons across every BAS quarter. Each entry should be small, specific, and actionable.

**Order: most recent learning first.** Each entry tagged with the quarter where it was discovered.

---

## 2026-04-09 — Q2+Q3 FY26 session (live working)

### The mirror has 342 DELETED SPEND shadows that pollute every downstream report
- Discovered: `sync-xero-to-supabase.mjs` pulls the `Status` column correctly but no consumer filters on it
- Impact: BAS gap reports inflated by ~35% (fake "missing receipts" on deleted txns)
- Fix: every script querying `xero_transactions` must `WHERE status NOT IN ('DELETED','VOIDED')`
- Patched scripts: `match-receipts-to-xero.mjs`, `bas-gap-sweep.mjs`, `prepare-bas.mjs` (8 queries), `sync-bill-attachments-to-txns.mjs`
- Still needed: patch `sync-xero-to-supabase.mjs` itself to remove deleted rows from mirror on next sync

### 903 dext_import receipts were stranded with `status='uploaded'` but zero Xero linkage
- Cause: Dext's direct-to-Xero integration pushed receipts before `receipt_emails` tracking existed, so the linkage column was never populated
- Fix: `scripts/backfill-stranded-dext-links.mjs` — matches by vendor + amount + date ±3d, found 706/903 (78%) clean matches
- Principle: **before assuming receipts are missing, check if they're already in Xero but unlinked in our tracking**

### The matcher's scoring was naive to three failure modes
1. **No amount disqualifier** — $148 receipt happily matching $-228 txn via vendor+date alone
2. **No sign check** — negative receipts (refunds) matching positive charges
3. **No exact-match promotion** — a $4,500 exact-amount exact-vendor pair scored only 76% because dates were 23 days apart
- Fix: hard disqualifiers added + exact-match-promotion path (vendor ≥ 0.9, amount within $1 or 1%, date within 60d → auto-promote to 90)

### The "43 drifted bills" hypothesis was wrong
- Claim: 43 `xero_invoices` with `has_attachments=true` but Attachments API returns empty
- Reality: probed 573/573 bills, 0 drift. The claim was based on stale/incomplete data.
- Lesson: **always verify counts against live API before treating a hypothesis as fact**

### OCR junk pollutes the matching candidate pool
- Dext scrapes marketing emails (Squarespace renewals, AWS notifications) as if they were receipts
- Gemini OCR extracts them with $0 amounts but valid vendor names
- They match to real Xero txns at 72-77% scores on vendor+date alone
- Fix: `scripts/flag-junk-receipts.mjs` marks marketing/notification subjects as `status='skipped'`
- Conservative: only flags 8/213 zero-amount rows. Most $0 receipts are real receipts with OCR extraction failures (booking confirmations, flight itineraries).

### Xero API: 60 requests per minute per tenant
- Going faster → HTTP 429 with `Retry-After` header
- All probe scripts now sleep 1100ms between calls = ~54/min with headroom

### Xero API: cannot mark bank-fed transactions as reconciled
- `PUT /BankTransactions/{id}` with `IsReconciled=true` returns `ValidationException`
- Reconciling bank feed lines is **UI-only**
- 18+ bank transfer pairs require manual "Transfer money" in Xero UI

### Xero rejects attachments on DELETED transactions with opaque 500 errors
- Not 4xx, not "entity deleted" — just `{"Title":"An error occurred","Detail":"An error occurred in Xero"}`
- Root cause of 30 "failed" receipts this session — all pointed to deleted-shadow txns
- Fix: upload script now pre-flights `Status` check before PUT

### Gemini 2.5 Flash Lite is 10x cheaper than Claude Haiku for receipt OCR
- $0.04 for 333 receipts vs $0.45 for 223
- Quality parity on Australian business receipts
- Pattern: `scripts/ocr-dext-processing.mjs`

---

## 2026-04-08 — BAS FY26 Q2+Q3 assembly session (prior)

### Qantas/Uber/Webflow/Virgin/Booking.com connectors all work 100%
- They create ACCPAY bills with PDFs attached
- Bills and bank-side SPEND txns are NOT auto-reconciled — need Find & Match or sync-bill-attachments script
- **Do not attempt vendor portal downloads — receipts are already in Xero, just on the wrong side**

### `receipt_emails` has NO `metadata` JSONB column
- Script attempted to store EXIF + suggestion metadata — silently dropped
- TODO: add the column, or store in a side table

### Three Xero token stores drift
- `.xero-tokens.json`, Supabase `xero_tokens` table, `.env.local` XERO_REFRESH_TOKEN
- Xero rotates on every use → drift → `invalid_grant` errors
- Fix: `scripts/sync-xero-tokens.mjs` reconciles all three

---

## Template for future entries

```
## YYYY-MM-DD — Q{N} FY{YY} session title

### [Specific pattern or discovery]
- What was observed
- Why it matters
- How to handle it next time
- Link to script / reference if applicable
```

Keep entries under ~150 words each. If you need more space, create a separate file in `references/` and link to it.


## 2026-06-01 — Q2+Q3 FY26 push to 100% (reconcile cockpit session)

### Receipts are NOT the BAS blocker — reconciliation is
- Three threads (completeness, pool matcher, bill→txn copy) all landed here: coverage already ~94%, gaps all sub-$82.50 or receipt-less (fees/transfers/drawings). Pool matcher: 0 confident auto-matches left; bill→txn: 1 pair left.
- The real lever to 100% + GST confidence: **bank reconciliation** (Q2 72% / Q3 67%), **clearing duplicates**, **DRAFT payables**, then GST verify.
- Lesson: don't spend the session chasing receipts when the GST/confidence gap is reconciliation. Check coverage % first; if >90% and gaps sub-threshold, pivot to reconciliation.

### The reconcile cockpit + agent-workflow is the tool for the card-line backlog
- `/finance/reconcile` classifies every NAB Visa line (match/duplicate/already/create). An agent workflow then verifies dups + codes creates (read-only proposals). Q2: 24→22 confirmed dups; Q3: 17→16. Packs in thoughts/shared/recon-pack/.
- Agent dup-verification caught false positives a naive matcher would delete: Townsville≠Sunshine Coast Council (different merchant), Good Morning Coffee collision, **Bitwarden bank<bill** (FX, not a surcharge).

### Surcharge gate is DIRECTIONAL: bank >= bill
- A card surcharge makes bank >= bill. A bank line LESS than the bill (Bitwarden USD $17.75 vs $17.87) is FX/rounding, NOT a duplicate surcharge → do not auto-delete. Added to reconcile-cycle/references/confirmed-duplicates.md.

### Duplicate → 1B GST exposure (cash basis)
- A duplicate (bill + card txn) can double-count GST-paid (1B) if both are counted. Q2: up to ~$1,651. Clearing dups raises net payable slightly. Verify per-line in Xero (cash basis counts the payment side) — don't auto-adjust.

### Dext CSV: 100% account + receipt image, but maps to dup/match lines, NOT creates
- The Dext export (Category=real Xero account, Project 2=ACT code ~36%, Image=rbnk.me 100%) corresponds to Dext-PUSHED receipts → now the dup/match lines. The CREATE lines are precisely what Dext did NOT push → they don't match the CSV. Use Dext for receipt-attach + account-confirm on dup/match lines, heuristic+agent for creates.
- Staged: thoughts/shared/recon-pack/dext/q{2,3}-dext-2026-06-01.csv.
