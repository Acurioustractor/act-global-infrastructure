---
title: ACT Money Thesis — Full Discussion Document
status: For Ben + Nic + Standard Ledger to read through together
date: 2026-05-05
parent: 2026-04-five-year-plan
canonical_entity: a-curious-tractor-pty-ltd
audience: Ben, Nic, Standard Ledger, R&D consultant
purpose: Single document to read through together that walks the entire money model — entities, founder pay, R&D, revenue mix, alternatives, opportunities, risks, and a what-and-when action plan.
tags:
  - finance
  - r-and-d
  - founder-pay
  - tax-strategy
  - cutover
  - thesis
---

# ACT Money Thesis — Full Discussion Document

> **What this is.** The full version of the FY26-FY27 founder-pay + R&D + tax thesis, structured so Ben and Nic can read it together, weigh alternatives at each decision fork, and end with a clear set of actions and dates. Companion to [`founder-pay-and-rd-thesis-fy26-fy27.md`](founder-pay-and-rd-thesis-fy26-fy27.md) — that's the short version with numbers; this is the long version with reasoning.
>
> **How to read it.** Start at §1, then jump around. Each section ends with discussion prompts. The action plan in §11 is the action ledger.

---

## 1. Strategic frame — what we're optimising for

We're not optimising for any single number. We're optimising the trade-off between **six** things:

1. **Refundable R&D cash** — FY26 Path C claim, target $200-250K refund.
2. **Founder lifestyle predictability** — both of us cover bills + life without thinking about it.
3. **Founder long-term wealth** — building family trust assets in a tax-advantaged way.
4. **Operating capital for the Pty** — enough cash to do the work, hire, pay grants out, weather slow months.
5. **Audit defensibility** — every choice survives ATO review without surprises.
6. **Operational simplicity** — one rhythm we can sustain without burning hours on bookkeeping.

If we had to rank: 4 (operating capital) > 1 (R&D refund) > 5 (audit) > 2 (lifestyle) > 3 (long-term wealth) > 6 (simplicity). Operating capital first because without it, nothing else works.

### Discussion prompt for Nic

Do the rankings feel right? Or is long-term wealth more important than R&D refund for you given your farm equity build-up?

---

## 2. The entity stack — what we're actually setting up

### As of 5 May 2026

```
Knight Family Trust  ──┐
                       │   50%
                       │
A Curious Tractor Pty Ltd ──┐
(ACN 697 347 676)            │
Registered 24 Apr 2026      │
Trading from 1 July 2026    │  Subsidiary
                            ├──► The Harvest Pty Ltd (TBI)
                            │       (ACT majority + landlord minority)
                       50%  │
                       │    │
Marchesi Family Trust ─┘    │
                            │
                            ├──► Innovation Studio (brand only, lives inside Pty)
                            ├──► Goods on Country (project, lives inside Pty)
                            ├──► Empathy Ledger v2 (project + future spinout candidate)
                            ├──► JusticeHub (project)
                            ├──► CivicGraph / Civic World Model (project)
                            └──► ALMA (governed sensemaking process)

Nicholas Marchesi T/as A Curious Tractor (sole trader, ABN 21 591 780 066)
    Stops trading 30 June 2026

Knight Photography (Ben's sole-trader ABN)
    Continues — Ben's invoicing vehicle for ACT work

The Farm (Nic's, separate, in Nic's trust or personal name)
    Leased to ACT Pty + Harvest Pty
    Eco-tourism / accommodation / R&D field site

A Kind Tractor Ltd (charity, dormant, NOT DGR)
    No active role — kept registered but not trading
```

### Why three trading entities (Pty, Harvest sub, Farm)

- **ACT Pty** = the consulting + R&D + commercial business. Where most R&D activity lives. Where founder payroll happens. Owned by family trusts.
- **Harvest sub** = retail / cafe / events / venue. Different P&L shape. Has a third-party investor (the landlord) who needs clean reporting. Profit-share waterfall to landlord, then 50/50.
- **Farm** = stays Nic's. Property risk + farm-specific revenue (eco-tourism, accommodation, primary production) doesn't muddy ACT books, doesn't expose ACT trust capital to farm liability.

### Alternatives we considered and rejected

