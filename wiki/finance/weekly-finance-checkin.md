---
title: Weekly Finance Check-in (canonical cadence)
status: Active
canonical_slug: weekly-finance-checkin
date: 2026-07-08
owner: ben
description: |
  The once-a-week, ~30–45 min finance ritual for ACT. One fixed running order
  that keeps receipts, card reconciliation, and compliance deadlines from ever
  piling up again — so we never repeat the June-2026 heroic-backlog sprint.

  This is the FRONT DOOR for the weekly session. It ties together the two
  operators (bas-cycle for receipts/GST, reconcile-cycle for the NAB Visa card)
  and anchors both to the compliance-calendar deadline ladder. Read this first,
  then dispatch into whichever skill the week needs.
---

# Weekly Finance Check-in

> **The rule:** 30–45 minutes, once a week, day-shift. Same running order every
> time. The point is *small batches, forever* — reconcile weekly, not monthly;
> chase receipts while they're warm; never let a quarter build to a wall again.

---

## 0. Where we are now (review — dated 2026-07-08, will drift)

**Financial year (live from Xero):** FY27 = **1 Jul 2026 → 30 Jun 2027**. We are
8 days in. **FY26 (Jul 2025–Jun 2026) has CLOSED.**

**The live deadline — Q4 FY26 BAS, due 28 Jul 2026 (~20 days out).**
Per `compliance-calendar.md`: Q4 FY25-26 (Apr–Jun 2026) is `pending`. This is the
**LAST sole-trader BAS** (cutover to A Curious Tractor Pty Ltd was scheduled
30 Jun 2026). Q3 FY25-26 filed 2026-04-24. This quarter is the immediate focus of
every weekly pass until it's lodged.

**Backlog state:** The Q2+Q3 FY26 reconciliation backlog was cleared in a June
sprint (see `thoughts/shared/handoffs/money-state-of-play/current.md`): NAB Visa
duplicate cleanup done via API (~$86K phantom spend deleted, ~$107K phantom AP
voided); the reconcile-cycle cockpit + BAS automation engine shipped. **The whole
reason this cadence exists is to make that sprint a one-off** — weekly hygiene
keeps the pile from ever rebuilding.

