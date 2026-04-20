# Feature Plan: Spending Intelligence System
Created: 2026-04-13
Author: architect-agent

## Overview

A reconciliation and spending intelligence system for ACT that closes the gap between raw NAB Visa bank feed lines and receipt evidence. It auto-matches statement lines to receipts, tags charges to projects by vendor and location, tracks subscriptions, runs a weekly reconciliation loop, and produces a BAS readiness score. This replaces the current fragmented pipeline where `xero_transactions` only covers ~65% of actual card spend.

## What Already Exists (Do Not Rebuild)

| Component | Status | Location |
|-----------|--------|----------|
| `vendor_project_rules` table | Live, ~90 rules | Supabase (migration `20260214200000`) |
| `receipt_emails` table | Live, 1787 rows | Supabase |
| `bank_statement_lines` table | Live, 914 rows (Q2 FY26) | Supabase |
| `match-receipts-to-xero.mjs` | Working | `scripts/` — matches receipts to `xero_transactions` |
| `bas-completeness.mjs` | Working, 7-path classifier | `scripts/` — but operates on `xero_transactions`, not statement lines |
| `tag-xero-transactions.mjs` | Working | `scripts/` — tags via Xero API |
| `bank-receipt-reconcile.mjs` | Working | `scripts/` — reconciles bank txns to receipts via Xero API |
| `dext-supplier-rules.json` | Config | `config/` — vendor aliases and tracking codes |
| `xero-bank-rules.json` | Config | `config/` — auto-reconciliation rules |
| `gmail-vendor-queries.mjs` | Shared lib | `scripts/lib/` — Gmail search patterns per vendor |
| `scripts/lib/finance/` | Shared modules | common.mjs, classify.mjs, reconcile.mjs, xero-client.mjs |
| Telegram bot | Working | `src/lib/telegram/bot.ts` |

**Key insight:** The existing `match-receipts-to-xero.mjs` matching engine (Dice coefficient bigrams, date scoring, amount scoring) is solid. The new system should reuse these scoring functions, not rewrite them. The gap is that it matches against `xero_transactions` (reconciled only) instead of `bank_statement_lines` (everything).

## Requirements

- [ ] Auto-match `bank_statement_lines` to `receipt_emails` (amount, date, vendor fuzzy)
- [ ] Auto-tag statement lines to project codes using vendor + location rules
- [ ] Identify and track recurring subscriptions
- [ ] Weekly reconciliation cron with Telegram summary
- [ ] BAS readiness score operating on statement lines (not xero_transactions)
- [ ] Manual override UI for project tags and matches
- [ ] GST threshold ($82.50) flagging for missing receipts

## Design

### Architecture

```
bank_statement_lines (source of truth — all card charges)
       |
       ├── statement_receipt_matches (links to receipt_emails)
       ├── project_code (via vendor_project_rules + location_rules)
       ├── subscription_patterns (recurring charge detection)
       |
       └── Weekly cron → Telegram summary
           └── BAS readiness score per quarter
```

### Data Model Changes

#### 1. Add columns to `bank_statement_lines` (ALTER TABLE, not new table)

```sql
ALTER TABLE bank_statement_lines ADD COLUMN IF NOT EXISTS
  project_code TEXT,                    -- ACT-IN, ACT-HV, ACT-GD, etc.
  project_source TEXT DEFAULT 'auto',   -- 'auto' | 'manual' | 'location' | 'vendor_rule'
  receipt_match_id UUID,                -- FK to receipt_emails.id
  receipt_match_score NUMERIC(4,2),     -- 0.00–1.00 confidence
  receipt_match_status TEXT DEFAULT 'unmatched',  -- 'matched' | 'unmatched' | 'ambiguous' | 'no_receipt_needed'
  subscription_group_id UUID,           -- FK to subscription_patterns.id
  xero_transaction_id TEXT,             -- Link back to xero_transactions if reconciled
  notes TEXT;                           -- Manual notes
```

