---
title: ACT Money Thesis — Rebuttal & Additional Thinking
status: Adversarial review of the founder-pay-and-rd thesis
date: 2026-05-05
parent: act-money-thesis-discussion
audience: Ben, Nic, Standard Ledger, R&D consultant
purpose: Self-critique of the previous thesis. Surfaces things I under-weighted, missed entirely, or got fuzzy on, after reading deeper into the wiki and current Australian tax/R&D rules.
tags:
  - finance
  - r-and-d
  - tax-strategy
  - rebuttal
  - opportunities
---

# ACT Money Thesis — Rebuttal & Additional Thinking

> **Why this doc exists.** I wrote a thesis (`act-money-thesis-discussion.md`) without fully reading the wiki's five-year plan, Goods/CivicGraph commercial detail, or current Australian tax-rule fine-print. This doc is the adversarial review of that thesis. It validates what's right, calls out what's under-played, surfaces opportunities I missed, and proposes a rebalanced strategy. Read this AFTER the main thesis, then synthesise with Nic.
>
> **Bottom line:** the thesis is right in shape (Knight Photography invoicing, Path C, Pty payroll, trusts as passive shareholders) but **wrong in scale (revenue is bigger than I projected), wrong in mechanism (should use Subdiv 328-G not 122-A for cutover), and missing a $4-10M lever (CivicGraph exit + small business CGT concessions)**.

---

## Section 1 — What the thesis got right (validated)

These points hold up against the wiki + ATO research:

