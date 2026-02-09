# Feature Plan: Real-Time Integration Layer

Created: 2026-01-30
Author: architect-agent

## Overview

The ACT ecosystem currently relies on batch syncs (GitHub Actions cron every 6-24 hours, PM2 cron every 15 minutes) to move data between GoHighLevel, Xero, Notion, Gmail, iMessage, and Supabase. The founder reports "data not fresh enough." This plan introduces a real-time integration layer using webhook receivers, intelligent polling, and a Supabase-native event bus to bring data freshness from hours to seconds for webhook-capable services and minutes for poll-based services.

## Requirements

- [ ] GHL contact/opportunity changes appear in Supabase within 30 seconds
- [ ] Xero invoice/payment changes appear within 5 minutes
- [ ] Notion project updates appear within 15 minutes
- [ ] Gmail emails appear within 5 minutes
- [ ] iMessage sync remains at 15-minute cadence (local-only, no webhook possible)
- [ ] Dashboard consumers get push updates via Supabase Realtime
- [ ] All existing batch scripts continue to work as fallback/reconciliation
- [ ] Cultural protocol enforcement (BLOCKED_FIELDS_TO_GHL) preserved
- [ ] Error handling with exponential backoff and dead letter queue
- [ ] Observable: every sync event logged with latency metrics

## Current State Analysis (VERIFIED)

### Existing Sync Scripts and Schedules

| Integration | Script | Current Schedule | Trigger |
|-------------|--------|-----------------|---------|
| GHL -> Supabase | `sync-ghl-to-supabase.mjs` | Every 6h (GH Actions) + daily consolidated | Cron |
| GHL -> Notion | `sync-ghl-to-notion.mjs` | Every 6h (GH Actions) | Cron |
| Xero -> Supabase | `sync-xero-to-supabase.mjs` | Daily 6AM AEST (GH Actions) | Cron |
| Notion -> Supabase | `sync-notion-to-supabase.mjs` | Every 6h (GH Actions) | Cron |
| Gmail -> Supabase | `sync-gmail-to-supabase.mjs` | Daily (GH Actions) | Cron |
| iMessage -> Supabase | `sync-imessage.mjs` | Every 15min (PM2 local) | PM2 cron |
| Storytellers -> GHL | `sync-storytellers-to-ghl.mjs` | Daily 4:30AM (PM2 local) | PM2 cron |
| Calendar -> Supabase | `sync-calendar-full.mjs` | Daily (GH Actions) | Cron |
| Discord | `discord-notify.mjs` | Event-driven (outbound only) | Called by scripts |

### Existing Patterns (VERIFIED from code)

1. **Supabase client**: All scripts use `@supabase/supabase-js` with `SUPABASE_SHARED_URL` + `SUPABASE_SHARED_SERVICE_ROLE_KEY`
2. **Upsert-on-conflict**: GHL uses `onConflict: 'ghl_id'`, Xero uses `onConflict: 'xero_id'`
3. **Sync logs**: GHL writes to `ghl_sync_log`, Xero to `xero_sync_log`
4. **Stats tracking**: All scripts track created/updated/errors counts
5. **Cultural protocol**: GHL script enforces `BLOCKED_FIELDS_TO_GHL` array
6. **Token management**: Xero has OAuth refresh with local file + Supabase token storage
7. **Discord notifications**: Gmail sync already posts completion embeds to Discord
8. **Sync state**: iMessage uses `sync_state` table with `last_sync_token` for incremental sync
9. **Rate limiting**: GHL service has 100ms minimum between requests (10 req/sec)
10. **Next.js API routes**: Already exist at `apps/command-center-v2/src/app/api/` for receipts and knowledge

### External API Webhook Capabilities

