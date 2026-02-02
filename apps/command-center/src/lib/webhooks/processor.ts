/**
 * Webhook Processor
 *
 * Base webhook processing pipeline that handles:
 * 1. Logging delivery as 'received'
 * 2. Parsing request body
 * 3. Calling the source-specific handler
 * 4. Emitting integration events
 * 5. Updating delivery log to 'processed' or 'failed'
 * 6. Returning a structured response
 */

import type { WebhookEvent, WebhookResult } from './types';
import { createEventBus } from './event-bus';

type ProcessorResponse = {
  status: number;
  body: {
    success: boolean;
    result?: WebhookResult;
    error?: string;
  };
};

type SupabaseClient = Parameters<typeof createEventBus>[0];

export function createWebhookProcessor(supabase: SupabaseClient) {
  const eventBus = createEventBus(supabase);

  return {
    /**
     * Process a webhook request through the standard pipeline.
     *
     * @param source - Integration source identifier (e.g., 'ghl')
     * @param rawBody - Raw request body string
     * @param headers - Request headers object
     * @param handler - Source-specific handler function
     */
    async processWebhook(
      source: string,
      rawBody: string,
      headers: Record<string, string>,
      handler: (event: WebhookEvent) => Promise<WebhookResult>
    ): Promise<ProcessorResponse> {
      const startTime = Date.now();

      // Step 1: Parse body
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        await eventBus.logWebhookDelivery(source, 'unknown', 'failed', rawBody, 'Invalid JSON body');
        return {
          status: 400,
          body: { success: false, error: 'Invalid JSON body' },
        };
      }

      // Determine event type from payload, normalizing GHL PascalCase to dotted format
      const rawEventType = (payload.type as string) || (payload.event as string) || 'unknown';
      const eventType = source === 'ghl' ? normalizeGHLEventType(rawEventType) : rawEventType;

      // Step 2: Log delivery as received
      await eventBus.logWebhookDelivery(source, eventType, 'received', rawBody);

      // Step 3: Build webhook event
      const event: WebhookEvent = {
        source,
        eventType,
        entityType: extractEntityType(eventType),
        entityId: (payload.id as string) || '',
        payload,
        receivedAt: new Date().toISOString(),
        signature: headers['x-ghl-signature'] || headers['x-webhook-signature'],
      };

      try {
        // Step 4: Call handler
        const result = await handler(event);
        result.latencyMs = Date.now() - startTime;

        // Step 5: Emit integration event
        await eventBus.emitIntegrationEvent({
          source,
          event_type: eventType,
          entity_type: event.entityType,
          entity_id: event.entityId,
          action: result.action,
          payload,
          latency_ms: result.latencyMs,
          error: result.error,
        });

        // Step 6: Update delivery log
        await eventBus.logWebhookDelivery(
          source,
          eventType,
          result.success ? 'processed' : 'failed',
          undefined,
          result.error
        );

        return {
          status: result.success ? 200 : 500,
          body: { success: result.success, result },
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const latencyMs = Date.now() - startTime;

        // Log failure
        await eventBus.logWebhookDelivery(source, eventType, 'failed', undefined, error);

        await eventBus.emitIntegrationEvent({
          source,
          event_type: eventType,
          entity_type: event.entityType,
          entity_id: event.entityId,
          action: 'failed',
          latency_ms: latencyMs,
          error,
        });

        return {
          status: 500,
          body: { success: false, error },
        };
      }
    },
  };
}

/**
 * Extract entity type from event type string.
 * e.g., 'contact.create' -> 'contact', 'opportunity.status_change' -> 'opportunity'
 */
function extractEntityType(eventType: string): string {
  const parts = eventType.split('.');
  return parts[0] || 'unknown';
}

/**
 * Normalize GHL event type strings to dotted lowercase format.
 * GHL workflows send PascalCase (e.g., "ContactCreate", "OpportunityStageUpdate")
 * while the API uses dotted format (e.g., "contact.create", "opportunity.stage_update").
 */
function normalizeGHLEventType(raw: string): string {
  if (raw.includes('.')) return raw.toLowerCase();

  const map: Record<string, string> = {
    contactcreate: 'contact.create',
    contactupdate: 'contact.update',
    contactdelete: 'contact.delete',
    opportunitycreate: 'opportunity.create',
    opportunityupdate: 'opportunity.update',
    opportunitystageupdate: 'opportunity.stage_update',
    opportunitystatusupdate: 'opportunity.status_update',
    opportunitystatuschange: 'opportunity.status_change',
    opportunitymonetaryvalueupdate: 'opportunity.monetary_value_update',
    notecreate: 'note.create',
    noteupdate: 'note.update',
    taskcreate: 'task.create',
    taskcomplete: 'task.complete',
  };

  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return map[key] || raw.toLowerCase();
}
