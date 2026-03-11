# Finance Flow Dashboard + Agentic Bookkeeper

**Created:** 2026-03-11
**Status:** Draft — awaiting approval
**Goal:** End-to-end visibility of money flow (card → Dext → Xero → reconciliation) with agentic automation to find missing receipts, tag transactions, and send daily/weekly finance action items.

---

## The Problem

The money flow is broken and invisible:
- **383 receipts** in Dext (from export), covering ~181 vendors
- **2,241 SPEND/ACCPAY** transactions in Xero — only **132 (6%)** have receipts
- **34 emails** auto-forwarded to Dext (ran once, Mar 3) — barely scratching the surface
- **357 vendor rules** in DB but Dext has **0 configured** supplier rules
- Pipeline tracking only covers Dec 2025–Mar 2026 (~333 items)
- No visibility into WHERE things get stuck or WHAT's missing
- No agent telling you what to do each day/week

## The Vision

A single `/finance/flow` dashboard showing the complete journey:

```
💳 Card Spend → 📧 Receipt Found? → 📥 Dext Processed → 📊 Xero Matched → 🏷️ Tagged → ✅ Reconciled
     2,810         34 forwarded        383 in Dext         143 attached       ~60%        ~95%
```

Plus an **agentic bookkeeper** that:
1. Finds missing receipts from email automatically
2. Matches Dext receipts to Xero transactions
3. Identifies gaps in vendor rules (Dext + our tagger)
4. Sends daily/weekly Telegram + Notion messages: "Here's what needs attention"
5. Advises on R&D eligibility, tax optimization, cost reduction

---

## Data Sources (What We Have)

| Source | Table/Location | Records | Notes |
|--------|---------------|---------|-------|
| Xero transactions | `xero_transactions` | 2,810 | has `contact_name`, `total`, `has_attachments`, `project_code`, `is_reconciled` |
| Xero invoices | `xero_invoices` | many | ACCREC (receivables) + ACCPAY (payables) |
| Dext export | `/Downloads/nicholas-marchesi-...` | 383 files | PDFs/images, vendor name + date in filename |
| Dext forwarded | `dext_forwarded_emails` | 34 | What we auto-forwarded from Gmail |
| Receipt pipeline | `receipt_pipeline_status` | 333 | Stages: missing_receipt, dext_processed, reconciled |
| Vendor rules | `vendor_project_rules` | 357 | Auto-tagging rules |
| Dext supplier setup | `dext_supplier_setup_status` | 0 | Empty — no suppliers configured in Dext |
| Gmail | Gmail API | 4 mailboxes | Receipt emails exist but mostly not forwarded |
| Subscriptions | `subscriptions` | ~30 active | Known recurring spend |

### Key Alignment Gaps

1. **Dext has 181 vendors**, our rules have 357, but only ~27 overlap in a spot check of 33 common vendors (6 had NO rule)
2. **Missing from rules:** AAMI, AIG Insurance, Airbnb, Celebrants Australia (different name), Google Australia, Domino's
3. **Dext export has no structured data** — just filenames. Need to parse `Vendor - Date - ID.ext` pattern
4. **20 "Unknown Supplier"** receipts in Dext = unmatched/unnamed
5. **Forward script** only ran once, only matched 6 vendors — needs to run on cron and cover more patterns

---

## Architecture

### Phase 1: Dext Import + Flow Dashboard (BUILD THIS)

**New page:** `/finance/flow` — the master view

#### Flow Stages (columns/swimlanes):

1. **Card Spend** — All SPEND/ACCPAY from Xero without receipts
   - Source: `xero_transactions WHERE type IN ('SPEND','ACCPAY') AND has_attachments = false`
   - Show: vendor, amount, date, days old, project code

2. **Receipt Found** — We found a matching email/receipt
   - Source: `dext_forwarded_emails` + Gmail search results
   - Show: email subject, matched vendor, confidence score

3. **In Dext** — Receipt exists in Dext (from export or forwarding)
   - Source: Parsed Dext export filenames → new `dext_receipts` table
   - Show: vendor, date, file type, Dext ID

4. **Xero Matched** — Dext published to Xero (`has_attachments = true`)
   - Source: `xero_transactions WHERE has_attachments = true`
   - Show: vendor, amount, match confidence

5. **Tagged** — Has project code assigned
   - Source: `xero_transactions WHERE project_code IS NOT NULL`

6. **Reconciled** — Fully done
   - Source: `xero_transactions WHERE is_reconciled = true`

#### Summary KPIs at top:
- Total spend transactions / % at each stage
- $ value missing receipts
- Days since last Dext forward
- Vendor rule coverage %
- This week's action count

#### Migration: Import Dext export

```sql
CREATE TABLE IF NOT EXISTS dext_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT,
  receipt_date DATE,
  dext_id TEXT,  -- the numeric ID from filename
  file_type TEXT,  -- pdf, jpg
  filename TEXT NOT NULL UNIQUE,
  xero_transaction_id TEXT,  -- linked after matching
  match_confidence INT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);
```

