# BAS Preparation + Sole Trader → Pty Ltd Transition Plan

**Created:** 2026-03-17
**ABN:** 21 591 780 066 (A Curious Tractor)
**Current entity:** Sole trader (to be confirmed on ABR)

---

## PART 1: IMMEDIATE — Q3 BAS Preparation (Jan-Mar 2026)

### BAS Due: April 28, 2026 (42 days away)

**Current Q3 State:**
- 58.7% of Q3 transactions tagged (121 need project codes)
- 16.1% receipt coverage (140 of 867 transactions)
- $6,386 GST at risk from missing receipts
- Outstanding receivables: $300,900 (some 380+ days overdue)

### Action Items (Priority Order)

1. **Tag Q3 transactions** — `node scripts/tag-transactions-by-vendor.mjs`
   - Gets coverage from 58.7% back to ~99%

2. **Chase critical receipts manually:**
   - Qantas: $52,249 across 77 transactions ($5,225 GST at risk) — download from Qantas Business portal
   - Uber: $8,645 across 234 transactions ($864 GST at risk) — export from Uber Business dashboard
   - These two vendors alone = $6,089 of the $6,386 total GST at risk

3. **Improve matching — add vendor aliases:**
   - Uber* patterns, Virgin Australia Airlines, Qantas Airways
   - OpenAI/Xero/Webflow (USD→AUD conversion handling)
   - Estimated: +150-250 matches from alias fixes alone

4. **Run full receipt reconciliation:**
   - `node scripts/receipt-reconciliation-agent.mjs`
   - `node scripts/match-receipts-to-xero.mjs --apply --ai`

5. **Chase overdue receivables:**
   - Rotary Eclub: $82,500 (326 days overdue)
   - Social Impact Hub: $10,800 (383 days overdue)
   - Virgin Australia: $8,431 (400+ days — likely reconciliation issue, not real debt)

6. **Generate reconciliation checklist for accountant:**
   - `node scripts/generate-reconciliation-checklist.mjs`

---

## PART 2: LAST QUARTER REVIEW — Q2 FY26 (Oct-Dec 2025)

### Financial Summary
- Total spend: $173,460
- GST claimable: $7,412
- Receipt coverage: ~16% (critical gap)
- Project tagging: 98.8% (good)

### Patterns Identified
- **R&D project spend:** $139,549 across 642 transactions (ACT-IN primary project)
- **Travel is biggest receipt gap:** Qantas + Uber + Virgin = bulk of missing receipts
- **SaaS subscriptions:** OpenAI, Xero, Webflow — recurring, predictable, USD-denominated
- **Q2→Q3 project tagging declined** from 98.8% to 58.7% — needs attention

### BAS Logging Steps
1. Ensure all Q2 transactions reconciled in Xero
2. Run `node scripts/generate-reconciliation-checklist.mjs` for Q2 period
3. Verify GST collected (1A) matches ACCREC invoices
4. Verify GST paid (1B) has receipt support
5. Export BAS worksheet from Xero → accountant reviews → lodges via ATO portal
6. **Key: Flag R&D expenses separately** for tax incentive calculation

---

## PART 3: RECEIPT PIPELINE EFFICIENCY IMPROVEMENTS

### Current: 3.4% match rate → Target: 20%+

**Quick wins (1-2 days):**
1. Add 12 missing vendor aliases in match-receipts-to-xero.mjs
2. Enable AI scoring by default (currently off)
3. Lower auto-match threshold from 80% to 70% after review
4. Re-score 466 receipts with NULL confidence
5. Handle USD→AUD conversion for SaaS vendors

**Medium-term:**
- Qantas Business Rewards API → auto-import
- Uber for Business → auto-import
- Calendar-based suggestions running weekly
- Local folder scanning for downloaded PDFs

**Data quality fixes:**
- 199 receipts missing vendor names (38% of "review")
- 246 receipts missing amounts (47% of "review")
- 903 "uploaded" receipts orphaned — no xero_transaction_id link

---

## PART 4: SOLE TRADER → PTY LTD TRANSITION

### Current Entity
- **ABN:** 21 591 780 066
- **Entity type:** Sole trader (verify at abr.business.gov.au)
- **Accounting:** Xero (AU region)
- **Bank:** NAB

### Recommended Timeline
- **Now → June 30, 2026:** Maximise sole trader benefits
- **July 1, 2026:** Incorporate Pty Ltd (clean FY boundary)
- **July-Sept 2026:** Parallel Xero orgs, transition period

