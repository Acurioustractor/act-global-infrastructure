---
title: GHL Cleanup + Pipeline Fill — 2026-05-06
status: Round 1 cleanup applied; round 2 ready to triage
date: 2026-05-06
audience: Ben, Nic
purpose: Track what was cleaned out of GHL (past-deadline), what's flagged for manual review (stale 90+ days), and what's ready to add (fresh ACT-fit grants from GrantScope).
tags:
  - ghl
  - cleanup
  - pipeline-fill
  - operations
parent: act-money-framework
---

# GHL Cleanup + Pipeline Fill — 2026-05-06

## What got cleaned (auto-applied)

**21 past-deadline grant opportunities marked Lost in GHL** ($4.36M notional pipeline retired):

| Grant | $ | Days overdue |
|---|---:|---:|
| R&D Tax Incentive | $1,000,000 | 309 |
| Community Impact and Innovation Grant — Aboriginal Investment NT | $1,000,000 | 5 |
| REAL Innovation Fund — Oonchiumpa Goods EOI | $1,200,000 | 64 |
| Ian Potter Foundation - Environment | $200,000 | 40 |
| Community Services Innovation Fund | $200,000 | 51 |
| Queensland Arts Project Fund | $150,000 | 51 |
| Ian Potter Foundation — Arts Program EOI | $150,000 | 54 |
| Building Community Resilience Grant | $100,000 | 51 |
| Regional Community Grants Program | $75,000 | 51 |
| QBE Foundation Local Grants 2026 | $50,000 | 50 |
| NAB Foundation Community Grants Round 1 | $50,000 | 50 |
| SCC Major Grants | $50,000 | 57 |
| Creative Australia — Arts Projects (Individuals) | $50,000 | 63 |
| 9 others <$50K each | various | various |

Also marked **3,156 GrantScope grants** as `archived` (deadline passed, were sitting in `discovered`).

## What needs manual review (Category 2 — stale >90d)

**25 GHL opps stale 90+ days, $1.23M notional** — these have no deadline data so the script doesn't auto-action. Open the Notion DB filtered by Stage=Open + sort by Last Synced asc, or run:

```bash
node scripts/cleanup-stale-ghl-opps.mjs       # lists them
```

The biggest stale items:

| Name | Pipeline | $ | Days stale |
|---|---|---:|---:|
| Goods. Wages | A Curious Tractor | $110,000 | 92 |
| Love's Creek Station - Build #1 | A Curious Tractor | $100,000 | 92 |
| On Country Photo Studio | A Curious Tractor | $68,200 | 92 |
| Central Australian Pilot | A Curious Tractor | $53,900 | 159 |
| Flood Stories | A Curious Tractor | $50,000 | 159 |
| First Greate Bed and workshop | A Curious Tractor | $37,620 | 92 |
| Qld Gives - Dec 25 | Grants | $30,000 | 139 |
| BG Fit - Qld gives | A Curious Tractor | $28,000 | 92 |
| 4 Festivals pipeline ($0 each — see hygiene review) | Festivals | $0 | 148 |
| 3 Goods Buyer Pipeline ($0) | Goods Buyer | $0 | 105 |

**Decision rule for each:** is this still alive? Yes → move stage. No → mark Lost. Unsure → ping the relationship owner.

## What's ready to add (15 fresh ACT-fit grants from GrantScope)

These have valid future deadlines (14-180 days), enriched foundation profiles, ACT-relevant size ($50K-$5M), and themes matching ACT work (indigenous / community / arts / social-justice / youth / health / employment / capacity-building):

| Grant | $ | Deadline | Funder | Themes |
|---|---:|---|---|---|
| Sidney Myer Creative Fellowships | $200,000 | 2026-07-01 | The Myer Foundation | arts, indigenous, health, education, environment, community, research, human_rights, youth |
| St Vincent's Curran Endowment Grants | $100,000 | 2026-08-05 | St Vincent's Curran Foundation | health, indigenous, community, human_rights |
| Sarcoma Accelerator Programme | $1,000,000 | 2026-06-30 | Cooper Rice-Brading Foundation | health |
| Australian Economic Equity Initiative | $50,000 | 2026-06-30 | The Judith Neilson Head Trust | arts, indigenous |
| Youth Development Pathway | $50,000 | 2026-06-30 | Creating Chances Trust | indigenous, community |
| Enablers Programme | $50,000 | 2026-06-30 | Chain Reaction Foundation | community, indigenous |
| Micro Business Enterprises Project | $50,000 | 2026-06-30 | Nova Peris Foundation | indigenous |
| John Monash Scholarship | $50,000 | 2026-06-30 | John Monash Foundation | education, indigenous |
| Emerging Artist Grants | $50,000 | 2026-06-30 | Ian Potter Cultural Trust | arts |
| Cunningham Fellows Program | $50,000 | 2026-06-30 | JW & M Cunningham Foundation | health |
| The Haven Project | $50,000 | 2026-06-30 | Property Industry Foundation | community |
| Project Tangaroa | $50,000 | 2026-06-30 | Major Projects Foundation | education, health, environment |
| Support for New Art Acquisitions | $50,000 | 2026-06-30 | Art Gallery Of NSW Foundation | arts |
| Research Funding Program | $100,000 | 2026-06-30 | KIF1A Australia Foundation | health |
| PCFA Community Grants Program | $50,000 | 2026-06-30 | Prostate Cancer Foundation | health |

