# Money Brain Phase 2 — Resume Handoff

**Updated:** 2026-05-17T20:30:00Z
**Goal:** Build COO+CIO+CFO+risk Money Brain on top of /finance/command
**Branches:**
- Phase 1 shipped to `main` via PR #63
- Phase 2 Pass 2A + Pass 2B shipped to `main` via PR #65 (merged 2026-05-16)
- Post-PR-#65 follow-ups in flight on `feat/money-brain-followups-2026-05-17` via PR #72 (open, awaiting review)

## Ledger

### Now
[->] Pass 2A + 2B both shipped & merged. PR #72 (follow-ups) open. **Next:** Pass 2C (Accountability) OR start the 6-issue Money Brain set (#66-71).

### What shipped in the parallel-terminal flurry (2026-05-14 → 2026-05-17)

Far more than just compliance landed before PR #65 merged. The branch picked up most of the Phase 2 + AI infrastructure work in one cycle:

| Commit | Feature | Pass |
|---|---|---|
| `c3e0e03` | Compliance calendar + AT RISK TODAY pane + Telegram cron + Notion sync | 2A ✓ |
| `62d3696` | idea_board lifecycle + reminders + AT RISK wiring | 2B ✓ |
| `a993357` | Monday-chain cron wrapper (one entry, failure-isolated) | — |
| `44023ee` | AI Dext routing grader (Sonnet 4.6 → `finance_ai_routing_suggestions`) | — |
| `e7ea801` | Pre-publish Dext grader (every receipt graded before Xero) | — |
| `d8175c4` | Xero copilot click-wiring (`attach_evidence` + `find_match_bill` + `transfer`) | — |
| `3467704` | AI suggestions review page (`/finance/ai-suggestions`) | — |
| `b008656` | Inline AI suggestions in workbench rows + one-click Accept | — |
| `f40a5e3` | Weekly narrative digest (Curtis voice, Sonnet 4.6) | — |
| `fbdc5b5` | Bulk-accept on workbench filter bar | follow-up |

Plus this session's 5 follow-ups on PR #72:
- `f06e36e` link AI suggestions card from finance index + sidebar dividers
- `7ac103e` telegram chat-id fallback to `TELEGRAM_AUTHORIZED_USERS[0]`
- `97cd112` notion sync dotenv override (defeats stale shell exports)
- `7af5d2b` chore — 121 files of accumulated 2026-05-14..16 work (drafts, reports, scripts, `packages/notion-workers/` package)
- `9ae1ea5` gitignore — MCP caches, local downloads, root PNGs, workers backups

## Outstanding — three threads

### Track A — Pass 2C (Accountability) — last pass of Phase 2

Never started. Sized ~1 session. Locked design in `~/.claude/plans/coo-cio-cfo-money-brain-phase2.md` § Pass 2C.

- **C1 · Ack tables** — `compliance_ack` + `idea_ack` (lightweight: id, item_id/type, ack_at, ack_by)
- **C2 · Debt counter on AT RISK pane** — snapshot ("3 ack-overdue today") not cumulative (settled at Q11)
- **C3 · Weekly digest section** — extend `scripts/weekly-money-digest.mjs` with hits/misses/snooze chain. Friday 3pm Telegram delivery (existing cron, add sections)

### Track B — Money Brain 6-issue set (created 2026-05-16 evening)

Handoff: `thoughts/shared/handoffs/2026-05-17-money-brain-issue-set.md`. Total ~5 days. Priority order **1 → 4 → 2 → 3 → 6 → 5**:

- **#66** Push AI project_code to Dext tracking before publish (0.5d) — every receipt arrives in Dext with project pre-filled
- **#69** Xero webhook for sub-minute bank line updates (1d) — polling → push
- **#67** Founder pay tracker widget on `/finance/command` (0.5d)
- **#68** Live R&D tracker — running total + 43.5% refund estimate (1d)
- **#71** Phone shortcut + voice-memo capture (1.25d)
- **#70** Roadmap waterfall — 6/12/60mo cashflow (1-2d)

### Track C — Open PRs needing decision

- **#72** money-brain-followups (this session's PR) — awaiting review/merge
- **#62** Alignment Loop 2026-05-14 second pass — stale, decide merge/close
- **#61** ghl-canonical-code-alignment — stale (2026-05-13), decide merge/close
- **#50** Alignment Loop 2026-05-08 — very stale (2026-04-26), almost certainly close
- **#48** cockpit gen failed 2026-04-25 — very stale, almost certainly close

## Pass 2C build sketch (when ready)

### C1 · Ack tables (`supabase/migrations/20260518_ack_tables.sql`)

```sql
CREATE TABLE compliance_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id text NOT NULL,       -- e.g. 'bas-q4-fy26' from compliance-calendar.md
  ack_at timestamptz DEFAULT now(),
  ack_by text NOT NULL,              -- 'ben' | 'nic'
  note text                          -- optional context
);

CREATE TABLE idea_ack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES idea_board(id) ON DELETE CASCADE,
  ack_at timestamptz DEFAULT now(),
  ack_by text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('saw','advanced','killed','snoozed'))
);

CREATE INDEX idx_compliance_ack_obligation ON compliance_ack(obligation_id);
CREATE INDEX idx_idea_ack_idea ON idea_ack(idea_id);
```

### C2 · Debt counter — extend `/api/finance/command/route.ts`

In the AT RISK aggregator, count obligations/ideas that pinged in last 14 days WITHOUT a matching ack row. Surface as a header pill: `📒 3 ack-overdue` (red if >5, yellow if 1-5, hidden if 0).

### C3 · Weekly digest — extend `scripts/weekly-money-digest.mjs`

Add three sections:
- **Compliance hits/misses** — what got acked vs missed in the past week
- **Idea decisions** — what moved (advanced/killed/snoozed) vs what stayed stale
- **Snooze chain** — anything snoozed 2+ times that's approaching the 3-cap

## Operational notes

- The `compliance-snapshot` cron at 7am rebuilds the calendar JSON daily.
- Add a new BAS quarter to `wiki/finance/compliance-calendar.md` annually (at FY rollover).
- When a BAS is filed: edit wiki → set `status: filed` + `last_filed_at`. Re-run `scripts/build-compliance-calendar.mjs`.
- Grant acquittals are auto-pulled from GHL when an `acquittal_due_date` is set on the opportunity.
- The Phase 2 schema additions (`lifecycle_stage`, `idea_snoozes`, `owner`, `kill_reason`) are live in production via Pass 2B's `20260517_idea_lifecycle.sql` migration.
- Pre-existing `/finance/invoices` + `/` prerender errors during `next build` — unrelated, Vercel handles fine. Don't debug.

## Resume sequence

1. `/clear`
2. Open this handoff: `thoughts/shared/handoffs/2026-05-16-money-brain-phase2/current.md`
3. Decide thread: **A** (Pass 2C), **B** (start #66 — recommended), or **C** (stale PR triage)
4. If #66: read the issue body via `gh issue view 66`, branch off latest main, ship
5. If Pass 2C: re-read `~/.claude/plans/coo-cio-cfo-money-brain-phase2.md` § Pass 2C, branch off latest main, start with C1 migration
