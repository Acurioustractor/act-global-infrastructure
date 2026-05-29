---
date: 2026-05-29
status: planned-not-started
session_type: dedicated-focus (Tier-3 Xero writes)
supersedes: thoughts/shared/plans/2026-05-18-xero-pushback-dedicated-session.md (tag push-back half)
branch: wip/goods-finance-recon-2026-05-29
---

# Xero "close the loop" — receipts + tag push-back from the Mirror

## Goal
Make the Xero Mirror two-way: (1) **add a receipt to a flagged bill/spend and have it land in Xero**, and (2) **push the Supabase project tags back to Xero** so the accountant/Standard Ledger see them — both safely, with preview + per-step confirm + rollback, so you can then **reconcile in Xero** against clean, fully-coded, evidenced records.

## Why a dedicated, gated build
Every write here mutates a **live Xero record** (Tier 3). A bad batch could affect BAS, R&D evidence, or accountant trust. So: dry-run/preview everywhere, explicit confirm per batch, reconciled-row detection, BAS-window check, and the manual-tag guard stays intact. `xero-sync` PM2 entry is already **stopped** (verified) — keep it stopped during writes.

## Proven building blocks (reuse, don't reinvent)
- **OAuth R/W**: the `xero_tokens` refresh pattern from `scripts/apply-goods-bookkeeper-corrections.mjs` (used successfully today for the void/recode). GET-fresh → modify only target field → POST back → revert log.
- **Attachments API**: bills → `PUT/POST Invoices/{id}/Attachments/{filename}` (proven in `ocr-defy-bills.mjs`, `ocr-carbatec-bills.mjs`); spends → `BankTransactions/{id}/Attachments/{filename}` (`bulk-upload-receipts.mjs`, `ocr-bank-txn-attachments.mjs`).
- **Tracking writes**: POST Invoices/BankTransactions with `LineItems[].Tracking` = `[{Name:'Project Tracking', Option:'ACT-GD — Goods'}]` to set, `[]` to clear. (Today's recode proves the Invoices path + the option IDs: category `1a1ad7c5…`, ACT-GD opt `63aee6ea…`.)
- **Tag-state source-of-truth**: rows where `project_code_source LIKE 'manual%'` and Supabase `project_code` ≠ Xero tracking = the push queue.

## Phases (ship in order; Phase 1 first = lower risk, immediate value)

### Phase 0 — Pre-flight safety (shared, ~15 min)
- `scripts/lib/xero-write.mjs` (or extend today's pattern): token refresh, 55/min rate-limit, GET-fresh-before-write, revert-log writer, reconciled-row detector (400 "reconciled with Bank Statement" → skip+log).
- Pre-flight gate (run before any write): git clean · `xero-sync` stopped · `XERO_TENANT_ID` set · token fresh · **BAS-window check** (today 2026-05-29 = Q4 FY26; Q3 BAS due ~28 Apr already passed, Q4 due ~28 Jul → between windows, low risk — confirm with Ben).

### Phase 1 — Receipt upload → Xero (on the Mirror) (~60 min) ⭐ ship first
- **API** `POST /api/finance/xero-pushback/attach` — multipart {file, id, source}. Routes to `Invoices/{id}/Attachments` (bill) or `BankTransactions/{id}/Attachments` (spend) via OAuth. Returns AttachmentID + new has_attachments. Optimistically flips the row to ✓; full truth on next sync.
- **Mirror UI**: on bill rows flagged "no receipt" (the **11**), an **Attach** button → file picker → upload → ✓. Reuses the `Bills · no receipt` flag as the worklist.
- **Verify**: upload to ONE bill → confirm the attachment shows in Xero UI → then enable for the rest.
- Risk: low (additive — attaches a file, mutates no financial data). No reconciled-block issue (attachments allowed on reconciled rows).

### Phase 2 — Tag push-back → Xero (dedicated queue, linked from Mirror) (~90 min)
- **Page** `/finance/xero-pushback` — queue of rows where Supabase tag ≠ Xero tracking. Columns: date · vendor · amount · source · Supabase tag · **live Xero tag** · diff · "push" toggle (default off). Filter by source-flag batch.
- **API** `GET …/xero-pushback/queue` (server-side fetches live Xero state per row → real diff) + `POST …/xero-pushback/push` ({id, source, projectCode|null} → set/clear tracking, revert-logged).
- **Safety ladder** (from the prior plan): push 1 proven row → verify in Xero → 5 → 20 → batches. Reconciled bank txns → **skip + log** (v1; un-reconcile is out of scope). After success, stamp `project_code_source = 'manual-pushed-to-xero-2026-05-29'` so syncs don't re-push.
- **Mirror link**: a "Push N tags to Xero →" affordance on the mirror routes here (keeps the bulk write off the casual inline path).

### Phase 3 — Verify + document (~20 min)
- `/finance/audit` (or the mirror rail) reconciles between Supabase and a fresh Xero query.
- Handoff: what got pushed/attached, what was skipped (reconciled rows) + why, counts. Commit.

## Architecture decisions to confirm
- **D1 — Receipts inline on the Mirror** (Attach button on the 11 flagged bills). ✔ matches your ask.
- **D2 — Tag push-back as a dedicated `/finance/xero-pushback` queue** (diff-preview + batch-confirm), *linked* from the Mirror — rather than inline "push" on every retag. Recommended for ~1,200 rows of safety; the Mirror keeps inline *Supabase* tagging. OK?
- **D3 — Reconciled bank txns: skip + log** in v1 (don't auto un-reconcile). OK?
- **D4 — First write session = Phase 1 (receipts) + a *small* proof tag-push (1→5→20)**; defer the ~1,200-row mass tag push to a confirmed batch run. OK?

## Risk register (carried from 2026-05-18 + additions)
| Risk | Mitigation |
|---|---|
| Edit refused on reconciled bank txn | Detect 400 → skip + log; surface count |
| BAS lodgement mid-window | Pre-flight BAS-window check; defer mass push if mid-quarter |
| Rate limit 60/min | 55/min throttle (today's pattern) |
| Token expiry mid-batch | Auto-refresh in the write lib |
| Wrong tag pushed | Server fetches live Xero state + diff before push; per-batch confirm |
| Sync runs mid-push | `xero-sync` stopped; pre-flight re-checks |
| Bad attachment | Single-row proof first; revert = delete attachment in Xero UI |

## Done-when
- Receipts: the 11 flagged bills either have a receipt in Xero or are explicitly waived.
- Tags: proven push path works; `project_code_source` stamped post-push; audit numbers reconcile Supabase↔Xero for the pushed set.
- Handoff written; code committed.

## Out of scope (this build)
- Auto un-reconcile→push→re-reconcile for reconciled bank txns.
- `_ocr`/`_note` push to Xero descriptions.
- The actual bank reconciliation (Find & Match stays in Xero's UI — this build makes the records clean *for* it).
