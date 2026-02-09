# Feature Plan: Receipt Reconciliation Intelligence System

Created: 2026-01-23
Author: architect-agent
Status: Draft

## Overview

An intelligent receipt reconciliation system for ACT that identifies Xero transactions/invoices missing receipts, searches across email archives for potential matches, presents a weekly review dashboard with gamification, and learns from user corrections. Since Dext has no public API, the approach is to surface matching suggestions for human-assisted upload to Dext.

## Requirements

- [ ] Identify transactions/invoices in Xero without receipts (has_attachments = false)
- [ ] Filter for relevant expense types (travel: flights, hotels, transport; subscriptions/software)
- [ ] Smart search across emails (communications_history) for receipt matches
- [ ] Use calendar events for travel context (location, dates)
- [ ] Weekly review dashboard presenting all unmatched expenses
- [ ] AI-scored confidence for email matches
- [ ] Gamification: points, streaks, progress tracking
- [ ] Project code intelligence with learning from corrections
- [ ] Weekly notification summary

## Design

### Architecture

```
                                    +----------------------+
                                    |   Weekly Scheduler   |
                                    |  (GitHub Actions)    |
                                    +----------+-----------+
                                               |
                                               v
+-----------------------------------------------------------------------+
|                   Receipt Reconciliation Agent                         |
|                   (receipt-reconciliation-agent.mjs)                   |
|                                                                        |
|  +--------------+  +--------------+  +--------------+  +------------+ |
|  |   Missing    |  |    Email     |  |   Calendar   |  |   Match    | |
|  |   Receipt    |-->   Searcher   |-->   Context    |-->   Scorer   | |
|  |   Detector   |  |              |  |   Enricher   |  |            | |
|  +--------------+  +--------------+  +--------------+  +-----+------+ |
|                                                              |        |
|  +--------------+  +--------------+  +--------------+       |        |
|  |   Project    |  | Gamification |  |   Weekly     |<------+        |
|  |   Tagger     |  |   Engine     |  |   Summary    |                |
|  +--------------+  +--------------+  +--------------+                |
+-----------------------------------------------------------------------+
                                               |
                                               v
+-----------------------------------------------------------------------+
|                           Supabase                                     |
|                                                                        |
|  +--------------+  +--------------+  +--------------+  +------------+ |
|  |   receipt_   |  |  user_gamif  |  |receipt_match |  |   xero_    | |
|  |   matches    |  |  _stats      |  |   _history   |  |  invoices  | |
|  +--------------+  +--------------+  +--------------+  +------------+ |
|                                                                        |
|  +--------------+  +--------------+  +--------------+                 |
|  |communications|  |  calendar_   |  |   project    |                 |
|  |   _history   |  |   events     |  |   _codes     |                 |
|  +--------------+  +--------------+  +--------------+                 |
+-----------------------------------------------------------------------+
```

### Data Flow

1. **Missing Receipt Detection**
   - Query `xero_transactions` (type=SPEND) and `xero_invoices` (type=ACCPAY)
   - Filter: has_attachments = false
   - Filter: expense type matches (travel vendors, subscription vendors)
   - Exclude: items older than 90 days, amounts < $10 AUD

2. **Smart Email Search** (for each missing receipt)
   - Search `communications_history` by vendor name fuzzy match
   - Search by amount (+/- 10%)
   - Search by date proximity (within 7 days)
   - Boost score if subject contains "receipt", "confirmation", "booking", "invoice"

3. **Calendar Context Enrichment**
   - For travel expenses, check `calendar_events` for location/date overlap
   - Extract attendee context (who was being met)
   - Use location to validate hotel/transport expenses

4. **AI Match Scoring**
   - Combine vendor match, amount match, date proximity, keywords
   - LLM analysis for complex cases (optional)
   - Store confidence scores (0-100)

5. **User Actions**
   - "Found it" -> mark resolved, award points
   - "No receipt exists" -> mark as no_receipt_needed
   - "Skip" -> defer to next week
   - User correction -> update project code, learn pattern

