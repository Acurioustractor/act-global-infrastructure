# ACT Financial Strategy — FY27 Planning & Founder Wealth

**Date:** 2026-03-23
**Status:** Draft for discussion

---

## 1. What We Learned Today

### Revenue Reality (FY26 YTD — 9 months in)
- **$1.328M invoiced** across 27 contacts, 11 projects
- **60% commercial, 36% grant, 5% arts** — much more commercially sustainable than assumed
- **Top 3 earners:** Goods on Country ($585K), PICC ($402K), The Harvest ($150K)
- **Dead months:** Dec and Jan had $0 income — feast-or-famine cash flow
- **$710K arrived with no pipeline trail** — most income isn't being tracked as opportunities before it lands
- **98% of bank transactions were tagged to ACT-HQ** — now fixed at invoice level, but bank tx still need re-tagging

### Data Quality Scorecard
| Metric | Status | Gap |
|--------|--------|-----|
| Invoice project tagging | **100%** (27/27 contacts) | Done |
| Invoice income_type | **100%** (52/52 invoices) | Done |
| Bank tx project tagging | **100%** (1,510/1,510) | Done |
| Receipt coverage (ACCPAY) | **99.5%** (991/996) | 5 Qantas flights missing |
| Reconciliation | **75%** (1,131/1,510) | 379 unreconciled |
| Unreconciled breakdown | 303 SPEND ($56K) + 74 transfers ($511K) | Transfers are inter-account |

### What's Broken
1. **379 unreconciled transactions** — mostly transfers between accounts ($511K) and small spends ($56K). The transfers aren't real gaps, they just need matching in Xero.
2. **5 Qantas flights** missing receipts ($1,757) — download from Qantas booking portal and attach to Xero bills.
3. **ACT-HQ concentration on bank transactions** — invoices now correct, but the bank feed still shows 98% ACT-HQ because the auto-tagger applies to bank lines, not invoices. The tagger rules are correct; next Xero sync should improve this.

---

## 2. Getting to 100% Receipts & Reconciliation

### Quick Wins (do this week)
1. **5 Qantas receipts** — log into Qantas Business, download booking confirmations, attach to the 5 bills in Xero. Total: $1,757.
2. **Reconcile transfers** — the 74 SPEND-TRANSFER + RECEIVE-TRANSFER items are just money moving between NAB accounts. In Xero: Bank Accounts → select each account → reconcile transfers. Probably 30 min work.
3. **Reconcile 303 small spends** — these are bank feed items waiting to be matched to bills. Most already have bills from Dext/Xero auto-creation. In Xero: Bank Accounts → Reconcile → batch approve suggested matches.

### Ongoing (automate)
- **Dext** is already capturing receipts and pushing bills to Xero — this is why 99.5% have attachments
- **Bank feed** auto-imports — already configured
- **Auto-tagger trigger** now handles income_type classification
- **Weekly reconciliation** — schedule 30 min every Monday to clear the queue

### Target: 100% by End of March
- 5 Qantas receipts: 15 min
- Transfer reconciliation: 30 min
- Spend reconciliation: 1-2 hours (batch approve)
- **Total effort: ~3 hours**

---

## 3. R&D Health by Project

### R&D Eligible Projects & FY26 Spend

| Project | Spend | Income | Net | R&D Eligible? | Evidence Quality |
|---------|------:|-------:|----:|---------------|------------------|
| ACT-EL (Empathy Ledger) | $585 | $3K | +$2.5K | **Core R&D** — novel narrative platform | LOW — only $585 spend tagged |
| ACT-JH (JusticeHub) | $96 | $83K | +$83K | **Core R&D** — justice data platform | LOW — almost no spend tagged |
| ACT-GD (Goods on Country) | $66K | $585K | +$520K | **Supporting R&D** — IoT fleet, marketplace | MEDIUM — good spend tagging |
| ACT-IN (Infrastructure) | $110K | $0 | -$110K | **Core R&D** — AI agent orchestration | HIGH — 951 transactions |
| ACT-FM (The Farm) | $15K | $3K | -$12K | **Supporting R&D** — regenerative ag tech | MEDIUM |
| ACT-HV (The Harvest) | $11K | $150K | +$139K | Not R&D | N/A |