| Alternative | Why we rejected |
|---|---|
| Single Pty for everything (ACT + Harvest + Farm in one) | Harvest investor wants clean reporting; farm liability shouldn't sit inside ACT; muddied R&D claim |
| Pty per project (separate Pty for Goods, EL, JH, etc.) | Maze of companies, expensive (~$1K/yr ASIC fees + bookkeeping per Pty), audit complexity |
| Charity (A Kind Tractor) as primary trading entity | Lost flexibility on R&D refund + commercial revenue + dividends; ACNC compliance overhead |
| Two CLG (company limited by guarantee) entities | No share structure for investors / Knight + Marchesi family wealth |
| Joint venture between Ben + Nic personally | No corporate veil, full personal liability, no dividend mechanism to trusts |

### Alternatives we still might want

- **Spin out Empathy Ledger v2** as its own Pty if it raises capital or scales beyond ACT's bandwidth.
- **Separate Goods entity** if commercial revenue grows so big it dominates ACT P&L (currently $1M+ FY26 — already large).
- **SMSF** for retirement-stage wealth (own decisions later).

### Discussion prompt

Does the three-entity setup feel right for the next 3-5 years? When do we revisit Empathy Ledger / Goods spinout?

---

## 3. FY26 founder pay (now → 30 June 2026)

### The honest current state

- **Ben:** drawn $0 salary or invoicing from ACT in FY26. Knight Photography last invoiced June 2025 ($79K, FY25-final).
- **Nic:** drawn ~$237K net cash from sole trader, all coded as drawings (account 880). No formal salary recognition.

This means right now, FY26 founder personnel cost on ACT's books is basically zero. Path C R&D claim sees no founder personnel — leaving the biggest lever unused.

### What we're going to do (recommended)

#### Ben — Knight Photography invoices to sole trader

| Phase | Date | Invoice # | Amount | Why |
|---|---|---|---|---|
| 1 | 2025-09-30 | 15078 | $100,000 | Backfills the $100K Nic already paid Ben on 6 Oct 2025 (3 transfers via Up Bank) |
| 2.1 | 2025-12-31 | 15079 | $50,000 | Q2 FY26 work |
| 2.2 | 2026-03-31 | 15080 | $50,000 | Q3 FY26 work |
| 2.3 | 2026-06-30 | 15081 | $50,000 | Q4 FY26 work + cutover |
| | | **Total** | **$250,000** | Ben's FY26 economic value through Knight Photography |

Ben recognises $250K personal income. Personal tax at marginal rate.

#### Nic — fair-market director salary recharacterisation

At cutover, Standard Ledger journals $200K of Nic's drawings as director salary (retrospective recharacterisation). Mechanism:

```
DR Director's salary — Nicholas Marchesi      $200,000
CR Owner's drawings (account 880)              $200,000

(no cash movement; books stay balanced; FY26 P&L now shows $200K personnel cost)
```

The remaining $37K of net drawings stays as drawings (capital return, non-deductible). Nic's personal tax position unchanged — still based on sole trader profit.

### R&D refund maths

| Source | Eligible (after R&D %) | 43.5% offset |
|---|---:|---:|
| Ben Knight Photography 95% R&D | $237,500 | $103,313 |
| Nic salary 40% R&D | $80,000 | $34,800 |
| ACT-IN tagged spend | ~$284,000 | ~$123,540 |
| Other tagged R&D codes (EL, JH, DO) | ~$12,500 | $5,438 |
| Supporting R&D SaaS / API | ~$13,000 | $5,655 |
| **Total** | **~$627,000** | **~$272,000** |

**Conservative refund: ~$200-250K cash from ATO**, lodged Jul 2026 - Apr 2027, lands ~60-90 days after lodgement.

### Alternatives we considered

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| Don't claim R&D at all | Simplest | Leaves $200-250K on the table | Reject |
| Claim aggressive (founder time 100% R&D) | Bigger refund (~$300K) | Audit risk; can't defend "founders did 100% R&D, no operations" | Reject |
| Claim conservative (founder time 50%/20%) | Bullet-proof audit | Smaller refund (~$150K) | Backup option if Standard Ledger nervous |
| **Claim balanced (95% Ben / 40% Nic)** | Reflects reality: Ben mostly software, Nic mostly operations + partnerships | Standard | **Recommended** |
| Push more of Nic's drawings into salary ($230K instead of $200K) | Bigger R&D base for Nic | Less defensible — drawings ≠ salary by default | Discuss with SL |

### Opportunities to grab

