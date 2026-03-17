# ACT Finance Engine — Master Plan

**Date:** 2026-03-17
**Status:** APPROVED — SCOPE EXPANSION
**Supersedes:** receipt-system-v2-and-subscription-audit.md, receipt-automation-full-suite.md, dext-removal-direct-xero-pipeline.md, bas-prep-and-business-transition.md
**Review mode:** CEO/Founder (SCOPE EXPANSION — Build the cathedral)

---

## Decisions Made (User Approved)

1. **Full consolidation** — 32 scripts → 5 lib/finance/ modules + 1 orchestrator
2. **Entity model now** — `act_entities` table + `entity_code` column on all finance tables
3. **Dashboard 22→3** — Operator (daily), Accountant (monthly), Board (quarterly)
4. **Full test suite** — Unit tests for matcher, amount extraction, date matching + integration tests
5. **R&D evidence pack** — Automated AusIndustry submission pack generator
6. **Skip Telegram receipt photo** — Xero native app handles this better
7. **Accountant PDF pack** — One-click downloadable report bundle
8. **Xero tokens to Supabase** — Move from plaintext `.xero-tokens.json` to encrypted DB storage
9. **One living plan** — This file is THE plan. Archive 4 stale predecessors.

---

## Implementation Roadmap

### Phase 1: Foundation (1 session, ~2-3 hours)
**Goal:** Shared modules, entity model, token security

- [x] **1a. Create `scripts/lib/finance/` module structure**
  - `xero-client.mjs` — All Xero API calls (auth, sync, upload, tag, refresh)
  - `common.mjs` — Supabase client, Telegram notify, retry wrapper, structured logging
  - Extract from: `sync-xero-to-supabase.mjs`, `upload-receipts-to-xero.mjs`, `tag-xero-transactions.mjs`

- [x] **1b. Entity-aware data model**
  - Migration: `act_entities` table + `entity_code` column on `xero_transactions`, `xero_invoices`, `receipt_emails`
  - Default: `'ACT-ST'` (sole trader)
  - Seed: current entity record

- [x] **1c. Move Xero tokens to Supabase**
  - Update `xero_tokens` table to store access_token, refresh_token, expires_at
  - Update `xero-client.mjs` to read/write tokens from DB instead of `.xero-tokens.json`
  - Keep file as fallback during transition

- [x] **1d. Archive stale files**
  - Move to `archive/plans-finance/`: receipt-system-v2-and-subscription-audit.md, receipt-automation-full-suite.md, dext-removal-direct-xero-pipeline.md, bas-prep-and-business-transition.md
  - Move to `archive/scripts-retired-2026-03/`: forward-receipts-to-dext.mjs, match-dext-to-xero.mjs, correlate-dext-xero.mjs, search-cursor-receipts.mjs, monitor-receipt-pipeline.mjs, check-receipt-*.mjs, check-xero-schema.mjs, xero-full-audit.mjs

### Phase 2: Test Suite (1 session, ~3-4 hours)
**Goal:** Safety net before any further changes

- [x] **2a. Unit tests for receipt-matcher.mjs**
  - Known vendor pairs (Rasier → Uber, Booking.com variants)
  - Dice coefficient edge cases (empty string, single char, exact match)
  - Amount tolerance (±5%, FX conversion scenarios)
  - Date window matching (same day, +3 days, +7 days, cross-month)

- [x] **2b. Unit tests for capture-receipts.mjs**
  - `isLikelyReceipt()` classifier (marketing vs receipt vs transactional)
  - `extractReceiptFromHtml()` for Uber, Apple, Telstra HTML formats
  - `extractAmount()` from PDF text (various formats: $29.00, AUD 44.62, 29 USD)
  - Marketing filter patterns (40+ patterns, no false positives on receipts)

