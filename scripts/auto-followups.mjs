/**
 * Auto Follow-up Triggers Service
 * Automatically suggests and queues follow-up actions based on relationship health
 *
 * Usage:
 *   npm run followups:check    # Check for needed follow-ups
 *   npm run followups:queue    # Queue follow-up actions
 *   npm run followups:send     # Send reminder notifications
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Follow-up trigger rules
const TRIGGER_RULES = {
  // Partner hasn't been contacted in 14+ days
  partner_overdue: {
    condition: (contact) =>
      contact.contactType === 'partner' &&
      contact.daysSinceContact >= 14,
    priority: 'high',
    action: 'Schedule catch-up call',
    template: 'partner_checkin'
  },

  // Client with critical relationship score
  client_critical: {
    condition: (contact) =>
      contact.contactType === 'client' &&
      contact.status === 'critical',
    priority: 'urgent',
    action: 'Immediate outreach needed',
    template: 'client_reactivation'
  },

  // Any contact not reached in 30+ days
  general_overdue: {
    condition: (contact) =>
      contact.daysSinceContact >= 30 &&
      contact.status !== 'healthy',
    priority: 'medium',
    action: 'Send check-in message',
    template: 'general_checkin'
  },

  // Inbound message not responded to in 48 hours
  pending_response: {
    condition: (contact) =>
      contact.lastInboundDaysAgo <= 2 &&
      contact.lastOutboundDaysAgo > 2,
    priority: 'high',
    action: 'Respond to their message',
    template: 'response_needed'
  },

  // Relationship score dropping
  declining_relationship: {
    condition: (contact) =>
      contact.scoreTrend === 'declining' &&
      contact.score < 50,
    priority: 'medium',
    action: 'Re-engage to prevent relationship decay',
    template: 'reengagement'
  }
};

// Message templates
const TEMPLATES = {
  partner_checkin: {
    subject: 'Quick catch-up?',
    message: "Hey! It's been a couple weeks - wanted to check in and see how things are going. Got time for a quick call this week?"
  },
  client_reactivation: {
    subject: 'Checking in',
    message: "Hi! I realized we haven't connected in a while. Wanted to reach out and see how things are progressing. Is there anything I can help with?"
  },
  general_checkin: {
    subject: 'Thinking of you',
    message: "Hey! Just wanted to drop a line and say hi. Hope all is well - would love to catch up sometime."
  },
  response_needed: {
    subject: null, // Reply to their thread
    message: null  // Context-dependent
  },
  reengagement: {
    subject: 'Quick question',
    message: "Hi! I was thinking about our last conversation and wanted to follow up. Do you have a few minutes to chat this week?"
  }
};

/**
 * Check all contacts against trigger rules
 */
