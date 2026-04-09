# BAS FY26 Q2 + Q3 — Session Handoff

**Session date:** 2026-04-08 → 2026-04-09
**Entity:** Nicholas Marchesi T/as A Curious Tractor · ABN 21 591 780 066
**Context:** Q2 FY26 BAS overdue ~6 weeks, Q3 FY26 due 28 Apr 2026. Comprehensive receipt/BAS assembly session.

## TL;DR for resuming

Everything that could be scripted IS scripted. The remaining work is **manual in the Xero UI** (45-min transfer reconciliation) + **human decisions** (write-offs, Xero ME project suggestions, send accountant email). The data is as assembled as it can get.

**Start here when resuming:** read this file, then `thoughts/shared/reports/bas-action-list-q2-q3-fy26.md` for the master action list, then pick from the "Open items" section below.

---

## Critical context (non-obvious findings from this session)

### 1. Qantas/Uber/Webflow/Virgin/Booking.com connectors are all working perfectly

Receipt coverage on ACCPAY bills in FY26:
- Qantas (all variants): 131 bills / 127 with receipts (97%)
- Uber: 48/48 (100%)
- Webflow: 22/22 (100%)
- Virgin Australia: 5/5 (100%)
- Booking.com: 4/4 (100%)

**The receipts are on the ACCPAY bill side, not the SPEND bank transaction side.** `prepare-bas.mjs` checks `xero_transactions.has_attachments` which misses these. Use `sync-bill-attachments-to-txns.mjs` to copy attachments from bills to bank transactions when possible.

**Do NOT attempt Qantas/Uber portal downloads.** They're pointless — the receipts are already in Xero.

### 2. Xero API cannot mark bank-fed transactions as reconciled

Confirmed via live test. `PUT /BankTransactions/{id}` with `IsReconciled=true` returns `ValidationException`. Reconciling bank feed lines is a **UI-only** operation in Xero.

**Implication:** the 42 bank transfer pairs (`scripts/pair-bank-transfers.mjs` output) must be reconciled manually in Xero UI. The playbook is at `thoughts/shared/reports/bank-transfers-q2-fy26-2026-04-08.md` + `-q3-`. ~45 min total.

**If you want automation:** the only path is Playwright browser automation, which has ToS risk and ~2hr build cost. Not built in this session.

### 3. Three Xero token stores drift — `sync-xero-tokens.mjs` is the fix

Xero rotates refresh tokens on every use. We had three places storing them:
1. `.xero-tokens.json` (used by `prepare-bas.mjs`)
2. Supabase `xero_tokens` table (used by `upload-receipts-to-xero.mjs`)
3. `.env.local` XERO_REFRESH_TOKEN

They got out of sync mid-session. `scripts/sync-xero-tokens.mjs` now reconciles them. **Run it whenever you see "invalid_grant" / "refresh token not found" errors.** Diagnostic mode (no args) probes each store and writes the working one everywhere.

### 4. Nicholas Marchesi $51K + $21K Q2 SPEND entries are owner drawings, NOT missing receipts

All 5 are `tax_type: BASEXCLUDED` on account 880/850 ("NJ Marchesi T/as ACT Everyday"). **They're correctly coded owner drawings — zero BAS/GST impact.** My earlier `bas-gap-sweep.mjs` misclassified them. There's a fix open: filter out BASEXCLUDED from the missing-receipt list.

### 5. Gemini 2.5 Flash Lite destroys Claude Haiku on cost for receipt OCR

- Claude Haiku 4.5: ~$0.45 for 223 receipts
- **Gemini 2.5 Flash Lite: ~$0.04 for 333 receipts** (10× cheaper, same quality)
- MiniMax-M2.7 is text-only (no vision on current plan)

`scripts/ocr-dext-processing.mjs` uses Gemini 2.5 Flash Lite via `@google/genai`. Falls back to `gemini-flash-latest` if Lite is overloaded.

**Gemini key location:** `.env.local` and `apps/command-center/.env.local` (root has it via append; if you change it in one, update both).

### 6. Supabase Storage `.list()` caps at 1000 files per call

`sb.storage.from('receipt-attachments').list('dext-import', { limit: 1000 })` returns max 1000. Pagination via offset works but you need to check `data.length < 1000` to know when to stop. Real `dext-import/` count is 1639 files.

### 7. `gmail_messages` table is nearly empty (25 rows)

Don't use it for Gmail search. `receipt_emails` (1640 rows) is the real Gmail-derived data source. If you want full Gmail history for future gap sweeps, a real backfill is needed.

