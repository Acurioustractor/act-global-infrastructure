---
title: ACT Business Architecture
status: Active
date: 2026-06-01
summary: One map of the whole ACT business — every project, what it is, its FY26 actuals, which entity holds it, and how money, grants and operations flow. The structural answer that the cutover, the money cockpit, and the public/management surfaces all hang off.
source_of_truth_for: entity trajectory of each project
relates_to: act-core-facts.md (legal entities) · four-lanes.md (money outflow) · five-year-cashflow-model.md (income layers)
---

# ACT Business Architecture

> ACT is not one company. It is a small group of entities, each holding a different kind of work, under one brand and one soul. This file maps which work lives where, what each project actually is, what it earns or costs, and how money and grants flow between them. If you want the legal facts, see [[../decisions/act-core-facts|ACT Core Facts]]. If you want the why, see [[soul|Soul]] and [[four-lanes|The Four Lanes]].

## The spine: five entity trajectories

Every ACT project sits on exactly one of these. This is the lens that tells you whether something becomes its own entity or stays inside the core.

1. **Core muscle** — held directly inside **A Curious Tractor Pty Ltd**. The platforms, the studio, the shared build. Funded by the earners and by grants.
2. **Commercial subsidiary** — its own Pty Ltd with a standalone P&L, because it earns its own way and the story needs to be legible. (The Harvest.)
3. **Country / DGR charity** — a charitable vehicle for grants, philanthropy and public benefit, governed by community. (Goods on Country, via The Butterfly Movement Ltd.)
4. **Partnership** — community-led and community-owned. ACT is a technical and strategic supporter, not the owner. (PICC, Oonchiumpa, Custodian First Economy, the Mount Isa cluster.)
5. **Future spinout (deferred)** — built inside the core for now, to be given its own entity only when it raises or proves revenue. (CivicGraph.)

## The whole business in one table

FY26 actuals are from the Xero mirror (cash basis, voided excluded). **Caveat:** per-code actuals undercount true project cost, because shared build and infrastructure is pooled in `ACT-IN` and `ACT-CORE`. So the platforms (EL, JusticeHub, CivicGraph) look cheaper than they are.

| Project | Code | FY26 net (in / out) | What it is | Trajectory | Home entity |
|---|---|---|---|---|---|
| **Innovation Studio** | ACT-IN | −$271K ($0 / $271K) | ACT's consulting + the shared build for every platform | Core muscle | A Curious Tractor Pty Ltd |
| **Regen Studio + infra** | ACT-CORE | −$266K ($3K / $270K) | act.place coordination + org overhead | Core muscle | A Curious Tractor Pty Ltd |
| **Empathy Ledger** | ACT-EL | +$2K* ($3K / $1K) | Consent + storytelling infrastructure used by every project; the connective tissue | Core IP (license out) | A Curious Tractor Pty Ltd |
| **JusticeHub** | ACT-JH | +$120K ($122K / $1K) | Youth-justice evidence platform; grant-funded | Core program | A Curious Tractor Pty Ltd |
| **CivicGraph** | (no code) | not in ACT books | Civic-intelligence SaaS; built to stand alone | Future spinout (deferred) | ACT Pty IP for now; own entity at raise/revenue |
| **The Harvest** | ACT-HV | +$92K ($187K / $95K) | Regenerative community hub, Witta | Commercial subsidiary | The Harvest Pty Ltd (ACT majority + landlord minority) |
| **ACT Farm / Black Cockatoo Valley** | ACT-FM | −$101K ($7K / $108K) | 150-acre conservation + practice land | Land + program | Land in Nic's trust (leased to ACT); programs run as ACT-FM. Farm Pty only if/when it earns |
| **Goods on Country** | ACT-GD | +$14K ($484K / $469K) | Recycled-plastic essential goods with remote communities | Country / DGR charity + commercial arm | **The Butterfly Movement Ltd** (charity, grants/DGR) + **ACT Pty** (commercial) + community production entities |
| **PICC** | ACT-PI | +$323K ($365K / $43K) | Palm Island, 100% community-controlled | Partnership | PICC (ACT is supplier/supporter) |
| **Oonchiumpa** | ACT-OO | +$26K ($103K / $77K) | Mparntwe, Aboriginal-led (Kristy Bloomfield, Tanya Turner) | Partnership | Oonchiumpa |
| **Custodian First Economy** | ACT-CE | −$145K ⚠️ | Youth-justice partner | Partnership | partner ⚠️ the −$145K is the TFN "Goods grant" miscoding, not real spend |
| **Mount Isa cluster (BG Fit etc.)** | ACT-BG, ACT-MY | small | Brodie Germaine's justice-reinvestment network | Partnership | community partners |