export async function checkFollowupTriggers() {
  // Get relationship scores from entity_relationships
  const { data: relationships, error } = await supabase
    .from('entity_relationships')
    .select('*')
    .eq('entity_type', 'contact')
    .eq('related_entity_type', 'user');

  if (error) throw error;

  const triggers = [];

  for (const rel of relationships || []) {
    const contactData = enrichContactData(rel);

    // Check each rule
    for (const [ruleId, rule] of Object.entries(TRIGGER_RULES)) {
      if (rule.condition(contactData)) {
        triggers.push({
          contactId: rel.entity_id,
          ruleId,
          priority: rule.priority,
          action: rule.action,
          template: rule.template,
          score: contactData.score,
          daysSinceContact: contactData.daysSinceContact,
          contactType: contactData.contactType
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  triggers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return triggers;
}

/**
 * Enrich relationship data with computed fields
 */
function enrichContactData(relationship) {
  const metadata = relationship.metadata || {};
  const lastInteraction = new Date(relationship.last_interaction);
  const daysSinceContact = Math.floor(
    (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    contactId: relationship.entity_id,
    score: Math.round(relationship.strength_score * 100),
    status: metadata.status || 'unknown',
    contactType: relationship.relationship_type || 'default',
    daysSinceContact,
    lastInboundDaysAgo: metadata.lastInboundDaysAgo || daysSinceContact,
    lastOutboundDaysAgo: metadata.lastOutboundDaysAgo || daysSinceContact,
    scoreTrend: metadata.scoreTrend || 'stable'
  };
}

/**
 * Queue follow-up actions in Notion Actions database
 */
export async function queueFollowups(triggers) {
  const actionsDbId = process.env.NOTION_ACTIONS_DATABASE_ID;
  if (!actionsDbId) {
    console.warn('NOTION_ACTIONS_DATABASE_ID not set - skipping Notion queue');
    return { queued: 0 };
  }

  let queued = 0;

  for (const trigger of triggers) {
    try {
      // Get contact name
      const { data: contactChunk } = await supabase
        .from('knowledge_chunks')
        .select('metadata')
        .eq('source_id', trigger.contactId)
        .eq('source_type', 'ghl')
        .single();

      const contactName = contactChunk?.metadata?.name || trigger.contactId;
      const template = TEMPLATES[trigger.template];

      // Check if similar action already exists
      const existingQuery = await notion.databases.query({
        database_id: actionsDbId,
        filter: {
          and: [
            { property: 'Status', status: { does_not_equal: 'Done' } },
            { property: 'Action Item', title: { contains: contactName } }
          ]
        }
      });

      if (existingQuery.results.length > 0) {
        console.log(`  ⏭️  Action already exists for ${contactName}`);
        continue;
      }

      // Create action in Notion
      await notion.pages.create({
        parent: { database_id: actionsDbId },
        icon: { emoji: trigger.priority === 'urgent' ? '🔴' : trigger.priority === 'high' ? '🟡' : '🟢' },
        properties: {
          'Action Item': {
            title: [{ text: { content: `Follow up with ${contactName}` } }]
          },
          'Status': {
            status: { name: 'Not started' }
          },
          'Type': {
            select: { name: 'Follow-up' }
          },
          'Notes': {
            rich_text: [{
              text: {
                content: `${trigger.action}\n\nPriority: ${trigger.priority}\nDays since contact: ${trigger.daysSinceContact}\nRelationship score: ${trigger.score}/100\n\n${template?.message || ''}`
              }
            }]
          }
        }
      });

      queued++;
      console.log(`  ✓ Queued action for ${contactName} (${trigger.priority})`);
    } catch (e) {
      console.error(`  ✗ Error queueing ${trigger.contactId}:`, e.message);
    }
  }

  return { queued, total: triggers.length };
}

/**
 * Get follow-up summary for morning brief
 */
export async function getFollowupSummary() {
  const triggers = await checkFollowupTriggers();

  const summary = {
    urgent: triggers.filter(t => t.priority === 'urgent').length,
    high: triggers.filter(t => t.priority === 'high').length,
    medium: triggers.filter(t => t.priority === 'medium').length,
    total: triggers.length,
    topActions: triggers.slice(0, 5).map(t => ({
      action: t.action,
      priority: t.priority
    }))
  };

  return summary;
}

/**
 * Store follow-up check results for trend tracking
 */
async function storeCheckResults(triggers) {
  await supabase.from('knowledge_chunks').insert({
    content: JSON.stringify({
      type: 'followup_check',
      date: new Date().toISOString(),
      triggers: triggers.length,
      byPriority: {
        urgent: triggers.filter(t => t.priority === 'urgent').length,
        high: triggers.filter(t => t.priority === 'high').length,
        medium: triggers.filter(t => t.priority === 'medium').length
      }
    }),
    source_type: 'system',
    source_id: `followup-check-${Date.now()}`,
    metadata: {
      type: 'followup_check',
      timestamp: new Date().toISOString()
    }
  });
}

// CLI Interface
const command = process.argv[2];

if (command === 'check' || !command) {
  console.log('\n🔍 Checking follow-up triggers...\n');

  checkFollowupTriggers()
    .then(triggers => {
      if (triggers.length === 0) {
        console.log('✨ No follow-ups needed right now!');
        return;
      }

      console.log(`Found ${triggers.length} follow-up triggers:\n`);

      const byPriority = {
        urgent: triggers.filter(t => t.priority === 'urgent'),
        high: triggers.filter(t => t.priority === 'high'),
        medium: triggers.filter(t => t.priority === 'medium')
      };

      for (const [priority, items] of Object.entries(byPriority)) {
        if (items.length === 0) continue;

        const emoji = { urgent: '🔴', high: '🟡', medium: '🟢' }[priority];
        console.log(`${emoji} ${priority.toUpperCase()} (${items.length}):`);

        for (const item of items) {
          console.log(`   • ${item.action}`);
          console.log(`     Contact ID: ${item.contactId}`);
          console.log(`     Days since contact: ${item.daysSinceContact}`);
        }
        console.log('');
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'queue') {
  console.log('\n📋 Queueing follow-up actions to Notion...\n');

  checkFollowupTriggers()
    .then(triggers => queueFollowups(triggers))
    .then(result => {
      console.log(`\n✓ Queued ${result.queued}/${result.total} actions`);
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'summary') {
  getFollowupSummary()
    .then(summary => {
      console.log('\n📊 Follow-up Summary:\n');
      console.log(`Total pending: ${summary.total}`);
      console.log(`  🔴 Urgent: ${summary.urgent}`);
      console.log(`  🟡 High:   ${summary.high}`);
      console.log(`  🟢 Medium: ${summary.medium}`);

      if (summary.topActions.length > 0) {
        console.log('\nTop actions:');
        summary.topActions.forEach((a, i) => {
          console.log(`  ${i + 1}. ${a.action} (${a.priority})`);
        });
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else {
  console.log(`
Auto Follow-up Triggers

Commands:
  check    Check for needed follow-ups (default)
  queue    Queue follow-up actions to Notion
  summary  Get summary for morning brief

Trigger Rules:
  • Partner not contacted in 14+ days
  • Client with critical relationship score
  • Any contact not reached in 30+ days
  • Inbound message not responded to in 48h
  • Declining relationship score

Priority Levels:
  🔴 Urgent:  Immediate action needed
  🟡 High:    Should address today
  🟢 Medium:  Address this week
`);
}
