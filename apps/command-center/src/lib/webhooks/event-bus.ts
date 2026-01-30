/**
 * Webhook Event Bus
 *
 * Writes integration events and webhook delivery logs to Supabase.
 * Used by the webhook processor to record all webhook activity.
 */

import type { IntegrationEvent, WebhookDeliveryLog } from './types';

type SupabaseClient = {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    update: (data: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
    };
  };
};

export function createEventBus(supabase: SupabaseClient) {
  return {
    /**
     * Emit an integration event to the integration_events table.
     */
    async emitIntegrationEvent(event: IntegrationEvent) {
      const record = {
        ...event,
        processed_at: event.processed_at || new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('integration_events')
        .insert(record)
        .select()
        .single();

      return { data, error };
    },

    /**
     * Log a webhook delivery to the webhook_delivery_log table.
     */
    async logWebhookDelivery(
      source: string,
      eventType: string,
      status: WebhookDeliveryLog['status'],
      rawBody?: string,
      error?: string
    ) {
      const record: Record<string, unknown> = {
        source,
        event_type: eventType,
        status,
        raw_body: rawBody,
        received_at: new Date().toISOString(),
      };

      if (error) {
        record.error = error;
      }

      if (status === 'processed' || status === 'failed') {
        record.processed_at = new Date().toISOString();
      }

      const { data, error: insertError } = await supabase
        .from('webhook_delivery_log')
        .insert(record)
        .select()
        .single();

      return { data, error: insertError };
    },
  };
}
