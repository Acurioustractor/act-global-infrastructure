# Plan: Remove Dext, Build Direct Gmail→AI→Xero Receipt Pipeline

**Mode:** HOLD SCOPE — Remove Dext bottleneck, build direct attachment upload, ship in 1-2 sessions.

## Problem

```
Current: Gmail → forward-to-dext.mjs → DEXT (MANUAL) → Xero (MANUAL) → Supabase
                                         ↑
                                    383 receipts stuck
                                    No Dext API exists
                                    Manual publish required
```

Dext is a $AUD/month subscription that adds a MANUAL step to an otherwise automated pipeline. It's the single point of failure causing:
- 383 receipts stuck in a black hole
- Receipt reconciliation gamification system rendered useless (bottleneck is upstream)
- Zero visibility into receipt processing status

## Target

```
New:     Gmail → capture-receipts.mjs → Supabase (receipt_emails) → AI match → Xero Attachments API
                                                                         ↓
                                                                    Auto-resolve (>80% confidence)
                                                                    Queue for review (<80%)
                                                                    Telegram notification (exceptions)
```

## What Already Exists (reuse, don't rebuild)

| Component | File | Status |
|-----------|------|--------|
| Gmail auth + vendor patterns (248) | `forward-receipts-to-dext.mjs` | **Redirect** — stop forwarding to Dext, save to Supabase instead |
| Weighted match scoring (vendor/amount/date/keyword) | `lib/receipt-matcher.mjs` | **Keep** — core matching engine |
| AI confidence scoring (Claude Haiku) | `lib/receipt-ai-scorer.mjs` | **Keep** — used for ambiguous matches |
| Xero OAuth2 with auto-refresh | `xero-auth.mjs` + `sync-xero-to-supabase.mjs` | **Extend** — add attachment upload |
| Xero transaction sync | `sync-xero-to-supabase.mjs` | **Keep** — already syncs has_attachments flag |
| Receipt match queue | `receipt_matches` table | **Keep** — already has statuses |
| Gamification | `lib/receipt-gamification.mjs` | **Keep** — works once bottleneck removed |
| Vendor categorization | `lib/receipt-detector.mjs` | **Keep** |

## Architecture

```
                    ┌────────────────────────┐
                    │   Gmail (4 mailboxes)   │
                    └───────────┬────────────┘
                                │ Gmail API search
                                ▼
                    ┌────────────────────────┐
                    │  capture-receipts.mjs  │  (renamed from forward-receipts-to-dext.mjs)
                    │  - Search vendor emails │
                    │  - Download attachments │
                    │  - Save to Supabase     │
                    └───────────┬────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  receipt_emails (NEW table)          │
              │  - gmail_message_id                  │
              │  - from, subject, date               │
              │  - vendor_name (detected)             │
              │  - amount (extracted)                  │
              │  - attachment_data (bytea or storage)  │
              │  - attachment_filename                 │
              │  - attachment_content_type             │
              │  - status: captured | matched | uploaded | failed │
              └───────────┬─────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────────────────┐
              │  match-receipts-to-xero.mjs         │
              │  (replaces match-dext-to-xero.mjs)  │
              │  1. Load unmatched receipt_emails    │
              │  2. Load unreceipted xero_transactions│
              │  3. Run receipt-matcher.mjs scoring  │
              │  4. AI score ambiguous matches       │
              │  5. Auto-resolve ≥80% confidence     │
              │  6. Queue <80% for human review      │
              └───────────┬─────────────────────────┘
                          │ ≥80% confidence
                          ▼
              ┌─────────────────────────────────────┐
              │  upload-receipts-to-xero.mjs        │
              │  Xero Attachments API:              │
              │  PUT /BankTransactions/{id}/         │
              │      Attachments/{filename}          │
              │  - Upload attachment from receipt_email│
              │  - Mark receipt_email status=uploaded │
              │  - Update receipt_matches status      │
              └─────────────────────────────────────┘
```

## Phase 1: Capture (redirect Gmail→Supabase instead of Gmail→Dext)

**Files changed:** `forward-receipts-to-dext.mjs` → rename to `capture-receipts.mjs`

