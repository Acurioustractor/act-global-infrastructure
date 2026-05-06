---
title: Sole Trader → ACT Pty Cutover Strategy
status: Live working strategy
date: 2026-05-05
parent: 2026-04-five-year-plan
canonical_entity: a-curious-tractor-pty-ltd
tags:
  - finance
  - r-and-d
  - founder-pay
  - cutover
  - tax-strategy
---

# Sole Trader → ACT Pty Cutover Strategy

> **One-line frame.** The cutover isn't an asset migration — most ACT assets are intangible. It's a **legal-and-tax repositioning** that unlocks ~$200K of refundable R&D offset over FY26-27, formalises founder personnel costs as the biggest R&D lever, ring-fences operating risk via limited liability, and gives the family trusts a clean dividend channel. The mechanics are mostly journal entries, not asset transfers.

---

## What's actually moving (and what isn't)

ACT is a software + services + community business. The "assets" Standard Ledger needs to deal with at cutover are mostly:

| Asset class | What we have | Cutover treatment |
|---|---|---|
| **Cash + bank balances** | NAB sole-trader account, ~$694K (per [pty-ltd-transition-and-rd-strategy](../../thoughts/shared/plans/pty-ltd-transition-and-rd-strategy.md)) | **Don't transfer the balance.** Sole trader keeps run-off cash for final BAS + receivables. Pty starts fresh from contracted income from 1 July. |
| **Receivables (invoices outstanding)** | ~$216K outstanding (e.g. Rotary INV-0222 $82.5K) | **Stay with sole trader.** Pre-cutover invoices belong to the entity that earned them (Cutover Rule 1). Sole trader bank account stays open through FY27 Q1 for run-off. |
| **Equipment / hardware** | Laptops, cameras, sound gear (~$30-50K replacement value) | **Transfer at market value via journal entry.** Triggers minor CGT event for sole trader; Pty gets depreciation base. Standard Ledger handles via stocktake list. |
| **Intellectual property (codebases, methodologies, brands)** | Substantial — ~50+ repos, LCAA, Aesthetics of Asymmetry, Empathy Ledger, ALMA, JusticeHub, Goods, etc. | **Transfer via written IP assignment deed.** This is the most legally important transfer. Drafted by Standard Ledger's referred lawyer. |
| **Contracts (grants, partnerships, supplier MOUs)** | QBE, Minderoo (pending), Innovation Studio engagements, Goods buyers/suppliers, Empathy Ledger licensing | **Novate or re-sign.** Per the [§1-2 of migration checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md). |
| **SaaS / subscriptions** | Xero, GHL, Supabase, Vercel, Anthropic, OpenAI, Google Workspace, etc. | **Update billing entity** from 1 July. Some (Stripe) require customer re-authentication with 30+ day notice. |

**The big move is not assets — it's where the operating activity flows from 1 July 2026.**

---

## The journal-entry approach (Standard Ledger's framing)

> *"Treat the sole trader as if it was conducting business on behalf of ACT Pty Ltd. Income was actually ACT's income; expenses were incurred on ACT's behalf."*
> — Standard Ledger conversation, 5 May 2026.

Mechanically: at cutover, Standard Ledger books a series of cross-entity journal entries that move FY26 sole-trader P&L lines into the Pty's opening books. The mapping spreadsheet (`scripts/export-sole-trader-to-pty-mapping.mjs` → `out/sole-trader-to-pty-mapping-FY26-YTD.csv`) is the input.

**For each line in the mapping CSV with `reallocate_to_pty = Y`:**
- Sole trader: credit income / debit expense (reverse it out of sole trader books).
- Pty: debit income / credit expense (book it into Pty books).
- Net effect: the FY26 economic activity ends up in the Pty's opening tax position; the sole trader nets to ~zero on what's been moved.

**For each line with `reallocate_to_pty = N` (currently ACT-FM and ACT-BV):**
- Stays where it is. Farm spend is Nic's to absorb personally OR transfer to a separate farm entity later.

**For each line with `reallocate_to_pty = REVIEW`:**
- Standard Ledger or Ben confirms the right tag before journals are booked. These are the Gate 3 lines from the [review workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md).

This avoids the messy and CGT-triggering "sell the business to itself" model. ATO-defensible because it reflects economic reality (a single founder team operating one business that incorporated mid-stream) and is documented contemporaneously.

---

## Founder pay structure (the biggest R&D lever)

