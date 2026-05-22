---
title: Finance Fix Runbook
date: 2026-05-22
status: ready_for_review
audit: thoughts/shared/reports/finance-audit-2026-05-21.md
rca: thoughts/shared/reports/finance-rca-2026-05-22.md
author: claude (direct, after watchdog stalls on agent attempts)
---

# Finance Fix Runbook — 2026-05-22

Step-by-step recipes for the 10 prioritised findings from the audit's §8, plus the 3 instrumentation signals from the RCA.

**Structure:**
- **Now (30 min)** — Tier 1 quick wins. Safe local edits. Script provided: `scripts/morning-quick-wins-2026-05-22.sh` (NOT YET WRITTEN — see §0 below before running anything)
- **This week (2-4 hrs)** — Tier 2 + Tier 3 work. Mostly Xero UI clicks. You do these.
- **This month (1-2 days)** — Architectural: rule-store consolidation, PM2 watchdog scaffolding.

Each recipe has: **PREREQ · ACTION · VERIFY · ROLLBACK**.

---

## §0 — Before you touch anything

Two safety checks before running any fix:

1. **Confirm another session isn't editing** — `git log --since='2 hours ago' --all --oneline`. §6 of the audit flagged that an auto-tagger ran today (33 spends + 19 bills got source `auto-tag-from-rules-2026-05-21`). Make sure no in-flight commits.
2. **Refresh Xero token** — §7.2 found `mcp__xero__list-tracking-categories` returned `invalid_scope`. Run: `node scripts/sync-xero-tokens.mjs`. Without this, any Xero MCP read will fail and you'll waste time debugging.

---

## NOW (30 min) — Tier 1 quick wins

### Fix 1 — Loosen NAB bank-fee filter (audit §8.2)
**Impact:** Lifts receipt% from 76.5% → ~83% (one-line edit).
**Effort:** Tier 1. ~5 min.

**PREREQ:** None.

**ACTION:**
- File: `apps/command-center/src/app/api/finance/transactions/reality/route.ts` (or wherever the receipt-coverage denominator is computed — grep for `bank.*fee\|nab.*fee\|excludes.*transfer`).
- The current excludes filter catches transfers + ATO but not the 203 NAB bank-fee rows ($1,176 — §2.5 of audit). Add `vendor ILIKE 'NAB %'` to the exclude clause, or filter by amount < $5 + vendor ILIKE '%NAB%'.

**VERIFY:**
- Re-load `/finance/transactions` — Reality strip should show receipt% bump.
- Run: `curl -s http://localhost:3002/api/finance/transactions/reality | jq '.receiptedPercent'` — should be ≥ 82.

**ROLLBACK:** Revert the one-line diff.

---

### Fix 2 — Refresh Xero token (audit §7.2)
**Impact:** Restores Xero MCP read access.
**Effort:** Tier 1. ~30 sec.

**PREREQ:** Xero refresh token still valid (lives in `.env.local`).

**ACTION:**
```bash
node scripts/sync-xero-tokens.mjs
```

**VERIFY:**
- Xero MCP `list-organisation-details` returns valid response (no `invalid_scope`).

**ROLLBACK:** Tokens are append-and-rotate; previous token automatically retired.

---

### Fix 3 — Comment out PM2 receipt-chain entries (audit §5.2)
**Impact:** Prevents `pm2 reload` from respawning the archived receipt pipeline (Pattern 3 risk).
**Effort:** Tier 1. ~5 min. But **review the diff before saving** — these are load-bearing config lines.

**PREREQ:** Decision: keep the receipt chain OFF (canonical path = Dext + connectors, per audit §5.4 and handoff grill-me Q1).

**ACTION:**
- File: `ecosystem.config.cjs` lines 642-668 (per §5.2 finding).
- Comment out the 6 entries: `xero-sync`, `receipt-capture`, `receipt-match`, `receipt-upload`, `xero-project-tag`, `receipt-calendar-suggest`.
- **Better:** delete them outright (per RCA Pattern 3 — config drift comes from leaving fossils).
- Add a `// REMOVED 2026-05-22 — receipt chain consolidated to Dext + auto-billing connectors. See thoughts/shared/reports/finance-rca-2026-05-22.md Pattern 3.` comment at the section's prior location.

