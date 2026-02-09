# ACT Finance Automation System

## Overview

This document describes the complete finance automation system that connects:
- **Dext** (receipt scanning)
- **Xero** (accounting)
- **GoHighLevel** (CRM - grants/opportunities)
- **Supabase** (data hub)
- **Our Scripts** (receipt reconciliation agent)

## The Complete Flow

```
+==================================================================================+
|                        ACT FINANCE AUTOMATION FLOW                                |
+==================================================================================+

  CAPTURE                    PROCESSING                    RECONCILIATION
  ───────                    ──────────                    ──────────────

  ┌─────────────┐           ┌─────────────┐              ┌─────────────┐
  │ DEXT APP    │           │ DEXT        │              │ XERO        │
  │             │           │ PROCESSING  │              │             │
  │ • Scan      │ ────────► │ • OCR       │ ──────────► │ • Bill      │
  │ • Email fwd │           │ • Categorize│  Auto-pub   │   created   │
  │ • Upload    │           │ • Tag proj  │              │ • Attach ✓  │
  └─────────────┘           └─────────────┘              └──────┬──────┘
                                                                │
  ┌─────────────┐                                              │
  │ BANK FEED   │                                              │
  │ (NAB)       │ ─────────────────────────────────────────────┤
  │ • Auto-sync │                                              │
  │ • Daily     │                                              ▼
  └─────────────┘                                       ┌─────────────┐
                                                        │ XERO JAX    │
                                                        │ RECONCILE   │
                                                        │             │
                                                        │ Match txn   │
                                                        │ to bill     │
                                                        │ AUTO ✓      │
                                                        └──────┬──────┘
                                                               │
  ┌─────────────┐           ┌─────────────┐              ┌─────┴───────┐
  │ GHL         │           │ SUPABASE    │              │ OUR SYSTEM  │
  │ GRANTS      │ ────────► │ DATA HUB   │ ◄─────────── │ WEEKLY      │
  │ PIPELINE    │           │             │              │ CATCH-UP    │
  │             │           │ • xero_*    │              │             │
  │ Track:      │           │ • ghl_*     │              │ • Flag gaps │
  │ • Applied   │           │ • receipt_* │              │ • Gamify    │
  │ • Approved  │           │ • projects  │              │ • Notify    │
  │ • Received  │           └─────────────┘              └─────────────┘
  └─────────────┘

+==================================================================================+
```

---

## Part 1: Project Codes (Unified Tagging)

### The ACT Project Code System

All projects use a consistent code format: `ACT-XX`

| Code | Project | Dext Category | Xero Tracking | GHL Tags |
|------|---------|---------------|---------------|----------|
| ACT-JH | JusticeHub | Justice Projects | JusticeHub | justicehub |
| ACT-DG | Diagrama | Justice Projects | Diagrama | diagrama |
| ACT-GD | Goods | Social Enterprise | Goods | goods |
| ACT-EL | Empathy Ledger | Technology | Empathy Ledger | empathy-ledger |
| ACT-PI | PICC | Indigenous Projects | PICC | picc |
| ACT-PS | Photo Studio | Indigenous Projects | PICC | photo-studio |
| ACT-SS | Storm Stories | Indigenous Projects | PICC | storm-stories |
| ACT-ER | Elders Room | Indigenous Projects | PICC | elders-room |
| ACT-HV | The Harvest | Technology | The Harvest | harvest |
| ACT-IN | ACT Infrastructure | Operations | Operations | infrastructure |

### How to Tag in Each System

**Dext:**
1. Supplier Rules → Set "Category" (e.g., "Justice Projects")
2. Or use Tracking Categories if enabled

**Xero:**
1. Tracking Categories → Set on bill/transaction
2. Reference field → Add project code (e.g., "ACT-JH")

**GHL:**
1. Contact Tags → Add project tag (e.g., "justicehub")
2. Opportunity → Custom field "Project Code"

---

## Part 2: Dext Setup (Auto-Publish)

### Enable Auto-Publish for Trusted Suppliers

**Path:** Business Settings → Connections → Manage (Xero) → Auto-publish

**Suppliers to Auto-Publish:**

| Supplier | Category | Auto-Publish | Notes |
|----------|----------|--------------|-------|
| Adobe | Technology | YES | Consistent amount |
| OpenAI | Technology | YES | Consistent amount |
| Claude/Anthropic | Technology | YES | Consistent amount |
| Notion | Technology | YES | Consistent amount |
| Xero | Technology | YES | Consistent amount |
| Webflow | Technology | YES | Consistent amount |
| Vercel | Technology | YES | Consistent amount |
| Supabase | Technology | YES | Consistent amount |
| Descript | Technology | YES | Consistent amount |
| HighLevel | Technology | YES | Consistent amount |
| Uber | Travel | MANUAL | Variable amounts |
| Qantas | Travel | MANUAL | Large amounts |
| Hotels | Travel | MANUAL | Review needed |

### Supplier Rules Setup

For each auto-publish supplier, set:
1. **Default Category** (expense account)
2. **Default Tax Rate** (GST/No GST)
3. **Default Tracking** (project code)

**Example:**
```
Supplier: Notion Labs
Category: Software & Subscriptions
Tax: GST on Expenses
Tracking: ACT-IN (Infrastructure)
Auto-publish: YES
```

---

## Part 3: Xero Setup (Auto-Reconciliation)

### Option A: Xero JAX (Recommended)

**Enable:**
1. Go to Xero → Bank Accounts → Select account
2. Look for "Automation" toggle
3. Turn ON
4. JAX learns from your patterns

**What JAX Does:**
- Matches bank transactions to Dext bills
- Uses: Rules, Memory, Prediction
- Shows confidence level
- You can review/undo