### Why founder personnel cost dominates R&D maths

R&D Tax Incentive (43.5% refundable offset) lets the Pty claim the salary of staff working on registered R&D activities. **Salary is the largest single category** of eligible spend for software/civic-tech companies — much bigger than SaaS or contractors. Both founders' time is high-R&D (Ben ~95%, Nic ~40%), so paying them properly through payroll converts each $1 of founder labour into ~$0.43 of refundable cash.

### Decided structure (5 May 2026 with Standard Ledger)

Each founder targets ~$200K/year total compensation. **Mechanism:**

- **Base: $10K/month payroll + super + PAYG withholding.** Predictable, lifestyle-covering, tax handled by company. Subject to fair-work minimum wage (well above).
- **Top-up: drawn during the year as a director's loan account balance.** As cash needs arise, Ben or Nic withdraw cash; the loan account tracks the balance.
- **EOY settle (each 30 June):** the director's loan balance is closed out into one of:
  1. **Salary bonus** (with super top-up, taxed at marginal rate, fully R&D-eligible at ~95% / ~40%).
  2. **Dividend through the Knight or Marchesi Family Trust** (no super, franking credits, trust then distributes).
  3. **Sole-trader-style invoice** from each director's own ABN (Ben: Knight Photography ABN; Nic: his current sole trader ABN if kept open, or a new one). This is what Knight Photography historically was — see below.

### Why this beats just paying $200K straight salary

| Mechanism | Cash to founder | Tax cost | R&D-eligibility | Flexibility |
|---|---:|---:|---|---|
| All-salary $200K | $200K gross | ATO collects PAYG monthly; super on full $200K | 95% / 40% R&D-eligible | Low — locked in |
| $10K/mo + EOY settle | $120K predictable + lump sum | Tax matched to actual cash availability; super on base only unless bonus chosen | Same R&D-eligibility on the salary portion; trust distributions are downstream | High — choose at year-end based on cash |

The flexibility matters because ACT's revenue is lumpy (Goods $1M, grants land in tranches, contracts staggered). Locking in $200K salary creates monthly PAYG installment exposure on cash that may not be available; the $10K + director-loan model means the company always has the cash to pay payroll and the founders absorb the timing.

### How Knight Photography fits in

**Knight Photography** is Ben's sole-trader ABN, used historically as the invoicing vehicle for his work for ACT. **Six invoices totalling $173,600.01 across FY24-FY25** in the live Xero file (verified via Xero API direct query, 2026-05-05 — see `scripts/search-xero-knight-photography.mjs`). All ACCPAY, all PAID. The Supabase mirror only shows the 2 most recent because it starts at 2025-01-27.

| Date | Invoice # | Amount | Description |
|---|---|---:|---|
| 2023-10-01 | 15069 | $27,500.00 | (Con)nected - DASL Discovery Project Management |
| 2024-08-15 | 15070 | $16,500.00 | June's Patch Project Support + SMART Recovery Project Support |
| 2024-08-27 | 15071 | $27,500.00 | ReKindle project management |
| 2024-12-14 | 15075 | $23,100.00 | MingaMinga Website and Bimberi programs |
| 2025-06-20 | 15076 | $40,000.00 | ACT Projects - June 1 |
| 2025-06-20 | 15077 | $39,000.01 | ACT Projects June 2 |
| | | **$173,600.01** | |

**FY split:**
- **FY24 (Jul 2023 - Jun 2024):** $27,500 (invoice 15069 only) — R&D-forfeited under Path C.
- **FY25 (Jul 2024 - Jun 2025):** $146,100 (invoices 15070, 15071, 15075, 15076, 15077) — R&D-forfeited under Path C.
- **FY26 (Jul 2025 - current):** **$0**. No Knight Photography invoicing this FY.

**Read these correctly:**
- These are **not photo studio costs**. They're Ben's compensation through his sole-trader ABN, paid by Nic's sole-trader (ACT). Each invoice description tells you the actual ACT project (DASL Discovery, ReKindle, MingaMinga, June's Patch, SMART Recovery, generic "ACT Projects June").
- The 2 most recent invoices (15076, 15077) are tagged ACT-PS in the Supabase mirror — wrong tag, should be ACT-IN/EL/JH/etc per the line description. **Re-tag during Gate 3.**
- A separate "Benjamin Knight" contact also exists in Xero (empty placeholder, no invoices/transactions).
- All FY24-25 R&D opportunity is forfeited under Path C, but the tagging matters for clean cutover books.

