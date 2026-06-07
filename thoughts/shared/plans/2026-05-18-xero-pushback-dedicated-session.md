---
date: 2026-05-18
status: planned-not-started
session_type: dedicated-focus
estimated_duration: 90-180 min
prereq: thoughts/shared/handoffs/2026-05-17-finance-tagging-platform-handoff.md
---

# Xero push-back — dedicated session plan

## Goal

Commit the manual tag changes that currently live only in Supabase mirror back to Xero, **safely**, with full visibility and rollback at every step. After this session, our Supabase-side tags and Xero's tracking categories should match — and the manual-tag guard stays in place so future syncs respect them.

## Why this is its own session

The mirror-only retags so far have been low-risk (Supabase only, Xero untouched). The push-back is **Tier 3 / shared-state / hard-to-reverse** — every API call modifies a live Xero record. One bad batch could break BAS, R&D evidence, or the trust state with our accountant. So this session is deliberately scoped, with no other work happening in parallel.

## Current state to push (as of 2026-05-17 close)

- **0 bank txns** with `project_code_source = 'manual'` (UI retags) — Ben only did targeted untags so far
- **657 rows** with `project_code_source = 'manual-untagged-pre-jan26'` — pre-Jan-2026 ACT-HV rows
- **1 row** with `project_code_source = 'manual-duplicate-of-kennedys-9ae29a04'` — the $8,525 dup
- **543 rows** with `project_code_source = 'manual-untagged-nm-personal-not-act'` — Nic's personal account
- **0 rows** so far through bulk-retag-to-new-project pathway
- **Total pending Xero pushes: ~1,200 rows that need their tracking category cleared in Xero**

Note: "clearing" the tracking is harder than "setting" it. Xero's API for BankTransactions POST accepts a `Tracking: []` array on each LineItem — sending an empty array removes the tracking. Bills (Invoices) use the same pattern.

## Pre-flight checklist (run before touching Xero)

1. `git status` — clean tree, all current code committed or stashed
2. `pm2 list | grep xero` — confirm `xero-sync` is **stopped** (it should be)
3. `/finance/audit` snapshot — record total spend by project before push
4. `pg_dump --schema-only --table xero_invoices --table xero_transactions` — schema snapshot (optional safety)
5. Confirm `XERO_REFRESH_TOKEN` is fresh by running `node scripts/sync-xero-tokens.mjs` once
6. Open Xero in a browser tab, on a known reconciled-bank-txn row, ready to spot-check
7. Confirm with Ben before clicking "push"

## Session structure

### Phase 1 — Build the push-back queue UI (60 min)

- **New page** `/finance/xero-pushback` — a queue view showing every row where Supabase `project_code` differs from Xero's tracking
- Columns: date, vendor, amount, source, Supabase tag, Xero tag, diff, "Will push" toggle (default off)
- Filter: source flag (manual / manual-untagged-* / specific batch)
- **Server-side dry-run**: fetch the current Xero state for each row, compute the actual diff, render

### Phase 2 — Push individual confirmed rows (30 min)

- Start with ONE row that's safe (e.g. a Maleny Hardware non-reconciled-bank-txn bill that was retagged to ACT-CORE)
- Push it via API
- Verify in Xero UI it changed
- If good, push 5 more
- If still good, batch push 20

### Phase 3 — Handle the reconciled-bank-txn block (30 min)

Earlier session found Xero refuses to edit reconciled bank transactions. Need to either:
- Skip them with clear logging (recommended for first session)
- Or un-reconcile → push → re-reconcile (risky, requires bank-feed line)

Decision point: which approach?

### Phase 4 — Mass push the safe rows (30 min)

After the patterns are proven, push the big batches:
- 657 pre-Jan-2026 untags (clear tracking on each — these are mostly bills which are usually editable)
- 543 NM Personal untags (these are bank txns — many will hit the reconciled-block)

### Phase 5 — Document + cleanup (15 min)

- Update handoff with what got pushed, what was blocked, counts
- Reset `project_code_source` from `manual-untagged-*` to `manual-pushed-to-xero` so we know the loop is closed
- Commit code changes

## Code that needs to be built

1. `apps/command-center/src/app/api/finance/xero-pushback/queue/route.ts` — GET returns rows needing push with current-state diff
2. `apps/command-center/src/app/api/finance/xero-pushback/push/route.ts` — POST receives array of {id, source} + new project_code (or null to clear), applies to Xero via existing `xero-client.mjs`, returns per-row result
3. `apps/command-center/src/app/finance/xero-pushback/page.tsx` — queue UI with select-all/select-some, dry-run preview, push button with confirmation
4. Reuse `cleanForPost()` helper from `scripts/ocr-bank-txn-attachments.mjs` for the Xero POST payload shape
5. After successful push, update `project_code_source` from `manual*` to `manual-pushed-to-xero-YYYY-MM-DD` so subsequent syncs don't try to re-push

## Risk register

| Risk | Mitigation |
|---|---|
| Xero refuses edit on reconciled bank txn | Detect 400 "reconciled with Bank Statement" error → skip + log; user can un-reconcile in Xero UI separately |
| BAS lodgement window opens (mid-quarter) — pushing tracking changes affects reporting | Check BAS cycle status before pushing; defer if mid-quarter |
| Rate limit (60 req/min/tenant) | xero-client.mjs already rate-limits to 55/min — fine for ~1,200 rows ≈ 22 min |
| Auth token expires mid-batch | xero-client.mjs auto-refreshes — already handled |
| Push wrong project_code by mistake | Server-side fetch of current Xero state + diff display before push; user-confirm per batch |
| Sync runs mid-push | xero-sync PM2 entry is stopped; verify before starting |

## Done-when

- All `manual-*` rows have been either pushed to Xero or explicitly skipped with reason
- `project_code_source` has been updated to reflect post-push state
- `/finance/audit` numbers match between Supabase mirror and a fresh Xero query
- Handoff written explaining what was pushed and what's still pending

## Out of scope for this session

- Push back of `_ocr` summaries → Xero line descriptions (already partially done for Kennedy's; can be a separate sweep)
- Push back of `_note` field (Xero doesn't have a great equivalent — could go in Reference or Description)
- Voiding the Kennedy's $8,525 duplicate in Xero (Ben can do that in Xero UI directly)
- Fixing the Homeland School INV-0303 phantom payment (Ben's manual Xero fix per task #21)
