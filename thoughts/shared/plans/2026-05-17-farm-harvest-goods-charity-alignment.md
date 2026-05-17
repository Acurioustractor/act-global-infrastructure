---
title: "Farm + Harvest + Goods charity — structural & insurance alignment"
status: draft
date: 2026-05-17
parent: act-entity-migration-checklist-2026-06-30
review_needed: standard-ledger
---
# Farm + Harvest + Goods charity — structural & insurance alignment

> Companion to `act-entity-migration-checklist-2026-06-30.md`. The migration checklist covers the operating entity cutover (sole trader → A Curious Tractor Pty Ltd). This doc covers the **three sub-entities** that sit alongside the Pty: The Farm (Nic's, separate), The Harvest (subsidiary), and the new Goods on Country charity. Each has distinct insurance, trademark, and R&D implications that the checklist doesn't yet pin down.

## 1 · The four-entity picture (target state, post-30-June)

```
                   ┌─────────────────────────────────────┐
                   │  A Curious Tractor Pty Ltd          │
                   │  ACN 697 347 676 · trading from     │
                   │  1 Jul 2026 · 50/50 Knight + Marchesi│
                   │  Family Trusts                      │
                   └──────────────┬──────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
   │ Harvest Pty Ltd  │  │ Goods on Country │  │ A Kind Tractor Ltd   │
   │ (subsidiary)     │  │ charity (NEW)    │  │ ACN 669 029 341      │
   │ ACT majority +   │  │ structure TBD    │  │ dormant · NOT DGR    │
   │ landlord minority│  │ — see §3         │  │ existing             │
   │ via profit-share │  │                  │  │                      │
   └──────────────────┘  └──────────────────┘  └──────────────────────┘

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

## 4 · The new Goods on Country charity — open decisions

### Status today
- Goods on Country currently operates through Nic's sole trader
- Trading via goodsoncountry.com.au — manufacturing + sales + distribution
- Active Indigenous Procurement Policy JV being negotiated with Oonchiumpa (per memory note)
- Co-design relationships with Fred Campbell (Oonchiumpa, Western Arrernte) + others
- Product P&L: $550-850/unit institutional pricing, 50-55% gross margin at scale

### The structural question

User flagged that a **new Goods charity entity is being established**. The structure isn't pinned down yet. Three viable shapes, each with different implications:

#### Option A — Goods charity as new PBI / DGR Item 1 entity

- **Form:** New company limited by guarantee, registered with ACNC + ATO for DGR endorsement
- **Pros:** Tax-deductible donations from public + philanthropic; eligible for DGR-only grants (philanthropy sees Goods as a separable mission)
- **Cons:** ACNC oversight; can't distribute profits; needs independent board majority; charity-restricted trading rules
- **R&D impact:** Goods commercial trading would need to live elsewhere (Pty Ltd subsidiary?) — charity can't be the primary commercial vehicle without compromising endorsement
- **Trademark:** "Goods on Country" trademark held by charity; commercial entity licenses it

#### Option B — Goods commercial Pty Ltd subsidiary + Indigenous-led licensing

- **Form:** New Pty Ltd, subsidiary of A Curious Tractor Pty Ltd OR JV with Oonchiumpa
- **Pros:** Commercial flexibility, can pursue Indigenous Procurement Policy contracts (with Indigenous co-owner Oonchiumpa pushes JV >50% Indigenous-owned); Goods stays in trading economy
- **Cons:** No tax-deductible donation pathway; less attractive for philanthropic capital
- **R&D impact:** R&D eligible if novel product engineering + AI-augmented matching + co-design platform is documented; revenue defends claim
- **Trademark:** "Goods on Country" trademark held by JV; ACT licenses brand if applicable

#### Option C — Hybrid: A Kind Tractor Ltd activated as Goods charity + Goods commercial as Pty sub

- **Form:** Activate existing A Kind Tractor Ltd (currently dormant + NOT DGR) — apply for DGR, give it the Goods mission; separately incorporate Goods Commercial Pty as subsidiary of A Curious Tractor Pty
- **Pros:** Uses existing dormant charity (cost saving); separates philanthropic Goods (training, community capacity-building, co-design) from commercial Goods (manufacturing, sales, distribution)
- **Cons:** DGR endorsement application timing (~6-12 months); A Kind Tractor's existing constitution may need amendment; two entities to govern instead of one
- **R&D impact:** Commercial sub is the R&D-eligible vehicle (novel product engineering); charity is operational community work
- **Trademark:** "Goods on Country" master mark held by whichever entity has stronger continuity claim — leaning charity to protect community-facing identity

### Recommendation (subject to Standard Ledger + lawyer review)

**Option C — hybrid.** Reasoning:

1. A Kind Tractor Ltd exists, is registered, has ACN. Activating it for Goods avoids new-entity incorporation cost + delay.
2. Separating charity (community-facing co-design + training + capacity-building) from commercial (manufacturing + sales + distribution) is cleanest for both Indigenous Procurement Policy compliance AND R&D defensibility.
3. The commercial Pty subsidiary can be the JV vehicle with Oonchiumpa (or community partner of choice) — solving Indigenous-ownership question for IPP contracts.
4. A Kind Tractor Ltd's DGR endorsement application can run in parallel to Pty cutover (Standard Ledger to gauge realistic timeline — likely 6-12 months to DGR endorsement after constitution amendments).
5. Trademark holds: A Kind Tractor (the charity, custodian of the mission) owns the "Goods on Country" trademark; Goods Commercial Pty Ltd licenses it under a written brand-licence agreement.

**Decisions to lock**

| Decision | Who | Deadline |
|---|---|---|
| **Confirm Option A/B/C** | Ben + Nic + Standard Ledger + community partners | End May 2026 |
| **A Kind Tractor Ltd constitution amendments** (if Option C) | Lawyer (SL referral) | June 2026 |
| **DGR endorsement application** (if pursuing) | Lawyer + Standard Ledger | June-July 2026 (lodge before cutover so review starts) |
| **Goods Commercial Pty Ltd incorporation** (if Option B or C) | Lawyer | Before first IPP contract or first FY27 institutional sale |
| **JV terms with Oonchiumpa** (if pursuing IPP-eligible JV) | Ben + Oonchiumpa leadership + lawyer | Tied to first IPP-eligible contract |
| **"Goods on Country" trademark filing** | Lawyer (trademark attorney) | Before Goods Commercial Pty starts trading independently |

### Insurance — Goods (whichever structure lands)

| Type | Held by | Why |
|---|---|---|
| **Product liability** | Goods commercial entity | Critical — manufactured products in homes including remote and vulnerable contexts. Should be high-limit ($20M+). |
| **Public liability $20M** | Goods commercial entity + Goods charity (separately) | Co-design sessions, community visits, deployments |
| **Cargo / freight** | Goods commercial entity | Stock in transit to remote communities |
| **Stock + plant** | Goods commercial entity | Manufacturing equipment, raw materials, finished inventory |
| **Professional indemnity** | Both entities | Design + advisory work to communities |
| **Cyber** | Both entities | Community data + supplier data |
| **Recall cover** | Goods commercial entity | Manufactured product recall is expensive; specialty cover |

### R&D implications

- **Goods R&D-eligible activity:** Novel product engineering (HDPE structural design for extreme conditions), co-design methodology, AI-augmented buyer-matching platform, supply chain tech, identity-verification for Indigenous business supplier panel.
- **Goods commercial revenue defends the R&D claim** — ATO sees a company with real commercial trading, not a grant-funded research outfit.
- **Risk:** If Goods sits inside A Curious Tractor Pty Ltd (not in a subsidiary), the manufacturing volume could distort Pty's R&D share of total spend. Better to subsidiary it once volume is material (>$500K annual).

---

## 5 · Trademark strategy

The user flagged trademark especially for Goods given the charity decision. Here's the consolidated view across all four entities:

| Brand | Recommended trademark holder | Why |
|---|---|---|
| **A Curious Tractor** | A Curious Tractor Pty Ltd | Parent operating entity; mark filed at registration |
| **The Harvest** | A Curious Tractor Pty Ltd OR Harvest Pty Ltd subsidiary | If subsidiary will exit eventually, mark sits in parent to preserve continuity. If long-term standalone, sits in subsidiary. **Recommendation: parent.** |
| **Goods on Country** | A Kind Tractor Ltd (if Option C activated) OR Goods Commercial Pty Ltd (if standalone) | Custodial brand. Charity holder preferred if pursuing DGR pathway — protects mission from commercial exit scenarios. |
| **Empathy Ledger** | A Curious Tractor Pty Ltd | Core methodology + platform; licensable to partners |
| **JusticeHub** | A Curious Tractor Pty Ltd | Same |
| **ALMA (Australian Living Map of Alternatives)** | A Curious Tractor Pty Ltd | Methodology mark |
| **LCAA (Listen → Curiosity → Action → Art)** | A Curious Tractor Pty Ltd | Methodology mark |
| **Aesthetics of Asymmetry** | A Curious Tractor Pty Ltd | Methodology mark |

### Filing priority (sequenced)

1. **A Curious Tractor + The Harvest** — file as soon as Pty has ABN (May 2026). Cheap insurance against squatters.
2. **Goods on Country** — file before Goods Commercial Pty Ltd starts trading or before first independent IPP-eligible contract. Lock to the eventual custodian (A Kind Tractor or Goods Commercial).
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
| §6 Trademarks — currently "REGISTER in Pty name" for Goods | **Change to: REGISTER in custodian charity name (A Kind Tractor Ltd if Option C) OR in Goods Commercial Pty Ltd.** Separate trademark attorney engagement needed; not Standard Ledger scope. |
| §6 IP assignment deed — currently "Nic assigns to Pty" | Confirmed for everything EXCEPT Goods brand-specific IP, which assigns to Goods Commercial Pty Ltd or A Kind Tractor Ltd depending on structure decision. |
| §1 Goods on Country buyer relationships — currently "NOVATE" | **Reframe:** if Goods Commercial Pty Ltd is incorporated before 30 Jun, novate direct from sole trader to Goods Commercial Pty (not to A Curious Tractor Pty Ltd). If not, novate to A Curious Tractor Pty Ltd first, then second-stage transfer later. |
| §8 Insurance — currently "PL $20M before Harvest lease signing" | Confirmed for Harvest. **Additionally**: Goods Commercial Pty Ltd needs PL $20M + product liability + recall cover before first independent sale. |

---

## 7 · Open questions (gating decisions)

- [ ] **Goods charity structure** — Option A, B, or C (recommendation: C — hybrid) — Ben + Nic + Standard Ledger
- [ ] **Goods JV with Oonchiumpa terms** — % split, governance, IPP-eligibility threshold (>50% Indigenous-owned) — Ben + Oonchiumpa
- [ ] **Farm lessor legal form** — Nic personally vs land-holding trust — Nic + Standard Ledger
- [ ] **Harvest profit-share waterfall details** — landlord trigger, dividend timing, exit — Ben + landlord + SHA lawyer
- [ ] **Trademark attorney engagement** — outside Standard Ledger scope; need a referral
- [ ] **A Kind Tractor Ltd DGR endorsement path** (if Option C) — Standard Ledger to gauge timeline + cost

---

## Cross-reference

- [Migration checklist (canonical cutover ledger)](act-entity-migration-checklist-2026-06-30.md)
- [Founder pay & R&D thesis FY26 → FY27](../../../wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md)
- [R&DTI claim strategy FY26](../../../wiki/finance/rdti-claim-strategy.md)
- [Harvest subsidiary structure decision](../../../wiki/decisions/2026-05-harvest-subsidiary-structure.md)
- [Goods on Country project page](../../../wiki/projects/goods.md)