6. **Gamification Tracking**
   - Points awarded on actions
   - Streak calculation (consecutive weeks at 100%)
   - Progress bars for current week

### Interfaces

```typescript
// Receipt match candidate
interface ReceiptMatch {
  id: string;
  transaction_id: string;  // xero_transaction_id or xero_invoice_id
  transaction_type: 'transaction' | 'invoice';
  transaction_date: Date;
  vendor_name: string;
  amount: number;
  currency: string;
  
  // Suggested email matches
  suggested_emails: EmailMatch[];
  
  // Calendar context
  calendar_context: CalendarContext | null;
  
  // AI analysis
  ai_confidence: number;  // 0-100
  ai_reasoning: string;
  
  // User resolution
  status: 'pending' | 'resolved' | 'no_receipt' | 'deferred';
  resolved_at: Date | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  
  // Project tagging
  detected_project_code: string | null;
  user_project_code: string | null;
  effective_project_code: string;
  
  created_at: Date;
  updated_at: Date;
}

interface EmailMatch {
  communication_id: string;
  subject: string;
  preview: string;
  from_email: string;
  occurred_at: Date;
  match_score: number;  // 0-100
  match_reasons: string[];  // ['vendor_name', 'amount_close', 'date_near']
}

interface CalendarContext {
  event_id: string;
  event_title: string;
  event_date: Date;
  location: string | null;
  attendees: string[];
  relevance_score: number;
}

// Gamification
interface UserGamificationStats {
  user_id: string;
  
  // Points
  total_points: number;
  points_this_month: number;
  points_this_week: number;
  
  // Streaks
  current_streak_weeks: number;
  best_streak_weeks: number;
  last_perfect_week: Date | null;
  
  // Progress
  receipts_resolved_total: number;
  receipts_resolved_this_week: number;
  receipts_pending: number;
  
  // Achievements
  achievements: Achievement[];
  
  updated_at: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned_at: Date;
  icon: string;
}

// Point values
const POINTS = {
  QUICK_RESOLVE: 10,      // Resolved within 7 days of transaction
  BACKLOG_CLEAR: 5,       // Resolved older item
  PERFECT_WEEK: 50,       // All receipts cleared in a week
  NO_RECEIPT_NEEDED: 2,   // Correctly marked as not needing receipt
  PROJECT_TAG_CORRECT: 3, // Correctly tagged project on first try
};
```

### Vendor Classification

```typescript
// Known expense categories for filtering
const EXPENSE_CATEGORIES = {
  travel_flights: [
    'qantas', 'virgin', 'jetstar', 'rex', 'booking.com', 'expedia', 
    'flight centre', 'webjet', 'skyscanner'
  ],
  travel_hotels: [
    'airbnb', 'booking.com', 'hotels.com', 'agoda', 'trivago',
    'marriott', 'hilton', 'accor', 'ihg', 'quest'
  ],
  travel_transport: [
    'uber', 'didi', 'ola', '13cabs', 'taxi', 'avis', 'hertz',
    'budget', 'europcar', 'toll', 'linkt', 'etoll'
  ],
  subscriptions: [
    'adobe', 'microsoft', 'google', 'aws', 'vercel', 'netlify',
    'github', 'slack', 'notion', 'figma', 'canva', 'zoom',
    'dropbox', 'hubspot', 'mailchimp', 'klaviyo', 'stripe',
    'supabase', 'anthropic', 'openai', 'xero', 'dext'
  ]
};
```

## Database Schema

### New Tables