- **R&D consultant engagement.** ~$15-30K fee. Likely returns 5-10× in claim quality + audit defence. Schedule mid-May 2026.
- **R&D loan finance.** Once claim is registered, lenders like Radium Capital will advance ~80% of expected refund at ~12-15% interest. Bridges cashflow gap if Pty needs cash before refund lands. Optional.
- **Backdate GST registration on Knight Photography** to 1 July 2025 if revenue threshold breached. Captures GST credits ACT can claim.
- **Pre-30-June discretionary spend** — instant asset write-off, super top-up, SaaS prepayments. ~$50-60K saved if executed (sole trader marginal rate beats Pty 25% rate).

### Risks

- **PSI attribution on Knight Photography.** ATO could attribute Ben's Knight Photography income directly to him personally (defeating any tax-flexibility benefit). Mitigation: meet Personal Services Business (PSB) tests — results-based contracts, multiple clients, business premises if possible.
- **R&D claim audit.** ATO reviews 5-10% of R&D claims. Mitigation: R&D consultant + contemporaneous records (commits, calendar, project documentation already strong).
- **Recharacterisation of Nic's drawings.** ATO could challenge the $200K salary characterisation. Mitigation: Standard Ledger professional opinion + fair-market salary evidence.

### Discussion prompts

1. Is $200K the right fair-market salary for your FY26 role, Nic? Or higher / lower?
2. Should Ben push for $300K Knight Photography invoicing (more R&D), or stick at $250K (more conservative)?
3. Do we engage a dedicated R&D consultant, or rely on Standard Ledger's R&D capability?
4. How aggressive on pre-30-June savings — is the $50-60K worth the buying decisions?

---

## 4. The cutover (30 June - 1 July 2026)

### What flips at midnight 30 June 2026

- Sole trader stops trading. Bank account stays open for run-off receipts and final BAS.
- Pty starts trading. NAB Pty business account active. Pty Xero file open. Payroll configured.
- Knight Photography stops invoicing the sole trader. Starts invoicing the Pty (Phase 3).
- Cross-entity journals are booked by Standard Ledger to move FY26 P&L to the Pty's opening books.

### What can go wrong

- **NAB account not ready** (2-week onboarding can stretch). Mitigation: Cutover Rule 2 — delay cutover until Pty is genuinely ready. Don't fudge dates for ATO.
- **Pty Xero file misconfigured.** Mitigation: [New-entity Xero launch playbook](../../thoughts/shared/plans/new-entity-xero-launch-playbook.md) — 90-min Day-0 setup checklist.
- **Receivables stuck on sole trader side post-cutover.** Mitigation: Cutover Rule 1 — pre-cutover invoices stay with sole trader, paid to sole trader bank.
- **Customer / partner confusion** about who they're working with from 1 July. Mitigation: novation letters sent in May/June (per migration checklist §1-2).

### Discussion prompt

What's our fallback if the Pty NAB account isn't ready by late June?

---

## 5. FY27 founder pay (1 July 2026 → )

### The three-channel mix

```
                 ┌──────────────────┐
A Curious Tractor│   Pty earns      │    Knight Photography (Ben)
Pty Ltd          │   profit         │    Nic ABN (kept open)
                 └────────┬─────────┘    │
                          │              │
        ┌─────────────────┼─────────────┐│
        │                 │             ││
        ▼                 ▼             ▼▼
   ┌─────────┐      ┌──────────┐  ┌────────────────┐
   │ Payroll │      │ Director │  │ Contractor     │
   │ $10K/mo │      │ Loan A/c │  │ invoicing      │
   │ + super │      │ (top-ups)│  │ (lumpy work)   │
   └────┬────┘      └────┬─────┘  └────────┬───────┘
        │                │                  │
        ▼                ▼                  ▼
   Net cash         At year-end         Personal income
   (R&D-eligible)   settle as one       at marginal rate
                    of: bonus,          (R&D-eligible if
                    dividend,            for Pty work)
                    invoice
                          │
                          ▼
                   ┌──────────────────┐
                   │  Knight / Marchesi│
                   │  Family Trusts    │  (when Pty has profit)
                   │  receive dividends│
                   └──────────────────┘
```

### Per founder, FY27

