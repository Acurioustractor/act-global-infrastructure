# BAS Preparation - Script Reference

Quick reference for automating BAS preparation tasks.

---

## Receipt Reconciliation

### Auto-match receipt emails to transactions
```bash
node scripts/receipt-reconciliation-agent.mjs
```
**What it does:** Matches entries in `receipt_emails` to `xero_transactions` based on vendor, amount, date.  
**Coverage:** Should recover ~30-40% of missing receipts if emails are already in DB.

### Upload receipts to Xero
```bash
node scripts/upload-receipts-to-xero.mjs
```
**What it does:** Takes matched receipt_emails and uploads attachments to Xero via API.  
**Prerequisites:** Receipts must be in `receipt_emails.attachment_url` and matched to transaction.

### Match Dext receipts to Xero
```bash
node scripts/match-dext-to-xero.mjs
```
**What it does:** Correlates Dext items with Xero transactions (if Dext is in use).  
**Note:** ACT is moving away from Dext to direct Xero pipeline.

---

## Project Tagging

### Auto-tag transactions by vendor
```bash
node scripts/tag-transactions-by-vendor.mjs
```
**What it does:** Applies project codes based on vendor patterns and rules.  
**Target:** Fix Q3's 58.7% tagging rate back to >95%.

### Tag FY26 transactions
```bash
node scripts/auto-tag-fy26-transactions.mjs
```
**What it does:** Batch-applies project codes for FY26 financial year.

---

## R&D Documentation

### Generate R&D activity log
```bash
node scripts/generate-rd-activity-log.mjs
```
**What it does:** Creates audit trail of R&D expenses with descriptions, project codes, dates.  
**Output:** Formatted for R&D tax claim submission.

### Analyze R&D project financials
```bash
node scripts/calculate-project-monthly-financials.mjs
```
**What it does:** Breaks down spend by project code (ACT-IN, ACT-HV, etc.) with monthly trends.

---

## Invoice Management

### Chase overdue invoices
```bash
node scripts/chase-overdue-invoices.mjs
```
**What it does:** Generates reminder emails for overdue receivables (>30 days).  
**Targets:** Rotary ($82.5k), Social Impact Hub ($10.8k), Aleisha J Keating ($4k).

### Query Xero invoices
```bash
node scripts/query-xero-invoices.mjs
```
**What it does:** Pulls detailed invoice data from Xero API with filters.

### Detailed receivables report
```bash
node scripts/xero-receivables-detailed.mjs
```
**What it does:** Aging analysis of outstanding invoices (0-30, 30-60, 60-90, 90+ days).

---

## Xero Sync & Health

### Sync Xero to Supabase
```bash
node scripts/sync-xero-to-supabase.mjs
```
**What it does:** Pulls latest transactions, invoices, contacts from Xero API into Supabase.  
**Frequency:** Run before any analysis to ensure fresh data.

### Sync bank feed
```bash
node scripts/sync-xero-bank-feed.mjs
```
**What it does:** Imports bank transactions from Xero bank feed.

### Audit receipt gaps
```bash
node scripts/audit-receipt-gaps.mjs
```
**What it does:** Identifies transactions missing receipts, prioritized by $ amount and GST impact.

---

## Analysis & Reporting

### Run BAS analysis (this report)
```bash
node scripts/xero-bas-analysis.mjs
```
**Output:** `/thoughts/shared/reports/xero-bas-analysis-YYYY-MM-DD.md`

### Finance daily briefing
```bash
node scripts/finance-daily-briefing.mjs
```
**What it does:** Daily snapshot of cash position, pending invoices, recent transactions.

### Financial variance notes
```bash
node scripts/generate-financial-variance-notes.mjs
```
**What it does:** Explains month-over-month spending changes.

---

## Workflow Recommendations

### Daily Routine
```bash
# Sync latest data from Xero
node scripts/sync-xero-to-supabase.mjs

# Get daily snapshot
node scripts/finance-daily-briefing.mjs
```

### Weekly Routine (Receipt Hygiene)
```bash
# Match new receipt emails
node scripts/receipt-reconciliation-agent.mjs

# Upload matched receipts to Xero
node scripts/upload-receipts-to-xero.mjs

# Check for new gaps
node scripts/audit-receipt-gaps.mjs
```

### Monthly Routine (BAS Prep)
```bash
# Sync latest Xero data
node scripts/sync-xero-to-supabase.mjs

# Auto-tag untagged transactions
node scripts/tag-transactions-by-vendor.mjs

# Run BAS analysis
node scripts/xero-bas-analysis.mjs

# Generate R&D activity log (if end of quarter)
node scripts/generate-rd-activity-log.mjs

# Chase overdue invoices
node scripts/chase-overdue-invoices.mjs
```

### Quarterly Routine (BAS Lodgement)
```bash
# Full sync
node scripts/sync-xero-to-supabase.mjs

# Reconcile all receipts
node scripts/receipt-reconciliation-agent.mjs
node scripts/upload-receipts-to-xero.mjs

# Tag everything
node scripts/auto-tag-fy26-transactions.mjs

# Final analysis
node scripts/xero-bas-analysis.mjs

# R&D documentation
node scripts/generate-rd-activity-log.mjs
node scripts/calculate-project-monthly-financials.mjs
```

---

## Priority Actions (Based on BAS Analysis)

### 1. Qantas Receipt Backfill (CRITICAL - $52k)
**Manual action required** - no automated script:
1. Log into Qantas Business portal
2. Download invoice PDFs for Oct 2025 - Mar 2026
3. Upload to Xero manually or via:
   ```bash
   node scripts/upload-receipts-to-xero.mjs --manual
   ```

### 2. Uber Receipt Export (HIGH - $8.6k)
**Manual action required**:
1. Log into Uber Business dashboard
2. Export trip history CSV (Oct 2025 - Mar 2026)
3. Match to transactions by date/amount
4. Import receipts via email forward or manual upload

### 3. Auto-match Existing Receipts (MEDIUM)
```bash
node scripts/receipt-reconciliation-agent.mjs
```
**Expected recovery:** 30-40% of missing receipts (~200-300 transactions)

### 4. Reconcile Overdue Payables (HIGH)
**Manual action required**:
- Check NAB statements for Virgin Australia payments (likely paid but not coded)
- Mark invoices as paid in Xero if confirmed
- Contact vendors if genuinely outstanding

### 5. Chase Overdue Receivables (HIGH)
```bash
node scripts/chase-overdue-invoices.mjs --min-days 200
```
**Follow-up manually:** Rotary ($82.5k), Social Impact Hub ($10.8k)

---

## Data Sources

All scripts query from:
- **xero_transactions** - bank transactions synced from Xero
- **xero_invoices** - AR/AP invoices
- **receipt_emails** - emails forwarded to receipts@act.place
- **receipt_matches** - correlations between emails and transactions

Last synced: Check `synced_at` column in each table or run:
```bash
node scripts/sync-xero-to-supabase.mjs --dry-run
```
