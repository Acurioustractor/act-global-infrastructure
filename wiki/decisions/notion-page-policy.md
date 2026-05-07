---
title: Notion page policy — what's safe to edit, what gets overwritten
slug: notion-page-policy
status: active
date: 2026-05-07
tags: [decision, notion, sync, policy, integration-rules]
audience: [Ben, Nic, Claude]
---

# Notion page policy

Notion in the ACT ecosystem is **mostly a read-only dashboard layer**, with a small number of capture and bidirectional pages. Edits to the wrong kind of page are silently overwritten by the next sync. This doc lists the rules and how to tell which is which.

## The three categories

### 1. Outbound-only — DO NOT EDIT (17 sync scripts as of 2026-05-07)

These pages are rebuilt from Supabase / Xero / GHL on every sync. Anything you type into them is overwritten on the next run. They are dashboards, not working pages.

The pattern: any script named `sync-*-to-notion.mjs`, plus `sync-money-dashboard-hub.mjs`. The full list:

- `sync-actions-decisions-to-notion`
- `sync-budget-vs-actual-to-notion`
- `sync-cash-forecast-to-notion`
- `sync-cash-scenarios-to-notion`
- `sync-contacts-to-notion`
- `sync-entity-hub-to-notion`
- `sync-finance-to-notion`
- `sync-ghl-to-notion`
- `sync-github-project-to-notion`
- `sync-grantscope-to-notion`
- `sync-kpis-to-notion`
- `sync-mission-control-to-notion`
- `sync-money-alignment-to-notion`
- `sync-money-dashboard-hub`
- `sync-money-framework-to-notion`
- `sync-money-metrics-to-notion`
- `sync-opportunities-to-notion-db`
- `sync-pile-pages-to-notion`
- `sync-priorities-to-notion`
- `sync-project-intelligence-to-notion`

If you want a number changed on one of these pages, change the source — Xero / Supabase / GHL / the scripts/lib/ feeder. Then run the matching `sync-*-to-notion.mjs` to re-push.

### 2. Bidirectional control — edits flow back

These pages are read by Notion humans and have specific **status/stage/date columns** that flow back into a DB or service when changed:

- **Opportunity stages** — edit the stage column on an opportunity in Notion, `sync-notion-stages-to-grantscope.mjs` propagates the change to GrantScope.
- **Contact changes** — edit a contact field in Notion, `sync-notion-changes-to-ghl.mjs` propagates to GHL.
- **Notion-driven calendar dates** — `sync-notion-dates-to-calendar.mjs` reads Notion dates into Google Calendar.

Rule: it's only the **specific named columns** that flow back, not arbitrary edits. Adding a child block, renaming a row, or editing free-text on these pages will not propagate.

### 3. Capture pages — fully writable, syncs back

These pages are designed to receive human input. Edits flow into Supabase via the inbound sync.

- **Money Sync** working page — initialised by `init-money-sync-page.mjs`. Free-form working space; questions, ideas, decisions. Friday Digest reads from here.
- **Meetings** — `sync-notion-meetings.mjs` ingests meeting notes from Notion into Supabase.
- **Goals** — `sync-notion-goals.mjs` syncs Notion goal pages into the goals table.
- **Generic inbound** — `sync-notion-to-supabase.mjs` and `.github/workflows/sync-notion-inbound.yml` handle a generic inbox channel.

### 4. Free-form — nobody syncs it

Any Notion page not touched by a sync script. Fully owned by humans. No automation.

## How to tell which kind of page you're looking at

1. **Look at the page title or icon.** Future convention: outbound-only pages should carry the 🤖 emoji in their title. Sync scripts can set `icon: { emoji: '🤖' }` on every page they own. Not yet enforced (2026-05-07).
2. **Look at the URL or page ID.** Grep `scripts/sync-*-to-notion.mjs` for the page ID. If found, the page is outbound-only.
3. **Look at the property names.** If the page has a "Stage" or "Status" select with a fixed enum, it's likely bidirectional on that column only.
4. **When unsure: edit a comment on the page, not the content.** Comments are never overwritten by sync scripts.

## When this doc changes

- Add a new outbound row when a new `sync-*-to-notion.mjs` ships.
- Add a new bidirectional row when a new `sync-notion-*-to-<service>.mjs` ships.
- Add a new capture row when a new generic inbound channel is wired.

## Why this exists

Architecture map 2026-05-07 surfaced Gap #2: humans editing outbound-only pages lose work to the next sync. Until every sync script prepends a 🤖 callout to the page (deferred — 17 scripts to modify), this doc is the canonical reference.

## See also

- Architecture map: `thoughts/shared/handoffs/2026-05-07-end-of-day-2.md` (or whichever handoff carries the architecture write-up).
- Source-of-truth map: `wiki/decisions/act-core-facts.md`.
- Notion access pattern: `~/.claude/rules/context-efficiency.md` ("Notion: query specific pages by ID, not broad searches").
