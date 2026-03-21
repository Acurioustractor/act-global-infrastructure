# Accountant Handoff — Q3 FY26 BAS Preparation

**Entity:** Nicholas Marchesi T/as A Curious Tractor
**ABN:** 21 591 780 066
**Quarter:** Q3 FY26 (Jan 1 – Mar 31, 2026)
**BAS Due:** April 28, 2026
**GST Basis:** Cash | Quarterly
**Prepared:** 2026-03-17

---

## Executive Summary

BAS is 80% ready. Three issues need resolution before lodgement:

1. **Phantom payables ($190K)** — 262 AUTHORISED bills from auto-billing integrations need matching or voiding
2. **Receipt gaps ($19.5K Qantas, $1.7K Uber)** — receipts EXIST on bills but aren't linked to bank transactions
3. **Outstanding receivables ($216K)** — 2 clients >$80K overdue, need chase or write-off decision

**Net GST position:** ~$4,454 payable to ATO
**Project tagging:** 100% (293/293 Q3 SPEND transactions)
**BAS confidence:** 66% MEDIUM → target 85%+ after fixes below

---

## STEP 1: Fix Phantom Payables (Critical — ~2 hours)

### What Happened

Qantas Business Rewards, Uber Business, Virgin, Booking.com, and Webflow are connected to Xero and **auto-create ACCPAY bills with receipt PDFs**. But when bank transactions arrive, they're being reconciled as NEW spend entries instead of matched to the existing bills.

**Result:** Bills sit as AUTHORISED forever → $190,827 phantom Accounts Payable.

### Fix: Q3 March — Un-reconcile & Re-match (~45 min)

**In Xero: Accounting → Bank accounts → NAB Visa ACT #8815 → Account Transactions**

Filter by Contact = "Qantas", Date = March 2026. For each transaction:
1. Open the transaction
2. Click **Options → Remove & Redo**
3. Go to **Bank accounts → NAB Visa → Reconcile**
4. For the bank line, click **Find & Match**
5. Select the matching bill (same amount) → **Reconcile**

#### Qantas March Match List (14 bills, $18,553)

| Bill Number | Bill Amount | Match To Bank Line |
|-------------|-------------|-------------------|
| 081-2384032736 | $2,178.08 | ~$2,178 Qantas charge, Mar 3 |
| 081-2384081782 | $1,365.84 | ~$1,367 Qantas charge, Mar 4 |
| 081-2384021223 | $1,236.97 | ~$1,237 Qantas charge, Mar 3 (GST $112.45) |
| 081-2384034814 | $1,112.89 | ~$1,113 Qantas charge, Mar 3 |
| 081-2384033140 | $854.82 | ~$855 Qantas charge, Mar 3 |
| 081-2384034500 | $838.74 | ~$839 Qantas charge, Mar 3 (GST $76.25) |
| 081-2384033647 | $676.38 | ~$676 Qantas charge, Mar 3 (GST $5.91) |
| 081-2384059457 | $669.88 | ~$670 Qantas charge, Mar 3 (GST $60.90) |
| 081-2384032117 | $452.38 | ~$452 Qantas charge, Mar 3 (GST $41.13) |
| 081-2384058290 | $415.90 | ~$416 Qantas charge, Mar 3 (GST $37.81) |
| 081-2384105663 | $329.22 | ~$329 Qantas charge, Mar 4 (GST $29.93) |
| 081-2384036864 | $236.16 | ~$236 Qantas charge, Mar 3 (GST $21.47) |
| 081-2384036520 | $179.88 | ~$180 Qantas charge, Mar 3 (GST $16.35) |
| EVTAFC | $8,006.84 | CHECK — may be group booking paid differently |

#### Uber March Match List (10 bills, $290)

| Bill Number | Amount | Contact | Bill Date |
|-------------|--------|---------|-----------|
| RB19874778170 | $13.06 | Uber | Mar 5 |
| RB19781822910 | $56.87 | Uber | Mar 3 |
| RB19781823640 | $31.01 | Uber | Mar 3 |
| RB19781823610 | $43.28 | Uber | Mar 3 |
| RB19781823780 | $29.23 | Uber | Mar 2 |
| RB19781823230 | $25.32 | Uber | Mar 2 |
| RB19781823840 | $30.28 | Uber | Mar 2 |
| RB19781823990 | $24.35 | Uber | Mar 2 |
| RB19781823910 | $12.35 | Uber | Mar 2 |
| RB19781857210 | $24.61 | Uber | Mar 1 |

