# Goods HQ — overdue action triage

> Drafted: 2026-04-23 (revised same day after live query)
> Source: Notion Actions data source `collection://84bfbf62-1f77-4d4f-9050-ee4b2ed7163d`, view `32cebcf981cf80c097c0000cc0c40e64`
> Live query: 2026-04-23

## Correction to earlier read

The "11 overdue" number came from a Project Intelligence auto-callout dated **2026-03-27**. Over the 27 days since, most of those actions have naturally cleared. The March list included items like *video timeline (16 Mar), interviewees, Eloise grant sources, shredder (16 Dec), maroon frames, AMP Tomorrow Makers, Snow check-ins, Empathy Ledger Tennant Creek* — all of which have since been moved, completed, or deleted.

**Current reality (live query 2026-04-23):** only **3 overdue actions** in the visible first 100 rows of the Actions database, all assigned to Ben, all 2 days overdue.

The database has `has_more: true` so there may be additional backlog items in the tail; full pagination sweep recommended before month-end.

## Current overdue — the 3

| # | Page ID | Title | Due | Status | Assignee |
|---|---|---|---|---|---|
| 1 | `348ebcf9-81cf-80f7-b6f3-d4c1bc85eb5b` | Send back all strategy stuff to QBE mentors | 2026-04-21 | In progress | Ben |
| 2 | `348ebcf9-81cf-805d-8897-f68b6993283b` | Get approval / check in with Rachel about Phil Aus vid | 2026-04-21 | In progress | Ben |
| 3 | `348ebcf9-81cf-801e-bf14-f9321ad34905` | Send Goods overlay video to the Phil Aus crew | 2026-04-21 | In progress | Ben |

All three are video and funder-communication work linked to the QBE Catalysing Impact cohort and Philanthropy Australia relationship. Dependency chain: #2 (Rachel approval) blocks #3 (send to Phil Aus). #1 is independent.

## Proposed triage (no destructive actions taken)

1. **If the QBE strategy pack is done already** → mark as Done with the sent-date in the AI Summary field. One click.
2. **If the Phil Aus video is waiting on Rachel** → re-date to whatever Rachel's realistic turnaround is (Fri 25 Apr at the earliest).
3. **If the overlay video send is blocked by #2** → add `blockedBy` metadata if the database supports it, or leave as-is and bring into next Monday's cockpit.

I have not changed any page status. These are Ben's own actions, and only Ben knows whether they shipped. Two minutes in Notion clears all three.

## Full backlog sweep — recommended scheduling

Since the visible slice was capped at 100 rows with `has_more: true`, there are likely older In-progress or Please-water rows beyond the cut. Before the plan rolls into May:

```bash
# Paginate full Actions data source via MCP, filter Status != Done, flag any item with last_edited > 21 days
node scripts/notion-goods-actions-audit.mjs  # script to build
```

That script becomes part of the Weekly Cron set described in Layer 5 of the plan — the **Field Insight Agent (A3)** weekly sweep should include Notion actions backlog as one of its panels.

## Why this matters for the plan

The March "11 overdue" number was load-bearing for my diagnosis of the HQ as "not operating." The current 3-overdue number is a healthier read. The HQ is being used; it just isn't composed into a cockpit yet. The plan stands, but the urgency tag on Notion cleanup moves from *crisis* to *routine* — the priority shifts to the OKR block addition, anchor buyer pages, and funder cadence view rather than backlog archaeology.