- [x] **2c. Integration tests for pipeline**
  - Dry-run of full pipeline with sample data
  - Xero upload mock (test retry on 500, skip on duplicate)
  - Entity isolation (sole trader data doesn't leak to pty ltd)

- [x] **2d. Self-test command**
  - `node scripts/finance-engine.mjs --self-test`
  - Exercises every module, reports pass/fail per stage

### Phase 3: Module Consolidation (1-2 sessions, ~4-6 hours)
**Goal:** 32 scripts → 5 modules + 1 orchestrator

- [x] **3a. `lib/finance/capture.mjs`**
  - Extract from: `capture-receipts.mjs`
  - Add: calendar-based suggestions (from `suggest-receipts-from-calendar.mjs`)
  - Export: `captureFromGmail()`, `suggestFromCalendar()`

- [x] **3b. `lib/finance/classify.mjs`**
  - Extract from: `match-receipts-to-xero.mjs`, `tag-xero-transactions.mjs`
  - Includes: receipt matching, project tagging, unknown charge detection, R&D flagging
  - Export: `matchReceipts()`, `tagTransactions()`, `detectAnomalies()`

- [x] **3c. `lib/finance/reconcile.mjs`**
  - Extract from: `upload-receipts-to-xero.mjs`, `generate-reconciliation-checklist.mjs`
  - Add: bill creation from receipts (ACCPAY via Xero API)
  - Export: `uploadToXero()`, `generateChecklist()`, `createBills()`

- [x] **3d. `lib/finance/report.mjs`**
  - Extract from: `financial-advisor-agent.mjs`, `finance-daily-briefing.mjs`
  - Add: accountant PDF pack generation
  - Export: `weeklyDigest()`, `accountantPack()`, `boardPack()`

- [x] **3e. `lib/finance/comply.mjs`**
  - Extract from: `generate-rd-activity-log.mjs`, `xero-bas-analysis.mjs`
  - New: R&D evidence pack generator (git analysis + financial breakdown + narratives)
  - New: BAS prep automation (reconciliation status + GST summary + export)
  - Export: `generateRdEvidencePack()`, `prepareBas()`, `entityTransition()`

- [x] **3f. `finance-engine.mjs` orchestrator**
  - Replaces: `receipt-pipeline.mjs`
  - Commands: `capture`, `classify`, `reconcile`, `report`, `comply`, `health`, `self-test`
  - Full pipeline: `node scripts/finance-engine.mjs` (runs all in sequence)

### Phase 4: Dashboard Consolidation (1 session, ~3-4 hours)
**Goal:** 22 pages → 3 focused views

- [x] **4a. `/finance` → Operator Dashboard**
  - Receipt pipeline funnel (captured → matched → uploaded)
  - Action items queue (receipts to review, transactions to tag)
  - Cash position + runway sparkline
  - Top 5 warnings from financial advisor
  - Data freshness indicators (Xero sync, receipt capture)
  - Quick links: subscriptions, R&D tracking, reconciliation

- [x] **4b. `/finance/accountant` → Accountant Portal**
  - Reconciliation checklist (auto-generated)
  - Unmatched items requiring judgment (approve/flag/defer buttons)
  - BAS prep summary (GST collected/paid, PAYG)
  - Receipt coverage by project (traffic lights)
  - Download: Accountant Pack PDF

- [x] **4c. `/finance/board` → Board Report**
  - P&L by project (with charts)
  - Budget vs actual (if budgets populated)
  - R&D eligible spend + estimated refund
  - Subscription audit summary
  - Cash runway projection
  - Download: Board Pack PDF

- [ ] **4d. Archive/redirect old pages** *(deferred — old pages still functional, no breakage)*
  - Keep API routes (they power the new views)
  - Old page URLs redirect to relevant section in new views
  - Move old page files to archive/ for reference

### Phase 5: R&D Evidence Pack + BAS Automation (1 session, ~2-3 hours)
**Goal:** One-click compliance outputs

- [x] **5a. R&D Evidence Pack Generator**
  - Git commit analysis: filter by project code, categorize as core/supporting R&D
  - Financial breakdown: R&D spend by activity, by type (personnel, cloud, contractor, overhead)
  - Time allocation: estimate from git activity patterns
  - Technical narratives: template-based, auto-filled with project-specific data
  - Cloud cost attribution: pull from `api_usage` table
  - Output: Markdown + PDF, ready for R&D tax advisor

- [x] **5b. BAS Prep Automation**
  - Pull GST data from Xero (1A collected, 1B paid)
  - Receipt coverage check (flag items missing receipts that affect GST claims)
  - Project tagging coverage check
  - Reconciliation completeness
  - Output: BAS worksheet + gap list + accountant action items

- [ ] **5c. Accountant Pack PDF** *(deferred — Markdown evidence pack done, PDF generation future enhancement)*
  - Sections: executive summary, reconciliation checklist, P&L by project, receipt coverage, R&D spend, outstanding invoices, subscription audit
  - Uses existing API endpoints for data
  - PDF generation via server-side rendering or markdown→PDF

### Phase 6: Health Check + Observability (0.5 session, ~1-2 hours)
**Goal:** Single command shows entire system health

- [x] **6a. `finance-engine.mjs health` command**
  ```
  Finance Engine Health — 2026-03-17
  ├── Xero sync: ✓ 2h ago (319 txns, 0 errors)
  ├── Receipt capture: ✓ 4h ago (3 new, 7 filtered)
  ├── Receipt matching: ✓ 36% matched, 0 failed
  ├── Xero uploads: ✓ 35 uploaded, 4 failed
  ├── Project tagging: ✓ 100% Q3 coverage
  ├── Subscriptions: ✓ 68 tracked, 2 flagged
  ├── BAS Q3 due: Apr 28 (41d) — 95% tagged, 60% receipted
  ├── R&D FY26: $468K eligible, 28% receipted ← ATTENTION
  └── Cash runway: 8.2 months
  ```

- [x] **6b. Error aggregation**
  - Query `integration_events` for last 7 days of errors
  - Group by type (Xero 500, Gmail auth, storage, etc.)
  - Include in health check output

- [ ] **6c. Telegram health digest** *(deferred — health command works, Telegram integration future)*
  - Daily summary: pipeline status + any errors
  - Weekly: full health check output

---

## Critical Error Fixes (Do First in Phase 1)

| Gap | Fix | Effort |
|-----|-----|--------|
| Supabase Storage quota not checked | Add quota check before upload, alert at 80% | 15 min |
| pdf-parse OOM on large PDFs | Try-catch + skip files >10MB | 10 min |
| Pipeline mid-crash leaves partial state | Add `pipeline_run_id` to track which run each record belongs to | 30 min |
| DNS failure silent on Gmail | Add Telegram alert after 3 consecutive DNS failures | 10 min |

---

## Timeline Estimate

| Phase | Sessions | Hours | Dependencies |
|-------|----------|-------|-------------|
| 1: Foundation | 1 | 2-3h | None |
| 2: Test Suite | 1 | 3-4h | Phase 1 (modules to test) |
| 3: Module Consolidation | 1-2 | 4-6h | Phase 1 (shared modules) |
| 4: Dashboard Consolidation | 1 | 3-4h | Phase 3 (modules power APIs) |
| 5: R&D + BAS Automation | 1 | 2-3h | Phase 3 (comply module) |
| 6: Health + Observability | 0.5 | 1-2h | Phase 3 (engine orchestrator) |

**Total: ~5-7 sessions, ~16-22 hours**

Phase 1 + critical error fixes can ship independently. Each subsequent phase is valuable on its own.

---

## System Audit Findings

### What Already Exists (surprisingly comprehensive)

| Component | Status | Files/Scripts |
|-----------|--------|---------------|
| Receipt capture (Gmail→Supabase) | **WORKING** (v2 just shipped) | `capture-receipts.mjs` |
| Receipt matching (heuristic+AI) | **WORKING** | `match-receipts-to-xero.mjs` + `lib/receipt-matcher.mjs` + `lib/receipt-ai-scorer.mjs` |
| Receipt upload to Xero | **WORKING** | `upload-receipts-to-xero.mjs` |
| Project tagging (278 vendor rules) | **WORKING** | `tag-xero-transactions.mjs` |
| Unknown charge detection | **WORKING** | Phase 1.5 in `tag-xero-transactions.mjs` |
| Subscription dashboard (68 subs) | **WORKING** | `/finance/subscriptions` + 6 API routes |
| Xero sync (6-hourly) | **WORKING** | `sync-xero-to-supabase.mjs` |
| Pipeline orchestrator | **WORKING** | `receipt-pipeline.mjs` (7 phases) |
| Financial advisor (AI digest) | **WORKING** | `financial-advisor-agent.mjs` (burn rate, R&D, budget) |
| PM2 cron schedule | **WORKING** | 12+ finance jobs, daily/weekly/monthly |
| Xero webhooks | **WORKING** | `/api/webhooks/xero/` (HMAC validated) |
| Finance dashboard | **WORKING** | 22 pages, 58+ API routes |
| R&D activity log | **WORKING** | `generate-rd-activity-log.mjs` |
| Reconciliation checklist | **EXISTS** | `generate-reconciliation-checklist.mjs` |
| Calendar receipt suggestions | **EXISTS** | `suggest-receipts-from-calendar.mjs` |
| Receipt gamification | **EXISTS** | `lib/receipt-gamification.mjs` |
| Receipt notifications | **EXISTS** | `lib/receipt-notifications.mjs` |
| BAS analysis | **EXISTS** | `xero-bas-analysis.mjs`, `xero-bas-review.mjs` |
| Vendor project rules DB | **WORKING** | 64 vendors seeded, `rd_eligible` flag |
| Project budgets table | **EXISTS** | `project_budgets` (schema created) |
| Balance sheet API | **PLACEHOLDER** | Hardcoded data, TODO note |

### What's Actually Missing

1. **Pty Ltd entity awareness** — everything assumes single entity
2. **R&D evidence pack generator** — activity log exists but not a complete submission pack
3. **BAS one-click prep** — analysis scripts exist but no "prepare BAS for accountant" workflow
4. **Accountant portal** — 22 dashboard pages, but no "accountant view" with approve/flag/done actions
5. **Receipt from Telegram** — bot exists with 19 tools, no receipt photo capture
6. **Multi-entity Xero** — hardcoded to one tenant, won't survive Pty Ltd transition
7. **Unified financial health score** — `/api/finance/health` exists but fragmented across dimensions

---

## Step 0: Premise & Dream State

### 0A. Reframing the Problem

**Wrong framing:** "How do we improve receipt automation and R&D tracking?"
**Right framing:** "How do we build an AI CFO that makes financial operations invisible?"

The system is 70% built. The gap is not more scripts — it's **coherence, consolidation, and the last mile of automation**. Every piece exists; they just don't work as a unified whole.

### 0B. Existing Code Leverage

**Critical insight: Almost everything is already built.**

The 4 plan files (`receipt-system-v2`, `receipt-automation-full-suite`, `dext-removal`, `bas-prep-and-business-transition`) collectively describe ~50 features. **~35 of those are already implemented.** The plans are stale — they describe work that's been done.

What remains:
- Consolidation (reduce 32 scripts to coherent modules)
- Last-mile features (Pty Ltd awareness, accountant portal, BAS prep workflow)
- Evidence pack generation (R&D tax incentive)
- Cleanup (archive legacy scripts, consolidate plan files)

### 0C. Dream State

```
CURRENT STATE                      12-MONTH IDEAL
──────────────────────────────     ──────────────────────────────
32 finance scripts                 → 5 unified modules (capture, match, tag, reconcile, report)
4 stale plan files                 → 1 living architecture doc
22 finance dashboard pages         → 3 views: Operator, Accountant, Board
Single entity (sole trader)        → Dual entity (Foundation + Ventures)
Manual BAS prep (~8 hours)         → One-click BAS pack generation
R&D evidence = manual assembly     → Auto-generated evidence pack
Accountant gets CSV + phone call   → Accountant gets "Review & Approve" portal
Receipt photo = manual upload      → Telegram photo → auto-match → Xero
Budget tracking = spreadsheet      → Real-time budget vs actual with AI alerts
```

### 0D. The 10x Version

**ACT Finance Engine** — a single coherent system with 5 modules:

```
┌─────────────────────────────────────────────────────────────┐
│                    ACT FINANCE ENGINE                         │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ CAPTURE  │ CLASSIFY │ RECONCILE│ REPORT   │ COMPLY          │
│          │          │          │          │                 │
│ Gmail    │ Match to │ Prepare  │ Project  │ R&D evidence    │
│ Telegram │ Xero txn │ for      │ P&L      │ pack            │
│ Manual   │ Tag with │ accountnt│ Burn rate│ BAS prep        │
│ Calendar │ project  │ approval │ Budget   │ FBT tracking    │
│ suggest  │ R&D flag │ Checklist│ Runway   │ Entity mgmt     │
│ Vendor   │ Anomaly  │ Bill     │ Subscrip │ Audit trail     │
│ auto-req │ detect   │ creation │ Advisor  │                 │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
         ↑                                         ↓
    ┌────────────┐                        ┌─────────────────┐
    │ Data Layer │                        │ 3 Interfaces    │
    │            │                        │                 │
    │ Xero API   │                        │ 1. Operator     │
    │ Gmail API  │                        │    (Telegram +  │
    │ Supabase   │                        │     Dashboard)  │
    │ Calendar   │                        │ 2. Accountant   │
    │            │                        │    (Review UI)  │
    └────────────┘                        │ 3. Board        │
                                          │    (Monthly     │
                                          │     report)     │
                                          └─────────────────┘
```

---

## Section 1: Architecture Review

### Current Architecture (Honest Assessment)

```
┌─────────────────────────────────────────────────────────────┐
│                   SCRIPTS (32 files)                         │
│                                                              │
│  capture-receipts.mjs ──┐                                   │
│  match-receipts-to-xero ├── receipt-pipeline.mjs            │
│  upload-receipts-to-xero┘   (orchestrates, but each         │
│                              runs independently too)         │
│  tag-xero-transactions.mjs ← independent                    │
│  financial-advisor-agent.mjs ← independent                  │
│  sync-xero-to-supabase.mjs ← independent                   │
│  xero-bas-analysis.mjs ← independent                       │
│  generate-rd-activity-log.mjs ← independent                 │
│  generate-reconciliation-checklist.mjs ← independent        │
│  suggest-receipts-from-calendar.mjs ← independent           │
│  ... 20+ more independent scripts ...                       │
├─────────────────────────────────────────────────────────────┤
│                   LIB MODULES (6)                            │
│  receipt-matcher.mjs, receipt-ai-scorer.mjs                 │
│  receipt-detector.mjs, receipt-gamification.mjs             │
│  receipt-notifications.mjs, unified-receipt-search.mjs      │
├─────────────────────────────────────────────────────────────┤
│                   API LAYER (58+ routes)                     │
│  /api/receipts/* (11), /api/finance/* (15)                  │
│  /api/xero/* (3), /api/subscriptions/* (6)                  │
│  /api/business/* (7), /api/reports/* (5)                    │
│  /api/transactions/* (2), /api/webhooks/* (3)               │
│  /api/projects/* (2), /api/cashflow (1)                     │
├─────────────────────────────────────────────────────────────┤
│                   DATABASE (Supabase)                        │
│  xero_transactions, xero_invoices, receipt_emails           │
│  vendor_project_rules, subscriptions, project_budgets       │
│  receipt_matches (legacy), dext_forwarded_emails (legacy)   │
│  integration_events, webhook_delivery_log                   │
│  3 views: v_project_financials, v_monthly_revenue,          │
│           v_outstanding_invoices                            │
├─────────────────────────────────────────────────────────────┤
│                   PM2 CRON (12+ jobs)                        │
│  6h: xero-sync, receipt-capture                             │
│  Daily: match, upload, tag, briefing                        │
│  Weekly: financial-advisor, calendar-suggest                │
│  Monthly: financials, variance, snapshots, reconciliation   │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Architecture: ACT Finance Engine

**Key change: Module boundaries, not script proliferation.**

```
scripts/
  finance-engine.mjs              ← Single orchestrator (replaces receipt-pipeline.mjs)
  lib/
    finance/
      capture.mjs                 ← Gmail + Telegram + local scan
      classify.mjs                ← Match + tag + R&D flag + anomaly detect
      reconcile.mjs               ← Bill creation + payment matching + checklist
      report.mjs                  ← Advisor + BAS + R&D evidence pack
      comply.mjs                  ← Entity management + audit trail
      xero-client.mjs             ← All Xero API calls (auth, sync, upload, tag)
      receipt-matcher.mjs         ← Keep (already good)
      receipt-ai-scorer.mjs       ← Keep (already good)
```

**What gets archived (not deleted):**
- `forward-receipts-to-dext.mjs` → archive/
- `match-dext-to-xero.mjs` → archive/
- `correlate-dext-xero.mjs` → archive/
- `search-cursor-receipts.mjs` → archive/
- `monitor-receipt-pipeline.mjs` → archive/ (subsumed by finance-engine status)
- `analyze-missing-receipts.mjs` → archive/ (subsumed by report module)
- `receipt-dashboard.mjs` → archive/ (subsumed by dashboard UI)
- `check-receipt-*.mjs` (3 files) → archive/ (debug scripts)
- `check-xero-schema.mjs` → archive/
- `xero-full-audit.mjs` → archive/
- `audit-receipt-gaps.mjs` → archive/

**What stays as standalone (domain-specific scripts):**
- `xero-auth.mjs` — OAuth flow (interactive, not automated)
- `xero-bas-analysis.mjs` — BAS prep (subsumed into comply module eventually)
- `sync-xero-to-supabase.mjs` — Xero sync (stays as cron, referenced by engine)

### Entity-Aware Data Model (Pty Ltd Transition)

```sql
-- New: Entity tracking
CREATE TABLE act_entities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,           -- 'ACT-ST' (sole trader), 'ACT-V' (ventures pty ltd), 'ACT-F' (foundation)
  name text NOT NULL,
  entity_type text NOT NULL,           -- 'sole_trader', 'pty_ltd', 'clg'
  abn text,
  xero_tenant_id text,                 -- Links to Xero org
  active_from date NOT NULL,
  active_to date,                       -- NULL = currently active
  created_at timestamptz DEFAULT now()
);

