# Company Intelligence Layer — Implementation Plan

**Created:** 2026-03-21
**Status:** In Progress
**Goal:** Make all financial intelligence pervasive across every surface — receipts findable instantly, R&D tracked automatically, intelligence rolled up across dashboard, Telegram, and Notion.

---

## Phase 1: Receipt Intelligence + R&D Evidence (Money Protection)

### 1A. Smart Receipt Finder API
**File:** `apps/command-center/src/app/api/finance/receipt-finder/route.ts` (NEW)

Cross-source receipt search that queries all data simultaneously:
- `communications` table (Gmail) — search by vendor name + amount + date range
- `calendar_events` table — check for meetings/travel near transaction date
- `xero_transactions` — the bank transaction itself
- `xero_invoices` (ACCPAY) — check if a bill already exists
- `receipt_matches` — check if already captured

Input: `{ vendor?: string, amount?: number, date?: string, project_code?: string }`
Output: `{ matches: Array<{ source, confidence, details }> }`

### 1B. Smart Receipt Finder Telegram Tool
**File:** `apps/command-center/src/lib/agent-tools.ts`

Add `find_receipt` tool to bot:
- Input: vendor name, approximate amount, approximate date
- Calls the receipt-finder API
- Returns formatted results with source attribution

### 1C. R&D Evidence Auto-Collector Script
**File:** `scripts/collect-rd-evidence.mjs` (NEW)

For each R&D project (ACT-EL, ACT-IN, ACT-JH, ACT-GD):
- Git commits: search commit messages + file paths for project keywords
- Calendar events: filter by project code or keywords
- Xero spend: pull from project_monthly_financials
- Communications: count project-tagged emails
- Generate monthly activity register → `rd_evidence` table or JSON output

### 1D. R&D Evidence API + Dashboard Card
**File:** `apps/command-center/src/app/api/finance/rd-evidence/route.ts` (NEW)
**File:** `apps/command-center/src/app/finance/rd-tracking/page.tsx` (MODIFY)

API aggregates R&D evidence per project. Dashboard card shows:
- Eligible spend by project
- Receipt coverage %
- Evidence strength (git commits, calendar events, emails)
- Estimated refund with gaps quantified

---

## Phase 2: Intelligence Everywhere (Dashboard)

### 2A. Finance Ask on Every Page
**File:** `apps/command-center/src/components/ask-about-this.tsx` (or similar)

Make the AskAboutThis component page-aware:
- Project page → inject that project's financials as context
- Contact page → inject their invoices and payment history
- Grant page → inject pipeline status and deadlines
- Same M2.7 backend, different context per page

### 2B. CEO Intelligence Dashboard
**File:** `apps/command-center/src/app/page.tsx` or `apps/command-center/src/app/intelligence/page.tsx` (NEW)

Single roll-up view:
- Financial health: runway, burn rate, receivables age, R&D position
- Project health: all 14 projects with traffic lights (from project_health)
- Relationship health: contacts needing attention (from contact_signals)
- Pipeline: weighted grant value, next deadlines (from opportunities_unified)
- Receipt coverage: % with receipts, R&D $ impact of gaps

---

## Phase 3: Proactive Agent Layer

### 3A. Proactive Financial Alerts
**File:** `apps/command-center/src/app/api/webhooks/xero/route.ts` (MODIFY)

Add intelligence to Xero webhook handler:
- Invoice paid → Telegram with runway impact
- New large transaction → Telegram with budget status
- Receipt matched → Telegram with R&D coverage update

### 3B. Notion Financial Workers
**File:** `packages/notion-workers/src/index.ts` (MODIFY)

Add 3 finance workers:
- `get_project_budget_status` — budget vs actual for a project
- `get_missing_receipts` — receipts needed for a project
- `get_rd_evidence_summary` — R&D evidence strength for a project

### 3C. Enhanced Calendar-to-Receipt Matcher
**File:** `scripts/suggest-receipts-from-calendar.mjs` (MODIFY)

Make smarter:
- Detect travel events (flight, hotel, Palm Island, Darwin keywords)
- Cross-reference with bank transactions in same date range
- Pre-fill receipt suggestions with project codes
- Push to Telegram day AFTER travel (not weekly)

---

## Files to Create/Modify

| File | Change | Phase |
|------|--------|-------|
| `apps/command-center/src/app/api/finance/receipt-finder/route.ts` | NEW — cross-source receipt search | 1A |
| `apps/command-center/src/lib/agent-tools.ts` | ADD find_receipt tool | 1B |
| `scripts/collect-rd-evidence.mjs` | NEW — R&D evidence collector | 1C |
| `apps/command-center/src/app/api/finance/rd-evidence/route.ts` | NEW — R&D evidence API | 1D |
| `apps/command-center/src/app/finance/rd-tracking/page.tsx` | ADD evidence card | 1D |
| `apps/command-center/src/components/ask-about-this.tsx` | Page-aware context | 2A |
| `apps/command-center/src/app/intelligence/page.tsx` | NEW — CEO dashboard | 2B |
| `apps/command-center/src/app/api/webhooks/xero/route.ts` | ADD financial alerts | 3A |
| `packages/notion-workers/src/index.ts` | ADD 3 finance workers | 3B |
| `scripts/suggest-receipts-from-calendar.mjs` | ENHANCE matching | 3C |

## Key Tables

- `xero_transactions` — bank feed transactions with project_code
- `xero_invoices` — bills (ACCPAY) and invoices (ACCREC)
- `communications` — Gmail messages with project_code
- `calendar_events` — Google Calendar events
- `receipt_matches` — receipt capture pipeline
- `project_monthly_financials` — pre-calculated P&L
- `project_budgets` — FY targets
- `project_health` — health scores
- `contact_signals` — engagement scores
- `opportunities_unified` — grant + strategic pipeline
- `vendor_project_rules` — vendor → project mapping
