# ACT Finance Automation Strategy

## Overview

This document outlines ACT's finance automation stack, integrating receipt capture, AI-powered reconciliation, and exception handling into a cohesive system.

---

## The Four-Layer Finance Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ACT FINANCE AUTOMATION STACK                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LAYER 1: RECEIPT CAPTURE                                               │
│  ────────────────────────                                               │
│  Gmail (accounts@act.place)                                             │
│       ↓ (every 15 min)                                                  │
│  Apps Script (dext-auto-forward.js)                                     │
│       ↓ (30+ vendor patterns)                                           │
│  Dext (extracts vendor, amount, date)                                   │
│       ↓ (publish)                                                       │
│  Xero Bills (ACCPAY invoices with attachments)                          │
│                                                                          │
│  LAYER 2: BANK RECONCILIATION                                           │
│  ────────────────────────────                                           │
│  NAB Bank Feed → Xero                                                   │
│       ↓                                                                  │
│  Xero JAX AI (beta - awaiting access)                                   │
│  • Rule: Applies bank rules automatically                               │
│  • Match: Finds existing bills from Dext                                │
│  • Memory: Learns from your past reconciliations                        │
│  • Prediction: Uses patterns from all Xero users                        │
│       ↓                                                                  │
│  Target: 80%+ auto-reconciled                                           │
│                                                                          │
│  LAYER 3: EXCEPTION HANDLING                                            │
│  ───────────────────────────                                            │
│  ACT Receipt Reconciliation Agent                                       │
│  • Detects missing receipts                                             │
│  • Searches email for matches                                           │
│  • AI confidence scoring                                                │
│  • Gamification for manual review                                       │
│  • Weekly Discord notifications                                         │
│       ↓                                                                  │
│  Handles remaining 20% of transactions                                  │
│                                                                          │
│  LAYER 4: MONITORING & DASHBOARDS                                       │
│  ────────────────────────────────                                       │
│  Intelligence Platform Finance Tab                                      │
│  • Summary: Overall reconciliation health                               │
│  • Bills: Dext → Xero pipeline status                                  │
│  • Bank: Unreconciled NAB transactions                                  │
│  • Grants: Grant tracking and acquittals                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Two Parallel Streams

| Stream | Source | Destination | Status Field |
|--------|--------|-------------|--------------|
| **Receipts** | Email → Dext | xero_invoices (ACCPAY) | DRAFT → AUTHORISED → PAID |
| **Bank** | NAB Feed | xero_transactions | AUTHORISED → DELETED (reconciled) |

### Reconciliation = Matching Streams

```
Receipt Stream:  Email → Dext → Bill Created → Bill Approved
                                                    ↓
                                              [MATCH IN XERO]
                                                    ↑
Bank Stream:     NAB → Bank Feed → Transaction Imported
```

**Full reconciliation** = Receipt attached + Bill created + Matched to bank transaction

---

## Components

### 1. Dext Auto-Forward (apps-scripts/dext-auto-forward.js)

**Purpose:** Automatically forward receipt emails to Dext

**Runs:** Every 15 minutes via Google Apps Script trigger

**Vendors Covered:**
- Billing-only (always forward): Webflow, Notion, OpenAI, Anthropic, HighLevel, Xero, Descript, Vercel, Supabase, Bitwarden, Stripe, Zapier, Cursor, Railway, Google Cloud
- Mixed (forward if receipt/invoice in subject): Adobe, GitHub, Dialpad, Apple, Amazon, Firecrawl

### 2. Xero Sync (scripts/sync-xero-to-supabase.mjs)

**Purpose:** Sync Xero data to Supabase for dashboard visibility

**Tables Updated:**
- `xero_invoices` - Bills and invoices
- `xero_transactions` - Bank feed items
- `xero_contacts` - Vendor contacts

**Schedule:** Daily at 6am AEST via GitHub Actions

### 3. Xero JAX (Xero Native - Beta)

**Purpose:** AI-powered automatic bank reconciliation

**Status:** Awaiting beta access

**Methods:**
| Method | How It Works |
|--------|--------------|
| Rule | Applies your bank rules |
| Match | Finds existing bills/invoices |
| Memory | Learns from your past 5,000 reconciliations |
| Prediction | Uses patterns from all Xero users |

