# ACT Ecosystem — Claude Rules

> Global rules live in `~/.claude/rules/` (verification, workflow, memory-system, context-efficiency, opus-4-7-prompting). This file is project-specific only — no duplicates.

## ALMA Language Rule

Always spell out ALMA on first use:

Accountable Listening and Meaningful Action (ALMA)

Do not describe ALMA as:
- the soul
- an AI agent
- a ranking engine
- a measurement dashboard
- a replacement for human or community authority

Describe ALMA as:
ACT's governed sensemaking process for moving from listening to meaningful action with consent, authority, provenance, and review.

## Database & Environment

- **Verify which Supabase instance is connected** before debugging. Run `mcp__supabase__get_project_url` and confirm it matches the expected project ref.
- **Use the WRITE Supabase MCP for mutations**, not the read-only one.
- **Trailing newlines in env vars** cause silent 400 auth failures from Supabase.
- **Default 1,000-row limit** on Supabase queries — use `.range()` for bulk.
- **Clear `.next` cache** when stale dev data symptoms appear.

## Data Model

- **Services vs Projects vs Organizations** are distinct — confirm intent before writing data.
- **Always scope by `org_id`** in multi-tenant code. Cross-org leak in Civic World Model required full rebuild.
- **Confirm schema first** on data-heavy tasks (`/db-check` or `information_schema.columns`).

## Mono-Repo Structure (pnpm workspace)

```
apps/
  command-center/     # Main dashboard (Next.js, port 3002)
  website/            # Public website (Next.js)
packages/
  act-ui/             # Shared UI components
scripts/              # 110+ operational scripts
scripts/lib/          # 26 shared script modules
config/               # Shared configuration JSON
supabase/             # Database migrations
archive/              # READ-ONLY reference code, NEVER add features here
```

## Where to Build

| Feature | Location |
|---------|----------|
| Dashboard UI | `apps/command-center/` |
| Public site | `apps/website/` |
| API endpoints | `apps/command-center/src/app/api/` |
| Standalone scripts | `scripts/` |
| Shared libraries | `scripts/lib/` |

**NEVER touch** `archive/act-dashboard/` or `archive/intelligence-platform/`.

## Workspace Commands

```bash
pnpm --filter @act/command-center dev   # Start dashboard
pnpm --filter @act/website dev          # Start website
./dev start                              # Start via PM2
./dev cron                               # Start cron scripts
./dev all                                # Start everything
```

## Development Workflow

- **Build early.** After editing TypeScript, run `npx tsc --noEmit` in the relevant app dir before moving to next file.
- **Read before edit.** Always read a file before modifying — check existing types, imports, property names.
- **Migrations don't auto-run.** After generating SQL in `supabase/migrations/`, provide explicit apply instructions and verify before writing dependent code.
- **Phase-at-a-time execution** for multi-phase plans — feed one phase at a time, run `npx tsc --noEmit` between phases, commit at each phase boundary.

## Integration Rules

Before implementing ANY external service integration:
1. Check what's already configured (existing SDKs, env vars, API clients)
2. Check API limitations (rate limits, feature gaps, auth requirements)
3. Check existing patterns in this codebase
4. Then propose, with fallback if primary approach has risk

**Notion edit rule**: Notion is mostly an outbound dashboard layer (17 `sync-*-to-notion.mjs` scripts overwrite content on each run). Before editing a Notion page or telling someone they can edit it, consult `wiki/decisions/notion-page-policy.md` to see whether the page is read-only, bidirectional, capture, or free-form. Capture pages (Money Sync, meetings, goals, inbound) are safe to edit. Outbound-only pages lose their edits on the next sync.

### Already Configured