**VERIFY:**
- `node -e "require('./ecosystem.config.cjs')"` — config still parses.
- `pm2 reload ecosystem.config.cjs --dry-run 2>&1 | grep -i receipt` — no receipt-* entries listed.

**ROLLBACK:** Git revert the commit.

---

## THIS WEEK (2-4 hrs across the week) — Xero UI work

### Fix 4 — Void Telford Smith quadruple (audit §3.7 + §8.1)
**Impact:** $59,400 face-value phantom → real total stays the actual $19,800.
**Effort:** Tier 3 (Xero UI). ~15 min.

**PREREQ:** Confirm the Telford pattern is real — open all 4 records side by side in Xero.

**ACTION:**
1. Open Xero → Business → Bills.
2. Keep: `843767e6` (PAID, ACT-IN, the canonical bill).
3. Void: `f47c47b4` (AUTHORISED bill, ACT-IN — duplicate of above).
4. Open Xero → Accounting → Bank Accounts → NAB Visa ACT.
5. Void/Delete bank txns: `578961df` + `87a05588` (both AUTHORISED, ACT-GD — these are the bank-side of the same charge).
6. Re-tag the kept PAID bill to confirm ACT-IN tag holds.

**VERIFY:**
- `select count(*), sum(total) from xero_bills where contact_name ilike '%telford%';` → should show 1 bill, $19,800.
- `select count(*), sum(total) from xero_transactions where contact_name ilike '%telford%';` → should show 0 rows for the Dec 22-23 dates.

**ROLLBACK:** Xero voids are reversible via Xero UI (Restore voided bill / Restore voided spend).

---

### Fix 5 — Bulk-approve 159 DRAFT bills + flip Dext to Auto-publish (audit §7.4 + §8.3)
**Impact:** Unlocks $30,089 of receipted evidence. Stops the queue from regrowing.
**Effort:** Tier 2 (Xero UI + Dext UI). ~20 min.

**PREREQ:** Triage first — the 51 same-vendor-same-amount pairs flagged in handoff (Bitwarden $12, HighLevel $25, Cognition AI $200, Codeguide $29, Webflow $29) are monthly subscriptions, NOT duplicates. Don't void those.

**ACTION:**
1. Xero → Business → Bills → Filter: DRAFT → Sort by Date.
2. Bulk-select rows that aren't the same-day duplicates (use date column to spot).
3. Click Approve.
4. Open Dext → Settings → Integrations → Xero.
5. Change "When publishing" from "Save as Draft" to "Publish as Approved".

**VERIFY:**
- Xero DRAFT bill count drops to < 20 (the genuine in-progress ones).
- Next Dext-sourced bill should land as AUTHORISED, not DRAFT.

**ROLLBACK:** Approve is reversible (Xero UI: Edit → Save as Draft). Dext setting flip is reversible.

---

### Fix 6 — Investigate PM2 daemon outage (audit §6.1 + §8.4)
**Impact:** Restores all 110 PM2 entries (only 8 currently online, zero finance).
**Effort:** Tier 2. ~15 min.

**PREREQ:** None.

**ACTION:**
```bash
# 1. Find root cause
pm2 logs --err --lines 100

# 2. Check if launch agent survived last reboot
pm2 startup
# (Will print the launchctl command if not registered)

# 3. If launch agent broken, re-register
# (Run the launchctl command printed above)

# 4. Reload all entries honouring autorestart:false flags
pm2 reload ecosystem.config.cjs
pm2 save

# 5. Verify finance entries are back
pm2 list | grep -E 'telegram-daily-focus|weekly-reconciliation|money-stack-sync|daily-pulse'
```