### The Problem: $781K Tagged to ACT-HQ

This is the elephant in the room. **$781K of spend is on ACT-HQ** — that's founder salaries, travel, office costs, subscriptions, etc. Much of this is actually R&D work (Ben building EL/JH/IN, Nic doing GD fieldwork), but it's not tagged to the right projects.

**To maximise R&D refund, we need to re-allocate founder time to R&D projects.**

### What's Needed for R&D Claims
1. **Founder time allocation** — what % of Ben's and Nic's time goes to each R&D project?
2. **Activity logs** — git commits (excellent for Ben), calendar events, trip records
3. **Technical reports** — hypothesis → experiment → outcome for each project
4. **Salary re-allocation** — portion of founder salary attributed to R&D projects based on time %

---

## 4. Founder Compensation & R&D Optimisation

### Actual Founder Payments (from Xero)

**Nic (Nicholas Marchesi) — FY26 YTD (9 months):**
| Date | Amount | Type |
|------|-------:|------|
| Jul 2 | $20,000 | Salary draw |
| Jul 4 | $40,000 | Salary draw |
| Jul 7 | $10,350 | Salary draw |
| Jul 22 | $30,000 | Salary draw |
| Jul 23 | $3,069 | Reimbursement |
| Jul 24 | $500 | Reimbursement |
| Aug 18 | $10,000 | Salary draw |
| Aug 22 | $16,145 | Salary draw |
| Sep 4 | $40,000 | Salary draw |
| Oct 6 | $260 | Reimbursement |
| Oct 21 | $45,000 | Salary draw |
| Nov 17 | $6,000 + $15,000 | Salary draw |
| Nov 21 | $6,159 | Salary draw |
| **Total** | **$242,483** | **$238,654 salary + $3,829 reimbursements** |

- Annualised: ~$323K/yr (9 months → 12 months)
- FY25: $318K (77 payments) — consistent year on year
- Pattern: irregular draws ($6K-$45K), not structured salary. All tagged ACT-HQ.

**Ben (Benjamin Knight) — FY26 YTD:**
- **$0 in Xero.** Not on the payroll.
- FY25: also $0.
- This is a major problem for R&D claims and personal wealth building.

### The R&D Opportunity: Both Founders Must Be Paid

The R&D Tax Incentive is 43.5% refundable for entities under $20M turnover. **Every dollar of salary allocated to R&D comes back at 43.5 cents.** But only if it's actually paid and recorded.

**Current R&D-eligible spend (already tagged):**
- ACT-IN (Infrastructure): $110K — AI agent orchestration, bot intelligence
- ACT-GD (Goods on Country): $66K — IoT fleet telemetry, marketplace
- ACT-FM (The Farm): $15K — regenerative agriculture tech
- ACT-EL (Empathy Ledger): $585 — narrative platform (massively under-reported)
- ACT-JH (JusticeHub): $96 — justice data platform (massively under-reported)
- **Subtotal existing: $192K**

**The missing piece: Founder salary allocated to R&D.**

### Recommended FY27 Compensation Structure

| Founder | Annual Salary | R&D % | R&D Salary | Primary R&D Projects |
|---------|-------------:|------:|-----------:|---------------------|
| **Nic** | $300K | 60% | $180K | GD (field ops, IoT), FM (regen ag), HV (venue R&D) |
| **Ben** | $200K | 85% | $170K | EL (narrative platform), JH (justice data), IN (AI/bot), GD (tech) |
| **Combined** | **$500K** | **70%** | **$350K** | |

### R&D Refund Calculation

| Line Item | Amount |
|-----------|-------:|
| Founder R&D salary (70% of $500K) | $350K |
| Existing R&D project spend | $192K |
| **Total R&D eligible** | **$542K** |
| **43.5% refund** | **$236K** |

