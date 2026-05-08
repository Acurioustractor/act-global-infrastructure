---
title: Pile-Tagged Opportunity Workspace — Unified Architecture
status: Decision + active build
date: 2026-05-06
audience: Ben, Nic
purpose: Design decision for how Notion + GoHighLevel + CivicGraph + GrantScope link into one pile-tagged opportunity workspace, so foundation/procurement research is automated and the framework's $ flow is always live.
tags:
  - decision
  - notion
  - ghl
  - civicgraph
  - grantscope
  - opportunities
  - workspace
---

# Pile-Tagged Opportunity Workspace — Unified Architecture

> **Decision.** Keep one canonical Notion page (ACT Money Framework) as the human interface. Pull live data from a single Supabase source of truth that already aggregates GHL, CivicGraph, and GrantScope. Tag every opportunity with a pile (Voice/Flow/Ground/Grants) using existing project_code mapping. Don't build per-pile sub-pages until the framework page proves it's not enough.
>
> **Why.** Building separate pile pages adds complexity without adding signal. The current framework page already shows pipeline by pile. The real bottleneck is *tagging* — not viewing.

---

## The four systems and how they connect

```
┌───────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
│  GoHighLevel      │  │   CivicGraph        │  │   GrantScope       │
│  (CRM / deals)    │  │   (org intelligence)│  │   (grant database) │
│                   │  │                     │  │                    │
│  • 297 open opps  │  │  • 4,729 orgs       │  │  • 32,059 grants   │
│  • $31M pipeline  │  │  • 668 emails       │  │    discovered      │
│  • Pipelines:     │  │  • 751 phones       │  │  • $23B total      │
│    Goods Demand   │  │  • Foundation       │  │  • 5 researching   │
│    Grants         │  │    profiles         │  │  • 4 submitted     │
│    A Curious      │  │  • Funding history  │  │                    │
│    Tractor, etc.  │  │                     │  │                    │
└────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘
         │                        │                       │
         │ webhook + polling      │ enrichment            │ scraping + sync
         ↓                        ↓                       ↓
   ┌──────────────────────────────────────────────────────────────┐
   │                      Supabase (shared)                        │
   │  ghl_opportunities    │  civicgraph_orgs   │  grant_opps      │
   │  + project_code       │  + tier            │  + pipeline_stage│
   │                       │  + funder_history  │  + amount_max    │
   └──────────────────────────────────────────────────────────────┘
                                   │
                  pile mapping (project_code → pile)
                                   │
                                   ↓
   ┌──────────────────────────────────────────────────────────────┐
   │                  Notion: ACT Money Framework                  │
   │  Panel 1 — Entity ledger (bank, retained, trusts)             │
   │  Panel 2 — Pile income (FY26 actual vs FY27 target)           │
   │  Panel 3 — Channel flow (28 money movements)                  │
   │  Panel 4 — Founder take YTD                                   │
   │  Panel 5 — Compliance flags                                   │
   │  Panel 6 — Cash trend + 13-week forecast                      │
   │  Panel 7 — Pipeline by pile (GHL open opps)                   │
   │  Panel 8 — Opportunity actions (auto-derived)                 │
   │  Panel 9 — Open questions for Standard Ledger                 │
   └──────────────────────────────────────────────────────────────┘
```

---

## What's already automated

| Flow | Script | Cadence | Status |
|---|---|---|---|
| GHL deals → Supabase | `sync-ghl-to-supabase.mjs` | webhook + nightly | ✅ active |
| GHL deals → Notion grant pipeline | `sync-ghl-to-notion.mjs` | nightly | ✅ active |
| GrantScope → Supabase | (in grantscope repo) | scraper | ✅ active |
| GrantScope → Notion grant pipeline | `sync-grantscope-to-notion.mjs` | nightly | ✅ active |
| CivicGraph orgs → Supabase | (own pipeline) | continuous | ✅ active |
| Money framework → Notion | `sync-money-framework-to-notion.mjs` | weekly Mon 8:15 | ✅ active (just added) |
| Notion stages → GrantScope | `sync-notion-stages-to-grantscope.mjs` | nightly | ✅ active |

**Bottom line:** the data plumbing exists. The new framework page sits on top of it and adds the pile dimension.

---

## What's NOT automated (the actual gaps)

### Gap 1 — Pile tagging at deal creation

GHL deals have `project_code` but not `pile`. Pile is derived in the framework script via a hardcoded map (`PILE_BY_PROJECT`). This works but means:
- Adding a new project requires a code change
- Pile drift between framework and other dashboards is possible
- No "pile" filter in GHL itself

**Fix (small):** add a `pile` column to `ghl_opportunities` derived from project_code via a Supabase trigger or a nightly backfill job. Already 100% mappable for coded opps; uncoded ones need manual triage anyway.

### Gap 2 — Foundation research drill-through

Today: a grant in GrantScope is just a row. To research the funder you have to leave the system, search elsewhere, come back.

