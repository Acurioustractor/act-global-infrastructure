/**
 * Event Reaction Rules
 *
 * Each rule defines: when to fire, what notification to send, and rate limits.
 * Rules are evaluated in priority order (lower = higher priority).
 */

import { supabase } from '@/lib/supabase';
import type { ReactionRule, IntegrationEventRow } from './types';

export const rules: ReactionRule[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EMAIL: New email from key contact
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'email.key_contact',
    priority: 10,
    cooldownMinutes: 30,
    entityKey: (event) => {
      const from = (event.payload?.emailAddress as string) || event.entity_id;
      return `email:${from}`;
    },
    match: (event) => {
      return event.source === 'gmail' && event.event_type === 'gmail.push_sync' && event.action === 'created';
    },
    react: async (event) => {
      const payload = event.payload || {};
      const messagesProcessed = (payload.messagesProcessed as number) || 0;
      if (messagesProcessed === 0) return null;

      const emailAddress = payload.emailAddress as string;
      const sourceIds = (payload.processedSourceIds as string[]) || [];
      if (sourceIds.length === 0) return null;

      // Look up only the specific messages from this push event
      const { data: newEmails } = await supabase
        .from('communications_history')
        .select('subject, metadata, ghl_contact_id, direction')
        .eq('source_system', 'gmail')
        .eq('direction', 'inbound')
        .in('source_id', sourceIds)
        .not('ghl_contact_id', 'is', null);

      if (!newEmails || newEmails.length === 0) return null;

      // Check if any matched contacts have key tags
      const contactIds = [...new Set(newEmails.map((e) => e.ghl_contact_id).filter(Boolean))];
      if (contactIds.length === 0) return null;

      const { data: keyContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, tags')
        .in('ghl_id', contactIds)
        .or('tags.cs.{"partner"},tags.cs.{"funder"},tags.cs.{"key-relationship"},tags.cs.{"responsive"}');

      if (!keyContacts || keyContacts.length === 0) return null;

      // Build notification for the first key contact email
      const keyContact = keyContacts[0];
      const email = newEmails.find((e) => e.ghl_contact_id === keyContact.ghl_id);
      if (!email) return null;

      const from = (email.metadata as Record<string, string>)?.from || 'Unknown';
      const subject = email.subject || '(no subject)';

      return {
        message: `New email from ${keyContact.full_name || from}:\n"${subject.substring(0, 80)}"\n\nMailbox: ${emailAddress}`,
        actions: [
          { label: 'View in Gmail', callback: `gmail:open:${emailAddress}` },
        ],
      };
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINANCE: Invoice paid
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'finance.invoice_paid',
    priority: 20,
    cooldownMinutes: 60,
    entityKey: (event) => `invoice:${event.entity_id}`,
    match: (event) => {
      return (
        event.source === 'xero' &&
        event.event_type === 'xero.invoice' &&
        event.action === 'updated'
      );
    },
    react: async (event) => {
      // Fetch the invoice to check if it's actually paid
      const { data: invoice } = await supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, total, status, type')
        .eq('xero_id', event.entity_id)
        .maybeSingle();

      if (!invoice || invoice.status !== 'PAID' || invoice.type !== 'ACCREC') return null;

      const amount = Number(invoice.total).toLocaleString('en-AU', {
        style: 'currency',
        currency: 'AUD',
      });

      return {
        message: `${invoice.contact_name || 'Client'} paid ${amount} (${invoice.invoice_number})`,
        actions: [
          { label: 'View in Xero', callback: `xero:invoice:${event.entity_id}` },
        ],
      };
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GRANTS: Deadline approaching
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'grants.deadline_warning',
    priority: 15,
    cooldownMinutes: 720, // 12 hours
    entityKey: (event) => `grant:${event.entity_id}`,
    match: (event) => {
      return event.source === 'system' && event.event_type === 'grant.deadline_warning';
    },
    react: async (event) => {
      const payload = event.payload || {};
      const grantName = (payload.name as string) || 'Unknown Grant';
      const daysRemaining = payload.days_remaining as number;
      const status = (payload.status as string) || 'open';

      return {
        message: `Grant "${grantName}" closes in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.\nStatus: ${status}`,
        actions: [
          { label: 'Open Application', callback: `grant:apply:${event.entity_id}` },
          { label: 'Dismiss', callback: `grant:dismiss:${event.entity_id}` },
        ],
      };
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GHL: New opportunity created
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'ghl.new_opportunity',
    priority: 30,
    cooldownMinutes: 60,
    entityKey: (event) => `opp:${event.entity_id}`,
    match: (event) => {
      return (
        event.source === 'ghl' &&
        event.event_type === 'opportunity.create' &&
        event.action === 'created'
      );
    },
    react: async (event) => {
      const { data: opp } = await supabase
        .from('ghl_opportunities')
        .select('name, pipeline_name, monetary_value, stage_name')
        .eq('ghl_id', event.entity_id)
        .maybeSingle();

      if (!opp) return null;

      const value = opp.monetary_value
        ? ` ($${Number(opp.monetary_value).toLocaleString('en-AU')})`
        : '';

      return {
        message: `New opportunity: ${opp.name}${value}\nPipeline: ${opp.pipeline_name || 'Unknown'}\nStage: ${opp.stage_name || 'New'}`,
        actions: [
          { label: 'Review', callback: `ghl:opp:${event.entity_id}` },
        ],
      };
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SYSTEM: Overdue action items
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'system.action_overdue',
    priority: 25,
    cooldownMinutes: 480, // 8 hours
    entityKey: (event) => `action:${event.entity_id}`,
    match: (event) => {
      return event.source === 'system' && event.event_type === 'action.overdue';
    },
    react: async (event) => {
      const payload = event.payload || {};
      const title = (payload.title as string) || 'Unknown action';
      const daysOverdue = (payload.days_overdue as number) || 0;
      const projectCode = (payload.project_code as string) || '';

      const project = projectCode ? ` [${projectCode}]` : '';

      return {
        message: `${project} "${title}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
        actions: [
          { label: 'Complete', callback: `action:complete:${event.entity_id}` },
          { label: 'Defer 7d', callback: `action:defer:${event.entity_id}:7` },
        ],
      };
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SYSTEM: Contact engagement drop
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    name: 'system.engagement_drop',
    priority: 35,
    cooldownMinutes: 1440, // 24 hours
    entityKey: (event) => `engagement:${event.entity_id}`,
    match: (event) => {
      return event.source === 'system' && event.event_type === 'engagement.drop';
    },
    react: async (event) => {
      const payload = event.payload || {};
      const contactName = (payload.contact_name as string) || 'Unknown';
      const previousStatus = (payload.previous_status as string) || 'active';
      const newStatus = (payload.new_status as string) || 'cooling';
      const lastContactDate = (payload.last_contact_date as string) || '';

      const daysSince = lastContactDate
        ? Math.floor((Date.now() - new Date(lastContactDate).getTime()) / 86400000)
        : null;

      const daysStr = daysSince ? ` (${daysSince}d ago)` : '';

      return {
        message: `${contactName} engagement: ${previousStatus} -> ${newStatus}${daysStr}`,
        actions: [
          { label: 'Reach Out', callback: `contact:email:${event.entity_id}` },
          { label: 'Acknowledge', callback: `contact:ack:${event.entity_id}` },
        ],
      };
    },
  },
];
