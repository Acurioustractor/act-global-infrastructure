/**
 * GHL Webhook Handler
 *
 * Handles GoHighLevel webhook events for contacts and opportunities.
 * Enforces cultural protocol by stripping BLOCKED_FIELDS from all payloads.
 *
 * Supported events:
 * - contact.create / contact.update / contact.delete
 * - opportunity.create / opportunity.update / opportunity.status_change
 */

import type { WebhookEvent, WebhookResult } from './types';

// Fields that NEVER sync to GHL (stays in Supabase only)
// This matches the cultural protocol from sync-ghl-to-supabase.mjs
export const BLOCKED_FIELDS_TO_GHL = [
  'elder_consent',
  'sacred_knowledge',
  'sacred_knowledge_notes',
  'cultural_nation_details',
  'ocap_ownership',
  'ocap_control',
  'ocap_access',
  'ocap_possession',
  'detailed_consent_history',
  'elder_review_notes',
];

type SupabaseClient = {
  from: (table: string) => {
    upsert: (
      data: Record<string, unknown>,
      opts?: { onConflict: string }
    ) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
    update: (data: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
    };
  };
};

/** Known project tags used by ACT */
const PROJECT_TAGS = [
  'empathy-ledger',
  'justicehub',
  'the-harvest',
  'act-farm',
  'goods-on-country',
  'bcv-residencies',
  'act-studio',
];

/**
 * Transform a GHL contact payload into the Supabase ghl_contacts schema.
 * Strips blocked cultural fields from custom fields.
 */
export function transformGHLContact(payload: Record<string, unknown>): Record<string, unknown> {
  const tags = (payload.tags as string[]) || [];
  const customFields = { ...((payload.customFields as Record<string, unknown>) || {}) };

  // Cultural protocol: strip blocked fields
  for (const field of BLOCKED_FIELDS_TO_GHL) {
    delete customFields[field];
  }

  // Extract project tags
  const projects = tags.filter((tag) => PROJECT_TAGS.includes(tag));

  // Determine engagement status from tags
  const engagementTags = tags.filter((tag) => tag.startsWith('engagement:'));
  const engagementStatus = engagementTags.length > 0
    ? engagementTags[0].replace('engagement:', '')
    : 'lead';

  return {
    ghl_id: payload.id,
    ghl_location_id: payload.locationId,
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    company_name: payload.company,
    tags,
    custom_fields: customFields,
    projects,
    engagement_status: engagementStatus,
    ghl_created_at: payload.dateAdded,
    ghl_updated_at: payload.dateUpdated,
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
  };
}

/**
 * Transform a GHL opportunity payload into the Supabase ghl_opportunities schema.
 */
export function transformGHLOpportunity(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ghl_id: payload.id,
    ghl_contact_id: payload.contactId,
    ghl_pipeline_id: payload.pipelineId,
    ghl_stage_id: payload.pipelineStageId,
    name: payload.name,
    stage_name: payload.stageName,
    status: payload.status,
    monetary_value: payload.monetaryValue,
    custom_fields: payload.customFields || {},
    assigned_to: payload.assignedTo,
    ghl_created_at: payload.dateAdded,
    ghl_updated_at: payload.dateUpdated,
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * Handle a GHL webhook event.
 * Routes to the appropriate contact or opportunity handler.
 */
export async function handleGHLWebhook(
  event: WebhookEvent,
  supabase: SupabaseClient
): Promise<WebhookResult> {
  const startTime = Date.now();
  const { eventType, payload } = event;

  try {
    // Contact events
    if (eventType.startsWith('contact.')) {
      return await handleContactEvent(eventType, payload, supabase, startTime);
    }

    // Opportunity events
    if (eventType.startsWith('opportunity.')) {
      return await handleOpportunityEvent(eventType, payload, supabase, startTime);
    }

    // Unknown event type
    return {
      success: false,
      action: 'skipped',
      latencyMs: Date.now() - startTime,
      error: `Unknown event type: ${eventType}`,
    };
  } catch (err) {
    return {
      success: false,
      action: 'failed',
      latencyMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleContactEvent(
  eventType: string,
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  startTime: number
): Promise<WebhookResult> {
  if (eventType === 'contact.delete') {
    // Soft delete: mark as deleted
    const { error } = await supabase
      .from('ghl_contacts')
      .update({
        sync_status: 'deleted',
        last_synced_at: new Date().toISOString(),
      })
      .eq('ghl_id', payload.id as string);

    if (error) {
      return {
        success: false,
        action: 'failed',
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
    }

    return {
      success: true,
      action: 'updated',
      latencyMs: Date.now() - startTime,
    };
  }

  // contact.create or contact.update
  const contactData = transformGHLContact(payload);
  const action = eventType === 'contact.create' ? 'created' : 'updated';

  const { error } = await supabase
    .from('ghl_contacts')
    .upsert(contactData, { onConflict: 'ghl_id' });

  if (error) {
    return {
      success: false,
      action: 'failed',
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }

  return {
    success: true,
    action,
    latencyMs: Date.now() - startTime,
  };
}

async function handleOpportunityEvent(
  eventType: string,
  payload: Record<string, unknown>,
  supabase: SupabaseClient,
  startTime: number
): Promise<WebhookResult> {
  const oppData = transformGHLOpportunity(payload);
  const action = eventType === 'opportunity.create' ? 'created' : 'updated';

  const { error } = await supabase
    .from('ghl_opportunities')
    .upsert(oppData, { onConflict: 'ghl_id' });

  if (error) {
    return {
      success: false,
      action: 'failed',
      latencyMs: Date.now() - startTime,
      error: error.message,
    };
  }

  return {
    success: true,
    action,
    latencyMs: Date.now() - startTime,
  };
}
