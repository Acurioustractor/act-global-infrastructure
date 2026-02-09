# ACT Finance Automation Setup Guide

Complete guide to setting up the finance automation system connecting Dext, Xero, GHL, and Supabase.

---

## Quick Start

```bash
# 1. Validate your current setup
node scripts/validate-supplier-rules.mjs summary

# 2. Check grants pipeline
node scripts/grants-pipeline.mjs summary

# 3. View receipt status
node scripts/receipt-dashboard.mjs

# 4. Search across all finance data
node scripts/unified-search.mjs finance "vendor name"
```

---

## Part 1: Project Codes Setup

### What Are Project Codes?

Every expense and income needs a project code (e.g., `ACT-JH` for JusticeHub). This enables:
- Tracking spend per project
- Grant acquittal reporting
- Project profitability analysis

### Current Project Codes (61 total)

```bash
# List all codes
node scripts/unified-search.mjs list-codes
```

| Code | Project | Category |
|------|---------|----------|
| ACT-JH | JusticeHub | justice |
| ACT-PI | PICC | indigenous |
| ACT-GD | Goods | enterprise |
| ACT-EL | Empathy Ledger | stories |
| ACT-HV | The Harvest Witta | regenerative |
| ACT-IN | Infrastructure | tech |
| ... | See full list | ... |

### Adding New Project Codes

1. Edit `config/project-codes.json`
2. Add entry with required fields:

```json
"ACT-XX": {
  "name": "Project Name",
  "code": "ACT-XX",
  "category": "category",
  "status": "active",
  "description": "Brief description",
  "xero_tracking": "Xero Category Name",
  "dext_category": "Dext Category",
  "ghl_tags": ["tag1", "tag2"]
}
```

---

## Part 2: Dext Setup

### Step 1: Log into Dext

1. Go to https://prepare.dext.com
2. Navigate to **Business Settings → Connections → Manage (Xero)**

### Step 2: Configure Auto-Publish Suppliers

For each subscription vendor, create a **Supplier Rule**:

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
| HighLevel | Software & Subscriptions | GST | ACT-IN | ✅ YES |

### Step 3: Configure Manual Review Suppliers

For travel vendors, create rules but **disable auto-publish**:

| Vendor | Category | Tax | Tracking | Auto-Publish |
|--------|----------|-----|----------|--------------|
| Qantas | Travel - Airfare | GST | ASK | ❌ NO |
| Uber | Travel - Transport | GST | ASK | ❌ NO |
| Cabcharge | Travel - Transport | GST | ASK | ❌ NO |
| Booking.com | Travel - Accommodation | GST | ASK | ❌ NO |
| Airbnb | Travel - Accommodation | GST | ASK | ❌ NO |

### Step 4: Test Configuration

```bash
# Validate rules against actual vendors
node scripts/validate-supplier-rules.mjs

# Check for missing vendor rules
node scripts/validate-supplier-rules.mjs missing
```

---

## Part 3: Xero Setup

### Step 1: Enable JAX Automation

1. Go to https://go.xero.com
2. Navigate to **Bank Accounts → Select your account**
3. Look for **Automation** or **JAX** toggle
4. **Turn ON** automation
5. JAX learns from your manual reconciliations

### Step 2: Create Bank Rules

Go to **Settings → Bank Account → Bank Rules → New Rule**

#### Subscription Rules (Auto-Reconcile)

| Rule Name | Contains | Account | Tax | Tracking |
|-----------|----------|---------|-----|----------|
| Notion Subscription | NOTION | 6350 - Software | GST | ACT-IN |
| OpenAI Subscription | OPENAI | 6350 - Software | GST | ACT-IN |
| Anthropic Subscription | ANTHROPIC | 6350 - Software | GST | ACT-IN |
| Webflow Subscription | WEBFLOW | 6350 - Software | GST | ACT-IN |
| Xero Subscription | XERO | 6350 - Software | GST | ACT-IN |

#### Travel Rules (Manual Review)

| Rule Name | Contains | Account | Tax | Tracking |
|-----------|----------|---------|-----|----------|
| Qantas Airways | QANTAS | 6400 - Airfare | GST | [Ask] |
| Uber Transport | UBER | 6410 - Transport | GST | [Ask] |
| Cabcharge | CABCHARGE | 6410 - Transport | GST | [Ask] |

#### Bank Fee Rules (No Receipt)

| Rule Name | Contains | Account | Tax | Tracking |
|-----------|----------|---------|-----|----------|
| NAB Account Fee | NAB ACCOUNT FEE | 6800 - Bank Fees | No GST | ACT-IN |
| NAB International Fee | NAB INT'L | 6800 - Bank Fees | No GST | ACT-IN |

### Step 3: Verify Tracking Categories

Ensure Xero has tracking categories matching project codes:

1. Go to **Settings → Tracking Categories**
2. Create category called "Project"
3. Add all project codes as options

---

## Part 4: GHL Grants Pipeline

### Step 1: Review Pipeline Structure