**What changes:**
1. Remove the MIME-wrapping and forwarding logic (lines ~360-420)
2. Instead of forwarding to `nicmarchesi@dext.cc`, download the email's PDF/image attachments via Gmail API
3. Store in new `receipt_emails` table:
   - `gmail_message_id` (dedup key)
   - `mailbox` (which of the 4 accounts)
   - `from_email`, `subject`, `received_at`
   - `vendor_name` (from existing vendor pattern matching)
   - `amount_detected` (regex extract from subject/body — already in receipt-matcher.mjs)
   - `attachment_data` (bytea — PDFs typically <1MB)
   - `attachment_filename`, `attachment_content_type`
   - `status` enum: `captured` → `matched` → `uploaded` → `failed`
4. Keep the 248 vendor patterns — they're gold
5. Keep the dedup tracking (`forwarded_receipt_tracking` or equivalent)

**Migration SQL:**
```sql
CREATE TABLE receipt_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id text UNIQUE NOT NULL,
  mailbox text NOT NULL,
  from_email text,
  subject text,
  received_at timestamptz,
  vendor_name text,
  amount_detected numeric(10,2),
  attachment_url text,         -- Supabase Storage URL (not bytea)
  attachment_filename text,
  attachment_content_type text,
  xero_transaction_id text,    -- FK once matched
  xero_bank_transaction_id text, -- Xero BankTransactionID for API
  match_confidence numeric(5,2),
  match_method text,           -- 'auto_heuristic', 'auto_ai', 'manual'
  status text DEFAULT 'captured' CHECK (status IN ('captured', 'matched', 'uploaded', 'failed', 'no_match', 'skipped')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_receipt_emails_status ON receipt_emails(status);
CREATE INDEX idx_receipt_emails_vendor ON receipt_emails(vendor_name);
CREATE INDEX idx_receipt_emails_date ON receipt_emails(received_at);
```

**Decision: bytea vs Supabase Storage**
Use **Supabase Storage** (bucket: `receipt-attachments`). Reasons:
- PDFs can be 5-10MB; bytea bloats the DB
- Storage gives us direct URLs for Xero upload
- Can set lifecycle policies for old attachments

## Phase 2: Match (AI-powered receipt→transaction matching)

**Files changed:** `match-dext-to-xero.mjs` → rename to `match-receipts-to-xero.mjs`

**What changes:**
1. Source: `receipt_emails` WHERE status = 'captured' (instead of `dext_receipts`)
2. Target: `xero_transactions` WHERE type = 'SPEND' AND has_attachments = false
3. Run existing `receipt-matcher.mjs` scoring against each pair
4. For matches scoring 40-80%: run `receipt-ai-scorer.mjs` for AI confidence
5. Auto-resolve at ≥80% combined confidence → set status = 'matched', store xero_transaction_id
6. Queue <80% for human review → create `receipt_matches` entry with status = 'pending'
7. Update `receipt_emails.match_confidence` and `match_method`

**Improvement over current system:**
- Current: 30-40% confidence creates review fatigue
- New: AI scorer runs automatically on ALL ambiguous matches, not just manually triggered
- Two-pass: fast heuristic filter → AI deep analysis on survivors

## Phase 3: Upload (Xero Attachments API)

**New file:** `upload-receipts-to-xero.mjs`

**What it does:**
1. Query `receipt_emails` WHERE status = 'matched'
2. Download attachment from Supabase Storage
3. Upload to Xero via Attachments API:
   ```
   PUT https://api.xero.com/api.xro/2.0/BankTransactions/{BankTransactionID}/Attachments/{filename}
   Headers:
     Authorization: Bearer {token}
     xero-tenant-id: {tenant}
     Content-Type: {mime-type}  (application/pdf, image/jpeg, etc.)
   Body: raw file bytes
   ```
4. On success: set status = 'uploaded', log to `receipt_matches`
5. On failure: set status = 'failed', store error, retry up to 3x
6. After upload: re-sync that transaction from Xero to verify `has_attachments = true`

**Xero API notes:**
- Scope `accounting.transactions` (already have it) covers attachments
- Max attachment size: 10MB (PDFs usually <1MB)
- Rate limit: 60 calls/minute — batch with delays
- Returns: `{ "Attachments": [{ "AttachmentID": "...", "FileName": "...", ... }] }`

## Phase 4: Orchestration (cron + notifications)

**New file:** `receipt-pipeline.mjs` (orchestrator)