| Service | Webhook Support | Details |
|---------|----------------|---------|
| **GoHighLevel** | YES - rich webhooks | Supports contact.create, contact.update, contact.delete, opportunity.create, opportunity.update, opportunity.status_change, note.create, task.create. Configure at Settings > Webhooks in GHL dashboard. Sends JSON POST with full entity payload. |
| **Xero** | YES - limited | Xero Webhooks send notifications when resources change (invoices, contacts, bank transactions). Must register webhook URL via API, validate with Intent to Receive challenge (HMAC-SHA256). Payload contains only resource IDs - you must fetch the full record separately. Rate limit: unclear but generous. |
| **Notion** | NO - polling only | Notion has no webhook support. Must poll using `filter.timestamp("last_edited_time").after(since)`. The `sync-notion-to-supabase.mjs` already uses this pattern. |
| **Gmail** | YES - push notifications | Google Gmail API supports push notifications via Cloud Pub/Sub. Requires GCP project with Pub/Sub topic + subscription. Sends `historyId` changes, then you fetch new messages. Complex setup but enables near-real-time. |
| **iMessage** | NO - local database only | Reads from `~/Library/Messages/chat.db` SQLite. No API or webhook. Must remain poll-based from local machine only. |
| **Google Calendar** | YES - push notifications | Similar to Gmail, uses Google Push Notifications (webhook to your URL). Sends channel notifications on event changes. |

## Design

### Architecture

```
                    External Services
                    ================
                    
  GHL Webhooks ──────┐
  Xero Webhooks ─────┤
  Gmail Push ─────────┤     Next.js API Routes
  Calendar Push ──────┤     (apps/command-center-v2/src/app/api/webhooks/)
                      │     ┌──────────────────────────┐
                      ├────>│ /api/webhooks/ghl        │──┐
                      │     │ /api/webhooks/xero       │  │
                      │     │ /api/webhooks/gmail      │  │
                      │     │ /api/webhooks/calendar   │  │
                      │     └──────────────────────────┘  │
                      │                                    │
                      │     ┌──────────────────────────┐  │
                      │     │   Webhook Processor      │<─┘
                      │     │   (shared lib)           │
                      │     │                          │
                      │     │  - Validate signatures   │
                      │     │  - Transform payload     │
                      │     │  - Cultural protocol     │
                      │     │  - Upsert to Supabase    │
                      │     │  - Write to event_log    │
                      │     │  - Notify via Realtime   │
                      │     └──────────┬───────────────┘
                      │                │
                      │                v
                      │     ┌──────────────────────────┐
                      │     │   Supabase               │
                      │     │                          │
                      │     │  Tables:                 │
                      │     │  - ghl_contacts          │
                      │     │  - ghl_opportunities     │
                      │     │  - xero_invoices         │
                      │     │  - xero_transactions     │
                      │     │  - integration_events    │<── Event Bus
                      │     │  - webhook_delivery_log  │
                      │     │                          │
                      │     │  Realtime:               │
                      │     │  - integration_events    │──> Dashboard (live)
                      │     └──────────────────────────┘
                      │
  Notion (poll) ──────┤     ┌──────────────────────────┐
  iMessage (poll) ────┤     │   Polling Service        │
                      ├────>│   (Edge Functions or     │
                      │     │    PM2 local cron)       │
                      │     │                          │
                      │     │  - Notion: 15min poll    │
                      │     │  - iMessage: 15min PM2   │
                      │     └──────────────────────────┘
                      │
                      │     ┌──────────────────────────┐
                      │     │   Reconciliation Layer   │
                      │     │   (existing GH Actions)  │
                      │     │                          │
                      │     │  - Full sync every 24h   │
                      │     │  - Detect drift/gaps     │
                      │     │  - Backfill missed       │
                      │     └──────────────────────────┘
```

### Event Bus: Supabase Realtime on `integration_events`

Rather than building a custom event bus, leverage Supabase Realtime (already available). Every webhook/poll write also inserts a row into `integration_events`. Dashboard clients subscribe to this table via Supabase Realtime channels.

