# ACT Placemat Integration Strategy

**Date**: 2025-12-29
**Purpose**: Document how ACT Studio integrates with ACT Placemat's existing subscription intelligence system

---

## 🎯 Overview

ACT Placemat already has a fully-built **Subscription Intelligence Hub** that handles:
- Gmail scanning across 3 @act.place accounts
- Xero invoice reconciliation with fuzzy matching
- Annual cost analytics with savings opportunities
- Email consolidation tracking
- Vendor contact management

Rather than rebuild this functionality in ACT Studio, we'll **integrate and surface** the existing system through proxy APIs and dashboards.

---

## 📂 ACT Placemat Subscription System

### Location
`/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/`

### Key Components

**Services:**
- `services/gmail/multiAccountScanner.js` - Scans nicholas@, hi@, accounts@act.place
- `services/reconciliation/fuzzyMatcher.js` - Levenshtein distance matching
- `services/reconciliation/reconciliationEngine.js` - Xero invoice matching
- `services/analytics/costEstimator.js` - Annual cost calculations
- `services/migration/emailConsolidation.js` - Consolidation tracking

**Database (Supabase):**
- `discovered_subscriptions` - All detected subscriptions
- `subscription_receipts` - Email receipts from Gmail
- Fields: `reconciliation_confidence`, `reconciliation_status`, `account_email`, `annual_cost_cached`
- View: `outstanding_invoices` - Unpaid/unmatched invoices

**API Endpoints:**
- `POST /api/v1/subscriptions/reconcile?tenantId=X` - Run reconciliation
- `GET /api/v1/subscriptions/outstanding?tenantId=X` - Get unpaid invoices
- `GET /api/v1/subscriptions/analytics/annual-costs?tenantId=X` - Cost analytics
- `GET /api/v1/subscriptions/migration/vendor-contacts?tenantId=X` - Export CSV

---

## 🔗 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ ACT Studio (Frontend Dashboard)                             │
│ /Users/benknight/Code/ACT Farm and Regenerative Innovation  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  src/app/admin/subscriptions/page.tsx                       │
│  ├─ Overview Tab (annual costs, savings)                    │
│  ├─ Outstanding Invoices Tab (unpaid/unmatched)             │
│  └─ Migration Tracker Tab (email consolidation)             │
│                                                              │
│  Fetches data via:                                          │
│  ↓                                                           │
│  src/app/api/subscriptions/* (Proxy Endpoints)              │
│  ├─ GET /api/subscriptions/analytics                        │
│  ├─ GET /api/subscriptions/outstanding                      │
│  ├─ POST /api/subscriptions/reconcile                       │
│  └─ GET /api/subscriptions/migration                        │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Requests
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ ACT Placemat Backend (Subscription Intelligence)            │
│ /Users/benknight/Code/ACT Placemat/apps/backend             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  subscription-tracker/routes/*                              │
│  ├─ POST /api/v1/subscriptions/reconcile                    │
│  ├─ GET /api/v1/subscriptions/analytics/annual-costs        │
│  └─ GET /api/v1/subscriptions/outstanding                   │
│                                                              │
│  Processes data using:                                      │
│  ├─ multiAccountScanner.js (Gmail)                          │
│  ├─ reconciliationEngine.js (Xero matching)                 │
│  └─ costEstimator.js (analytics)                            │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ Reads/Writes
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Supabase Database                                           │
│ discovered_subscriptions, subscription_receipts             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementation Steps

### Step 1: Environment Setup (5 min)

Add to ACT Studio `.env.local`:
```bash
# ACT Placemat Integration
ACT_PLACEMAT_API_URL=http://localhost:3003
ACT_PLACEMAT_API_KEY=<generate_shared_secret>
```

Add to ACT Placemat `.env`:
```bash
# API Authentication
API_KEY=<same_shared_secret>
```

### Step 2: Proxy API Endpoints in ACT Studio (4-5 hours)

Create proxy endpoints that forward requests to ACT Placemat:

**File:** `src/app/api/subscriptions/analytics/route.ts`
```typescript
export async function GET(request: Request) {
  const response = await fetch(
    `${process.env.ACT_PLACEMAT_API_URL}/api/v1/subscriptions/analytics/annual-costs`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.ACT_PLACEMAT_API_KEY}`
      }
    }
  );
  return Response.json(await response.json());
}
```

**Endpoints to create:**
- `src/app/api/subscriptions/analytics/route.ts`
- `src/app/api/subscriptions/outstanding/route.ts`
- `src/app/api/subscriptions/reconcile/route.ts`
- `src/app/api/subscriptions/migration/route.ts`
- `src/app/api/subscriptions/list/route.ts`

### Step 3: Dashboard UI in ACT Studio (6-8 hours)

Build UI that consumes the proxy endpoints:

**File:** `src/app/admin/subscriptions/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function SubscriptionsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [outstanding, setOutstanding] = useState(null);

  useEffect(() => {
    fetch('/api/subscriptions/analytics')
      .then(res => res.json())
      .then(setAnalytics);

    fetch('/api/subscriptions/outstanding')
      .then(res => res.json())
      .then(setOutstanding);
  }, []);

  return (
    <div>
      <h1>Subscriptions</h1>
      {/* Render tabs: Overview, Outstanding, Migration */}
    </div>
  );
}
```

**Components to create:**
- `src/components/subscriptions/SubscriptionStats.tsx`
- `src/components/subscriptions/OutstandingInvoices.tsx`
- `src/components/subscriptions/MigrationProgress.tsx`
- `src/components/subscriptions/SavingsOpportunities.tsx`

### Step 4: Automation Integration (2-3 hours)

**Daily Subscription Scan:**

**File:** `scripts/daily-subscription-scan.mjs`
```javascript
import fetch from 'node-fetch';