```sql
-- Receipt matches: tracks each unmatched expense and its potential email matches
CREATE TABLE receipt_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source transaction
  xero_id TEXT NOT NULL,  -- xero_transaction_id or xero_invoice_id
  source_type TEXT NOT NULL CHECK (source_type IN ('transaction', 'invoice')),
  transaction_date DATE NOT NULL,
  vendor_name TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'AUD',
  
  -- Expense categorization
  expense_category TEXT,  -- travel_flights, subscriptions, etc.
  
  -- Email match suggestions (stored as JSONB for flexibility)
  suggested_emails JSONB DEFAULT '[]',
  -- [{communication_id, subject, preview, from, occurred_at, match_score, match_reasons}]
  
  -- Calendar context
  calendar_context JSONB,
  -- {event_id, title, date, location, attendees, relevance_score}
  
  -- AI analysis
  ai_confidence INT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_reasoning TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  
  -- User resolution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'no_receipt', 'deferred')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  resolution_method TEXT,  -- 'email_found', 'manual_upload', 'not_needed', 'deferred'
  
  -- Project tagging
  detected_project_code TEXT,
  user_project_code TEXT,
  effective_project_code TEXT GENERATED ALWAYS AS (COALESCE(user_project_code, detected_project_code)) STORED,
  
  -- Points awarded
  points_awarded INT DEFAULT 0,
  
  -- Review tracking
  review_week DATE,  -- The Monday of the week this was surfaced
  times_deferred INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique per transaction
  UNIQUE(xero_id, source_type)
);

-- Indexes for efficient queries
CREATE INDEX idx_receipt_matches_status ON receipt_matches(status);
CREATE INDEX idx_receipt_matches_review_week ON receipt_matches(review_week);
CREATE INDEX idx_receipt_matches_vendor ON receipt_matches(vendor_name);
CREATE INDEX idx_receipt_matches_date ON receipt_matches(transaction_date DESC);
CREATE INDEX idx_receipt_matches_project ON receipt_matches(effective_project_code);

-- Gamification stats per user
CREATE TABLE user_gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,  -- email or user identifier
  
  -- Points
  total_points INT DEFAULT 0,
  points_this_month INT DEFAULT 0,
  points_this_week INT DEFAULT 0,
  
  -- Streaks
  current_streak_weeks INT DEFAULT 0,
  best_streak_weeks INT DEFAULT 0,
  last_perfect_week DATE,
  
  -- Counters
  receipts_resolved_total INT DEFAULT 0,
  receipts_resolved_this_week INT DEFAULT 0,
  receipts_pending INT DEFAULT 0,
  
  -- Achievements (JSONB array)
  achievements JSONB DEFAULT '[]',
  -- [{id, name, description, earned_at, icon}]
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- History of match resolutions for learning patterns
CREATE TABLE receipt_match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  match_id UUID REFERENCES receipt_matches(id),
  
  -- Action taken
  action TEXT NOT NULL,  -- 'resolved', 'no_receipt', 'deferred', 'project_corrected'
  action_details JSONB,
  
  -- User who took action
  user_id TEXT NOT NULL,
  
  -- Points awarded for this action
  points INT DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipt_match_history_match ON receipt_match_history(match_id);
CREATE INDEX idx_receipt_match_history_user ON receipt_match_history(user_id);

-- Weekly summary snapshots
CREATE TABLE receipt_reconciliation_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  week_start DATE UNIQUE NOT NULL,  -- Monday of the week
  
  -- Stats
  total_pending INT DEFAULT 0,
  total_resolved INT DEFAULT 0,
  total_no_receipt INT DEFAULT 0,
  total_deferred INT DEFAULT 0,
  
  -- Points awarded this week
  total_points_awarded INT DEFAULT 0,
  
  -- Users with perfect weeks
  perfect_week_users TEXT[] DEFAULT '{}',
  
  -- Summary notification sent
  notification_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Schema Modifications

```sql
-- Add has_attachments column to xero_invoices if missing
ALTER TABLE xero_invoices ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

-- Add has_attachments to xero_transactions (for consistency)
ALTER TABLE xero_transactions ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;
```

### Views

```sql
-- Current week's pending receipts
CREATE OR REPLACE VIEW v_pending_receipts AS
SELECT 
  rm.*,
  CASE 
    WHEN rm.ai_confidence >= 80 THEN 'high'
    WHEN rm.ai_confidence >= 50 THEN 'medium'
    ELSE 'low'
  END as match_confidence_level,
  CURRENT_DATE - rm.transaction_date as days_old