### 8. `prepare-bas.mjs` bug fixed

The script queried a `reference` column on `xero_transactions` that doesn't exist (only on `xero_invoices`). Fixed in this session. Error was printed but non-blocking.

### 9. Mirror drift between `xero_transactions.has_attachments` and actual Xero state

Confirmed once: 105 `xero_transactions` had `has_attachments=false` in mirror but TRUE in Xero (fixed via mirror refresh).

**`xero_invoices` mirror drift hypothesis CLOSED 2026-04-08 — was wrong.** Probed all 573 Q2+Q3 ACCPAY bills with `has_attachments=true` via the live Attachments API using `scripts/test-xero-attachment-reality.mjs`. Result: **573/573 confirmed real, 0 drift**. The "43 drifted bills" claim was based on incomplete data. There is no $5-6K of hidden recoverable receipts in mirror desync. Skip this from the 10/10 finish list.

### 10. Persistent Xero 500 errors on specific transactions

Transactions like `2501da87...` (Apple Pty Ltd $14.99) return 500 every time we try to PUT an attachment. Not a transient issue — tried 4+ times across the session. These are probably corrupted/half-deleted on Xero's side. Should report to Xero support with `Instance` IDs from error responses.

---

## BAS position at end of session

### Q2 FY26 (Oct–Dec 2025) — overdue ~6 weeks

| | |
|---|---:|
| G1 Total Sales (inc GST) | $308,946.00 |
| G11 Non-capital purchases | $122,086.83 |
| 1A GST collected | $28,086.00 |
| 1B GST paid (estimated 1/11th) | $11,098.80 |
| **Net GST position** | **$16,987.20 PAYABLE** |
| Amount documented | $68,518 (56%) |
| Receipts by count | 18% |
| Reconciled | 53% |
| **Confidence** | **53% LOW** |
| R&D refund at risk | $16,872 |

### Q3 FY26 (Jan–Mar 2026) — due 28 Apr 2026

| | |
|---|---:|
| G1 Total Sales (inc GST) | $140,322.48 |
| G11 Non-capital purchases | $57,411.86 |
| 1A GST collected | $12,814.27 |
| 1B GST paid (estimated) | $5,219.26 |
| **Net GST position** | **$7,595.01 PAYABLE** |
| Amount documented | $36,127 (63%) |
| Receipts by count | 36% |
| Reconciled | 86% |
| **Confidence** | **69% MEDIUM** |
| R&D refund at risk | $9,291 |

### Combined

- **Net GST to ATO: $24,582** (across both quarters)
- **R&D refund at risk: $26,163** — still significant
- **Total $ defended this session: ~$9,742** (GST credits + R&D refund recovered)

---

## Reports on disk

All in `thoughts/shared/reports/`:

### Master docs
- **`bas-action-list-q2-q3-fy26.md`** ⭐ master action list with Ben/Nic splits
- `bas-fy26-session-handoff.md` ← this file

### BAS worksheets
- `bas-worksheet-q2-fy26-2026-04-08.md`
- `bas-worksheet-q3-fy26-2026-04-08.md`

### Accountant handoff pack
- `accountant-email-bas-q2-q3-fy26.md` — ready-to-send email
- `accountant-brief-q2-fy26-2026-04-08.md` — one-page cover
- `accountant-brief-q3-fy26-2026-04-08.md` — one-page cover
- `accountant-handoff-q3-fy26.md` — Mar 17 phantom payables playbook (pre-existing)

### Bookkeeping workbooks (CSV "tabs")
- `bookkeeping-q2-fy26-2026-04-08/` — 7 CSVs + summary.md
- `bookkeeping-q3-fy26-2026-04-08/` — 7 CSVs + summary.md

### Gap analysis
- `bas-gap-sweep-q2-fy26-2026-04-08.md` — 516 Q2 unreceipted txns classified
- `bas-gap-sweep-q3-fy26-2026-04-08.md` — 273 Q3 unreceipted txns classified

### Manual reconciliation playbooks
- `bank-transfers-q2-fy26-2026-04-08.md` — 24 Q2 transfer pairs
- `bank-transfers-q3-fy26-2026-04-08.md` — 18 Q3 transfer pairs
- `phantom-payables-matches-2026-04-08.md` — 60 matched, 202 unmatched bills

### Xero ME review
- `xero-me-project-suggestions-2026-04-08.md` — 47 project-code suggestions for Nic/Ben to review

---

## Scripts inventory (all new this session unless marked)