async function triggerScan() {
  const response = await fetch(
    `${process.env.ACT_PLACEMAT_API_URL}/api/v1/subscriptions/scan`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.ACT_PLACEMAT_API_KEY}` }
    }
  );

  const result = await response.json();
  console.log(`📊 Found ${result.discovered} subscriptions`);

  // Update Notion
  await updateNotionSubscriptionTracking(result);
}

triggerScan();
```

**GitHub Action:** `.github/workflows/daily-subscription-scan.yml`
```yaml
name: Daily Subscription Scan
on:
  schedule:
    - cron: '0 9 * * *' # 9 AM daily

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Scan Subscriptions
        env:
          ACT_PLACEMAT_API_URL: ${{ secrets.ACT_PLACEMAT_API_URL }}
          ACT_PLACEMAT_API_KEY: ${{ secrets.ACT_PLACEMAT_API_KEY }}
        run: node scripts/daily-subscription-scan.mjs
```

### Step 5: Notion Integration (3-4 hours)

**Create Notion Database: Subscription Tracking**

Properties:
- Vendor (title)
- Annual Cost (number)
- Billing Cycle (select)
- Account Email (select)
- Status (select)
- Next Renewal (date)
- Migration Status (select)
- Potential Savings (number)
- Last Synced (date)

**Sync Script:** `scripts/sync-subscriptions-to-notion.mjs`
```javascript
async function syncToNotion() {
  const response = await fetch(
    `${process.env.ACT_PLACEMAT_API_URL}/api/v1/subscriptions/analytics/annual-costs`
  );
  const { breakdown } = await response.json();

  for (const sub of breakdown) {
    await notion.pages.create({
      parent: { database_id: SUBSCRIPTION_TRACKING_DB },
      properties: {
        'Vendor': { title: [{ text: { content: sub.vendor } }] },
        'Annual Cost': { number: sub.annualCost },
        'Billing Cycle': { select: { name: sub.frequency } }
      }
    });
  }
}
```

---

## 📊 Data Flow

1. **Daily Scan (9 AM)**
   - GitHub Action triggers `daily-subscription-scan.mjs`
   - Script calls ACT Placemat API to scan Gmail accounts
   - ACT Placemat scans nicholas@, hi@, accounts@act.place
   - Detects subscriptions, matches to Xero invoices
   - Stores in Supabase

2. **Notion Sync (after scan)**
   - `sync-subscriptions-to-notion.mjs` fetches analytics from ACT Placemat API
   - Updates Notion Subscription Tracking database
   - Team can view in Notion

3. **Dashboard View (real-time)**
   - User opens ACT Studio dashboard
   - Frontend fetches `/api/subscriptions/*` (ACT Studio proxy)
   - Proxy forwards to ACT Placemat backend
   - ACT Placemat queries Supabase, returns data
   - Dashboard displays analytics, outstanding invoices, migration status

---

## ✅ Benefits of Integration Approach

1. **No Duplication** - Leverage 23 hours of R&D already invested in ACT Placemat
2. **Proven System** - Gmail scanner, fuzzy matching, reconciliation already working
3. **Single Source of Truth** - Supabase database in ACT Placemat
4. **Separation of Concerns** - ACT Placemat handles subscription logic, ACT Studio handles visualization
5. **Faster Implementation** - 15-20 hours vs 30+ hours to rebuild
6. **Maintainability** - Updates to subscription logic only need to happen in one place

---

## 🔐 Security Considerations

1. **API Key** - Use shared secret for ACT Studio ↔ ACT Placemat communication
2. **HTTPS** - When deployed, ensure HTTPS for API calls
3. **Rate Limiting** - Add rate limiting to ACT Placemat API endpoints
4. **Input Validation** - Validate tenantId and other params
5. **CORS** - Configure CORS if needed for cross-origin requests

---

## 📈 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API Response Time | <500ms | Monitor proxy endpoint latency |
| Dashboard Load Time | <2s | Measure page load in browser |
| Subscription Detection Rate | 85%+ | Compare detected vs manual count |
| Xero Match Accuracy | 90%+ | Review reconciliation confidence scores |
| Daily Scan Completion | 100% | Monitor GitHub Action success rate |
| Notion Sync Lag | <10 min | Time between scan and Notion update |

---

## 🚀 Deployment Checklist

- [ ] Add `ACT_PLACEMAT_API_URL` and `ACT_PLACEMAT_API_KEY` to ACT Studio `.env.local`
- [ ] Add `API_KEY` to ACT Placemat `.env`
- [ ] Create proxy API endpoints in ACT Studio (`src/app/api/subscriptions/*`)
- [ ] Build dashboard UI (`src/app/admin/subscriptions/page.tsx`)
- [ ] Create daily scan script (`scripts/daily-subscription-scan.mjs`)
- [ ] Set up GitHub Action for daily scans
- [ ] Create Notion database for subscription tracking
- [ ] Create Notion sync script (`scripts/sync-subscriptions-to-notion.mjs`)
- [ ] Add GitHub secrets: `ACT_PLACEMAT_API_URL`, `ACT_PLACEMAT_API_KEY`
- [ ] Test full flow: Scan → Supabase → API → Dashboard → Notion
- [ ] Monitor for 1 week to ensure reliability

---

## 📚 Related Documentation

- **ACT Placemat Summary**: `/Users/benknight/Code/ACT Placemat/SUBSCRIPTION_INTELLIGENCE_HUB_SUMMARY.md`
- **Unified Intelligence Plan**: `/Users/benknight/.claude/plans/act-unified-intelligence-system.md`
- **ACT Placemat Deployment**: `/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/DEPLOYMENT.md`

---

**Status**: Ready to implement
**Estimated Effort**: 15-20 hours (vs 30+ hours to rebuild)
**Time Savings**: ~20-30 hours by integrating existing system
