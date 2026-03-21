# ACT Financial Operations System Design

**Date:** 2026-03-20
**Author:** Benjamin Knight + Claude (business analysis session)
**Status:** DRAFT — awaiting review

---

## The Problem

ACT has 60+ automated cron jobs and a sophisticated data pipeline (Xero → Supabase → dashboards). The plumbing is excellent. But the **financial control loop is broken**:

- $84,700 invoice sat as DRAFT, never sent
- $130,250 is 90+ days overdue with no automated chase
- Zero cash received since November 2025
- Xero sync was silently overwriting project tags (now fixed)
- Receipt matching only processed 25% of receipts (now fixed)
- R&D-eligible travel is tagged to generic ACT-IN instead of specific R&D projects
- No forward-looking cash flow view

**Root cause:** The system is built for data sync, not financial control. It collects and organises, but doesn't act, alert, or enforce. The gap is between "the data is in Supabase" and "someone does something about it."

---

## Design Principles

1. **Alert on exceptions, not summaries.** A weekly digest is noise. "Centrecorp $84.7k DRAFT not sent in 35 days" is actionable.
2. **Automate the chase.** Overdue invoices should generate reminder emails automatically at 7, 14, 30, 60, 90 days.
3. **Tag at the point of entry.** Every dollar should know its project and R&D eligibility the moment it hits the system — not weeks later in a batch job.
4. **Close the loop.** Every automated action should report what it did and what it couldn't. No silent failures.
5. **Weekly rhythm, not daily firefighting.** One structured weekly review should surface everything that needs attention.

---

## What Exists Today (Finance Pipeline)

| Job | Frequency | What it does |
|-----|-----------|-------------|
| xero-sync | 6-hourly | Pull transactions + invoices from Xero |
| auto-tag-transactions | 6-hourly | Apply vendor → project rules in Supabase |
| receipt-capture | 6-hourly | Scan Gmail for receipt emails |
| receipt-match | Daily 7am | Match receipts to Xero transactions |
| receipt-upload | Daily 8am | Upload matched receipts to Xero |
| xero-project-tag | Daily 9am | Push project tags TO Xero |
| finance-daily-briefing | Weekdays 7am | Morning financial summary |
| financial-advisor | Weekly Mon 8am | AI financial advice |
| reconciliation-checklist | Monthly 1st | Generate reconciliation report |
| monthly-financials | Monthly 1st | Calculate project financials |
| variance-notes | Monthly 1st | Flag variance from budget |
| financial-snapshots | Monthly 1st | Store point-in-time snapshots |

### What's MISSING

| Gap | Impact | Priority |
|-----|--------|----------|
| **Collections automation** | $130k+ overdue uncollected | P0 |
| **DRAFT invoice detection** | $84.7k sat unsent | P0 |
| **Cash flow forecast** | Can't predict runway | P1 |
| **SaaS spend monitoring** | Creep goes unnoticed | P1 |
| **R&D allocation engine** | Travel mis-tagged, leaving refund money on table | P1 |
| **BAS preparation workflow** | Manual quarterly scramble | P2 |
| **Budget vs actual alerts** | No early warning on overspend | P2 |
| **Subscription audit** | Personal expenses mixed in | P3 |

---

## The Right System: 5 Layers

### Layer 1: Data Foundation (EXISTS — mostly complete)

Xero → Supabase sync, receipt capture, Gmail integration, vendor rules.

**Remaining fixes:**
- Add missing vendor rules for uncategorised vendors ($35k currently unmapped)
- Ensure receipt matcher processes ALL statuses (done today)
- Sync null-protection for project codes (done today)

### Layer 2: Intelligent Tagging (PARTIAL — needs R&D layer)

Current: vendor → project code auto-tagging works.

**What to add:**
- **R&D allocation engine:** For travel vendors (Qantas, Uber, car hire), look at the date + calendar events to determine WHICH project the travel was for. A flight on a day you had a Palm Island meeting = ACT-GD (R&D eligible), not ACT-IN (overhead).
- **Multi-project splitting:** Some invoices serve multiple projects. The system should support percentage splits (e.g., Supabase 40% ACT-EL, 40% ACT-GD, 20% ACT-IN).
- **Personal expense flagging:** Auto-detect vendors that look personal (Audible, DocPlay, Amazon Prime, Garmin) and flag for review rather than silently tagging to ACT-IN.

### Layer 3: Financial Control Loop (MISSING — build this)

This is the critical missing layer. Three components:

#### 3a. Collections Autopilot