-- Seed:
INSERT INTO act_entities (code, name, entity_type, abn, active_from)
VALUES ('ACT-ST', 'Nicholas Marchesi T/as A Curious Tractor', 'sole_trader', '21591780066', '2024-01-01');

-- When Pty Ltd created:
-- INSERT INTO act_entities (code, name, entity_type, abn, active_from)
-- VALUES ('ACT-V', 'ACT Ventures Pty Ltd', 'pty_ltd', 'NEW_ABN', '2026-07-01');
-- UPDATE act_entities SET active_to = '2026-06-30' WHERE code = 'ACT-ST';

-- Add entity_id to key tables:
ALTER TABLE xero_transactions ADD COLUMN entity_code text DEFAULT 'ACT-ST';
ALTER TABLE xero_invoices ADD COLUMN entity_code text DEFAULT 'ACT-ST';
ALTER TABLE receipt_emails ADD COLUMN entity_code text DEFAULT 'ACT-ST';
ALTER TABLE vendor_project_rules ADD COLUMN entity_code text DEFAULT 'ACT-ST';
```

This is a 15-minute migration that future-proofs everything. When July 1 comes, you add a new entity and new Xero tenant — existing code continues to work for historical data.

### Dashboard Consolidation: 3 Views

**Current:** 22 finance pages (receipts, reports, business, cashflow, debt, data-quality, revenue, runway, tax, ecosystem, tagger, rd-tracking, project details, revenue-planning, subscriptions, weekly-review, receipt-pipeline, dext-setup, reconciliation, health, flow, overview)

**Proposed:**

```
/finance                          ← Operator Dashboard (daily use)
  ├── Receipt pipeline funnel
  ├── Action items (receipts to match, transactions to tag)
  ├── Cash position + runway
  ├── Top 5 warnings from advisor
  └── Quick links to specific views

