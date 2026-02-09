# /find-receipt

Intelligent receipt hunting across all data sources.

## Description

Unified search for receipts across:
- **Xero transactions** - Expenses without attachments
- **Gmail** - Receipt/invoice emails with keywords
- **Calendar** - Travel events for context
- **Dext** - Already uploaded receipts (future)

Uses AI-powered matching to suggest email-to-transaction links.

## Usage

```bash
# Natural language search
/find-receipt Qantas $580 January

# Vendor-specific search
/find-receipt --vendor "Adobe"

# Search by category
/find-receipt --category travel

# Show all pending (missing) receipts
/find-receipt --pending

# Run a full scan for missing receipts
/find-receipt --scan

# Search within date range
/find-receipt --from 2026-01-01 --to 2026-01-31 flight
```

## Implementation

### CLI Search

```bash
# Using the unified search library
node scripts/lib/unified-receipt-search.mjs "Qantas $580"
```

### API Search

```bash
# Search across all sources
curl -X POST http://localhost:3456/api/receipts/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Qantas January", "sources": ["xero", "gmail", "calendar"]}'

# With filters
curl -X POST http://localhost:3456/api/receipts/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "flight",
    "sources": ["xero", "gmail"],
    "dateRange": {"from": "2026-01-01", "to": "2026-01-31"},
    "amount": {"min": 400, "max": 700}
  }'
```

### Scan for Missing

```bash
# Run receipt detection scan
curl -X POST http://localhost:3456/api/receipts/scan \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 90, "skipAI": false}'
```

### Pending Receipts

```bash
# Get pending receipts with suggestions
curl http://localhost:3456/api/receipts/unmatched?limit=50

# Get receipt score and gamification stats
curl http://localhost:3456/api/receipts/score
```

## Output

The search returns:

1. **Results** - Matching items from each source with relevance scores
2. **Suggested Matches** - AI-powered transaction-to-email matches

### Example Response

```json
{
  "results": [
    {
      "source": "xero",
      "type": "transaction",
      "vendor": "Qantas Airways",
      "amount": 580.00,
      "date": "2026-01-15",
      "has_attachment": false,
      "relevance_score": 95
    },
    {
      "source": "gmail",
      "type": "email",
      "subject": "Booking Confirmation - QF432",
      "from": "noreply@qantas.com.au",
      "date": "2026-01-14",
      "has_attachment": true,
      "relevance_score": 90
    }
  ],
  "suggested_matches": [
    {
      "transaction_id": "txn123",
      "email_id": "email456",
      "confidence": 92,
      "reasons": ["Vendor match", "Amount exact", "Same day"]
    }
  ]
}
```

## Matching Algorithm

### Relevance Scoring

| Factor | Weight |
|--------|--------|
| Vendor name match | 40 points |
| Amount within 10% | 25 points |
| Date within 7 days | 20 points |
| Receipt keywords | 15 points |

### Receipt Keywords (Boost)

Strong: "your receipt", "tax invoice", "payment receipt", "booking confirmation"
Regular: "receipt", "invoice", "confirmation", "order", "payment"

### Cross-Source Matching

Matches transactions to emails when:
- Vendor keyword appears in email subject/sender
- Date within 14 days
- Has attachment (bonus)

## Resolution Commands

After finding a match:

```bash
# Mark as resolved (manual match)
curl -X POST http://localhost:3456/api/receipts/match \
  -H "Content-Type: application/json" \
  -d '{"receiptId": "abc123", "matchType": "manual"}'

# Skip (no receipt needed)
curl -X POST http://localhost:3456/api/receipts/skip \
  -H "Content-Type: application/json" \
  -d '{"receiptId": "abc123", "reason": "no_receipt_needed"}'
```

## Gamification

Resolving receipts earns points:
- Quick resolve (within 7 days): 10 points
- Backlog clear: 5 points
- Perfect week: 50 points bonus
- Streaks: 2-week (25), 4-week (75), 8-week (150)

View stats:
```bash
curl http://localhost:3456/api/receipts/score
curl http://localhost:3456/api/receipts/achievements
```

## Database Tables

- `receipt_matches` - Pending/resolved receipt items
- `receipt_match_history` - Resolution audit trail
- `receipt_gamification_stats` - Points and achievements
- `receipt_reconciliation_weeks` - Weekly completion tracking

## Files

| File | Purpose |
|------|---------|
| `scripts/lib/unified-receipt-search.mjs` | Unified search across sources |
| `scripts/lib/receipt-detector.mjs` | Detect missing receipts from Xero |
| `scripts/lib/receipt-matcher.mjs` | Match transactions to emails |
| `scripts/lib/receipt-ai-scorer.mjs` | AI confidence scoring |
| `scripts/lib/receipt-gamification.mjs` | Points and achievements |
| `scripts/receipt-reconciliation-agent.mjs` | Full CLI agent |

## Web Dashboard

Access the receipt dashboard at:
```
http://localhost:3001/finance/receipts
```

Features:
- Pending receipts queue with match suggestions
- Gamification stats (score, streak, achievements)
- Quick capture (upload, email forward)
- One-click resolve/skip actions

## Related

- `/finance/receipts` - React dashboard
- `/scan-subscriptions` - Subscription discovery
- `scripts/receipt-dashboard.mjs` - CLI dashboard
- `config/dext-supplier-rules.json` - Known vendor rules
