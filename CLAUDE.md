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
