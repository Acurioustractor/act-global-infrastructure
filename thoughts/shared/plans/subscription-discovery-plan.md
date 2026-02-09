# Feature Plan: Automated Subscription Discovery System
Created: 2026-01-27
Author: architect-agent

## Overview

Build a unified subscription discovery service that aggregates subscription data from three sources:
1. **Xero RepeatingInvoices API** - Scheduled recurring invoices/bills
2. **Bank Transaction Pattern Detection** - Recurring payments to same vendors
3. **Email Receipt Scanning** - Subscription confirmation emails

The system detects new subscriptions, price changes, and cancellations automatically, storing everything in the `subscriptions` table with confidence scoring.

## Requirements

- [ ] Pull Xero RepeatingInvoices (scheduled recurring bills)
- [ ] Detect recurring patterns in bank transactions (same vendor, similar amount, monthly interval)
- [ ] Scan emails for subscription confirmations across 4 ACT mailboxes
- [ ] Merge all sources into unified subscriptions table with deduplication
- [ ] Detect NEW subscriptions not yet tracked
- [ ] Detect PRICE CHANGES (amount differs from expected)
- [ ] Detect CANCELLATIONS (payments stop for 2+ cycles)
- [ ] Confidence scoring for each discovery source
- [ ] API endpoint `/api/subscriptions/discover`
- [ ] Claude skill `/scan-subscriptions`

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Subscription Discovery Service                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │    Xero      │   │  Transaction │   │    Email     │                │
│  │  Repeating   │   │   Pattern    │   │   Scanner    │                │
│  │  Invoices    │   │   Detector   │   │              │                │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            ▼                                            │
│                   ┌────────────────┐                                    │
│                   │  Subscription  │                                    │
│                   │   Reconciler   │                                    │
│                   └────────┬───────┘                                    │
│                            │                                            │
│         ┌──────────────────┼──────────────────┐                         │
│         ▼                  ▼                  ▼                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│  │    Match     │   │    Detect    │   │   Update     │                │
│  │   to Known   │   │   Changes    │   │   Status     │                │
│  │ Subscriptions│   │  (price/end) │   │  (active,    │                │
│  │              │   │              │   │  cancelled)  │                │
│  └──────────────┘   └──────────────┘   └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │   subscriptions  │
                         │   (Supabase)     │
                         └──────────────────┘
```

### Data Sources

| Source | Confidence | Data Provided | Refresh Rate |
|--------|------------|---------------|--------------|
| Xero RepeatingInvoices | 95% | Scheduled amount, next date, contact | On-demand |
| Bank Transaction Patterns | 70-90% | Historical payments, actual amounts | Daily |
| Email Receipts | 60-85% | Receipt dates, amounts, vendor | On-demand |
| Dext Supplier Rules | 100% | Expected amounts, categories | Static config |

### Interfaces

```typescript
// scripts/lib/subscription-discovery.mjs

interface DiscoverySource {
  source: 'xero_repeating' | 'transaction_pattern' | 'email' | 'dext_rules';
  confidence: number; // 0-100
  raw_data: object;
  detected_at: string;
}

interface DiscoveredSubscription {
  vendor_name: string;
  vendor_aliases: string[];
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'annual' | 'quarterly';
  next_billing_date?: string;
  sources: DiscoverySource[];
  overall_confidence: number;
  status: 'new' | 'confirmed' | 'price_changed' | 'possibly_cancelled';
  changes?: {
    type: 'price_change' | 'cancellation' | 'new';
    previous_value?: any;
    new_value?: any;
  };
}

interface DiscoveryResult {
  discovered: DiscoveredSubscription[];
  matched_existing: number;
  new_subscriptions: DiscoveredSubscription[];
  price_changes: DiscoveredSubscription[];
  possibly_cancelled: DiscoveredSubscription[];
  sources_queried: string[];
  timestamp: string;
}
```

### Database Schema Additions

```sql
-- Add to subscriptions table (already exists, add columns)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  xero_repeating_invoice_id TEXT,
  discovery_source TEXT[], -- ['xero_repeating', 'transaction_pattern', 'email']
  discovery_confidence INTEGER,
  last_discovery_check TIMESTAMPTZ,
  expected_amount DECIMAL(10,2),
  amount_variance_pct DECIMAL(5,2),
  last_payment_date DATE,
  consecutive_missed_payments INTEGER DEFAULT 0;