#### 2. New table: `location_project_rules`

Vendor rules exist but location-based rules do not. Card charges include merchant city/suburb in `particulars` which is a strong signal for project tagging.

```sql
CREATE TABLE location_project_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_pattern TEXT NOT NULL,       -- 'MINCHINBURY', 'SEVEN HILLS', 'GARBUTT', 'ALICE SPRINGS'
  project_code TEXT NOT NULL,           -- ACT-MY, ACT-HV, ACT-GD, etc.
  notes TEXT,                           -- 'Mounty Yarns site', 'Townsville Harvest', etc.
  priority INTEGER DEFAULT 10,         -- Higher wins if multiple match
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data (from memory + statement line analysis)
INSERT INTO location_project_rules (location_pattern, project_code, notes) VALUES
  ('MINCHINBURY', 'ACT-MY', 'Mounty Yarns shed build site'),
  ('SEVEN HILLS', 'ACT-MY', 'Kennards Seven Hills — Mounty equipment'),
  ('SMITHFIELD', 'ACT-MY', 'Container Options Smithfield'),
  ('GARBUTT', 'ACT-HV', 'Townsville — Harvest related'),
  ('TOWNSVILLE', 'ACT-HV', 'Townsville — Harvest related'),
  ('ZILLMERE', 'ACT-PI', 'Hatch Electrical Zillmere — PICC'),
  ('ALICE SPRINGS', 'ACT-GD', 'Goods on Country — Alice Springs'),
  ('MALENY', 'ACT-HV', 'Harvest Witta — Sunshine Coast hinterland'),
  ('WITTA', 'ACT-HV', 'Harvest Witta site'),
  ('MAPLETON', 'ACT-HV', 'Near Harvest Witta'),
  ('MONTVILLE', 'ACT-HV', 'Near Harvest Witta'),
  ('COLAC', 'ACT-IN', 'General travel — Victoria'),
  ('MASCOT', 'ACT-IN', 'Sydney Airport — general travel'),
  ('BADUNG', 'ACT-IN', 'Bali — general travel'),
  ('JAKARTA', 'ACT-IN', 'Indonesia — general travel');
```

#### 3. New table: `subscription_patterns`

```sql
CREATE TABLE subscription_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_pattern TEXT NOT NULL,         -- Regex/contains pattern for matching statement lines
  expected_amount NUMERIC(10,2),        -- Expected charge amount
  amount_tolerance NUMERIC(4,2) DEFAULT 0.10,  -- 10% tolerance
  frequency TEXT DEFAULT 'monthly',     -- 'monthly' | 'annual' | 'quarterly'
  expected_day_of_month INTEGER,        -- NULL if variable
  receipt_email TEXT,                   -- Which mailbox receipts arrive at
  project_code TEXT DEFAULT 'ACT-IN',
  category TEXT DEFAULT 'Software & Subscriptions',
  no_receipt_needed BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  last_seen_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed from existing dext-supplier-rules.json subscriptions
INSERT INTO subscription_patterns (vendor_name, vendor_pattern, expected_amount, project_code, receipt_email) VALUES
  ('Notion Labs', 'NOTION', 163.34, 'ACT-IN', 'benjamin@act.place'),
  ('OpenAI', 'OPENAI', 62.89, 'ACT-IN', 'benjamin@act.place'),
  ('Anthropic', 'ANTHROPIC', 17.01, 'ACT-IN', 'benjamin@act.place'),
  ('Webflow', 'WEBFLOW', 78.82, 'ACT-IN', 'benjamin@act.place'),
  ('Xero', 'XERO', 75.00, 'ACT-IN', 'accounts@act.place'),
  ('Descript', 'DESCRIPT', 447.62, 'ACT-IN', 'benjamin@act.place'),
  ('Adobe', 'ADOBE', 50.00, 'ACT-IN', 'benjamin@act.place'),
  ('Vercel', 'VERCEL', 20.00, 'ACT-IN', 'benjamin@act.place'),
  ('Supabase', 'SUPABASE', 25.00, 'ACT-IN', 'benjamin@act.place'),
  ('GoHighLevel', 'HIGHLEVEL', 497.00, 'ACT-IN', 'benjamin@act.place'),
  ('GitHub', 'GITHUB', 10.00, 'ACT-IN', 'benjamin@act.place'),
  ('Audible', 'AUDIBLE', 16.45, 'ACT-IN', 'benjamin@act.place'),
  ('Apple', 'APPLE PTY', 13.49, 'ACT-IN', 'benjamin@act.place');
```

