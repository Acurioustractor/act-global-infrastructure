# /scan-subscriptions

Discover and reconcile software subscriptions from multiple sources.

## Description

Automated subscription discovery that pulls from:
- **Xero RepeatingInvoices API** - Scheduled recurring bills (95% confidence)
- **Bank transaction patterns** - Recurring payment detection (70-85% confidence)
- **Email receipts** - Subscription confirmations (future)

Detects:
- New subscriptions not yet tracked
- Price changes (>5% variance from expected)
- Possibly cancelled subscriptions (2+ missed payments)

## Money guards — read before flagging any subscription

1. **Two-account rule.** Only recurring payments on **NAB Visa ACT #8815** + **NJ Marchesi T/as ACT Everyday** are ACT subscriptions. Recurring debits on `NM Personal` / `NJ Marchesi T/as ACT Maximiser` are Nic's, not ACT's — don't surface them as ACT subs.
2. **DELETED/voided rows don't count.** Exclude `status='DELETED'` (NULL-safe) when detecting recurring patterns, or a voided run distorts the cadence.
3. **PostgREST 1000-row cap.** A 365-day pattern scan over supabase-js silently truncates at 1000 rows — paginate or aggregate in SQL.
4. **Project-tagging a subscription is the workbench, not here.** This skill *discovers* subscriptions. To assign a subscription's spend to a project, use `/finance/workbench` (Project gaps card, port 3002) — it stamps `manual_workbench` so auto-taggers skip it. (The old `backfill-subscription-projects.mjs` was removed.)

→ Guard rationale: memory `command-center-finance-truth.md`. The `localhost:3456` HTTP examples below are the **legacy** standalone service — prefer the CLI (`discover-subscriptions.mjs`) + workbench.

## Usage

```bash
# Full scan, report only
/scan-subscriptions

# Only check Xero scheduled invoices
/scan-subscriptions --sources=xero

# Only check transaction patterns
/scan-subscriptions --sources=transactions

# Scan and apply updates to database
/scan-subscriptions --update

# Look back 1 year (for annual subscriptions)
/scan-subscriptions --days=365

# Show current discovery status and alerts
/scan-subscriptions --status
```

## Implementation

Run the discovery CLI:

```bash
node scripts/discover-subscriptions.mjs [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--sources=SOURCES` | Comma-separated: `xero`, `transactions`, `email` |
| `--days=N` | Days to analyze (default: 180) |
| `--update` | Apply discovered changes to database |
| `--status` | Show current discovery status only |

## Output

The skill outputs:
1. **New subscriptions** - Vendors found with recurring patterns not yet tracked
2. **Price changes** - Existing subscriptions with amount changes >5%
3. **Possibly cancelled** - Active subscriptions with 2+ missed payments
4. **Matched existing** - Vendors already tracked (confirmation)

### Confidence Scoring

| Source | Confidence |
|--------|------------|
| Xero RepeatingInvoice | 95% |
| Transaction (6+ payments, <5% variance) | 85% |
| Transaction (3+ payments) | 70% |
| Multiple sources agree | +10% |
| Matches Dext supplier rule | +10% |

## Database Tables

- `subscriptions` - Core subscription tracking
- `pending_subscriptions` - Discovered subs awaiting confirmation
- `subscription_discovery_events` - Audit trail
- `v_subscription_alerts` - Active alerts view

## API Endpoints

```bash
# Run discovery scan
curl -X POST http://localhost:3456/api/subscriptions/discover \
  -H "Content-Type: application/json" \
  -d '{"sources": ["xero_repeating", "transactions"], "daysBack": 180, "autoUpdate": false}'

# Get discovery status
curl http://localhost:3456/api/subscriptions/discover

# Get subscription alerts
curl http://localhost:3456/api/subscriptions/alerts

# Get pending discoveries
curl http://localhost:3456/api/subscriptions/pending

# Confirm a pending subscription
curl -X POST http://localhost:3456/api/subscriptions/pending/{id}/confirm \
  -H "Content-Type: application/json" \
  -d '{"category": "ai"}'
```

## Workflow

1. **Discovery** - Run scan to find new/changed subscriptions
2. **Review** - Check pending_subscriptions for new discoveries
3. **Confirm/Reject** - Approve or reject each discovery
4. **Monitor** - Check alerts for price changes and missed payments

## Related

- `/api/v1/subscriptions` - List all subscriptions
- `/api/v1/subscriptions/renewals` - Upcoming renewals
- `scripts/sync-xero-to-supabase.mjs` - Xero data sync
- `config/dext-supplier-rules.json` - Known vendor rules
