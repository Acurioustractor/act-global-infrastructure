# Finance — the 4-Surface Model (full reference)

> Extracted from `CLAUDE.md` on 2026-05-31 to keep always-on context lean (push→pull, matching the `xero-tax-rd-expert.md` precedent). The core model — **Notion for reading · command-center for operating · scripts for automating · Telegram for pushing** — stays in CLAUDE.md. This file holds the detail: front doors, the full use-case→surface routing table, runbook pointers, and the retired/archived inventory. Read this before routing a specific finance use case to a surface, or before citing the retired/archived finance inventory.
>
> Original date stamp: 2026-05-08.

Every finance use case maps to exactly one of four surfaces. No use case is served by two surfaces.

| Surface | What it's for | Front door |
|---|---|---|
| **Notion** | Read · plan · capture · decide. Daily glance, weekly review, year plan, free-form capture, charts that tell trend stories. | `notion.so/357ebcf981cf8101bc12dd5eab9ebec5` (ACT Money Framework) |
| **Command-center `/finance/*`** | Operate. Tag transactions, fix receipts, run reconciliation, drill into a project, view R&D pack. | `https://command.act.place/finance` |
| **Scripts `scripts/*.mjs`** | Automate + admin. Cron syncs (Mon morning chain, daily pulse), on-demand ops (write off invoice, sync Xero tokens, grade R&D pack). | `node scripts/<x>.mjs` |
| **Telegram bot** | Push. Daily 8am briefing, afternoon alert, Friday digest, on-demand `/money-status` and `/standup`. | grammY webhook |

When in doubt: **Notion for reading · command-center for operating · scripts for automating · Telegram for pushing.**

## Use case → canonical surface

| Use case | Canonical surface |
|---|---|
| "Where's the money RIGHT NOW?" | Notion ACT Money Framework → 📡 Today's Pulse (refreshed daily 8:13am) + Telegram briefing 8am |
| Visual charts of trend (bank, runway, pile mix) | Notion Money Dashboard view (widgets on Money Metrics DB) |
| Year plan (FY26-27) | Notion FY26-27 Money Philosophy + Plan |
| Multi-period rhythm (week / month / half / year / 5y) | Notion Planning Rhythm |
| Capture a question / decision / idea | Notion Money Sync (Q&A) |
| Decisions log | Notion Decisions Log database |
| Action items | Notion Action Items database |
| Tag a Xero transaction | Command-center `/finance/tagger-v2` |
| Fix a receipt | Command-center `/finance/receipts-triage` |
| Per-project budget | Command-center `/finance/projects/[code]` |
| Reconciliation status | Command-center `/finance/reconciliation` |
| CEO money cockpit | Command-center `/finance/overview` |
| Money alignment (in/out) | Command-center `/finance/money-alignment` |
| Pipeline view | Notion Opportunities DB (filter by Pile) |
| R&D pack (FY26 evidence) | Filesystem `thoughts/shared/rd-pack-fy26/` + `scripts/grade-pack.mjs` |
| BAS prep (quarterly) | `scripts/prepare-bas.mjs` + Notion Standard Ledger Q&A |
| Funder research | Skill `/brief-funder` + Notion Foundations DB |
| Funder outreach drafting | Skill `/draft-funder` (with brand voice grade) |
| Cash scenarios (Base/Upside/Downside) | Notion Cash Scenarios |
| Cash forecast (13-week) | Notion Cash Forecast |
| Operational standup | Telegram `/standup` |

Full runbook: `thoughts/shared/handoffs/2026-05-08-money-brain-runbook.md`. Architecture review: `thoughts/shared/reviews/notion-finance-dashboard-2026-05-08.md`. Consolidation plan: `~/.claude/plans/rewive-all-the-finciance-agile-pearl.md`.

## Retired / archived (2026-05-08)

- 17 stale Notion operational dashboard keys removed from `config/notion-database-ids.json` (commandCenter, sprintTracking, githubIssues, etc.). Backup at `config/notion-database-ids.json.bak-2026-05-08`.
- 14 React routes under `/finance/*` archived to `apps/command-center/src/app/finance/_archived/` (tagger, tagger-bulk, pipeline-viz, pipeline-kanban, board, accountant, revenue, revenue-planning, project-plan, invoices, self-reliance, vendor-rules-suggest, review, projects).
- ~85 stale finance scripts archived to `scripts/_archive/2026-05-finance-cleanup/` (cabin disposal one-offs, prototype `act-money.mjs`, superseded `finance-engine.mjs`, etc.). Restore from git history if needed.
