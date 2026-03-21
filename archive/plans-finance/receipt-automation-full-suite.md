# Plan: ACT Receipt & Financial Automation Full Suite

**Date:** 2026-03-17
**Mode:** SCOPE EXPANSION — Full receipt lifecycle + project finance intelligence + agentic recommendations

## Vision

Every dollar ACT spends is automatically captured, receipted, project-tagged, and reconciliation-ready. An AI agent proactively finds missing receipts, recommends project allocations, tracks R&D eligibility, monitors burn rate, and prepares everything for the accountant. The human role shifts from data entry to review-and-approve.

## Current State

```
Working:
  ✓ Xero OAuth2 + 6-hourly sync (invoices + transactions)
  ✓ 1,581 Dext receipts imported to receipt_emails table
  ✓ 903 marked as uploaded, 39 matched, 156 captured, 483 in review
  ✓ Matching engine (heuristic + AI two-pass scoring)
  ✓ Upload script (Xero Attachments API with retry/dedup)
  ✓ 126 vendor patterns across 4 Gmail mailboxes
  ✓ Tracking category parsing from Xero (read-only)
  ✓ R&D activity log (git commits + calendar)
  ✓ 21 finance dashboard pages
  ✓ Webhook handler for Xero events
  ✓ Receipt gamification system

Blocked:
  ✗ update_receipt_match RPC function missing — blocks match + upload scripts
  ✗ capture-receipts.mjs not built — still forwarding to Dext
  ✗ No local file/folder scanning
  ✗ No calendar-based receipt suggestions
  ✗ Tracking categories not written back to Xero
  ✗ No automated reconciliation prep
  ✗ No budget/runway agent
  ✗ No orchestrator (receipt-pipeline.mjs)
```

## Xero API Capabilities (researched)

| Capability | API Endpoint | Can Automate? |
|-----------|-------------|---------------|
| Upload receipts | `PUT /BankTransactions/{id}/Attachments/{file}` | YES |
| Create bills from receipts | `POST /Invoices` (type=ACCPAY) | YES |
| Tag with project code | `PUT /BankTransactions/{id}` (TrackingCategories) | YES |
| Create/update contacts | `POST /Contacts` | YES |
| Create payments | `POST /Payments` | YES |
| Manual journal (R&D) | `POST /ManualJournals` | YES |
| P&L by tracking category | `GET /Reports/ProfitAndLoss?trackingCategoryID=X` | YES |
| Balance sheet | `GET /Reports/BalanceSheet` | YES |
| Repeating invoices | `GET /RepeatingInvoices` | YES |
| Read budgets | `GET /Budgets` | YES (read-only) |
| **Approve reconciliation** | — | **NO — must be done in Xero UI** |
| **Create/update budgets** | — | **NO — read-only via API** |

**Key constraint:** We can prepare everything for reconciliation but final approval must happen in the Xero web UI. Our job is to make that a 2-minute click-through, not a 2-hour data entry session.

## Architecture