FROM receipt_matches rm
WHERE rm.status = 'pending'
ORDER BY rm.ai_confidence DESC, rm.amount DESC;

-- Gamification leaderboard
CREATE OR REPLACE VIEW v_gamification_leaderboard AS
SELECT
  user_id,
  total_points,
  current_streak_weeks,
  receipts_resolved_total,
  RANK() OVER (ORDER BY total_points DESC) as rank
FROM user_gamification_stats
ORDER BY total_points DESC;

-- Weekly progress
CREATE OR REPLACE VIEW v_weekly_progress AS
SELECT
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'no_receipt') as no_receipt,
  COUNT(*) FILTER (WHERE status = 'deferred') as deferred,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status != 'pending') / NULLIF(COUNT(*), 0), 1) as completion_pct
FROM receipt_matches
WHERE review_week = DATE_TRUNC('week', CURRENT_DATE)::DATE;
```

## Implementation Phases

### Phase 1: Database Foundation
**Estimated effort:** Small (1-2 hours)

**Files to create:**
- `supabase/migrations/20260124000000_receipt_reconciliation.sql` - All new tables
- `supabase/migrations/20260124000001_add_has_attachments.sql` - Schema fix

**Acceptance:**
- [ ] Tables created successfully
- [ ] has_attachments column exists on xero_invoices
- [ ] Views return expected data structure

### Phase 2: Missing Receipt Detection
**Estimated effort:** Medium (2-3 hours)

**Files to create:**
- `scripts/lib/receipt-detector.mjs` - Core detection logic

**Dependencies:** Phase 1

**Key functions:**
```javascript
// Detect missing receipts from recent transactions
async function detectMissingReceipts(options = { daysBack: 90 }) {}

// Categorize expense by vendor name
function categorizeExpense(vendorName) {}

// Check if expense type should be tracked (travel, subscriptions)
function isTrackableExpense(vendorName, amount) {}
```

**Acceptance:**
- [ ] Can query transactions/invoices without attachments
- [ ] Correctly categorizes travel and subscription expenses
- [ ] Excludes old items and low-value transactions

### Phase 3: Email Search & Matching
**Estimated effort:** Medium (3-4 hours)

**Files to create:**
- `scripts/lib/receipt-matcher.mjs` - Email search and scoring

**Dependencies:** Phase 2

**Key functions:**
```javascript
// Search emails for potential receipt matches
async function searchEmailsForReceipt(transaction) {}

// Score an email match
function scoreEmailMatch(email, transaction) {}

// Enrich with calendar context
async function addCalendarContext(transaction, matches) {}
```

**Matching algorithm:**
1. Vendor name fuzzy match (Levenshtein distance)
2. Amount within 10% tolerance
3. Date within 7 days
4. Keyword boost: "receipt", "confirmation", "booking", "invoice", "payment"
5. Calendar location match for travel

**Acceptance:**
- [ ] Email search returns relevant results
- [ ] Match scores are reasonable (test with known receipts)
- [ ] Calendar context enriches travel expenses

### Phase 4: AI Confidence Scoring
**Estimated effort:** Medium (2-3 hours)

**Files to create:**
- `scripts/lib/receipt-ai-scorer.mjs` - LLM-based confidence

**Dependencies:** Phase 3

**Key functions:**
```javascript
// Generate AI confidence score and reasoning
async function scoreMatchWithAI(transaction, emailMatches, calendarContext) {}
```

**Uses:** `scripts/lib/llm-client.mjs` (existing)

**Acceptance:**
- [ ] AI provides 0-100 confidence scores
- [ ] Reasoning is human-readable
- [ ] Cost-efficient (use gpt-4o-mini for most cases)

### Phase 5: Main Agent Script
**Estimated effort:** Medium (3-4 hours)

**Files to create:**
- `scripts/receipt-reconciliation-agent.mjs` - Main orchestration

**Dependencies:** Phases 2, 3, 4

**CLI commands:**
```bash
# Scan for missing receipts and create matches
node scripts/receipt-reconciliation-agent.mjs scan