### Matching Algorithm

The matcher runs against `bank_statement_lines` (not `xero_transactions`). It produces a score from 0-1 using three weighted signals.

**Reuse from `match-receipts-to-xero.mjs`:**
- `similarity(a, b)` — Dice coefficient on bigrams
- `vendorMatch(receiptVendor, xeroContact, aliasMap)` — vendor fuzzy with alias lookup
- `dateScore(receiptDate, xeroDate)` — 0-1 score with day windows
- `amountScore(receiptAmount, xeroAmount)` — 0-1 score with % tolerance

**New: Extract these into `scripts/lib/finance/matching.mjs` (shared module)**

```javascript
// Composite score
function matchScore(statementLine, receipt) {
  const vendor = vendorMatch(
    receipt.vendor_name,
    statementLine.payee,
    aliasMap
  );                                    // weight: 0.40
  const date = dateScore(
    receipt.received_at,
    statementLine.date
  );                                    // weight: 0.25
  const amount = amountScore(
    receipt.amount_detected,
    statementLine.amount
  );                                    // weight: 0.35

  // GST tolerance: if amounts differ by exactly 1/11 (~9.09%), boost
  const gstAdjusted = gstToleranceBoost(receipt.amount_detected, statementLine.amount);

  const raw = (vendor * 0.40) + (date * 0.25) + (amount * 0.35);
  return Math.min(1, raw + gstAdjusted);
}

// GST tolerance: card charges are inc GST, some receipts show ex GST
function gstToleranceBoost(receiptAmt, stmtAmt) {
  if (!receiptAmt || !stmtAmt) return 0;
  const r = Math.abs(parseFloat(receiptAmt));
  const s = Math.abs(parseFloat(stmtAmt));
  const withGST = r * 1.1;
  const withoutGST = r / 1.1;
  if (Math.abs(withGST - s) / s < 0.02) return 0.15;  // Receipt is ex GST
  if (Math.abs(withoutGST - s) / s < 0.02) return 0.15;  // Receipt is inc GST
  return 0;
}
```

**Classification thresholds:**
- Score >= 0.80: `matched` (auto-apply)
- Score 0.50-0.79: `ambiguous` (queue for human review)
- Score < 0.50: `unmatched`

**Pre-filter for performance:** Only score receipt candidates where:
- Date within 14-day window of statement line
- Amount within 50% of statement line amount (rough filter before precise scoring)

### Project Tagging Logic

Resolution order (first match wins):
1. **Manual override** — if `project_source = 'manual'`, never overwrite
2. **Vendor rule** — lookup `vendor_project_rules` by payee (exact or alias match)
3. **Location rule** — scan `particulars` for `location_project_rules` patterns
4. **Subscription pattern** — if matches a subscription, use its project_code
5. **Default** — leave NULL, flag for human review