| Service | Package | Key Files |
|---------|---------|-----------|
| Supabase | `@supabase/supabase-js` | `src/lib/supabase.ts` |
| Anthropic | `@anthropic-ai/sdk` | `src/lib/telegram/bot.ts`, `src/lib/agent-tools.ts` |
| OpenAI | `openai` | `src/lib/embeddings.ts`, `src/lib/telegram/voice.ts` |
| Telegram | `grammy` | `src/lib/telegram/bot.ts`, `/api/telegram/webhook/` |
| Google | `googleapis` | Service account + domain delegation (Gmail/Calendar) |
| Xero | `xero-node` | `scripts/sync-xero-to-supabase.mjs`, `/api/webhooks/xero/` |
| Notion | `@notionhq/client` | `scripts/sync-notion-to-supabase.mjs` |
| GHL | Custom API | `scripts/lib/ghl-api-service.mjs`, `/api/webhooks/ghl/` |
| GitHub | `@octokit/graphql` | Project sync scripts |
| Webflow | Custom API | 2 sites (ACT + JusticeHub) |

### Auth Patterns

- **Google**: Service account + domain-wide delegation (JWT signing, no googleapis for TTS)
- **Xero**: OAuth2 with refresh token rotation
- **Telegram**: Webhook with `x-telegram-bot-api-secret-token` header
- **GHL/Xero webhooks**: Signature validation in route handlers
- **Supabase**: Service role key (backend), anon key (frontend)

**Google Workspace mailboxes:** `benjamin@`, `nicholas@`, `hi@`, `accounts@` `act.place`.

## Schema-First Rule

Before any DB-touching code:
1. Run `/db-check` or query `information_schema.columns`
2. Never assume column names — known traps: `type` not `invoice_type`, `public_avatar_url` not `avatar_url`
3. Check `v_` views before writing complex joins
4. Check NOT NULL columns without defaults (silent insert failures)
5. Check unique constraints before upserts (wrong `onConflict` = data loss)

### Supabase Query Patterns

- `LEFT JOIN` instead of `NOT IN` for large datasets
- SQL `COPY` over per-row inserts when >100 rows
- Always paginate past 1,000-row default — `.range()` for bulk
- RPC timeouts → fall back to `psql`
- Use `psql` for DDL (migrations, MV refresh, indexes) — `exec_sql` RPC doesn't support DDL
- Sequential `execSync`, not `Promise.all`, for shell-spawned DB commands

## Error Handling

- **401/auth errors:** exponential backoff, max 3 retries. Never infinite-retry on auth.
- **Silent failures are bugs.** All inserts/upserts must compare attempted vs actual count and log discrepancies.

## Testing & Deployment

- **Don't tell user to test until fix is deployed.** TypeScript clean → build passes → deployed → env vars set → THEN report ready.
- For Vercel: check `vercel ls` or deployment URL before declaring success.

## Data Display

- **Query ALL matching records** for maps/tables — never limit to one page unless user asks. Default 1,000 limit applies.
- **Visualization relationships must be meaningful** — don't link on shallow shared attributes.

## Provenance for Generated Reports

Financial summaries, grant analyses, project health reports, R&D evidence:
1. Create the report at appropriate location
2. Create `<report-path>.provenance.md` sidecar documenting sources, what's verified vs inferred, gaps, reproducibility
3. Use template at `thoughts/shared/templates/provenance-template.md`

Critical for: R&D tax evidence (43.5% refund), grant apps (funders verify), board reporting.

## Plan Artifacts

When creating plans (only when asked), use template at `thoughts/shared/templates/plan-template.md`. Include task ledger, decision log, verification log, structured changelog. Plans go in `thoughts/shared/plans/<slug>.md`.

## Finance — the 4-Surface Model (2026-05-08)

Every finance use case maps to exactly one of four surfaces. No use case is served by two surfaces.

| Surface | What it's for | Front door |
|---|---|---|
| **Notion** | Read · plan · capture · decide. Daily glance, weekly review, year plan, free-form capture, charts that tell trend stories. | `notion.so/357ebcf981cf8101bc12dd5eab9ebec5` (ACT Money Framework) |
| **Command-center `/finance/*`** | Operate. Tag transactions, fix receipts, run reconciliation, drill into a project, view R&D pack. | `https://command.act.place/finance` |
| **Scripts `scripts/*.mjs`** | Automate + admin. Cron syncs (Mon morning chain, daily pulse), on-demand ops (write off invoice, sync Xero tokens, grade R&D pack). | `node scripts/<x>.mjs` |
| **Telegram bot** | Push. Daily 8am briefing, afternoon alert, Friday digest, on-demand `/money-status` and `/standup`. | grammY webhook |