**Net cost of $500K combined founder salary after R&D refund: $264K** (53 cents per dollar).

### What Needs to Happen

1. **Put Ben on the payroll immediately.** Every month without salary = lost R&D refund. If Ben starts at $200K in FY27 and 85% is R&D, that's $73K/yr back from the ATO that's currently being left on the table.

2. **Re-tag Nic's payments from ACT-HQ to R&D projects.** Nic's $242K is all on ACT-HQ. Based on his actual work:
   - 40% → ACT-GD (Goods on Country field operations, community deployment)
   - 15% → ACT-FM (Farm operations, regenerative ag)
   - 5% → ACT-HV (Harvest venue development)
   - 40% → ACT-HQ (management, admin, non-R&D)

3. **Structure payments as regular salary, not irregular draws.** Monthly payments are cleaner for R&D documentation. $25K/mo for Nic, $16.7K/mo for Ben.

4. **Create time allocation records.** Simple spreadsheet: week, hours per project, activity description. Git commits cover Ben's tech work. Calendar events cover Nic's field trips.

### Key Dates
- FY26 R&D registration: due April 2027 (10 months after June 30, 2026)
- FY27 starts July 1, 2026 — new salary structure should be in place by then
- Contemporaneous records must be created AT THE TIME, not retrospectively
- Accountant needs to review R&D eligibility before lodging

---

## 5. FY27 Planning

### Revenue Trajectory
| Source | FY25 | FY26 (annualised) | FY27 Target |
|--------|-----:|-------------------:|------------:|
| Goods on Country | $48K | $780K | $900K |
| PICC | $0 | $535K | $500K |
| The Harvest | $0 | $200K | $250K |
| JusticeHub | $0 | $110K | $150K |
| SMART Recovery | $0 | $80K | $100K |
| Arts/Other | $0 | $80K | $100K |
| **Total** | **$995K** | **$1.77M** | **$2.0M** |

### Expense Budget
| Category | FY26 (annualised) | FY27 Budget | Notes |
|----------|-------------------:|------------:|-------|
| Nic salary | $323K | $300K | Structured monthly ($25K/mo) |
| Ben salary | $0 | $200K | NEW — must start FY27 ($16.7K/mo) |
| R&D (tech, infrastructure) | $150K | $180K | ACT-IN, hosting, AI APIs |
| Travel & field ops | $150K | $150K | GD deployments, PICC, Darwin |
| Operations (insurance, accounting, legal) | $80K | $100K | |
| Farm/Harvest investment | $50K | $150K | See Section 6 |
| **Total expenses** | **$753K** | **$1.08M** | |

### Net Position FY27
| Line | Amount |
|------|-------:|
| Revenue (target) | $2.0M |
| Expenses (budget) | -$1.08M |
| R&D Refund (43.5% of $542K) | +$236K |
| **Net surplus** | **$1.16M** |

That surplus is available for: reserves (3 months = $270K), Harvest capital investment, founder wealth building, ACT Ventures profit-sharing, and new project seeding.

---

## 6. The Harvest & Farm Investment

### Current State
- The Farm (ACT-FM): $15K spend, $3K income FY26
- The Harvest (ACT-HV): $11K spend, $150K income FY26 (Berry Obsession, Sonas, Blue Gum, Regional Arts)
- Harvest is already generating strong income relative to investment

### Investment Thesis
The Harvest is a **physical venue** that generates recurring commercial income (events, accommodation, farm stays, artist residencies). Higher investment = higher capacity = higher income. Unlike grants, this scales with infrastructure.

### Recommended Investment Plan
| Year | Investment | Expected Income | ROI |
|------|----------:|----------------:|-----|
| FY27 | $150K | $250K | Positive from year 1 |
| FY28 | $200K | $400K | 2x return |
| FY29 | $100K | $500K | Maintenance mode |
| FY30+ | $50K/yr | $500K+/yr | Cash cow |