```bash
# View all grants
node scripts/grants-pipeline.mjs list

# View active grants only
node scripts/grants-pipeline.mjs active

# View won grants
node scripts/grants-pipeline.mjs won
```

### Step 2: Link Grants to Projects

```bash
# Find grant ID from list, then link
node scripts/grants-pipeline.mjs link <grant-id> ACT-JH
```

### Step 3: Mark Grant as Received

When funds arrive:

```bash
node scripts/grants-pipeline.mjs received <grant-id>
```

This will:
- Update status to "won"
- Set received date
- Calculate acquittal due date (12 months)
- Create tracking entry

### Step 4: Monitor Acquittals

```bash
# Check all acquittal deadlines
node scripts/grants-pipeline.mjs acquittal
```

### Step 5: Financial Summary

```bash
# See all grants by project
node scripts/grants-pipeline.mjs summary
```

---

## Part 5: Receipt Tracking Dashboard

### View All Receipts

```bash
# Full receipt dashboard
node scripts/receipt-dashboard.mjs

# Missing receipts only
node scripts/receipt-dashboard.mjs missing

# Recent receipts
node scripts/receipt-dashboard.mjs recent
```

### Receipt Status Types

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| ✅ matched | Receipt matched to transaction | None |
| ⚠️ pending | Receipt uploaded, not matched | Review in Xero |
| ❌ missing | Transaction has no receipt | Find/upload receipt |
| 🏦 no-receipt | No receipt required (bank fees) | None |

### Resolve Missing Receipts

```bash
# Mark as found
node scripts/receipt-reconciliation-agent.mjs resolve <id>

# Mark as no receipt needed
node scripts/receipt-reconciliation-agent.mjs no-receipt <id>

# Defer to next week
node scripts/receipt-reconciliation-agent.mjs defer <id>
```

---

## Part 6: Weekly Workflow

### Monday Morning (15 mins)

1. **Check Discord** for receipt summary notification
2. **Run receipt dashboard:**
   ```bash
   node scripts/receipt-dashboard.mjs missing
   ```
3. **Review top 5 missing receipts:**
   - Search email for receipt
   - Upload to Dext if found
   - Mark as "no-receipt" if not needed

### During Week

- **After travel:** Upload receipts same day via Dext app
- **After purchases:** Forward email receipts to Dext inbox
- **After receiving grant:** Run `grants-pipeline.mjs received <id>`

### Friday (5 mins)

```bash
# Check grant acquittal deadlines
node scripts/grants-pipeline.mjs acquittal

# Verify week's reconciliation
node scripts/receipt-dashboard.mjs recent
```

---

## Part 7: Testing & Validation

### Test 1: Supplier Rules

```bash
# Should show configured vs missing
node scripts/validate-supplier-rules.mjs summary
```

Expected output:
```
📊 Summary
   Total unique vendors: 89
   ✅ Configured: 24+
   ⚠️  Missing rules: <65
   🤖 Auto-publish: 10+
```

### Test 2: Unified Search

```bash
# Search for a known vendor
node scripts/unified-search.mjs finance "Notion"

# Search by project
node scripts/unified-search.mjs --project ACT-JH
```

### Test 3: Grants Pipeline

```bash
# Should show grants summary
node scripts/grants-pipeline.mjs summary
```

### Test 4: Receipt Dashboard

```bash
# Should show receipt status
node scripts/receipt-dashboard.mjs
```

---

## Part 8: Troubleshooting

### "Supabase URL required" Error

```bash
# Check env file exists
cat .env.local | grep SUPABASE

# Should see:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=...
```

### Vendor Not in Rules

```bash
# Check missing vendors
node scripts/validate-supplier-rules.mjs missing

# Add to config/dext-supplier-rules.json
```

### Grant Not Linked to Project

```bash
# List grants to find ID
node scripts/grants-pipeline.mjs list

# Link to project
node scripts/grants-pipeline.mjs link <id> ACT-XX
```

### Receipt Not Matching

1. Check Dext inbox for the receipt
2. Verify amount matches transaction
3. Check date is within 7 days
4. Manually match in Xero if needed

---

## Configuration Files

| File | Purpose |
|------|---------|
| `config/project-codes.json` | All 61 project codes |
| `config/dext-supplier-rules.json` | Dext auto-publish rules |
| `config/xero-bank-rules.json` | Xero bank rules |
| `docs/FINANCE_AUTOMATION_SYSTEM.md` | System architecture |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/unified-search.mjs` | Search across all systems |
| `scripts/validate-supplier-rules.mjs` | Validate Dext rules |
| `scripts/grants-pipeline.mjs` | Manage grants |
| `scripts/receipt-dashboard.mjs` | View receipt status |
| `scripts/receipt-reconciliation-agent.mjs` | Resolve receipts |

---

## Support

- **Receipt issues:** Check Dext inbox first
- **Bank feed issues:** Xero → Bank Feeds
- **Project tagging:** Update `config/project-codes.json`
- **Grant tracking:** `scripts/grants-pipeline.mjs`