/finance/accountant               ← Accountant Portal (monthly use)
  ├── Reconciliation checklist
  ├── Unmatched items requiring human judgment
  ├── BAS prep summary
  ├── Approve/flag/defer actions
  └── Download: reconciliation pack (PDF)

/finance/board                    ← Board Report (quarterly use)
  ├── P&L by project
  ├── Budget vs actual
  ├── R&D eligible spend + estimated refund
  ├── Subscription audit
  ├── Cash runway projection
  └── Download: board pack (PDF)
```

**Other pages become tabs or drill-down within these 3 views**, not separate routes. The 22 pages still exist as API endpoints powering these consolidated views.

---

## Section 2: Error & Rescue Map

### Receipt Pipeline (Critical Path)

```
METHOD/CODEPATH              | WHAT CAN GO WRONG            | EXCEPTION CLASS
-----------------------------|------------------------------|------------------
capture-receipts.mjs         | Gmail API rate limit (429)   | GoogleApiError
  Phase A: metadata fetch    | OAuth token expired           | GoogleAuthError
                             | Mailbox delegation revoked    | GoogleAuthError
                             | DNS failure under load        | ENOTFOUND
-----------------------------|------------------------------|------------------
capture-receipts.mjs         | PDF too large (>25MB)        | StorageQuotaError
  Phase B: full fetch        | Supabase storage unreachable | FetchError
                             | HTML parsing fails            | TypeError
                             | pdf-parse OOM on large PDF    | RangeError