**VERIFY:**
- `pm2 list` shows online count > 30 (target ~95 after deletions).
- `telegram-daily-focus`, `weekly-reconciliation`, `money-stack-sync` are all `online` with restart count ≥ 1.

**ROLLBACK:** `pm2 stop all` if anything looks wrong, investigate, restart selectively.

---

### Fix 7 — Reconcile (don't pay!) $735K AP backlog (audit §7.5 + §8.6)
**Impact:** Closes the 389-bill phantom AP backlog. Most are paid-outside-Xero, just need payment record applied.
**Effort:** Tier 2 (Xero UI). ~2 hrs over multiple sessions.

**PREREQ:** Pull bank statements for last 12 months. For each top-of-list bill, find the corresponding bank line.

**ACTION:**
1. Xero → Business → Bills → Filter: AUTHORISED.
2. Sort by Date Due, oldest first.
3. For each bill: check bank account for matching $ amount + vendor.
4. If found in bank → click bill → "Add Payment" → select bank line.
5. For NAB Visa cases (statement debits), reconcile via Accounting → Bank Accounts → Match.

**Top of list to clear first** (from §7.5):
- The Funding Network $144,558 (176/156 days)
- Hatch Electrical $46,749
- RNM Carpentry $26,846
- Oonchiumpa Consultancy $19,305 — **partner org, don't let this sit**
- Carla Furnishers $11,180 ×2 (verify the duplicate flag)

**VERIFY:**
- Run `select count(*), sum(total) from xero_bills where status='AUTHORISED' and date < current_date - interval '30 days';` weekly. Target: < 50 bills, < $50K within 30 days.

**ROLLBACK:** Payments can be removed via Xero UI (Bill → Payments → Remove).

---

### Fix 8 — Merge Defy + other split contacts (audit §7.6 + §8.9)
**Impact:** Exposes $179K Defy concentration; corrects 8+ other splits.
**Effort:** Tier 2 (Xero UI). ~30 min.

**PREREQ:** None.

**ACTION:**
1. Xero → Contacts → All Contacts.
2. Search "Defy" → select both `Defy` and `Defy Manufacturing` → Options → Merge.
3. Keep the more-complete one (with ABN, address) as canonical.
4. Repeat for Qantas (5 records), Fish Bowl/Fishbowl, Mitre 10/Mitre10, etc. Full list in §7.6 of audit.

**VERIFY:**
- After merge, `/finance/vendors` page should show Defy total ≥ $179,935 under one row.

**ROLLBACK:** Xero merge is NOT reversible. Verify on the Xero merge confirmation screen before clicking through. If unsure, screenshot first.

---

### Fix 9 — Rename Xero legacy tracking categories (audit §7.1 + §8.8)
**Impact:** Xero-grouped reports stop under-counting projects. 305 "Goods." line uses get rolled into ACT-GD.
**Effort:** Tier 2 (Xero UI). ~20 min.

**PREREQ:** None.

**ACTION:**
1. Xero → Settings → General Settings → Tracking.
2. For each legacy entry per §7.1 of audit:
   - "Goods." → rename to "ACT-GD — Goods" (or delete + move 305 lines to canonical via `scripts/xero-relabel-tracking-option.mjs` if it exists; otherwise rename in-place merges history)
   - Repeat for The Harvest, BG Fit, Mounty, Empathy Ledger, JusticeHub, PICC, ACT-Infrastructure.
3. In-place rename preserves history. Don't delete + create new — that orphans line items.

**VERIFY:**
- `mcp__xero__list-tracking-categories` shows canonical names only.
- Xero project P&L pulls roll up old + new lines.

**ROLLBACK:** Rename is reversible (rename back).

---

### Fix 10 — Bank reconciliation sprint (audit §7.7 + §8.10)
**Impact:** Clears 1,010 unreconciled bank txns ($1.8M). Unlocks R&D + BAS + trial balance integrity.
**Effort:** Tier 2 (Xero UI). ~3-4 hrs across multiple sessions. Start with ACT Everyday ($1.18M / 183 lines) — fewer lines, bigger $ payoff per click.