```
Trigger: Daily at 10am (after Xero sync + morning briefing)

Logic:
1. Query all ACCREC invoices where amount_due > 0
2. For DRAFT invoices > 7 days old:
   → Telegram alert: "INV-0314 Centrecorp $84,700 STILL DRAFT — approve and send?"
3. For overdue invoices:
   → 7 days: Auto-send polite reminder email (template)
   → 14 days: Telegram alert to Benjamin
   → 30 days: Auto-send firm reminder email
   → 60 days: Telegram + email escalation to both founders
   → 90 days: Telegram alert: "WRITE-OFF DECISION NEEDED: [invoice]"
4. Log all actions to collections_log table
```

#### 3b. Cash Flow Forecast

```
Trigger: Weekly Monday (part of weekly review)

Logic:
1. Current bank balance (from Xero)
2. Expected inflows: invoices by due date
3. Expected outflows: recurring vendors × avg monthly amount
4. Known upcoming: any bills in DRAFT/APPROVED
5. Output: 13-week rolling cash forecast
6. Alert if projected balance < $20,000 at any point
```

#### 3c. Anomaly Detection

```
Trigger: After each Xero sync

Logic:
1. New vendor never seen before → Telegram: "New vendor: [name] $[amount] — add project rule?"
2. Transaction > 2x average for that vendor → alert
3. Subscription cost increased vs last month → alert
4. Spend exceeds monthly budget by project → alert
```

### Layer 4: BAS Automation (MISSING — build quarterly)

```
Trigger: 14 days before BAS due date (auto-calculated)

Workflow:
1. Run reconciliation checklist
2. Flag unreconciled transactions
3. Calculate GST position (collected - claimed)
4. Check receipt coverage on R&D project transactions
5. Generate accountant-ready BAS pack:
   - GST summary
   - Unreconciled items list
   - Missing receipts list (ranked by $ impact on R&D claim)
   - Project allocation summary
   - R&D expenditure breakdown
6. Telegram: "BAS pack ready for [quarter]. [X] items need attention."
```

### Layer 5: Strategic Intelligence (PARTIAL — enhance)

The weekly digest and financial advisor exist but should be restructured:

**Weekly Monday Review (single, comprehensive):**
1. Cash position + 4-week forecast
2. Collections status (what came in, what's overdue)
3. Spend vs budget by project
4. Receipt coverage by project (especially R&D)
5. New vendors / anomalies this week
6. SaaS total vs last month
7. One recommended action (highest-impact thing to do this week)

---

## Implementation Priority

### Phase 1: Stop the Bleeding (This Week)
- [x] Fix project tagging (done — 100%)
- [x] Fix receipt matcher (done — 157 matched)
- [x] Fix sync null-overwrite (done)
- [ ] Build collections autopilot script (chase-overdue-invoices.mjs)
- [ ] Add DRAFT invoice detection to daily briefing
- [ ] Send Centrecorp $84.7k invoice

### Phase 2: Close the Loop (Next Week)
- [ ] Cash flow forecast (13-week rolling)
- [ ] Anomaly detection on new vendors + cost increases
- [ ] Personal expense flagging rules
- [ ] Add missing vendor rules for $35k uncategorised

### Phase 3: R&D Maximisation (This Month)
- [ ] R&D allocation engine (calendar-aware travel tagging)
- [ ] Multi-project cost splitting
- [ ] R&D evidence pack generator (git commits + calendar + receipts)

### Phase 4: BAS Automation (Before April 14)
- [ ] Automated BAS preparation workflow
- [ ] Accountant-ready pack generation
- [ ] Pre-BAS reconciliation sweep

### Phase 5: Strategic Layer (April)
- [ ] Restructured weekly review
- [ ] SaaS spend dashboard with trend detection
- [ ] Budget vs actual tracking with alerts
- [ ] 13-week cash forecast on command center

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Project tagging coverage | 100% | 100% (maintain) |
| Receipt coverage (bills) | 99.6% | 99%+ |
| Receipt coverage (bank txns) | 28.8% | 80%+ |
| Average collection days | 90+ days | <30 days |
| DRAFT invoices outstanding | 1 ($84.7k) | 0 |
| R&D-eligible spend identified | $47k | $150k+ (with travel allocation) |
| Uncategorised spend | $35k | <$5k |
| BAS prep time | Manual (days) | Automated (hours) |
| Cash runway visibility | None | 13-week forecast |

---

## Key Insight

The system doesn't need more data collection. It needs **action triggers**. The difference between a data pipeline and a financial control system is: one tells you what happened, the other makes things happen. Every alert should have a default action. Every exception should have an escalation path. The goal is that BAS quarters close themselves — you just review and approve.

---

## Cost of Not Doing This

- **Collections gap:** $130k+ sitting uncollected earning nothing. At even 5% opportunity cost, that's $6,500/year.
- **R&D under-claim:** If travel is mis-tagged, you're leaving $30-50k/year in refunds on the table.
- **SaaS creep:** Without monitoring, $300-500/month leaks to unused or redundant tools ($3,600-6,000/year).
- **Total annual cost of inaction: ~$40-60k.**