```javascript
function resolveProjectCode(line, vendorRules, locationRules, subscriptions) {
  // 1. Skip manual overrides
  if (line.project_source === 'manual') return null;

  // 2. Vendor rules (existing table)
  const payeeLower = (line.payee || '').toLowerCase();
  for (const rule of vendorRules) {
    const names = [rule.vendor_name.toLowerCase(), ...(rule.aliases || []).map(a => a.toLowerCase())];
    if (names.some(n => payeeLower.includes(n) || n.includes(payeeLower))) {
      return { code: rule.project_code, source: 'vendor_rule' };
    }
  }

  // 3. Location rules (new table)
  const partLower = (line.particulars || '').toLowerCase();
  const matched = locationRules
    .filter(r => partLower.includes(r.location_pattern.toLowerCase()))
    .sort((a, b) => b.priority - a.priority);
  if (matched.length > 0) {
    return { code: matched[0].project_code, source: 'location' };
  }

  // 4. Subscription match
  for (const sub of subscriptions) {
    if (partLower.includes(sub.vendor_pattern.toLowerCase()) || payeeLower.includes(sub.vendor_pattern.toLowerCase())) {
      return { code: sub.project_code, source: 'subscription' };
    }
  }

  return null; // unresolved
}
```

### No-Receipt-Needed Classification

Reuse from `bas-completeness.mjs` but extend to statement lines:
- Bank fees (NAB INTNL TRAN FEE, MERCHANT FEE, etc.)
- Bank transfers (INTERNET PAYMENT Linked Acc Trns)
- Charges under $10 from payment processors (GoPayID, etc.)
- Any vendor with `no_receipt_required: true` in dext-supplier-rules.json

### Data Flow

