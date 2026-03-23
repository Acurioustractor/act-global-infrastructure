# Grant Process: Learnings, Improvements & Ceremony

## What We Learned (This Session)

### The pipeline was a junk drawer
- 6,891 "discovered" grants drowning out the ~30 that matter
- 4 different scripts writing to the same Notion Actions DB, fighting each other
- Sync was destructive — every run overwrote manual Notion edits (status changes, notes, assignments)
- No content on action items — just titles with no funder, no deadline, no link, no description
- Expired grants piling up with no one archiving them — noise compounds daily

### The data was fragmented
- GrantScope had 3 duplicate RADF Major Projects entries — only 1 had real data (provider, deadline, URL)
- Grant actions were created without linking to their source grant or ACT project
- No way to trace: "this action came from this grant opportunity which aligns to this project"
- Title was the only link between action and grant — fragile, lossy, breaks on rename

### Nobody was tending the garden
- 18 overdue actions, most still "Not started"
- No automated archival of expired grants
- No reminders when deadlines approach
- No weekly rhythm to review what's due, decide what to pursue, close what's dead

---

## What Levels This Up

### Level 1: What We Just Fixed (Done)
- **Create-only sync** — Notion is source of truth, syncs only create, never overwrite
- **Rich content** — every new grant action gets funder, amount, deadline, description, URL bookmark, project links
- **Sweep capability** — script to audit all grant actions, archive expired, bump dates, enrich content

### Level 2: Automated Lifecycle Management
- **Auto-archive** — cron job that marks actions "Done" when the grant deadline passes and status is still "Not started" (you didn't pursue it, that's a decision)
- **Deadline alerts** — Telegram bot sends reminders at 7 days, 3 days, 1 day before grant deadlines
- **Stage transitions** — when you move a grant to "pursuing" in GrantScope, auto-create the full action sequence (Go/No-Go → Gather Docs → Draft → Review → Submit) with correct due dates working back from deadline
- **Deduplication** — GrantScope needs a dedup pass. Multiple entries for same grant = confusion. Merge on (provider + program + year)

### Level 3: Ceremony & Rhythm

#### Weekly Grant Review (15 min, every Monday)
```
AGENDA:
1. What's due this week? (auto-generated from deadlines)
2. Any Go/No-Go decisions needed? (grants approaching readiness threshold)
3. What expired last week? (auto-archived — review for learnings)
4. Pipeline health: pursuing X grants worth $Y, next deadline is Z
```

This could be:
- A Telegram bot command: `/grants` → shows this week's grant dashboard
- A Notion page auto-refreshed by the daily sync
- A section in the morning briefing (already exists — just needs grant focus)

#### Go/No-Go as a Deliberate Gate
Right now Go/No-Go is an action item you scroll past. It should be a **decision record**:

```
GRANT: RADF Major Projects — $15K
DEADLINE: Mar 30
READINESS: 70%

GO criteria:                    NO-GO criteria:
☑ Aligned to active project    ☐ Deadline < 7 days + readiness < 80%
☑ Amount justifies effort      ☐ No capacity this month
☑ We meet eligibility          ☐ Requires DGR we don't have
☐ Have all documents ready     ☐ Competing grant takes priority

DECISION: GO / NO-GO / DEFER
RATIONALE: [one sentence]
```

This becomes a **Notion template** in the Actions DB. Every Go/No-Go action gets this template auto-applied.

#### Post-Deadline Retrospective
After every grant deadline (submitted or not), capture:
- Did we submit? Yes/No
- If no, why? (missed deadline / decided not to / capacity / eligibility)
- If yes, what was the quality? (rushed / solid / strong)
- What would make the next one easier?
- Reusable assets created? (project descriptions, budgets, letters of support)

This feeds a **grant knowledge base** — next time a similar grant comes up, you have the history.

### Level 4: The Grant Engine

#### Reusable Asset Library
Most grants ask for the same things:
- Organisation description (ACT Foundation + ACT Ventures)
- Project descriptions (each of the 7 projects)
- Budget templates (by project, by scale)
- Letters of support (from partners, communities)
- Certificates (ABN, insurance, ORIC registration)
- Impact evidence (case studies, photos, data)

Build a **Grant Assets** Notion database:
- Asset name, type, project, last updated, file/link
- Tag which grants have used each asset
- Flag stale assets (last updated > 6 months)

When a new grant is pursued, auto-check: "You have 4/6 required assets ready. Missing: budget template, letter of support from [partner]."

#### Capacity-Aware Pipeline
Right now readiness % is a gut feel number. Make it computed:
```
Readiness = (assets_ready / assets_required) × 0.4
          + (days_until_deadline > 14 ? 1 : days/14) × 0.3
          + (has_writer_assigned ? 1 : 0) × 0.2
          + (aligned_project_active ? 1 : 0) × 0.1
```

This tells you: "Don't start this grant, you'll never make it" vs "This one's 90% ready, just needs a budget."

#### Grant Calendar (Visual)
A dedicated calendar view showing:
- Grant deadlines (red)
- Go/No-Go decision dates (amber, auto-set 7-14 days before deadline)
- Submit dates (green, auto-set 2 days before deadline)
- Milestone reports for won grants (blue)

Already have a Planning Calendar DB — just needs grant-specific views and auto-population.

---

## Immediate Next Steps

### This Week
1. **Morning briefing integration** — add "Grants Due This Week" section to the daily Telegram briefing
2. **Auto-archive cron** — add to scheduled-syncs.yml: archive grant actions where deadline < today and status = Not started
3. **Go/No-Go template** — create Notion template with the decision framework above

### This Month
4. **Deadline alerts** — Telegram bot sends grant deadline reminders (7d, 3d, 1d)
5. **GrantScope dedup** — merge duplicate grant entries, prefer records with provider + description + URL
6. **Asset inventory** — catalogue what reusable grant materials exist across Google Drive, Notion, etc.

### This Quarter
7. **Grant Assets DB** — Notion database with reusable materials
8. **Computed readiness** — replace gut-feel % with formula based on actual asset/capacity data
9. **Post-deadline retro automation** — auto-create retro template when deadline passes

---

## The Mindset Shift

The current process is **reactive**: grants appear, create noise, get ignored, expire, repeat.

The ceremony transforms it to **intentional**:
- Weekly review creates rhythm
- Go/No-Go gate creates discipline
- Asset library creates leverage (each grant gets easier)
- Retros create learning (compound improvement)
- Auto-archive creates cleanliness (noise doesn't accumulate)

The goal isn't to apply for more grants. It's to apply for the **right** grants with **less** effort and **higher** quality. A small org pursuing 5 grants well beats one drowning in 50 half-started applications.