# Show pending matches
node scripts/receipt-reconciliation-agent.mjs pending

# Mark resolved (awarded points)
node scripts/receipt-reconciliation-agent.mjs resolve <match-id> [notes]

# Mark no receipt needed
node scripts/receipt-reconciliation-agent.mjs no-receipt <match-id> [reason]

# Defer to next week
node scripts/receipt-reconciliation-agent.mjs defer <match-id>

# Update project code
node scripts/receipt-reconciliation-agent.mjs tag <match-id> <project-code>

# Show gamification stats
node scripts/receipt-reconciliation-agent.mjs stats [user]

# Generate weekly summary
node scripts/receipt-reconciliation-agent.mjs weekly-summary
```

**Acceptance:**
- [ ] All CLI commands work
- [ ] Creates receipt_matches records
- [ ] Updates gamification stats
- [ ] Logs to agent_audit_log

### Phase 6: Gamification Engine
**Estimated effort:** Small (2 hours)

**Files to create:**
- `scripts/lib/receipt-gamification.mjs` - Points and streaks

**Dependencies:** Phase 5

**Key functions:**
```javascript
// Award points for an action
async function awardPoints(userId, action, matchId) {}

// Update streak based on week completion
async function updateStreak(userId) {}

// Check and award achievements
async function checkAchievements(userId) {}

// Get user stats for display
async function getUserStats(userId) {}
```

**Achievement definitions:**
- "Receipt Rookie" - First receipt resolved
- "Week Warrior" - First perfect week
- "Streak Starter" - 2 consecutive perfect weeks
- "Streak Master" - 4 consecutive perfect weeks
- "Century Club" - 100 receipts resolved
- "Backlog Buster" - Clear 10 items older than 30 days

**Acceptance:**
- [ ] Points awarded correctly
- [ ] Streaks track week-over-week
- [ ] Achievements unlock appropriately

### Phase 7: Weekly Notifications
**Estimated effort:** Small (1-2 hours)

**Files to create:**
- `scripts/lib/receipt-notifications.mjs` - Discord/email summaries

**Dependencies:** Phase 6

**Key functions:**
```javascript
// Send weekly summary to Discord
async function sendWeeklySummary() {}

// Generate summary email (if email enabled)
async function generateWeeklyEmail(userId) {}
```

**Discord message format:**
```
Weekly Receipt Review

This Week's Stats:
- 12 pending receipts
- $3,450 total unmatched
- Top category: Travel (8)

Gamification:
- Current streak: 3 weeks
- Points this week: 45
- Total points: 892