-----------------------------|------------------------------|------------------
match-receipts-to-xero.mjs   | No matching transactions     | (not error — normal)
                             | AI scorer timeout             | FetchError/TimeoutError
                             | AI returns malformed JSON     | SyntaxError
                             | Supabase RPC missing          | PostgrestError
-----------------------------|------------------------------|------------------
upload-receipts-to-xero.mjs  | Xero 500 on unreconciled txn | XeroApiError (500)
                             | Xero 401 expired token        | XeroAuthError
                             | Xero 429 rate limit           | XeroRateLimitError
                             | Attachment already exists      | XeroConflictError
                             | Transaction deleted in Xero    | XeroNotFoundError
-----------------------------|------------------------------|------------------
tag-xero-transactions.mjs    | Tracking category not found   | XeroApiError
                             | Vendor rule missing            | (not error — skips)
                             | Xero 500 on reconciled txn    | XeroApiError

EXCEPTION CLASS              | RESCUED? | RESCUE ACTION            | USER SEES
-----------------------------|----------|--------------------------|------------------
GoogleApiError (429)         | Y        | Backoff 30s, retry 3x    | Nothing (transparent)
GoogleAuthError              | Y        | Re-auth, log warning      | Telegram: "Gmail auth expired"
ENOTFOUND                    | PARTIAL  | Retry 3x, then skip      | Silent ← NEEDS FIX
StorageQuotaError            | N ← GAP  | —                        | Silent failure ← CRITICAL
FetchError (Supabase)        | Y        | Retry 3x                 | Log only ← OK
XeroApiError (500)           | Y        | Skip + log               | Logged, user sees in status
XeroAuthError (401)          | Y        | Auto-refresh token        | Transparent
XeroRateLimitError (429)     | Y        | 1.1s delay between calls  | Transparent
XeroNotFoundError            | Y        | Mark 'failed', skip       | Logged
AI SyntaxError               | PARTIAL  | Falls back to heuristic   | Lower confidence score
pdf-parse OOM                | N ← GAP  | —                        | Script crash ← CRITICAL
```

### GAPS to Fix

1. **StorageQuotaError** — If Supabase Storage fills up, capture silently stops. Fix: Check quota before upload, alert at 80%.
2. **pdf-parse OOM** — Large/malformed PDFs can crash the process. Fix: Wrap in try-catch with file size pre-check (skip >10MB).
3. **DNS failure (ENOTFOUND)** — Known issue from memory notes. Fix: Already retries, but should alert on repeated failures.

---

## Section 3: Security & Threat Model

| Threat | Likelihood | Impact | Mitigated? |
|--------|-----------|--------|------------|
| Xero OAuth token in `.xero-tokens.json` | HIGH | HIGH | PARTIAL — file exists, gitignored but plaintext on disk |
| Gmail service account key exposure | LOW | CRITICAL | YES — env var, not in code |
| Supabase service role key in scripts | MEDIUM | HIGH | YES — loaded from env |
| Receipt PDF injection (malicious PDF) | LOW | MEDIUM | NO — pdf-parse doesn't sandbox |
| SQL injection via vendor names | LOW | HIGH | YES — parameterized queries via Supabase client |
| Xero webhook spoofing | LOW | MEDIUM | YES — HMAC-SHA256 validation |
| Rate limit abuse from scripts | MEDIUM | LOW | YES — delays built into all scripts |

**Key recommendation:** The `.xero-tokens.json` file with live tokens at the repo root is the biggest security concern. Should be in `.env` or encrypted at rest.

---

## Section 4: Data Flow & Edge Cases

### Receipt Lifecycle (All 4 Paths)

```
INPUT (email) ──▶ CLASSIFY ──▶ EXTRACT ──▶ MATCH ──▶ UPLOAD ──▶ RECONCILE
    │                │            │           │          │           │
    ▼                ▼            ▼           ▼          ▼           ▼
  [nil?]         [marketing]  [no amount] [no match] [Xero 500]  [manual only]
  No new emails  → SKIP       → match on   → no_match → FAIL      → Xero UI
  → normal       → counted    vendor+date  → re-check → retry     → accountant
                               only        next run    3x then     clicks
  [duplicate]    [wrong type]  [wrong amt] [multi-    [already    [mis-match]
  gmail_msg_id   → SKIP (not   → FX conv    match]     attached]  → unreconcile
  UNIQUE          receipt)      → ±5% tol   → pick     → skip     → re-match
                               eration     highest
