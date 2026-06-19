---
title: R&D FY26 window claim + FY27 setup
status: active
date: 2026-06-12
parent: rd-tax-incentive-fy2526-path-c
tags: [rd-tax, fy26, fy27, founder-pay, cutover]
---

# R&D: the best legitimate FY26, and a clean FY27

> Purpose: extract the maximum defensible R&D Tax Incentive value from FY26 inside Path C's rules, and set FY27 up so the full-year machine runs from 1 July. **Not tax advice.** Standard Ledger and the R&D consultant confirm everything here before money moves or anything is registered.

## Three rules that bound everything

1. **The claimant must exist and incur.** Only Pty activity from 24 Apr 2026 counts in FY26 (Path C, locked 2026-04-27). No journal, agency framing, or invoice wording reaches earlier.
2. **Associates must be PAID, not just owed.** Founder amounts must be paid by 30 June to enter the FY26 claim; unpaid amounts carry to the year actually paid, so nothing is lost, only delayed. Non-associate costs need only be incurred by 30 June. Standard Ledger confirms both readings.
3. **Real work at real rates.** The window holds what the founders actually did in it, priced at the same basis used all year. Inflating the window rate is the recharacterisation scheme at smaller scale.

## The $100K: already characterised, no flexibility

The transfers landed 6 Oct 2025 ($32K + $40K + $28K, bank reference "15069"). Option A (decided 2026-05-05) characterises them as Q1 FY26 work invoiced to the sole trader (Inv 15078, dated 2025-09-30). An invoice raised now describing that money as payment for post-24-April work would contradict a six-month-old bank trail. The flexibility Ben senses is real, but it lives in the next section, not here.

## The real lever: split the June quarter at 24 April

D11.5 Phase 2 has Inv 15081 ($50K, dated 2026-06-30) going to the sole trader for the June quarter. Nothing has been issued yet, so the quarter can be split at the date the Pty came into existence:

| Slice | Counterparty | Why |
|---|---|---|
| Work 1 Apr to 23 Apr | Sole trader (smaller invoice) | The Pty did not exist; the work was the sole trader's |
| Work 24 Apr to 30 Jun | A Curious Tractor Pty Ltd (new invoice) | The work genuinely built the Pty's IP after registration; claimable if engaged, documented, and paid by 30 June |

Same structure on Nic's side: window work as director's fees or an arm's-length invoice to the Pty, with the figure set by Standard Ledger (Path C already assigns them Nic's number).

## What the FY26 window claim looks like (rough shape; the consultant prices it)

| Component | Basis | Note |
|---|---|---|
| Ben window time | ~$44K ($250K basis × 95% R&D × ~68/365 days) | The window allocation may sit above or below 95% only if the window evidence says so |
| Nic window time | ~$15K ($200K basis × 40% × ~68/365) | Same: the actual window mix governs |
| Non-associate contractor R&D costs incurred by 30 Jun | TBD | Incurred suffices for non-associates; payment can follow |
| Pty-paid direct costs (cloud, API) | Small, ~$2-3K | Most SaaS bills to the sole trader until 1 July; not worth contortions |
| **Total** | **~$60-70K** | Clears the $20K minimum-spend floor; ≈ **$26-30K refund** at 43.5% |