```sql
-- New table: integration event bus
CREATE TABLE integration_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,           -- 'ghl', 'xero', 'notion', 'gmail', 'imessage', 'calendar'
  event_type TEXT NOT NULL,       -- 'contact.updated', 'invoice.created', etc.
  entity_type TEXT NOT NULL,      -- 'contact', 'invoice', 'opportunity', etc.
  entity_id TEXT NOT NULL,        -- External ID (ghl_id, xero_id, etc.)
  supabase_id UUID,              -- Internal Supabase row ID after upsert
  payload JSONB,                  -- Summary payload (NOT full record - for notifications)
  triggered_by TEXT DEFAULT 'webhook',  -- 'webhook', 'poll', 'reconciliation'
  latency_ms INTEGER,            -- Time from external event to our processing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dashboard queries
CREATE INDEX idx_integration_events_source ON integration_events(source, created_at DESC);
CREATE INDEX idx_integration_events_entity ON integration_events(entity_type, entity_id);

-- Auto-cleanup: keep 30 days of events
-- (Supabase pg_cron or manual cleanup script)

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE integration_events;
```

```sql
-- Webhook delivery tracking for reliability
CREATE TABLE webhook_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  webhook_id TEXT,                -- External webhook delivery ID if available
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',  -- 'received', 'processed', 'failed', 'retried'
  error_message TEXT,
  raw_headers JSONB,
  raw_body JSONB,                -- Full webhook payload (for replay)
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_log_status ON webhook_delivery_log(status, created_at DESC);
```

### Data Freshness Targets

| Integration | Current Latency | Target Latency | Method |
|-------------|----------------|----------------|--------|
| GHL Contacts | 6 hours | < 30 seconds | Webhook |
| GHL Opportunities | 6 hours | < 30 seconds | Webhook |
| Xero Invoices | 24 hours | < 5 minutes | Webhook + fetch |
| Xero Transactions | 24 hours | < 5 minutes | Webhook + fetch |
| Notion Projects | 6 hours | < 15 minutes | Poll (5-min interval) |
| Gmail | 24 hours | < 5 minutes | Google Push via Pub/Sub |
| iMessage | 15 minutes | 15 minutes (unchanged) | Local poll (PM2) |
| Google Calendar | 24 hours | < 5 minutes | Google Push |
| Storytellers -> GHL | 24 hours | < 30 minutes | Poll (triggered after GHL webhook) |

### Interfaces

```typescript
// apps/command-center-v2/src/lib/webhooks/types.ts

/** Common webhook event envelope */
interface WebhookEvent {
  source: 'ghl' | 'xero' | 'notion' | 'gmail' | 'calendar';
  eventType: string;        // e.g., 'contact.updated'
  entityType: string;       // e.g., 'contact'
  entityId: string;         // External system ID
  payload: Record<string, unknown>;
  receivedAt: Date;
  signature?: string;       // For verification
}

/** Result of processing a webhook */
interface WebhookResult {
  success: boolean;
  supabaseId?: string;      // ID of upserted record
  action: 'created' | 'updated' | 'skipped' | 'failed';
  latencyMs: number;
  error?: string;
}

/** Webhook processor interface - one per integration */
interface WebhookProcessor {
  validateSignature(request: Request): Promise<boolean>;
  parseEvent(request: Request): Promise<WebhookEvent>;
  process(event: WebhookEvent): Promise<WebhookResult>;
}

/** Integration event (written to Supabase for event bus) */
interface IntegrationEvent {
  source: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  supabase_id?: string;
  payload: Record<string, unknown>;
  triggered_by: 'webhook' | 'poll' | 'reconciliation';
  latency_ms: number;
}
```

```typescript
// Dashboard consumer (React component)
// Uses Supabase Realtime to subscribe to integration events

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function useIntegrationEvents(source?: string) {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('integration-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'integration_events',
        filter: source ? `source=eq.${source}` : undefined,
      }, (payload) => {
        setEvents(prev => [payload.new as IntegrationEvent, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [source]);

  return events;
}
```

### Data Flow Per Integration

#### 1. GoHighLevel (Webhook)

```
GHL Dashboard Event (contact edit, opp stage change)
  → GHL sends POST to /api/webhooks/ghl
  → Validate: check shared secret header (X-GHL-Signature or custom)
  → Parse: extract contact/opportunity data from GHL payload
  → Transform: run transformContactForSupabase() (reuse from sync-ghl-to-supabase.mjs)
  → Cultural Protocol: strip BLOCKED_FIELDS_TO_GHL if bidirectional
  → Upsert: supabase.from('ghl_contacts').upsert(data, { onConflict: 'ghl_id' })
  → Log: insert into integration_events
  → Response: 200 OK (GHL retries on non-2xx)
```

