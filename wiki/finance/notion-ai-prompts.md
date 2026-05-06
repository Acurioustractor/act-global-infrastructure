---
title: Notion AI — Useful Prompts for ACT Money Workspace
status: Reference card
date: 2026-05-06
audience: Ben + Nic
purpose: Copy-paste prompts for the most useful queries you can ask Notion AI on each database.
tags: [notion, ai, prompts, reference]
parent: act-money-framework
---

# Notion AI — Useful Prompts

> **How to use.** In any database (or even on a normal page), press **Cmd+J** (Mac) / **Ctrl+J** (Win) to open Notion Ask AI. Paste a prompt below. Notion AI will read the database schema and either answer in chat or create the requested view/page.

---

## On the Money Metrics database

**Build the trend dashboard:**
> Build a Dashboard view called "Trends" with: Bank Cash latest as number (red if <100K), Runway Months latest as number (red if <6, orange if <12), FY26 Net latest as number, Bank Cash by Snapshot Date as line chart, Runway Months by Snapshot Date as line chart, Voice Income + Flow Income + Ground Income + Grants Income by Snapshot Date as stacked bar chart. Filter to last 12 weeks. Pin as default.

**Quick analysis:**
> What's our runway trend over the last 8 weeks? Is it improving or declining?

> Compare Voice and Flow income across all snapshots. Which is growing faster?

> When did Bank Cash drop the most week-over-week?

---

## On the ACT Opportunities database

**Build the pipeline dashboard:**
> Build a Dashboard view called "Pipeline" with: total Amount where Stage=Open as number, count of opps where Stage=Open by Pile as bar chart, count by Source as donut, count by Stage as donut, top 10 by Amount where Stage=Open as table.

**Tactical queries:**
> Which 5 GHL opportunities have been open longest without a stage change?

> How many opportunities are in each pile? Show as a bar chart.

> Show me all Foundation-source opportunities researching with deadline in next 60 days.

> Which Funder/Contact has the most opportunities?

> Show me Won opportunities from the last 90 days, sorted by Amount.

---

## On the Entity Hub database

**Build a relationships view:**
> Build a Dashboard view called "Top Relationships" with: top 10 entities by Xero Receipts (FY26) as table, count of entities by Roles as donut, top 10 entities by GHL Open $ as table, count where Has Foundation Profile = true as number.

**Strategic queries:**
> Which 10 entities have we received the most money from in FY26?

> Show me all Indigenous Org entities with active GHL deals.

> Which Government entities have we engaged with?

> Find all entities where we have BOTH Xero invoices AND GHL opportunities.

> Show entities that owe us money (Xero Outstanding > 0) sorted by amount.

---

## On the Decisions Log

**Strategic queries:**
> Show me all decisions in 'Proposed' status — what's awaiting Standard Ledger?

> Group decisions by Owner. Who has the most outstanding?

> Show all decisions tagged 'cutover' — what's left before 30 June?

---

## On the Action Items database

**My week:**
> What's on my list for this week (Owner=Ben, Status≠Done, Due in next 7 days)?

> Show all Critical or High priority items that aren't Done.

> What's overdue?

> Group by Owner — who has the most on their plate?

---

## On the Foundations database

**Funder strategy:**
> Show top 20 foundations by Total Giving Annual where Themes contains 'indigenous'.

> Which foundations are DGR and have giving over $1M/yr?

> List foundations with Application Tips populated — those are the ones we have the most info on.

---

## On the Standard Ledger Q&A database

**Meeting prep:**
> Build me an email draft to Standard Ledger including all Open questions tagged 'cutover' and 'tax', formatted as a numbered list.

> Show all Critical priority questions still Open.

> Group by Recipient — what's outstanding for each (Standard Ledger, R&D Consultant, Lawyer)?

---

## On the Stakeholders database

**Trust planning:**
> Show all entries where Knight Trust Beneficiary = true. What's their estimated marginal rate?

> Who are all the people who could be paid via ACT Pty employment?

---

## Cross-database (Notion AI handles searches across)

**Strategic synthesis:**
> Summarise this week's wins from the Friday Digest page and tell me what 3 actions to add to Action Items.

> Look at the Decisions Log and the Standard Ledger Q&A — which decisions are blocked waiting for advice?

> Compare our pile mix in the Money Metrics latest snapshot vs the FY27 target on the Money Framework page. What's the biggest gap?

> Read the CY26 Plan and tell me which checkpoints are due in the next 30 days.

---

## Tips for great prompts

1. **Be specific about properties.** "Bank Cash latest" is better than "current bank balance" — Notion AI looks for exact property names.
2. **Reference views/charts you want.** "as a bar chart" / "as a number widget with conditional formatting" / "in a table sorted by X".
3. **Set filters in the prompt.** "Filter to last 12 weeks" / "where Status=Open" / "in the next 30 days".
4. **Compare multiple sources.** Notion AI can read from multiple databases and pages — say "compare X with Y".
5. **Ask for actions, not just data.** "Build me a table" / "Create a page summary" / "Draft an email to..." get richer outputs.

---

## Things Notion AI WON'T do well (use scripts instead)

- Push data BACK to GHL or Xero — that's our `sync-notion-changes-to-ghl.mjs` and `xero-match-payment.mjs`
- Run complex SQL aggregations across millions of rows — that's our Supabase scripts
- Schedule things — that's PM2 cron in `ecosystem.config.cjs`
- Send alerts to Telegram — that's `telegram-money-alerts.mjs`

---

## Quick reference: each database URL

| DB | URL |
|---|---|
| Money Metrics | https://www.notion.so/807d55fb86f34edf8e92c82696ebd750 |
| ACT Opportunities | https://www.notion.so/a28b97ba80b248c89d3d65486d865a07 |
| Entity Hub | https://www.notion.so/59ea01f5101d46118f61c6a170a1910f |
| Decisions Log | https://www.notion.so/f8b0bfb6b5ad4b18829e15c4561f55e0 |
| Action Items | https://www.notion.so/6e92d3e0b5ce479987688f7bbb584f69 |
| Foundations | https://www.notion.so/1fcb4f9e887b415f9b3a1f0fe3bccfd2 |
| Standard Ledger Q&A | https://www.notion.so/10862028da234af18683ab0434ec8edf |
| Stakeholders | https://www.notion.so/06a4610ea02f444589814deac499306f |
