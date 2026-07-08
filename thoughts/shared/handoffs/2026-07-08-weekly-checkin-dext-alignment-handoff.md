---
title: Handoff — weekly finance check-in cadence + Dext→Xero AI alignment
date: 2026-07-08
status: open — cadence + strategy shipped (PR #209); execution items need local CLI + UIs
branch: claude/zero-tax-bas-checkin-gypl9l
pr: https://github.com/Acurioustractor/act-global-infrastructure/pull/209
from: claude.ai remote session (Opus 4.8) — read-only status via Xero + Supabase MCP
related:
  - wiki/finance/weekly-finance-checkin.md (the ritual)
  - wiki/finance/dext-xero-ai-alignment.md (the strategy)
  - thoughts/shared/reports/weekly-checkin-2026-07-08.md (this week's worklist)
  - thoughts/shared/proposals/monday-finance-checkin-cron.md (Tier-2, proposed)
---

# Handoff → Claude Code CLI

The remote session could only do **read-only** finance work (Xero + Supabase MCP,
no repo credentials, no UIs). Everything below needs a **local CLI session** with
`.env.local`, Xero/Dext auth, and Ben at the Xero/Dext UIs. Start there.

## State (verified live 2026-07-08)
- **FY26 BAS lodged by Standard Ledger.** Books clean through FY26 (10 residual
  Visa lines/$2.3K). Next deadline: **Q1 FY27 BAS, due 28 Oct 2026** (first Pty BAS).
- **Xero still on the sole-trader org** (Nicholas Marchesi, ABN 21591780066) — Pty
  cutover has NOT switched Xero yet.
- **Dext 99.3% linked** (1,539/1,550). Orphan pile: **275 gmail-`review` + 97
  `captured` + 17 `failed` + 39 dext-`review`** (all unlinked).
- **29 open NAB Visa lines**, all receipted → reconcile clicks pending (Xero UI-only).

## Resume points (in priority order)

### 1. Clear this week's card lines — `reconcile-cycle` (~15 min, Ben in Xero UI)
- **Code the 4 untagged lines first** (`/finance/tagger-v2`): Apple $14.99,
  Hugging Face $13.06, Qantas Group Accom $440 (ACT-EL), Qantas $1,492.66 (ACT-EL).
- Then reconcile all 29 off the sidecar sheet. Worklist:
  `thoughts/shared/reports/weekly-checkin-2026-07-08.md`.
- Refresh mirror first: `node scripts/sync-xero-to-supabase.mjs`.

### 2. Clear the receipt orphan pile — the Dext alignment (bigger; systemic)
Per `wiki/finance/dext-xero-ai-alignment.md`:
- Triage the 275 gmail-`review` + 97 `captured` + 39 dext-`review`: real & not in
  Xero → forward into Dext; junk → mark `junk`.
- **Repoint the Gmail scraper from publisher → gap-detector** (stop it creating the
  orphan pile). This is the code change that makes the fix stick.
- Confirm the 4 Dext/Xero config decisions with Ben (plan tier, auto-publish
  threshold, which mailbox auto-forwards to Dext, retire the Gmail publisher?).

### 3. Wire the Monday nudge (Tier-2 — Ben's go)
Build `scripts/weekly-finance-checkin.mjs` (thin aggregator) + PM2 entry per
`thoughts/shared/proposals/monday-finance-checkin-cron.md`, then `pm2 save`.

### 4. Confirm with Standard Ledger (unblocks the record)
Exact Q4 FY26 lodge date + which two quarters; is the Pty cutover done; start the
R&D FY25-26 claim assembly (~$200K, due 30 Apr 2027; pack `thoughts/shared/rd-pack-fy26/`).

## Tier gates (don't skip)
- Reconcile click = Xero UI-only (API can't set IsReconciled) — never automate.
- Dext/Xero writes, cron install, retiring the publisher = Tier-2/3 → Ben's verb.
- Money math → TDD-first; two-account rule; sum in SQL not supabase-js; verify vs
  `project_monthly_financials`.

## Kickoff prompt (paste into the CLI)
> Read `thoughts/shared/handoffs/2026-07-08-weekly-checkin-dext-alignment-handoff.md`
> on branch `claude/zero-tax-bas-checkin-gypl9l`, then run resume point 1: refresh
> the Xero mirror, code the 4 untagged Visa lines, and produce the reconcile
> worklist for me to click. Then propose resume point 2 (the Dext alignment) before
> making any changes.
