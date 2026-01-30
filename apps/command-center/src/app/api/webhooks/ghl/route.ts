/**
 * GHL Webhook API Route
 *
 * Receives webhook events from GoHighLevel for real-time sync.
 * Supports contact and opportunity events.
 *
 * POST /api/webhooks/ghl
 *
 * GHL sends events like:
 * - contact.create / contact.update / contact.delete
 * - opportunity.create / opportunity.update / opportunity.status_change
 *
 * Cultural Protocol: Blocked fields are stripped before storage.
 * See BLOCKED_FIELDS_TO_GHL in ghl-handler.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createWebhookProcessor } from '@/lib/webhooks/processor';
import { handleGHLWebhook } from '@/lib/webhooks/ghl-handler';

const processor = createWebhookProcessor(supabase as unknown as Parameters<typeof createWebhookProcessor>[0]);

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Collect headers for signature verification
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Validate webhook secret if configured
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = headers['x-ghl-signature'] || headers['x-webhook-signature'] || '';
      if (signature !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    const result = await processor.processWebhook(
      'ghl',
      rawBody,
      headers,
      async (event) => handleGHLWebhook(event, supabase as unknown as Parameters<typeof handleGHLWebhook>[1])
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error('GHL webhook error:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