| Component | Amount | R&D-eligibility |
|---|---:|---|
| Base payroll $10K/mo × 12 | $120,000 | ✅ Yes (95%/40% allocation) |
| Super contribution 12% on base | $14,400 | ✅ Yes (counts as personnel cost) |
| Director's loan top-ups during year | up to $80,000 | Per year-end settlement choice |
| Year-end settlement | bonus / dividend / invoice | Bonus = R&D ✓; dividend = ✗; invoice = R&D ✓ |
| **Total economic value** | **~$200-215K** | ~80-85% R&D-eligible |

**Combined (Ben + Nic): ~$400-430K, ~$300-330K R&D-eligible at 43.5% = ~$140K refund** *(FY27 R&D claim, lodged FY28).*

### Alternative pay structures

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| **All payroll $200K each** | Simple, full R&D-eligible, super on full amount | Locks in cash; PAYG installments on $400K of cash that may not exist | Reject — too rigid |
| **All contractor invoicing** | Flexible, simple paperwork | Misses super R&D treatment, more personal tax exposure | Reject — leaves R&D on the table |
| **All trust distributions** | Most tax-flexible | PSI attribution risk, no R&D personnel cost on Pty books | Reject — kills R&D |
| **Mixed (recommended)** | Lifestyle predictable + flexibility + R&D maximised | More moving parts | **Recommended** |
| **Mixed but front-load Knight Photography** | Preserves Ben's marginal-tax flexibility | Means less Pty payroll, less super | Discuss |

### Specific year-end settlement decision tree

Each year in May/June, decide settlement of director's loan balances:

```
Did Pty have surplus profit + cash?
├── Yes
│   ├── Want long-term wealth in trust?
│   │   ├── Yes → DIVIDEND (franked, into family trust, distribute to beneficiaries)
│   │   └── No  → BONUS (R&D-eligible, super top-up, personal income)
│   └── (Either also leaves option of CONTRACTOR INVOICE for one-off work)
└── No
    └── Carry forward as director's loan, settle next year (within Div 7A window)
```

### Discussion prompts

1. $10K/month base — too high, too low, or right?
2. Year-end settlement: do we have a default (bonus vs dividend), or decide year-by-year?
3. How do we split the director's-loan top-up budget between us when both want cash?

---

## 6. Revenue mix — where the money comes from

### FY27 target mix

| Source | Target % | $ at $1.5M target | Why this share |
|---|---:|---:|---|
| **Commercial** | 60% | $900K | Goods, JusticeHub, Empathy Ledger licensing, Innovation Studio. Sustainable + audit-defensive R&D. |
| **Grants / philanthropic** | 25% | $375K | QBE, Minderoo, PRF, Snow, Lord Mayor's. Funds early-stage / not-yet-commercial work. |
| **R&D refund (FY-prior claim)** | 10% | $150K | Path C refund cycle. Functions as cashflow. |
| **Other** | 5% | $75K | Interest, asset gains, one-offs. |

### Why this mix

- **>50% commercial defends the R&D claim.** ATO is more sceptical of companies that mostly receive grants and claim R&D refunds. Commercial revenue = "this company has real customers paying for novel software" = R&D claim is credible.
- **Grants for non-commercial work** so we can do CivicGraph, ALMA-style governance research, partnership pilots that don't have a paying customer yet but are the right work.
- **R&D refund as structural cashflow** — once we're in the rhythm, FY26 refund pays for FY27 R&D infrastructure. Compounds.

### Alternatives

| Mix | Profile | Risk |
|---|---|---|
| 80% commercial / 15% grants / 5% R&D / 0% other | Highly commercial, may sacrifice mission | Drift away from civic / community work |
| 30% commercial / 50% grants / 15% R&D / 5% other | Heavily grant-funded | R&D claim under more scrutiny; vulnerable to grant cycles |
| **60/25/10/5 (recommended)** | Balanced | Standard pattern for civic-tech orgs |

### Discussion prompt

Are we comfortable with 60% commercial revenue as the floor, or are there mission reasons we'd accept 50%?

### Opportunities to grab

- **Goods scaling.** $1M FY26 → $1.5-2M FY27 if QBE finance unlocks supply chain capacity.
- **Empathy Ledger v2 licensing.** Move from custom contracts to a SaaS pricing model — ~$50-200K MRR ceiling at scale.
- **JusticeHub partnerships.** NJP and other community partnerships can become recurring contracts.
- **Innovation Studio retainer model.** Convert existing one-off engagements to retainer contracts (predictable revenue).
- **R&D as a service.** Once the R&D claim infrastructure is rock-solid, can we sell that capability to other civic-tech organisations?

