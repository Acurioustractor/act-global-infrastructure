# BAS Preparation Summary - Q2 & Q3 FY26

**Generated:** 2026-03-17  
**For:** ACT Foundation  
**Period:** Q2 FY26 (Oct-Dec 2025) + Q3 FY26 (Jan-Mar 2026 YTD)

---

## Executive Summary

### Financial Overview

| Period | Spend | GST Claimable | Receipt Coverage | At Risk |
|--------|-------|---------------|------------------|---------|
| **Q2 FY26** | $122,086.83 | $4,282.16 | 9.9% (57/574) | $4,032.73 |
| **Q3 FY26** | $51,373.63 | $3,130.11 | 28.3% (83/293) | $2,353.72 |
| **Total** | $173,460.46 | $7,412.27 | 16.1% (140/867) | **$6,386.45** |

### Critical Issues

1. **GST Credits at Risk: $6,386.45**
   - 727 spend transactions without receipts
   - 108 transactions >$82.50 without receipts (GST threshold)
   - R&D project spend ($139.5k) largely undocumented

2. **Receipt Coverage: Only 16.1%**
   - Q2: 9.9% coverage (getting worse)
   - Q3: 28.3% coverage (improving but still low)
   - Main gaps: Qantas, Uber, large vendor payments

3. **Outstanding Receivables: $300,900**
   - $93,300 seriously overdue (>200 days)
   - Social Impact Hub: $10,800 (383 days)
   - Rotary: $82,500 (326 days)

4. **Outstanding Payables: $192,618**
   - Virgin Australia: $8,431 (400+ days overdue)
   - Booking.com: $983 (370+ days overdue)

---

## Top Receipt Gaps (High $ Impact)

### Q2 FY26 - Missing Receipts

| Vendor | Spend | GST at Risk | Transactions | Priority |
|--------|-------|-------------|--------------|----------|
| Nicholas Marchesi | $51,000 | $0 | 2 | HIGH - director payments |
| Qantas | $32,238 | $3,224 | 55 | **CRITICAL** |
| Nicholas | $21,419 | $0 | 3 | HIGH - director payments |
| Uber | $6,915 | $691 | 186 | HIGH |
| Chris Witta | $591 | $0 | 1 | Medium |

### Q3 FY26 - Missing Receipts

| Vendor | Spend | GST at Risk | Transactions | Priority |
|--------|-------|-------------|--------------|----------|
| Qantas | $20,011 | $2,001 | 21/22 | **CRITICAL** |
| Uber | $1,731 | $173 | 48 | HIGH |

---

## R&D Tax Claim Impact

**Total R&D spend without receipts: $139,549** (642 transactions)

| Project | Missing Receipts | Spend | GST at Risk |
|---------|------------------|-------|-------------|
| ACT-IN | 637 | $138,337 | $6,210 |
| ACT-HV | 3 | $731 | $5 |
| ACT-FM | 1 | $319 | $32 |
| ACT-GD | 1 | $162 | $16 |

**Action:** R&D tax claims require full documentation. Need to backfill these urgently.

---

## Patterns & Insights

### Recurring Subscriptions (High Frequency)

| Vendor | Frequency | Total Spend | Avg Amount |
|--------|-----------|-------------|------------|
| Uber | 234× | $8,645 | $36.95 |
| Qantas | 77× | $52,249 | $678.56 |
| Webflow | 43× | $2,336 | $54.34 |
| OpenAI | 11× | $593 | $53.91 |
| HighLevel | 9× | $513 | $56.98 |

### New Vendors (Q2/Q3)

- Elders Insurance: $8,361 (insurance - has receipt ✅)
- Longara: $3,155 (has receipt ✅)
- Fisher's Oysters: $2,240 (has receipts ✅)
- RW Pacific Traders: $2,000 (has receipt ✅)

### Potential Duplicates

Qantas shows multiple $2,001.71 charges on same day (2026-03-03). Check for:
- Multi-leg bookings vs duplicates
- Refunds/adjustments

---

## Invoice Status

### Receivables (Money Owed to ACT)

- **AUTHORISED:** 37 invoices, $216,200 outstanding
- **DRAFT:** 2 invoices, $84,700 (not yet sent)
- **Total Outstanding:** $300,900

**Critical Overdue:**
- Social Impact Hub Foundation: $10,800 (383 days) - pursue or write off?
- Rotary Eclub Outback: $82,500 (326 days) - major recovery needed
- Aleisha J Keating: $4,050 across 9 invoices (200+ days each) - likely bad debt

### Payables (ACT Owes)

- **AUTHORISED:** 262 invoices, $190,827 outstanding
- **Total Outstanding:** $192,618