GHL webhook events to register:
- `contact.create` / `contact.update` / `contact.delete`
- `opportunity.create` / `opportunity.update` / `opportunity.status_change`
- `note.create` / `task.create` (optional, for activity tracking)

#### 2. Xero (Webhook + Fetch)

```
Xero event (invoice approved, payment received)
  → Xero sends POST to /api/webhooks/xero
  → Validate: HMAC-SHA256 signature using webhook key
  → IMPORTANT: Xero webhooks only contain resource IDs, not data
  → For each event:
    → Fetch full record: GET /api.xro/2.0/Invoices/{InvoiceID}
    → Transform and upsert to xero_invoices / xero_transactions
  → Handle Intent to Receive: respond with HMAC of empty body for validation
  → Log: insert into integration_events
  → Response: 200 OK
```

Xero webhook events to register (via Xero API):
- `CREATE` / `UPDATE` on `INVOICES`
- `CREATE` / `UPDATE` on `BANK_TRANSACTIONS`
- `CREATE` / `UPDATE` on `CONTACTS`

**Important Xero detail**: Initial webhook registration requires an Intent to Receive validation. Xero sends a POST with a specific payload; you must respond with the correct HMAC-SHA256 hash. This is a one-time setup step per webhook URL.

#### 3. Notion (Smart Polling)

```
Supabase Edge Function (or enhanced PM2 cron) every 5 minutes:
  → Query Notion API: database.query with last_edited_time filter
  → Compare with last poll timestamp from sync_state table
  → For changed pages: fetch full page content
  → Upsert to project_knowledge
  → Log: insert into integration_events with triggered_by='poll'
  → Update sync_state with new timestamp
```

No webhook available. Reduce poll interval from 6 hours to 5 minutes. Consider Supabase Edge Function with pg_cron for serverless execution, or keep as PM2 cron on local machine.

#### 4. Gmail (Google Push via Pub/Sub)

```
Gmail message arrives
  → Google sends POST to /api/webhooks/gmail (via Pub/Sub push subscription)
  → Validate: verify JWT token from Google
  → Parse: extract historyId from notification
  → Fetch: GET gmail.users.history.list(historyId) for new messages
  → Transform and upsert to communications_history
  → Match contacts (reuse existing logic from sync-gmail-to-supabase.mjs)
  → Log: insert into integration_events
  → Response: 200 OK (acknowledge to Pub/Sub)
```

**Setup requirements**: GCP project with Pub/Sub topic, Gmail API watch() call renewed every 7 days (cron job), Pub/Sub push subscription pointing to webhook URL.

#### 5. iMessage (Unchanged Local Poll)

Remains as-is: PM2 cron every 15 minutes running `sync-imessage.mjs`. No webhook possible since it reads from local SQLite. Already has incremental sync via `sync_state` table.

Enhancement: After each sync run, emit an integration_event so the dashboard knows fresh iMessage data is available.

### Error Handling & Retry Strategy

```typescript
// apps/command-center-v2/src/lib/webhooks/retry.ts

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Per-integration error handling
const ERROR_MATRIX = {
  // Webhook validation failures - do NOT retry, log and alert
  SIGNATURE_INVALID: { retry: false, alert: true, severity: 'critical' },

  // Supabase write failures
  SUPABASE_UNAVAILABLE: { retry: true, alert: true, severity: 'high' },
  SUPABASE_CONSTRAINT:  { retry: false, alert: false, severity: 'low' }, // Duplicate, skip

  // External API fetch failures (Xero fetch after webhook)
  EXTERNAL_API_401:     { retry: true, refreshToken: true, severity: 'medium' },
  EXTERNAL_API_429:     { retry: true, backoff: true, severity: 'low' },
  EXTERNAL_API_500:     { retry: true, severity: 'medium' },
  EXTERNAL_API_TIMEOUT: { retry: true, severity: 'medium' },

  // Transformation errors
  TRANSFORM_ERROR:      { retry: false, alert: true, severity: 'medium' },
};
```