```
                    ┌──────────────────────────────────────┐
                    │         RECEIPT DISCOVERY             │
                    │                                      │
                    │  Gmail (4 mailboxes, 126 vendors)    │
                    │  Local folders (~/Downloads, etc.)   │
                    │  Calendar suggestions (travel/mtgs)  │
                    │  Manual upload (Telegram/dashboard)  │
                    │  Vendor auto-request (missing > 7d)  │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │         RECEIPT CAPTURE               │
                    │                                      │
                    │  receipt_emails table                 │
                    │  Supabase Storage (receipt-attachments│
                    │  Vendor detection + amount extraction │
                    │  Dedup by gmail_message_id / hash    │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │         AI MATCHING                   │
                    │                                      │
                    │  Pass 1: Heuristic (vendor+date+amt) │
                    │  Pass 2: AI scorer (ambiguous 40-80%)│
                    │  Pass 3: Calendar context boost      │
                    │  Auto-resolve ≥80% confidence        │
                    │  Queue <80% for human review         │
                    └──────────────────┬───────────────────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                    ┌─────────────────┐ ┌─────────────────┐
                    │  XERO UPLOAD    │ │ PROJECT TAGGING  │
                    │                 │ │                  │
                    │  Attachments API│ │ Tracking Category│
                    │  to BankTxn     │ │ write-back       │
                    │  or Invoice     │ │ vendor_project_  │
                    │                 │ │ rules lookup     │
                    └────────┬────────┘ └────────┬────────┘
                             │                   │
                             └─────────┬─────────┘
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      RECONCILIATION PREP              │
                    │                                      │
                    │  Match bank lines → invoices/bills   │
                    │  Create ACCPAY bills from receipts   │
                    │  Create payment records               │
                    │  Flag exceptions for accountant      │
                    │  Generate reconciliation checklist   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      INTELLIGENCE & REPORTING         │
                    │                                      │
                    │  R&D activity log (git + calendar)   │
                    │  Project P&L (via tracking cats)     │
                    │  Budget vs actual (read from Xero)   │
                    │  Burn rate / runway per project      │
                    │  Subscription monitoring              │
                    │  Agentic cost recommendations        │
                    │  Accountant-ready report pack        │
                    └──────────────────────────────────────┘
```

## Implementation Phases

---

### Phase 0: Unblock the Pipeline (30 min)

**Goal:** Get the existing 39 matched + 156 captured receipts flowing.

1. **Create `update_receipt_match` RPC function** — migration SQL:
```sql
CREATE OR REPLACE FUNCTION update_receipt_match(
  receipt_id uuid,
  new_status text DEFAULT NULL,
  new_xero_transaction_id text DEFAULT NULL,
  new_xero_bank_transaction_id text DEFAULT NULL,
  new_match_confidence numeric DEFAULT NULL,
  new_match_method text DEFAULT NULL,
  new_project_code text DEFAULT NULL,
  new_error_message text DEFAULT NULL,
  new_retry_count int DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE receipt_emails SET
    status = COALESCE(new_status, status),
    xero_transaction_id = COALESCE(new_xero_transaction_id, xero_transaction_id),
    xero_bank_transaction_id = COALESCE(new_xero_bank_transaction_id, xero_bank_transaction_id),
    match_confidence = COALESCE(new_match_confidence, match_confidence),
    match_method = COALESCE(new_match_method, match_method),
    project_code = COALESCE(new_project_code, project_code),
    error_message = new_error_message,
    retry_count = COALESCE(new_retry_count, retry_count),
    updated_at = now()
  WHERE id = receipt_id;
END;
$$ LANGUAGE plpgsql;
```

2. **Create Supabase Storage bucket** `receipt-attachments` (private)

3. **Test end-to-end:**
```bash
node scripts/match-receipts-to-xero.mjs --verbose          # dry run
node scripts/match-receipts-to-xero.mjs --apply --ai       # write matches
node scripts/upload-receipts-to-xero.mjs --status           # check pipeline
node scripts/upload-receipts-to-xero.mjs --dry-run          # preview uploads
node scripts/upload-receipts-to-xero.mjs --limit 5          # upload first 5
```

**Files:** 1 new migration
**Acceptance:** 39 matched receipts upload to Xero successfully

---

### Phase 1: Receipt Discovery Agent (2-3 hours)

**Goal:** Find receipts from ALL sources, not just Gmail vendor forwards.

#### 1a. Gmail Capture (replace Dext forwarding)

**New file:** `scripts/capture-receipts.mjs` (replaces `forward-receipts-to-dext.mjs`)

- Reuse all 126 vendor patterns + search query logic
- Instead of MIME-wrapping + forwarding to Dext: download attachments via Gmail API
- Store PDF/image to Supabase Storage bucket `receipt-attachments`
- Insert to `receipt_emails` with `source = 'gmail'`
- Extract amount from subject/body using existing regex patterns
- Detect vendor from sender + patterns
- Run every 6 hours via PM2

#### 1b. Local Folder Scanner

**New file:** `scripts/scan-local-receipts.mjs`

