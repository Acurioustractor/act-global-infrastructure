# Email Draft — BAS Q2 + Q3 FY26 Lodgement

**To:** [accountant]
**From:** Ben / Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066)
**Date:** 2026-04-09
**Subject:** BAS Q2 FY26 (overdue) + Q3 FY26 (due 28 Apr) — draft worksheets + deferral request

---

Hi [Name],

Quick update on our BAS position. We've fallen behind and I want to get both overdue and upcoming quarters lodged cleanly rather than leave them to compound.

## The two quarters

| Quarter | Period | Was due | Status |
|---|---|---|---|
| **Q2 FY26** | 1 Oct – 31 Dec 2025 | 28 Feb 2026 | **~6 weeks overdue** |
| **Q3 FY26** | 1 Jan – 31 Mar 2026 | 28 Apr 2026 | 19 days away |

## Draft numbers (cash basis, from our Xero data + automation pipeline)

### Q2 FY26 (Oct–Dec 2025)

- **G1 Total Sales (inc GST):** $308,946.00
- **G11 Non-capital purchases:** $122,086.83
- **1A GST collected:** $28,086.00
- **1B GST paid:** $11,098.80 (estimated — see confidence note)
- **Net GST position: $16,987.20 payable to ATO**

Confidence: 50% LOW. Tagging is 100% but reconciliation is only 53% and receipt coverage is 10% — both need work before final lodgement. Full worksheet attached at `thoughts/shared/reports/bas-worksheet-q2-fy26-2026-04-08.md`.

### Q3 FY26 (Jan–Mar 2026)

- **G1 Total Sales (inc GST):** $140,322.48
- **G11 Non-capital purchases:** $57,411.86
- **1A GST collected:** $12,814.27
- **1B GST paid:** $5,219.26 (estimated)
- **Net GST position: $7,595.01 payable to ATO**

Confidence: 65% MEDIUM. Tagging 96%, reconciliation 86%, receipts 27%. Full worksheet attached at `thoughts/shared/reports/bas-worksheet-q3-fy26-2026-04-08.md`.

### Combined position

**~$24,582 payable to ATO across Q2 + Q3.**

## What I'm asking

1. **Can you request a lodgement deferral with the ATO for Q2 FY26?** It's the first quarter we've missed, so failure-to-lodge penalty remission is typically granted if we self-report and commit to a catch-up date. I'd like to pair this with a clear on-time commitment for Q3 (28 Apr 2026).

2. **Review the attached worksheets** — let me know if the G1/G11 numbers look right against what you see in Xero. There's a chance the 1B (GST on purchases) is under-estimated for Q2 because of unreconciled transactions; my automation estimates GST as total/11 which is rough.

3. **Work through these open items before lodgement** (in order of $ impact):
   - Q2: 516 transactions missing receipts (~$10,379 GST at risk)
   - Q2: 303 unreconciled bank transactions (~47% of the quarter)
   - Q2 + Q3: 262 AUTHORISED payables totalling $190,827 — many are likely already paid but not matched to bank transactions (Qantas, Uber, Virgin, Webflow auto-billing issue — documented in our Mar 17 handoff doc)
   - Q3: 273 missing receipts (~$2,275 GST at risk), dominated by Qantas ($19.8k) and Uber ($2.3k) which need portal downloads

4. **Receivables triage** — $339,600 outstanding, $82,500 of which is Rotary Eclub at 364 days old and probably needs write-off. Under cash basis this doesn't affect GST but it's cluttering the balance sheet.

## What I've already done on my side

- Full Xero sync to Supabase mirror (sync runs every 6 hours)
- 96–100% project code tagging across both quarters (automated via vendor rules)
- Receipt capture pipeline running (1,110 receipts uploaded to Xero so far)
- BAS worksheet generator built — I can re-run it any time the numbers change
- R&D tax incentive documentation pipeline in place for FY26 registration

## R&D tax context (not urgent for BAS but worth flagging)

Across Q2 + Q3, R&D-eligible spend on ACT-IN / ACT-EL / ACT-GD / ACT-JH totals **$89,807**, implying a potential **$39,066 refundable R&D offset** (43.5%). Of that, **$30,057 is currently at risk** because of missing receipts on R&D-tagged transactions. I'm backfilling these before the AusIndustry registration deadline (30 Apr for FY25 registration; FY26 has more time).

---

Happy to jump on a call this week to walk through the worksheets. I'd like to get Q2 deferral sorted before Friday so the penalty clock stops ticking, and then focus the next 2.5 weeks on receipt backfill + reconciliation so Q3 can lodge clean on 28 Apr.

Thanks,
Ben

---

## Attachments
- `thoughts/shared/reports/bas-worksheet-q2-fy26-2026-04-08.md`
- `thoughts/shared/reports/bas-worksheet-q3-fy26-2026-04-08.md`
- `thoughts/shared/reports/accountant-handoff-q3-fy26.md` (phantom payables fix from Mar 17)
