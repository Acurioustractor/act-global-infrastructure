---
title: Goods on Country — the 3-pipeline operating model (need · procurement · support)
status: DECIDED 2026-05-28 — depth=B (wire the unit ledger) · denominator=curated priority slice (active+lead). Building roll-up; GHL field creation pending Tier-2 go.
date: 2026-05-28
author: Claude Code
domain: GHL (location agzsSZWgovjwgpcoASWG) + grantscope Goods data model
related:
  - memory goods-foundation-pipeline.md (CRM state)
  - grantscope thoughts/shared/plans/2026-05-28-goods-phase1-discovery-surface.md (PR #40)
---

# Goods on Country — one need, two funding routes, one delivery

## The core idea
Goods has **3 pipelines that are really one funnel**. A community has a NEED (beds + washing machines). That need gets met by **one of two funding routes** — a buyer who **pays** (procurement) or a funder who **donates** (support) — and both end in the same place: **delivery** of physical goods to a community.

```
                 ┌────────────────────────────────────────┐
                 │   NEED  —  "Goods — Demand Register"     │
                 │   72,134 beds · 8,430 washers needed     │   ← the denominator
                 │   1,542 communities · 940 live signals   │
                 └───────────────────┬──────────────────────┘
                   each signal = beds/washers a community needs
            ┌──────────────────────┴───────────────────────┐
            ▼                                                ▼
 ┌────────────────────────────┐              ┌────────────────────────────┐
 │ PROCUREMENT                 │              │ SUPPORT                     │
 │ "Goods — Buyer Pipeline"    │              │ "Goods Supporter Journey"   │
 │ buyer PAYS for the goods    │              │ funder DONATES $ for goods  │
 │ unit: beds + washers + $rev │              │ unit: $ committed → beds/   │
 │ (councils, ACCHOs, NT Housing)│            │ washers funded (foundations)│
 └──────────────┬─────────────┘              └──────────────┬─────────────┘
                └──────────────────┬────────────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  DELIVERY (impact rollups)    │
                    │  520 beds · 41 washers to date│
                    └──────────────────────────────┘
```

**Why this framing matters:** the Demand Register is the shared denominator. Procurement and Support are two ways to pay for the *same* beds. Today the three pipelines speak three different languages and don't share a unit — so you can't answer "how many beds are needed vs funded vs on-order vs delivered, and what's the $." This model fixes that with (a) a shared **unit ledger** and (b) a shared **stage spine**.

## The unit ledger (the thing that makes it manageable)
Every opportunity in all 3 pipelines should carry the same three numbers, so they roll up:

| Field | Demand Register | Buyer Pipeline | Supporter Journey |
|---|---|---|---|
| **Beds** | beds *needed* | beds *ordered* | beds the $ *funds* |
| **Washers** | washers *needed* | washers *ordered* | washers the $ *funds* |
| **$ value** | (est. cost to fulfil) | $ revenue (PO value) | $ committed (grant/donation/capital) |

That gives one roll-up management actually wants:

```
NEED        72,134 beds / 8,430 washers   (target)
 ├ FUNDED    $X committed (support) + $Y ordered (procurement)
 ├ ON ORDER  beds/washers in "Committed → In Delivery"
 └ DELIVERED 520 beds / 41 washers         (impact)
GAP = need − delivered
```

## A shared 5-stage spine (so 3 vocabularies become legible)
The pipelines keep their own nuance, but each stage maps to one spine stage for roll-up. The Buyer Pipeline's **12 stages** is the main manageability problem — it's a lot to keep moving.

| Spine | Demand Register | Buyer Pipeline (12→map) | Supporter Journey |
|---|---|---|---|
| **1 Identified** | Signal | Outreach Queued · First Contact | Identified · Qualified |
| **2 Qualified** | Buyer Matched | In Conversation · Qualified · Scoped | Cultivating |
| **3 Committed** | Converted | Proposed · Negotiating · Committed | Ask made · Committed |
| **4 Delivering** | — | In Delivery · Delivered | Delivering |
| **5 Closed** | — | Invoiced · Paid | Stewarding · Renewing |
| _Dead_ | Dormant | (lost) | Lapsed · Declined/Parked |

(Open question D1 below: collapse the Buyer Pipeline to ~6 real stages, or keep 12 and just map them.)

## What exists vs the gaps
**Exists:** all 3 GHL pipelines with stages; the demand data (`goods_communities` beds/washers/fridges/mattresses needed); buyer spend (`goods_procurement_entities`, $17.1B); the impact rollups (`assets` → 520 beds/41 washers, synced to GHL custom fields); the matcher (`goods-procurement-matcher.mjs`) that links signals→buyers→grants.

**Gaps (why it's not "manageable" yet):**
1. **No shared unit fields on opportunities.** GHL has "Beds delivered / Washers delivered" custom fields but no *needed* / *ordered* / *funded* fields — so nothing rolls up across the 3 pipelines.
2. **No single roll-up surface.** Nowhere shows need vs funded vs on-order vs delivered + $ in one view.
3. **Buyer Pipeline is 12 stages** — heavy to operate.
4. **Demand Register in GHL (102) ≠ the data (1,542 communities / 940 signals).** The GHL register is a curated slice; the relationship to the full demand data isn't defined.

## Proposed next steps (pick the depth)
- **A — Document only.** This model + the diagram become the canonical Goods operating-model doc (Notion + memory). No system changes. (Lowest effort; aligns everyone on language.)
- **B — Wire the unit ledger.** Add `Beds (needed/ordered/funded)`, `Washers (...)`, `$ value` custom fields to the 3 GHL pipelines + a script that rolls them up into one number set (Notion page or command-center panel). (Medium; makes it measurable.)
- **C — Full management surface.** B + collapse the Buyer Pipeline to the 5-stage spine + a live "Goods funnel" dashboard (need → funded → on-order → delivered, in beds/washers/$). (Highest; the real cockpit.)

## Curated cockpit — real numbers (2026-05-28)
Denominator = curated priority slice (`goods_communities` priority ∈ {active, lead} = 64 communities). Full addressable demand shown as the headline.

| Line | Beds | Washers | $ | Source |
|---|---|---|---|---|
| **NEED** (curated: active+lead) | **12,504** | **1,563** | — | `goods_communities` |
| _addressable (all 1,542)_ | _72,134_ | _8,430_ | — | `goods_communities` |
| **FUNDED / ORDERED** | (to capture) | (to capture) | ~$0 today | GHL Buyer+Supporter opps — `monetaryValue`=0 on the sample, no unit fields yet → **this is the gap the ledger fills** |
| **DELIVERED** | 520 | 41 | — | `assets` (Goods v2, synced to GHL contact rollups) |
| **GAP** (need − delivered) | **11,984** | **1,522** | — | computed |

Reality check from GHL: the Demand Register's 110 opps are **orgs/ACCHOs** (Katherine West Health, Laynhapuy…), all `monetaryValue:0` / no custom fields — so NEED comes from `goods_communities`, not GHL. Opportunity-level custom fields ARE supported (4 exist); the impact "Beds delivered" fields are contact-level.

## Build B — what gets wired
1. **2 GHL opportunity custom fields** (numeric): `Goods: Beds`, `Goods: Washing machines`. $ uses native opportunity `monetaryValue`. Meaning by pipeline: needed (Demand) / ordered (Buyer) / funded (Supporter).
2. **Backfill known deals** into Buyer Pipeline (from CRM memory): ALIVE 60 beds/$60K, Hewitt ~10 beds, PICC 40-bed reorder — set beds + `monetaryValue`.
3. **Roll-up script** (read-only) → the cockpit table above: NEED from `goods_communities` (active+lead) · ORDERED/FUNDED from GHL Buyer+Supporter (`monetaryValue` + the 2 fields) · DELIVERED from assets. Emits `.md`+`.json`; re-runs as the team fills fields.

## Decisions for Ben
- **D1 — Buyer Pipeline stages:** collapse 12 → ~6 (the spine), or keep 12 and just map for roll-up?
- **D2 — Depth:** A (document), B (unit ledger), or C (full cockpit)?
- **D3 — Demand denominator:** does the Demand Register track the *curated* slice (≈100 priority communities) or the *full* 1,542? (Drives whether "need" = a workable target or the total addressable demand.)