Script: Parse 383 filenames from export, insert into `dext_receipts`, then fuzzy-match against `xero_transactions` by vendor + date + amount.

### Phase 2: Agentic Receipt Finder

**Enhance `forward-receipts-to-dext.mjs`:**
- Run on PM2 cron (every 6 hours, already configured but barely working)
- Expand vendor patterns from 32 → 181+ (use Dext export vendor list)
- Add Gmail search by amount (subject line parsing)
- Add calendar context for travel expenses
- Log all matches to `receipt_pipeline_status`

**New: Smart matching script** (`scripts/match-dext-to-xero.mjs`):
- For each `dext_receipts` entry without `xero_transaction_id`
- Search xero_transactions by: vendor name fuzzy match + date within 7 days + amount within 10%
- Score matches and store best match
- Surface unmatched for manual review

### Phase 3: Finance Agent (Telegram + Notion)

**New agent tool: `finance_health_check`**

Daily message (Telegram + Notion):
```
📊 Finance Daily — Tue 11 Mar

🔴 URGENT:
- 3 overdue invoices ($4,200 total) — chase today
- 15 receipts missing for Jan spend (BAS Q3 due Apr 28)

🟡 THIS WEEK:
- 42 untagged transactions ($8,300) — run tagger
- Dext: 25 processed but not matched to Xero
- 6 vendor rules missing (AAMI, Airbnb, AIG, Google AU, Dominos, Celebrants)

🟢 GOOD NEWS:
- R&D spend: $34K (above $20K threshold, 43.5% offset = $14.8K)
- Subscription cleanup saved $178/mo ($2,136/yr)
- Tag coverage: 62% → 71% this week

💡 OPTIMIZE:
- 3 subscriptions in "AI/ML" category — consolidate? (Anthropic, OpenAI, Cognition)
- Travel costs up 40% this quarter — set policy?
- ATO lodgement dates: BAS Q3 due Apr 28, FBT due Jun 21
```

Weekly message: deeper analysis with month-over-month trends, project-level P&L, R&D tracking progress.

### Phase 4: Vendor Rule Alignment

**Script: `scripts/align-dext-xero-vendors.mjs`**
- Cross-reference Dext vendor names ↔ Xero contact names ↔ vendor_project_rules
- Surface gaps in all three
- Auto-generate missing vendor rules where mapping is obvious
- Output a "Dext supplier setup checklist" for manual Dext configuration

---

## Implementation Order

### Phase 1A: Dext Import + Data Foundation (DO FIRST)
1. Create `dext_receipts` table
2. Parse Dext export filenames → populate table (383 records)
3. Match `dext_receipts` ↔ `xero_transactions` by vendor+date
4. Build `/finance/flow` page with stage columns + KPIs
5. Build `/api/finance/flow` API route

### Phase 1B: Enhance Receipt Pipeline
6. Update `receipt_pipeline_status` to reflect all stages
7. Backfill pipeline from existing data (Xero + Dext import)

### Phase 2: Agentic Receipt Finder
8. Expand forward script vendor patterns (32 → 180+)
9. Build `match-dext-to-xero.mjs` fuzzy matcher
10. Wire into PM2 cron

### Phase 3: Finance Agent
11. Add `finance_daily_briefing` agent tool
12. Wire to Telegram daily cron (8am AEST)
13. Wire to Notion daily briefing agent
14. Add weekly deep analysis

### Phase 4: Vendor Alignment
15. Build `align-dext-xero-vendors.mjs` cross-reference script
16. Auto-generate missing vendor rules
17. Update Dext setup checklist page with cross-reference data

---

## Files to Create/Modify

**New files:**
- `supabase/migrations/20260311_dext_receipts.sql` — dext_receipts table
- `scripts/import-dext-export.mjs` — parse Dext export filenames
- `scripts/match-dext-to-xero.mjs` — fuzzy match Dext ↔ Xero
- `scripts/align-dext-xero-vendors.mjs` — vendor cross-reference
- `apps/command-center/src/app/api/finance/flow/route.ts` — flow API
- `apps/command-center/src/app/finance/flow/page.tsx` — flow dashboard

**Modify:**
- `scripts/forward-receipts-to-dext.mjs` — expand vendor patterns
- `apps/command-center/src/lib/telegram/agent-tools.ts` — add finance_daily_briefing tool
- `ecosystem.config.cjs` — add/update cron entries

---

## Success Criteria

1. `/finance/flow` shows every transaction's journey through all 6 stages
2. Can see at a glance: "X transactions stuck at stage Y, worth $Z"
3. Daily Telegram message tells Ben/Nick exactly what finance tasks to do
4. Receipt coverage goes from 6% → 40%+ within 2 weeks (via auto-forwarding + Dext import)
5. Vendor rule coverage reaches 90%+ of spend by value
6. R&D spend tracked automatically, projected offset visible