```
1. INGEST (manual, weekly)
   Paste Xero bank feed → ingest-statement-lines-raw.mjs → bank_statement_lines

2. CLASSIFY (automated, on ingest)
   For each new/unmatched statement line:
   a. Check if no-receipt-needed → set receipt_match_status
   b. Resolve project code → set project_code + project_source
   c. Check subscription patterns → set subscription_group_id
   d. Score against receipt_emails pool → set receipt_match_id + score + status

3. REPORT (weekly cron)
   Generate gap report → send via Telegram
   Include: matched %, unmatched list, missing receipts > $82.50, new subscriptions

4. BAS READINESS (quarterly, on demand)
   bas-completeness.mjs refactored to use bank_statement_lines as base
   Coverage paths remain the same 7 but source changes from xero_transactions
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| `bank_statement_lines` table | Internal, exists | Source of truth for card charges |
| `receipt_emails` table | Internal, exists | Receipt pool |
| `vendor_project_rules` table | Internal, exists | Vendor-to-project mapping |
| `match-receipts-to-xero.mjs` | Internal, exists | Scoring functions to extract |
| `bas-completeness.mjs` | Internal, exists | 7-path classifier to refactor |
| `scripts/lib/finance/common.mjs` | Internal, exists | Supabase client, logging, retry |
| `scripts/lib/telegram.mjs` | Internal, exists | Telegram notifications |
| `dext-supplier-rules.json` | Config, exists | Vendor aliases |
| Xero API | External | Still needed for attaching receipts (not for reading statement lines) |

## Implementation Phases

### Phase 1: Schema + Shared Matching Module
**Estimated effort:** Small (1 session)

**Files to create:**
- `supabase/migrations/20260414000000_spending_intelligence.sql` — ALTER bank_statement_lines, CREATE location_project_rules, CREATE subscription_patterns
- `scripts/lib/finance/matching.mjs` — Extract scoring functions from match-receipts-to-xero.mjs

**Files to modify:**
- None yet

**Acceptance:**
- [ ] Migration applies cleanly
- [ ] `matching.mjs` exports: `similarity`, `vendorMatch`, `dateScore`, `amountScore`, `matchScore`, `gstToleranceBoost`
- [ ] Existing `match-receipts-to-xero.mjs` can import from `matching.mjs` without breaking

### Phase 2: Statement Line Matcher
**Estimated effort:** Medium (1-2 sessions)

**Files to create:**
- `scripts/match-statements-to-receipts.mjs` — Main matcher script

**Behaviour:**
```
node scripts/match-statements-to-receipts.mjs              # Dry run, current quarter
node scripts/match-statements-to-receipts.mjs --apply       # Write matches to DB
node scripts/match-statements-to-receipts.mjs --quarter Q2  # Specific quarter
node scripts/match-statements-to-receipts.mjs --verbose     # Show scoring details
```

Steps:
1. Load all `bank_statement_lines` where `receipt_match_status != 'matched'` and `receipt_match_status != 'no_receipt_needed'`
2. Load all `receipt_emails` in same date range (±14 days)
3. Load `vendor_project_rules` for alias map
4. For each statement line, score against all receipt candidates
5. Apply thresholds: matched/ambiguous/unmatched
6. With `--apply`: write `receipt_match_id`, `receipt_match_score`, `receipt_match_status` to DB
7. Print summary: X matched, Y ambiguous, Z unmatched, $V value covered

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Runs clean on Q2 FY26 914 statement lines
- [ ] Correctly handles GST tolerance (inc/ex GST receipt vs charge)
- [ ] Ambiguous matches shown with top-3 candidates
- [ ] Does not double-match (one receipt = one statement line)

### Phase 3: Project Tagger
**Estimated effort:** Small (1 session)

**Files to create:**
- `scripts/tag-statement-lines.mjs` — Project code tagger for statement lines

**Behaviour:**
```
node scripts/tag-statement-lines.mjs              # Dry run
node scripts/tag-statement-lines.mjs --apply       # Write to DB
node scripts/tag-statement-lines.mjs --untagged    # Only show unresolved
```

Steps:
1. Load `vendor_project_rules`, `location_project_rules`, `subscription_patterns`
2. For each statement line where `project_code IS NULL` or `project_source != 'manual'`
3. Apply resolution chain: vendor → location → subscription → NULL
4. With `--apply`: write `project_code` and `project_source`
5. Report: X tagged by vendor, Y by location, Z by subscription, W unresolved

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Correctly tags Bunnings MINCHINBURY → ACT-MY (not ACT-IN which is the vendor_project_rules default)
- [ ] Hatch Electrical ZILLMERE → ACT-PI
- [ ] Maleny Hardware → ACT-HV
- [ ] Manual overrides preserved
- [ ] Location rules override vendor rules for ambiguous vendors (Bunnings at specific locations)

**Note on vendor vs location precedence for multi-location vendors:**
Bunnings has `project_code: ACT-IN` in vendor_project_rules (default). But Bunnings MINCHINBURY should be ACT-MY. The resolution order should be: vendor rule first, THEN check if location provides a more specific tag. For vendors where `vendor_project_rules.project_code` matches a generic code (ACT-IN) AND a location rule also matches, prefer the location rule. This needs a `generic_project` flag on vendor_project_rules or a simple list of "generic" codes where location should override.

### Phase 4: Subscription Tracker
**Estimated effort:** Small (1 session)

**Files to create:**
- `scripts/detect-subscriptions.mjs` — Scan statement lines for recurring patterns

**Behaviour:**
```
node scripts/detect-subscriptions.mjs             # Discover patterns
node scripts/detect-subscriptions.mjs --apply      # Seed subscription_patterns table
node scripts/detect-subscriptions.mjs --audit      # Check for missing receipts per subscription
```

Steps:
1. Group statement lines by vendor (normalized payee)
2. For vendors with 2+ charges: check if amounts are similar (within 10%) and dates are ~30 days apart
3. Calculate: avg amount, frequency, typical day-of-month
4. Cross-reference with existing `subscription_patterns` seeds
5. Flag: new subscriptions not in the table, subscriptions that stopped, price changes
6. With `--audit`: for each subscription, check if matching receipt exists in `receipt_emails`

**Dependencies:** Phase 1

**Acceptance:**
- [ ] Detects all 13 known subscriptions from dext-supplier-rules.json
- [ ] Flags new subscriptions not in seed data
- [ ] Reports missing receipt months per subscription

### Phase 5: Weekly Reconciliation Loop + BAS Readiness
**Estimated effort:** Medium (1-2 sessions)

**Files to create:**
- `scripts/weekly-reconciliation.mjs` — Orchestrator script (run by cron)

**Files to modify:**
- `scripts/bas-completeness.mjs` — Add option to use `bank_statement_lines` as source

**Behaviour:**
```
node scripts/weekly-reconciliation.mjs                # Full run
node scripts/weekly-reconciliation.mjs --dry-run       # Report only
node scripts/weekly-reconciliation.mjs --telegram       # Send summary to Telegram
```

Steps:
1. Run `tag-statement-lines.mjs --apply`
2. Run `match-statements-to-receipts.mjs --apply`
3. Run `detect-subscriptions.mjs --audit`
4. Calculate BAS readiness score for current quarter:
   - Total statement lines (debits only, excluding BASEXCLUDED)
   - Matched to receipts: count + $ value
   - No-receipt-needed: count + $ value
   - Unmatched > $82.50: list with vendor + amount
   - Coverage % by count and by value
5. Generate Markdown report to `thoughts/shared/reports/`
6. Send Telegram summary: "Week of Apr 14: 87% covered by value. 12 charges need receipts ($4,230). 3 new subscription charges detected."

**Cron via PM2:** Add to `ecosystem.config.cjs` — run every Monday at 7am AEST.

**Dependencies:** Phases 2, 3, 4

**Acceptance:**
- [ ] Full pipeline completes in < 2 minutes
- [ ] Telegram message sent with actionable summary
- [ ] BAS readiness score matches manual calculation within 2%
- [ ] Report saved to thoughts/shared/reports/

## Project Tagging: Vendor vs Location Override Logic

This is the trickiest design decision. Here's the resolution:

```
IF vendor_project_rules match exists:
  IF the matched rule has `auto_apply = true` AND project_code is NOT generic (ACT-IN):
    → Use vendor rule (specific vendor = specific project, e.g., Defy = ACT-GD)
  ELSE IF project_code IS generic (ACT-IN) AND location rule matches:
    → Use location rule (more specific signal)
  ELSE:
    → Use vendor rule