### Fix: Q2 (Oct–Dec 2025) — Same Process (~30 min)

**Qantas Q2:** 12 bills worth $16,762 (all have receipts)
- 081-2380842715 ($1,569), 081-2380841234 ($1,243), FRN7VA ($115), E86TH2 ($887), E8CR6D ($563), DNW64E ($1,016), DNYZEG ($1,736), DNWMCM ($2,300), F3U6LQ ($1,493), E8OBSN ($2,837), E94GO8 ($1,258), 081-2377543781 ($534), 081-2377541740 ($1,056)

**Uber Q2:** 6 bills worth $190

### Fix: Q1 & Older — Pragmatic Void (~15 min)

For bills from Jul–Sep 2025 where bank transactions were reconciled months ago:
1. **Business → Bills to pay** → filter AUTHORISED → sort oldest first
2. Cross-reference against bank — if already reconciled, **Void** the bill
3. Keep any genuinely unpaid bills

### Other Vendors — Triage Required

| Vendor | Bills | Amount | Action |
|--------|-------|--------|--------|
| **Hatch Electrical** | 3 | $30,017 | CHECK — genuinely unpaid? BCV construction? |
| **Defy Manufacturing** | 4 | $25,395 | CHECK — recent builds, may be genuinely owing |
| **Thais Pupio Design** | 2 | $16,920 | CHECK — design work payment status |
| **Peak Up Transport** | 2 | $11,725 | CHECK — different payment method? |
| **Virgin Australia** | 7 | $8,815 | MATCH — same as Qantas (auto-billing connected) |
| **ATO** | 2 | $5,376 | CHECK — may be genuine BAS/PAYG due |
| **Booking.com** | 9 | $3,572 | MATCH — auto-billing connected |
| **Maleny Hardware** | 21 | $2,177 | MATCH or VOID — 21 small bills |
| **Webflow** | 9 | $923 | MATCH — auto-billing connected |
| All other vendors | ~100+ | ~$43K | TRIAGE per vendor |

### Prevention: Bank Rules

After fixing, set up bank rules in Xero:
- **Accounting → Bank accounts → NAB Visa → Manage Rules**
- Rule: When bank line contains "QANTAS" → suggest "Match to existing bill" first
- Rule: When bank line contains "UBER" → suggest "Match to existing bill"
- Rule: When bank line contains "VIRGIN" → suggest "Match to existing bill"
- Rule: When bank line contains "BOOKING.COM" → suggest "Match"

**SOP for accountant:** For these vendors, ALWAYS check "Find & Match" before clicking "Create". The bill already has the receipt attached.

---

## STEP 2: BAS Worksheet

### GST on Sales (Cash Basis — Payments Received Q3)

| Client | Invoice | Amount (inc GST) | GST |
|--------|---------|-------------------|-----|
| Sonas Properties | INV-0316 | $44,000.00 | $4,000.00 |
| SMART Recovery Australia | INV-0304 | $30,000.00 | $2,782.00 |
| Berry Obsession | INV-0309 | $13,000.00 | $1,181.82 |
| Our Community Shed | INV-0308 | $6,765.00 | $615.00 |
| Blue Gum Station | INV-0319 | $6,000.00 | $545.45 |
| **TOTAL** | | **$99,765.00** | **$9,124.27** |

### GST on Purchases (Cash Basis — Payments Made Q3)

| Project | Transactions | Amount |
|---------|-------------|--------|
| ACT-IN (Innovation/Operations) | 251 | $28,721.65 |
| ACT-FM (Farm) | 1 | $8,361.21 |
| ACT-GD (Goods on Country) | 16 | $6,769.34 |
| ACT-HV (Harvest/BCV) | 6 | $5,564.53 |
| ACT-EL (Empathy Ledger) | 3 | $585.00 |
| ACT-DO (Digital/Operations) | 6 | $457.88 |
| Other (10, JP, GP, UA, JH, RA) | 9 | $913.02 |
| **TOTAL** | **293** | **$51,373.63** |