---

## 7. R&D thesis by project

### Where the R&D-eligibility lives

| Project | Code | R&D type | Why eligible |
|---|---|---|---|
| **ALMA** | ACT-IN | Core | Sensemaking infrastructure, governed proof system, agentic processing — solves novel "how do we make collective sensemaking auditable" problem |
| **Empathy Ledger v2** | ACT-EL | Core | Multi-tenant consent infrastructure, AI-tagged storytelling, syndication — novel software architecture |
| **JusticeHub** | ACT-JH | Core | Civic data fusion, partnership data model, AI-mediated community contribution — novel software |
| **CivicGraph / Civic World Model** | ACT-CG | Core | Governed knowledge graph, contact enrichment ML, civic-domain data fusion at scale |
| **Designing for Obsolescence** | ACT-DO | Methodology | Frame for testing system longevity, embedded in technical work |
| **Goods on Country tech** | ACT-IN / GD | Supporting | Pipeline + buyer-matching tech, AI verification — supports commercial Goods |
| **Goods commercial operations** | ACT-GD | Operational | Trading, fulfilment — NOT R&D |
| **The Harvest** | ACT-HV (sub) | Operational | Cafe / events / venue — NOT R&D |
| **Farm** | ACT-FM | Operational | Property + accommodation — NOT R&D, separate vertical |

### The R&D shape

- **~70% of Pty spend is R&D-eligible.** High but defensible — because the entire premise is novel software for civic systems.
- **Founder time:** Ben 95% R&D, Nic 40% R&D. Calendar + commits + project deliverables support this.
- **Project-specific spend:** ACT-IN dominates (R&D infrastructure, agent system, governed proof). Specific R&D projects (EL, JH, CG, ALMA) carry their own infra costs.

### Alternatives

| Approach | Pros | Cons |
|---|---|---|
| Claim everything as R&D | Maximises refund | Indefensible; ATO will reject |
| Claim only ACT-IN | Conservative, easy | Misses ~$50-100K of legit R&D |
| **Claim core + supporting + apportioned overhead (recommended)** | Defensible, evidence-supported | Standard practice |

### Discussion prompts

1. Is CivicGraph genuinely R&D, or supporting infrastructure for ALMA?
2. Should we register R&D activities for FY27 with AusIndustry up-front (clearer claim) or post-hoc (more flexible)?
3. Do we ringfence specific projects as "100% R&D activities" (cleaner) or treat them all as fluid?

---

## 8. Long-term wealth — trusts, dividends, retirement

### How the trusts work

```
Pty earns profit
    │
    ▼
Pays company tax 25% on retained profit
    │
    ▼
Declares dividend (when cash available)
    │
    ├──► 50% to Knight Family Trust
    └──► 50% to Marchesi Family Trust
            │
            ▼
        Trustees resolve distributions
            ├──► Beneficiaries (you, spouse, future kids, parents...)
            ├──► Held in trust corpus (capital growth)
            └──► Invested elsewhere (property, listed shares, other businesses)
```

### Tax flow

- Pty declares dividend → trust receives $1 + $0.33 franking credit (gross-up)
- Trust distributes to beneficiary at beneficiary's marginal rate
- Beneficiary pays tax at marginal rate, receives franking credit offset
- Net: most efficient for beneficiaries with marginal rate <30% (excess franking refunded if individual rate < company rate)

### Strategic uses for trust capital

- **Property purchase** — investment property under trust ownership
- **Investment portfolio** — managed funds, listed shares, alternative assets
- **Lend to Pty** — if Pty needs working capital, trust lends at market interest rate (interest income to trust)
- **Children's education / family welfare** — distributions to beneficiaries when needed
- **Future business** — trust capital seeds new ventures

### Alternatives

| Wealth vehicle | Pros | Cons |
|---|---|---|
| Personal accumulation only | Simple | High marginal tax forever, no flexibility |
| **Family trusts (current plan)** | Tax-flexible distributions, intergenerational, asset protection | Trustee responsibilities, annual compliance |
| SMSF (Self-Managed Super Fund) | Strong tax advantage in retirement (15% during accumulation, 0% in pension phase) | Locked until preservation age (60+) |
| Investment company (owned by trust) | Layered structure, retain profits at 25% | Adds complexity, audit overhead |
| **Mix: trusts now, SMSF later, investment co. if needed (recommended)** | Best of all worlds | More moving parts |