Top pending:
1. Qantas - $580 (Jan 15) - 85% match
2. Adobe - $24.99 (Jan 18) - 92% match
3. Uber - $45.20 (Jan 20) - 78% match
```

**Acceptance:**
- [ ] Discord notification sends correctly
- [ ] Summary includes all relevant stats
- [ ] Links to dashboard (if available)

### Phase 8: GitHub Actions Workflow
**Estimated effort:** Small (1 hour)

**Files to create:**
- `.github/workflows/receipt-reconciliation.yml`

**Schedule:** Weekly on Monday at 9am AEST

**Workflow:**
1. Run `receipt-reconciliation-agent.mjs scan`
2. Run `receipt-reconciliation-agent.mjs weekly-summary`
3. Send Discord notification

**Acceptance:**
- [ ] Workflow triggers on schedule
- [ ] Completes without errors
- [ ] Discord notification received

### Phase 9: Dashboard API Endpoints (Optional)
**Estimated effort:** Medium (3-4 hours)

**Files to modify:**
- `packages/act-dashboard/api-server.mjs` - Add routes

**New endpoints:**
```
GET  /api/receipts/pending        - List pending matches
GET  /api/receipts/:id            - Get match details
POST /api/receipts/:id/resolve    - Mark resolved
POST /api/receipts/:id/no-receipt - Mark no receipt needed
POST /api/receipts/:id/defer      - Defer to next week
POST /api/receipts/:id/tag        - Update project code
GET  /api/receipts/stats          - Gamification stats
GET  /api/receipts/weekly         - Weekly summary
```

**Acceptance:**
- [ ] All endpoints return correct data
- [ ] Authentication works
- [ ] Points awarded through API actions

### Phase 10: Documentation
**Estimated effort:** Small (1 hour)

**Files to create:**
- `docs/RECEIPT_RECONCILIATION_GUIDE.md` - User guide
- Update `README.md` with new feature

**Acceptance:**
- [ ] Guide explains workflow
- [ ] CLI commands documented
- [ ] Gamification explained

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| xero_transactions | Internal | Source data |
| xero_invoices | Internal | Source data |
| communications_history | Internal | Email search |
| calendar_events | Internal | Travel context |
| ghl_contacts | Internal | Contact linking |
| project-codes.json | Internal | Project tagging |
| llm-client.mjs | Internal | AI scoring |
| discord-notify.mjs | Internal | Notifications |
| supabase-js | External | Database |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| has_attachments column missing | High | Migration to add column first |
| Email search too slow | Medium | Index optimization, limit results |
| AI scoring expensive | Medium | Use gpt-4o-mini, cache common patterns |
| User adoption low | Medium | Gamification, Discord reminders |
| False positive matches | Medium | Require human verification |
| Dext upload friction | Low | Clear instructions, link to Dext |

## Open Questions

- [ ] Should we integrate with Dext's email forwarding (receipts@inbox.dext.com)?
- [ ] Do we need separate user accounts or use a single "finance team" user?
- [ ] Should we OCR email attachments to extract amounts for better matching?
- [ ] What's the threshold for "low value" transactions to ignore?

## Success Criteria

1. Missing receipts are surfaced weekly with 80%+ relevant email matches
2. Gamification drives engagement (target: 90%+ weekly completion)
3. Project code suggestions are correct 70%+ of the time
4. Finance team reports time savings in receipt management
5. System learns from corrections (project tagging improves over time)

## File Summary

**New files to create:**
```
supabase/migrations/20260124000000_receipt_reconciliation.sql
supabase/migrations/20260124000001_add_has_attachments.sql
scripts/receipt-reconciliation-agent.mjs
scripts/lib/receipt-detector.mjs
scripts/lib/receipt-matcher.mjs
scripts/lib/receipt-ai-scorer.mjs
scripts/lib/receipt-gamification.mjs
scripts/lib/receipt-notifications.mjs
.github/workflows/receipt-reconciliation.yml
docs/RECEIPT_RECONCILIATION_GUIDE.md
```

**Files to modify:**
```
packages/act-dashboard/api-server.mjs (optional - Phase 9)
README.md (documentation update)
```

## Estimated Total Effort

| Phase | Effort | Hours |
|-------|--------|-------|
| Phase 1: Database | Small | 1-2 |
| Phase 2: Detection | Medium | 2-3 |
| Phase 3: Matching | Medium | 3-4 |
| Phase 4: AI Scoring | Medium | 2-3 |
| Phase 5: Main Agent | Medium | 3-4 |
| Phase 6: Gamification | Small | 2 |
| Phase 7: Notifications | Small | 1-2 |
| Phase 8: GitHub Actions | Small | 1 |
| Phase 9: Dashboard API | Medium | 3-4 (optional) |
| Phase 10: Documentation | Small | 1 |
| **Total** | | **19-26 hours** |

---

## Quick Start for Implementation

1. Create migrations (Phase 1)
2. Implement detection logic (Phase 2)
3. Build email matching (Phase 3)
4. Add AI scoring (Phase 4)
5. Create main agent script (Phase 5)
6. Add gamification (Phase 6)
7. Set up notifications (Phase 7)
8. Configure automation (Phase 8)
9. Document (Phase 10)
10. Dashboard API (Phase 9, if needed)

Ready for implementation. Start with Phase 1 to establish the database foundation.