**Critical Overdue:**
- Virgin Australia: $8,431 across 5 invoices (400+ days) - disputed or ignored?
- Booking.com: $983 across 3 invoices (370+ days)

**Action:** Reconcile with bank statements. These may be paid but not marked in Xero.

---

## BAS Preparation Checklist

### Before Lodging Q2 BAS (Due: Late Jan 2026 - OVERDUE)

- [ ] Chase missing Qantas receipts ($32,238 Q2 + $20,011 Q3 = **$52k priority**)
- [ ] Backfill Uber receipts via app export (234 trips = $8,645)
- [ ] Confirm director payments are coded correctly (Nicholas/Nicholas Marchesi $72k)
- [ ] Match 108 transactions >$82.50 to forwarded emails or attachments
- [ ] Run `scripts/receipt-reconciliation-agent.mjs` to auto-match receipt_emails
- [ ] Reconcile overdue payables (Virgin, Booking.com) - mark paid if already done

### For Q3 BAS (Due: Late Apr 2026)

- [ ] Continue receipt matching (210 Q3 transactions still missing)
- [ ] Chase overdue receivables (Rotary $82.5k, Social Impact Hub $10.8k)
- [ ] Tag remaining 121 Q3 untagged transactions with project codes (41.3% untagged)

### R&D Tax Claim Prep

- [ ] Backfill ACT-IN receipts (637 transactions, $138k)
- [ ] Ensure all R&D transactions have:
  - Receipt/invoice
  - Project code tag
  - Description of R&D activity
- [ ] Generate R&D activity log: `scripts/generate-rd-activity-log.mjs`

---

## Recommended Actions

### Immediate (This Week)

1. **Run receipt reconciliation agent** to auto-match existing emails:
   ```bash
   node scripts/receipt-reconciliation-agent.mjs
   ```

2. **Chase Qantas receipts manually** - $52k across 77 transactions is largest gap
   - Log into Qantas Business Rewards
   - Download invoice pack for Oct 2025 - Mar 2026
   - Upload to Xero via `scripts/upload-receipts-to-xero.mjs`

3. **Reconcile overdue payables** - Virgin Australia likely paid, just not marked

### Short-Term (Next 2 Weeks)

4. **Uber receipt backfill**
   - Export trip history from Uber Business dashboard
   - Match to transaction dates/amounts
   - Auto-forward to receipts@ or upload directly

5. **Pursue overdue receivables**
   - Rotary: $82.5k - phone call + formal notice
   - Social Impact Hub: $10.8k - assess collectibility
   - Aleisha J Keating: $4k - likely write-off, send final notice

6. **Tag untagged Q3 transactions** (121 remaining)

### Ongoing

7. **Improve receipt coverage** - current 16% is unsustainable
   - Enable auto-forwarding for all vendors with email receipts
   - Set up Xero Receipt Bank for mobile scanning
   - Train team on receipt capture workflow

8. **R&D documentation discipline** - required for tax claims
   - ACT-IN project needs full receipts ($138k spend)
   - Create receipt-at-purchase workflow

---

## GST Summary (For BAS)

### Q2 FY26 (Oct-Dec 2025)

| Item | Amount |
|------|--------|
| **GST on Sales** (G1) | $188.18 |
| **GST on Purchases** (G11) | -$4,282.16 |
| **Net GST Position** | **-$4,093.98** (refund) |
| **GST at Risk** (missing receipts) | $4,032.73 (94% of claim) |

### Q3 FY26 (Jan-Mar 2026 YTD)

| Item | Amount |
|------|--------|
| **GST on Sales** (G1) | $0.00 |
| **GST on Purchases** (G11) | -$3,130.11 |
| **Net GST Position** | **-$3,130.11** (refund) |
| **GST at Risk** (missing receipts) | $2,353.72 (75% of claim) |

**Warning:** Both quarters show refund positions with majority of claims undocumented. ATO audit risk is HIGH.

---

## Key Metrics

- **Project tagging:** Q2 98.8% ✅ | Q3 58.7% ⚠️ (declining)
- **Receipt coverage:** Q2 9.9% ❌ | Q3 28.3% ⚠️ (improving but low)
- **Days sales outstanding:** 383 days (worst case) - collection process needs improvement
- **Days payable outstanding:** 412 days (Virgin) - reconciliation backlog

---

## Next Steps

1. Read full analysis: `/thoughts/shared/reports/xero-bas-analysis-2026-03-17.md`
2. Run receipt reconciliation: `node scripts/receipt-reconciliation-agent.mjs`
3. Chase Qantas receipts manually (largest gap)
4. Review and action overdue receivables/payables
5. Fix Q3 project tagging rate (dropped to 58.7%)

**Contact:** See scripts for automation or manual intervention points.