### Discussion prompts

1. Are we thinking trust corpus growth (long-term wealth) or trust distributions (annual income smoothing)?
2. When do we open SMSFs? Threshold of $200K each in super seems sensible.
3. Investment company under the trust — flag for 3-5 year horizon?

---

## 9. The Harvest (subsidiary economics)

### Current state

The Harvest is a sub-Pty being formed (per [decision page](../decisions/2026-05-harvest-subsidiary-structure.md)). ACT majority + landlord (philanthropist, ~$60M logistics exit) minority via profit-share.

### Why it's a separate Pty

- **Different P&L shape** — retail / cafe / events vs ACT's consulting / R&D
- **Third-party investor** — landlord wants clean reporting, profit-share clarity
- **Operational risk separation** — public liability + product liability shouldn't sit on ACT books
- **Lease integrity** — Harvest lease in subsidiary's name, not novated when control changes
- **R&D claim cleanliness** — operational trading shouldn't muddy R&D activity tracking

### Profit-share mechanics (TBD with landlord + lawyer)

```
Harvest revenue
    minus: operating expenses, lease payments, services agreement to ACT Pty
    = Harvest gross profit
        |
        ├── If <profit threshold X
        │     → Landlord receives 50% of market rent (existing arrangement)
        │     → Remaining profit reinvested in Harvest
        │
        └── If >profit threshold X
              → Landlord receives full market rent
              → Excess profit distributed:
                    ACT majority %  → ACT Pty
                    Landlord minor % → Landlord
```

### Founder pay impact from Harvest

Ben + Nic don't get paid directly by Harvest sub. They get paid by ACT Pty for any time they spend on Harvest strategy or oversight (consulting-style, billable from ACT Pty to Harvest sub under arms-length services agreement).

### Discussion prompts

1. What's the right profit threshold X — when does landlord move from preference to ordinary share?
2. What's our majority % — 60? 70? 80? Negotiating range with landlord.
3. Who from ACT Pty operates Harvest day-to-day? How is that priced into the services agreement?

### Opportunities

- **Use Harvest as test bed** for live commerce + community events that feed into Empathy Ledger / JusticeHub content.
- **Brand halo** — Harvest's public-facing brand draws people into the broader ACT ecosystem.
- **Capital injection from landlord** beyond rent reduction — if landlord wants to fund infrastructure, structure as preference equity.

---

## 10. The Farm (Nic's, separate)

### Why it stays Nic's

- **Property risk** shouldn't expose ACT trust capital
- **Family inheritance / generational** — likely held in Nic's trust or personal name long-term
- **Different revenue model** — accommodation / eco-tourism / agriculture vs ACT's services
- **Audit cleanliness** — farm depreciation, livestock, primary production claims kept separate

### How money flows

- ACT Pty pays Nic market-rate rent for ACT use of farm (residency, retreats, R&D field site)
- Harvest Pty pays Nic market-rate rent for Harvest operations (if Harvest uses farm)
- Eco-tourism revenue (when scaled) goes to Nic / farm entity
- Farm operating costs are Nic's

### Long-term scaling

- **Eco-tourism build-out** — accommodation cottages, retreat infrastructure (per Act-Farm Repositioning decision: "regenerative capital engine")
- **Capital from where:** Nic personal / farm-specific philanthropy / debt secured against farm asset (NOT from ACT trust capital)

### Discussion prompts

1. Is the rent ACT pays for farm use already at market rate, or being undercharged?
2. When does the farm need its own ABN / Pty for eco-tourism trading?

---

## 11. Action plan — what we do and when

### This week (5-10 May 2026)

| Day | Owner | Action |
|---|---|---|
| Wed-Fri | Ben | Raise Knight Photography Inv 15078 ($100K, dated 2025-09-30, 6-line project split). Send to Nic. |
| Wed-Fri | Ben | Decide GST registration on Knight Photography. Backdate or current? |
| Fri | Both | Read this doc together. Mark up disagreements. |
| End of week | Both | Brief Standard Ledger on the recommended approach. Ask for fair-market salary figure for Nic. |

### Next 2 weeks (mid-May 2026)