**Open questions to confirm with Standard Ledger (don't assert — verify):**
1. Is the Pty Ltd cutover actually complete, and is Q4 FY26 the true last
   sole-trader BAS? (Calendar says cutover 30 Jun 2026, `pending`.)
2. Q2 FY25-26 (Oct–Dec 2025) lodgement status — not in the calendar; confirm it
   was lodged (due would have been 28 Feb 2026).
3. R&D FY25-26 claim (~$200K, Path C) — filable from 1 Jul 2026, due 30 Apr 2027.
   Evidence pack: `thoughts/shared/rd-pack-fy26/`.

---

## 1. The near-term deadline ladder (glance every week)

Source of truth: **`wiki/finance/compliance-calendar.md`** (all fixed dates +
T-30/T-7/T-1 Telegram alerts via `scripts/compliance-alerts.mjs`). The weekly
check-in doesn't duplicate it — it *reads* it. The nearest obligations from today:

| Due | Obligation | Entity | Status |
|---|---|---|---|
| **2026-07-28** | **BAS Q4 FY25-26 (Apr-Jun 2026)** — last sole-trader BAS | sole-trader | pending |
| 2026-10-28 | BAS Q1 FY26-27 (Jul-Sep 2026) — first Pty Ltd BAS | pty-ltd | pending |
| 2026-10-31 | ATO annual return FY25-26 (sole trader) | sole-trader | pending |
| 2026-12-31 | ACNC Annual Information Statement — A Kind Tractor Ltd | charity | pending |
| 2027-02-28 | BAS Q2 FY26-27 · ATO annual FY25-26 (Pty stub) | pty-ltd | pending |
| 2027-04-24 | ASIC annual review — ACT Pty Ltd (first) | pty-ltd | pending |
| 2027-04-30 | **R&D Tax Incentive claim FY25-26 (~$200K refund)** | pty-ltd | pending |

**Each week, ask one question:** *what is the nearest `pending` obligation, and
did this pass move it forward?* Right now that's Q4 FY26 BAS. When it's lodged,
mark it `filed` in `compliance-calendar.md` and the ladder rolls to Q1 FY27.

---

## 2. The weekly ritual — fixed running order

Work in this order every time. Value order, not comfort order: refresh first so
you're on live data, then receipts (cheap, keeps R&D + GST credits intact), then
the card (recovers double-counted money), then the deadline glance, then log.

### Step 1 — Refresh the mirror (2 min)
```bash
node scripts/sync-xero-to-supabase.mjs        # mirror Xero → Supabase
node scripts/sync-xero-tokens.mjs --dry-run    # confirm auth is live (3 token stores drift)
```
> The mirror lags the last Xero click until synced. `is_reconciled` in the mirror
> is not authoritative — only a per-line single-GET is truth (June-2026 finding).

### Step 2 — Receipts hygiene (10 min) → `bas-cycle`
Runbook: **`.claude/skills/bas-cycle/workflows/weekly-hygiene.md`**.
```bash
node scripts/ocr-dext-processing.mjs --apply           # OCR new Dext rows
node scripts/match-receipts-to-xero.mjs --apply        # auto-match new receipts
node scripts/sync-bill-attachments-to-txns.mjs --apply # copy bill receipts → bank txns
node scripts/bas-completeness.mjs Q4                    # coverage trend for the LIVE quarter
```
Target: coverage % should climb or hold every week. If it declines, stop and
investigate — something regressed. Per-row receipt/project fixes happen on
`/finance/workbench` (Receipt gaps card), which stamps `manual_workbench` so the
nightly auto-taggers don't overwrite the call.

### Step 3 — Card reconciliation triage (15 min) → `reconcile-cycle`
Runbook: **`.claude/skills/reconcile-cycle/workflows/weekly-triage.md`**.
```bash
node scripts/recon-status.mjs                                  # always-current overview
node scripts/reconcile-sidecar.mjs --scope fy26 --verify --limit 100  # per-line + single-GET truth
```
Then in the **`/finance/reconcile` cockpit** (https://command.act.place/finance/reconcile):
work **Duplicates first** (they double-count spend) → **Matches** → **Creates**.
Do the reconcile clicks **in Xero** off the sidecar sheet — the Xero API cannot
set `IsReconciled` (UI-only, permanent). **Never bulk-accept green Match
suggestions** (Xero matches on amount not date — the Mar↔May trap).

### Step 4 — Compliance glance (2 min)
Open `compliance-calendar.md` (or `/finance/command` AT RISK pane). Confirm the
nearest `pending` obligation and whether this pass advanced it. Anything filed →
set `status: filed` + `last_filed_at`.

### Step 5 — Read the money (3 min)
The strategic glance, not an operation: **Notion ACT Money Framework** (📡 Today's
Pulse, refreshed daily 8:13am) or the Telegram 8am briefing. Are cash, runway, and
pile-mix where you expect? This is where "strong understanding" accumulates —
you're building the mental model, not just clearing a queue.

### Step 6 — Close the loop: log + learn (5 min)
- Append a dated entry to the **weekly log** (§4 below).
- New confirmed card duplicate → `reconcile-cycle/references/confirmed-duplicates.md`.
- New messy bank descriptor you decoded → `reconcile-cycle/references/vendor-aliases.md`.
- New vendor receipt quirk → `bas-cycle/references/vendor-patterns.md`.
- The learning loop is what makes next week's pass *shorter*. Skip it and the
  cadence stops compounding.

---

## 3. Money guards (read before quoting any dollar figure)

Both operators carry these; they apply to every weekly pass:

1. **Two-account rule.** ACT business money lives only in **NAB Visa ACT #8815**
   (card) + **NJ Marchesi T/as ACT Everyday** (bank). Exclude `NM Personal` and
   `NJ Marchesi T/as ACT Maximiser` from every total.
2. **Exclude DELETED/VOIDED** rows (NULL-safe `IS DISTINCT FROM 'DELETED'`) — a
   voided row is neither a supply nor an acquisition.
3. **Sum in SQL, not supabase-js.** A quarter is >1000 rows; supabase-js silently
   truncates at the PostgREST 1000-row cap. Use `execute_sql` / `psql` `SUM()`.
4. **Surcharge ≠ duplicate.** Bank ≥ bill by ≤$15 and ≤6% = one purchase with a
   card fee, not a second purchase.
5. **Verify before lodging.** Reconcile any GST / spend figure against the
   canonical accrual P&L (`project_monthly_financials`). A silent wrong number is
   the expensive finance failure.

---

## 4. The weekly log (where each pass is recorded)

**Whole-pass summary** goes here (this file, append below). **Deep card detail**
stays in `thoughts/shared/reviews/reconcile-weekly-log.md` (the reconcile-cycle
learning loop). Keep the summary to 6 lines so the habit survives.

### Entry template
```
## Week of YYYY-MM-DD
- Nearest deadline + did this pass move it: (e.g. Q4 FY26 BAS, T-20 → coverage 80→84%)
- Receipts: coverage % now / new gaps chased:
- Card: clicks done / backlog remaining / $ duplicates recovered:
- Mirror lies or false-matches caught this week:
- One thing learned or filed (ref / issue #):
- Human minutes spent:
```

<!-- Append new weekly entries below this line, most recent first -->

---

## 5. Escalation — when the weekly pass isn't enough

The weekly cadence is the floor. It rolls up into larger rhythms:

- **2 weeks before a quarter ends** → run the `bas-cycle` pre-close sweep
  (`workflows/quarterly-checklist.md` Phase 2): full completeness report, gmail
  deep-search, ambiguous-match resolution.
- **Quarter end** → close + prepare-for-accountant (Phases 3–4): bank-transfer
  pairing, `prepare-bas.mjs Q{N} --save`, accountant brief, hand to Standard
  Ledger.
- **After a BAS is lodged** → `bas-retrospective.mjs Q{N}-FY{YY}` (Phase 5). The
  quarter's learnings feed back so the next one closes cleaner.

**Stop and ask for help if:** coverage trend declines instead of improving · a
vendor shows 10+ unreceipted txns with no matching bill anywhere · Xero sync
fails repeatedly · a BAS figure won't reconcile against the accrual P&L ·
Standard Ledger flags a discrepancy.

---

## 6. Ready for next stage — what this cadence is building toward

The weekly ritual isn't housekeeping for its own sake. It's the contemporaneous
record that unlocks the next stage:

- **EOFY FY26 close** (now → ~Aug 2026): clean books = a clean final sole-trader
  BAS and a clean handover to Standard Ledger for the cross-entity journals.
- **R&D Tax Incentive FY25-26 claim** (~$200K, assembled Sept–Nov 2026, lodged by
  30 Apr 2027): every receipt captured and every cost correctly project-tagged
  *now* is refund preserved later — **every missing receipt on an R&D project
  reduces the 43.5% offset.** The weekly receipts pass IS the R&D evidence pass.
- **Pty Ltd bookkeeping lifecycle** (first BAS Q1 FY26-27, due 28 Oct 2026): the
  same weekly cadence carries straight over to the new entity — same ritual, new
  org in Xero.

Strategy detail for the next stage: `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md`,
`wiki/finance/act-money-thesis-discussion.md`, `wiki/finance/rdti-claim-strategy.md`.

---

## Surfaces & operators (the map)

**Four surfaces:** Notion reads · command-center operates · scripts automate ·
Telegram pushes (`.claude/references/finance-surfaces.md`).

**Operators driven by this cadence:**
- `bas-cycle` — receipts, GST, quarterly BAS, learning loop.
- `reconcile-cycle` — NAB Visa card-line matching + dedup.
- `compliance-calendar.md` + `compliance-alerts.mjs` — the deadline ladder + alerts.

Full team map: `wiki/concepts/finance-skill-suite.md`.
