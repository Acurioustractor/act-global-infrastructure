/**
 * Webhook System Types
 *
 * TypeScript interfaces for the ACT real-time integration layer.
 * These types define the contract for webhook processing, event emission,
 * and delivery logging across all integration sources.
 */

/** Incoming webhook event parsed from a raw HTTP request */
export interface WebhookEvent {
  /** Integration source identifier (e.g., 'ghl', 'xero', 'notion') */
  source: string;
  /** Event type from the source system (e.g., 'contact.create', 'opportunity.update') */
  eventType: string;
  /** Type of entity affected (e.g., 'contact', 'opportunity') */
  entityType: string;
  /** Source system's ID for the entity */
  entityId: string;
  /** Raw payload from the source system */
  payload: Record<string, unknown>;
  /** ISO timestamp when the webhook was received */
  receivedAt: string;
  /** Signature header value for verification (if provided) */
  signature?: string;
}

/** Result of processing a webhook event */
export interface WebhookResult {
  /** Whether the processing succeeded */
  success: boolean;
  /** ID of the record in Supabase (if created/updated) */
  supabaseId?: string;
  /** Action taken during processing */
  action: 'created' | 'updated' | 'skipped' | 'failed';
  /** Processing time in milliseconds */
  latencyMs: number;
  /** Error message if processing failed */
  error?: string;
}

/** Integration event record matching the integration_events DB table */
export interface IntegrationEvent {
  /** Integration source (e.g., 'ghl', 'xero') */
  source: string;
  /** Event type (e.g., 'contact.create') */
  event_type: string;
  /** Entity type (e.g., 'contact', 'opportunity') */
  entity_type: string;
  /** Source system entity ID */
  entity_id: string;
  /** Action taken */
  action: 'created' | 'updated' | 'skipped' | 'failed';
  /** Event payload */
  payload?: Record<string, unknown>;
  /** Processing latency in milliseconds */
  latency_ms?: number;
  /** Error message if failed */
  error?: string;
  /** ISO timestamp */
  processed_at?: string;
}

/** Webhook delivery log record matching the webhook_delivery_log DB table */
export interface WebhookDeliveryLog {
  /** Integration source */
  source: string;
  /** Event type */
  event_type: string;
  /** Delivery status */
  status: 'received' | 'processed' | 'failed';
  /** Raw request body */
  raw_body?: string;
  /** Error message if failed */
  error?: string;
  /** ISO timestamp when received */
  received_at?: string;
  /** ISO timestamp when processing completed */
  processed_at?: string;
}