When in doubt: **Notion for reading · command-center for operating · scripts for automating · Telegram for pushing.**

### Use case → canonical surface

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

### Retired / archived (2026-05-08)

- 17 stale Notion operational dashboard keys removed from `config/notion-database-ids.json` (commandCenter, sprintTracking, githubIssues, etc.). Backup at `config/notion-database-ids.json.bak-2026-05-08`.
- 14 React routes under `/finance/*` archived to `apps/command-center/src/app/finance/_archived/` (tagger, tagger-bulk, pipeline-viz, pipeline-kanban, board, accountant, revenue, revenue-planning, project-plan, invoices, self-reliance, vendor-rules-suggest, review, projects).
- ~85 stale finance scripts archived to `scripts/_archive/2026-05-finance-cleanup/` (cabin disposal one-offs, prototype `act-money.mjs`, superseded `finance-engine.mjs`, etc.). Restore from git history if needed.

## Skill Routing (active skills only)

When the user's request matches an active skill, invoke it as the FIRST action.

- **ANY ACT-facing writing** (pitches, grants, web copy, journal spreads, board reports, donor letters, captions, artefact prose) → `act-brand-alignment` and load `references/writing-voice.md`. Curtis method: name the room, name the body, load the abstract noun, stop the line. Reject AI tells (delve, crucial, pivotal, tapestry, em dashes, "not just X but Y").
- **Database query/schema check** → `db-check` or `preflight`
- **Bug fix loop** → `fix` (orchestrates debug → implement → test → commit)
- **Receipt hunt / BAS / finance** → `bas-cycle`, `find-receipt`, `tag-transactions`, `scan-subscriptions`
- **Wiki / knowledge base** → `wiki`
- **Deploy** → `deploy`
- **Verify a fix** → `verify-fix` before claiming done
- **Scheduled background work** → `/schedule` (built-in)

For tasks that don't match any active skill, just do the work directly.

## Skills Pruned 2026-05-01

The gstack bundle and ~25 standalone meta-skills were archived to `~/.claude/skills/_archive/2026-05-01-pruning/`. Restore on demand — see `RESTORE.md` in that dir. If a skill you reach for is missing, surface it: "the X skill is archived, want me to restore it?"

## Action Tiers (load every session, especially in auto-mode)

Full classification: `~/.claude/rules/workflow.md` § "Action tiers".

Quick reference:
- **Tier 1 (local-only)** — Read/Edit/local scripts/local commits/branch creation. Auto-mode: just do.
- **Tier 2 (shared-state, reversible)** — `git push`, archive moves, Notion edits to outbound pages, PM2 changes, GHL field updates. Always post "about to do X — proceed?" first, even in auto-mode.
- **Tier 3 (shared-state, hard-to-reverse)** — Open/close/merge PR, push to main, force-push, send email/Slack/Telegram, Xero writes, Supabase migrations. **Require the explicit verb in the user's message** ("merge", "send", "void"). No verb → no action.
- **Tier 4 (forbidden in auto-mode)** — Drop tables, send money, force-push to main, delete user data. Refuse + ask, ≥2 confirmations.

