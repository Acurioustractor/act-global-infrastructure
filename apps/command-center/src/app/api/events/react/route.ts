/**
 * Event Reaction Endpoint
 *
 * Called by Supabase Database Webhook on INSERT to integration_events.
 * Evaluates the event against reaction rules and sends Telegram
 * notifications when a rule matches.
 *
 * POST /api/events/react
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateEvent, recordReaction } from '@/lib/events/reactor';
import { sendReactiveNotification } from '@/lib/telegram/notifications';
import { getBrisbaneNow } from '@/lib/timezone';
import type { IntegrationEventRow } from '@/lib/events/types';

/** Check if current Brisbane time is in quiet hours (10pm–7am AEST) */
function isQuietHours(): boolean {
  const hour = getBrisbaneNow().getHours()
  return hour >= 22 || hour < 7
}

/** Rules that bypass quiet hours (critical notifications) */
const QUIET_HOURS_BYPASS_RULES = new Set([
  'finance.invoice_paid', // Invoice payments are time-sensitive
])

// Supabase Database Webhook payload format
interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: IntegrationEventRow;
  old_record?: IntegrationEventRow;
}

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only process INSERTs to integration_events
  if (payload.type !== 'INSERT' || payload.table !== 'integration_events') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const event = payload.record;
  if (!event) {
    return NextResponse.json({ error: 'No record in payload' }, { status: 400 });
  }

  // Skip failed events
  if (event.action === 'failed') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'failed_event' });
  }

  try {
    const reaction = await evaluateEvent(event);

    if (!reaction) {
      return NextResponse.json({ ok: true, reaction: null });
    }

    // Record the reaction
    await recordReaction(event.id, reaction);

    // Quiet hours: suppress non-critical notifications 10pm–7am AEST
    if (isQuietHours() && !QUIET_HOURS_BYPASS_RULES.has(reaction.ruleName || '')) {
      return NextResponse.json({
        ok: true,
        reaction: {
          rule: reaction.ruleName,
          priority: reaction.priority,
          sent: false,
          suppressed: 'quiet_hours',
        },
      });
    }

    // Send Telegram notification
    await sendReactiveNotification(reaction.message, reaction.actions);

    return NextResponse.json({
      ok: true,
      reaction: {
        rule: reaction.ruleName,
        priority: reaction.priority,
        sent: true,
      },
    });
  } catch (err) {
    console.error('[EventReactor] Error:', (err as Error).message);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