### BAS Summary

| Field | Description | Amount |
|-------|-------------|--------|
| G1 | Total Sales (inc GST) | $99,765.00 |
| G11 | Non-capital purchases | $51,373.63 |
| 1A | GST on Sales (collected) | $9,124.27 |
| 1B | GST on Purchases (paid) | $4,670.33 |
| **NET** | **GST Payable to ATO** | **$4,453.94** |

---

## STEP 3: Chase Outstanding Receivables ($216,200)

### Priority Chase List

| # | Client | Invoice | Amount Due | Days Overdue | Action |
|---|--------|---------|-----------|-------------|--------|
| 1 | **Rotary Eclub Outback** | INV-0222 | $82,500 | 326d | ESCALATE — nearly 1 year overdue |
| 2 | **PICC** | INV-0317 | $36,300 | 17d | CHASE — recent, likely coming |
| 3 | **Regional Arts Australia** | INV-0301 | $16,500 | 14d | CHASE — just overdue |
| 4 | **Regional Arts Australia** | INV-0302 | $16,500 | - | NOT YET DUE (106d remaining) |
| 5 | **Social Impact Hub** | INV-0289 | $10,800 | 383d | WRITE OFF or ESCALATE |
| 6 | **Just Reinvest** | INV-0295/296/297 | $27,500 | 88-95d | CHASE — 3 invoices |
| 7 | **Green Fox Training** | INV-0246 | $9,000 | 133d | CHASE or WRITE OFF |
| 8 | **Homeland School** | INV-0303 | $4,950 | 25d | CHASE — recent |
| 9 | **Aleisha J Keating** | 27 invoices | $12,150 | 73-255d | REVIEW — weekly contractor? |

### Decisions Needed

- **Rotary ($82.5K):** Is there a dispute? Should we engage debt recovery?
- **Social Impact Hub ($10.8K):** 383 days — write off or final demand?
- **Aleisha J Keating ($12.15K):** 27 weekly invoices unpaid — is this a payment arrangement?
- **Green Fox ($9K):** 133 days — still viable to collect?

---

## STEP 4: Reconciliation Checklist

- [x] All Q3 SPEND transactions tagged with project codes (293/293 = 100%)
- [ ] Reconcile phantom payables — un-reconcile & match Q3 bills to bank (~45 min)
- [ ] Reconcile phantom payables — un-reconcile & match Q2 bills to bank (~30 min)
- [ ] Void Q1 and older bills that are already reconciled as bank transactions
- [ ] Triage Hatch ($30K), Defy ($25K), Thais ($17K), Peak Up ($12K) — genuinely unpaid?
- [ ] Set up bank rules for Qantas, Uber, Virgin, Booking.com
- [ ] Chase receivables per priority list above
- [ ] Cross-check P&L against bank statements
- [ ] Review intercompany transfers for correct treatment
- [ ] Verify GST on capital purchases (G10 vs G11 split)
- [ ] Lodge BAS via Xero Tax → ATO portal
- [ ] **BAS DUE: April 28, 2026**

---

## Key Files for Reference

| File | Purpose |
|------|---------|
| `thoughts/shared/plans/xero-bill-matching-fix.md` | Detailed fix plan with exact bill-to-bank match lists |
| `thoughts/shared/reports/bas-worksheet-q3-fy26-2026-03-16.md` | Full BAS worksheet with confidence scoring |
| `thoughts/shared/reports/act-financial-intelligence-report-2026-03.md` | 2-year financial intelligence report |

---

## Automation Status

These scripts run automatically via PM2:

| Script | Schedule | Status |
|--------|----------|--------|
| sync-xero-to-supabase.mjs | Every 6 hours | Active |
| capture-receipts.mjs | Every 6 hours | Active |
| match-receipts-to-xero.mjs | Daily 7am | Active |
| upload-receipts-to-xero.mjs | Daily 8am | Active |
| tag-xero-transactions.mjs | Daily 9am | Active |
| suggest-receipts-calendar.mjs | Weekly Monday | Active |
| reconciliation-checklist.mjs | Monthly 1st | Active |

**No manual receipt chasing needed for Qantas or Uber** — the receipts are already in Xero on the ACCPAY bills. Just match the bills to bank transactions.
