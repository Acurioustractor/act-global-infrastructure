# ACT Ecosystem - Claude Rules

## Mono-Repo Structure

This is a pnpm workspace mono-repo containing the entire ACT ecosystem.

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
archive/
  act-dashboard/      # LEGACY HTML dashboards (DO NOT USE)
  intelligence-platform/  # Reference only (absorbed into command-center)
```

## Where to Build New Features

| Feature Type | Location |
|-------------|----------|
| Dashboard UI | `apps/command-center/` (Next.js React) |
| Public website | `apps/website/` (Next.js) |
| API endpoints | `apps/command-center/src/app/api/` |
| Standalone scripts | `scripts/` |
| Shared libraries | `scripts/lib/` |

## NEVER Touch

- `archive/act-dashboard/` - Legacy HTML dashboards, archived
- `archive/intelligence-platform/` - Reference code only, being absorbed into command-center

## API Development

When building new API endpoints:
1. Add to `apps/command-center/src/app/api/` (Next.js API routes)
2. Use `@/lib/supabase` for server-side Supabase client in API routes

## Strict Rules

- **NEVER add features to `archive/`** - these are read-only reference code
- **ALL new UI work** goes in `apps/command-center/` or `apps/website/`
- **ALL new API routes** go in `apps/command-center/src/app/api/`
- The React app calls its own API routes (no external API server dependency)

## Workspace Commands

```bash
pnpm --filter @act/command-center dev   # Start dashboard
pnpm --filter @act/website dev          # Start website
./dev start                              # Start via PM2
./dev cron                               # Start cron scripts
./dev all                                # Start everything
```

## Development Workflow

- **Build early, build often.** After editing TypeScript files, run `npx tsc --noEmit` in the relevant app directory before moving to the next file. Don't batch all changes then discover type errors at the end.
- **Read before edit.** Always read a file before modifying it. Check existing types, imports, and property names — don't guess.
- **Migrations need manual steps.** Database migrations in `supabase/migrations/` do NOT auto-run. After generating SQL, provide clear instructions for applying it. Verify the migration succeeded before writing dependent code.

## Integration Rules (CRITICAL)

Before implementing ANY external service integration, **STOP and audit first**:

1. **Check what's already configured** — search for existing SDKs, env vars, and API clients
2. **Check API limitations** — rate limits, feature gaps, auth requirements
3. **Check existing patterns** — how similar integrations are done in this codebase
4. **Only then propose an approach** — with a fallback if the primary approach has risks

### Already Configured Services

| Service | Package | Key Files |
|---------|---------|-----------|
| Supabase | `@supabase/supabase-js` | `src/lib/supabase.ts`, all API routes |
| Anthropic | `@anthropic-ai/sdk` | `src/lib/telegram/bot.ts`, `src/lib/agent-tools.ts` |
| OpenAI | `openai` | `src/lib/embeddings.ts`, `src/lib/telegram/voice.ts` |
| Telegram | `grammy` | `src/lib/telegram/bot.ts`, `/api/telegram/webhook/` |
| Google | `googleapis` | Service account + domain delegation for Gmail/Calendar |
| Xero | `xero-node` | `scripts/sync-xero-to-supabase.mjs`, `/api/webhooks/xero/` |
| Notion | `@notionhq/client` | `scripts/sync-notion-to-supabase.mjs` |
| GHL | Custom API | `scripts/lib/ghl-api-service.mjs`, `/api/webhooks/ghl/` |
| GitHub | `@octokit/graphql` | Project sync scripts |
| Webflow | Custom API | 2 sites (ACT + JusticeHub) |

### Auth Patterns

- **Google**: Service account with domain-wide delegation (JWT signing, no googleapis for TTS)
- **Xero**: OAuth2 with refresh token rotation
- **Telegram**: Webhook with `x-telegram-bot-api-secret-token` header
- **GHL/Xero webhooks**: Signature validation in route handlers
- **Supabase**: Service role key for backend, anon key for frontend

### Google Workspace Accounts

4 mailboxes: `benjamin@act.place`, `nicholas@act.place`, `hi@act.place`, `accounts@act.place`

## Database (Schema-First Rule)

Before writing ANY code that touches the database:
1. **Run `/db-check` first** — or manually query `information_schema.columns` for every table you'll touch
2. **Never assume column names** from context, grep results, or memory — verify them. Known traps: `type` not `invoice_type`, `public_avatar_url` not `avatar_url`
3. **Check for existing views** (`v_` prefix) before writing complex joins — there may already be a view for what you need
4. **Check NOT NULL columns without defaults** — these cause silent insert failures
5. **Check unique constraints before upserts** — wrong `onConflict` columns cause data loss or duplicates

### Supabase Query Patterns

- Use `LEFT JOIN` instead of `NOT IN` for large datasets
- Batch inserts via SQL `COPY` instead of per-row inserts when > 100 rows
- **Always paginate past the 1,000-row default limit** — use `.range()` for bulk operations
- Handle RPC timeouts gracefully — fall back to direct `psql` if needed

## Debugging Principles

- **Root cause first.** When something doesn't render or returns unexpected results, investigate the actual root cause before applying surface-level fixes. Don't blame missing data — verify the query, column names, and data pipeline first.
- **Never apply workarounds** for schema mismatches — fix the actual column name or type.
- **Trace the full path:** query → API → component → render. Don't guess where it breaks.

## Error Handling

- **401/auth errors:** Implement exponential backoff with max 3 retries. Never create infinite retry loops on auth failures.
- **Silent failures are bugs.** All insert/upsert operations must compare attempted vs actual count. Log discrepancies.

## Testing & Deployment

- **Never tell the user to test** until the fix is deployed/running in the target environment
- After making changes, verify: TypeScript compiles clean → build passes → deployment completed → env vars set → THEN report ready to test
- For Vercel deployments, check `vercel ls` or the deployment URL before declaring success

## Model Routing (Token Efficiency)

When using the Task tool with sub-agents:
- Use `model: "haiku"` for exploration, file finding, pattern matching (10-20x cheaper)
- Use `model: "sonnet"` for implementation, refactoring, and code generation
- Reserve Opus for architectural decisions and complex multi-file plans
- Don't duplicate sub-agent work in the main context — trust agent output
- For codebase exploration: use `subagent_type: "scout"` (Sonnet), NOT `"Explore"` (Haiku — inaccurate)
- On Opus needing high accuracy: use Grep/Glob/Read directly instead of agents

## Phase-at-a-Time Execution

For multi-phase plans, feed one phase at a time rather than the full plan upfront:
- Each phase should have specific files + acceptance criteria
- Run `npx tsc --noEmit` between phases
- **Commit working code at each phase boundary** — don't wait until all phases are done
- Report phase status before proceeding to next

## Supabase MCP (CRITICAL)

- **ALWAYS verify which Supabase project MCP is connected to** before running any queries. Run `mcp__supabase__get_project_url` and confirm the URL matches the expected project.
- **If MCP cannot see tables**, fall back to `psql` directly — do NOT spend time debugging MCP configuration.
- **Use psql for DDL** (migrations, materialized view refreshes, index creation) — the `exec_sql` RPC does not support DDL.
- **Use `execSync` sequentially** (not `Promise.all`) for shell-spawned database commands.
- **Cross-reference project URL with documentation** before any database operation — never connect to or run migrations against the wrong project.

## Implementation Rules

- **Do NOT enter planning mode** unless the user explicitly asks for a plan. Default to implementing immediately.
- **If a plan is needed**, keep it to <20 lines and get user approval before writing more. Never autonomously write multi-page plans.
- **Never write plan files** without being asked. Start building.
- **When user says "open" or "show"**, they want a browser opened or actual result displayed — not more code explanation.

## Database Operations

- **Always verify column names and primary keys** against the actual schema before writing migrations or insert statements — do not assume schema from memory.
- **After applying any migration**, re-query the schema to confirm it took effect.
- **If a migration fails**, read the error, fix the SQL, and retry (up to 3 times) before asking the user.

## Data Display

- **Query ALL matching records** for maps/tables — never limit to a single pagination page unless the user explicitly asks for pagination. Watch for Supabase's default 1,000 row limit.
- **Ensure visualization relationships are meaningful** — don't create links based on shallow shared attributes like "same sector." Think through whether the data relationship produces useful insight.

## Bias Towards Action

- **Default to implementation, not planning.** Unless the user explicitly asks for a plan, start building.
- **If unsure, ask one question** — don't enter a multi-question discovery phase.
- **Show working code quickly** — a rough working version beats a perfect plan.