| Week | Owner | Action |
|---|---|---|
| Wk 1 | Ben | Phase 2.1 invoice 15079 ($50K dated 2025-12-31) raised + sent |
| Wk 1 | Ben | Phase 2.2 invoice 15080 ($50K dated 2026-03-31) raised + sent |
| Wk 1 | Nic | Enter Inv 15078, 15079, 15080 in sole trader Xero as ACCPAY. Match Inv 15078 against the 6 Oct 2025 bank transfers. |
| Wk 1-2 | Nic + SL | Director's loan journal for the off-Xero $100K. |
| Wk 2 | Both + SL | Standard Ledger conversation: confirm $200K Nic salary recharacterisation + Path C journal mechanics + Division 7A on director loans. |
| Wk 2 | Both | Engage R&D consultant. Get 2-3 quotes. |
| Wk 2 | Nic | Re-tag existing Knight Photography Inv 15076 + 15077 (FY25 $79K) from ACT-PS to actual project mix. |

### Next 4 weeks (late May - early June 2026)

| Week | Owner | Action |
|---|---|---|
| Wk 3 | Both | Pre-30-June discretionary spend list. Equipment for instant asset write-off. SaaS prepayments. Super top-ups. |
| Wk 3-4 | Ben | Pty Xero file setup + chart of accounts import (per Day-0 playbook). |
| Wk 3-4 | Both | NAB Pty business account opened (2-week onboarding). |
| Wk 4 | Both | Insurance research + quotes (PL $20M, D&O, etc.). |
| Wk 4 | R&D consultant | Reviews FY26 records for activity register completeness. |

### June 2026

| Week | Owner | Action |
|---|---|---|
| Wk 1-2 | Both | Grant novation letters to current funders (sole trader → Pty). |
| Wk 1-2 | Both | Customer / partner novation letters. |
| Wk 1-2 | Both | Subscription audit + transfer billing entity. |
| Wk 3 | Both | Final pre-cutover discretionary spend execution. |
| Wk 4 | Ben | Phase 2.3 invoice 15081 ($50K dated 2026-06-30) raised. |
| Wk 4 | Both | Final sole trader Xero entries. |

### Cutover day (30 June - 1 July 2026)

| Action | Owner |
|---|---|
| Sole trader stops trading | — |
| Pty starts trading | — |
| First Pty payroll run for Ben + Nic ($10K each + super) | Ben |
| Director's loan accounts opened + documented | Both + SL |
| First Phase 3 Knight Photography invoice (Inv 15082) to Pty if needed | Ben |
| Public announcement email to key relationships | Both |

### July 2026 - April 2027 (R&D claim window)

| Month | Action |
|---|---|
| July 2026 | Final sole-trader BAS lodged. ABN cancellation. |
| Aug 2026 | Cross-entity journals booked by Standard Ledger. |
| Aug-Oct 2026 | FY26 personal tax return for Nic (sole trader). |
| Sept-Nov 2026 | FY26 R&D claim assembled by R&D consultant + Standard Ledger. |
| Nov 2026 - Apr 2027 | Pty's first FY tax return + R&D claim lodgement. |
| 60-90 days after lodgement | Refund lands. |

---

## 12. Risks, mitigations, and watch-points

### High-priority risks

| Risk | Trigger | Mitigation |
|---|---|---|
| **R&D claim audit / partial rejection** | ATO selects claim for review (5-10% rate) | R&D consultant + contemporaneous records + conservative founder allocations |
| **PSI attribution on Knight Photography** | ATO deems Ben's KP income is personal | Meet PSB tests (results contracts, multiple clients, business premises if possible) |
| **Recharacterisation of Nic's drawings rejected** | ATO challenges $200K salary recharacterisation | Standard Ledger written professional opinion + fair-market evidence + time records |
| **Cutover operational delay** | NAB / Xero / payroll setup not ready by 30 June | Cutover Rule 2: delay cutover, don't fudge dates |
| **Cashflow gap pre-refund** | Pty needs cash from 1 July, refund doesn't land until ~Sept-Dec 2026 | NAB business overdraft / R&D loan finance / retain sole-trader cash for buffer |

### Medium-priority risks

| Risk | Mitigation |
|---|---|
| Director's loan Division 7A breach | Written loan agreement + market interest rate + settle within statutory window |
| Customer doesn't accept novation | Individual negotiation; in extremis, sole trader continues that contract until expiry |
| Harvest landlord's lawyer drags | Heads of agreement first, full SHA after; sign limited-scope agreement quickly |
| Knight Family Trust accidentally trades | Keep trust passive; route ALL service income through Knight Photography or Pty payroll |
| GST registration timing on Knight Photography | Backdate to 1 July 2025 if Standard Ledger advises |

