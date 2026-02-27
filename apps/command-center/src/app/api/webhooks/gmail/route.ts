/**
 * Gmail Push Notification Webhook
 *
 * Receives POST from Google Pub/Sub when new emails arrive.
 * Validates the push notification and triggers incremental Gmail sync.
 *
 * Flow:
 * 1. Google Gmail detects new email
 * 2. Gmail publishes to Pub/Sub topic
 * 3. Pub/Sub push subscription POSTs here
 * 4. We validate, extract historyId + emailAddress
 * 5. Call processGmailHistory() for incremental fetch
 * 6. Emit integration event via event bus
 *
 * POST /api/webhooks/gmail
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processGmailHistory } from '@/lib/webhooks/gmail-push';

// Allowed sender for Pub/Sub push messages
const PUBSUB_ALLOWED_ISSUERS = [
  'accounts.google.com',
  'https://accounts.google.com',
];

interface PubSubMessage {
  message: {
    data: string; // base64 encoded
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

interface GmailNotification {
  emailAddress: string;
  historyId: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let body: PubSubMessage;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate Pub/Sub message structure
  if (!body.message?.data) {
    return NextResponse.json({ error: 'Missing message data' }, { status: 400 });
  }

  // Decode the Pub/Sub message data (base64 → JSON)
  let notification: GmailNotification;
  try {
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
    notification = JSON.parse(decoded);
  } catch {
    console.error('[GmailWebhook] Failed to decode Pub/Sub message');
    return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
  }

  const { emailAddress, historyId } = notification;

  if (!emailAddress || !historyId) {
    console.error('[GmailWebhook] Missing emailAddress or historyId');
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate that this is one of our delegated users
  const delegatedUsers = (process.env.GOOGLE_DELEGATED_USERS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!delegatedUsers.includes(emailAddress.toLowerCase())) {
    console.warn(`[GmailWebhook] Ignoring notification for unknown user: ${emailAddress}`);
    // Return 200 to prevent Pub/Sub retries
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Log webhook delivery
  await supabase.from('webhook_delivery_log').insert({
    source: 'gmail',
    event_type: 'gmail.push_notification',
    status: 'received',
    raw_body: JSON.stringify(body),
    received_at: new Date().toISOString(),
  });

  try {
    // Process the history changes
    const result = await processGmailHistory(emailAddress, String(historyId));

    const latencyMs = Date.now() - startTime;

    // Emit integration event
    await supabase.from('integration_events').insert({
      source: 'gmail',
      event_type: 'gmail.push_sync',
      entity_type: 'email',
      entity_id: emailAddress,
      action: result.messagesProcessed > 0 ? 'created' : 'skipped',
      payload: {
        emailAddress,
        historyId: String(historyId),
        messagesProcessed: result.messagesProcessed,
        errors: result.errors,
      },
      latency_ms: latencyMs,
      processed_at: new Date().toISOString(),
    });

    // Update webhook delivery log
    await supabase.from('webhook_delivery_log').insert({
      source: 'gmail',
      event_type: 'gmail.push_notification',
      status: 'processed',
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    });

    console.log(
      `[GmailWebhook] Processed ${result.messagesProcessed} messages for ${emailAddress} in ${latencyMs}ms`
    );

    return NextResponse.json({
      ok: true,
      messagesProcessed: result.messagesProcessed,
      errors: result.errors,
      latencyMs,
    });
  } catch (err) {
    const error = (err as Error).message;
    console.error(`[GmailWebhook] Error processing ${emailAddress}:`, error);

    await supabase.from('webhook_delivery_log').insert({
      source: 'gmail',
      event_type: 'gmail.push_notification',
      status: 'failed',
      error,
      received_at: new Date().toISOString(),
    });

    // Return 200 to prevent infinite Pub/Sub retries for permanent errors
    // Pub/Sub will retry on non-2xx, but we don't want that for code errors
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