Wanted: **click any grant in the framework → see the funder's CivicGraph profile (orgs.id, contacts, prior funding history, related projects)**.

**Fix (medium):** join `grant_opportunities.funder_name` → `civicgraph_orgs.name` (fuzzy match). Add the CivicGraph org URL as a column. Surface in Panel 9 (foundation research) of the framework page.

### Gap 3 — Procurement (IPP) opportunity surfacing

Today: GHL opportunities are mixed (grants + commercial + procurement). No filter for "Federal/state procurement under IPP."

Wanted: explicit pipeline / tag for procurement opportunities so the IPP-JV (framework E2) has a real target list.

**Fix (medium):** add a `Procurement` GHL pipeline. Tag all Federal/state-government-source opportunities. Mirror to Notion as Panel 10 (procurement).

### Gap 4 — Conversion velocity tracking

Today: 32,059 grants discovered, 5 researching, 4 submitted. That's a 1.25% triage rate. No one knows which ones got discarded vs forgotten.

Wanted: **for each pile, conversion funnel** — discovered → triaged → researching → applying → won/lost — with per-stage time.

**Fix (medium):** add `triaged_at`, `discarded_at`, `discard_reason` columns. Compute conversion velocity in framework Panel 8 (actions).

---

## How the pile workspace serves the user goals

> "we us our piles of opportunity and try to build real $ and help to align with what we have built in the past"

| User goal | How the workspace serves it |
|---|---|
| **See $ flow simply** | Framework Panel 1-3 — entity ledger, pile income, channel flow, all live from Xero |
| **See opportunities by pile** | Panel 7 — GHL open opps mapped to pile, vs FY27 target |
| **Automated** | Cron Mon 8:15 + manual `node scripts/sync-money-framework-to-notion.mjs` anytime |
| **Foundation research** | Panel 9 (planned) — grants linked to CivicGraph org profiles |
| **Procurement research** | Panel 10 (planned) — IPP-eligible opps from procurement pipelines |
| **Easy / simple** | One Notion page. One refresh command. No new tools. |

---

## Decision: build vs. defer

### Build now (next session, ~2 hrs)

**Gap 1 — pile tagging propagation.** Backfill `pile` onto `ghl_opportunities` and `grant_opportunities`. Lock the pile map to a single config file (`config/pile-mapping.json`) used by the framework script + future tools.

**Gap 2 — foundation research drill-through.** Add Panel 9 to the framework: top 10 untriaged grants × CivicGraph org profile link. This makes "I want to research a funder" a 1-click action.

### Build later (when current view proves insufficient)

- Per-pile Notion sub-pages (only if framework page becomes too dense)
- Procurement pipeline + Panel 10 (only after IPP JV conversation with Oonchiumpa lands)
- Conversion velocity tracking (only after triage capacity exists — currently there's no one to triage 32K grants)

### Don't build

- New CRM / new database — Supabase + GHL + Notion is enough. Adding a fourth tool fragments the truth.
- Foundation-research workflow inside Notion — that lives in CivicGraph (the actual research platform). Notion is a view, not a workspace for org-level research.
- Per-funder Notion pages — already exist conceptually in CivicGraph. Don't duplicate.

---

## What the framework page IS — and isn't

**IS:**
- The single live view of $ flow + pile alignment + open opportunities
- Refreshable in <2 minutes by anyone with the script
- Actionable — Panel 8 surfaces auto-derived next moves

**ISN'T:**
- A research workspace — that's CivicGraph + GrantScope
- A CRM — that's GoHighLevel
- A finance system — that's Xero + the money-alignment cockpit at `/finance/money-alignment`
- The strategy doc — that's the framework wiki page itself

---

## Refresh + access

| Need | Command |
|---|---|
| Refresh Notion page now | `node scripts/sync-money-framework-to-notion.mjs` |
| Local markdown snapshot | `node scripts/sync-money-framework-to-notion.mjs --markdown` |
| Preview without writing | `node scripts/sync-money-framework-to-notion.mjs --dry-run --verbose` |
| Set up weekly auto-refresh | `./dev cron && pm2 save` (one-time; cron entry at 8:15am Mon AEST already in `ecosystem.config.cjs`) |
| Tag GHL opportunities | `/align-ghl` skill (existing) |
| Research a foundation | Open CivicGraph; future: drill from Notion Panel 9 |

---

## Cross-references

- [act-money-framework.md](../finance/act-money-framework.md) — main framework doc
- [fy26-voice-flow-gap-analysis.md](../finance/fy26-voice-flow-gap-analysis.md) — strategic gap reading from the data
- [civicgraph.md](../projects/civicgraph.md) — CivicGraph project page
- Notion page: "ACT Money Framework" under Finance Overview (page ID `357ebcf9-81cf-8101-bc12-dd5eab9ebec5`)
- Cron entry: `ecosystem.config.cjs` — `money-framework-sync`, Mon 8:15am AEST
- Pile mapping: top of `scripts/sync-money-framework-to-notion.mjs`