ELSE IF location rule matches:
  → Use location rule
ELSE:
  → Leave untagged
```

**Generic codes (location can override):** `ACT-IN`
**Specific codes (location cannot override):** Everything else (ACT-GD, ACT-HV, ACT-MY, ACT-PI, ACT-JH, etc.)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Statement line ingestion is manual (Xero UI paste) | Medium — weekly effort | Build robust parser in `ingest-statement-lines-raw.mjs` (exists). Future: Playwright automation for Xero UI |
| Duplicate matches (one receipt matched to two similar charges) | Medium | Greedy 1:1 matching — sort candidates by score, assign best match, remove from pool |
| Location patterns too broad ("SYDNEY" tags everything) | Low | Only seed specific suburbs/areas, not major cities. Priority field allows override |
| GST rounding creates false negatives | Low | GST tolerance boost in scorer already handles this |
| vendor_project_rules defaults are wrong for multi-location vendors | Medium | Override logic in Phase 3 handles this. Document for manual review |

## Open Questions

- [ ] Should the BAS readiness refactor replace `xero_transactions` entirely or run both paths? (Recommendation: run both, show delta, migrate fully after 1 quarter of validation)
- [ ] Should `bank_statement_lines` ingest be extended to other bank accounts beyond NAB Visa? (Not now — Visa is the primary unreconciled gap)
- [ ] Should location_project_rules be a DB table or a JSON config file? (Recommendation: DB table — allows manual edits via Supabase dashboard without code changes, and can be managed via the same vendor-rules API route)

## Success Criteria

1. For Q2 FY26 (914 existing statement lines): >80% matched to receipts by value
2. >90% of statement lines auto-tagged to correct project code
3. All 13 known subscriptions detected and tracked
4. Weekly report runs end-to-end in < 2 minutes
5. BAS readiness score within 2% of manual calculation
6. Zero manual work required for subscription + bank fee categorization