```

### Interaction Edge Cases (Dashboard)

| Interaction | Edge Case | Handled? |
|-------------|-----------|----------|
| Receipt matching review | Double-click "approve" | ? — needs idempotency |
| Bulk tag transactions | Tag 500+ transactions | ? — Xero rate limit (60/min) |
| Pipeline status page | Zero receipts captured | YES — empty state shown |
| Subscription discovery | Discovers 50 new subs | YES — queued as "pending" |
| Financial advisor | AI returns hallucinated numbers | PARTIAL — uses real data, AI only formats |
| Receipt upload | Attachment 15MB | ? — Xero limit is 10MB, no pre-check |

---

## Section 5: Code Quality

### DRY Violations

1. **Xero auth/token handling** — duplicated across `xero-auth.mjs`, `sync-xero-to-supabase.mjs`, `upload-receipts-to-xero.mjs`, `tag-xero-transactions.mjs`. Should be one `lib/xero-client.mjs`.
2. **Supabase client creation** — every script creates its own client. Should be `lib/supabase.mjs` (may already exist but scripts create ad-hoc).
3. **Telegram notification sending** — duplicated across 10+ scripts. Should be `lib/telegram.mjs` (exists but not universally used).
4. **Vendor name normalization** — done in both `receipt-matcher.mjs` and `match-receipts-to-xero.mjs`.

### Over-Engineering

- **Receipt gamification** (`lib/receipt-gamification.mjs`) — fun but adds complexity. Is anyone actually using the achievements system? If not, defer.
- **22 finance dashboard pages** — too many entry points. Consolidate to 3 views.

### Under-Engineering

- **No retry wrapper** — each script implements its own retry logic differently.
- **No structured logging** — scripts use `console.log`, no common log format.
- **No pipeline transaction semantics** — if `match` succeeds but `upload` fails, state is inconsistent.

---

## Section 6: Test Coverage

### Current: ZERO automated tests

There are no test files in the codebase for any finance script. This is the biggest gap.

**Critical tests needed:**

```
NEW CODEPATHS → TEST NEEDED:
  Receipt metadata classifier (isLikelyReceipt) → Unit test (marketing vs receipt)
  Vendor name fuzzy matching (Dice coefficient) → Unit test (known vendor pairs)
  Amount extraction from PDF text → Unit test (sample PDFs)
  Date window matching → Unit test (edge cases: FX delay, weekend)
  Xero upload retry logic → Integration test (mock 500, verify retry)
  Pipeline orchestration → E2E test (capture→match→upload dry run)
  Entity transition → Integration test (sole trader → pty ltd data isolation)
