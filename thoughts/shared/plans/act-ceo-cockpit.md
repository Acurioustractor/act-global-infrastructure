# Plan: ACT CEO Cockpit — the daily landing page

> Slug: `act-ceo-cockpit`
> Created: 2026-04-25
> Status: Phase 1 shipped (this session)
> Owner: Ben

## Objective

Ben opens ONE page every morning as CEO of ACT. That page synthesises everything he needs to know to decide what to do today: cutover countdown, money state, decisions blocked on him, what moved overnight, recent commits, this week's commitments. Generated automatically from live data so it's always current. Failure is loud, not silent.

## What shipped this session

- **`scripts/generate-ceo-cockpit.mjs`** — pulls from Supabase (`xero_invoices`, `xero_transactions`), repo git log, `wiki/decisions/act-core-facts.md` (ACT Brain source), `wiki/synthesis/` directory. Outputs `wiki/cockpit/today.md`. Auto-archives yesterday to `wiki/cockpit/archive/YYYY-MM-DD.md`.

- **`wiki/cockpit/today.md`** — first generation. 67 days to cutover, $507,700 outstanding, 3 named decisions blocked on Ben, 12 open actions from CEO review, 5 most recent commits, links back to all syntheses + brain + plans.

- **Daily scheduled agent** `trig_01E6LXqwyCpgCekqvM6M1vKJ` (`act-ceo-cockpit-daily`) — cron `0 21 * * *` (UTC) = every day at 07:00 Brisbane. Re-runs the script, commits to a branch, opens a PR. Uses Haiku 4.5 (cheap, mechanical). PR title is the daily signal — Ben sees the date + any change before opening the page.

## Page structure (in order of CEO attention)

1. **The headline** — days to cutover, total outstanding, latest commit (one line)
2. **🚨 Decisions blocked on you** — DRAFT invoices + named-counterparty calls
3. **📊 The number** — 5-row metrics table with "what it means" plain-English column
4. **🎯 Top 3 receivables** — table by amount
5. **📋 Open actions from CEO review** — pulled live from `act-core-facts.md` checklist
6. **🌊 What's moving** — recent commits + recent Alignment Loop syntheses
7. **🗓️ This week ahead** — fixed dates: weekly drift PR, cutover, D&O deadline, R&D records review
8. **🔗 Quick links** — wiki paths to all the source-of-truth artefacts
9. **📝 How this page works** — explainer for any human encountering the page cold

## Daily rhythm (the system Ben jumps into)

```
  07:00 Brisbane   Cockpit regenerates                         (daily agent)
                   → PR opens with refreshed today.md
                   → Ben opens PR, scans headline, reads page
                   → Decides what needs his attention
  
  Throughout day   Standard work in any ACT repo               (Ben + Claude sessions)
                   → Each repo's CLAUDE.md has ACT Context
                     (entity facts, cutover rules, naming)
                     synced from act-core-facts.md
  
  Friday 08:00     Weekly Alignment Loop drift PR opens        (weekly agent)
                   → Q1/Q2/Q3 syntheses re-generated
                   → Drift summary highlights what moved
                   → Saturday's cockpit picks up the new state
  
  As facts change  Ben edits wiki/decisions/act-core-facts.md  (source of truth)
                   → Runs node scripts/sync-act-context.mjs --apply
                   → Distribution: 8 ACT repos' CLAUDE.md updated
                   → Next morning's cockpit reflects the change
```

## What's NOT yet built (Phase 2 candidates)

- **HTML rendering** — `today.md` is markdown. The wiki rebuild CI converts it to a viewer page at `act-global-infrastructure.vercel.app/wiki/cockpit/today` (auto-handled). Could add a dedicated `/cockpit` route in command-center for richer interactivity.
- **Calendar integration** — "This week ahead" is currently fixed text. Pulling actual Google Calendar would surface meetings, deadlines, travel.
- **Email triage** — surface unread funder emails (Snow, Paul Ramsay, etc.) directly in the cockpit.
- **Telegram/SMS push** — for cutover-window urgency, send the headline as a Telegram message at 07:00 in addition to the PR.
- **Movement diff vs yesterday** — "$ outstanding moved from $507K to $389K" (delta against yesterday's archived brief). Currently the page is point-in-time only.
- **Project-level health** — extend with one-line status per active project (ACT-GD, ACT-HV, ACT-JH, etc.) sourced from latest syntheses.

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-04-25 | Markdown output (not HTML) | Wiki rebuild CI renders markdown to viewer surface; no extra infra. Markdown is also AI-readable so future Claude sessions can ingest the cockpit as context. | Yes — Phase 2 can add `/cockpit` route. |
| 2026-04-25 | One canonical page (not multiple briefings) | Existing `generate-morning-brief.mjs` (712 lines) is comprehensive; cockpit is intentionally narrower — CEO decision-surface only. Two artefacts coexist; cockpit is for jump-in, brief is for deep read. | Yes — could merge. |
| 2026-04-25 | Daily PR (not commit-to-main) | PR title becomes the signal Ben reads first. Direct-to-main commits to wiki/ are noisy in `git log`. PR review is also a forcing function: Ben merges = Ben acknowledges. | Yes. |
| 2026-04-25 | Haiku 4.5 for the daily agent (not Sonnet/Opus) | Job is mechanical: run script, commit, PR. No reasoning. Haiku is 10× cheaper. | Yes — escalate if PR-body composition needs more nuance. |
| 2026-04-25 | 07:00 Brisbane (not 06:00 or 09:00) | Matches existing morning-brief workflow timing convention. Early enough to be ready when Ben starts the day; late enough that overnight Xero sync has run. | Yes. |

## Architecture summary

```
                    ACT BRAIN (source of truth)
                              │
                              ▼
            wiki/decisions/act-core-facts.md
              │                      │
              ▼                      ▼
    sync-act-context.mjs    generate-ceo-cockpit.mjs
              │                      │
              ▼                      ▼
    8 ACT repos' CLAUDE.md   wiki/cockpit/today.md
                                     │
                                     ▼
                              Daily PR (07:00 Brisbane)
                                     │
                                     ▼
                              Ben opens, scans, decides, acts
```

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| Script generates valid markdown | Verified | First run produced 80-line page; preview reads cleanly | 2026-04-25 |
| Live data integration works | Verified | $507,700 outstanding matches Q3 synthesis baseline | 2026-04-25 |
| Daily agent scheduled | Verified | RemoteTrigger response shows `next_run_at: 2026-04-25T21:04:17Z` | 2026-04-25 |
| Auto-archiving works | Not yet | Will verify on second run when today.md gets archived | — |

## Backlinks

- [[act-brain-expansion|ACT Brain expansion plan]] (the source-of-truth layer this cockpit reads from)
- [[act-alignment-loop|Alignment Loop]] (the weekly drift signal that feeds the cockpit's "what's moving" section)
- [[act-entity-migration-checklist-2026-06-30|Migration checklist]] (the live commitment the cockpit's countdown tracks)
- [[../../wiki/decisions/act-core-facts|act-core-facts.md]] (upstream source)
- [[../../wiki/cockpit/today|Today's cockpit]]

## Next action

Tomorrow morning Ben opens the PR titled `Daily cockpit refresh — 2026-04-25` and reads the page. If it's useful, it stays. If something's wrong (a decision missing, a number meaningless, a section unread), edit `scripts/generate-ceo-cockpit.mjs` and run again — iteration is cheap, the PR cycle is safe, the failure mode is loud.
