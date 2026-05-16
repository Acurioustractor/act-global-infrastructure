# Money Brain Phase 2 — Resume Handoff

**Updated:** 2026-05-16T07:55:00Z
**Goal:** Build COO+CIO+CFO+risk Money Brain on top of /finance/command
**Branches:**
- Phase 1 shipped to `main` via PR #63 (Pass A→I: /finance/command page + view + backfills + digest cron)
- Phase 2 Pass A shipped to `feat/compliance-calendar-2026-05-16` (commit `c3e0e03`, **PR not open yet** — Tier 3 awaits Ben's verb)

## Ledger

### Now
[->] Pass 2A complete. Ready for Pass 2B (pilot lifecycle) — fresh branch off main, design fully locked in plan file.

### Last session — 12 grill questions + 6 build tasks
- Q1-Q11: design decisions captured in `~/.claude/plans/coo-cio-cfo-money-brain-phase2.md`
- Q12: build order = Compliance → Pilot → Accountability
- Pass 2A built end-to-end: wiki canonical file → compute script → API → AT RISK pane → Telegram cron → Notion sync (graceful no-op without env)
- Live state: 2 🟡 medium obligations today (cutover T-45, BAS Q4 T-73), 1 ✓ filed (BAS Q3)
- Build clean (TS exit 0). Prerender errors on `/finance/invoices` + `/` are pre-existing, unrelated to changes; Vercel handles fine

### Next — Pass 2B (Pilot Lifecycle, single session)

**Branch:** `git checkout main && git pull --ff-only && git checkout -b feat/pilot-lifecycle-2026-05-17`

**Tasks (in build order):**

1. **B1 · Schema migration** — `supabase/migrations/20260517_idea_lifecycle.sql`:
   - `ALTER TABLE idea_board ADD COLUMN lifecycle_stage text DEFAULT 'idea' CHECK (lifecycle_stage IN ('idea','scope','fundraise','start','killed'))`
   - `ALTER TABLE idea_board ADD COLUMN owner text DEFAULT 'ben'`
   - `ALTER TABLE idea_board ADD COLUMN kill_reason text`
   - `CREATE TABLE idea_snoozes (id uuid PK, idea_id uuid FK references idea_board, snoozed_at timestamptz, snoozed_until date, by_owner text)`
   - Backfill 73 existing rows: `open → idea`, `exploring → scope`, `doing → start`, `done → start`. All `owner = 'ben'`.
   - Apply via `mcp__supabase__apply_migration`.

2. **B2 · Telegram bot agent tools** in `apps/command-center/src/lib/telegram/bot.ts` (and `src/lib/agent-tools.ts`):
   - `add_idea(text, category?, energy?, value_estimate?)` — sets `owner` from Telegram user ID (map via env or hardcode `ben`), stage `'idea'`
   - `transition_idea_stage(id, stage, kill_reason?)` — validates state-machine moves; on `start` triggers AI-suggest flow
   - `snooze_idea(id, days)` — INSERT into `idea_snoozes`; refuses if snooze_count >= 3
   - Inline keyboard builder for reminders: `→ fundraise` `→ start` `❌ kill` `💤 snooze 14d`

3. **B3 · AI-suggest project_code helper** — `scripts/lib/projects/suggest-code.mjs`:
   - Input: idea text + existing `projects.code` list
   - Anthropic call (Claude Haiku — cheap for 2-letter naming)
   - Returns `ACT-XX` suffix
   - On confirm: `INSERT INTO projects (code, name, tier, status)` (tier='satellite', status='active') + `UPDATE idea_board SET project_code = ?`

4. **B4 · Reminder cron** — `scripts/idea-board-reminders.mjs`:
   - Stage-aware tiered staleness: `idea` 90d · `scope` 30d · `fundraise` 14d · `start` never · `killed` never
   - Group by `owner`, max 5 items per DM per night
   - Inline buttons per item (via grammY `InlineKeyboardMarkup`)
   - Add PM2 entry: daily 8:00am AEST (`'0 8 * * *'`)

5. **B5 · `/ideas` page UX update** — `apps/command-center/src/app/ideas/page.tsx` (1057 LOC existing kanban):
   - Replace status columns (open/exploring/doing/done) with lifecycle stages (idea/scope/fundraise/start/killed)
   - Add owner badge + snooze count badge (`💤 ×2`)
   - Deep-link target: `/ideas?focus=<idea_id>` opens specific card

6. **B6 · Wire pilot risks into AT RISK TODAY pane** — `/api/finance/command/route.ts`:
   - Extend the AT RISK aggregation (currently compliance + cash/runway + drift) to include stale ideas
   - Severity: 🟠 if scope 30d+ or fundraise 14d+; 🟡 if snooze-burned (3 snoozes total)

### After Pass 2B: Pass 2C — Accountability surfaces
- `compliance_ack` + `idea_ack` lightweight tables
- Debt counter on AT RISK pane (snapshot, not cumulative — settled in grill Q11)
- Extend `scripts/weekly-money-digest.mjs` with compliance/idea/snooze/ack-gap sections
- Friday 3pm Telegram delivery (existing cron, just add sections)

## Locked design decisions

Full plan + 12 grilled decisions: `~/.claude/plans/coo-cio-cfo-money-brain-phase2.md`

Quick reference for Pass 2B:
- Pilot stages: **idea → scope → fundraise → start + killed**
- Reminder thresholds: **idea 90d · scope 30d · fundraise 14d · start never · killed never**
- Owner column on idea_board, default `ben`
- Capture path: **Telegram-first** via `/idea <text>` bot command
- Reminder action loop: **inline Telegram buttons** (advance/kill/snooze)
- Kill: **optional one-word reason** (encouraged not required)
- Snooze: **3-strike cap** then forced decision
- Project bridge on `→ start`: **AI-suggest, user confirms**; creates `projects` row but no GHL opp auto-creation

## Open Tier-2/3 items (Ben's verb required)

1. **Open PR for Pass 2A**: `gh pr create --base main --head feat/compliance-calendar-2026-05-16 --title "Pass 2A — compliance calendar + AT RISK TODAY pane"`
2. **PM2 start** new crons: `pm2 start ecosystem.config.cjs --only compliance-snapshot,compliance-alerts,compliance-notion-sync && pm2 save`
3. **Notion compliance page**: create page under ACT Money Framework, share with integration, add `NOTION_COMPLIANCE_PAGE_ID` to `.env.local`. Until then `compliance-notion-sync` cron logs gracefully and exits 0.
4. **Smoke-test in browser** at http://localhost:3002/finance/command — visually confirm AT RISK pane renders the 2 medium items

## Critical files (Pass 2A built/edited)

- `wiki/finance/compliance-calendar.md` (NEW — canonical source, edit when filings happen or new entities added)
- `scripts/build-compliance-calendar.mjs` (NEW)
- `scripts/compliance-alerts.mjs` (NEW)
- `scripts/sync-compliance-calendar-to-notion.mjs` (NEW)
- `apps/command-center/src/app/api/finance/compliance-calendar/route.ts` (NEW)
- `apps/command-center/src/app/finance/command/page.tsx` (EDIT — added `AtRiskTodaySection` above `TopLayer`)
- `ecosystem.config.cjs` (EDIT — 3 new daily crons 7:00/7:30/7:45)
- `thoughts/shared/data/compliance-calendar/2026-05-16.json` (seeded snapshot)

## Operational notes

- The `compliance-snapshot` cron at 7am rebuilds the JSON daily. Without it, the snapshot would go stale.
- Add a new BAS quarter to the wiki annually (at FY rollover).
- When a BAS is filed: edit the wiki to set `status: filed` + `last_filed_at: <date>`. Re-run `scripts/build-compliance-calendar.mjs` to refresh.
- Grant acquittals are auto-pulled — when a grant gets an `acquittal_due_date` in GHL (via canonical alignment work), it shows up automatically on next cron run.
- Pre-existing `/finance/invoices` + `/` prerender errors during `next build` — unrelated to Phase 2, Vercel handles fine. Don't waste time debugging.

## Branch status

```
feat/compliance-calendar-2026-05-16 (this session — pushed, not PR'd)
c3e0e03  feat(finance): Pass 2A — compliance calendar + AT RISK TODAY pane

main (production)
071155f  chore: auto-rebuild Tractorpedia viewer [skip ci]
c2c5f74  Merge pull request #63 (Phase 1: /finance/command end-to-end)
```

## Resume sequence

1. `/clear`
2. Open this handoff: `thoughts/shared/handoffs/2026-05-16-money-brain-phase2/current.md`
3. Re-read plan: `~/.claude/plans/coo-cio-cfo-money-brain-phase2.md`
4. Decide: open PR for Pass 2A first, OR jump straight to Pass 2B
5. If Pass 2B: `git checkout main && git pull && git checkout -b feat/pilot-lifecycle-2026-05-17`
6. Start with B1 schema migration via `mcp__supabase__apply_migration`