1. **Path C R&DTI is valid.** Refundable offset is 43.5% (corporate tax 25% + 18.5% premium), available to entities with aggregated turnover <$20M. Pty is well under. Confirmed.
2. **Knight Photography invoicing structure.** Sole trader → sole trader (FY26) → Pty (FY27+) is correct sequencing. Pty couldn't have been invoice counterparty pre-incorporation.
3. **Trusts as passive shareholders, not trading vehicles.** PSI attribution risk is real. Standard pattern.
4. **The three-vertical entity stack** (ACT Pty / Harvest sub / Farm separate). Farm liability separation is critical.
5. **R&D registration deadline.** FY26 R&D activities must be registered with AusIndustry by 30 April 2027. Confirmed via business.gov.au and Moore Australia. (The widely-publicised "30 April 2026 deadline" is for FY25, which Path C already forfeited — doesn't apply to ACT.)
6. **$10K/mo payroll + director loan + EOY settle pattern.** Standard founder-pay structure for small Pty.
7. **R&D activity types (Core / Supporting).** Software with technical uncertainty + experimentation = Core R&D under business.gov.au definition.

---

## Section 2 — Where I was wrong or under-played

### 2.1 Revenue scale is bigger than my thesis assumed

**What I wrote:** $1.5M FY27 target, 60/25/10/5 mix.

**What the wiki says:** [Five-year cashflow model](five-year-cashflow-model.md) and [2026-04-five-year-plan](../decisions/2026-04-five-year-plan.md) project:

| Year | Voice | Flow | Ground | Other grants | Total |
|---|---:|---:|---:|---:|---:|
| Y1 FY27 | $200K | $1.45M | $150K | $1M | **$2.6M** |
| Y3 FY29 | $600K | $2.59M | $600K | $1M | **$4.4M** |
| Y5 FY31 | $1M | $2.5M+ | $1.15M | $800K | **$5.5M+ exit** |

**Implication:** my conservative $1.5M target understates by ~73%. At $2.6M FY27 actual mix:
- Voice: 7.7%
- Flow: 55.8%
- Ground: 5.8%
- Other (grants): 38.5%

Grants are **much higher proportion** than my 25% target. R&D claim audit defensibility argument actually pushes harder for shifting toward commercial faster (CivicGraph MRR + Goods + Innovation Studio retainers).

**Rebalance:** my 60/25/10/5 is the right *aspiration* but not the *reality*. A more honest FY27 target is **55% commercial / 35% grants / 8% R&D refund / 2% other**, with a 2-year glide path to 60/25/10/5 by FY29.

### 2.2 The thesis ignored the Voice/Flow/Ground product structure

The five-year plan organises ACT's commercial activity into three layers:

- **Voice** = Empathy Ledger bespoke storytelling (4 → 15 customers @ ~$50-70K each)
- **Flow** = CivicGraph MRR + JusticeHub partnerships + Goods retail + CONTAINED tour
- **Ground** = ACT Farm + Harvest + eco-tourism + residencies

My thesis collapsed all this into "ACT Pty earns commercial revenue". That hides the operating cadence each layer needs:

- Voice = bespoke contracts, annual scope, project-based pricing
- Flow = SaaS subscriptions ($79-$1,999/mo Stripe tiers on CivicGraph), grant tranches, retail margins
- Ground = experience-based revenue, seasonal, place-anchored

**Implication:** the cutover playbook needs **Voice/Flow/Ground-specific revenue ops**, not one undifferentiated "commercial" line. Particularly:

- **CivicGraph MRR** needs a billing system (Stripe) and customer-success function from Day 0 in the Pty.
- **Empathy Ledger bespoke** needs scope-management and annual-renewal workflow.
- **Ground** needs operational accounting separate from R&D-heavy ACT-IN.

### 2.3 I used Subdivision 122-A logic when 328-G is probably better

**What I wrote:** "Equipment / hardware → Transfer at market value via journal entry. Triggers minor CGT event."

**What the rules say:** [Subdivision 122-A](https://www.taxtalks.com.au/articles/subdiv-122-a/) provides CGT rollover when a sole trader disposes of CGT assets to a company and ends up owning all shares. **But 122-A explicitly doesn't cover trading stock, depreciating assets, copyright, or registered emissions units.**

**The better tool:** [Subdivision 328-G — Small Business Restructure Rollover](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/concessions-offsets-and-rebates/small-business-restructure-roll-over). This covers **all** asset types — CGT assets, depreciating assets, trading stock, and revenue assets. ACT has computers, cameras, IP rights, and substantial software — most of which IS depreciating or copyright. 122-A would leave gaps.

**Implication:** Standard Ledger should use Subdivision 328-G for the cutover asset transfer, not 122-A. Both work for the Path C income/expense reallocation; 328-G handles the asset-side cleanly.

**Risk if we don't:** equipment + IP transfers without rollover = market-value CGT events. Mostly small dollars (laptops, cameras), but the IP could be valued substantially. 328-G defers all of it.

### 2.4 I missed the small business CGT concessions on the CivicGraph exit

**What I wrote (Section 8):** "Family trusts as long-term wealth vehicles."

**What I missed:** when CivicGraph eventually sells (Y5 target $4-10M EV), the small business CGT concessions are the single biggest tax lever in the structure. [Small Business CGT Concessions](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/small-business-cgt-concessions) under Division 152 stack:

| Concession | Effect | Eligibility |
|---|---|---|
| **15-year exemption** | Full CGT exemption | Asset owned 15+ years, founder 55+ AND retiring, OR permanently incapacitated |
| **50% active asset reduction** | Halves the gain | Automatic if basic conditions met |
| **Retirement exemption** | $500K lifetime cap per individual (cumulative across all dispositions) | Tax-free cash if 55+; pay to super if <55 |
| **Small business rollover** | Defer for 2 years | Need to acquire replacement asset within 2 years |

These **stack** with the general 50% CGT discount for individuals/trusts (which family trusts get when they hold the asset >12 months).

**Worked example for a $5M CivicGraph exit (Y5, 2031):**

```
Sale price (in Pty)               $5,000,000
Cost base                            $50,000  (founder shares at par)
Capital gain                       $4,950,000

Stacked concessions:
  50% active asset reduction      -$2,475,000  (gain reduced to $2,475,000)
  General 50% CGT discount        -$1,237,500  (further reduced to $1,237,500)
  Retirement exemption $500K × 2  -$1,000,000  (Ben + Nic each use lifetime cap)
                                  --------
Taxable gain (split between 2)       $237,500  total, ~$118,750 per founder
Tax payable per founder ~47%          $55,800

NET TO EACH FOUNDER ~$2.4M of $2.5M share — tax of ~$56K on $2.5M
```

vs. naive treatment (no concessions):

```
Capital gain                       $4,950,000
50% CGT discount                  -$2,475,000
Taxable gain per founder           $1,237,500
Tax per founder ~47%                 $581,500

NET TO EACH FOUNDER ~$1.9M of $2.5M share
```

**Difference: ~$525K per founder = ~$1M total** depending on structure.

**Implication:** small business CGT concessions are the difference between "pay $1.2M in tax on the exit" and "pay $115K in tax on the exit." This deserves its own section in the main thesis. Standard Ledger needs to start positioning for this NOW — eligibility tests look back over years of activity.

**Eligibility tests for Division 152 concessions:**
1. **Aggregated turnover <$2M** OR **Net asset value <$6M** (basic test).
2. **Active asset test** — asset must have been used in business for at least half the ownership period.
3. **For 15-year exemption:** asset owned 15+ years (so we'd qualify around 2041, not Y5).
4. **For retirement exemption:** founder 55+ at time of disposal, OR pay to super if <55.

For a Y5 exit (FY31, founders ~40-43 by then), the 15-year exemption is too early — needs the longer game. **But** 50% active asset reduction + retirement exemption $500K each + general 50% discount **all stack** without the 15-year requirement.

### 2.5 I missed the Indigenous Procurement Policy as a Goods commercial lever

**What I wrote:** Goods on Country tagged ACT-GD as "Supporting R&D activity. Commercial revenue defends the claim."

**What I missed:** [Indigenous Procurement Policy](https://www.niaa.gov.au/sites/default/files/documents/2025-06/Indigenous-Procurement-Policy-2025-6-30.pdf) effective 1 July 2026 sets Commonwealth procurement targets that mandate Indigenous business participation. **But from 1 July 2026, IPP eligibility tightens to require 51% First Nations ownership/control.**

Goods on Country is **not** Indigenous-owned (it's ACT's social enterprise that partners with Indigenous-owned organisations — Oonchiumpa, Wilya Janta). So Goods can't directly register as Supply Nation Indigenous business under the new rules.

**The opportunity:** [Joint Venture under IPP](https://www.niaa.gov.au/resource-centre/joint-ventures-under-indigenous-procurement-policy) allows a 50% Indigenous-owned JV to register. ACT could structure a JV with Oonchiumpa Consultancy or Wilya Janta where:
- 50%+ Indigenous ownership through Oonchiumpa/Wilya Janta
- Commercial independence
- Indigenous management at the highest level
- Documented profit distribution + work portioning

**Result:** the JV becomes eligible for Commonwealth IPP-targeted procurement (Federal, state, local government — currently ~$1.4B/yr in IPP-mandated spend) for Goods-style products.

**Implication:** Goods commercial revenue could be **substantially scaled** through Government procurement IF structured as an IPP-eligible JV. The Y5 cashflow projection ($500K/yr Goods retail) may massively understate the opportunity — IPP government markets could 5-10× this.

This is a structural decision deserving its own discussion — does ACT spin Goods into a JV with Oonchiumpa, or keep it inside ACT Pty with the limitation that Government IPP-targeted contracts go to a partner Indigenous business?

### 2.6 I underplayed the Charity (A Kind Tractor) optionality

**What I wrote:** "A Kind Tractor Ltd — charity, dormant, NOT DGR. No active role — kept registered but not trading."

**What I missed:** there are **partial-DGR pathways** that don't require activating the full charity:

- **Public Ancillary Fund (PuAF)** — separate trust deed, DGR Type 2, can receive deductible donations but distribute only to other DGRs.
- **Private Ancillary Fund (PrAF)** — similar but only family-of-fund control, cap on contributions.
- **Gift fund within a charity** — A Kind Tractor could establish a gift fund for a specific DGR-eligible purpose (advancing PBI status), allowing deductible donations directly to ACT-related work.

**Why this matters:** some philanthropic capital (especially trusts and large donors) MUST give to DGR. Without DGR, ACT loses access to that capital. A targeted DGR pathway via A Kind Tractor (or a specific gift fund) opens that channel without committing the whole org to charity governance.

**Caveat:** DGR is heavy compliance. Probably not worth it unless we identify specific large gifts that need DGR to land. Decision deferred — but flag for FY27 if a >$200K DGR-required philanthropic opportunity arises.

### 2.7 R&D registration timing — I got the deadline mostly right but missed a nuance

**What I wrote:** "Register R&D activities with AusIndustry for FY26 — done by Pty under Path C, lodged with FY26 tax return (Jul 2026 - 30 Apr 2027 window)."

**What the rules say:** the registration deadline is **10 months after the end of the financial year in which the R&D activities were conducted**. For FY26 (ended 30 June 2026), registration deadline is 30 April 2027. ✅ correct.

**The nuance I missed:** [Path C journals fold sole-trader R&D activity to the Pty's books AT cutover (30 June 2026), not retrospectively from 1 July 2025.](https://www.bulletpoint.com.au/rd-tax-incentive/) This means:
- The R&D activities were *physically* conducted by the sole trader during FY26.
- Path C says: characterise the sole trader as having operated on behalf of the Pty.
- AusIndustry registration for FY26 R&D activities lists **the Pty** as the registrant, with the activities conducted "from 1 July 2025 through 30 June 2026" — even though the Pty didn't legally exist until 24 April 2026.

This is unusual but defensible under the Path C mechanism. **Standard Ledger and the R&D consultant must align on this characterisation before AusIndustry registration.**

### 2.8 I missed Personal Services Income (PSI) tests for Knight Photography

**What I wrote:** "PSI attribution risk if the trust were to actively bill — confirm the standard treatment."

**What I missed:** the same PSI rules apply to **Knight Photography** as a sole trader, not just to trust trading. ATO can deem KP's income to be Ben's personal income (not "business" income) unless Knight Photography passes one of four tests:

1. **Results test** — paid for a result, not hours; contracts must specify deliverable.
2. **Unrelated clients test** — services to 2+ unrelated clients via public advertising.
3. **Employment test** — KP employs at least one other person doing 20%+ of the work.
4. **Business premises test** — KP has dedicated business premises distinct from home.

If KP fails ALL four → KP is a "Personal Services Business" and income is attributed to Ben at marginal rate (no tax-flexibility benefit, but otherwise OK).

If KP **passes** at least one → KP is treated as a regular business, income retained in KP, tax handled at sole-trader business level.

**For our purposes (KP invoicing ACT for Ben's R&D work):** likely **fails** the unrelated-clients test (only invoices ACT), passes possibly the results test if contracts are deliverable-based. Either way, the income flows to Ben personally at marginal rate — same outcome as if it were salary.

**Implication:** PSI rules don't materially change Phase 1+2 of the Knight Photography invoicing plan, but they **constrain** what KP can be used for post-cutover. KP can't be a tax-flexibility vehicle for Phase 3 unless it diversifies clients or meets a non-PSI test.

**Action:** ask Standard Ledger whether KP's contracts (with sole trader / Pty) should be drafted as **results-based** rather than time-based to support the results test.

### 2.9 I overstated the FY26 R&D refund

**What I wrote:** "$200-250K refund."

**What's more honest:** the $627K eligible × 43.5% = $272K is a CEILING. Real claim is reduced by:
- Documentation gaps on older spend (some FY26 transactions still in REVIEW state)
- Apportionment haircuts on shared infrastructure (Anthropic, OpenAI, Vercel — usually claim 60-80% not 100%)
- Conservative founder allocations (95% / 40% may need to come down to 85% / 30% to survive audit)
- R&D consultant fees (~$15-30K reduce the net refund)

**Realistic refund: $180-220K**, possibly $250K if everything aligns. The headline "~$272K" is the upside case, not the expected case.

---

## Section 3 — Big opportunities I missed

### 3.1 Position now for the small business CGT concessions on CivicGraph exit

**Opportunity:** ~$1M tax saving on a $5M CivicGraph exit if structured correctly.

**Action now:**
1. Confirm CivicGraph activity is run inside ACT Pty (not a separate entity that hasn't established active-asset history).
2. Standard Ledger documents the active-asset usage — every year, evidence that CivicGraph IP is "used in carrying on a business" (not just held passively).
3. Net asset value test ($6M) — track ACT Pty net asset value over time. If approaching $6M, may need to use aggregated turnover test instead.
4. Consider whether CivicGraph should eventually be its own Pty (pre-exit) for cleaner sale structuring — vs. asset sale from within ACT Pty.
5. Founder share structure must be **direct ownership of business** (currently via family trusts — this is fine, trusts can claim concessions but with extra rules).

### 3.2 Indigenous Procurement Policy joint venture for Goods

**Opportunity:** Government procurement market access for Goods, potentially scaling commercial revenue 5-10× over 3-5 years.

**Action sequence:**
1. Conversation with Oonchiumpa Consultancy (Fred Campbell, Christine Marchesi, Tanya Turner, Kristy Bloomfield) about JV structure.
2. Design a 50%+ Indigenous-owned JV entity (could be Pty Ltd structure with Oonchiumpa-owned shares).
3. Register the JV with Supply Nation as Indigenous JV.
4. Goods commercial activity flows through the JV → IPP-eligible → tender for Federal/state/local government contracts.
5. ACT Pty provides services to JV (logistics, manufacturing, design) under arms-length services agreement.

This is a multi-year setup but the opportunity scale is large enough to warrant Standard Ledger + lawyer time NOW.

### 3.3 Subdiv 328-G rollover for cutover asset transfer

**Opportunity:** Defer all asset-related CGT events at cutover, including for IP and equipment.

**Action:** instruct Standard Ledger to use **Subdivision 328-G** (small business restructure rollover) for the sole-trader → Pty asset transfer, not Subdivision 122-A. 328-G covers all asset types.

**Eligibility check:**
- Both entities small business entities (aggregated turnover <$10M) — ✅ ACT well under
- "Genuine restructure" of business — ✅ sole trader → Pty meets this
- Same ultimate economic ownership before and after — ✅ Ben + Nic via trusts
- Australian residents — ✅
- Election made by both parties — needs to be done formally

**Risk if missed:** asset transfers at market value trigger CGT events. For substantial IP (codebases, methodologies, trademarks), the market value could easily be $200K-$500K+, generating significant tax cost.

### 3.4 R&D loan finance to bridge cashflow gap

**Opportunity:** R&D refund lands ~Sept-Dec 2026, but the Pty needs operating cash from 1 July 2026.

**Available providers (Australia, 2026):**
- **Radium Capital** — advances ~80% of expected R&D refund, 12-15% effective rate
- **Fundsquire** — similar product, slightly different terms
- **NAB business overdraft** — secured against business assets

**Action:** if Pty cashflow is tight in Q1 FY27 (Jul-Sep 2026), apply for R&D loan finance against the FY26 claim once registered with AusIndustry. Bridges the 4-6 month gap until refund lands.

### 3.5 Pre-cutover discretionary spend — bigger than I quoted

**What I wrote:** "$50-60K savings."

**What I missed:** this should also include:
- **Equipment R&D-specific** (not just instant asset write-off): GPU server, IoT prototyping kit for Goods, additional cameras for Empathy Ledger fieldwork — claim instant asset write-off + R&D-eligible.
- **Pre-paid contractor engagements** for FY27 work — paying contractors before 30 June 2026 captures sole-trader marginal rate deduction. Cap depends on contractor agreements.
- **Travel and accommodation** for Q1 FY27 R&D fieldwork pre-paid (limited applicability — need to genuinely pre-pay).

Realistic upper bound: **~$80-120K of pre-cutover savings** if executed aggressively, with proper documentation. Standard Ledger to advise per-item.

### 3.6 ESOP (Employee Share Scheme) for future hires

**Opportunity:** retain talent without high cash salary by offering equity participation.

**Action (FY27+ only):** when first non-founder hires happen, structure an ESOP via Pty with:
- ATO-approved Tax-Concessional ESS rules (s83A Tax Concessional Scheme)
- Vesting schedule typical 4 years with 1-year cliff
- Exit-event triggered taxation (not at grant or vesting)
- Up to $5K per year tax-free start-up concession

This is a commitment device — equity-aligned hires accept lower cash for future upside.

### 3.7 Export Market Development Grant (EMDG) — if CivicGraph or Goods export

**Opportunity:** [EMDG](https://business.gov.au/grants-and-programs/export-market-development-grants) reimburses 50% of eligible export marketing expenses up to $150K per year for 3 years.

**Eligibility:** Australian business with annual turnover <$50M, products/services exportable, demonstrating export market activity.

**Action:** if CivicGraph pursues UK market (per [civicgraph-uk-market-entry research](../research/civicgraph-uk-market-entry.md)), this is directly relevant. Apply once UK market entry begins.

---

## Section 4 — Important details I got wrong or fuzzy on

### 4.1 R&D claim aggregation rules

The $20M aggregated turnover threshold for refundable offset isn't just ACT Pty's revenue — it includes connected entities and affiliates. **The Pty's aggregated turnover may include Knight Photography's revenue if Ben is a "connected entity"** (controls Pty through trust holding 50%+).

This is fine at FY26 ($1.5M sole trader + $250K Knight Photography = ~$1.75M) but matters at scale (Y5 $5.5M + Knight Photography $400K = $5.9M). Still well under $20M, so refundable rate stays at 43.5%.

### 4.2 Division 7A nuance for director's loans

**What I wrote:** "Division 7A compliance on director's loans."

**Detail:** Division 7A applies once Pty pays out cash to founders that's not salary or dividend. The loan must be:
- Documented in writing
- At a benchmark interest rate (FY26 benchmark: ~8.27%, varies)
- Repaid OR converted to dividend within 7 years (specific schedule)

If we draw down director's loan during the year and don't settle by year-end, Division 7A deems the unsettled balance a dividend at year-end (taxed at marginal rate). To avoid this:
- Settle by 30 June each year (the Pty's year-end) into bonus, dividend, or principal repayment
- OR write a 7-year complying loan agreement at benchmark interest

The cleaner pattern is **settle at year-end** so Division 7A doesn't kick in.

### 4.3 GST registration on Knight Photography

**What I wrote:** "Backdate to 1 July 2025 if Standard Ledger advises."

**Detail:** GST registration is mandatory once turnover exceeds $75K in any 12-month period. KP's FY26 turnover is hitting $250K → mandatory. Backdating to 1 July 2025 is allowed but:
- ATO can require KP to remit GST on prior unregistered transactions (no GST on unregistered period if registration was honestly not required at the time, but $75K threshold was breached at some point)
- KP can claim back GST on FY26 expenses if registered

For ACT (the sole trader receiving the bill), claimable GST credit on Inv 15078 ($100K) = $9,090.91 — non-trivial. Worth getting right.

**Action:** Standard Ledger calls the registration date based on when KP's $75K threshold was first crossed — likely the moment Inv 15078 lands ($100K > $75K).

---

## Section 5 — Rebalanced strategy (revised recommendations)

### 5.1 Update the cutover playbook

- Use **Subdivision 328-G** for asset transfer (not 122-A).
- Document active-asset usage of CivicGraph IP from Day 0 of Pty (for future small business CGT concessions).
- Election forms for 328-G signed by both sole trader and Pty before cutover.

### 5.2 Position for the long game (CivicGraph exit)

- Standard Ledger memo on small business CGT concessions positioning — what evidence we need to maintain over 3-5 years to qualify.
- Consider whether CivicGraph should eventually be its own Pty (pre-exit, ~Y3-4) for cleaner exit structure.
- Track net asset value annually — if approaching $6M, may need to use aggregated turnover test as alternative qualifier.

### 5.3 Goods scaling via IPP JV

- Have the Oonchiumpa conversation about a 50%+ Indigenous-owned JV structure.
- Multi-quarter project; not blocking for cutover but unlocks 5-10× commercial scale by Y3-5.
- Coordinate with Wilya Janta (existing Goods partner) — could be a tri-party JV.

### 5.4 Revenue mix calibration

- FY27 honest target: **55% commercial / 35% grants / 8% R&D refund / 2% other** (matching the actual five-year-cashflow projection).
- 2-year glide path to 60/25/10/5 by FY29 as commercial scales.
- Communicate this honestly to Standard Ledger — not "we'll be 60% commercial Y1" but "we're 55% commercial Y1, here's how we get to 60% by Y3".

### 5.5 Knight Photography contract structure

- Phase 2+3 invoices structured as **results-based deliverables** (per project, per milestone) not time-based — supports PSB results test.
- Documents diversification of clients post-cutover (Knight Photography invoices Pty, but also potentially other clients) to support unrelated-clients test.

### 5.6 Honest R&D refund estimate

- Communicate the realistic range as **$180-220K**, not the $200-250K headline.
- $272K is the optimistic ceiling; $200K is the realistic mid-point; $180K if conservative haircuts apply.

### 5.7 New action items for Standard Ledger

Add to the existing list:

1. Confirm Subdivision 328-G eligibility and prepare election forms for cutover.
2. Provide written memo on small business CGT concessions positioning over 3-5 years.
3. Advise on KP GST registration date + backdating treatment.
4. Confirm Path C R&D registration mechanics: the Pty registers FY26 activities even though Pty didn't legally exist for most of FY26.
5. Advise on PSI/PSB test compliance for Knight Photography contracts post-cutover.

### 5.8 New conversations to schedule

1. **Oonchiumpa + Wilya Janta** — structure a Supply Nation Indigenous JV for Goods (multi-month project; start now, lands Y2).
2. **R&D consultant selection** — ~$15-30K fee, returns 5-10× via claim quality. Priority engagement.
3. **CivicGraph commercial product manager** — if CivicGraph hits $400K MRR Y1 target, needs dedicated commercial ownership beyond founders.

---

## Section 6 — What this rebuttal still doesn't cover

I haven't researched and would value Standard Ledger / R&D consultant input on:

1. **Refundable R&D vs non-refundable rules at edge cases** — what if Pty makes profit in Y3+ and aggregated turnover crosses $20M?
2. **Foreign income tax** — if CivicGraph UK market lands, what's the treatment of UK revenue in Pty's tax position?
3. **R&D activity registration scope** — how broad to draw the Core R&D activity description (covers more = more refund, but more scrutiny)
4. **State payroll tax** — Queensland threshold $1.3M (FY26). Pty + connected entities aggregated. May trigger.
5. **WorkCover Queensland** — registration when first employee starts (per migration checklist §7).
6. **Trust streaming** — capital gains streaming, franking credit streaming — relevant when trust receives mixed income types from Pty.
7. **SMSF establishment timing** — when does it make sense to start a Self-Managed Super Fund with founder contributions?
8. **Investment company under trust** — would inserting an investment company between trust and Pty create tax efficiency in retained profits?

---

## Section 7 — How to read this with Nic

Recommend reading order:

1. **Main thesis (`act-money-thesis-discussion.md`)** — the proposed plan in 14 sections.
2. **This rebuttal (`act-money-thesis-rebuttal.md`)** — challenges to that plan, opportunities missed, scale corrections.
3. **Discussion** — for each rebuttal point in §2 and each opportunity in §3, decide:
   - Accept (incorporate into the plan)
   - Reject (with reason, log to decisions doc)
   - Defer (flag for Standard Ledger / R&D consultant)
4. **Update main thesis** with accepted points, mark deferred ones.

The main thesis structure is good. This rebuttal is incremental refinement, not a rewrite.

---

## Sources

- [R&D Tax Incentive Overview — business.gov.au](https://business.gov.au/grants-and-programs/research-and-development-tax-incentive/overview-of-rd-tax-incentive)
- [R&D Tax Incentive offset rates — Australian Taxation Office](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/research-and-development-tax-incentive-and-concessions/research-and-development-tax-incentive/rates-of-r-d-tax-incentive-offset)
- [R&D Tax Incentive — Complete Guide 2026, Australian Business Grants Finder](https://australianbusinessgrantsfinder.com.au/programs/rd-tax-incentive)
- [Maximising the R&D Tax Incentive Before 30 April 2026 — Moore Australia](https://www.moore-australia.com.au/news/maximising-the-rd-tax-incentive-what-tech-startups-and-scaleups-need-to-do-before-the-30-april-2026-deadline/)
- [Subdiv 122-A — Tax Talks](https://www.taxtalks.com.au/articles/subdiv-122-a/)
- [Small Business Restructure Roll-over — ATO](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/concessions-offsets-and-rebates/small-business-restructure-roll-over)
- [Small Business CGT Concessions Eligibility Overview — ATO](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/small-business-cgt-concessions/small-business-cgt-concessions-eligibility-conditions/cgt-concessions-eligibility-overview)
- [Small Business 15-year exemption — ATO](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/small-business-cgt-concessions/small-business-15-year-exemption)
- [Small Business Retirement Exemption — ATO](https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/incentives-and-concessions/small-business-cgt-concessions/small-business-retirement-exemption)
- [Indigenous Procurement Policy 2025 — NIAA](https://www.niaa.gov.au/sites/default/files/documents/2025-06/Indigenous-Procurement-Policy-2025-6-30.pdf)
- [Joint Ventures under IPP — NIAA](https://www.niaa.gov.au/resource-centre/joint-ventures-under-indigenous-procurement-policy)
- [Changes to IPP Joint Venture registration — Supply Nation](https://supplynation.org.au/joint-venture-changes/)

## Cross-reference within wiki

- [Main thesis — discussion document](act-money-thesis-discussion.md)
- [Main thesis — short version](founder-pay-and-rd-thesis-fy26-fy27.md)
- [Five-year cashflow model](five-year-cashflow-model.md)
- [Five-year plan — Voice, Flow, Ground](../decisions/2026-04-five-year-plan.md)
- [Founder Lanes and Top Two Bets](../decisions/2026-04-founder-lanes-and-top-two-bets.md)
- [R&DTI Claim Strategy FY26](rdti-claim-strategy.md)
- [Sole Trader → Pty Cutover Strategy](sole-trader-pty-cutover-strategy.md)
- [Knight Photography FY26 Invoice Proposal](../../thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md)
- [Migration Checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md)
- [Goods on Country project page](../projects/goods.md)
- [CivicGraph project page](../projects/civicgraph.md)
- [CivicGraph UK market entry research](../research/civicgraph-uk-market-entry.md)
