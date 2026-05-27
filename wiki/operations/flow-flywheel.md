---
title: The ACT Flow Flywheel — weekly alignment ritual
slug: flow-flywheel
status: active
date: 2026-05-26
tags: [operations, ritual, planning, alignment, notion, flow]
audience: [Ben, Nic, Claude]
related: [[notion-platform-architecture-2026-05-14]], [[notion-page-policy]], [[money-stack-one-stop-shop]]
---

# The ACT Flow Flywheel

> A 90-minute weekly ritual that keeps daily work pulling toward the decade-ahead goals — instead of mistaking motion for progress. Plus a 15-minute daily version. This doc is the operating procedure; it rides on surfaces ACT already runs, it does **not** introduce a new system.

## Why this exists

Goal displacement is the silent failure mode: the process of *being busy on a project* quietly replaces the goal of *moving the project*. Every week, demands and opportunities nudge ACT off course. The Flywheel is the navigation system that course-corrects — it forces each main project to answer, "what three actions, done this week, most directly move this forward?"

The discipline is **power-law, not bell-curve**: a small handful of actions ("dominoes") drive almost all real progress. The ritual exists to find those three per project and protect time for them.

## Where things live (don't fork the system)

This ritual reads and writes surfaces that already exist. The source-of-truth rules from [[notion-platform-architecture-2026-05-14|the Notion platform architecture decision]] hold:

| Layer | Home | Role in the Flywheel |
|---|---|---|
| **Goal Stack** (Purpose → 10-yr → 12-mo → quarter → month) | `wiki/projects/<slug>.md` → `## Goal Stack` | Canonical. The durable top three layers change rarely; the lower layers are refreshed in this ritual. |
| **Projects (operating view)** | Notion `actProjects` DB (mirrored from wiki) | Glance at status / priority across projects. |
| **Dominoes** (≤3 per project per week) | Supabase `project_knowledge` (`action_item`) → Notion `actions` DB | Created here weekly; surface in Notion; checkbox status flows back. |
| **Opportunities** (1/3/6/12-mo) | Notion `opportunitiesDb` + pile workspace | Reviewed for what's live / emerging / drifting. |
| **Funders / partners** | Notion `foundationsDb`, `stakeholders`, GHL | Source of the week's "brave asks." |
| **Decisions made** | Notion `decisions` (capture) | Log decisions taken during the ritual. |
| **Cadence / rhythm** | Notion `planningRhythm` | The week/month/quarter/year scaffolding. |

**Rule:** Supabase + the wiki are truth. Notion is the lens and the capture surface. GHL is the CRM engine. The Flywheel never creates a parallel truth layer in Notion.

## The Goal Stack

Each main project carries its own Goal Stack as a `## Goal Stack` section in its wiki page. Live examples:

- [[contained|CONTAINED]] (ACT-CN)
- [[goods|Goods on Country]] (ACT-GD)
- [[the-harvest|The Harvest]] (ACT-HV)

The chain: **Purpose → 10-year → 12-month → this quarter → this month → this week's dominoes → daily first step.** Each layer feeds the one below it. If a daily action doesn't trace up to the 10-year purpose, it's drift.

## The weekly ritual (90 minutes, Friday or Sunday)

The single highest-priority task of the week — it governs every other task. Time-boxed:

1. **Mission check (5 min).** Re-read the purpose / 10-year line for each active project. Are we still serving the bigger idea?
2. **Goal Stack review (20 min).** For each of the three load-bearing projects, ask the three questions:
   - How did last week's actions drive the goals?
   - What's the gap between what we did and what the goals require?
   - What closes that gap this week?
   Update the *living* layers (quarter / month) in the wiki where they've shifted.
3. **Opportunity sweep (15 min).** In Notion `opportunitiesDb`: what's live (this month), emerging (3–6 mo), drifting (no movement), and what needs a **direct ask**?
4. **Pick the dominoes (20 min).** No more than **three per active project**. Each domino must be the action that, done, makes the most other things easier, closer, or unnecessary. Write each as: *domino · why it matters · "done means" · first tiny step.* Record them as `action_item` rows (see below).
5. **Delegate (10 min).** What can an intern/volunteer own as a bounded mini-project? What campaign asset must be sent/pitched/followed-up?
6. **Brave asks (10 min).** Who needs a direct ask this week (funder, partner, host, media)? Pull from `foundationsDb` / `stakeholders` / GHL.
7. **Score + park (10 min).** Score each project 0–3 for the week just gone. Note what's deliberately **parked** — important, but not this week.

### Scoring

`0` no movement · `1` motion but unclear progress · `2` clear progress · `3` causal breakthrough.

The aim is not all-3s. It's knowing which projects deliberately matter this week and which are intentionally parked. **Rule of thumb: every week carries at least one domino on a load-bearing project** (currently Goods/funding or CONTAINED).

## The daily Flow Flywheel (15 minutes, end of day)

1. **Compass check.** Did today's work trace up to the Goal Stack?
2. **Tomorrow's dominoes.** Decide the 2–3 tasks that most move this week's dominoes — *before* tomorrow starts, to kill decision fatigue.
3. **Calendar them.** Specific times, specific durations. Treat them like meetings you can't move.
4. **Micro-goals.** Break each into wildly specific steps ("open deck, add Q1 data to slide 3"), not "work on deck."
5. **First tiny step.** Do the very first step now (open the doc, create the folder, write one sentence) so tomorrow you continue rather than begin.

## How dominoes connect to Notion (the mechanism)

A domino is just an **`action`** row in Supabase `project_knowledge`, scoped to a project code:

- `knowledge_type = 'action'`, `project_code` = `ACT-CN` / `ACT-GD` / `ACT-HV`
- title prefixed `Domino:` so it's filterable
- `action_required = true` (open) — ticking the Notion checkbox flips this to `false` = Done
- `follow_up_date` = Friday of the week · `status = open` · `importance = high`
- set in one command: `node scripts/set-dominoes.mjs <CODE> "domino one" "domino two" "domino three"`

These surface in the Notion `actions` DB via `sync-actions-decisions-to-notion.mjs`, and ticking the checkbox in Notion flows the completion back to Supabase via `poll-notion-checkboxes.mjs`. A single Notion view — **"🎯 This Week's Dominoes"** ([open](https://www.notion.so/177ebcf981cf8023af6edff974284218?v=36cebcf981cf81eea372000c61c29ddb)) — filters `actions` to `Action Item contains "Domino"`, grouped by project. No new database, no schema change.

> **Known issue (2026-05-26):** `sync-actions-decisions-to-notion.mjs` currently errors — it writes a `Supabase ID` property that no longer exists on the Actions/Decisions Notion DBs, so every create fails and dedup is blind. The 2026-W22 dominoes were placed directly in Notion as a workaround. Fixing the sync (re-add `Supabase ID` as a text property on both DBs, then backfill carefully to avoid duplicating ~100 existing action pages) is a separate task.

## The alignment rule

Put at the top of the weekly review. Every active project must connect to:

1. the 10-year mission;
2. a 12-month outcome;
3. a live opportunity;
4. this week's domino;
5. a clear next ask;
6. a campaign or relationship pathway;
7. a person responsible for the next move.

**If it doesn't connect, it's parked.**

## In one sentence

Each week: *"Which three actions, completed this week, most directly move ACT toward funded, community-owned, on-country projects that create practical outcomes for people?"* — that's the compass. Everything else is support, maintenance, or noise.