\* EL's true cost sits inside `ACT-IN`, not `ACT-EL`.

**FY26 totals:** income $1.39M · expense $1.57M · net **−$178K**.

## The economic truth

The platforms ACT is known for (Empathy Ledger, JusticeHub, CivicGraph) do not pay the bills; they are build-stage and burn, mostly hidden inside `ACT-IN`. The bills are paid by **partnership and service work (PICC +$323K), Goods trading, The Harvest, and grants (JusticeHub +$120K)**. The overhead (`ACT-IN` −$271K + `ACT-CORE` −$266K) is the cost of running the whole thing. This is why the core has to stay the holding muscle: the earners and the grants fund the platforms until the platforms earn.

## The entity tree

```
A Curious Tractor Pty Ltd  (ACN 697 347 676 · ABN 36 697 347 676)
│   the holding muscle + commercial/operational arm + R&D claimant
│   owned 50/50: Knight Family Trust + Marchesi Family Trust
│
├── Core: Innovation Studio · Regen Studio · Empathy Ledger · JusticeHub · CivicGraph (for now)
│
├── The Harvest Pty Ltd (forming)        ← commercial subsidiary; landlord minority shareholder
│
├── commercial arm of Goods on Country   ← product sales, procurement contracts, the trading engine
│
└── ACT Farm programs (ACT-FM)           ← on land held in Nic's trust, leased to ACT

The Butterfly Movement Ltd  (CLG charity, ex-TABOO Foundation)
│   the charitable + grants/DGR home for Goods on Country (DGR pending)
│   Indigenous-majority board (Kristy Bloomfield, Audrey Deemal; Sonia transition director)
│   handover 26 Jun 2026
└── funds access, relief, training, and community-owned production

A Kind Tractor Ltd  (CLG charity, ACN 669 029 341)  ← dormant; NOT the Goods vehicle; general DGR backstop only

Nicholas Marchesi sole trader  (ABN 21 591 780 066)  ← winding down; trading ceases 30 Jun 2026
```

## How money and grants flow

- **Income comes in by Pile** (Voice / Flow / Ground / Grants — see [[four-lanes|The Four Lanes]] and [[five-year-cashflow-model|the cashflow model]]). Voice = Empathy Ledger bespoke. Flow = CivicGraph MRR + Minderoo + JusticeHub + Goods. Ground = Harvest + Farm + eco-tourism. Grants = philanthropic capital across all.
- **Commercial revenue and contracts** land in **A Curious Tractor Pty Ltd** (and in The Harvest Pty Ltd for Harvest trading).
- **Grants and philanthropy for Goods** land in **The Butterfly Movement Ltd** (tax-deductible once DGR is endorsed; auspiced in the meantime).
- **Money flows out by Lane** (To Us / To Down / To Grow / To Others — see [[four-lanes|The Four Lanes]]). Staffing is mostly the To Us lane.
- **R&D is claimed by A Curious Tractor Pty Ltd only** — it is the one taxable company. The charity (income-tax-exempt) cannot claim the R&D Tax Incentive, so Goods manufacturing R&D is incurred and claimed by ACT Pty. (FY26 eligibility across the cutover is under written query with Standard Ledger; see the cutover tax red-flag.)

## Open structural items (need Standard Ledger / legal)

- **Goods commercial vs charity split** — which Goods revenue is commercial (→ ACT Pty) vs grant/philanthropy (→ Butterfly), and the related-party safeguards between the two. The cutover mapping flags every `ACT-GD` line `GOODS-SPLIT` for this classification.
- **Goods brand / IP ownership** — charity vs ACT Pty.
- **The Harvest subsidiary terms** — % split, profit-share trigger, the landlord's minority shareholding.
- **CivicGraph form at spinout** — Pty-with-cap-table vs co-operative, decided when it raises.
- **FY26 R&D eligibility across the cutover** — the pre-incorporation question (see `thoughts/shared/financials/2026-06-01-sl-rd-eligibility-question.md`).

## Cross-references
- [[../decisions/act-core-facts|ACT Core Facts]] — the legal entities, people, project codes (this file is the trajectory layer on top of it)
- [[four-lanes|The Four Lanes]] — how money flows out (note: this file supersedes its "Farm Pty forming" line — Farm stays land-in-trust + program until it earns)
- [[five-year-cashflow-model|Five-Year Cashflow Model]] — the income layers and projections
- [[act-ecosystem|ACT Ecosystem]] — the narrative cluster map
- `goods-butterfly-structure` (memory) + the two Notion pages — the Goods × Butterfly transition