**Dead Letter Queue**: Failed webhook deliveries (after max retries) are stored in `webhook_delivery_log` with `status='failed'` and full `raw_body`. A daily reconciliation job can replay them.

**Circuit Breaker**: If > 5 consecutive failures for a given source within 5 minutes, stop processing and send a Discord alert to `#act-errors`. Resume after 30 seconds with a single test request.

### Notification Flow

Webhook processing triggers notifications via the existing Discord system:

```
Webhook received
  → Process successfully
  → If high-value event (new opportunity, invoice paid, etc.):
      → sendEmbed('general', templates.integrationEvent(...))
  → If error:
      → sendEmbed('errors', templates.error('webhooks', errorMessage))
```

## Dependencies

| Dependency | Type | Reason |
|------------|------|--------|
| Supabase Realtime | Internal (existing) | Event bus for dashboard push updates |
| `@supabase/supabase-js` | Internal (existing) | Database operations |
| Next.js API routes | Internal (existing) | Webhook endpoint hosting |
| GHL Webhook config | External setup | Must configure in GHL Settings > Webhooks |
| Xero Webhook registration | External API call | Register via Xero API, validate Intent to Receive |
| GCP Pub/Sub | External (new) | Required for Gmail push notifications |
| Discord webhooks | Internal (existing) | Error and event notifications |
| `discord-notify.mjs` | Internal (existing) | Notification delivery |
| PM2 | Internal (existing) | Local cron for iMessage + Notion polling |

## Implementation Phases

### Phase 1: Foundation (Database + Shared Library)

**Files to create:**
- `supabase/migrations/20260201000000_integration_events.sql` - Event bus + webhook log tables
- `apps/command-center-v2/src/lib/webhooks/types.ts` - TypeScript interfaces
- `apps/command-center-v2/src/lib/webhooks/processor.ts` - Base webhook processor with logging, retry, error handling
- `apps/command-center-v2/src/lib/webhooks/event-bus.ts` - Write integration_events + trigger Realtime

**Acceptance:**
- [ ] Migration applies cleanly to Supabase
- [ ] Realtime enabled on `integration_events` table
- [ ] TypeScript types compile
- [ ] Base processor handles logging and error tracking

**Estimated effort:** Small (1-2 days)

### Phase 2: GHL Webhook Receiver

**Files to create:**
- `apps/command-center-v2/src/app/api/webhooks/ghl/route.ts` - GHL webhook endpoint
- `apps/command-center-v2/src/lib/webhooks/ghl-processor.ts` - GHL-specific processing

**Files to reuse (extract logic from):**
- `scripts/sync-ghl-to-supabase.mjs` - `transformContactForSupabase()` function, cultural protocol enforcement

**Setup steps:**
1. Deploy Next.js app to get public URL
2. Configure webhook in GHL dashboard: Settings > Webhooks > Add
3. Set events: contact.create, contact.update, opportunity.create, opportunity.update, opportunity.status_change
4. Add shared secret for signature validation

**Acceptance:**
- [ ] GHL contact updates appear in Supabase within 30 seconds
- [ ] Cultural protocol fields are blocked
- [ ] Integration events appear in event bus
- [ ] Invalid signatures are rejected with 401
- [ ] Existing batch sync continues as reconciliation

**Estimated effort:** Medium (2-3 days)

### Phase 3: Xero Webhook Receiver

**Files to create:**
- `apps/command-center-v2/src/app/api/webhooks/xero/route.ts` - Xero webhook endpoint
- `apps/command-center-v2/src/lib/webhooks/xero-processor.ts` - Xero-specific processing (includes Intent to Receive handling)

**Files to reuse (extract logic from):**
- `scripts/sync-xero-to-supabase.mjs` - Token management, `xeroRequest()`, project code detection, contact matching

**Setup steps:**
1. Register webhook via Xero API: POST to webhooks endpoint
2. Handle Intent to Receive validation challenge
3. Configure webhook key for HMAC-SHA256 verification
4. Subscribe to: invoices.create, invoices.update, bank_transactions.create, bank_transactions.update

**Acceptance:**
- [ ] Xero invoice changes appear in Supabase within 5 minutes
- [ ] Intent to Receive challenge handled correctly
- [ ] HMAC signature verification working
- [ ] Token refresh works when fetching full records
- [ ] Project code detection and contact matching work