### Option B: Bank Rules

**Create rules for recurring transactions:**

| Rule Name | Contains | Account | Tax | Tracking |
|-----------|----------|---------|-----|----------|
| Notion Subscription | NOTION | 6350 - Software | GST | ACT-IN |
| Adobe CC | ADOBE | 6350 - Software | GST | ACT-IN |
| OpenAI | OPENAI | 6350 - Software | GST | ACT-IN |
| Uber | UBER | 6410 - Travel | GST | [Ask] |
| Qantas | QANTAS | 6400 - Airfare | GST | [Ask] |

**Path:** Settings → Bank Account → Bank Rules → New Rule

---

## Part 4: GHL Grants Pipeline

### Current Grants in Pipeline

| Grant | Value | Status | Project |
|-------|-------|--------|---------|
| First Nations Project Fund | $50,000 | Open | ACT-PI |
| Qld Gives - Dec 25 | $30,000 | Open | ACT-JH |
| Arts Business: First Nations | TBD | Open | ACT-PI |
| Arts Projects for Organisations | TBD | Open | TBD |

### Recommended Pipeline Stages

```
GRANTS PIPELINE
├── 1. Research        (identifying opportunities)
├── 2. Preparing       (writing application)
├── 3. Submitted       (waiting for response)
├── 4. Shortlisted     (additional info requested)
├── 5. Approved        (grant awarded!)
├── 6. Received        (funds in bank) ← LINK TO XERO
├── 7. Acquitted       (reporting done)
└── X. Unsuccessful    (rejected)
```

### Linking Grants to Finance

When grant moves to "Received":
1. Create Invoice in Xero (income)
2. Tag with project code
3. Track in receipt_matches for reconciliation

---

## Part 5: Automation Scripts

### Daily Sync (Cron: 6am AEST)
```bash
# Sync Xero data to Supabase
node scripts/sync-xero-to-supabase.mjs full
```

### Weekly Review (Monday 9am AEST)
```bash
# Receipt reconciliation
node scripts/receipt-reconciliation-agent.mjs scan
node scripts/receipt-reconciliation-agent.mjs weekly-summary
```

### On-Demand Commands
```bash
# Check pending receipts
node scripts/receipt-reconciliation-agent.mjs pending

# Resolve a receipt (earn points!)
node scripts/receipt-reconciliation-agent.mjs resolve <id>

# Check your stats
node scripts/receipt-reconciliation-agent.mjs stats

# Search by project code
node scripts/unified-search.mjs --project ACT-JH
```

---

## Part 6: Unified Search

### Search Across All Systems

Query syntax:
```bash
# By project code
node scripts/unified-search.mjs --project ACT-JH

# By vendor
node scripts/unified-search.mjs --vendor "Qantas"

# By date range
node scripts/unified-search.mjs --from 2025-11-01 --to 2025-12-31

# By amount
node scripts/unified-search.mjs --min 1000 --max 5000

# Combined
node scripts/unified-search.mjs --project ACT-PI --vendor "Qantas" --min 500
```

### Data Sources Searched

1. **xero_transactions** - Bank feed transactions
2. **xero_invoices** - Bills and invoices (from Dext)
3. **receipt_matches** - Pending receipts
4. **ghl_opportunities** - Grants and funding
5. **ghl_contacts** - Related contacts

---

## Part 7: Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Double entry | Overstated expenses | Always reconcile in Xero |
| Missing receipt | ATO audit | Our system flags these |
| Wrong project code | Bad reporting | Supplier rules in Dext |
| Grant not tracked | Missed income | GHL → Xero link |
| Dext not published | Receipts stuck | Auto-publish for trusted |
| JAX wrong match | Bad reconciliation | Review weekly |

---

## Part 8: Setup Checklist

### Dext Setup
- [ ] Enable auto-publish for software/subscription suppliers
- [ ] Create supplier rules for default categories
- [ ] Set tracking categories for projects
- [ ] Test with one receipt

### Xero Setup
- [ ] Check if JAX automation available
- [ ] Enable JAX for main bank account
- [ ] Create bank rules for recurring transactions
- [ ] Verify tracking categories match project codes

### GHL Setup
- [ ] Add stages to Grants pipeline
- [ ] Add "Project Code" custom field
- [ ] Tag existing grants with project codes
- [ ] Create workflow: Grant Received → notify finance

### Our System
- [ ] Run initial scan: `receipt-reconciliation-agent scan`
- [ ] Review pending receipts
- [ ] Set up Discord webhook for notifications
- [ ] Test weekly summary

---

## Maintenance

### Weekly (Monday)
1. Check Discord for receipt summary
2. Review any flagged items
3. Update GHL grant statuses
4. Resolve pending receipts (earn points!)

### Monthly
1. Review auto-publish accuracy
2. Check bank rule effectiveness
3. Update supplier rules if needed
4. Reconcile GHL grants with Xero

### Quarterly
1. Update project codes if new projects
2. Review JAX accuracy
3. Export financial reports by project
4. Grant acquittal check

---

## Quick Reference

### Key URLs
- Dext: https://prepare.dext.com
- Xero: https://go.xero.com
- GHL: https://app.gohighlevel.com
- Supabase: https://supabase.com/dashboard

### Key Scripts
```bash
# Sync everything
node scripts/sync-xero-to-supabase.mjs full

# Receipt agent
node scripts/receipt-reconciliation-agent.mjs [command]

# Unified search
node scripts/unified-search.mjs [options]
```

### Support
- Receipt issues: Check Dext inbox first
- Bank feed issues: Xero → Bank Feeds
- Project tagging: Update config/project-codes.json