- Watch configurable folders: `~/Downloads`, `~/Desktop`, custom paths
- Detect PDFs and images that look like receipts (filename heuristics: `receipt`, `invoice`, `tax_invoice`, vendor names)
- Optional: basic PDF text extraction (pdf-parse npm) for amount/vendor
- Upload to Supabase Storage
- Insert to `receipt_emails` with `source = 'local_scan'`
- Run on-demand or via launchd watcher

#### 1c. Calendar-Based Receipt Suggestions

**New file:** `scripts/suggest-receipts-from-calendar.mjs`

- Query `calendar_events` for travel/meeting events in last 30 days
- Cross-reference with `xero_transactions` — find SPEND transactions near event dates
- Cross-reference with `receipt_emails` — which of these already have receipts?
- Generate "missing receipt suggestions":
  - "You had a flight to Darwin on Mar 5 — Qantas $487.50 transaction has no receipt"
  - "Team dinner at Alchemy on Mar 10 — $234.00 transaction has no receipt"
- Output to Telegram notification + dashboard

#### 1d. Proactive Vendor Receipt Requests

**Enhancement to:** `scripts/auto-followups.mjs` or new script

- For transactions >7 days old with no receipt and vendor has email on file
- Generate draft email: "Hi, could you please resend the receipt/invoice for [transaction] on [date]?"
- Queue for human review before sending (never auto-send)

**Files:** 3 new scripts, 1 modified
**Acceptance:** Receipts found from Gmail + local folders + calendar suggestions

---

### Phase 2: Project Tagging via Xero Tracking Categories (1-2 hours)

**Goal:** Every transaction in Xero is tagged with a project code, not just in Supabase.

#### 2a. Write Tracking Categories Back to Xero

**New file:** `scripts/tag-xero-transactions.mjs`

Uses the Xero BankTransactions API to update tracking:

```
POST https://api.xero.com/api.xro/2.0/BankTransactions/{BankTransactionID}
{
  "BankTransactionID": "...",
  "LineItems": [{
    "Tracking": [{
      "TrackingCategoryID": "{project-tracking-category-id}",
      "TrackingOptionID": "{ACT-XX-option-id}"
    }]
  }]
}
```

**Logic:**
1. Load untagged `xero_transactions` (no tracking category set)
2. Look up project code from `vendor_project_rules` table
3. Fall back to AI suggestion based on vendor name + amount pattern
4. Apply via Xero API
5. Rate limit: 1 call/sec (within 60/min)
6. Log changes to `integration_events`

#### 2b. Cache Tracking Category IDs

**New file:** `scripts/lib/xero-tracking.mjs`

- Fetch tracking categories + options from Xero: `GET /TrackingCategories`
- Cache in `xero_tracking_categories` table
- Map ACT project codes → TrackingOptionIDs
- Create new tracking options via API when new projects are added

#### 2c. Add `project_code` to `xero_invoices`

**Migration:** Add column + backfill from existing `line_items.tracking` JSONB

**Files:** 2 new scripts, 1 new lib module, 1 migration
**Acceptance:** Untagged transactions get project codes in Xero

---

### Phase 3: Reconciliation Prep (2-3 hours)

**Goal:** Accountant opens Xero and everything is ready to approve.

#### 3a. Auto-Create Bills from Receipts

**New file:** `scripts/create-xero-bills.mjs`

For receipt emails that match SPEND transactions but have no corresponding Xero bill:
1. Create ACCPAY invoice (bill) via `POST /Invoices`
2. Attach receipt PDF via Attachments API
3. Set tracking category for project
4. Set contact (create if needed via Contacts API)
5. Mark as AUTHORISED (ready for payment matching)

#### 3b. Payment Record Creation

**Enhancement to:** `upload-receipts-to-xero.mjs` or new script

For matched receipts where the bank transaction exists:
1. Check if payment already exists for the bill
2. If not, create via `POST /Payments` linking bill → bank transaction
3. This pre-matches the reconciliation in Xero

#### 3c. Reconciliation Checklist Generator

**New file:** `scripts/generate-reconciliation-checklist.mjs`