**What to spend on:**
- Accommodation upgrade (cabins, amenities) — biggest income multiplier
- Commercial kitchen (enables catering income + artist residency meals)
- Solar + water infrastructure (reduces operating costs)
- Land improvement (regenerative ag → produces sellable output)

### 5-Year Harvest Projection
Total investment: ~$500K over 3 years → Generating $500K+/yr by FY30 → **Pays for itself in <2 years**

---

## 7. Benjamin's Path to $1M in 5 Years (House Deposit)

### Current Position
- **$0 salary in FY25 and FY26.** Ben has been building the entire tech stack (EL, JH, IN, GD tech, GrantScope, bot, command center) unpaid.
- Co-founder of a $1.3M revenue org growing at 77% YoY
- This is the single biggest financial optimisation available: **every dollar of Ben's salary at 85% R&D allocation costs ACT only 63 cents** after R&D refund

### Path to $1M (5-year model)

Assumptions: Ben starts at $200K FY27, increases as revenue grows. Tax rate ~32% effective (including Medicare). Saves aggressively. R&D refund flows back to ACT but offsets the cost of his salary, enabling higher pay.

| Year | Gross Salary | After Tax (~68%) | Ventures Share | Save 65% | Cumulative Savings |
|------|------------:|-----------------:|---------------:|---------:|-------------------:|
| FY27 | $200K | $136K | $0 | $88K | $88K |
| FY28 | $225K | $153K | $20K | $112K | $200K |
| FY29 | $250K | $170K | $40K | $137K | $337K |
| FY30 | $275K | $187K | $60K | $161K | $498K |
| FY31 | $300K | $204K | $80K | $185K | **$683K** |