**Estimated effort:** Medium (2-3 days)

### Phase 4: Enhanced Notion Polling

**Files to create/modify:**
- `scripts/sync-notion-to-supabase.mjs` - Add 5-minute incremental mode (alongside existing full sync)
- `ecosystem.config.cjs` - Add Notion polling to PM2 cron (every 5 minutes)
- OR `supabase/functions/poll-notion/index.ts` - Supabase Edge Function alternative

**Design decision:** PM2 local cron is simpler and aligns with existing patterns. Edge Function would be more reliable but adds deployment complexity. **Recommendation:** Start with PM2, migrate to Edge Function later.

**Acceptance:**
- [ ] Notion changes appear within 15 minutes
- [ ] Incremental mode only fetches changed pages
- [ ] Integration events emitted for each change
- [ ] Full sync still runs daily as reconciliation

**Estimated effort:** Small (1 day)

### Phase 5: Gmail Push Notifications (Optional - Higher Complexity)

**Files to create:**
- `apps/command-center-v2/src/app/api/webhooks/gmail/route.ts` - Gmail push endpoint
- `apps/command-center-v2/src/lib/webhooks/gmail-processor.ts` - Gmail processing
- `scripts/renew-gmail-watch.mjs` - Cron job to renew Gmail push subscription every 7 days

**Prerequisites:**
- GCP project with Pub/Sub API enabled
- Pub/Sub topic + push subscription configured
- Gmail API watch() call with correct scopes

**Acceptance:**
- [ ] New emails appear in communications_history within 5 minutes
- [ ] Watch renewal cron runs weekly
- [ ] Contact matching works

**Estimated effort:** Large (3-5 days including GCP setup)

### Phase 6: Dashboard Real-Time Updates

**Files to create:**
- `apps/command-center-v2/src/hooks/useIntegrationEvents.ts` - React hook for Realtime subscription
- `apps/command-center-v2/src/components/IntegrationActivityFeed.tsx` - Live activity feed component
- `apps/command-center-v2/src/app/api/integrations/status/route.ts` - Integration health status API

**Acceptance:**
- [ ] Dashboard shows live feed of integration events
- [ ] Per-integration health status (last sync time, error rate)
- [ ] Visual indicator when data is being updated in real-time

**Estimated effort:** Medium (2-3 days)

### Phase 7: Reconciliation & Observability

**Files to modify:**
- `scripts/sync-ghl-to-supabase.mjs` - Add reconciliation mode: detect drift between GHL and Supabase
- `scripts/sync-xero-to-supabase.mjs` - Add reconciliation mode
- `.github/workflows/scheduled-syncs.yml` - Reduce to daily reconciliation (no longer primary sync)

**Files to create:**
- `scripts/integration-health-check.mjs` - Check staleness per integration, alert if behind
- `apps/command-center-v2/src/app/api/integrations/health/route.ts` - Health endpoint

**Acceptance:**
- [ ] Daily reconciliation detects and backfills any missed webhook events
- [ ] Health check alerts if any integration is stale beyond its target
- [ ] Integration dashboard shows data freshness metrics

**Estimated effort:** Medium (2-3 days)

## Migration Path from Batch to Real-Time

The migration is **additive, not replacement**. Existing batch scripts become reconciliation jobs.

### Step 1: Deploy webhook endpoints (Phases 1-3)
- Webhooks start receiving events alongside existing cron jobs
- Both paths write to the same tables using the same upsert logic
- Monitor webhook_delivery_log for reliability

### Step 2: Verify webhook reliability (1-2 weeks)
- Compare: do webhooks catch everything the batch sync catches?
- Check: webhook_delivery_log error rates
- Validate: latency metrics in integration_events

### Step 3: Reduce cron frequency
- GHL: Move from 6-hour to 24-hour batch (reconciliation only)
- Xero: Move from daily to weekly batch
- Keep Gmail daily until push is proven

### Step 4: Batch becomes reconciliation
- Existing scripts add a "reconciliation" mode:
  - Compare Supabase state with source system
  - Only sync records that differ
  - Log discrepancies to `integration_events` with `triggered_by='reconciliation'`

