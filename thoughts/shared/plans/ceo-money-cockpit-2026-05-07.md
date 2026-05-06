# Plan: CEO Money Cockpit — 2 widgets + section anchors

> Slug: `ceo-money-cockpit-2026-05-07`
> Created: 2026-05-07
> Status: in-progress
> Owner: Ben

## Objective

Make `/finance/overview` the single page where Ben sees all 6 of: incoming pipeline, history by project, burn rate + upcoming spend, founder pay status, R&D estimate, receipt automation status. Most of this already exists — close the 2 real gaps (founder pay, receipt automation widget) and add section anchors so the cockpit is one click from any answer.

## What's already there (verified by file read)

- `/finance/overview` (1019 lines) has Section 1 "Right Now", Section 2 "What's Coming — Pipeline", Section 3 "Grants → Revenue", Section 4 "Overhead Allocation", Section 5 "What If".
- `/finance/board` (687 lines) has Monthly Burn, Subscription Burn, Runway, R&D Offset, Funding Cliffs.
- `/finance/projects` has per-project P&L (incoming history).
- `/finance/rd-evidence` tracks the 43.5% refund.
- `/api/finance/runway`, `pipeline-intelligence`, `cashflow-explained`, `rd-dashboard`, `rd-tracking`, `grant-matches`, `receipts-triage`, `data-quality`, `revenue-reality`, `revenue-scenarios`, `projects`, `health` — all return live data.

## What's missing (the actual gap)

1. **Founder pay surface.** `scripts/sync-money-framework-to-notion.mjs` already builds Panel 4 — Founder take YTD (Knight Photography invoiced ACT for Ben, sole-trader net for Nic), but only into Notion. No cockpit equivalent on the website.
2. **Receipt automation glance.** 95.3% coverage exists but is split across `/api/finance/data-quality` and `/api/finance/receipts-triage` — no single small widget shows automation health.
3. **Navigation hierarchy.** 6 needs, 20 finance pages, no section anchors at the top of overview.

## Build (this session)

1. **API**: `apps/command-center/src/app/api/finance/founder-pay/route.ts` — port the calculation from `sync-money-framework-to-notion.mjs::buildFounderTake`. Returns Knight Photography total, FY26 net for Nic, FY27+ targets ($10K/mo PAYG each), and verification flags.
2. **Component**: `apps/command-center/src/components/finance/FounderPayCard.tsx` — two-row card (Nic, Ben) + planned vs actual + caveats line.
3. **Component**: `apps/command-center/src/components/finance/ReceiptAutomationCard.tsx` — 4 numbers: coverage %, auto-aligned 7d, manual queue size, top 3 vendors with gaps. Pulls from existing `/api/finance/data-quality` + `/api/finance/receipts-triage`.
4. **Edit**: `apps/command-center/src/app/finance/overview/page.tsx` — add a sticky anchor strip after the header (6 quick-jump pills), import + render the 2 new cards.

## Calibration close-out

5. Re-run `node scripts/grade-voice.mjs --calibrate` (full Tier 2-3, ~$0.05). Promote rubric to v1.0 if 6/6.

## Multiagent prep (scaffold only, no LLM tokens)

6. Write `scripts/lib/managed-agent-client.mjs` — a thin wrapper class so any future Managed Agents call funnels through one place (allowed_domains, idempotency keys, rate budgets). For now the wrapper is a stub; it just defines the interface.
7. Defer the receipt-hunt orchestrator to next session — Managed Agents access via Console isn't yet provisioned, and a Promise.all-based local prototype would be misleading (different concurrency semantics).

## Out of scope this session

- Actual Managed Agents API integration (needs Console access).
- Adjusting `/finance/board` or `/finance/projects` — already cover their territory.
- New schema or migration.

## Task Ledger

- [x] Founder-pay API route at `apps/command-center/src/app/api/finance/founder-pay/route.ts`
- [x] FounderPayCard component at `apps/command-center/src/components/finance/FounderPayCard.tsx`
- [x] ReceiptAutomationCard component at `apps/command-center/src/components/finance/ReceiptAutomationCard.tsx`
- [x] Overview page edited — anchor strip (Right Now · Founder Pay · Receipts · Pipeline · Burn/Runway · R&D · Projects) + 2 cards placed after Section 1
- [x] TypeScript passes (`npx tsc --noEmit` ran clean from `apps/command-center`)
- [x] Tier 2-3 voice calibration ran — Tier 1 6/6 (production), Tier 2-3 3/6 (needs tuning, see managed-agents plan)
- [x] managed-agent-client.mjs scaffold written at `scripts/lib/managed-agent-client.mjs`
- [x] Managed Agents adoption plan task ledger updated
- [ ] Verify cockpit renders in dev (`pnpm --filter @act/command-center dev` then visit `/finance/overview`) — operator step

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-07 | Augment `/finance/overview` not a new page | Already 80% there; new page would duplicate |
| 2026-05-07 | Components in `components/finance/` not inline | Keep overview readable; reuse downstream |
| 2026-05-07 | Defer real receipt-hunt multiagent | Needs Console access for Managed Agents; local Promise.all is misleading |

## Provenance

- Sources: `apps/command-center/src/app/finance/overview/page.tsx`, `scripts/sync-money-framework-to-notion.mjs:444,607`, finance API route grep.
- Generated by: hybrid (file reads this session).