```

**What would make me confident shipping at 2am Friday?**
- `node scripts/finance-engine.mjs --dry-run --self-test` that exercises every pipeline stage with sample data and reports pass/fail.

---

## Section 7: Performance

- **Xero rate limit** — 60 calls/min. With 278 vendor rules and potentially 500+ untagged transactions, tagging takes ~8 minutes. Acceptable.
- **Gmail metadata scan** — 453 emails in 90 days. Metadata-first reduces to ~50 full fetches. Fast.
- **Supabase queries** — All indexed. The `v_receipt_pipeline_funnel` view handles aggregation. Fine.
- **P99 concern:** Financial advisor agent queries 6 tables and calls LLM. If all queries + LLM take 30s, weekly cron job is fine. Dashboard API call would be too slow — needs caching.

---

## Section 8: Observability

### Current: Telegram notifications + dashboard pages

**Good:** Daily briefing, weekly advisor, exception alerts via Telegram.

**Missing:**
1. **Pipeline success rate metric** — "95% of receipts captured in last 7 days were matched within 24 hours"
2. **Financial data freshness** — "Xero sync last ran 2 hours ago" (sync_status table exists but dashboard doesn't show it prominently)
3. **Error aggregation** — No central place to see "3 Xero 500s in the last week on unreconciled transactions"
4. **Audit log** — `integration_events` table exists but nothing reads from it systematically

### Recommended: Finance Engine Health Check

```bash
node scripts/finance-engine.mjs health