**Top 5 to triage first** (highest ACT-fit by theme overlap):
1. **Sidney Myer Creative Fellowships** — $200K, broadest ACT theme match
2. **Australian Economic Equity Initiative** — $50K, Judith Neilson, indigenous arts focus
3. **Youth Development Pathway** — $50K, Creating Chances, ACT-CA / ACT-OO direct fit
4. **Enablers Programme** — $50K, Chain Reaction Foundation, community + indigenous
5. **Micro Business Enterprises Project** — $50K, Nova Peris Foundation, indigenous focus aligns with Goods + Oonchiumpa

To add to GHL: open the Grants pipeline → Create Opportunity → tag with project_code (suggested: ACT-CORE for cross-cutting, or specific project) → set monetary_value = amount_max → set deadline custom field → link contact (foundation primary contact from `foundations` table).

## Pipeline-fill ideas (structural, not just adding rows)

### Idea 1 — Add CivicGraph Commercial pipeline

Currently no commercial pipeline for CivicGraph. Even with zero customers, the pipeline structure clarifies the funnel:

```
Discovery → Demo → Trial → Paid → Renewal
```

First 5-10 prospects to seed: foundations / orgs that already use grant intelligence platforms, consulting firms working with ACNC charities, philanthropic peak bodies. CivicGraph Tier 1 buyers are typically peak bodies and philanthropic intermediaries.

### Idea 2 — Add Procurement / IPP pipeline (when JV launches)

Once the IPP-JV with Oonchiumpa is structured, create a Procurement pipeline:

```
Tender Discovery → Capability Statement → Tender Submitted → Won/Lost
```

Source feeds: NIAA tender alerts, AusTender, state government procurement portals. The Goods Demand Register $16M is mostly community-org demand; IPP unlocks government markets ~10× larger.

### Idea 3 — Convert Empathy Ledger to commercial pipeline

The 21 Empathy Ledger opps in GHL are all $0 (Identified stage). Either:
- Convert into a real commercial pipeline (Discovery → Scoping → Proposal → Engaged → Delivered) with realistic $ per relationship, or
- Move them to GHL Contacts (tagged "EL prospects") and remove the pipeline.

Current state (21 opps, no monetary signal) is the worst of both worlds — looks like pipeline but tracks nothing.

### Idea 4 — Goods — Buyer Pipeline needs $ estimates

13 of 18 Goods buyer opps have $0. Each "Outreach Queued" buyer should have a realistic estimate based on org size + Goods product mix (typically $5K-$50K per First Nations org for product orders).

### Idea 5 — Use GrantScope sweeps as a regular feed

32K grants discovered, 5 actively researching. This is a 99.98% triage gap. Recommendation:
- Run a weekly query for grants with deadline in next 60 days + ACT-fit themes (script: `scripts/cleanup-stale-ghl-opps.mjs --json` returns the data)
- Surface top 20 to a dedicated Notion view
- Add a "Triage" column to the ACT Opportunities database — Foundation-source rows should have a one-click "Add to GHL" flow

## What changed in the system after this round

- `grant_opportunities`: 3,156 rows moved from `discovered` → `archived`
- GHL: 21 opportunities marked `lost`
- GHL sync: timestamp gap closed (`createdAt` / `updatedAt` / `lastStageChangeAt` / `lastStatusChangeAt` now populated for 251 of 315 rows)
- Notion framework page: now shows staleness signal in "What's burning"
- New script: `scripts/cleanup-stale-ghl-opps.mjs` (idempotent, --apply gate)

## How to run it again

```bash
# After the next batch of grants pass their deadline:
node scripts/cleanup-stale-ghl-opps.mjs           # see what would be cleaned
node scripts/cleanup-stale-ghl-opps.mjs --apply   # apply
node scripts/sync-ghl-to-supabase.mjs             # refresh DB after
node scripts/sync-money-framework-to-notion.mjs   # refresh Notion
node scripts/sync-opportunities-to-notion-db.mjs  # refresh DB rows
node scripts/sync-pile-pages-to-notion.mjs        # refresh pile pages
```

Or just wait for Mon 8:00 AEST cron — all four sync jobs run automatically.