**FY26 forward:** Under Path C, Ben's FY26 work goes into the Pty's R&D claim via the cross-entity journal-entry approach (treating the sole trader as having operated on behalf of the Pty). Knight Photography doesn't need to invoice for FY26 to make the R&D maths work — the journal entries do that. Post-cutover (1 July 2026), Ben can choose payroll-only, Knight Photography invoicing, or a mix.

**Going forward:**
- **Pre-cutover (now → 30 June 2026):** Ben's FY26 contribution is captured via the journal-entry approach — the work he did this year flows into the Pty's R&D claim through the cross-entity reallocation, valued at fair-market rates Standard Ledger sets.
- **Post-cutover (1 July 2026 →):** Ben can choose between (a) being a payroll employee of the Pty (cleanest for R&D) or (b) continuing to invoice via Knight Photography (cleaner for personal cashflow flexibility). Standard Ledger recommendation: payroll for the predictable portion, Knight Photography invoicing for any lumpy lump-sum work.
- **Knight Photography ABN stays open** as long as Ben might invoice the Pty for non-employment work. Costs ~$0/year to keep open.

The same logic applies to Nic if he wants a sole trader ABN for non-Pty income (Orange Sky, etc.) — keep it for the lumpy stuff, payroll for the base.

---

## R&D maximization play (Path C, FY26 lodgement July 2026 - April 2027)

### Eligibility frame (per [rdti-claim-strategy](rdti-claim-strategy.md))

| Spend category | FY26 estimate | Eligibility |
|---|---:|---|
| Founder personnel (Ben ~95% R&D, Nic ~40% R&D) | ~$160K (Ben at fair-market $200K × 95%) + ~$80K (Nic) | **Largest lever.** Both must be paid through Pty payroll or invoiced contractor for the R&D claim to attach. |
| Tagged ACT-IN spend | ~$284K | Direct R&D infrastructure (already tagged). |
| Tagged ACT-EL / ACT-DO / ACT-JH | ~$70K combined | Core R&D projects. |
| SaaS / API (Anthropic, OpenAI, Supabase, Vercel) | ~$13K | Supporting R&D — apportionable. |
| Contractors on R&D work | ~$15K | Eligible if work was on registered activity. |

**Total potential R&D-eligible spend:** ~$500K-$600K.
**Refundable offset @ 43.5%:** ~$215K-$260K cash back from ATO.

This is the single biggest financial lever in the cutover. Every pay-structure decision should be evaluated against "does this preserve or grow the R&D claim?"

### Operational requirements to preserve the claim

