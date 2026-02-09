# Subscription Automation Guide

Complete guide to automating subscription receipt processing from Gmail → Dext → Xero.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              SUBSCRIPTION RECEIPT AUTOMATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  accounts@act.place                                              │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────┐                                            │
│  │  Gmail Filter   │  from:(*@notion.so OR *@webflow.com ...)   │
│  │  Auto-forward   │──────────────────────────────────────────▶ │
│  └─────────────────┘                                            │
│                                                                  │
│  receipts@dext.cc                                                │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────┐                                            │
│  │  Dext Prepare   │  Supplier rule matches → Auto-categorize   │
│  │  Auto-publish   │──────────────────────────────────────────▶ │
│  └─────────────────┘                                            │
│                                                                  │
│  Xero                                                            │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────┐                                            │
│  │  Bank Rules     │  Pattern match → Auto-reconcile            │
│  │  + JAX AI       │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Centralize Subscription Accounts

### Target: accounts@act.place

Move all subscription billing emails to a central account for consistent processing.

### Migration Checklist

| Vendor | Current Email | Action | Status |
|--------|---------------|--------|--------|
| Webflow | ? | Change billing email in account settings | ⏳ |
| Notion | ? | Settings → Workspace → Billing | ⏳ |
| OpenAI | ? | Settings → Billing → Email | ⏳ |
| Anthropic | ? | Console → Settings → Billing | ⏳ |
| Adobe | ? | Account → Manage Plan → Billing | ⏳ |
| Descript | ? | Settings → Billing | ⏳ |
| Xero | ? | Settings → Billing | ⏳ |
| Vercel | ? | Team Settings → Billing | ⏳ |
| Supabase | ? | Organization → Billing | ⏳ |
| GitHub | ? | Settings → Billing | ⏳ |
| HighLevel | ? | Settings → Billing | ⏳ |

### Webflow Specific (8 Sites)

Webflow has **8 separate site subscriptions** that need consolidation:

1. Log into each Webflow workspace
2. Go to **Account Settings → Billing**
3. Update billing email to `accounts@act.place`
4. Consider consolidating to a single Workspace plan if possible

---

## Step 2: Gmail Filter Setup

### Create Filter in accounts@act.place

1. Open Gmail → Settings → Filters and Blocked Addresses
2. Click "Create a new filter"
3. In the **From** field, paste:

```
billing@webflow.com OR team-billing@makenotion.com OR receipts@openai.com OR billing@anthropic.com OR adobeid@adobe.com OR billing@descript.com OR billing@xero.com OR billing@vercel.com OR billing@supabase.io OR noreply@github.com OR billing@gohighlevel.com OR digital-no-reply@amazon.com OR no_reply@email.apple.com OR google-cloud-billing@google.com
```

4. Click "Create filter"
5. Select:
   - ✅ Skip the Inbox (Archive it)
   - ✅ Apply label: "receipts/auto-forwarded"
   - ✅ Forward it to: `receipts@dext.cc`
6. Click "Create filter"

### Alternative: Individual Filters

If the combined filter is too long, create separate filters:

```
# AI Tools
from:(receipts@openai.com OR billing@anthropic.com)

# Design & Creative
from:(adobeid@adobe.com OR billing@descript.com)

# Development
from:(billing@vercel.com OR billing@supabase.io OR noreply@github.com)

# Productivity
from:(team-billing@makenotion.com OR google-cloud-billing@google.com)

# Hosting
from:(billing@webflow.com)

# CRM
from:(billing@gohighlevel.com)

# Accounting
from:(billing@xero.com)
```

---

## Step 3: Dext Supplier Rules

### Access Dext Supplier Rules

1. Log into https://prepare.dext.com
2. Go to **Business Settings → Supplier Rules**
3. Click **Add Rule** for each subscription

### Subscription Vendor Rules (Auto-Publish: YES)

| Vendor | Category | Tax | Tracking | Auto-Publish |
|--------|----------|-----|----------|--------------|
| Notion Labs | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| OpenAI | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Anthropic | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Webflow | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Xero | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Descript | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Adobe | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Vercel | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Supabase | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| GitHub | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| HighLevel | Software & Subscriptions | GST | ACT-IN | ✅ YES |
| Google | Software & Subscriptions | GST | ACT-IN | ✅ YES |

### Media/Personal (Auto-Publish: NO - Review First)