Monthly output for accountant:
- Unreconciled bank lines (count + total)
- Transactions missing receipts (count + which ones)
- Transactions missing project tags (count)
- Bills awaiting approval
- Suggested matches (our AI matching, formatted for easy Xero UI clicking)
- Exceptions requiring human judgment
- Output: Markdown report + Telegram summary + dashboard page

#### 3d. Bank Statement Import Enhancement

**Enhancement to:** `sync-xero-bank-feed.mjs`

- Track reconciliation status per bank line
- Flag items that have been unreconciled >14 days
- Auto-categorize internal transfers (NAB→NAB)

**Files:** 2 new scripts, 2 enhanced scripts
**Acceptance:** Accountant reconciliation time drops from 2+ hours to <15 minutes/month

---

### Phase 4: R&D Tracking & Financial Intelligence (2-3 hours)

**Goal:** R&D tax incentive tracking + project budget intelligence.

#### 4a. Enhanced R&D Activity Log

**Enhancement to:** `scripts/generate-rd-activity-log.mjs`

Current: Git commits + calendar time estimation
Add:
- Link R&D hours to project financial spend
- Track eligible vs ineligible expenses per project
- Cross-reference with Xero transactions tagged to R&D projects
- Generate R&D tax incentive report (43.5% refundable offset for <$20M turnover)
- Create manual journal entries for R&D allocations via `POST /ManualJournals`

#### 4b. Project Budget Agent

**New file:** `scripts/project-budget-agent.mjs`

Since Xero budgets are read-only via API, maintain budgets in Supabase:

**New table:** `project_budgets`
```sql
CREATE TABLE project_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code text NOT NULL,
  fy_year text NOT NULL,          -- '2025-26'
  month date,                      -- NULL = annual, date = monthly
  budget_amount numeric(12,2),
  budget_type text,                -- 'expense', 'revenue', 'grant'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_code, fy_year, month, budget_type)
);
```

Agent capabilities:
- Compare budget vs actual (from `project_monthly_financials`)
- Calculate burn rate per project (last 3 months average)
- Project runway: budget remaining / monthly burn
- Alert when project is >80% of budget
- Alert when burn rate accelerates >20% month-over-month
- Recommend spend sequencing: "Delay ACT-GD equipment purchase to Q4 when grant funds arrive"

#### 4c. Subscription Intelligence

**Enhancement to:** `scripts/lib/subscription-discovery.mjs`

- Detect price changes (compare this month vs last month for same vendor)
- Flag unused subscriptions (no activity in associated project for 60+ days)
- Calculate total SaaS spend by project
- Recommend consolidation: "3 projects use separate Notion workspaces — consolidate?"

#### 4d. Agentic Cost Recommendations

**New file:** `scripts/financial-advisor-agent.mjs`

Weekly Telegram digest with AI-generated insights:
- "ACT-EL is 73% through its budget with 4 months remaining — on track"
- "ACT-GD burn rate increased 45% this month — driven by $2,400 Kennards Hire"
- "3 receipts missing for March >$500 — likely: Qantas ($487), Bunnings ($523), Adobe ($156)"
- "R&D eligible spend this FY: $47,230 → estimated refund: $20,545"
- "Dext subscription can be cancelled — $0 savings (already removed from pipeline)"

**Files:** 3 new scripts, 2 enhanced, 1 migration
**Acceptance:** Weekly financial intelligence digest via Telegram

---

### Phase 5: Pipeline Orchestration & Dashboard (1-2 hours)

**Goal:** Single command runs everything, dashboard shows full picture.

#### 5a. Pipeline Orchestrator

**New file:** `scripts/receipt-pipeline.mjs`

```bash
node scripts/receipt-pipeline.mjs              # Full pipeline
node scripts/receipt-pipeline.mjs capture      # Phase: capture from all sources
node scripts/receipt-pipeline.mjs match        # Phase: match to Xero
node scripts/receipt-pipeline.mjs upload       # Phase: upload to Xero
node scripts/receipt-pipeline.mjs tag          # Phase: project tagging
node scripts/receipt-pipeline.mjs reconcile    # Phase: reconciliation prep
node scripts/receipt-pipeline.mjs status       # Health check
node scripts/receipt-pipeline.mjs report       # Generate accountant report
```