-- New table: discovery_events
CREATE TABLE IF NOT EXISTS subscription_discovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('discovered', 'price_change', 'confirmed', 'missed_payment', 'cancelled', 'resumed')),
  source TEXT NOT NULL,
  confidence INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: subscriptions needing attention
CREATE OR REPLACE VIEW v_subscription_alerts AS
SELECT 
  s.*,
  CASE 
    WHEN s.consecutive_missed_payments >= 2 THEN 'possibly_cancelled'
    WHEN s.amount_variance_pct > 10 THEN 'price_change'
    WHEN s.discovery_confidence < 70 THEN 'needs_verification'
    ELSE 'ok'
  END as alert_status
FROM subscriptions s
WHERE s.status = 'active'
ORDER BY 
  CASE 
    WHEN s.consecutive_missed_payments >= 2 THEN 1
    WHEN s.amount_variance_pct > 10 THEN 2
    ELSE 3
  END;
```

### Data Flow

1. **Trigger**: API call to `/api/subscriptions/discover` or Claude skill `/scan-subscriptions`
2. **Parallel Fetch**:
   - Query Xero RepeatingInvoices API
   - Query xero_transactions for recurring patterns (last 180 days)
   - Scan Gmail for receipt emails (last 90 days)
3. **Normalize**: Convert each source to `DiscoveredSubscription` format
4. **Reconcile**:
   - Match to existing subscriptions by vendor name/aliases
   - Calculate confidence scores
   - Detect price changes (compare amount to expected)
   - Detect cancellations (no payment for 2+ expected cycles)
5. **Persist**: 
   - Update existing subscriptions
   - Create new subscription records
   - Log discovery events
6. **Return**: Discovery result with alerts

## Discovery Algorithms

### 1. Xero RepeatingInvoices Sync

```javascript
async function syncXeroRepeatingInvoices() {
  const data = await xeroRequest('RepeatingInvoices');
  
  return data.RepeatingInvoices
    .filter(inv => inv.Status === 'AUTHORISED')
    .map(inv => ({
      vendor_name: inv.Contact?.Name,
      xero_contact_id: inv.Contact?.ContactID,
      xero_repeating_invoice_id: inv.RepeatingInvoiceID,
      amount: inv.Total,
      billing_cycle: mapXeroPeriod(inv.Schedule?.Period, inv.Schedule?.Unit),
      next_billing_date: inv.Schedule?.NextScheduledDate,
      source: 'xero_repeating',
      confidence: 95
    }));
}

