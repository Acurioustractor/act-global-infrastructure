# Xero Webhook Setup Guide

> **Status:** Ready to implement
> **Last Updated:** January 2026

---

## Overview

Xero webhooks notify our system when invoices, payments, contacts, or bank transactions change. This replaces polling-based sync with real-time updates.

## Prerequisites

- Xero Developer account with an existing app (used for OAuth)
- Vercel deployment of Command Center (already live)
- `XERO_WEBHOOK_KEY` environment variable

---

## Step 1: Create Webhook in Xero Developer Portal

1. Go to [developer.xero.com/app/manage](https://developer.xero.com/app/manage)
2. Select the ACT app
3. Click **Webhooks** tab
4. Click **Add webhook**
5. Configure:

| Setting | Value |
|---------|-------|
| **Name** | ACT Command Center |
| **Delivery URL** | `https://<your-vercel-domain>/api/webhooks/xero` |
| **Topics** | Invoices, Payments, Contacts, Bank Transactions |

6. Xero will generate a **Webhook Key** — copy this

---

## Step 2: Set Environment Variable

### On Vercel

```bash
# Via Vercel CLI
vercel env add XERO_WEBHOOK_KEY production
# Paste the webhook key when prompted

# Or via Vercel Dashboard:
# Settings → Environment Variables → Add
# Key: XERO_WEBHOOK_KEY
# Value: <the key from step 1>
```

### Locally (for testing)

Add to `.env.local`:
```
XERO_WEBHOOK_KEY=your-webhook-key-here
```

---

## Step 3: Webhook Endpoint (Already Implemented)

The webhook route and handler are already in place:

- **Route:** `apps/command-center/src/app/api/webhooks/xero/route.ts`
- **Handler:** `apps/command-center/src/lib/webhooks/xero-handler.mjs`
- **Event bus:** `apps/command-center/src/lib/webhooks/event-bus.ts`

The route verifies HMAC-SHA256 signatures, handles Intent to Receive validation, and writes events to both `webhook_delivery_log` and `integration_events` tables.

---

## Step 4: Verify Webhook (Intent to Receive)

After creating the webhook in Xero:

1. Xero sends an **Intent to Receive** POST with empty events and a signature
2. Your endpoint must verify the signature and return `200`
3. If correct, Xero activates the webhook
4. If incorrect, Xero shows an error — check your `XERO_WEBHOOK_KEY`

### Testing Locally

```bash
# Generate a test signature
echo -n '{"events":[],"firstEventSequence":0,"lastEventSequence":0,"entropy":"abc"}' | \
  openssl dgst -sha256 -hmac "YOUR_WEBHOOK_KEY" -binary | base64

# Send test request
curl -X POST http://localhost:3001/api/webhooks/xero \
  -H "Content-Type: application/json" \
  -H "x-xero-signature: <generated-signature>" \
  -d '{"events":[],"firstEventSequence":0,"lastEventSequence":0,"entropy":"abc"}'
```

---

## Step 5: Event Processing Table (Already Migrated)

The `integration_events` and `webhook_delivery_log` tables exist:

- **Migration:** `supabase/migrations/20260201100000_integration_events.sql`
- Includes Supabase Realtime publication for live dashboard updates
- Auto-cleanup function for events older than 30 days

---

## Step 6: Process Webhook Events

Create a processing script that runs on a schedule or is triggered by Supabase Realtime:

```bash
# Process pending Xero events
node scripts/process-xero-webhooks.mjs
```

### Event Types from Xero

| Event Category | Event Type | Action |
|---------------|------------|--------|
| Invoices | CREATE | Insert/update xero_invoices |
| Invoices | UPDATE | Update xero_invoices |
| Payments | CREATE | Update payment status |
| Contacts | CREATE | Sync to ghl_contacts |
| Contacts | UPDATE | Update ghl_contacts |
| Bank Transactions | CREATE | Trigger reconciliation |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 on Intent to Receive | Check `XERO_WEBHOOK_KEY` matches Xero Developer Portal |
| Events not arriving | Check Xero webhook status is "Active" |
| Duplicate events | Xero may retry; use `resourceId` for idempotency |
| Timeout errors | Respond within 5 seconds; queue events for async processing |
| Wrong tenant | Verify `tenantId` matches your Xero organization |

---

## Architecture

```
Xero (event occurs)
  → POST to /api/webhooks/xero
  → Verify HMAC signature
  → Store in integration_events table
  → Background processor picks up event
  → Updates relevant Supabase tables
  → Supabase Realtime notifies Command Center
```

This follows the same pattern as the existing GHL webhook pipeline (`/api/webhooks/ghl/route.ts`).
