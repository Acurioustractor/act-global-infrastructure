---
title: Funder briefs overlay (QBE-HQ pattern, generalised)
slug: funder-briefs-overlay-2026-05-23
status: shipped-mvp
created: 2026-05-23
owner: ben
related:
  - ghl-pipelines-supporter-integration-2026-05-23
  - act-communication-pipeline-2026-05-23-locked
---

# Funder briefs overlay

**Pattern from QBE Catalysing Impact HQ Notion page, generalised across all (funder × project) pairs.**

For each funder we're talking to about each project, capture once and surface everywhere:
1. **Asks from them** — what each funder has asked of us (with source + done flag)
2. **Ask from us** — what we're asking of them ($, outcome, status, decision-due date)
3. **Alignment** — does our pitch match codebase reality? PASS / WARN / FAIL + notes
4. **Procurement** — what we've actually delivered (e.g. 369 beds) + open demand (e.g. 350)
5. **Strategy fit** — their priorities × our matched claims
6. **Next move** — one specific action with owner + due date

## What shipped 2026-05-23

| Layer | What | Where |
|---|---|---|
| **Data** | `funder_briefs` Supabase table (12+ columns, unique on funder_slug × project_code) | Supabase |
| **Seed** | Snow Foundation × ACT-GD + QBE × ACT-GD (both from Goods Asset Register docs) | `scripts/seed-funder-briefs.mjs` |
| **API** | `/api/funder-briefs?funder=X&project=Y&status=Z` returning briefs + summary | command-center |
| **Project page** | "Funder Briefs" panel on `/finance/projects/[code]` showing all briefs for that project | `/finance/projects/ACT-GD` |
| **Supporter drawer** | "Briefs (N)" section showing all briefs across projects for that funder | `/supporters` drawer |

## How to add a new brief

Edit `scripts/seed-funder-briefs.mjs`, copy one of the existing entries, fill in for the new (funder × project) pair:

```js
{
  funder_slug: 'minderoo',                        // must match supporters_intelligence.slug
  project_code: 'ACT-GD',                          // must match project codes
  brief_title: 'Minderoo × Goods — May 2026',
  status: 'active',                                // active | shipped | stale | paused

  asks_from_them: [
    { ask: 'Convene field meeting in NT', source: 'lucy-stronach-2026-05', done: false },
    ...
  ],

  ask_amount_aud: 900000,                          // null if not yet quantified
  ask_outcome: 'Goods $900K/3yr scale-up',
  ask_status: 'in-review',                         // submitted | in-review | verbal-yes | declined | awarded | reporting-due
  ask_submitted_at: '2026-05-15',
  ask_decision_due: '2026-07-01',

  alignment_status: 'PASS',                        // PASS | WARN | FAIL
  alignment_notes: null,                            // populate if WARN/FAIL

  procurement_delivered_count: 369,
  procurement_unit: 'beds',
  procurement_demand_count: 350,
  procurement_notes: '...',

  strategy_their_priorities: ['First Nations', 'Climate resilience'],
  strategy_our_claims: ['40% profit share', '25kg plastic/bed'],

  next_move: 'Send revised proposal with field meeting agenda by 2026-06-01',
  next_move_owner: 'nic',
  next_move_due: '2026-06-01',

  notion_hq_url: 'https://www.notion.so/...',
  related_files: ['/Users/benknight/.../proposal.md'],

  last_feedback_date: '2026-05-10',
  last_feedback_summary: 'Lucy asked us to set up the NT field meeting before formal submission.',
}
```

Then run `node scripts/seed-funder-briefs.mjs --apply` (idempotent upsert by funder × project key).

## Where it shows up automatically

Once seeded:
- The brief appears on `/finance/projects/<that-project>` in the Funder Briefs panel
- The brief appears on `/supporters` drawer when you click on `<that-funder>`
- It's pulled into the daily morning rollup (eventually) and into the Telegram nudge if overdue

## Two known briefs (seeded 2026-05-23)

| Funder | Project | Alignment | Open asks | Next due | Ask $ |
|---|---|---|---:|---|---:|
| Snow Foundation | ACT-GD | WARN (bed count to verify) | 7 | 2026-03-15 (overdue) | $120K |
| QBE Catalysing Impact | ACT-GD | PASS | 4 | 2026-04-30 (overdue) | TBD |

Both currently flagged OVERDUE because seed dates reflect February submissions — replace with actual current-state dates as Ben/Nic resume work on each.

## Source docs (where to read full context)

- Snow: `/Users/benknight/Code/Goods Asset Register/SNOW_SUBMISSION_REVIEW_FEBRUARY_2026.md` — full Sally feedback + alignment check + 5-part section structure
- QBE: `/Users/benknight/Code/Goods Asset Register/Catalysing_Impact_Application_DRAFT.md` (application) + Notion HQ at `https://www.notion.so/acurioustractor/QBE-Catalysing-Impact-HQ-33febcf981cf804198f1ee881fa515b2`
- Goods strategy + market: `/Users/benknight/Code/Goods Asset Register/MARKET_INTELLIGENCE_2026.md`, `GO_TO_MARKET_THOUSANDS_2026.md`, `SUMMARY.md`

## Next briefs worth seeding (priority order)

1. **Minderoo × ACT-GD** — $900K/3yr Goods ask, Lucy Stronach as primary contact (per project memory)
2. **Centrecorp × ACT-GD** — 107 beds approved Jan 2026 (per Snow review); $265K outstanding; $300K won
3. **Paul Ramsay Foundation × multiple** — already paid, ongoing relationship (engineer Frazer)
4. **Dusseldorp Forum × ACT-CORE / ACT-HV** — paid + 11 waiting for response
5. **Standard Ledger × ACT-CORE** — finance/tax partner (not philanthropic but operational)
6. **QBE × ACT-EL or ACT-JH** — if QBE expands beyond Goods

Each takes ~5-10 minutes to fill in once the source docs are open.

## Why this pattern works

Today every funder conversation lives in:
- A Notion page (sometimes)
- A Gmail thread (always)
- A markdown doc on someone's laptop (sometimes)
- Ben/Nic's head (always)

The brief is **the structured slice that decides what we do next** — everything else is supporting context. Six fields (asks-from-them, ask, alignment, procurement, strategy, next-move) are enough to drive the operational decision; everything else stays in the underlying docs.

Surfacing the brief on both the supporter drawer AND the project page closes the gap: from a supporter, "what do they want for which projects?" From a project, "what does each funder want from this project?" Same data, two viewpoints.