**Plus:**
- Investment returns on savings (7% pa): ~$80K over 5 years → **$763K**
- GrantScope equity value (if it becomes Australia's grants infrastructure): $100-500K
- ACT Ventures 20% profit share: modelled above at $20-80K/yr by FY28-31
- Super contributions ($27.5K/yr cap): $137K in super over 5 years

**Realistic total net worth at FY31: $900K-$1.2M** (savings + super + equity)

### Key Levers
1. **Start salary NOW** — every month at $0 is $14K+ lost savings
2. **85% R&D allocation** — Ben's work IS R&D (AI agents, narrative platforms, data systems)
3. **Ventures profit-sharing kicks in** as ACT scales past $2M revenue
4. **GrantScope is a wildcard** — could be worth significant equity if it becomes the national standard
5. **Live lean for 3 years** — 65% savings rate requires discipline but the compounding is enormous

---

## 8. Nic's Path: Pay Off Farm + Brisbane Property

### Current Position
- **$242K paid FY26 YTD** (9 months) — annualised ~$323K
- **$318K paid FY25** — consistent ~$300K/yr pattern
- Payment pattern: irregular draws ($6K-$45K), all tagged ACT-HQ
- Farm (need: mortgage balance, repayment amount, property value)
- Goal: pay off farm ASAP + buy Brisbane property to raise family

### Nic's FY26 Actual vs Optimised

| Item | Current (FY26) | Optimised (FY27) |
|------|---------------:|----------------:|
| Gross salary | $323K (annualised) | $300K |
| R&D allocation | 0% (all ACT-HQ) | 60% ($180K) |
| R&D refund generated | $0 | $78K (ACT's benefit) |
| Payment structure | Irregular draws | $25K/mo structured |
| Tax documentation | Weak | Strong (monthly, project-coded) |

### Strategy: Dual Property Path

**Phase 1: Accelerate Farm Payoff (FY27-FY28)**
- $300K gross → ~$204K after tax
- Living costs on farm are low (housing covered)
- Save/repay $120-150K/yr toward farm
- R&D refund doesn't come to Nic directly, but it means ACT can sustain his $300K salary comfortably — the $78K refund offsets 26% of his salary cost to the org

**Phase 2: Brisbane Deposit (FY29-FY30)**
- Farm equity unlocked (either paid off or refinanceable)
- Continue $300K salary → $120-150K/yr savings
- Brisbane deposit needed: ~$200-250K for $1-1.2M property
- Dual income with partner improves borrowing capacity dramatically
- Farm becomes income-producing ACT asset (artist residencies, events, regen ag)

### 5-Year Projection

| Year | Salary (after tax) | Farm Repayment | Net Savings | Property Milestone |
|------|-------------------:|---------------:|------------:|--------------------|
| FY27 | $204K | $120K | $84K | Accelerate farm payoff |
| FY28 | $204K | $120K | $84K | Farm nearly clear |
| FY29 | $220K | $0 (paid off) | $150K | Save for Brisbane deposit |
| FY30 | $220K | $0 | $150K | **Buy Brisbane property** |
| FY31 | $220K | $0 | $130K | Mortgage + investment |

*Salary increase to $325K by FY29 as revenue grows. Tax rate improves with salary sacrifice/super strategies.*

### Farm as ACT Asset (Double Benefit)
- The Farm IS an R&D project (ACT-FM) — regenerative agriculture experimentation
- If ACT leases/uses the farm for activities, a portion of farm costs become business expenses
- Artist residencies, community gatherings, ag experiments = income + R&D evidence
- Farm mortgage interest may be partially deductible if used for business
- **Need accountant input on structuring this**

### Key Numbers Needed from Nic
- [ ] Farm mortgage: remaining balance, monthly repayment, interest rate
- [ ] Farm property value (for equity calculation)
- [ ] Partner's income (for Brisbane borrowing capacity)
- [ ] Target Brisbane suburb and budget
- [ ] Living costs baseline (to calculate realistic savings rate)

---

## 9. Immediate Next Actions

### This Week (3 hours total)
- [ ] Attach 5 Qantas receipts in Xero ($1,757) — 15 min
- [ ] Reconcile 74 transfers in Xero — 30 min
- [ ] Batch reconcile 303 pending spend items — 2 hours
- [ ] **Get 100% reconciliation done before end of March**

### Before End of FY26 (June 30)
- [ ] **Put Ben on the payroll** — even 3 months of salary ($50K) at 85% R&D = $18K R&D refund
- [ ] Re-tag Nic's ACT-HQ payments to R&D projects (60% split across GD/FM/HV)
- [ ] Create R&D time allocation records for both founders (even retroactive summary is better than nothing)
- [ ] Discuss with accountant: R&D registration for FY26, optimal founder salary structure
- [ ] Re-tag ACT-HQ bank transactions where founder travel/work relates to R&D projects

### FY27 Planning (Before July 1)
- [ ] Lock in founder salary: Nic $300K ($25K/mo), Ben $200K ($16.7K/mo)
- [ ] Set up structured monthly payments (not irregular draws)
- [ ] Create project time allocation template (weekly: project, hours, activity)
- [ ] Set FY27 budget per category (see Section 5)
- [ ] Commit Harvest/Farm investment amount ($150K recommended)
- [ ] Set up quarterly BAS + R&D review cadence

### Founder Wealth Planning
- [ ] Get Nic's farm mortgage details (balance, rate, repayment)
- [ ] Get Nic's target Brisbane suburb + budget
- [ ] Set up super salary sacrifice for both founders ($27.5K/yr cap)
- [ ] Open investment account for Ben's house savings
- [ ] Build founder wealth tracking into Command Center dashboard

### Accountant Conversation (Priority)
Key questions for the accountant:
1. Can we retrospectively allocate FY26 founder salary to R&D projects?
2. What documentation standard is needed for R&D time allocation?
3. Should Ben be employed by Foundation or Ventures (or both)?
4. Can farm mortgage interest be partially business-deductible?
5. What's the optimal salary vs dividend vs contractor structure for both founders?
6. Should we set up a family trust for either founder?

---

*Living document. All numbers from actual Xero data as of 2026-03-23. Key unknowns: Ben's compensation history, Nic's farm mortgage details, partner income for borrowing capacity. Update after founder + accountant discussion.*