At session start in this repo, run `git log --since="2 hours ago" --all --oneline` and flag if another session was active. Prevents cross-session races (encountered 2026-05-08 with PR #52).

"Archive X" = `git mv` to a dated `_archive/` dir + `RESTORE.md`. Never `git rm` when "archive" was the request.

## Multi-session discipline (2026-05-17 — load every session)

Parallel Claude Code sessions WILL stomp each other unless these rules hold. The 2026-05-17 ecosystem-digest session hit 3 cross-session collisions in one sitting: stashed untracked files, branch swaps mid-edit, commits landing on wrong branches. This section codifies what stops it happening again.

### Session start (mandatory)

1. `git fetch --prune origin` — sync remote refs, drop deleted remotes.
2. `git rev-parse --abbrev-ref HEAD` — note the branch you're starting on.
3. `git log --since="2 hours ago" --all --oneline` — flag unknown commits to the user.
4. `git status -s` — flag any in-progress work from a prior session.

If steps 3 or 4 surface anything unexpected, **STOP** and surface to the user before any Edit/Write. Cross-session work is the leading cause of lost edits here.

### Active guardrails (installed)

- **Branch-stamp hook** in `.claude/settings.json` (`SessionStart` + `PreToolUse` Edit|Write): warns when HEAD has moved since session start. Stamp file `.claude/.session-branch-stamp` is gitignored. Snippet to install: `.claude/settings.json.proposed-2026-05-17`.
- **Commit-msg hook** in `.githooks/commit-msg`: nudges (does not block) `Plan: <slug>` adoption. Activate per-clone with `git config core.hooksPath .githooks`.
- **Weekly ecosystem digest** runs Mon 7:55am AEST (PM2 entry `ecosystem-digest`). Surfaces what shipped across all ACT repos grouped by `Plan:` trailer + by file-area heatmap. Notion page id: `ecosystemDigest` in `config/notion-database-ids.json`.

### Worktree lifecycle

- Each Claude Code session running concurrently MUST be in its own worktree under `.claude/worktrees/<adjective-name-XXXXXX>/`. NEVER two sessions in the main worktree (`/Users/benknight/Code/act-global-infrastructure`).
- After a worktree's work is merged (or session ends): commit/stash any leftover state, push the branch if useful, then `git worktree remove <path>`.
- Stale worktrees with leftover untracked work get recovered (move drafts to main repo's `thoughts/shared/drafts/`, commit plan/wiki edits to their own branch, push) before removal.

### Stash hygiene

- `git stash push -m "<descriptive label>"` every time. No anonymous stashes.
- Prune stashes older than 2 weeks during periodic sweeps (`git stash drop stash@{N}`).

_(See "Archive X" rule above — applies inside agent worktrees too.)_

## Trust profile — solo-author mode (2026-05-17)

ACT is a solo-author repo. **Ben is the only human contributor.** Other PR authors (`claude/*`, `eod-sweep/*`, `codex/*`, `feat/*-YYYY-MM-DD`) are agent worktrees acting on Ben's behalf. Treat their work the same as his own.

### Default actions — no per-action verb needed

- **Merge own PRs** — when `gh pr view <N> --json mergeable,statusCheckRollup` shows mergeable AND no failing required checks AND title doesn't contain `WIP` / `DRAFT` / `DO NOT MERGE`, run `gh pr merge <N> --merge --delete-branch` without asking. Vercel preview failures on PRs that don't touch `apps/` are NOT blocking.
- **Commit recovered work** — when cleaning stale worktrees / stashes, default to committing preserved files to the current cleanup branch with a `recovered(<area>):` commit message. Never delete unreviewed user work.
- **Rename agent-named branches** — for `claude/<adjective-noun-XXXXXX>` branches with preserved work, rename to `wip/<topic>-<YYYY-MM-DD>` before pushing. `<topic>` = directory of the first changed file (e.g. `wip/rd-plans-2026-05-17`).
- **Edit `.claude/settings.json`** — allowed once the `settings.local.json` permission rule is in place (see `.claude/settings.local.json.proposed-2026-05-17` for the rules to paste).
- **Reload PM2 + `pm2 save`** — when a script or config change requires it, just do it.

### Still requires explicit verb in user's message

- `git push --force` to any branch
- `git rm` (not `git mv`) of tracked files
- Anything in `~/.claude/rules/workflow.md` Tier 4 (drop tables, send money, force-push to main, delete user data)
- Send external messages — email / Slack / Telegram / Notion comments addressed to people other than Ben
- Production database migrations (apply_migration)
- Anything that moves money in Xero (invoice writes, payments, voids)
- GHL contact merge / delete / bulk-update

### Permission baseline (paired with this trust profile)

The trust profile assumes `.claude/settings.local.json` has the allow rules from `.claude/settings.local.json.proposed-2026-05-17`. Without those, the auto-mode classifier still blocks `.claude/settings.json` edits regardless of what this section says.