### Rollback Plan
If webhooks prove unreliable, simply re-enable the original cron schedules. No code changes needed -- the batch scripts are untouched.

## File Structure (New Files)

```
apps/command-center-v2/src/
  app/api/webhooks/
    ghl/route.ts              # GHL webhook receiver
    xero/route.ts             # Xero webhook receiver
    gmail/route.ts            # Gmail push receiver (Phase 5)
    calendar/route.ts         # Calendar push receiver (future)
  app/api/integrations/
    status/route.ts           # Integration health status
    health/route.ts           # Health check endpoint
  lib/webhooks/
    types.ts                  # Shared TypeScript types
    processor.ts              # Base webhook processor
    event-bus.ts              # Integration event writer
    retry.ts                  # Retry logic with backoff
    ghl-processor.ts          # GHL-specific processing
    xero-processor.ts         # Xero-specific processing
    gmail-processor.ts        # Gmail-specific processing (Phase 5)
  hooks/
    useIntegrationEvents.ts   # React hook for Realtime
  components/
    IntegrationActivityFeed.tsx # Live activity feed

supabase/migrations/
  20260201000000_integration_events.sql   # Event bus + webhook log tables

scripts/
  integration-health-check.mjs           # Staleness detection + alerting
  renew-gmail-watch.mjs                  # Gmail push subscription renewal (Phase 5)
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GHL webhook URL must be publicly accessible | High | Next.js app deployed to Vercel already has public URLs. Use environment-specific webhook configs. |
| Xero Intent to Receive validation fails | Medium | Implement the HMAC challenge handler first, test with Xero's webhook validation tool before going live. |
| Webhook endpoint goes down (Vercel cold start, outage) | High | GHL retries failed webhooks. Xero retries for 24 hours. Daily reconciliation catches gaps. Monitor via health check. |
| Rate limiting when Xero webhook triggers fetch | Medium | Queue fetches with 100ms delay. Xero allows ~60 req/min for most endpoints. |
| Cultural protocol bypass via webhook path | Critical | Extract `BLOCKED_FIELDS_TO_GHL` enforcement into shared lib. Apply in BOTH webhook processor AND batch sync. Unit test coverage. |
| Gmail Pub/Sub setup complexity | Medium | Make Phase 5 optional. Gmail daily sync is acceptable fallback. Only implement if other integrations prove the pattern. |
| iMessage can never be real-time | Low | 15-minute cadence is acceptable. Document this as a platform limitation. |
| Supabase Realtime connection limits | Low | Free tier allows 200 concurrent connections. Monitor usage. Upgrade if needed. |
| Webhook replay/duplicate delivery | Medium | All upserts use `onConflict` - idempotent by design. `webhook_delivery_log` tracks delivery IDs for dedup. |

## Open Questions

- [ ] **Vercel deployment**: Is `apps/command-center-v2` already deployed to Vercel with a stable public URL? Webhook endpoints need a stable URL.
- [ ] **GHL webhook auth**: Does the GHL plan include webhook configuration? Some GHL tiers restrict webhook access.
- [ ] **Xero webhook tier**: Xero webhooks are available on all paid plans. Confirm current Xero plan.
- [ ] **GCP project**: Does ACT already have a GCP project for Gmail Pub/Sub, or does one need to be created?
- [ ] **Edge Functions**: Is Supabase Edge Functions enabled on the current plan? Could replace PM2 for Notion polling.
- [ ] **Priority order**: Should we start with GHL (highest value, contacts drive everything) or Xero (founder pain point around finance freshness)?

## Success Criteria

1. GHL contact changes visible in dashboard within 30 seconds (measured via integration_events latency_ms)
2. Xero financial data refreshed within 5 minutes of changes
3. Zero data loss: daily reconciliation finds < 1% drift between webhook and batch paths
4. Integration health dashboard shows all services green with last-sync timestamps
5. Discord alerts fire within 60 seconds of any integration failure
6. Existing batch scripts continue to work unchanged as fallback
7. Cultural protocol enforcement verified in both webhook and batch paths
PLAN_EOF
