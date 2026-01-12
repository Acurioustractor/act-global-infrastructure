/**
 * Vercel Serverless Function for GHL Webhooks
 *
 * Endpoint: POST /api/webhooks/ghl
 *
 * Required Environment Variables (set in Vercel dashboard):
 *   - SUPABASE_SHARED_URL
 *   - SUPABASE_SHARED_SERVICE_ROLE_KEY
 *   - GHL_LOCATION_ID
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate config
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const payload = req.body;
  const eventType = payload.type || payload.event;

  console.log(`📥 GHL Webhook: ${eventType}`);

  try {
    let result = { handled: false, eventType };

    // Handle contact events
    if (eventType?.toLowerCase().includes('contact')) {
      const contact = payload.data?.contact || payload.contact || payload;

      if (eventType.includes('Delete')) {
        // Soft delete
        await supabase
          .from('ghl_contacts')
          .update({ sync_status: 'deleted', updated_at: new Date().toISOString() })
          .eq('ghl_id', contact.id || payload.contactId);
        result = { handled: true, action: 'contact_deleted' };
      } else {
        // Upsert contact
        const contactData = {
          ghl_id: contact.id,
          ghl_location_id: GHL_LOCATION_ID,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company_name: contact.companyName,
          tags: contact.tags || [],
          custom_fields: contact.customFields || {},
          ghl_created_at: contact.dateAdded,
          ghl_updated_at: contact.dateUpdated || new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        };

        await supabase
          .from('ghl_contacts')
          .upsert(contactData, { onConflict: 'ghl_id' });

        result = { handled: true, action: 'contact_synced', contactId: contact.id };
      }
    }

    // Handle opportunity events
    if (eventType?.toLowerCase().includes('opportunity')) {
      const opp = payload.data?.opportunity || payload.opportunity || payload;

      const oppData = {
        ghl_id: opp.id,
        ghl_contact_id: opp.contactId,
        ghl_pipeline_id: opp.pipelineId,
        ghl_stage_id: opp.pipelineStageId,
        name: opp.name,
        pipeline_name: opp.pipelineName,
        stage_name: opp.pipelineStageName || opp.stageName,
        status: opp.status,
        monetary_value: opp.monetaryValue,
        custom_fields: opp.customFields || {},
        assigned_to: opp.assignedTo,
        ghl_created_at: opp.dateAdded,
        ghl_updated_at: opp.dateUpdated || new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };

      await supabase
        .from('ghl_opportunities')
        .upsert(oppData, { onConflict: 'ghl_id' });

      result = { handled: true, action: 'opportunity_synced', opportunityId: opp.id };
    }

    // Log to sync_log
    await supabase.from('ghl_sync_log').insert({
      operation: eventType,
      entity_type: eventType?.toLowerCase().includes('contact') ? 'contact' : 'opportunity',
      entity_id: result.contactId || result.opportunityId,
      direction: 'ghl_to_supabase',
      status: 'success',
      triggered_by: 'webhook',
      records_processed: 1,
      completed_at: new Date().toISOString(),
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Webhook error:', error);

    // Log error
    await supabase.from('ghl_sync_log').insert({
      operation: eventType,
      entity_type: 'unknown',
      direction: 'ghl_to_supabase',
      status: 'error',
      error_message: error.message,
      triggered_by: 'webhook',
      completed_at: new Date().toISOString(),
    }).catch(() => {});

    return res.status(500).json({ error: error.message });
  }
}
