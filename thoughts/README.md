# Thoughts

This is ACT's thinking and planning space. Everything here syncs to Obsidian via git auto-pull.

## Structure

### `writing/` — Long-form content
The pipeline for essays, pitches, articles, and creative writing.

| Stage | Folder | What lives here |
|-------|--------|----------------|
| Raw ideas | `writing/drafts/` | First passes, brainstorms, voice-to-text captures |
| Active work | `writing/in-progress/` | Pieces being refined, reviewed, iterated on |
| Finished | `writing/published/` | Done — shared, sent, or posted |

**Move between stages** via Telegram bot: "move the regenerative piece to in-progress"

### `planning/` — Operational cadence
Plans at four time horizons that roll up into each other.

| Cadence | Folder | Flow |
|---------|--------|------|
| Daily | `planning/daily/` | Today's focus, tasks, intentions |
| Weekly | `planning/weekly/` | End-of-week synthesis of dailies |
| Yearly | `planning/yearly/` | Annual goals, themes, milestones |
| Decade | `planning/decade/` | 10-year vision, long arcs |

**Daily flow:** Talk to bot about today's focus. At end of week, say "review the week" to synthesize.

### `reviews/` — Periodic reflection
Written reviews of how things are going.

| Cadence | Folder | What |
|---------|--------|------|
| Monthly | `reviews/monthly/` | Moon cycle reviews — org health, finances, relationships, wellbeing |

**Trigger:** Say "moon review" to the bot. It pulls all the data, you write the piece together.

### `shared/` — Cross-session context
Material that persists across Claude Code sessions and agents.

| Folder | Purpose |
|--------|---------|
| `shared/plans/` | Technical implementation plans (Claude-generated) |
| `shared/research/` | Ecosystem audits, analysis, deep dives |
| `shared/handoffs/` | Session continuity documents for multi-session work |
| `shared/vision/` | Foundational documents — ACT's identity, philosophy, movement |

## How It All Connects

```
Daily sync (voice → bot → daily/)
    ↓ end of week
Weekly review (bot reads dailies → weekly/)
    ↓ end of month
Moon cycle review (bot pulls everything → reviews/monthly/)
    ↓ end of year
Yearly review (bot reads monthlies → yearly/)
    ↓
Decade vision update (yearly/)
```

Writing happens in parallel — essays, pitches, articles flow through `drafts/ → in-progress/ → published/` at their own pace.