function mapXeroPeriod(period, unit) {
  if (unit === 'MONTHLY' && period === 1) return 'monthly';
  if (unit === 'MONTHLY' && period === 3) return 'quarterly';
  if (unit === 'YEARLY' && period === 1) return 'annual';
  return 'monthly';
}
```

### 2. Transaction Pattern Detection

```javascript
async function detectRecurringPatterns(daysBack = 180) {
  const { data: transactions } = await supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .gte('date', new Date(Date.now() - daysBack * 86400000).toISOString());
  
  // Group by vendor
  const byVendor = groupBy(transactions, 'contact_name');
  
  const patterns = [];
  
  for (const [vendor, txns] of Object.entries(byVendor)) {
    if (txns.length < 2) continue;
    
    // Sort by date
    const sorted = txns.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate intervals between payments
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / 86400000;
      intervals.push(daysBetween);
    }
    
    // Detect monthly pattern (25-35 days between payments)
    const avgInterval = intervals.reduce((a,b) => a+b, 0) / intervals.length;
    const isMonthly = avgInterval >= 25 && avgInterval <= 35;
    const isQuarterly = avgInterval >= 85 && avgInterval <= 95;
    const isAnnual = avgInterval >= 350 && avgInterval <= 380;
    
    if (!isMonthly && !isQuarterly && !isAnnual) continue;
    
    // Calculate amount consistency
    const amounts = sorted.map(t => Math.abs(t.total));
    const avgAmount = amounts.reduce((a,b) => a+b, 0) / amounts.length;
    const variance = Math.max(...amounts.map(a => Math.abs(a - avgAmount) / avgAmount * 100));
    
    // Confidence based on consistency
    let confidence = 70;
    if (variance < 5) confidence += 15;  // Very consistent amount
    if (txns.length >= 6) confidence += 10;  // 6+ months of data
    if (intervals.every(i => Math.abs(i - avgInterval) < 5)) confidence += 5;  // Consistent timing
    
    patterns.push({
      vendor_name: vendor,
      amount: avgAmount,
      billing_cycle: isMonthly ? 'monthly' : isQuarterly ? 'quarterly' : 'annual',
      last_payment_date: sorted[sorted.length - 1].date,
      payment_count: txns.length,
      amount_variance_pct: variance,
      source: 'transaction_pattern',
      confidence: Math.min(confidence, 95)
    });
  }
  
  return patterns;
}
```

### 3. Email Receipt Detection

```javascript
async function scanEmailReceipts(vendorPatterns = VENDOR_PATTERNS) {
  const results = [];
  
  for (const [vendor, patterns] of Object.entries(vendorPatterns)) {
    for (const mailbox of MAILBOXES) {
      const emails = await searchGmail(mailbox, patterns.fromPatterns);
      
      if (emails.length > 0) {
        // Extract amounts from subject lines
        const amounts = emails
          .map(e => extractAmount(e.subject))
          .filter(a => a !== null);
        
        const avgAmount = amounts.length > 0 
          ? amounts.reduce((a,b) => a+b, 0) / amounts.length 
          : null;
        
        results.push({
          vendor_name: vendor,
          mailbox,
          email_count: emails.length,
          amount: avgAmount,
          last_receipt_date: emails[0].date,
          source: 'email',
          confidence: calculateEmailConfidence(emails)
        });
      }
    }
  }
  
  return results;
}