**PREREQ:** Fix 6 first (PM2 + token refresh). Fix 7 helps (every AP payment recorded = bank line auto-matches).

**ACTION:**
1. Xero → Accounting → Bank Accounts → NJ Marchesi T/as ACT Everyday.
2. "Reconcile" tab → tackle oldest first.
3. For each unmatched bank line, click "Find & Match" → search by amount → confirm.
4. After ACT Everyday is < 50 lines: switch to NAB Visa ACT (827 lines, smaller $).

**VERIFY:**
- Run weekly: `select bank_account, count(*) filter (where is_reconciled = false) from xero_transactions group by 1;`
- Target: < 100 unreconciled per account.

**ROLLBACK:** Reconciliations can be unmade via Xero UI (Account Transactions → Remove & Redo).

---

## THIS MONTH — Architectural

### Fix 11 — Pick ONE tagger rule store (audit §4.5 + §8.7)
**Impact:** Stops Pattern 1 (multiple writers). Eliminates conflict between JSON / DB / tag_inference_rules.
**Effort:** Tier 2 (refactor). ~1 day.

**PREREQ:** Decision needed: **DB wins** (recommended — 507 rules vs JSON's 30; `auto_apply` flag exists; native upsert path).

**ACTION:**
1. Audit conflicts: run the §4.6 + §4.7 queries to enumerate all (vendor, project_code) divergences.
2. For each conflict: pick the correct code (Ben's call — usually the DB value, but Carbatec/Diggermate/Savage need Ben review).
3. Backfill JSON values into DB.
4. Archive `config/tag-suggester-rules.json` → `config/_archive/2026-05-tag-suggester-rules.json` with note.
5. Rewrite all consumers to read from `vendor_project_rules` table only:
   - `scripts/suggest-from-line-desc.mjs`
   - Any UI component reading the JSON
6. Add a test: `tests/no-vendor-rule-conflicts.test.mjs` — fails if `vendor_project_rules` has same vendor with multiple project_codes.
7. Decide fate of `tag_inference_rules` (17 rows) — likely also fold into `vendor_project_rules` with a `source` column.

**VERIFY:**
- `select vendor, count(distinct project_code) from vendor_project_rules group by 1 having count(distinct project_code) > 1;` returns 0 rows.
- Test from step 6 passes.

**ROLLBACK:** Archive can be restored from git. Test failure prevents regression.

---

### Fix 12 — PM2 watchdog (RCA Signal 1)
**Impact:** Catches daemon-wide outages within 25 hours (Pattern 2). Would have caught the §6.1 finding before audit needed to.
**Effort:** Tier 1. ~30 min.

**PREREQ:** Supabase write access (already have).

**ACTION:**
1. New migration: `cron_runs (name TEXT, ran_at TIMESTAMPTZ DEFAULT NOW(), status TEXT, summary TEXT)`.
2. Helper module: `scripts/lib/heartbeat.mjs` — exports `heartbeat(name, status, summary)`.
3. Wire into top 5 critical crons (start small): `weekly-reconciliation.mjs`, `money-stack-sync.mjs`, `daily-pulse-sync`, `telegram-daily-focus`, `weekly-money-digest`.
4. New cron: `scripts/cron-watchdog.mjs` — runs every 2 hrs. For each expected schedule, alerts Telegram if last heartbeat is > 2× interval overdue.
5. Add to `ecosystem.config.cjs` with cron `0 */2 * * *`.

**VERIFY:**
- Manually stop one of the wired crons → wait 2×interval → Telegram alert fires.

**ROLLBACK:** Disable cron-watchdog in PM2 config.

---

### Fix 13 — Same-vendor-same-amount duplicate detector (RCA Signal 2)
**Impact:** Catches future Telford-style duplicates within 48 hours. Closes Pattern 1.
**Effort:** Tier 1. ~30 min.

**PREREQ:** None.

**ACTION:**
1. New script: `scripts/detect-recent-duplicates.mjs`.
2. Query: bill+bill, spend+spend, bill+spend with same vendor + same amount + |date diff| < 7d.
3. Filter out monthly subscriptions (vendor in known-cadence list).
4. If count > 5, post top 5 to Telegram with Xero deep links.
5. Run daily via PM2 cron.

**VERIFY:**
- Backfill-test against current data — should surface the Telford pattern (will be cleared after Fix 4).
- After 2 weeks, false-positive rate should be < 1/week.

**ROLLBACK:** Disable cron.

---

### Fix 14 — Vendor-alias weekly report (RCA Signal 3)
**Impact:** Surfaces new Defy-style contact splits weekly. Closes Pattern 5.
**Effort:** Tier 1. ~30 min.

**PREREQ:** None.

**ACTION:**
1. New script: `scripts/weekly-contact-aliases.mjs`.
2. Query: `SELECT contact_name FROM xero_contacts` (or distinct from `xero_bills`).
3. Compute Jaro-Winkler similarity > 0.85 between pairs.
4. Filter to pairs with > $1K combined volume.
5. Top 5 to Telegram weekly with merge instructions.

**VERIFY:**
- First run should surface Defy + Qantas + the §7.6 list. After Fix 8, weekly count should be 0-2.

**ROLLBACK:** Disable cron.

---

## Quick reference — order of operations

If you have **30 min today:**
1. §0 safety checks (5 min)
2. Fix 2 — Xero token refresh (1 min)
3. Fix 1 — NAB filter (5 min)
4. Fix 3 — PM2 config cleanup (10 min, review diff first)
5. Fix 6 — PM2 daemon investigation (10 min — likely a `pm2 startup` away from full restore)

If you have **2 hrs this weekend:**
6. Fix 4 — Telford voids (15 min)
7. Fix 5 — DRAFT bills + Dext flip (20 min)
8. Fix 8 — Defy + Qantas merges (30 min)
9. Fix 9 — Tracking category renames (20 min)
10. Start Fix 10 — ACT Everyday reconciliation sprint (45 min)

If you have **a day this month:**
11. Fix 7 — AP backlog reconciliation (1-2 hrs spread)
12. Fix 11 — Tagger rule consolidation (~1 day)
13. Fix 12/13/14 — Watchdog scaffolding (~2 hrs total)

---

## What NOT to do (anti-patterns)

- **Don't auto-void duplicates via script.** `scripts/void-duplicate-bills.mjs` is plan-only by design (handoff 2026-05-18 — Ben's "screwing things up" concern). Manual triage stays.
- **Don't `pm2 restart all`.** §6.4 found 11 `sync-*-to-notion` entries with `autorestart:false` because `money-stack-sync` orchestrates them. Use `pm2 reload ecosystem.config.cjs` instead.
- **Don't merge Xero contacts you can't undo.** Screenshot the canonical contact's details before clicking through.
- **Don't add a 4th tagger rule store.** If you need a new rule, add to `vendor_project_rules` table only.
- **Don't write any new script that bills→Xero or spends→Xero without checking who else writes there.** Pattern 1.

---

## What `morning-quick-wins.sh` would do (if you want it built)

NOT built yet — Ben to confirm before automating. Proposed contents:
```bash
#!/bin/bash
set -e

cd /Users/benknight/Code/act-global-infrastructure

echo "1/3 — Refreshing Xero tokens..."
node scripts/sync-xero-tokens.mjs

echo "2/3 — Re-syncing Xero to Supabase..."
node scripts/sync-xero-to-supabase.mjs full --days=350

echo "3/3 — Recomputing reality dashboard..."
curl -s http://localhost:3002/api/finance/transactions/reality | jq

echo ""
echo "Done. Next manual steps:"
echo "  - Fix 1 (NAB filter edit, 5 min)"
echo "  - Fix 3 (PM2 config cleanup, 10 min — review diff)"
echo "  - Fix 6 (pm2 startup + pm2 reload, 10 min)"
```

Say "build morning-quick-wins.sh" and I'll write it.