### Lower-priority risks

| Risk | Mitigation |
|---|---|
| QBE / Minderoo deal slips | Doesn't affect cutover; just affects FY27 cashflow |
| Goods commercial revenue drops | Already dominant; diversify enough to absorb |
| Empathy Ledger v2 / JusticeHub partnership wobbles | These are R&D activities, less revenue-critical |

---

## 13. What we don't yet know — open questions for Standard Ledger

1. **Exact fair-market salary figure for Nic FY26.** $200K is our placeholder; SL determines defensible amount.
2. **Path C journal mechanics.** What's the actual entry that reallocates FY26 sole-trader P&L to Pty's opening books?
3. **Director's loan structure.** Written agreement template, market interest rate (current ATO benchmark), settlement timing.
4. **PSI / PSB tests** for Knight Photography under proposed structure.
5. **GST registration on Knight Photography.** Backdate to 1 July 2025? Or current date with mandatory registration triggered by Phase 2 threshold breach?
6. **Pre-30-June discretionary spend.** What qualifies for instant asset write-off given the cutover? Any traps?
7. **Super contribution timing.** Concessional cap of $30K/yr — best timing for Nic FY26?
8. **R&D consultant recommendation.** Standard Ledger's preferred R&D specialists for civic-tech / software?
9. **Insurance broker recommendation.** Public Liability $20M, D&O, Professional Indemnity, Cyber. Standard Ledger's preferred broker?
10. **Future Pty structure** — when does Empathy Ledger v2 become its own Pty? What triggers that?

---

## 14. Summary — the headline shape

```
FY26 (now → 30 June 2026):
  Ben → Knight Photography → invoices Sole Trader $250K
  Nic → drawings (existing) → $200K recharacterised as salary at cutover

  R&D refund: ~$200-250K (Path C, lodged Jul 2026 - Apr 2027)
  Founder lifestyle: maintained from existing pattern
  Pre-30-June savings: ~$50-60K (instant asset, super, SaaS prepay)

CUTOVER 30 June 2026:
  Sole trader stops. Pty starts. Standard Ledger journals.

FY27 (1 July 2026 → ):
  Each founder: $10K/mo Pty payroll + super + director loan top-ups + year-end settle
  Total per founder: ~$200-215K, ~80% R&D-eligible
  Pty earns 60% commercial / 25% grants / 10% R&D refund / 5% other
  Knight Photography invoices Pty for lumpy work
  Family Trusts receive dividends (long-term wealth, not service income)

THE THREE VERTICALS:
  ACT Pty       — consulting, R&D, commercial (where founder pay happens)
  Harvest sub   — retail, cafe, events (separate Pty, partner-shared)
  Farm          — Nic's, separate (rents to ACT and Harvest at market rate)

R&D HEAVY PROJECTS:
  ALMA, EL v2, JusticeHub, CivicGraph, Designing for Obsolescence
  ~70% of Pty spend is R&D-eligible

WEALTH STRUCTURE:
  Trusts as passive shareholders → receive dividends → distribute to beneficiaries
  Knight + Marchesi Family Trusts = long-term wealth vehicles
  SMSFs to be added later
```

---

## Cross-reference

- [Founder Pay Thesis (short version)](founder-pay-and-rd-thesis-fy26-fy27.md) — the numbers, fewer words
- [Knight Photography FY26 Invoice Proposal](../../thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md) — Phase 1+2+3 invoicing detail
- [Migration Checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md) — operational ledger
- [Sole Trader → Pty Cutover Strategy](sole-trader-pty-cutover-strategy.md) — broader cutover context
- [Money Alignment Snapshot 2026-05-01](../../thoughts/shared/reports/act-money-alignment-2026-05-01.md) — current state baseline
- [R&DTI Claim Strategy FY26](rdti-claim-strategy.md) — R&D mechanics deep-dive
- [Five-Year Cashflow Model](five-year-cashflow-model.md) — long-range frame
- [Harvest Subsidiary Decision](../decisions/2026-05-harvest-subsidiary-structure.md) — sub-entity for Harvest
- [Act-Farm Repositioning](../decisions/2026-04-act-farm-repositioning.md) — farm as regenerative capital engine
- [ACT Core Facts](../decisions/act-core-facts.md) — entity structure source of truth
- [Finance Cutover Review Workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md) — weekly close process