Finance Engine Health Check — 2026-03-17
├── Xero sync: ✓ Last run 2h ago (319 transactions, 0 errors)
├── Receipt capture: ✓ Last run 4h ago (3 new, 7 marketing filtered)
├── Receipt matching: ✓ 107 receipts, 39 matched (36%), 0 failed
├── Receipt upload: ✓ 35 uploaded to Xero, 4 failed (Xero 500)
├── Project tagging: ✓ 293/293 Q3 transactions tagged (100%)
├── Subscriptions: ✓ 68 tracked, 2 flagged (Codeguide, Cursor AI)
├── BAS Q3 due: April 28 (41 days) — READY: 95% tagged, 60% receipted
├── R&D FY26: $468K eligible, $204K estimated refund, 28% receipted ← NEEDS ATTENTION
└── Cash runway: 8.2 months at current burn rate
```

---

## Section 9: Deployment & Rollout

### Current: Everything on `main`, no staging

**Risk:** Changes to financial scripts go live immediately via PM2 cron.

**Recommendation:** Not a full staging environment (overkill), but:
1. **`--dry-run` flag on every script** (most already have it)
2. **`finance-engine.mjs --self-test`** that runs all modules in dry-run mode
3. **Entity isolation** — Pty Ltd data in separate Xero org means no risk of corrupting sole trader data

### Rollout for Consolidation

```
Phase 1: Create lib/finance/ modules (no behavior change)
Phase 2: finance-engine.mjs calls modules instead of spawning scripts
Phase 3: Archive old scripts (move to archive/, don't delete)
Phase 4: Update PM2 config to use finance-engine.mjs
Phase 5: Consolidate dashboard to 3 views (keep old routes as redirects)
```

Each phase is independently deployable and reversible.

---

## Section 10: Long-Term Trajectory

### Technical Debt Introduced: LOW

This review proposes consolidation (reducing debt) not new features (adding debt). The main new capability is entity awareness, which is a 15-minute migration.

### Reversibility: 5/5

Everything proposed is reversible. Old scripts archived, not deleted. New modules extract from existing code. Database changes are additive columns with defaults.

### Path Dependency

The entity model (act_entities table) is a one-way door in the sense that it shapes how all future financial data is stored. But the alternative (no entity awareness) means rebuilding everything when Pty Ltd starts. Better to add the column now.

### 12-Month Vision

After this ships, the trajectory is:
1. **Q4 FY26 (Apr-Jun):** BAS prep automated, R&D evidence pack generated, Pty Ltd transition prepared
2. **Q1 FY27 (Jul-Sep):** Pty Ltd goes live, dual-entity Xero, new bank accounts
3. **Q2 FY27 (Oct-Dec):** Foundation (CLG) spun up, 3-entity financial management
4. **Q3 FY27 (Jan-Mar):** AI CFO is self-sustaining, accountant engagement drops to quarterly review

---

## Required Outputs

### NOT in Scope

| Item | Rationale |
|------|-----------|
| Invoice generation (ACCREC creation) | Client invoicing is manual/relationship-driven |
| Payroll automation | Wait for Pty Ltd + STP2 compliance requirements |
| Multi-currency treasury | AUD only for foreseeable future |
| External accountant portal (hosted) | Accountant uses Xero directly + PDF packs |
| Bank feed automation (NAB API) | NAB auto-feeds to Xero already |
| FBT tracking | Wait until Pty Ltd + employment contracts |
| Inventory management | Not relevant to ACT's business model |

### What Already Exists (Reuse Map)

| Sub-problem | Existing Solution | Reuse Strategy |
|-------------|------------------|----------------|
| Receipt capture | `capture-receipts.mjs` v2 | Extract core logic into `lib/finance/capture.mjs` |
| Receipt matching | `lib/receipt-matcher.mjs` + `receipt-ai-scorer.mjs` | Keep as-is, reference from classify module |
| Xero sync | `sync-xero-to-supabase.mjs` | Keep as standalone cron job |
| Project tagging | `tag-xero-transactions.mjs` | Extract tagging logic into `lib/finance/classify.mjs` |
| Unknown charge detection | Phase 1.5 in tag-xero-transactions | Keep in classify module |
| Subscription monitoring | `/finance/subscriptions` + 6 API routes | Keep as-is |
| Financial advisor | `financial-advisor-agent.mjs` | Extract into `lib/finance/report.mjs` |
| R&D activity log | `generate-rd-activity-log.mjs` | Extend for evidence pack, move to comply module |
| Pipeline orchestrator | `receipt-pipeline.mjs` | Replace with `finance-engine.mjs` |
| Reconciliation checklist | `generate-reconciliation-checklist.mjs` | Move into reconcile module |
| Calendar suggestions | `suggest-receipts-from-calendar.mjs` | Move into capture module |

### Dream State Delta

After implementing this plan:
- **Consolidated:** 32 scripts → 5 modules + 1 orchestrator + 5 standalone scripts
- **Entity-aware:** Ready for sole trader → Pty Ltd → dual entity
- **Tested:** Self-test mode for entire pipeline
- **Observable:** Single health check command
- **Dashboard:** 22 pages → 3 coherent views
- **Accountant:** PDF report pack instead of phone call
- **R&D:** Auto-generated evidence pack

**Gap to 12-month ideal:** Payroll integration, Foundation entity setup, bank account transition. These are external dependencies (ASIC registration, NAB setup) not code.

### Error & Rescue Registry

See Section 2 above. **2 CRITICAL GAPS** (StorageQuotaError, pdf-parse OOM). Both are <30 min fixes.

### Failure Modes Registry

```
CODEPATH              | FAILURE MODE          | RESCUED? | TEST? | USER SEES?  | LOGGED?
----------------------|-----------------------|----------|-------|-------------|--------
Gmail metadata fetch  | DNS failure           | PARTIAL  | NO    | Silent      | YES
Gmail full fetch      | Attachment too large   | NO ← GAP| NO    | Silent      | NO
Supabase Storage      | Quota exceeded         | NO ← GAP| NO    | Silent      | NO
pdf-parse extraction  | OOM on large PDF       | NO ← GAP| NO    | Script crash| NO
Xero upload           | 500 on unreconciled    | YES      | NO    | Logged      | YES
Xero upload           | Duplicate attachment   | YES      | NO    | Skipped     | YES
Xero tagging          | Category not found     | YES      | NO    | Skipped     | YES
AI scorer             | Malformed JSON         | PARTIAL  | NO    | Lower score | YES
Financial advisor     | LLM timeout            | YES      | NO    | No digest   | YES
Pipeline orchestrator | Mid-pipeline crash     | NO ← GAP| NO    | Partial data| NO
```

**CRITICAL GAPS:** 4 items with RESCUED=N, TEST=N, USER SEES=Silent

---

## Delight Opportunities

1. **Receipt photo via Telegram** — Snap a receipt, bot extracts data, matches to Xero. 30 min. Builds on existing 19-tool bot.
2. **"What did I spend on X?" natural language query** — Already possible via financial advisor; just needs Telegram command integration. 15 min.
3. **Weekly R&D confidence dashboard** — Traffic light per transaction showing R&D eligibility confidence. 45 min.
4. **Accountant PDF pack** — One-click download: reconciliation checklist + P&L + receipt coverage + R&D summary. 1 hour.
5. **Financial haiku** — Weekly Telegram: 3-line poetic summary of finances. On-brand with ACT personality. 10 min.

---

## Completion Summary

```
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | SCOPE EXPANSION                             |
| System Audit         | 70% already built, needs consolidation      |
| Step 0               | Reframe: "AI CFO" not "receipt automation"  |
| Section 1  (Arch)    | 1 major issue: script sprawl → 5 modules    |
| Section 2  (Errors)  | 12 error paths mapped, 4 GAPS               |
| Section 3  (Security)| 1 issue: .xero-tokens.json plaintext        |
| Section 4  (Data/UX) | 6 edge cases, 2 unhandled                   |
| Section 5  (Quality) | 4 DRY violations, 1 over-eng, 3 under-eng   |
| Section 6  (Tests)   | ZERO tests exist ← CRITICAL                 |
| Section 7  (Perf)    | 0 issues (cron-based, not latency-sensitive) |
| Section 8  (Observ)  | Health check command needed                  |
| Section 9  (Deploy)  | 5-phase rollout, all reversible              |
| Section 10 (Future)  | Reversibility: 5/5, debt items: 0           |
+--------------------------------------------------------------------+
| NOT in scope         | 7 items (payroll, multi-currency, etc.)      |
| What already exists  | 11 sub-problems mapped to existing code      |
| Dream state delta    | 32 scripts → 5 modules, entity-aware         |
| Error/rescue registry| 12 methods, 4 CRITICAL GAPS                 |
| Failure modes        | 10 total, 4 CRITICAL GAPS                   |
| TODOS.md updates     | TBD (per-item questions below)               |
| Delight opportunities| 5 identified                                |
| Diagrams produced    | 4 (system arch, data flow, module arch, dash)|
| Stale diagrams found | 4 plan files with outdated state             |
| Unresolved decisions | See questions below                          |
+====================================================================+
```