### Core BAS
- `scripts/prepare-bas.mjs` ← **bug fixed this session** (removed non-existent `reference` column)
- `scripts/generate-bookkeeping-workbook.mjs` — `Q#` → CSV bundle
- `scripts/generate-accountant-brief.mjs` — `Q#` → one-page cover

### Gap analysis + matching
- `scripts/bas-gap-sweep.mjs` — unreceipted txn classifier (Ben/Nic buckets)
- `scripts/pair-bank-transfers.mjs` — SPEND-TRANSFER ↔ RECEIVE-TRANSFER pair finder
- `scripts/suggest-payables-matches.mjs` — phantom payables matcher (262 bills → 60 matches)
- `scripts/link-stuck-receipts.mjs` — auto-link `receipt_emails` to unreceipted Xero SPEND

### Upload helpers
- `scripts/bulk-upload-receipts.mjs` — folder/manifest → Xero attachments
- `scripts/prepare-portal-manifest.mjs` — vendor portal CSV → normalized manifest (Qantas/Uber/Stripe/generic)
- `scripts/sync-bill-attachments-to-txns.mjs` ← **key insight script** — copies Xero bill receipts onto matching bank txns

### Dext
- `scripts/ocr-dext-processing.mjs` — Gemini 2.5 Flash Lite vision OCR (~$0.04 for 333 receipts)
- `scripts/rescrape-dext-permalinks.mjs` — pre-cancellation backup (639 files scraped cleanly)
- `scripts/import-dext-to-pipeline.mjs` — pre-existing, CSV-based import (runs `--scrape` mode)

### Xero ME
- `scripts/sync-xero-me-receipts.mjs` — pulls Xero ME attachments + EXIF GPS + calendar cross-ref
- `scripts/write-xero-me-suggestions-report.mjs` — markdown report generator for project-code suggestions

### Xero auth + reconciliation
- `scripts/sync-xero-tokens.mjs` — **run this first** if Xero calls fail with "invalid_grant"
- `scripts/reconcile-transfers.mjs` — pre-flight check for transfer pair reconciliation (Xero API blocked the actual writes)

### Dependencies added
- `exifr ^7.1.3` (workspace root) — EXIF GPS extraction for Xero ME images

---

## Open items for next session (prioritized)

### Blockers / critical path

1. **Manual transfer reconciliation in Xero UI (~45 min)**
   - Playbooks: `bank-transfers-q2-fy26-2026-04-08.md` + `-q3-`
   - 42 pairs. Each: Xero → Reconcile → Find & Match → Transfer money → select counter-account → Reconcile
   - Lifts Q2 reconciliation from 53% → ~61%

2. **Send accountant email for Q2 deferral**
   - Draft: `thoughts/shared/reports/accountant-email-bas-q2-q3-fy26.md`
   - Needs Nic's approval + accountant email address
   - Stops the failure-to-lodge penalty clock on Q2

3. **Nic's decisions:**
   - Write-off calls on aged receivables: Rotary Eclub $82.5K (364d), Social Impact Hub $10.8K, Green Fox $9K, Aleisha Keating $1.35K
   - Verify 1B GST estimate against Xero's real BAS Report (ours uses total/11 approximation)
   - Review Xero ME project-code suggestions in `xero-me-project-suggestions-2026-04-08.md`
   - Triage decision on 202 unmatched phantom payables ($177K) — void the lot, or triage top 20?

### High-value but non-blocking

4. ~~**Investigate the mirror-drift issue**~~ **CLOSED 2026-04-08** — probed all 573 bills, zero drift. No recovery possible here. Script: `scripts/test-xero-attachment-reality.mjs`. Report: `thoughts/shared/reports/xero-attachment-drift-2026-04-08.md`.

5. **Investigate persistent Xero 500s**
   - Specific transactions (Apple Pty Ltd `2501da87...` and ~10 others) return 500 on every attachment PUT
   - Not our code — Xero-side bug
   - **Action:** collect Instance IDs from error responses, file ticket with Xero API support. Include in the ticket: request ID, tenant ID, transaction ID.

6. **Re-OCR the 639 newly-rescraped Dext files**
   - Those were scraped in the final rescrape pass but haven't been run through `ocr-dext-processing.mjs` yet
   - Many may already have parsed metadata from Dext; some may need OCR
   - **Action:** `node scripts/ocr-dext-processing.mjs` (the filter already catches rows missing vendor/amount)

