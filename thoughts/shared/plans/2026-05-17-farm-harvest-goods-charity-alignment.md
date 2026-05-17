---
title: "Farm + Harvest + Goods charity — structural & insurance alignment"
status: draft
date: 2026-05-17
parent: act-entity-migration-checklist-2026-06-30
review_needed: standard-ledger
---
# Farm + Harvest + Goods charity — structural & insurance alignment

> Companion to `act-entity-migration-checklist-2026-06-30.md`. The migration checklist covers the operating entity cutover (sole trader → A Curious Tractor Pty Ltd). This doc covers the **three sub-entities** that sit alongside the Pty: The Farm (Nic's, separate), The Harvest (subsidiary), and the new Goods on Country charity. Each has distinct insurance, trademark, and R&D implications that the checklist doesn't yet pin down.

## 1 · The five-entity picture (target state, post-30-June)

```
                   ┌─────────────────────────────────────┐
                   │  A Curious Tractor Pty Ltd          │
                   │  ACN 697 347 676 · trading from     │
                   │  1 Jul 2026 · 50/50 Knight + Marchesi│
                   │  Family Trusts                      │
                   └──────────────┬──────────────────────┘
                                  │
            ┌─────────────────────┼──────────────────────────────┐
            │                     │                              │
            ▼                     ▼                              ▼
   ┌──────────────────┐  ┌──────────────────────────┐  ┌──────────────────────┐
   │ Harvest Pty Ltd  │  │ Goods Commercial Pty Ltd │  │ A Kind Tractor Ltd   │
   │ (subsidiary)     │  │ (subsidiary — when scale │  │ ACN 669 029 341      │
   │ ACT majority +   │  │  justifies; today, Goods │  │ dormant · NOT DGR    │
   │ landlord minority│  │  trades inside parent)   │  │ FUTURE disposition   │
   │ via profit-share │  │                          │  │ decision pending     │
   └──────────────────┘  └────────────┬─────────────┘  └──────────────────────┘
                                      │ brand licence
                                      ▼
                         ┌──────────────────────────┐
                         │ The Butterfly Movement   │
                         │ Ltd (DGR1 charity)       │
                         │ Post-AGM-swap board:     │
                         │ Kristy Bloomfield        │
                         │ (Oonchiumpa)             │
                         │ Nicholas Marchesi OAM    │
                         │ Benjamin Knight          │
                         │ Eloise Hall (continuity) │
                         │ Holds: "Goods on Country"│
                         │ DGR1 status + trademark  │
                         └──────────────────────────┘

                   ┌─────────────────────────────────────┐
                   │  THE FARM (separate, Nic's)         │
                   │  Held in trust or personally        │
                   │  Pty leases from Nic at arms-length │
                   │  market rate · NOT in ACT books    │
                   └─────────────────────────────────────┘
```

## 2 · The Farm — structural decisions outstanding

### Status today
- Owned by Nic personally (or to-be-established Marchesi land trust — confirm)
- ACT Pty rents space for residency, retreats, R&D field activity
- ACT-FM cost code tracks ACT spend on Farm operations from this side of the lease

### Decisions to lock before 30 Jun

| Decision | Why now | Who | Status |
|---|---|---|---|
| **Who is the legal lessor?** Nic personally, or via a land-holding trust | Affects market rate negotiation + Nic's personal asset protection | Nic + Standard Ledger | Open |
| **Arms-length market rate** | Required for R&D claim defensibility — ATO scrutinises related-party rent | Standard Ledger to advise (commercial valuation reference) | Open |
| **Lease term + termination** | Pty needs continuity for R&D evidence (field site stability); Nic needs flexibility if farm income strategy changes | Both | Open |
| **What ACT pays for: rent only, or rent + utilities + maintenance** | Maintenance reimbursement gets complex if Nic owns the asset | Standard Ledger | Open |
| **Capital improvements** — if ACT funds farm infra (sheds, fencing, water) does Pty own them or are they leasehold improvements | Tax + asset register implications | Standard Ledger | Open |

### Insurance — Farm

| Type | Held by | Why |
|---|---|---|
| **Building + contents (homestead, sheds)** | Nic (lessor) | Standard for landlord. Should name Pty as interested party for ACT-owned equipment on site. |
| **Public liability for ACT activity on Farm** | A Curious Tractor Pty Ltd | Residencies, retreats, workshops on Farm = ACT's events. PL $20M policy covers these. |
| **Workers comp for any staff working on Farm** | Whoever employs them | If ACT-employed: covered by ACT's WorkCover. If a Farm operations person Nic engages: separate. |
| **Specialty (eg. eco-tourism)** | Nic (if/when Farm starts trading) | Out of scope for ACT — Nic's separate vertical |

### R&D implications
- Farm rent paid by Pty = R&D-supporting expense (residency, retreats = R&D field site activity)
- For R&D claim defensibility: lease must be in writing, market rate, properly invoiced, evidence of R&D activity conducted on site (residency dates, attendees, outputs)
- **Risk:** If lease is informal or below-market, ATO can disallow the deduction AND treat it as Division 7A loan (loan from company to director-related party). Standard Ledger D11.2 work covers this.

---

## 3 · The Harvest — structural decisions

### Status today (from `wiki/decisions/2026-05-harvest-subsidiary-structure.md` decision page)
- Will incorporate as a Pty Ltd subsidiary of A Curious Tractor Pty Ltd
- Philanthropist landlord (ex-logistics, ~$60M exit) holds minority share under profit-share arrangement
- Pre-trading; September 2026 public opening
- Regional Arts Australia grant secured for renovations

### Decisions to lock before incorporation

| Decision | Why now | Who | Status |
|---|---|---|---|
| **% split between ACT Pty (majority) and landlord (minority)** | Drives every downstream deal — dividends, votes, exit | Ben + landlord + Standard Ledger lawyer | Open (D11.1) |
| **Profit-share trigger** — at what point does landlord start receiving distributions vs reinvesting | Landlord wants hands-off + simple reporting; need clear waterfall | Ben + landlord | Open |
| **Voting / board structure** | Affects landlord involvement in operational decisions | SHA drafting | Open |
| **Pre-emption rights** | Standard SHA term — what happens if either party wants out | SHA drafting | Open |
| **Exit mechanism** | 5-year horizon + landlord's age/health profile = exit will come | SHA drafting | Open |
| **Lease counterparty (Harvest subsidiary or Pty?)** | Should be in Harvest subsidiary's name from day 1 — not parent Pty, not Nic's sole trader (§1 migration checklist already updated) | Ben | Open |
| **Services agreement Pty → Harvest** | ACT founders' time on Harvest strategy needs to be billable Pty → Harvest (per founder pay thesis §5 Vertical B). Without it, R&D claim leaks. | Standard Ledger | Open |
| **Chart of accounts + tracking categories** | Re-use ACT's; copy via `config/xero-chart-import.csv` + `scripts/seed-xero-tracking.mjs` (D11.1) | Ben | Pre-built, awaiting incorporation date |

### Insurance — Harvest

| Type | Held by | Required by | Notes |
|---|---|---|---|
| **Public liability $20M** | Harvest subsidiary | Lease signing (NOT before) | Cafe + retail + venue + events = high public exposure |
| **Product liability** | Harvest subsidiary | First product sale | Coffee, food, retail items |
| **Building / contents** | Negotiated with landlord per lease | At fit-out | Capital improvements by Harvest = leasehold improvements (Harvest's asset register) |
| **Workers compensation** | Harvest subsidiary | First employee | Likely staff cafe + retail; separate WorkCover registration to ACT Pty |
| **Liquor liability** (if licensed) | Harvest subsidiary | Liquor licence application | If events serve alcohol |
| **Event-specific cover** | Harvest subsidiary or per-event riders | Each event | Workshops + venue hire |
| **Directors & Officers** | Harvest subsidiary directors | Within 30 days of incorporation | Standard practice |

### R&D implications
- **Harvest is NOT R&D activity.** It's operational retail + hospitality + venue trading.
- This separation is **critical for ACT Pty's R&D claim defensibility.** Mixing operational hospitality income/expense into Pty's books would dilute the R&D share of total spend and trigger ATO scrutiny.
- Founders' time on Harvest strategy IS R&D-supporting only if billed Pty → Harvest under the services agreement (so the cost lives in Harvest's books, not Pty's R&D-eligible base).

---

## 4 · Goods on Country DGR1 — Butterfly Movement transition (decided 2026-05-14)

> **Correction 2026-05-17:** An earlier draft of this doc recommended "activate A Kind Tractor Ltd as the Goods charity (Option C)". That was wrong. The actual structure was already decided 2026-05-14 via the **Butterfly Movement Ltd transition** (Notion Decisions Log, status: Decided). The detail below replaces the prior Option A/B/C analysis.

### Status today
- Goods on Country currently trades through Nic's sole trader (ABN 21 591 780 066); migrates to A Curious Tractor Pty Ltd at cutover, then to a dedicated Goods commercial vehicle as scale demands
- goodsoncountry.com.au — manufacturing + sales + distribution
- Active Indigenous Procurement Policy (IPP) discussions with Oonchiumpa
- Co-design relationships with Fred Campbell (Oonchiumpa, Western Arrernte) + others
- Product P&L: $550-850/unit institutional pricing, 50-55% gross margin at scale

### Decided structure — Butterfly Movement Ltd → Goods DGR1 home

The TABOO Foundation's existing charity vehicle, **The Butterfly Movement Ltd** (DGR1, established for the TABOO brand), is being transitioned to become Goods on Country's charitable home via **director swap at AGM** — NOT an entity close + new-entity registration.

**Mechanics**
- Eloise Hall (TABOO) introduced 2026-05-12
- John Cranwell (current chair) call held 2026-05-14 5pm AEST
- Sonia (current board, legal/tax) — early meeting needed before mid-late June
- AGM mechanics: 21-day AGM notice + 28-day director nomination notice; AGM cannot run before 30 Jun (FY close); earliest realistic AGM mid-July 2026
- Adelaide visits 2026-06-01 + second-last week June

**Proposed new board (after AGM swap)**
- Kristy Bloomfield (Oonchiumpa, founding director — Indigenous leadership)
- Nicholas Marchesi OAM
- Benjamin Knight
- Eloise Hall (continuity from TABOO board)

**Transferring at director swap**
- DGR1 charitable status (the load-bearing asset)
- Nothing else: no financial assets, no IP, no stock, no trademarks (precedent: TABOO retained these)

**NOT transferring**
- Butterfly Movement remains the same legal entity (continuity of DGR1 — a new entity would have to apply for DGR1 from scratch, ~6-12 months)
- The TABOO brand stays with TABOO; Butterfly Movement post-swap operates under a brand-licence model for "Goods on Country" use
- A Curious Tractor Pty Ltd remains the commercial parent
- A Kind Tractor Ltd stays dormant (separate dormant-charity disposition decision needed — see open decisions §7)

### Goods commercial entity (separate from charity)

Goods commercial trading does NOT live inside Butterfly Movement Ltd — DGR1 charities can't be the primary commercial vehicle without compromising endorsement. Commercial options being considered:

- **Stay inside A Curious Tractor Pty Ltd** for now (simplest; consolidates with rest of ACT) — works until Goods volume justifies separation
- **Goods Commercial Pty Ltd** subsidiary of A Curious Tractor Pty Ltd — incorporate when (a) IPP-eligible contract requires Indigenous JV partner ownership shape, or (b) annual revenue passes ~$500K and contamination of R&D base becomes a concern
- **JV with Oonchiumpa** — depending on whether IPP procurement contracts require >50% Indigenous ownership, structure as JV with Oonchiumpa-led commercial entity holding majority

The trigger for incorporating Goods Commercial Pty is **whichever comes first: first IPP-eligible contract OR FY27 Q2 revenue review**.

### Brand-licence model

Per the decision, Goods on Country uses a brand-licence structure mirroring the TABOO precedent:
- **Butterfly Movement Ltd** (DGR1 charity, post-swap board) is the **brand-licence grantor** for "Goods on Country" — receives charitable donations + uses funds for capacity-building, co-design, community training, community capacity work
- **Goods commercial entity** (A Curious Tractor Pty Ltd today; Goods Commercial Pty Ltd later) is the **brand-licence holder** — manufactures, sells, distributes; pays a brand-licence fee back to Butterfly Movement annually OR per-unit royalty
- Royalty structure to be negotiated as part of post-AGM director onboarding

### Insurance — Goods (charity side + commercial side)

| Type | Held by | Why |
|---|---|---|
| **Public liability $20M** | Butterfly Movement post-swap + commercial entity (separately) | Charity holds for co-design / community visits / capacity events; commercial holds for deployments + buyer-side events |
| **Product liability** | Commercial entity | Manufactured products in homes, including remote and vulnerable contexts. High-limit ($20M+). |
| **Cargo / freight** | Commercial entity | Stock in transit to remote communities |
| **Stock + plant** | Commercial entity | Manufacturing equipment, raw materials, finished inventory |
| **Professional indemnity** | Both | Design + advisory work to communities |
| **Cyber** | Both | Community data + supplier data |
| **Recall cover** | Commercial entity | Manufactured product recall is expensive; specialty cover |
| **Directors & Officers** | Butterfly Movement (post-swap board) | Standard for charity directors; first 30 days post-AGM |

### R&D implications

- **R&D-eligible activity sits with the commercial entity**, not the charity. Novel product engineering (HDPE structural design for extreme conditions), co-design methodology platform, AI-augmented buyer-matching, identity-verification for Indigenous supplier panel.
- **Goods commercial revenue defends the R&D claim** — ATO sees real commercial trading, not a grant-funded research outfit.
- **Charity-side spend (training, community capacity, co-design facilitation) is NOT R&D-eligible** — it's charitable mission work, properly attributed to Butterfly Movement post-swap.
- **Risk:** If commercial trading remains inside A Curious Tractor Pty Ltd as Goods volume scales, the manufacturing volume could distort Pty's R&D share of total spend. Better to subsidiary it once volume is material (~$500K annual or first IPP contract).

### Decisions still to lock (post the Butterfly Movement parent decision)

| Decision | Who | Deadline |
|---|---|---|
| **Goods commercial entity timing** — stay in A Curious Tractor Pty Ltd vs incorporate Goods Commercial Pty | Ben + Nic + SL | FY27 Q2 review OR first IPP contract |
| **Brand-licence terms** — annual fee vs per-unit royalty + amount | Both boards (Butterfly post-swap + ACT) | Post-AGM (mid-July+) |
| **JV with Oonchiumpa for IPP eligibility** — % split + governance + IPP threshold | Ben + Oonchiumpa leadership + lawyer | Tied to first IPP-eligible contract |
| **AGM date confirmation** | John Cranwell + new board candidates | Once Sonia (legal/tax) meeting held |
| **Sonia meeting (legal/tax review)** | Ben + Sonia | Before mid-late June 2026 (per current handoff) |
| **A Kind Tractor Ltd disposition** — given Butterfly is now the DGR1 home, wind up AKT or keep dormant? | Ben + Nic + SL | Post-cutover (FY27 Q1) |
| **"Goods on Country" trademark filing — held by Butterfly Movement post-swap (per brand-licence model)** | Lawyer (trademark attorney) | Before Goods Commercial Pty starts trading independently OR before AGM if continuity matters |

---

## 5 · Trademark strategy

The user flagged trademark especially for Goods given the charity decision. Here's the consolidated view across all four entities:

| Brand | Recommended trademark holder | Why |
|---|---|---|
| **A Curious Tractor** | A Curious Tractor Pty Ltd | Parent operating entity; mark filed at registration |
| **The Harvest** | A Curious Tractor Pty Ltd OR Harvest Pty Ltd subsidiary | If subsidiary will exit eventually, mark sits in parent to preserve continuity. If long-term standalone, sits in subsidiary. **Recommendation: parent.** |
| **Goods on Country** | **Butterfly Movement Ltd** (post-AGM swap — the DGR1 charitable home) | Custodial brand sits with the charity per the brand-licence model (TABOO precedent). Commercial entity licenses the mark. Protects the mission from commercial exit scenarios. |
| **Empathy Ledger** | A Curious Tractor Pty Ltd | Core methodology + platform; licensable to partners |
| **JusticeHub** | A Curious Tractor Pty Ltd | Same |
| **ALMA (Australian Living Map of Alternatives)** | A Curious Tractor Pty Ltd | Methodology mark |
| **LCAA (Listen → Curiosity → Action → Art)** | A Curious Tractor Pty Ltd | Methodology mark |
| **Aesthetics of Asymmetry** | A Curious Tractor Pty Ltd | Methodology mark |

### Filing priority (sequenced)

1. **A Curious Tractor + The Harvest** — file as soon as Pty has ABN (May 2026). Cheap insurance against squatters.
2. **Goods on Country** — file in name of **Butterfly Movement Ltd** before the AGM director swap completes (so the mark is locked in the charity before any commercial expansion). Brand-licence agreement defines the commercial entity's use.
3. **Empathy Ledger + JusticeHub** — file before either platform is licensed to a third party.
4. **ALMA + LCAA + Aesthetics of Asymmetry** — file before any publication that makes them the foundation of a public-facing book or campaign.

**Trademark attorney:** Standard Ledger has not been engaged on trademark. Need a separate trademark attorney referral (Standard Ledger may have one; if not, IP Australia's panel).

**Estimated cost:** ~$400-600/mark for filing + agent fees; total spend across all 8 marks ~$3-5K. Worth doing.

---

## 6 · How this changes the migration checklist

| Migration checklist item | Updated treatment |
|---|---|
| §1 Harvest lease — currently "ASSIGN via new lease in Pty name" | **Change to: lease counterparty = Harvest Pty Ltd subsidiary (newly incorporated), NOT parent A Curious Tractor Pty Ltd.** Update §D11.1 owner row. |
| §1 Farm lease — currently "NEW LEASE with Nic as lessor, Pty as lessee" | Confirmed. Add to scope: who is legal lessor (Nic personally or land trust) — Standard Ledger decision needed. |
| §6 Trademarks — currently "REGISTER in Pty name" for Goods | **Change to: REGISTER in Butterfly Movement Ltd name** (the DGR1 charitable home post-AGM-swap). Brand-licence agreement defines commercial entity's use. Separate trademark attorney engagement needed; not SL scope. |
| §6 IP assignment deed — currently "Nic assigns to Pty" | Confirmed for everything EXCEPT Goods brand-specific IP, which sits with Butterfly Movement Ltd post-swap (no IP transferring from TABOO — per the decision). |
| §1 Goods on Country buyer relationships — currently "NOVATE" | **Reframe:** in the short term, novate from sole trader → A Curious Tractor Pty Ltd at cutover (commercial entity remains inside parent). When Goods Commercial Pty Ltd is later incorporated (FY27 Q2 trigger), second-stage transfer to that entity. |
| §8 Insurance — currently "PL $20M before Harvest lease signing" | Confirmed for Harvest. **Additionally**: Butterfly Movement post-swap needs PL $20M + D&O (charity side); Goods commercial entity (A Curious Tractor Pty Ltd today, Goods Commercial Pty Ltd later) needs PL $20M + product liability + recall cover before first independent institutional sale. |

---

## 7 · Open questions (gating decisions)

- [ ] **Butterfly Movement AGM date confirmation** (current target: mid-July; needs Sonia legal/tax meeting first) — Ben + John Cranwell + Sonia
- [ ] **Brand-licence terms** between Butterfly Movement (post-swap) and commercial entity — annual fee vs per-unit royalty + amount — both boards
- [ ] **Goods commercial entity timing** — stay in A Curious Tractor Pty Ltd vs incorporate Goods Commercial Pty (trigger: FY27 Q2 review OR first IPP contract) — Ben + Nic + SL
- [ ] **Goods JV with Oonchiumpa terms** — % split, governance, IPP-eligibility threshold (>50% Indigenous-owned) — Ben + Oonchiumpa
- [ ] **Farm lessor legal form** — Nic personally vs land-holding trust — Nic + Standard Ledger
- [ ] **Farm market rate determination** — arms-length defensible rate for ACT use of Farm — Standard Ledger
- [ ] **Harvest profit-share waterfall details** — landlord trigger, dividend timing, exit — Ben + landlord + SHA lawyer
- [ ] **Trademark attorney engagement** — outside Standard Ledger scope; need a referral
- [ ] **A Kind Tractor Ltd disposition** — given Butterfly Movement is now the DGR1 home for Goods, wind up AKT or keep dormant for a future mission? — Ben + Nic + SL (post-cutover)

---

## Cross-reference

- [Migration checklist (canonical cutover ledger)](act-entity-migration-checklist-2026-06-30.md)
- [Founder pay & R&D thesis FY26 → FY27](../../../wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md)
- [R&DTI claim strategy FY26](../../../wiki/finance/rdti-claim-strategy.md)
- [Harvest subsidiary structure decision](../../../wiki/decisions/2026-05-harvest-subsidiary-structure.md)
- [Goods on Country project page](../../../wiki/projects/goods.md)