```
node scripts/receipt-pipeline.mjs          # Run full pipeline
node scripts/receipt-pipeline.mjs capture  # Just capture
node scripts/receipt-pipeline.mjs match    # Just match
node scripts/receipt-pipeline.mjs upload   # Just upload
node scripts/receipt-pipeline.mjs status   # Pipeline health
```

**Cron schedule (PM2):**
- `capture-receipts.mjs` — every 6 hours (4x/day)
- `match-receipts-to-xero.mjs` — daily at 7am AEST (after Xero sync at 6am)
- `upload-receipts-to-xero.mjs` — daily at 8am AEST (after matching)

**Telegram notifications:**
- Daily: "X receipts captured, Y matched, Z uploaded. W pending review."
- Exception: "Failed to upload receipt for [vendor] — [error]"

## Dext Migration (one-time)

1. Export all 383 Dext receipts as PDFs
2. Import into `receipt_emails` table with status = 'captured'
3. Run matching pipeline against existing Xero transactions
4. Cancel Dext subscription

## Error & Rescue Map

| Codepath | What Can Go Wrong | Rescue |
|----------|------------------|--------|
| Gmail attachment download | No attachment (text-only receipt email) | Skip, mark status='skipped', log reason |
| Gmail attachment download | Attachment too large (>10MB) | Skip, mark status='failed', Telegram alert |
| Gmail attachment download | Gmail API rate limit (429) | Backoff 30s, retry 3x |
| Supabase Storage upload | Bucket doesn't exist | Create bucket on first run |
| Supabase Storage upload | Storage quota exceeded | Alert, stop pipeline |
| Match scoring | No matching transactions found | Mark status='no_match', re-check next run |
| AI scorer | LLM timeout/error | Fall back to heuristic score only |
| AI scorer | Malformed JSON response | Parse error → use heuristic, log warning |
| Xero attachment upload | 401 expired token | Auto-refresh (existing logic), retry |
| Xero attachment upload | 429 rate limit | Backoff, batch with 1s delays |
| Xero attachment upload | Transaction not found (deleted in Xero) | Mark 'failed', log, skip |
| Xero attachment upload | Duplicate attachment | Check first, skip if exists |

## Native Integrations (Enable, Don't Build)

| Vendor | Items in Dext | Integration | Action |
|--------|--------------|-------------|--------|
| **Qantas** | 118 | Qantas Business Rewards → Xero (native on QBR website) | Enable in QBR account settings |
| **Uber** | 115 | Uber for Business → Xero Connect (free) | Enable in Uber for Business dashboard |

These two vendors = 233 items = 34% of stuck receipts. Zero code needed.

## NOT in Scope

- BAS prep automation (future — needs accountant input)
- Invoice matching (only bank transactions for now — invoices are a different flow)
- Receipt OCR/data extraction (Dext's main value-add — we skip this for now, let Xero handle it)
- Multi-currency handling (all AUD for now)
- Command Center UI for receipt review (keep using Telegram + CLI for now)

## Success Metrics

- Zero receipts stuck (vs 383 today)
- >80% auto-resolve rate (vs 0% today — everything manual)
- <5 min daily receipt triage (vs 30+ min today)
- Dext subscription cancelled ($AUD/month saved)
- `has_attachments` coverage on Xero SPEND transactions: target >90%

## Files Created/Modified Summary

| Action | File | Description |
|--------|------|-------------|
| **Rename** | `forward-receipts-to-dext.mjs` → `capture-receipts.mjs` | Gmail→Supabase instead of Gmail→Dext |
| **Rename** | `match-dext-to-xero.mjs` → `match-receipts-to-xero.mjs` | Match from receipt_emails instead of dext_receipts |
| **New** | `upload-receipts-to-xero.mjs` | Xero Attachments API upload |
| **New** | `receipt-pipeline.mjs` | Orchestrator (capture→match→upload) |
| **New** | `supabase/migrations/YYYYMMDD_receipt_emails.sql` | New table + storage bucket |
| **Modify** | `lib/receipt-matcher.mjs` | Accept receipt_emails format (minor) |
| **Modify** | PM2 ecosystem config | Add cron schedules |
| **Archive** | `forward-receipts-to-dext.mjs` | Move to archive/ |
| **Archive** | `match-dext-to-xero.mjs` | Move to archive/ |