**Preparation:**
- [x] Set up bank rules for recurring vendors
- [x] Clean up contacts
- [ ] Build reconciliation history (manual reconciliation)
- [ ] Ensure Dext bills arrive before bank items

### 4. Receipt Reconciliation Agent (scripts/receipt-reconciliation-agent.mjs)

**Purpose:** Handle exceptions JAX can't reconcile

**Features:**
- Missing receipt detection
- Email search with confidence scoring
- Gamification (points, streaks, achievements)
- Weekly Discord summaries

**Commands:**
```bash
node scripts/receipt-reconciliation-agent.mjs scan           # Find missing
node scripts/receipt-reconciliation-agent.mjs pending        # Show pending
node scripts/receipt-reconciliation-agent.mjs resolve <id>   # Mark resolved
node scripts/receipt-reconciliation-agent.mjs stats          # Gamification
```

### 5. Finance Dashboard (Intelligence Platform)

**Location:** http://localhost:3999 → Finance Tab

**Views:**
- **Summary:** Overall stats, bank reconciliation health
- **Receipts:** Bills needing attention (missing receipts, draft status)
- **Bank:** Unreconciled bank transactions
- **Grants:** Grant tracking and acquittals

---

## Bank Rules Setup

For recurring vendors, create Xero bank rules:

| Vendor | Condition | Account | Tax Rate |
|--------|-----------|---------|----------|
| Supabase | Any text contains "Supabase" | Software Subscriptions | BAS Excluded |
| Vercel | Any text contains "Vercel" | Software Subscriptions | BAS Excluded |
| Zapier | Any text contains "Zapier" | Software Subscriptions | BAS Excluded |
| Railway | Any text contains "Railway" | Software Subscriptions | BAS Excluded |
| OpenAI | Any text contains "OpenAI" | Software Subscriptions | BAS Excluded |
| Qantas | Any text contains "Qantas" | Travel | GST on Expenses |
| Uber | Any text contains "Uber" | Travel | GST on Expenses |
| NAB Fee | Any text contains "NAB Fee" | Bank Fees | BAS Excluded |

**Tax Rate Guide:**
- Australian vendors (Qantas, Telstra) → GST on Expenses
- Overseas vendors (Vercel, Supabase, OpenAI) → BAS Excluded

---

## Weekly Workflow

### Monday Morning Review (Post-JAX)

1. **Check JAX Reconciled page** - Review auto-reconciled transactions
2. **Correct any mistakes** - JAX learns from corrections
3. **Run receipt scan** - `node scripts/receipt-reconciliation-agent.mjs scan`
4. **Review exceptions** - Handle the 20% JAX couldn't reconcile
5. **Check Discord summary** - Review weekly stats and pending items

### Ongoing

- Dext auto-forward runs every 15 minutes
- Xero sync runs daily at 6am
- JAX runs continuously on new bank items
- Dashboard available anytime at localhost:3999

---

## Metrics & Goals

| Metric | Current | Target |
|--------|---------|--------|
| Auto-reconciled (JAX) | 0% (awaiting access) | 80%+ |
| Manual reconciliation | 100% | 20% |
| Missing receipts | ~45 | <10 |
| Average resolution time | Unknown | <7 days |
| Weekly review time | Hours | 30 minutes |

---

## Future Enhancements

1. **JAX Integration** - Enable when beta access granted
2. **Project Tagging** - Auto-tag expenses to project codes
3. **Budget Alerts** - Notify when category spending exceeds threshold
4. **Vendor Analytics** - Track spending trends by vendor
5. **Receipt OCR** - Extract data from receipt images for matching

---

## Related Files

| File | Purpose |
|------|---------|
| `apps-scripts/dext-auto-forward.js` | Gmail → Dext forwarding |
| `scripts/sync-xero-to-supabase.mjs` | Xero → Supabase sync |
| `scripts/receipt-reconciliation-agent.mjs` | Exception handling agent |
| `FinanceTab.tsx` | Dashboard UI |
| `.github/workflows/sync-xero.yml` | Daily sync automation |
