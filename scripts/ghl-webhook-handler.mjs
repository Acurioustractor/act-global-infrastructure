#!/usr/bin/env node

/**
 * GoHighLevel Webhook Handler
 *
 * Processes webhooks from GHL to sync data in real-time:
 * - Contacts → ghl_contacts table
 * - Opportunities → ghl_opportunities table
 * - Logs all sync operations → ghl_sync_log table
 *
 * Webhook Events Handled:
 *   - ContactCreate / ContactUpdate / ContactDelete
 *   - ContactTagUpdate
 *   - OpportunityCreate / OpportunityUpdate / OpportunityStatusUpdate
 *
 * Setup:
 *   1. Deploy this as a serverless function or Express endpoint
 *   2. Configure webhook URL in GHL Settings > Webhooks
 *   3. Enable desired event types
 *
 * Usage (standalone test):
 *   node scripts/ghl-webhook-handler.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

// Use shared ACT database for GHL sync
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

class GHLWebhookHandler {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.ghl = null;

    // Try to initialize GHL service (optional, for enrichment)
    try {
      this.ghl = createGHLService();
    } catch (err) {
      console.warn('GHL service not configured, some features disabled');
    }
  }

  /**
   * Main webhook handler
   * Call this with the webhook payload from your HTTP endpoint
   */
  async handleWebhook(payload) {
    const eventType = payload.type || payload.event;
    const data = payload.data || payload;

    console.log(`📥 Webhook received: ${eventType}`);

    try {
      switch (eventType) {
        // Contact events
        case 'ContactCreate':
        case 'contact.created':
          return await this.handleContactCreate(data);

        case 'ContactUpdate':
        case 'contact.updated':
          return await this.handleContactUpdate(data);

        case 'ContactDelete':
        case 'contact.deleted':
          return await this.handleContactDelete(data);

        case 'ContactTagUpdate':
        case 'contact.tag_update':
          return await this.handleContactTagUpdate(data);

        // Opportunity events
        case 'OpportunityCreate':
        case 'opportunity.created':
          return await this.handleOpportunityCreate(data);

        case 'OpportunityUpdate':
        case 'opportunity.updated':
          return await this.handleOpportunityUpdate(data);

        case 'OpportunityStatusUpdate':
        case 'opportunity.status_update':
          return await this.handleOpportunityStatusUpdate(data);

        // Communication events
        case 'InboundMessage':
        case 'message.inbound':
          return await this.handleInboundMessage(data);

        case 'OutboundMessage':
        case 'message.outbound':
          return await this.handleOutboundMessage(data);

        case 'CallCompleted':
        case 'call.completed':
          return await this.handleCallCompleted(data);

        // Appointment events
        case 'AppointmentCreate':
        case 'appointment.created':
          return await this.handleAppointmentCreate(data);

        case 'AppointmentUpdate':
        case 'appointment.updated':
          return await this.handleAppointmentUpdate(data);

        // Note events
        case 'NoteCreate':
        case 'note.created':
          return await this.handleNoteCreate(data);

        default:
          console.log(`⚠️  Unhandled event type: ${eventType}`);
          return { handled: false, eventType };
      }
    } catch (error) {
      console.error(`❌ Webhook error (${eventType}):`, error);
      throw error;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONTACT HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async handleContactCreate(data) {
    const contact = data.contact || data;
    console.log(`👤 New contact: ${contact.name || contact.email}`);

    await this.upsertContact(contact);
    await this.logSync('create', 'contact', contact.id, 'success');

    return { handled: true, action: 'contact_created', contactId: contact.id };
  }

  async handleContactUpdate(data) {
    const contact = data.contact || data;
    console.log(`✏️  Contact updated: ${contact.name || contact.email}`);

    await this.upsertContact(contact);
    await this.logSync('update', 'contact', contact.id, 'success');

    return { handled: true, action: 'contact_updated', contactId: contact.id };
  }

  async handleContactDelete(data) {
    const contactId = data.contactId || data.id;
    console.log(`🗑️  Contact deleted: ${contactId}`);

    // Soft delete - update sync_status instead of removing
    await this.supabase
      .from('ghl_contacts')
      .update({ sync_status: 'deleted', updated_at: new Date().toISOString() })
      .eq('ghl_id', contactId);

    await this.logSync('delete', 'contact', contactId, 'success');

    return { handled: true, action: 'contact_deleted', contactId };
  }

  async handleContactTagUpdate(data) {
    const contact = data.contact || data;
    const tags = data.tags || contact.tags || [];
    console.log(`🏷️  Tags updated for ${contact.name || contact.email}: ${tags.join(', ')}`);

    await this.upsertContact(contact);
    await this.logSync('update', 'contact', contact.id, 'success', { tags });

    return { handled: true, action: 'tags_updated', contactId: contact.id, tags };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OPPORTUNITY HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async handleOpportunityCreate(data) {
    const opportunity = data.opportunity || data;
    console.log(`💼 New opportunity: ${opportunity.name}`);

    await this.upsertOpportunity(opportunity);
    await this.logSync('create', 'opportunity', opportunity.id, 'success');

    return { handled: true, action: 'opportunity_created', opportunityId: opportunity.id };
  }

  async handleOpportunityUpdate(data) {
    const opportunity = data.opportunity || data;
    console.log(`✏️  Opportunity updated: ${opportunity.name}`);

    await this.upsertOpportunity(opportunity);
    await this.logSync('update', 'opportunity', opportunity.id, 'success');

    return { handled: true, action: 'opportunity_updated', opportunityId: opportunity.id };
  }

  async handleOpportunityStatusUpdate(data) {
    const opportunity = data.opportunity || data;
    const newStatus = data.status || opportunity.status;
    console.log(`📊 Opportunity status: ${opportunity.name} → ${newStatus}`);

    await this.upsertOpportunity(opportunity);
    await this.logSync('update', 'opportunity', opportunity.id, 'success', { status: newStatus });

    return {
      handled: true,
      action: 'opportunity_status_updated',
      opportunityId: opportunity.id,
      status: newStatus,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMUNICATION HANDLERS - stores in communications_history
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async handleInboundMessage(data) {
    const message = data.message || data;
    const contactId = message.contactId || data.contactId;
    console.log(`📥 Inbound message from contact: ${contactId}`);

    const now = new Date().toISOString();

    // Update contact's last_contact_date
    await this.supabase
      .from('ghl_contacts')
      .update({ last_contact_date: now })
      .eq('ghl_id', contactId);

    // Store in communications_history
    await this.supabase.from('communications_history').upsert({
      ghl_contact_id: contactId,
      channel: message.type || 'sms',
      direction: 'inbound',
      subject: null,
      content_preview: message.body?.slice(0, 500),
      occurred_at: message.dateCreated || now,
      source_system: 'ghl',
      source_id: message.id,
      waiting_for_response: true,
      response_needed_by: 'us',
    }, { onConflict: 'source_system,source_id' });

    return { handled: true, action: 'inbound_message', contactId, messageId: message.id };
  }

  async handleOutboundMessage(data) {
    const message = data.message || data;
    const contactId = message.contactId || data.contactId;
    console.log(`📤 Outbound message to contact: ${contactId}`);

    const now = new Date().toISOString();

    // Update contact's last_contact_date
    await this.supabase
      .from('ghl_contacts')
      .update({ last_contact_date: now })
      .eq('ghl_id', contactId);

    // Store in communications_history
    await this.supabase.from('communications_history').upsert({
      ghl_contact_id: contactId,
      channel: message.type || 'sms',
      direction: 'outbound',
      subject: null,
      content_preview: message.body?.slice(0, 500),
      occurred_at: message.dateCreated || now,
      source_system: 'ghl',
      source_id: message.id,
      waiting_for_response: true,
      response_needed_by: 'them',
    }, { onConflict: 'source_system,source_id' });

    return { handled: true, action: 'outbound_message', contactId, messageId: message.id };
  }

  async handleCallCompleted(data) {
    const call = data.call || data;
    const contactId = call.contactId || data.contactId;
    console.log(`📞 Call completed with contact: ${contactId}`);

    const now = new Date().toISOString();

    // Update contact's last_contact_date
    await this.supabase
      .from('ghl_contacts')
      .update({ last_contact_date: now })
      .eq('ghl_id', contactId);

    // Store in communications_history
    await this.supabase.from('communications_history').upsert({
      ghl_contact_id: contactId,
      channel: 'call',
      direction: call.direction || 'outbound',
      subject: `Call (${call.duration || 0}s)`,
      content_preview: call.notes?.slice(0, 500),
      occurred_at: call.dateCreated || now,
      source_system: 'ghl',
      source_id: call.id,
      waiting_for_response: false,
      response_needed_by: null,
    }, { onConflict: 'source_system,source_id' });

    return { handled: true, action: 'call_completed', contactId, callId: call.id };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // APPOINTMENT HANDLERS - stores in communications_history
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async handleAppointmentCreate(data) {
    const appointment = data.appointment || data;
    const contactId = appointment.contactId || data.contactId;
    console.log(`📅 New appointment: ${appointment.title}`);

    const now = new Date().toISOString();

    // Update contact's last_contact_date
    if (contactId) {
      await this.supabase
        .from('ghl_contacts')
        .update({ last_contact_date: now })
        .eq('ghl_id', contactId);

      // Store in communications_history
      await this.supabase.from('communications_history').upsert({
        ghl_contact_id: contactId,
        channel: 'calendar',
        direction: 'outbound',
        subject: appointment.title,
        content_preview: appointment.notes?.slice(0, 500),
        occurred_at: appointment.startTime || now,
        source_system: 'ghl',
        source_id: appointment.id,
        waiting_for_response: false,
        response_needed_by: null,
      }, { onConflict: 'source_system,source_id' });
    }

    return {
      handled: true,
      action: 'appointment_created',
      contactId,
      appointmentId: appointment.id,
    };
  }

  async handleAppointmentUpdate(data) {
    const appointment = data.appointment || data;
    const contactId = appointment.contactId || data.contactId;
    console.log(`✏️  Appointment updated: ${appointment.title}`);

    // Update in communications_history if contact exists
    if (contactId && appointment.id) {
      await this.supabase.from('communications_history').upsert({
        ghl_contact_id: contactId,
        channel: 'calendar',
        direction: 'outbound',
        subject: appointment.title,
        content_preview: appointment.notes?.slice(0, 500),
        occurred_at: appointment.startTime || new Date().toISOString(),
        source_system: 'ghl',
        source_id: appointment.id,
        waiting_for_response: false,
        response_needed_by: null,
      }, { onConflict: 'source_system,source_id' });
    }

    return { handled: true, action: 'appointment_updated', appointmentId: appointment.id };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NOTE HANDLERS (log only)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async handleNoteCreate(data) {
    const note = data.note || data;
    const contactId = note.contactId || data.contactId;
    console.log(`📝 New note for contact: ${contactId}`);

    // Update contact's last_contact_date
    if (contactId) {
      await this.supabase
        .from('ghl_contacts')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('ghl_id', contactId);
    }

    return { handled: true, action: 'note_created', contactId, noteId: note.id };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER METHODS - ghl_* tables
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Upsert contact to ghl_contacts table
   */
  async upsertContact(contact) {
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

    const { error } = await this.supabase
      .from('ghl_contacts')
      .upsert(contactData, { onConflict: 'ghl_id' });

    if (error) {
      console.error('Error upserting contact:', error);
      throw error;
    }
  }

  /**
   * Upsert opportunity to ghl_opportunities table
   */
  async upsertOpportunity(opportunity) {
    const opportunityData = {
      ghl_id: opportunity.id,
      ghl_contact_id: opportunity.contactId,
      ghl_pipeline_id: opportunity.pipelineId,
      ghl_stage_id: opportunity.pipelineStageId,
      name: opportunity.name,
      pipeline_name: opportunity.pipelineName,
      stage_name: opportunity.pipelineStageName || opportunity.stageName,
      status: opportunity.status,
      monetary_value: opportunity.monetaryValue,
      custom_fields: opportunity.customFields || {},
      assigned_to: opportunity.assignedTo,
      ghl_created_at: opportunity.dateAdded,
      ghl_updated_at: opportunity.dateUpdated || new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('ghl_opportunities')
      .upsert(opportunityData, { onConflict: 'ghl_id' });

    if (error) {
      console.error('Error upserting opportunity:', error);
      throw error;
    }
  }

  /**
   * Log sync operation to ghl_sync_log table
   */
  async logSync(operation, entityType, entityId, status, metadata = {}) {
    await this.supabase.from('ghl_sync_log').insert({
      operation,
      entity_type: entityType,
      entity_id: entityId,
      direction: 'ghl_to_supabase',
      status,
      triggered_by: 'webhook',
      metadata,
      records_processed: 1,
      records_created: operation === 'create' ? 1 : 0,
      records_updated: operation === 'update' ? 1 : 0,
      completed_at: new Date().toISOString(),
    });
  }
}

// Singleton instance
export const webhookHandler = new GHLWebhookHandler();

/**
 * Express/Vercel API handler
 * Use this in your API routes
 */
export async function handleWebhookRequest(req, res) {
  try {
    const result = await webhookHandler.handleWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}

// CLI entry point for testing
if (process.argv[1]?.endsWith('ghl-webhook-handler.mjs')) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 GHL Webhook Handler');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Tables used:');
  console.log('  - ghl_contacts (upsert on contact events)');
  console.log('  - ghl_opportunities (upsert on opportunity events)');
  console.log('  - ghl_sync_log (logs all webhook operations)');
  console.log('');
  console.log('Example Express usage:');
  console.log('');
  console.log("  import { handleWebhookRequest } from './ghl-webhook-handler.mjs';");
  console.log('  app.post("/api/webhooks/ghl", handleWebhookRequest);');
  console.log('');
  console.log('Required environment variables:');
  console.log('  - SUPABASE_SHARED_URL or SUPABASE_URL');
  console.log('  - SUPABASE_SHARED_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  console.log('  - GHL_LOCATION_ID');
  console.log('');

  // Test with sample payload
  console.log('🧪 Testing with sample webhook payload...');
  console.log('');

  const samplePayload = {
    type: 'ContactCreate',
    data: {
      contact: {
        id: 'test-webhook-contact-' + Date.now(),
        firstName: 'Test',
        lastName: 'WebhookContact',
        email: 'test-webhook@example.com',
        tags: ['Partner', 'ACT Farm'],
        dateAdded: new Date().toISOString(),
      },
    },
  };

  try {
    const result = await webhookHandler.handleWebhook(samplePayload);
    console.log('✅ Test result:', result);
    console.log('');
    console.log('Check ghl_contacts and ghl_sync_log tables for the test entry.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.log('');
    console.log('Make sure environment variables are set:');
    console.log('  SUPABASE_SHARED_URL:', SUPABASE_URL ? '✓' : '✗');
    console.log('  SUPABASE_SHARED_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✓' : '✗');
    console.log('  GHL_LOCATION_ID:', GHL_LOCATION_ID ? '✓' : '✗');
  }
}

export default webhookHandler;