### Tax Optimisation BEFORE Switching (Critical)

**1. $20,000 Instant Asset Write-Off (expires June 30, 2026)**
- Buy any needed equipment/software BEFORE incorporation
- Sole trader claims at marginal rate (up to 45%) vs company rate (25%)
- After June 30, threshold drops to $1,000

**2. Pre-paid Expenses**
- Pre-pay 12 months of subscriptions, insurance, rent before June 30
- Deductible at sole trader marginal rate
- Reduces taxable income in the higher-rate entity

**3. Carried-Forward Losses**
- **Tax losses DO NOT transfer** from sole trader to company
- If ACT has losses, they stay with Benjamin personally
- Use them against other personal income — they'll be stranded after incorporation

**4. Small Business Tax Concessions (while sole trader)**
- Simplified depreciation pooling
- Immediate deduction for start-up costs
- Small business CGT concessions on any asset disposals

**5. Superannuation**
- Sole traders can claim personal super as deduction
- Max out contributions before switching ($30k cap FY26)
- After Pty Ltd: super becomes employer obligation, different treatment

### Pty Ltd Setup Preparation (Do Now, in Background)

1. **Choose company name** — reserve via ASIC ($55)
2. **Appoint directors** — Benjamin Knight + Nicholas Marchesi OAM
3. **Draft constitution** — template or custom for CLG/charity structure
4. **New TFN application** — ready to submit on incorporation day
5. **New ABN application** — cannot transfer existing ABN
6. **New GST registration** — under new ABN
7. **New bank account** — NAB business account under company name
8. **New Xero organisation** — no migration path, must set up fresh
9. **Transfer assets** — at market value, potential CGT event
10. **Update all contracts/agreements** — with new entity details

### Critical Gotchas
- **New ABN required** — ABN 21 591 780 066 stays with sole trader, cancelled
- **Xero: No migration** — must run parallel orgs during transition
- **Director super liability** — personal liability for unpaid company super
- **Payday Super** (from July 2026) — super due with every pay run, not quarterly
- **Base rate entity** — 25% tax rate if turnover <$50M and passive income ≤80%
- **BAS timing** — final sole trader BAS covers up to transition date, first company BAS starts after

### BAS for Transition Quarter
- If switching July 1: clean cut — Q4 FY26 BAS is last sole trader BAS
- If switching mid-quarter: need to split BAS between entities for that quarter
- **Strongly recommend July 1 start** to avoid split-quarter complexity

---

## PART 5: R&D TAX INCENTIVE

### Impact of Transition on R&D
- R&D registration is per-entity — new registration needed for Pty Ltd
- Current year R&D (FY26) stays with sole trader claim
- **43.5% refundable offset** if <$20M turnover — Pty Ltd will qualify
- Estimated FY26 R&D spend: $937,000 → $407,595 potential refund
- **1,128 R&D transactions currently missing receipts** — each one reduces the refund

### R&D Documentation To-Do
- Generate activity log: `node scripts/generate-rd-activity-log.mjs`
- Ensure all R&D project transactions have receipts (priority: ACT-IN, ACT-EL)
- Git commits = evidence of experimental work (already captured)
- Calendar events = time records (sync working)

---

## IMMEDIATE NEXT STEPS

### Today
- [ ] Re-authenticate Xero with `accounting.attachments` scope: `node scripts/xero-auth.mjs`
- [ ] Run transaction tagging: `node scripts/tag-transactions-by-vendor.mjs`
- [ ] Run receipt matching with fixes: `node scripts/match-receipts-to-xero.mjs --apply --ai`

### This Week
- [ ] Download Qantas receipts from Business portal
- [ ] Export Uber trip history
- [ ] Add vendor aliases to matcher
- [ ] Chase overdue receivables (Rotary $82.5k, Social Impact Hub $10.8k)

### Before April 28 (BAS Due)
- [ ] All Q3 transactions tagged and reconciled
- [ ] Receipt coverage above 60% for GST-bearing transactions
- [ ] Reconciliation checklist generated for accountant
- [ ] R&D activity log up to date

### Before June 30 (FY End)
- [ ] Maximise instant asset write-off purchases
- [ ] Pre-pay subscriptions for next 12 months
- [ ] Max out super contributions ($30k)
- [ ] All R&D documentation complete
- [ ] Pty Ltd paperwork prepared (submit day 1 of FY27)