1. **Register R&D activities with AusIndustry** for FY26 — done by Pty under Path C, lodged with FY26 tax return (Jul 2026 - 30 Apr 2027 window).
2. **Contemporaneous records** — git commits, calendar events, agent logs already provide this; the Wiki has the activity register at [`thoughts/shared/plans/rd-activity-register-fy2025.md`](../../thoughts/shared/plans/rd-activity-register-fy2025.md).
3. **Receipt coverage on all R&D-tagged spend** — currently ~95% per Spending Intelligence v3; finish the receipt hunt before lodgement (Gate 2 of the [review workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md)).
4. **Founder time allocation** — document the ~95% (Ben) / ~40% (Nic) split with weekly evidence (calendar, commits, project reports). End-of-month allocation journals split payroll across projects accordingly (per [§11.2 of checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md#d112--founder-payroll-cadence-10kmo-base--director-loan--eoy-settle)).
5. **R&D consultant engagement** — schedule for May/June 2026 to review records before lodgement (per [§3 of checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md), Cutover Rule 3).

---

## Tax-reduction strategy summary

### Permanent reductions (don't go away)

- **R&D refundable offset (43.5%)** on eligible FY26 + FY27 spend → ~$200K-$260K/yr cash refund at current scale. **Largest single lever.**
- **Company tax rate (25% base rate entity)** vs marginal rate up to 47% — saves ~22 percentage points on retained profit.
- **Corporate veil** for limited liability — not a tax saving but a risk-cost saving (insurance premiums lower for incorporated entities in many cases).

### Timing levers (use selectively)

- **$20K instant asset write-off** before 30 June 2026 — applies to sole trader's FY26 return. If equipment is needed (cameras, computers, farm gear), buying before 30 June and deducting at marginal rate (sole trader) is more valuable than buying post-cutover at 25% (Pty).
- **Super contributions to cap ($30K/yr concessional)** before 30 June 2026 for Nic — fully deductible against sole trader income.
- **Pre-pay annual SaaS subscriptions** before 30 June 2026 — deductible in current FY at sole trader's marginal rate, then renewed by Pty for FY27.

### Trust distribution flexibility (post-cutover)

- Knight + Marchesi family trusts hold the Pty 50/50.
- Each year, Pty pays dividends up to the trusts; trustees then choose distributions to beneficiaries.
- Use this to smooth tax across years and beneficiaries (spouse, future children, lower-marginal-rate family members). **Decide year-by-year, not in advance.**

---

## "Money moved around" audit trail

Concern from the meeting: there's been significant movement of money between Nic's sole trader, founder personal accounts, Knight Photography, and project-specific accounts. The mapping spreadsheet exposes this — every line carries date, vendor, project code, and reallocation flag.

### What's actually in the books (verified via Supabase 2026-05-05)

**Four bank accounts tracked in Nic's sole trader Xero file:**

| Account | Lines | Notes |
|---|---:|---|
| `NAB Visa ACT #8815` | 2,105 | Business credit card. The bulk of small/recurring spend. |
| `NM Personal` | 619 | **Nic's personal account is in the books.** Founder draws and reimbursements flow through here. |
| `NJ Marchesi T/as ACT Everyday` | 320 | The actual sole-trader business account. |
| `NJ Marchesi T/as ACT Maximiser` | 4 | Sole-trader savings; only inter-account transfers. |

**Founder-related flows (not just Knight Photography):**

| Pattern | Lines | Gross | What it actually is |
|---|---:|---:|---|
| `NM Personal` SPEND (with contact) | 464 | $349K | Nic paying for stuff personally on behalf of ACT — needs vendor + project tagging |
| `NM Personal` SPEND-TRANSFER (NULL contact) | 43 | $315K | Bank-to-bank transfers from NM Personal → other accounts |
| `NM Personal` RECEIVE-TRANSFER (NULL contact) | 13 | $259K | Bank-to-bank transfers into NM Personal |
| `NM Personal` RECEIVE (with contact) | 99 | $87K | Income that landed in NM Personal first (should have gone to business account) |
| Contact = "Nicholas Marchesi" SPEND | 87 | $539K | Money paid TO Nic personally (founder draws + expense reimbursements) |
| Contact = "Nicholas Marchesi" RECEIVE | 90 | $301K | Money repaid BY Nic personally to ACT |
| **Net Nic-related personal flow** | — | **~$237K out** | Matches the $238K "Nicholas Marchesi salary" in [pty-ltd-transition-and-rd-strategy](../../thoughts/shared/plans/pty-ltd-transition-and-rd-strategy.md) — these are effectively Nic's drawings. |
| `NJ Marchesi T/as ACT Everyday` SPEND-TRANSFER | 124 | $1.11M | Inter-account transfers from main business → other accounts |
| Knight Photography invoices (Ben) | 2 | **$79K (FY25)** | Two invoices dated 20 Jun 2025, both PAID, currently mis-tagged ACT-PS. **Confirmed: only 2 invoices ever — no FY26 Knight Photography invoicing.** |

### What this means for the cutover

1. **Most of the "money moved around" is Nic-side, not Ben-side.** Ben has a single $79K vehicle (Knight Photography, FY25, R&D-forfeited). Nic has hundreds of personal-account transactions plus tens of inter-entity transfers.
2. **NM Personal in the Xero books is unusual but workable.** Standard Ledger needs to confirm the treatment — usually you'd journal Nic's personal account out as "loan from director" / "drawings" at cutover, leaving only the actual business-account activity in the sole trader's final books.
3. **NULL-contact transfers (~$574K combined)** are bank movements between accounts; they net out at the entity level but Standard Ledger needs to verify each pair settles.
4. **44 "Nicholas Marchesi" SPEND transactions on NM Personal ($320K)** plus 11 "Orange Sky Australia" RECEIVES on NM Personal ($38K) are direct evidence Nic's personal income (Orange Sky salary) is co-mingled with ACT's books.

**Implication for founder pay strategy.** Once the Pty has its own bank account from 1 July 2026, **personal accounts must NOT be tracked in the Pty Xero file.** Nic uses his personal accounts personally; the Pty pays him via payroll into a personal account; reimbursements flow through expense claims, not by tracking his personal cash flow as a business account. This is a clean break that the sole trader file currently doesn't have.

### Patterns to watch for in the Gate-3 review

- **NM Personal lines tagged ACT-XX:** these were Nic paying ACT expenses with personal cash — confirm project + reallocate to Pty per principle.
- **NM Personal lines with no project tag and a personal-feeling vendor (Coles, fuel, mortgage, school):** these are Nic's personal life — should be reallocated to "drawings" in journals, not project codes.
- **`Nicholas Marchesi` SPEND/RECEIVE pairs that don't net:** these need eyeballing — could be unmatched expense reimbursements.
- **Knight Photography $79K** — re-tag from ACT-PS to actual project mix (likely ACT-IN, ACT-EL, ACT-JH per Ben's recollection of June 2025 work). R&D opportunity is forfeited under Path C, but project tagging matters for clean cutover books.

The spreadsheet's `notes` column flags every `REVIEW` line; the goal is REVIEW count = 0 by mid-June 2026, with NM Personal lines explicitly classified as "business-via-personal" or "actual-personal-drawing" before cutover.

---

## Sequencing (where this sits in the broader cutover)

| When | What happens | Owner |
|---|---|---|
| **Now → 31 May 2026** | Run [review workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md) weekly. Get untagged to ~0. Re-tag Knight Photography to correct projects. Receipt coverage to 99%. | Ben |
| **Mid-May 2026** | R&D consultant engagement starts (per Cutover Rule 3). Reviews FY26 records for activity register completeness. | Ben + R&D consultant |
| **Late May 2026** | Final mapping spreadsheet generated. Standard Ledger reviews reallocation principle. | Ben + Standard Ledger |
| **June 2026** | Pre-cutover spend decisions: instant asset write-off, super top-up, SaaS pre-pay. | Ben + Nic |
| **22-29 June 2026** | Final sole trader invoices raised. Sole trader Xero closes to new entries. | Ben |
| **30 June 2026** | Cutover. Sole trader stops trading. Pty starts trading. | — |
| **July 2026** | First Pty payroll run. Director loan accounts open. New Stripe / banking active. Final sole trader BAS prepared. | Ben + Standard Ledger |
| **August 2026** | Cross-entity journal entries booked from mapping spreadsheet. | Standard Ledger |
| **Sept 2026 - Apr 2027** | FY26 R&D claim assembled and lodged via Pty. Refund expected within 60-90 days of lodgement. | Ben + R&D consultant + Standard Ledger |

---

## Open decisions (need owner sign-off)

- [ ] **Founder pay rate confirmation.** Standard Ledger to confirm $10K/mo + super is fair-market for two software/strategy directors (informs R&D defensibility).
- [ ] **R&D consultant selection.** Quote 2-3 firms specialising in software/civic-tech R&D claims. Engage by mid-May 2026.
- [ ] **Knight Photography role post-cutover.** Ben to decide: (a) close ABN, (b) keep dormant, (c) keep active for lumpy invoicing. Recommendation: keep active, costs ~nothing.
- [ ] **Nic's sole trader ABN post-cutover.** Same decision for Nic. Recommendation: keep active for Orange Sky and personal projects; deregister only after final sole trader BAS lodged.
- [ ] **Equipment stocktake list.** Ben + Nic compile by end-May. Standard Ledger sets transfer values.
- [ ] **Pre-30-June discretionary spend list.** Anything we'd buy in FY27 anyway → buy before 30 June at marginal rate. Cap at ~$50K combined.
- [ ] **FY27 budget for the Pty.** Income forecast, payroll plan, R&D activity registration scope. Sets the operating frame from 1 July.

---

## Cross-reference

- [Migration checklist](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md) — operational ledger
- [Finance Cutover Review Workflow](../../thoughts/shared/plans/finance-cutover-review-workflow.md) — weekly process
- [Money Alignment Snapshot 2026-05-01](../../thoughts/shared/reports/act-money-alignment-2026-05-01.md) — current state
- [R&DTI Claim Strategy FY26](rdti-claim-strategy.md) — R&D maths
- [Pty Ltd Transition & R&D Strategy](../../thoughts/shared/plans/pty-ltd-transition-and-rd-strategy.md) — historical strategy doc
- [Five-Year Cashflow Model](five-year-cashflow-model.md) — long-range frame
- [Harvest Subsidiary Decision](../decisions/2026-05-harvest-subsidiary-structure.md) — sub-entity for Harvest