function calculateEmailConfidence(emails) {
  let confidence = 60;
  if (emails.length >= 3) confidence += 10;  // Multiple receipts
  if (emails.length >= 6) confidence += 10;  // 6+ receipts
  if (emails.some(e => e.subject.toLowerCase().includes('receipt'))) confidence += 5;
  return Math.min(confidence, 90);
}
```

### 4. Reconciliation Logic

```javascript
async function reconcileSubscriptions(discovered) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*');
  
  const results = {
    matched: [],
    new_subscriptions: [],
    price_changes: [],
    possibly_cancelled: []
  };
  
  // Build vendor lookup with aliases
  const vendorLookup = {};
  for (const sub of existing) {
    vendorLookup[sub.name.toLowerCase()] = sub;
    vendorLookup[sub.provider.toLowerCase()] = sub;
    // Add Dext aliases
    const dextRule = findDextRule(sub.provider);
    if (dextRule?.aliases) {
      for (const alias of dextRule.aliases) {
        vendorLookup[alias.toLowerCase()] = sub;
      }
    }
  }
  
  for (const disc of discovered) {
    const match = vendorLookup[disc.vendor_name.toLowerCase()];
    
    if (match) {
      // Matched existing subscription
      const priceChange = Math.abs(disc.amount - match.cost_per_cycle) / match.cost_per_cycle * 100;
      
      if (priceChange > 5) {
        results.price_changes.push({
          subscription: match,
          previous_amount: match.cost_per_cycle,
          new_amount: disc.amount,
          change_pct: priceChange,
          source: disc.source
        });
      }
      
      results.matched.push({ existing: match, discovered: disc });
    } else {
      // New subscription
      results.new_subscriptions.push(disc);
    }
  }
  
  // Check for cancellations
  for (const sub of existing.filter(s => s.status === 'active')) {
    const wasDiscovered = discovered.some(d => 
      d.vendor_name.toLowerCase() === sub.provider.toLowerCase()
    );
    
    if (!wasDiscovered && sub.billing_cycle === 'monthly') {
      const daysSinceRenewal = sub.renewal_date 
        ? (Date.now() - new Date(sub.renewal_date)) / 86400000
        : null;
      
      if (daysSinceRenewal && daysSinceRenewal > 60) {
        results.possibly_cancelled.push({
          subscription: sub,
          days_since_last_payment: daysSinceRenewal,
          reason: 'No payments detected for 2+ billing cycles'
        });
      }
    }
  }
  
  return results;
}
```

### 5. Confidence Scoring Matrix

| Condition | Confidence Modifier |
|-----------|---------------------|
| Xero RepeatingInvoice exists | +95 (base) |
| 6+ consistent transaction payments | +85 (base) |
| Amount variance < 5% | +15 |
| Amount variance 5-10% | +5 |
| Email receipts found | +10 |
| Dext supplier rule match | +10 |
| Multiple sources agree | +10 |
| Payment timing consistent | +5 |

**Final Confidence = min(sum of modifiers, 100)**

## API Endpoint

### POST /api/subscriptions/discover

```javascript
app.post('/api/subscriptions/discover', async (req, res) => {
  const { 
    sources = ['xero_repeating', 'transactions', 'email'],
    daysBack = 180,
    autoUpdate = false 
  } = req.body;
  
  try {
    const discovered = [];
    
    // 1. Xero RepeatingInvoices
    if (sources.includes('xero_repeating')) {
      const xeroSubs = await syncXeroRepeatingInvoices();
      discovered.push(...xeroSubs);
    }
    
    // 2. Transaction patterns
    if (sources.includes('transactions')) {
      const patterns = await detectRecurringPatterns(daysBack);
      discovered.push(...patterns);
    }
    
    // 3. Email receipts
    if (sources.includes('email')) {
      const emailSubs = await scanEmailReceipts();
      discovered.push(...emailSubs);
    }
    
    // 4. Reconcile
    const reconciled = await reconcileSubscriptions(discovered);
    
    // 5. Optionally update database
    if (autoUpdate) {
      await applyDiscoveryUpdates(reconciled);
    }
    
    res.json({
      success: true,
      discovered: discovered.length,
      matched: reconciled.matched.length,
      new_subscriptions: reconciled.new_subscriptions,
      price_changes: reconciled.price_changes,
      possibly_cancelled: reconciled.possibly_cancelled,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### GET /api/subscriptions/discover

Quick discovery status without running full scan.

```javascript
app.get('/api/subscriptions/discover', async (req, res) => {
  const { data: lastEvents } = await supabase
    .from('subscription_discovery_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  const { data: alerts } = await supabase
    .from('v_subscription_alerts')
    .select('*')
    .neq('alert_status', 'ok');
  
  res.json({
    success: true,
    last_scan: lastEvents?.[0]?.created_at,
    alerts: alerts || [],
    recent_events: lastEvents || []
  });
});
```

## Claude Skill: /scan-subscriptions

```markdown
# Skill: Scan Subscriptions

Discover and reconcile software subscriptions from multiple sources.

## Usage
/scan-subscriptions [--sources=all|xero|transactions|email] [--update]

## Examples
/scan-subscriptions                    # Full scan, report only
/scan-subscriptions --sources=xero     # Only check Xero RepeatingInvoices
/scan-subscriptions --update           # Scan and apply updates

## Output
- New subscriptions discovered
- Price changes detected
- Possibly cancelled subscriptions
- Confidence scores for each finding
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| sync-xero-to-supabase.mjs | Internal | Xero OAuth & request wrapper |
| scan-subscription-emails.mjs | Internal | Gmail API integration |
| config/dext-supplier-rules.json | Config | Known vendors & expected amounts |
| subscriptions table | Database | Storage for subscription data |
| xero_transactions table | Database | Historical payment data |

## Implementation Phases

### Phase 1: Xero RepeatingInvoices Integration
**Files to create:**
- `scripts/lib/xero-repeating-invoices.mjs` - Fetch & parse RepeatingInvoices

**Files to modify:**
- `scripts/sync-xero-to-supabase.mjs` - Add repeating invoices sync command

**Acceptance:**
- [ ] Can fetch RepeatingInvoices from Xero API
- [ ] Maps to subscription format
- [ ] Stores xero_repeating_invoice_id

**Estimated effort:** Small (2-4 hours)

### Phase 2: Transaction Pattern Detection
**Files to create:**
- `scripts/lib/transaction-pattern-detector.mjs` - Recurring payment detection

**Acceptance:**
- [ ] Detects monthly patterns (25-35 day intervals)
- [ ] Detects quarterly/annual patterns
- [ ] Calculates amount variance
- [ ] Confidence scoring works

**Estimated effort:** Medium (4-8 hours)

### Phase 3: Unified Discovery Service
**Files to create:**
- `scripts/lib/subscription-discovery.mjs` - Main discovery orchestration
- `scripts/discover-subscriptions.mjs` - CLI entry point

**Files to modify:**
- `supabase/migrations/20260128000000_subscription_discovery.sql` - Schema additions

**Dependencies:** Phase 1, Phase 2

**Acceptance:**
- [ ] Merges all three sources
- [ ] Deduplicates by vendor
- [ ] Calculates overall confidence
- [ ] Detects new/changed/cancelled

**Estimated effort:** Medium (4-8 hours)

### Phase 4: API Integration
**Files to modify:**
- `packages/act-dashboard/api-server.mjs` - Add discovery endpoints

**Dependencies:** Phase 3

**Acceptance:**
- [ ] POST /api/subscriptions/discover works
- [ ] GET /api/subscriptions/discover shows status
- [ ] Returns proper JSON responses

**Estimated effort:** Small (2-4 hours)

### Phase 5: Claude Skill
**Files to create:**
- `.claude/skills/scan-subscriptions/SKILL.md` - Skill definition

**Dependencies:** Phase 3

**Acceptance:**
- [ ] /scan-subscriptions invokable
- [ ] Outputs formatted results
- [ ] Supports --update flag

**Estimated effort:** Small (1-2 hours)

### Phase 6: Testing & Documentation
**Files to create:**
- `tests/subscription-discovery.test.mjs` - Unit tests
- `docs/SUBSCRIPTION_DISCOVERY.md` - Documentation

**Acceptance:**
- [ ] Tests pass for pattern detection
- [ ] Tests pass for reconciliation
- [ ] Documentation complete

**Estimated effort:** Small (2-4 hours)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Xero API rate limits | Medium | Cache RepeatingInvoices, don't call on every request |
| False positive cancellations | High | Require 2+ missed cycles, allow manual override |
| Gmail API quota | Medium | Rate limit email scans, batch requests |
| Vendor name variations | Medium | Use Dext aliases, fuzzy matching |
| Price change false alarms | Low | Only alert on >5% variance |

## Open Questions

- [ ] Should we create subscriptions automatically or require human confirmation?
- [ ] How often should automatic discovery run? (Suggest: weekly)
- [ ] Should price change alerts go to Discord?
- [ ] What's the threshold for "possibly cancelled"? (Suggest: 2 missed cycles)

## Success Criteria

1. System detects 90%+ of known ACT subscriptions from transactions
2. New subscriptions discovered within 7 days of first payment
3. Price changes detected within 24 hours of sync
4. False positive rate < 10% for cancellation alerts
5. `/scan-subscriptions` skill works from Claude Code
6. API responds in < 5 seconds for full discovery

## Integration with Existing Systems

### Receipt Reconciliation
The subscription discovery system should tag receipts:
- When a receipt is matched, check if vendor is a known subscription
- Auto-apply project code from subscription config
- Track subscription payments in receipt system

### Finance Dashboard
Add subscription alerts widget:
- New subscriptions pending review
- Price changes requiring confirmation
- Possibly cancelled subscriptions

### Weekly Summary
Include in receipt reconciliation weekly summary:
- "X subscriptions confirmed"
- "Y price changes detected"
- "Z subscriptions may be cancelled"