7. **Phantom payables Remove-&-Redo (60 matched, 202 unmatched)**
   - Report: `phantom-payables-matches-2026-04-08.md`
   - 60 have clear bank-txn matches (~90 min manual work)
   - 202 need Nic to make void/chase decisions
   - Only do AFTER transfer reconciliation (shared Xero UI context)

### Systemic improvements (deferred)

8. ~~**Fix `bas-gap-sweep.mjs` to exclude BASEXCLUDED**~~ **DONE 2026-04-08** — line_items JSONB filter added. Q2 dropped 516→461, Q3 273→236.
9. **Consolidate Xero auth** — 4 scripts duplicate the auth code. Refactor into `scripts/lib/xero-auth.mjs`
10. ~~**Lower threshold + review output**~~ **DONE 2026-04-08** — `match-receipts-to-xero.mjs --apply` now writes `thoughts/shared/reports/ambiguous-matches-YYYY-MM-DD.md` with all 154 candidates at 40-79%. **Quality issue surfaced:** OCR junk receipts ($0.00 marketing emails) inflate the candidate pool — scorer needs harder amount-mismatch penalty.
11. **Build Playwright bank reconciliation automation** — only if transfer reconciliation becomes recurring work (for one-off, manual is faster)
12. **Enrich vendor contacts with ABN + email** — from March 17 plan, still open
13. **Add `metadata` JSONB column to `receipt_emails`** — `sync-xero-me-receipts.mjs` tried to store EXIF + suggestion metadata but was silently dropped because the column doesn't exist
14. **Cancel Dext subscription** — safe now (1639 files preserved). Save the subscription fee.
15. **R&D documentation pack** for AusIndustry FY26 registration

---

## Key numbers to resume from

### Data coverage
- `receipt_emails`: 1787 rows (1640 `dext_import` + 99 `gmail` + 8 `manual_upload` + 96 `xero_me` — new this session)
- Supabase Storage `receipt-attachments/dext-import/`: 1639 files (89MB, every Dext permalink preserved)
- Supabase Storage `receipt-attachments/xero-me/`: 96 files (12.8MB)
- Xero txns with `has_attachments=true` last 60d: refreshed mirror in sync with Xero

### Cost
- Total AI spend this session: **$0.04** (Gemini 2.5 Flash Lite OCR)
- All other operations (Xero API, Supabase, Gmail capture): $0

### Auth state at end of session
- Xero tokens: **in sync across all 3 stores** (file, DB, env). Last refreshed via `sync-xero-tokens.mjs` — working token pulled from Supabase, new rotated pair written everywhere.
- Gemini: new key valid, added to both `.env.local` files
- Anthropic: credit balance too low (blocked Haiku path, not needed since Gemini is 10× cheaper)
- Google Gemini (old key): expired, replaced

---

## Quick reference commands for next session

```bash
# Verify Xero auth is still working
node scripts/sync-xero-tokens.mjs --dry-run

# Refresh BAS worksheets (uses Xero P&L API + our mirror)
node scripts/prepare-bas.mjs Q2 --save
node scripts/prepare-bas.mjs Q3 --save

# Re-run full matcher pipeline (auto-matches ≥80%)
node scripts/match-receipts-to-xero.mjs --apply

# Push any newly-matched receipts to Xero
node scripts/upload-receipts-to-xero.mjs --limit 50

# OCR any new Dext rows missing metadata (idempotent)
node scripts/ocr-dext-processing.mjs --apply

# Sync Xero ME receipts for the last N days
node scripts/sync-xero-me-receipts.mjs --days 60 --apply

# Copy bill attachments to matching bank txns
node scripts/sync-bill-attachments-to-txns.mjs --apply

# Verify every bank transfer pair in Q2/Q3
node scripts/reconcile-transfers.mjs Q2 Q3

# Check phantom payables state
node scripts/suggest-payables-matches.mjs

# Generate fresh gap sweep reports
node scripts/bas-gap-sweep.mjs Q2
node scripts/bas-gap-sweep.mjs Q3
```

---

## What would make this a 10/10 finish

1. Manual transfer reconciliation done (45 min in Xero UI)
2. Accountant email sent with Q2 deferral request
3. Nic's write-off decisions made + applied
4. Mirror-drift investigation + fix (recovers ~$5-6K of receipts)
5. Phantom payables triaged (60 matched fixed, 202 unmatched voided or deferred)
6. Final `prepare-bas.mjs` run showing Q2 ≥65% / Q3 ≥80% confidence
7. Re-send updated worksheets to accountant
8. Lodge both BAS via accountant before 28 April

**This is the finish line.** Everything needed is on disk. The remaining work is human-decision + manual-UI, not more scripting.
