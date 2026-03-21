/**
 * Xero Webhook Endpoint
 *
 * Handles Xero webhook notifications for real-time financial data integration.
 *
 * Xero webhook flow:
 * 1. Intent to Receive: Xero validates the endpoint by sending a POST with
 *    firstEventSequence=0 and empty events. Must respond 200 with empty body.
 * 2. Event notifications: POST with event payloads containing resource type + ID.
 *    Events must be fetched via Xero API for full data (not included in webhook).
 * 3. Every request includes x-xero-signature header (HMAC-SHA256 of body, base64).
 *
 * Event categories: INVOICE, CONTACT, BANK_TRANSACTION
 * Event types: CREATE, UPDATE
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  verifyXeroSignature,
  handleXeroWebhook,
} from '@/lib/webhooks/xero-handler.mjs';

const XERO_WEBHOOK_KEY = process.env.XERO_WEBHOOK_KEY || '';

// Types for Xero webhook payloads (inline since webhooks lib types may not exist yet)

interface XeroEvent {
  resourceUrl: string;
  resourceId: string;
  eventDateUtc: string;
  eventType: 'CREATE' | 'UPDATE';
  eventCategory: 'INVOICE' | 'CONTACT' | 'BANK_TRANSACTION';
  tenantId: string;
  tenantType: string;
}

interface XeroWebhookPayload {
  firstEventSequence: number;
  lastEventSequence: number;
  entropy: string;
  events: XeroEvent[];
}

/**
 * Map Xero event categories to integration event types for the event bus.
 */
function mapEventCategory(category: string): string {
  const mapping: Record<string, string> = {
    INVOICE: 'xero.invoice',
    CONTACT: 'xero.contact',
    BANK_TRANSACTION: 'xero.bank_transaction',
  };
  return mapping[category] || `xero.${category.toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-xero-signature') || '';

  // 1. Verify HMAC-SHA256 signature
  if (!verifyXeroSignature(body, signature, XERO_WEBHOOK_KEY)) {
    // Xero requires 401 for invalid signatures
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: XeroWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 2. Process using core handler logic
  const result = handleXeroWebhook(payload);

  // 3. Handle Intent to Receive (must respond with empty 200)
  if (result.type === 'intent_to_receive') {
    return new NextResponse(null, { status: 200 });
  }

  // 4. Log events to webhook_delivery_log and emit integration_events
  for (const event of result.events) {
    try {
      // Log the webhook delivery
      await supabase.from('webhook_delivery_log').insert({
        provider: 'xero',
        event_type: `${event.eventCategory}.${event.eventType}`,
        payload: event,
        received_at: new Date().toISOString(),
        status: 'received',
      });

      // Emit as integration event for the event bus
      await supabase.from('integration_events').insert({
        source: 'xero',
        event_type: mapEventCategory(event.eventCategory),
        action: event.eventType.toLowerCase(),
        resource_id: event.resourceId,
        resource_url: event.resourceUrl,
        payload: event,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Log error but don't fail the webhook response
      // Xero will retry on non-200 responses
      console.error(`Failed to log Xero event ${event.resourceId}:`, err);
    }
  }

  // 5. Send proactive Telegram alerts for significant events
  for (const event of result.events) {
    try {
      if (event.eventCategory === 'INVOICE' && event.eventType === 'UPDATE') {
        await sendFinancialAlert('invoice_update', event.resourceId);
      } else if (event.eventCategory === 'BANK_TRANSACTION' && event.eventType === 'CREATE') {
        await sendFinancialAlert('new_transaction', event.resourceId);
      }
    } catch (err) {
      // Don't fail webhook on notification errors
      console.error(`Failed to send alert for ${event.resourceId}:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Send proactive financial alerts to Telegram for significant events.
 * Only sends for high-value or noteworthy changes to avoid noise.
 */
async function sendFinancialAlert(eventType: string, resourceId: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_AUTHORIZED_USERS;
  if (!botToken || !chatId) return;

  let message = '';

  if (eventType === 'invoice_update') {
    // Check if invoice was paid
    const { data: invoice } = await supabase
      .from('xero_invoices')
      .select('contact_name, total, status, type, project_code')
      .eq('xero_id', resourceId)
      .single();

    if (invoice?.status === 'PAID' && invoice.type === 'ACCREC' && invoice.total >= 1000) {
      message = `💰 Payment received: $${invoice.total.toLocaleString()} from ${invoice.contact_name}${invoice.project_code ? ` [${invoice.project_code}]` : ''}`
    }
  } else if (eventType === 'new_transaction') {
    // Alert on large transactions
    const { data: tx } = await supabase
      .from('xero_transactions')
      .select('contact_name, total, type, project_code')
      .eq('xero_id', resourceId)
      .single();

    if (tx && Math.abs(tx.total) >= 5000) {
      const direction = tx.total > 0 ? '📥' : '📤';
      message = `${direction} Large transaction: $${Math.abs(tx.total).toLocaleString()} ${tx.total > 0 ? 'from' : 'to'} ${tx.contact_name || 'Unknown'}${tx.project_code ? ` [${tx.project_code}]` : ''}`;
    }
  }

  if (message) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  }
}