Conditions: engagement papers dated now and describing the true window, evidence per project, and payment to associates by 30 June (which needs the NAB account plus Nick's seed loan sitting in the Pty). If payment misses 30 June, the associate slice enters the FY27 claim in the year paid. Late and clean beats rushed.

Per-dollar reality check (from the [holdco brief](../../wiki/decisions/2026-06-12-holdco-structure-proposal.md)): a founder invoice deducted against the sole trader's FY26 income is worth up to ~47c per dollar; the R&DTI pays 43.5c. The window claim is worth doing because it is clean and builds the FY27 pattern, not because it beats the deduction per dollar.

## Window evidence snapshot (generated 2026-06-12)

Commits across all branches, 24 Apr to 12 Jun 2026, via `git log --all --since=2026-04-24 --until=2026-07-01 --oneline | wc -l` per repo:

| Register | Repo | Commits | Active days |
|---|---|---|---|
| ACT-GD | Goods Asset Register | 440 | 30 |
| ACT-EL | empathy-ledger-v2 | 604 | 40 |
| ACT-CG | grantscope (CivicGraph) | 324 | 22 |
| ACT-JH | JusticeHub | 349 | 28 |
| ACT-IN | act-global-infrastructure | 789 | 37 |
| **Total** | | **2,506** | |

Read this correctly: commits evidence activity and time density, not eligibility or entity attribution by themselves. The registers' hypotheses and rd-capture entries classify which window work is core or supporting; the engagement and payment papers attribute it to the Pty. Density this high means the time allocations are defensible once the paperwork lands.

## Before 30 June: the eight moves

| # | Move | Owner | When |
|---|---|---|---|
| 1 | NAB account live (Nick's trust docs). Gates payment, which gates the FY26 associate claim | Nick | Now |
| 2 | Pty board minute + founder engagement letters, dated now, covering 24 Apr to 30 Jun work | Ben + Nick | This week |
| 3 | Confirm Knight Photography legal form (partnership vs sole trader; changes signatures and the PSI analysis) | Ben | This week |
| 4 | Issue Inv 15078 ($100K, sole trader), Phase 2 invoices, and the split Q4 invoices per above | Ben | Before 30 Jun |
| 5 | Nic's window figure set arm's length | Standard Ledger | Before 30 Jun |
| 6 | Pty pays the window invoices (seed loan funds it) by 30 June, or accept the FY27 carry | Ben + Nick | 30 Jun |
| 7 | rd-capture pass over the window: tag core-activity work in each register with window dates | Ben | Before 30 Jun |
| 8 | Window reconciliation with the R&D consultant (Path C action 6): cut register totals + salary allocations to the window | Ben + SL + consultant | Book now |

## Money movement before 30 June, step by step (scenario figures; Standard Ledger finalises)

### The asymmetry the "$200K each" framing hides

Nic cannot invoice himself. The sole trader is Nic, so money he takes out is **drawings**: no deduction, no tax event, he is taxed on the sole trader's profit whether or not the cash moves. The only deductible founder pay this year is what flows to Ben's side (Knight Photography invoices), plus the small window amounts the Pty pays each founder. Ben's invoices do double work: each dollar shifts taxable income from Nic to Ben AND gives Nic a deduction. That is why D11.5 sets Ben's side at ~$250K; it carries the equalisation.

**The ~$250K / ~$100K split is income routing for tax, not a pay verdict.** It falls out of two mechanics: only Ben has a separate entity (Knight Photography) to invoice through, so the deductible pay can only run through Ben; and Ben does ~95% R&D to Nic's 40%, so loading Ben's side also builds the larger R&D base. Whether that split matches the founders' true 50/50 economic share is a conscious call, not a default: set it as Decision 4 with Standard Ledger on **after-tax** outcomes (Ben's $250K carries a large personal tax bill; Nic's lighter cash carries the sole-trader profit tax) and on what each founder has already drawn this year, then route to hit that number. The call's figure was ~$200K each; $250K is the current R&D-plan working figure, not fixed.

**Both founders hold a director loan account, not just Nick.** Ben can lend to the Pty too. If Ben has cash, he seeds alongside Nick. If not, Ben's loan lane is created from FY27 when Knight Photography gear is sold to the company at market value with the price credited to Ben's loan account (no cash needed), and whenever the company owes Ben (a booked-but-unpaid window invoice, or business costs Ben pays personally). Either route gives Ben the same tax-free repayment lane Nick gets from the seed loan, which keeps the 50/50 even. A Nick-only seed otherwise has to be squared in the Shareholders Agreement.

### What one dollar of founder pay returns, by route

The receiving founder pays personal tax on the dollar under every route; that never changes. What differs is what the payer gets back:

| Route | Payer's return per $1 | When |
|---|---|---|
| Sole trader pays a Ben invoice (D11.5) | ~47c deduction against Nic's top-bracket income | Nic's FY26 return (or reduced instalments) |
| Pty pays window R&D pay (this plan) | 43.5c refundable offset (replaces the deduction) | Cash after the FY26 company return lodges, months away |
| Pty pays it as an ordinary non-R&D cost | 25c deduction, only against future Pty profit | Whenever profitable |
| Anything routed via a family trust as service income | Rejected (PSI attribution risk, D11.5) | n/a |

Caveat: 47c holds while Nic's taxable income stays above ~$190K after deductions; below that the marginal value steps down. Whether Nic deducts on invoice or on payment depends on his accounting basis (cash vs accruals): Standard Ledger confirms, so treat **paid by 30 June** as the safe default for everything.

### The sequence

| # | Step | Mechanics | Owner |
|---|---|---|---|
| 1 | NAB account opens (trust docs) | Gates every Pty-side payment | Nick, now |
| 2 | Decision 1 (operating entity) by 19 Jun | Does not change these FY26 moves; sets where FY27 payroll + contracts land | Ben + Nick + SL |
| 3 | Raise Inv 15078 ($100K to sole trader) | Per D11.5: matches the 6 Oct 2025 transfers; Nic enters as ACCPAY; SL books the director-loan journal for the off-Xero source | Ben |
| 4 | Raise Phase 2 invoices 15079 + 15080 ($50K each, to sole trader) | Per D11.5 (Option A, confirmed with SL 2026-05-05); sole trader pays from its account | Ben |
| 5 | Raise the split Q4 pair | Small invoice (work 1 to 23 Apr) to sole trader; window invoice (~$37-44K, work 24 Apr to 30 Jun) to the Pty | Ben + SL |
| 6 | Board minute + engagement letters for the window | Dated now, describing the true period | Ben + Nick |
| 7 | Nic seeds the Pty | Transfer to the new NAB account, documented as a director loan (loan note, separate loan account per founder). Scenario size: $75-100K = window payments (~$55-60K) + first-month FY27 buffer | Nick + SL |
| 8 | Pty pays Ben's window invoice + Nic's window director's fees | By 30 June for the FY26 claim (associate rule); from seed funds. If NAB is not live, accept the FY27 carry rather than improvising | Ben + Nick |
| 9 | Nic draws his cash from the sole trader as drawings | No invoice, no deduction, no tax event; liquidity only. Check sole trader cash against the ~$507K uncollected receivables before sizing | Nick |
| 10 | Trustee resolutions if either family trust has ANY FY26 income | Standard 30 June trap; SL confirms whether needed | Ben + Nick + SL |
| 11 | Provision for personal tax | Ben: expect a large assessment on ~$250K of invoice income (payment plan available; PAYG instalments likely next year unless payroll replaces the pattern). Nic: provision on remaining profit | Both |

### What does NOT move before 30 June

- **Nothing to the family trusts.** No service invoices through trusts (PSI, rejected in D11.5); no dividends possible because the Pty has no profit yet. Trusts matter from FY27+ as shareholders receiving franked dividends.
- **No borrowing FROM the Pty.** Div 7A discipline is a FY27 concern; before 30 June the only director loans run INTO the Pty.
- **The $100K characterisation.** Fixed by the bank trail.
- **SaaS and cloud billing.** Stays with the sole trader until the 1 July migration; already deductible at ~47c there, so re-contracting mid-June to chase 43.5c on ~$2-3K is negative-value work.

### Director loans: how to get the most from them

Before 30 June the lever is loans **in**: a documented seed loan creates a future tax-free extraction lane, because loan repayments out of the company are not income. First cash out repays the loans before anything is called salary or dividend. Keep one loan account per founder; if only Nic seeds, only Nic holds that lane, so either both seed or the imbalance is tracked and squared in the Shareholders Agreement. From FY27 the direction flips: in-year top-ups are drawn against director loan accounts and cleared or put on Div 7A complying terms by 30 June 2027.

Target shape per the Money Framework: ~$627K eligible (personnel + ACT-IN + per-project + SaaS) supporting the pack's $200-250K refund range, against ~$70K from base payroll alone ($120K × 95% + $120K × 40% = $162K basis).

1. **Decision 1 (operating entity) lands by 19 June.** The claimant, payroll employer, contracts, trading name, and AusIndustry registration all key off it.
2. **Payroll from day one** (D11.2): $10K/month each + super (super on R&D salaries is a claimable on-cost), STP, monthly journal allocation across project codes.
3. **Top-ups characterised as bonus salary are claimable when paid; dividends are not.** The D11.5 Phase 3 table already encodes this.
4. **Every R&D cost lands in the claimant from 1 July**: justice and storytelling contracts, contractors, cloud and API spend, subscriptions migrating per checklist §5.
5. **Dext per-project receipt addresses** (D11.3): receipt coverage sets the refund floor (the pack's low bound applies a 0.85 receipt factor; closing receipts closes that gap).
6. **rd-capture stays the habit**: hypothesis-linked, dated entries per register, written when the work happens.
7. **Overseas Finding** for the World Tour lodged before 30 Jun 2027 (Path C action 5).
8. **Consultant watch items**: feedstock adjustments if Goods experimental production output gets sold; clawback applies to government recoupments only (Snow and QBE are private, but flag any government grant that funds R&D); aggregated turnover stays under $20M for the 43.5% rate.

## Best-case FY26: every legitimate lever (confirm each with Standard Ledger)

Ranked by dollar impact. None of these change the Path C ceiling on R&D (still the 10-week window). The gains are tax timing and structure, all before 30 June.

1. **Personal deductible super contributions, with carry-forward catch-up: the biggest single lever.** Both founders declare large personal income this year (Ben ~$250K via invoices, Nic on the sole-trader profit). A personal concessional super contribution is deductible at the marginal rate (~47c) and taxed at only 15c inside super: roughly 32c net saving per dollar. The standard cap is $30K (FY26), but unused concessional cap from the prior five years carries forward if total super balance was under $500K on 30 June 2025. Founders who have run lean likely hold large unused caps, so the deductible contribution could be well above $30K each. Two caveats: it must reach the fund before 30 June and is locked until preservation age (so size it to cash you can spare after tax and living), and Division 293 adds 15% on contributions for income over $250K (Ben's likely zone), which trims but does not remove the benefit. Confirm caps, carry-forward, TSB, and Div 293 with Standard Ledger or a licensed adviser.

2. **Move the maximum deductible founder pay before 30 June.** Ben's Knight Photography invoices (~$213K) are the only deductible founder pay; each dollar reduces Nic's sole-trader profit. Whether the deduction needs the invoice paid or only issued by 30 June depends on Nic's accounting basis (cash vs accruals): on accruals, issue them all by 30 June and let payment follow; on cash, they must be paid. SL confirms the basis; default to paid-by-30-June.

3. **Secure the R&D window refund (~$26K) by paying it before 30 June.** Both founders co-seeding the Pty (lever 4) removes the risk that Nick's cash is tied up in the ~$507K of receivables when the ~$59K window slice falls due. Paid by 30 June it is this year's; unpaid it carries to FY27.

4. **Both founders open and seed director loan accounts.** Ben lends alongside Nick (or builds the lane from the FY27 Knight Photography asset sale). Both then hold the tax-free repayment lane, the 50/50 stays even without leaning on the Shareholders Agreement, and the Pty has working capital to pay the window slice now and run payroll from 1 July.

5. **Prepay deductible expenses before 30 June.** A small business can prepay and deduct up to twelve months of eligible expenses (insurance, subscriptions, rent, professional fees). Brings the deduction into FY26. Modest, but free.

6. **Provision tax and set the split consciously.** Set aside 40-45% of personal receipts; arrange an ATO payment plan if needed. Set the real FY26 split (Decision 4) on after-tax outcomes, not on the routing the mechanics happen to produce.

## One email to Standard Ledger + the consultant (this week)

1. Confirm the associate paid-by-30-June rule and the carry-to-year-paid fallback.
2. Confirm the Q4 invoice split at 24 April and the engagement paperwork to support it.
3. Set Nic's arm's-length window figure.
4. Window reconciliation of the $354K register totals (Path C action 6).
5. Knight Photography legal form + PSI posture for invoicing the Pty.
6. Any issue with the Pty paying window invoices out of seed-loan funds.
7. FY26 vs FY27 modelling: 47c sole-trader deduction vs 43.5c refundable offset, founder cash needs, and the final draw split.
8. Asset transfers (sole trader + Knight Photography → group): going-concern GST treatment, Subdiv 328-G rollover availability given the 50/50 trust ownership, effective date per class (default 1 July so recapture lands in Nic's low year), vehicles vs charge-back (FBT), Goods plant placement given community-ownership intent, and consideration credited to director loan accounts. Register: `thoughts/shared/finance/asset-transfer-register-2026.md`.

## Cross-references

- [Path C decision record](rd-tax-incentive-fy2526-path-c.md) (action 6 = the window reconciliation)
- [FY26 evidence pack](../rd-pack-fy26/README.md) + `STANDARD-LEDGER-PACK-INDEX.md`
- [Holdco brief, §FY26 R&D and founder pay](../../wiki/decisions/2026-06-12-holdco-structure-proposal.md)
- [Knight Photography FY26 invoice plan (D11.5)](knight-photography-fy26-invoice-proposal.md)
- [Migration checklist §12](act-entity-migration-checklist-2026-06-30.md)
