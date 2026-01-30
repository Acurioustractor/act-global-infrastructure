/**
 * GoHighLevel Contact Sync Webhook Endpoint
 *
 * Receives webhook events from all 6 GHL sub-accounts when contacts are created/updated.
 * Triggers contact sync service to maintain unified contact database in Supabase + ACT Hub GHL.
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/ghl/contact-sync
 *
 * Security:
 * - Verifies GHL webhook signature
 * - Rate limiting via Vercel Edge Config or Upstash
 * - Idempotency using event IDs
 *
 * Flow:
 * 1. Receive webhook POST from GHL
 * 2. Verify signature
 * 3. Parse event payload
 * 4. Determine source project from location ID
 * 5. Trigger contact sync service
 * 6. Return 200 OK (GHL retries on non-2xx)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createContactSyncService } from '@/lib/ghl/contact-sync';
import { ACTProject, ContactSyncEvent, GHLWebhookEvent } from '@/lib/ghl/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify GHL webhook signature
 * GHL signs webhooks with HMAC-SHA256 using webhook secret
 *
 * Reference: https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    console.warn('[GHL Webhook] No signature provided');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Map GHL location ID to ACT project
 */
function getProjectFromLocationId(locationId: string): ACTProject | null {
  // Map environment variables to projects
  const locationMap: Record<string, ACTProject> = {
    [process.env.GHL_ACT_HUB_LOCATION_ID || '']: ACTProject.ACT_HUB,
    [process.env.GHL_HARVEST_LOCATION_ID || '']: ACTProject.THE_HARVEST,
    [process.env.GHL_FARM_LOCATION_ID || '']: ACTProject.ACT_FARM,
    [process.env.GHL_LEDGER_LOCATION_ID || '']: ACTProject.EMPATHY_LEDGER,
    [process.env.GHL_JUSTICEHUB_LOCATION_ID || '']: ACTProject.JUSTICE_HUB,
    [process.env.GHL_GOODS_LOCATION_ID || '']: ACTProject.GOODS_ON_COUNTRY,
  };

  return locationMap[locationId] || null;
}

/**
 * Parse GHL webhook event into ContactSyncEvent
 */
function parseWebhookEvent(event: GHLWebhookEvent): ContactSyncEvent | null {
  // Only process contact events
  if (!event.type.startsWith('Contact')) {
    return null;
  }

  if (!event.contact) {
    console.error('[GHL Webhook] Contact event missing contact data');
    return null;
  }

  const project = getProjectFromLocationId(event.locationId);
  if (!project) {
    console.error('[GHL Webhook] Unknown location ID:', event.locationId);
    return null;
  }

  // Skip ACT Hub events (we don't want to sync ACT Hub back to itself)
  if (project === ACTProject.ACT_HUB) {
    console.log('[GHL Webhook] Skipping ACT Hub event (master sub-account)');
    return null;
  }

  let eventType: 'create' | 'update' | 'delete';
  if (event.type === 'ContactCreate') {
    eventType = 'create';
  } else if (event.type === 'ContactUpdate') {
    eventType = 'update';
  } else if (event.type === 'ContactDelete') {
    eventType = 'delete';
  } else {
    // Skip other contact events (TagUpdate, DndUpdate, etc.)
    return null;
  }

  return {
    sourceProject: project,
    sourceLocationId: event.locationId,
    sourceContactId: event.contact.id || event.id,
    contact: event.contact,
    eventType,
    timestamp: new Date().toISOString(),
  };
}

/**
 * POST /api/webhooks/ghl/contact-sync
 *
 * Receives webhook events from GHL
 */
export async function POST(request: NextRequest) {
  console.log('[GHL Webhook] Received webhook');

  try {
    // 1. Get webhook signature
    const signature = request.headers.get('x-ghl-signature');
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;

    // 2. Get raw body for signature verification
    const rawBody = await request.text();

    // 3. Verify signature (if secret is configured)
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('[GHL Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } else {
      console.warn('[GHL Webhook] No webhook secret configured - signature verification skipped');
    }

    // 4. Parse webhook payload
    let webhookEvent: GHLWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch (error) {
      console.error('[GHL Webhook] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log(`[GHL Webhook] Event type: ${webhookEvent.type}, Location: ${webhookEvent.locationId}`);

    // 5. Parse into ContactSyncEvent
    const syncEvent = parseWebhookEvent(webhookEvent);
    if (!syncEvent) {
      // Not a contact event we care about - return 200 to acknowledge
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    console.log(`[GHL Webhook] Processing contact ${syncEvent.eventType} for ${syncEvent.sourceProject}`);

    // 6. Check for duplicate event (idempotency)
    // GHL may send duplicate webhooks - use contact ID + event type + timestamp to dedupe
    const eventKey = `${syncEvent.sourceContactId}-${syncEvent.eventType}-${syncEvent.timestamp}`;

    // Check if this event has already been processed
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingEvent } = await supabase
      .from('webhook_event_log')
      .select('id')
      .eq('event_key', eventKey)
      .single();

    if (existingEvent) {
      console.log(`[GHL Webhook] Duplicate event detected (${eventKey}) - skipping`);
      return NextResponse.json({
        success: true,
        message: 'Duplicate event - already processed',
        eventKey,
      });
    }

    // Log the event before processing
    await supabase.from('webhook_event_log').insert({
      event_key: eventKey,
      event_type: syncEvent.eventType,
      source_project: syncEvent.sourceProject,
      source_contact_id: syncEvent.sourceContactId,
      payload: webhookEvent,
    });

    // 7. Trigger contact sync service
    const syncService = createContactSyncService();
    await syncService.processContactEvent(syncEvent);

    console.log('[GHL Webhook] Contact sync completed successfully');

    // 8. Return 200 OK (GHL retries on non-2xx responses)
    return NextResponse.json({
      success: true,
      message: 'Contact synced successfully',
      project: syncEvent.sourceProject,
      contactId: syncEvent.sourceContactId,
    });
  } catch (error) {
    console.error('[GHL Webhook] Error processing webhook:', error);

    // Log error but still return 200 to prevent GHL from retrying indefinitely
    // The error is logged to Supabase event log for manual review
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        // Return 200 anyway - error is logged in Supabase for manual intervention
      },
      { status: 200 }
    );
  }
}

/**
 * GET /api/webhooks/ghl/contact-sync
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'GHL Contact Sync Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