PM2 schedule:
- Capture: every 6 hours
- Match: daily 7am AEST
- Upload: daily 8am AEST
- Tag: daily 9am AEST
- Reconcile: weekly Monday 6am
- Report: monthly 1st at 7am

#### 5b. Dashboard Enhancements

**Enhance:** `apps/command-center/src/app/finance/receipt-pipeline/page.tsx`

- Real-time pipeline funnel (captured → matched → uploaded → reconciled)
- Missing receipt alerts with calendar context
- Project budget vs actual charts
- R&D tracking summary
- Burn rate sparklines per project
- Accountant action items list

#### 5c. Telegram Integration

- Daily: "X receipts captured, Y matched, Z uploaded. W need review."
- Weekly: Financial advisor digest (Phase 4d)
- Monthly: Reconciliation checklist summary
- Exception: "Upload failed for [vendor] — [error]" (immediate)

**Files:** 1 new script, dashboard page enhancements, Telegram notifications
**Acceptance:** `receipt-pipeline.mjs status` shows green across all stages

---

## Phase Summary

| Phase | Effort | Unblocks | Key Deliverable |
|-------|--------|----------|-----------------|
| **0: Unblock** | 30 min | Matching + upload | RPC function + storage bucket |
| **1: Discovery** | 2-3 hrs | Receipt finding | Gmail capture + local scan + calendar suggestions |
| **2: Project Tagging** | 1-2 hrs | Xero tracking | Write tracking categories back to Xero |
| **3: Reconciliation** | 2-3 hrs | Accountant handoff | Bill creation + payment matching + checklist |
| **4: Intelligence** | 2-3 hrs | Financial decisions | Budget agent + R&D tracking + advisor |
| **5: Orchestration** | 1-2 hrs | Operations | Pipeline command + dashboard + Telegram |

**Total:** ~10-14 hours across sessions

## Xero API Scopes Needed

Current scopes cover most needs:
```
accounting.transactions (WRITE) ← already have
accounting.contacts.read         ← need WRITE for creating contacts
accounting.attachments           ← may need to add explicitly
accounting.settings.read         ← need for tracking categories
```

**Add:**
- `accounting.contacts` (write — for creating suppliers from receipts)
- `accounting.attachments` (explicit — for upload)

May need to re-authorize OAuth if scopes change.

## What We Cannot Automate (Xero Limitations)

1. **Bank reconciliation approval** — must click in Xero UI
2. **Budget creation/updates** — read-only API, maintain in Supabase
3. **Bank statement line deletion** — cannot remove incorrect imports
4. **Suggested match approval** — Xero's AI matching visible only in UI

Our strategy: **prepare everything perfectly so the accountant's job is approve/reject, not search/enter**.

## Risk Map

| Risk | Impact | Mitigation |
|------|--------|------------|
| Xero rate limit (60/min) | Upload stalls | 1.1s delay between calls, batch in off-hours |
| OAuth token expiry mid-run | Pipeline stops | Auto-refresh with Supabase fallback (already built) |
| Wrong project tag applied | Financial misreporting | AI suggests, human approves for first 30 days |
| Receipt PDF too large (>10MB) | Upload rejected | Compress before upload, skip + alert if still too big |
| Vendor pattern miss | Receipt not captured | Weekly "unmatched transactions" report catches gaps |
| Supabase Storage quota | Capture stops | Monitor usage, alert at 80%, old receipts lifecycle policy |

## Success Metrics

- **Receipt coverage:** >90% of SPEND transactions have attachments (from ~40% today)
- **Auto-match rate:** >80% of receipts matched without human intervention
- **Project tagging:** >95% of transactions tagged with project code in Xero
- **Reconciliation time:** <15 min/month (from 2+ hours)
- **R&D tracking:** Automated monthly report, no manual time logging
- **Missing receipts:** <5 outstanding at any time (from 383)
- **Dext subscription:** Cancelled