| Vendor | Category | Tax | Tracking | Auto-Publish |
|--------|----------|-----|----------|--------------|
| Audible | Software & Subscriptions | GST | ACT-IN | ❌ NO |
| Apple | Software & Subscriptions | GST | ACT-IN | ❌ NO |
| Amazon Prime | Software & Subscriptions | GST | ACT-IN | ❌ NO |

---

## Step 4: Xero Bank Rules

### Access Bank Rules

1. Log into https://go.xero.com
2. Go to **Settings → Bank Account → Bank Rules**
3. Click **New Rule** for each subscription

### Subscription Rules (Auto-Reconcile)

| Rule Name | Contains | Account | Tax | Tracking |
|-----------|----------|---------|-----|----------|
| Notion Subscription | NOTION | 6350 - Software | GST | ACT-IN |
| OpenAI Subscription | OPENAI | 6350 - Software | GST | ACT-IN |
| Anthropic Subscription | ANTHROPIC | 6350 - Software | GST | ACT-IN |
| Webflow Subscription | WEBFLOW | 6350 - Software | GST | ACT-IN |
| Xero Subscription | XERO | 6350 - Software | GST | ACT-IN |
| Descript Subscription | DESCRIPT | 6350 - Software | GST | ACT-IN |
| Adobe Subscription | ADOBE | 6350 - Software | GST | ACT-IN |
| Vercel Subscription | VERCEL | 6350 - Software | GST | ACT-IN |
| Supabase Subscription | SUPABASE | 6350 - Software | GST | ACT-IN |
| GitHub Subscription | GITHUB | 6350 - Software | GST | ACT-IN |
| HighLevel Subscription | HIGHLEVEL | 6350 - Software | GST | ACT-IN |
| Google Workspace | GOOGLE | 6350 - Software | GST | ACT-IN |

### Enable JAX AI

1. Go to **Bank Accounts → Select account**
2. Find **Automation** or **JAX** toggle
3. Turn **ON** automation
4. JAX learns from manual reconciliations over time

---

## Step 5: Verify Setup

### Test the Flow

1. **Trigger a receipt**: Make a small purchase or wait for next billing cycle
2. **Check Gmail**: Verify email arrives and is auto-forwarded
3. **Check Dext**: Verify receipt appears in inbox, then auto-publishes
4. **Check Xero**: Verify bill appears, then auto-reconciles with bank

### Validation Script

```bash
# Check subscription automation status
node scripts/validate-supplier-rules.mjs summary

# View subscriptions dashboard
open http://localhost:3999/?tab=subscriptions
```

---

## Troubleshooting

### Receipt not appearing in Dext

1. Check Gmail filter is active
2. Verify Dext inbox email is correct: `receipts@dext.cc`
3. Check spam folder in both Gmail and Dext

### Receipt not auto-publishing

1. Verify supplier rule exists in Dext
2. Check "Auto-publish" is enabled for that vendor
3. Ensure category and tracking are set correctly

### Transaction not auto-reconciling

1. Verify bank rule exists in Xero
2. Check "Contains" pattern matches bank statement text exactly
3. Ensure amounts match (receipt vs bank statement)

---

## Subscription Review Cadence

### Monthly
- Review subscriptions dashboard for any new untracked vendors
- Check for usage-based subscriptions exceeding budget

### Quarterly
- Audit all subscriptions for necessity
- Review "Optional" subscriptions - cancel or keep?
- Check for annual renewal opportunities (often cheaper)

### Annually
- Full subscription audit
- Negotiate enterprise/annual pricing
- Consolidate redundant tools

---

## Database

Subscriptions are tracked in Supabase:

```sql
-- View all subscriptions
SELECT vendor_name, amount, billing_cycle, category, receipt_automation
FROM subscriptions
ORDER BY amount DESC;

-- Find subscriptions needing automation
SELECT vendor_name, receipt_automation
FROM subscriptions
WHERE receipt_automation = 'manual';
```

---

## Related Files

| File | Purpose |
|------|---------|
| `config/dext-supplier-rules.json` | Dext auto-publish configuration |
| `config/xero-bank-rules.json` | Xero bank rules configuration |
| `scripts/validate-supplier-rules.mjs` | Validate Dext rules against vendors |
| `docs/FINANCE_SETUP_GUIDE.md` | Full finance automation guide |
