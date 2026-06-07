# Restore notes — 2026-05-16 finance route archive

Two routes archived during the post-GHL-alignment finance audit. See `thoughts/shared/handoffs/2026-05-16-money-audit/decisions.md` for reasoning.

## What's here

| Archived | Why | Restore command |
|---|---|---|
| `revenue-planning/` | 3 months untouched; single API consumer (`revenue-scenarios`); `/finance/pipeline` absorbs forecasting | `git mv apps/command-center/src/app/finance/_archived/2026-05-16/revenue-planning apps/command-center/src/app/finance/revenue-planning` |
| `review/` | Workbench supersedes the unified action queue; 8w stale | `git mv apps/command-center/src/app/finance/_archived/2026-05-16/review apps/command-center/src/app/finance/review` |

After restoring, re-add the line to `apps/command-center/src/lib/nav-data.ts` finance section.

## Companion archives

- API counterparts at `apps/command-center/src/app/api/finance/_archived/2026-05-16/` (revenue-scenarios, review)
- Scripts at `scripts/_archive/2026-05-16-finance-cleanup/`
