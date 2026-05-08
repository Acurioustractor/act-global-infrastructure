---
title: ACT Founder Pay & R&D Thesis — FY26 close → FY27 setup
status: Live working thesis
date: 2026-05-05
parent: 2026-04-five-year-plan
canonical_entity: a-curious-tractor-pty-ltd
tags:
  - finance
  - r-and-d
  - founder-pay
  - tax-strategy
  - cutover
---

# ACT Founder Pay & R&D Thesis — FY26 close → FY27 setup

> **The thesis in one paragraph.** FY26 founder personnel cost is the single biggest R&D-Path-C lever — every $1 of properly-characterised founder labour generates $0.435 of refundable cash via the Pty's R&D claim. To maximise that, we close FY26 by having Ben invoice ~$250K via Knight Photography and re-characterise ~$200K of Nic's sole-trader drawings as fair-market director salary in the cutover journal. Combined ~$317K R&D-eligible founder personnel cost = ~$138K refund. Add directly-tagged R&D project spend (~$400K) and total FY26 R&D refund is ~$200-250K cash back. From 1 July 2026 (FY27), the Pty pays each founder $10K/mo base via payroll + director-loan top-ups settled at year-end as bonus/dividend/Knight Photography invoice — same R&D maths, cleaner mechanics, predictable cash. The Pty earns its income from a 60/30/10 mix (commercial / grants+philanthropic / R&D-tax-recovery), with distinct sub-entities for the Harvest (subsidiary, partner-shared) and the Farm (Nic's, separate). Trusts receive dividends, not service invoices.

---

## 1. What we're optimising for

| Dimension | Goal |
|---|---|
| **R&D refund FY26** | Maximise Path C claim: ~$200-250K cash refund, lodgement Jul 2026 - Apr 2027 |
| **Founder cash** | Predictable lifestyle cash + flexibility to reinvest in business + family trusts as long-term wealth vehicle |
| **Tax efficiency** | Company tax 25% on retained profit, dividend imputation to trusts, marginal-rate income smoothed across years |
| **Audit defensibility** | Every founder-pay decision survives ATO review — fair-market valuation, proper documentation, contemporaneous records |
| **Operational simplicity** | One invoicing rhythm, one payroll cadence, no entity-soup |
| **Long-term wealth** | Build trust assets via Pty dividends, not active trust trading |

These are non-negotiable. If a structure looks tax-efficient but fails audit defensibility, it's wrong.

---

## 2. FY26 close (now → 30 June 2026)

### What actually exists during FY26

- **A Curious Tractor Pty Ltd** — registered 24 April 2026. Exists for ~9 weeks of FY26. **No bank account, no payroll, no operating activity yet.** Cannot legally pay Ben or Nic in FY26.
- **Nicholas Marchesi sole trader** (NJ Marchesi T/as A Curious Tractor, ABN 21 591 780 066) — the active trading entity for all of FY26. Stops trading 30 June 2026.
- **Knight Photography sole trader** (Ben's ABN) — Ben's invoicing vehicle.
- **Knight + Marchesi Family Trusts** — passive shareholders of Pty (receive dividends, don't trade).

So all FY26 cash flows happen via the sole trader. The Pty doesn't pay anyone in FY26.

### Path C mechanism

Under R&DTI Path C (locked 2026-04-27), FY26 R&D activity is claimed by the Pty even though it was conducted by the sole trader. Mechanism:

```
At cutover (30 June 2026):
  Standard Ledger journal-entries the FY26 sole-trader P&L into the Pty's opening books.
  Result: Pty has FY26 income, FY26 expenses, FY26 R&D activity all on its books.
  Pty lodges FY26 R&D claim with FY26 tax return (Jul 2026 - Apr 2027 window).
```

For this to work, **founder personnel cost has to be on the books as a P&L line during FY26**. Right now it isn't — Nic's drawings are tax-effectively just personal income, and Ben's Knight Photography invoicing is $0 (Phase 1 hasn't been raised yet).

### Ben's FY26 — Knight Photography invoicing (already designed in §D11.5)

| Phase | When raised | Date on invoice | Amount | Project mix |
|---|---|---|---|---|
| 1 (backfill) | This week | 2025-09-30 | $100,000 | ACT-IN 60% / EL 10% / JH 10% / GD 10% / DO 5% / CORE 5% |
| 2.1 (Q2) | This week | 2025-12-31 | $50,000 | Same mix |
| 2.2 (Q3) | This week | 2026-03-31 | $50,000 | Same mix |
| 2.3 (Q4) | At cutover | 2026-06-30 | $50,000 | Same mix |
| | | **FY26 total** | **$250,000** | |

Ben recognises $250K personal income at marginal rate. Knight Photography GST-registers (revenue >$75K threshold), backdated to 1 July 2025 if Standard Ledger advises.

**R&D eligibility:** $250K × 95% R&D allocation = **$237,500 eligible personnel cost**. (Ben's commit log + calendar evidence supports the 95% — agent system, ALMA, platform infra, governed proof, EL v2, JH platform, Goods dashboards, etc.)

### Nic's FY26 — fair-market director salary characterisation

This is the bigger lever and currently unstructured. **Right now, Nic has been drawing ~$237K net of cash from the sole trader** (per the audit I ran 2026-05-05: $539K SPENDs to "Nicholas Marchesi" - $301K RECEIVES back = ~$238K net). All currently coded as drawings (account 880) — **not as salary, not R&D-eligible**.

**Proposed treatment (Standard Ledger to confirm):**

At cutover, journal $200K (or whichever fair-market figure SL settles on) of Nic's drawings as "Director's salary — Nicholas Marchesi", retrospectively for FY26. Mechanism:

```
DR Director's salary — Nicholas Marchesi      $200,000
CR Owner's drawings (account 880)              $200,000

(retrospective re-classification, no cash movement, books stay balanced)

Then carry that $200,000 across to Pty's opening books as a personnel-cost expense.
```

**R&D eligibility:** $200K × 40% R&D allocation = **$80,000 eligible personnel cost**. (Nic's split: 40% R&D — strategy, JusticeHub, Empathy Ledger contributions, Goods relationships — vs 60% operational/community/Harvest/Farm.)

**Why $200K not $238K?** Standard Ledger sets the fair-market figure based on what an arms-length engagement of a co-CEO/co-founder would cost. $200K is conservative; the remaining $38K stays as drawings (capital return, non-deductible).

### FY26 R&D refund estimate

| Source | Eligible | Refund (× 43.5%) |
|---|---:|---:|
| Ben — Knight Photography 95% R&D | $237,500 | $103,313 |
| Nic — director salary 40% R&D | $80,000 | $34,800 |
| ACT-IN tagged spend (R&D infra) | ~$284,000 | ~$123,540 |
| ACT-EL tagged spend | ~$1,200 | $522 |
| ACT-JH tagged spend | ~$800 | $348 |
| ACT-DO tagged spend | ~$10,500 | $4,568 |
| SaaS / API supporting R&D (Anthropic, OpenAI, Supabase, Vercel, Cloudflare etc.) | ~$13,000 | $5,655 |
| **Total** | **~$627,000** | **~$272,000** |

**Conservative estimate: ~$200-250K refund.** Standard Ledger + R&D consultant tighten this further.

### FY26 sole-trader tax position

After re-characterising $200K as Nic's salary:

- Sole-trader gross income FY26: ~$1.5M (Goods, contracts, grants)
- Less project expenses: ~$1.4M (per money-alignment snapshot)
- Less Knight Photography: ($250K invoicing — landed as ACCPAY)
- Less Nic's salary: ($200K — re-characterised)
- Net sole-trader profit: ~$-350K (loss)

Actually — at sole-trader level, Nic's salary doesn't reduce HIS personal taxable income, because the sole trader IS Nic. The R&D-claim journal happens at the Pty level. So:

- Nic's FY26 personal tax position: still based on sole-trader profit (gross income minus business expenses, including Knight Photography $250K). Profit ~ $250K-$300K. Pays personal tax at marginal rate on that.
- The R&D refund is captured at the Pty level (Path C mechanism), not Nic personally.

This is why **Path C is so valuable**: the R&D refund flows to the Pty, which is owned 50/50 by trusts that benefit Ben + Nic flexibly via dividends — but Nic's personal tax exposure on his sole-trader profit remains.

---

## 3. Cutover (30 June - 1 July 2026)

The cutover is mostly about flipping the operating entity. Founder-pay-wise:

| Before cutover | At cutover | After cutover |
|---|---|---|
| Sole trader trades | Standard Ledger books journals: re-characterise founder costs, reallocate FY26 P&L to Pty, settle director's loan accounts | Pty trades as A Curious Tractor Pty Ltd |
| Knight Photography invoices sole trader | Final Phase 2.3 invoice 15081 ($50K) raised dated 2026-06-30 | Knight Photography invoices Pty (Phase 3) |
| Nic draws cash from sole trader | $200K re-characterised as salary; remaining drawings settled | Nic on Pty payroll $10K/mo |
| No payroll | — | Payroll set up Day 0 (per migration playbook) |
| No bank in Pty | NAB Pty business account live | Pty pays bills, receives revenue |

---

## 4. FY27 founder pay model (1 July 2026 → )

Both founders target ~$200K/yr economic value. The question is *through which mechanism*.

### Three-channel mix

```
                 ┌──────────────────┐
A Curious Tractor│   Pty earns      │    Knight Photography
Pty Ltd          │   profit         │    (Ben's ABN)
                 └────────┬─────────┘    Nic's ABN (kept open)
                          │                  │
        ┌─────────────────┼─────────────┐    │
        │                 │             │    │
        ▼                 ▼             ▼    ▼
   ┌─────────┐      ┌──────────┐  ┌────────────────┐
   │ Payroll │      │ Director │  │ Contractor     │
   │ $10K/mo │      │ Loan A/c │  │ invoicing      │
   │ + super │      │ (top-ups)│  │ (lumpy work)   │
   └────┬────┘      └────┬─────┘  └────────┬───────┘
        │                │                  │
        ▼                ▼                  ▼
   Net cash         At year-end         Personal income
   to founder       settle as one       at marginal rate
                    of: bonus,
                    dividend,
                    invoice
                          │
                          ▼
                   ┌──────────────────┐
                   │  Knight / Marchesi│
                   │  Family Trusts    │  (when Pty has profit)
                   │  receive dividends│
                   │  ↓                │
                   │  distribute to    │
                   │  beneficiaries    │
                   └──────────────────┘
```

### What flows where, and why

**Channel 1 — Payroll $10K/mo each = $120K/yr each.** Lifestyle-covering predictable cash. Tax handled by company (PAYG). Super contribution. **R&D-eligible at 95% (Ben) / 40% (Nic) = ~$162K personnel R&D cost combined per year.** 43.5% offset = ~$70K refundable.

**Channel 2 — Director's loan account top-ups.** During the year, if cash needs exceed payroll, founders draw against their loan account. At year-end, balance is settled into:

- **Bonus** (with super top-up) — fully R&D-eligible at the founder's R&D allocation rate. Best when Pty has cash to pay tax + super and the founder wants R&D credit.
- **Dividend through family trust** — no super, franking credits, trust distributes flexibly. Best when Pty has retained profit and the founder wants long-term wealth-build.
- **Knight Photography / sole-trader invoice** — personal income at marginal rate, simplest paperwork. Best for one-off lumpy work where R&D allocation matters less.

The choice is decided in May/June each year based on actual numbers.

**Channel 3 — Contractor invoicing for lumpy or scope-specific work.** Each founder keeps their sole-trader ABN open (Knight Photography for Ben; Nic's ABN if he wants). For scope outside the Pty's regular operations, invoice direct. Adds R&D-eligible contractor cost to the Pty.

### FY27 indicative founder cash schedule (each founder)

| Component | Annual amount | Mechanism |
|---|---:|---|
| Base payroll (12 × $10K) | $120,000 | Pty payroll |
| Super contribution (12% on base) | $14,400 | Pty pays to fund |
| Director's loan draws during year | up to $80,000 | Pty bank → founder bank, tracked as loan |
| Year-end settle | as decided | bonus, dividend, or invoice |
| **Total economic value** | **~$200K-$215K** | |

Both founders combined: **~$400-430K economic value**. About **80-85% of that is R&D-eligible** depending on bonus vs dividend split.

---

## 5. The three-vertical structure (FY27 forward)

### Vertical A — A Curious Tractor Pty Ltd (consulting + R&D)

- **Earns:** consulting fees (Innovation Studio, partnerships), grants (QBE, Minderoo, philanthropic), licensing (Empathy Ledger, JusticeHub), R&D refund (Path C × FY26+FY27).
- **Spends:** founder payroll, contractor invoicing, project costs (R&D infra + specific projects), shared services, Pty overheads.
- **Profits flow:** retained for reinvestment OR dividends to Knight + Marchesi Family Trusts.
- **R&D-heavy projects:** ACT-IN (infrastructure / agent system), ACT-EL (Empathy Ledger), ACT-JH (JusticeHub), ACT-DO (Designing for Obsolescence), ACT-CG (CivicGraph / Civic World Model), ALMA, governed proof.

### Vertical B — The Harvest Pty Ltd (subsidiary, retail + events)

- **Structure:** separate Pty, ACT majority + landlord minority via profit-share (per [decision page](../decisions/2026-05-harvest-subsidiary-structure.md)).
- **Earns:** cafe + shop + venue + events + workshops trading. Regional Arts Australia grant for renovations.
- **Spends:** Harvest-specific operations, share of services from ACT (under arms-length services agreement).
- **Profits flow:** back through profit-share waterfall to landlord (until profitable threshold) then 50/50 to ACT and landlord. ACT's share consolidates into ACT Pty's books.
- **R&D-eligible:** minimal — this is operational trading, not R&D activity.
- **Founder pay impact:** Ben + Nic don't get paid directly by Harvest sub. They get paid by ACT Pty for any time they spend on Harvest strategy/oversight (which is consulting-style, billable from ACT Pty to Harvest sub).

### Vertical C — The Farm (Nic's, separate)

- **Owner:** Nic (held in trust or personally, separate from the Pty entity stack).
- **Structure:** stays out of ACT's books entirely.
- **Earns:** rent from ACT Pty (lease) + eco-tourism revenue when scaled + whatever Nic decides.
- **Spends:** mortgage, maintenance, infrastructure.
- **Founder pay impact:** Nic personally absorbs farm costs and earns farm income separately. ACT Pty pays him market-rate rent for ACT use of the farm; that rent is ACT's R&D-supporting expense (residency, retreats, R&D field site).

This separation is critical for both audit defensibility and the protection of family wealth from business risk.

---

## 6. Revenue mix targets (FY27)

What share of Pty income comes from where, with rationales:

| Source | Target % | $ at $1.5M target | Rationale |
|---|---:|---:|---|
| **Commercial revenue** | 60% | $900K | Goods on Country, JusticeHub contracts, EL licensing, Innovation Studio consulting. Sustainable, recurring, builds dividend capacity for trusts. |
| **Grants / philanthropic** | 25% | $375K | QBE, Minderoo, PRF, Snow, Lord Mayor's. Funds R&D + community impact work that doesn't have a commercial buyer yet. |
| **R&D refund (FY-prior claim)** | 10% | $150K | Refundable offset from ATO on FY-prior R&D activity. Cash, not income for tax purposes — but functions as cashflow. |
| **Other (interest, asset sales, one-offs)** | 5% | $75K | Misc. |
| **Total** | 100% | $1.5M | |

(Goods alone is targeting $1M+ in FY26 already, so the FY27 number could be much higher. The percentages are a directional shape, not a cap.)

### Why 60/25/10/5

- **60% commercial** keeps the Pty independent of grant cycles. Critical for audit-defensible R&D (commercial R&D is more credible to ATO than fully grant-funded R&D).
- **25% grants** funds the early-stage / not-yet-commercial work (CivicGraph, ALMA-style governance research, partnership pilots).
- **10% R&D refund** is a structural cashflow lever once we're in the rhythm — it pays for next year's R&D infrastructure.
- **5% other** = safety margin.

If commercial drops below 50%, the R&D claim gets more scrutinised (ATO sees "company that mostly receives grants and claims R&D refunds"). Commercial revenue defends the claim.

---

## 7. R&D thesis by project (FY27 forward)

How each project contributes to the R&D claim:

| Project | Code | R&D contribution | Why it's R&D-eligible |
|---|---|---|---|
| **Goods on Country** | ACT-GD | Supporting R&D activity | Novel pipeline + buyer-matching tech, AI-augmented matching, Indigenous business identity verification. Commercial revenue defends the claim. |
| **Empathy Ledger v2** | ACT-EL | Core R&D activity | Multi-tenant consent infrastructure, AI-tagged storytelling, syndication platform — novel software with technical uncertainties. |
| **JusticeHub** | ACT-JH | Core R&D activity | Civic data fusion, partnership data model, AI-mediated community contribution — novel software. |
| **CivicGraph / Civic World Model** | ACT-CG | Core R&D activity | Governed knowledge graph, contact enrichment ML, civic-domain data fusion at scale. |
| **ALMA (Australian Living Map of Alternatives)** | ACT-IN | Core R&D activity | Sensemaking infrastructure, governed proof system, agentic processing pipelines. |
| **Designing for Obsolescence** | ACT-DO | Methodology R&D | Frame for testing system longevity, embedded in technical work above. |
| **Goods supporting infra** (commands centre, dashboards, CRM integrations) | ACT-IN | Supporting R&D | Tech platforms enabling Goods to operate. |
| **The Harvest** | ACT-HV / sub | NOT R&D | Operational retail/cafe/events. Tracked separately; doesn't muddy R&D claim. |
| **Farm + accommodation** | ACT-FM | NOT R&D | Operational; Nic's separate vertical. |

**The R&D shape:** ~70% of Pty spend is R&D-eligible (founders work on R&D projects most of their time, R&D infra dominates the cost base). ~30% is operational / commercial-execution.

This is HIGH for a regular company; defensible for ACT because the entire premise is novel software for civic systems.

---

## 8. End-of-year position (target state at 30 June 2026)

What the books look like at midnight on 30 June 2026:

### Sole trader (NJ Marchesi T/as A Curious Tractor)

- **Status:** Stopped trading. Bank account stays open through FY27 Q1 for run-off receipts/final BAS.
- **FY26 final P&L:** prepared by Standard Ledger, lodged with personal tax return. Includes Knight Photography $250K + Nic salary $200K as expenses (per Path C journal). Final tax: substantially reduced from naive estimate due to recharacterisation.
- **FY26 BAS:** final quarterly lodged by 28 July 2026.
- **Pre-30-June discretionary moves:** instant asset write-off ($20K), super top-up ($30K cap for Nic), pre-paid SaaS subscriptions ($28K). Captures deductions at marginal rate before cutover.

### Knight Photography (Ben's ABN)

- **Invoiced FY26:** $250K total (Phase 1 $100K + Phase 2 $50K × 3).
- **GST registered:** backdated to 1 July 2025 if Standard Ledger advises.
- **Tax position:** $250K personal income, less Knight Photography's own (minimal) expenses. Personal tax at Ben's marginal rate.
- **ABN status:** stays open for Phase 3 lumpy invoicing of Pty.

### A Curious Tractor Pty Ltd

- **Status:** Trading from 1 July 2026.
- **Opening books:** populated by Standard Ledger's cross-entity journals from FY26 sole-trader P&L.
- **First payroll:** July 2026 — $10K/mo each for Ben + Nic.
- **First R&D activity registration:** filed with AusIndustry for FY27 (ongoing).
- **R&D refund FY26:** ~$200-250K — lodged Jul 2026 - Apr 2027, refund expected within 60-90 days of lodgement (so anywhere from Sept 2026 to ~July 2027).

### Knight + Marchesi Family Trusts

- **Status:** Hold 50% of Pty each. Passive. No trading activity.
- **Resolutions:** Standard form trust resolutions for any income they receive.
- **First dividend distribution:** Will be FY27 or later, depending on Pty profitability. Dividends are franked (carrying franking credits from Pty's company tax).

### The Harvest Pty Ltd subsidiary

- **Status:** Pre-trading or just trading (depending on incorporation date). September 2026 public opening.
- **Structure:** ACT majority + landlord minority. SHA signed.

---

## 9. Concrete action plan with dates

### This week (5-10 May 2026)

- [ ] Ben raises Knight Photography Inv 15078 ($100K, dated 2025-09-30) and sends to Nic.
- [ ] Ben drafts Knight Photography Phase 2 invoice schedule (15079 / 15080 / 15081) and discusses with Standard Ledger.
- [ ] Nic enters Inv 15078 as ACCPAY in sole-trader Xero, applies 6-line project split, matches the 6 Oct 2025 bank transfers as bill payments.
- [ ] Ben + Nic decide GST registration for Knight Photography.

### Next 4 weeks (mid-May → mid-June 2026)

- [ ] Standard Ledger calculates fair-market salary figure for Nic FY26 — likely $200K range.
- [ ] Standard Ledger prepares the cross-entity journal templates (sole trader → Pty for Path C).
- [ ] Standard Ledger advises on PSI risk + GST backdating + Division 7A on director loans.
- [ ] R&D consultant engaged (per Cutover Rule 3) — reviews FY26 records.
- [ ] Pre-cutover discretionary spend: instant asset write-off candidates identified, super top-ups planned, SaaS pre-payments listed.

### Late June 2026

- [ ] Phase 2 final invoice 15081 ($50K) raised dated 2026-06-30.
- [ ] Final sole-trader Xero entries.
- [ ] Pty bank account live, Pty Xero file open, payroll configured.

### 1 July 2026 (cutover day)

- [ ] First Pty payroll run for Ben + Nic ($10K each + super).
- [ ] Director's loan accounts opened and documented.
- [ ] First Phase 3 Knight Photography invoice (Inv 15082) to Pty if there's lumpy work to invoice.

### July 2026 - April 2027

- [ ] Cross-entity journals booked.
- [ ] FY26 R&D claim assembled and lodged via Pty.
- [ ] Refund lands (60-90 days after lodgement).

---

## 10. Save-money strategies (FY26-specific)

Things to do BEFORE 30 June 2026 because they're worth more at sole-trader marginal rates than Pty's 25% rate.

| Move | Estimated saving | Why |
|---|---:|---|
| **Instant asset write-off** ($20K cap per item, multiple items allowed) | up to $9,400 (47% × $20K) | Sole trader marginal rate vs Pty 25% — saves 22% × $20K per item bought before cutover |
| **Super contributions** ($30K cap, Nic) | up to $14,100 | Concessional contributions deductible at marginal rate; Nic should max for FY26 |
| **Pre-pay annual SaaS subscriptions** | up to $13,400 (47% × $28.6K) | Deductible in FY26 at marginal rate, then renewed by Pty in FY27 at 25% |
| **R&D-related equipment purchases** | depends | Combines instant asset write-off + R&D-eligible spend |
| **Super contributions** ($30K cap, Ben) | up to $14,100 | Same logic if Ben can structure via Knight Photography |
| **Total potential FY26 savings** | **~$50-60K** | One-time, only available before 30 June 2026 |

---

## Summary

**One sentence per founder:**

- **Ben:** Invoice Knight Photography $250K total to ACT sole trader for FY26 (Phase 1 $100K backfill + Phase 2 quarterly $50K through to cutover), recognise $250K personal income at marginal rate, generate $237K R&D-eligible personnel cost on Pty's books via Path C journal, kick refund of ~$103K back to Pty. From 1 July 2026: Pty payroll $10K/mo + Knight Photography invoicing for lumpy work + dividend distributions to Knight Family Trust as Pty profits.
- **Nic:** Continue current sole-trader pattern through FY26; at cutover, Standard Ledger journals $200K of drawings as fair-market director salary for Path C purposes, generating $80K R&D-eligible personnel cost (40% allocation), refund ~$35K. From 1 July 2026: Pty payroll $10K/mo + director's loan top-ups + dividend distributions to Marchesi Family Trust as Pty profits. Farm stays Nic's, separate.

**Combined FY26 R&D refund: ~$200-250K cash back from ATO** (founder personnel ~$138K + project R&D spend ~$130K).

**Combined FY27 founder economic value: ~$400-430K** (mostly R&D-eligible).

**Net effect:** founders maintain target ~$200K each in lifestyle equivalent; Pty builds up retained earnings + R&D refunds; trusts receive dividends as wealth distributions over time; family wealth grows in tax-advantaged trust structures while business retains operating capital.

---

## Cross-reference

- [Knight Photography FY26 invoice proposal](../../thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md) — Phase 1+2+3 invoice plan
- [Migration checklist §11](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md#11-meeting-decisions-from-2026-05-05-standard-ledger-conversation) — meeting decisions
- [Sole Trader → Pty Cutover Strategy](sole-trader-pty-cutover-strategy.md) — broader cutover thesis
- [R&DTI Claim Strategy FY26](rdti-claim-strategy.md) — R&D mechanics
- [Harvest Subsidiary Decision](../decisions/2026-05-harvest-subsidiary-structure.md) — the second vertical
- [Five-Year Cashflow Model](five-year-cashflow-model.md) — long-range frame
- [Finance cutover review workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md) — weekly close process
