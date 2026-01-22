#!/usr/bin/env node
/**
 * Relationship Alert Agent
 *
 * An agentic script that:
 * 1. Analyzes relationship health scores
 * 2. PROPOSES outreach actions (Level 2 - requires approval)
 * 3. Executes approved actions after human review
 *
 * This demonstrates the agentic workflow pattern:
 * - Agent identifies problems autonomously
 * - Agent proposes solutions
 * - Human approves/rejects/modifies
 * - Agent executes approved work
 *
 * Usage:
 *   node scripts/relationship-alert-agent.mjs analyze    - Analyze and propose
 *   node scripts/relationship-alert-agent.mjs execute    - Execute approved proposals
 *   node scripts/relationship-alert-agent.mjs status     - Show agent status
 */

import { createClient } from '@supabase/supabase-js';
import { AgenticWorkflow, listPendingProposals } from './lib/agentic-workflow.mjs';
import '../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AGENT_ID = 'relationship-alert-agent';
const workflow = new AgenticWorkflow(AGENT_ID, { verbose: true });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANALYSIS PHASE
// Agent autonomously identifies issues and proposes actions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function analyzeAndPropose() {
  console.log('\n🔍 Analyzing relationship health...\n');

  // Get contacts not contacted recently (proxy for relationship health)
  // Contacts with last_contact_date > 90 days ago or NULL need attention
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select(`
      ghl_id,
      full_name,
      email,
      company_name,
      last_contact_date,
      tags
    `)
    .not('email', 'is', null)
    .or(`last_contact_date.is.null,last_contact_date.lt.${ninetyDaysAgo.toISOString()}`)
    .order('last_contact_date', { ascending: true, nullsFirst: true })
    .limit(10);

  if (error) {
    console.error('Error fetching contacts:', error);
    return;
  }

  if (!contacts || contacts.length === 0) {
    console.log('✅ All relationships are healthy! No actions needed.');
    return;
  }

  console.log(`Found ${contacts.length} contacts needing attention:\n`);

  const proposals = [];

  for (const contact of contacts) {
    const daysSinceContact = contact.last_contact_date
      ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate relationship score based on days since last contact
    // 0 days = 1.0, 90 days = 0.5, 180+ days = 0.1
    let score = 0.1;
    if (daysSinceContact !== null) {
      score = Math.max(0.1, 1 - (daysSinceContact / 180));
    }

    // Determine urgency and action
    let priority = 'normal';
    let action = 'send_notification';
    let suggestedAction = 'check-in email';

    if (daysSinceContact === null || daysSinceContact > 180) {
      priority = 'urgent';
      suggestedAction = 'personal call or coffee meeting';
    } else if (daysSinceContact > 120) {
      priority = 'high';
      suggestedAction = 'personal email with genuine interest';
    }

    console.log(`  • ${contact.full_name} (${contact.company_name || 'No company'})`);
    console.log(`    Health: ${(score * 100).toFixed(0)}% | Last contact: ${daysSinceContact ? `${daysSinceContact} days ago` : 'Never recorded'}`);
    console.log(`    Suggested: ${suggestedAction}\n`);

    // Create proposal for human approval
    const proposal = await workflow.propose({
      action,
      title: `Outreach to ${contact.full_name}`,
      description: `Relationship score is ${(score * 100).toFixed(0)}%. ${
        daysSinceContact ? `Last contact was ${daysSinceContact} days ago.` : 'No recent contact recorded.'
      } Suggest: ${suggestedAction}`,
      reasoning: {
        trigger: 'low_relationship_score',
        confidence: 0.85,
        evidence: {
          relationship_score: score,
          days_since_contact: daysSinceContact,
          company: contact.company_name,
          tags: contact.tags
        },
        explanation: `${contact.full_name}'s relationship score (${(score * 100).toFixed(0)}%) is below the healthy threshold of 50%. This contact may need personal attention to maintain the relationship.`,
        alternatives_considered: [
          { action: 'wait', reason: 'They may reach out first', rejected: 'Low scores tend to decay further without action' },
          { action: 'automated_email', reason: 'Less effort', rejected: 'Personal touch more effective for relationship building' }
        ]
      },
      params: {
        contact_id: contact.ghl_id,
        contact_name: contact.full_name,
        contact_email: contact.email,
        suggested_action: suggestedAction,
        message_template: generateMessageSuggestion(contact, suggestedAction)
      },
      priority,
      expectedOutcome: `Improved relationship score through genuine reconnection`
    });

    proposals.push(proposal);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 Created ${proposals.length} proposals for human review`);
  console.log(`\nTo review and approve:`);
  console.log(`  node scripts/lib/agentic-workflow.mjs pending`);
  console.log(`  node scripts/lib/agentic-workflow.mjs approve <id>`);
  console.log(`\nAfter approval, execute with:`);
  console.log(`  node scripts/relationship-alert-agent.mjs execute`);
}

function generateMessageSuggestion(contact, actionType) {
  const firstName = contact.full_name?.split(' ')[0] || 'there';

  if (actionType.includes('call') || actionType.includes('coffee')) {
    return `Hi ${firstName}, I've been meaning to catch up. Would you have time for a quick coffee or call sometime this week? Would love to hear how things are going at ${contact.company_name || 'your end'}.`;
  }

  if (actionType.includes('personal')) {
    return `Hi ${firstName}, Hope you're doing well! I was thinking about you the other day and wanted to check in. How have things been going? Would love to hear what you've been up to.`;
  }

  return `Hi ${firstName}, Hope this finds you well! Just wanted to reach out and see how things are going. Let me know if there's anything I can help with.`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTION PHASE
// Execute approved proposals
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeApproved() {
  console.log('\n🚀 Executing approved proposals...\n');

  // Get approved proposals for this agent
  const approved = await workflow.getApprovedProposals();

  if (approved.length === 0) {
    console.log('No approved proposals to execute.');
    console.log('Run `node scripts/lib/agentic-workflow.mjs pending` to see pending proposals.');
    return;
  }

  console.log(`Found ${approved.length} approved proposals:\n`);

  for (const proposal of approved) {
    console.log(`Executing: ${proposal.title}`);

    const result = await workflow.executeApproved(proposal.id, async (params) => {
      // In a real implementation, this would:
      // - Send an email via SendGrid/GHL
      // - Create a task in a CRM
      // - Schedule a calendar reminder

      // For now, we'll simulate and log
      console.log(`\n  📧 Would send outreach to: ${params.contact_name}`);
      console.log(`     Email: ${params.contact_email}`);
      console.log(`     Action: ${params.suggested_action}`);
      console.log(`     Message preview: "${params.message_template?.substring(0, 80)}..."`);

      // Log to audit trail
      await supabase.from('agent_audit_log').insert({
        agent_id: AGENT_ID,
        action: 'outreach_initiated',
        target_table: 'ghl_contacts',
        target_id: params.contact_id,
        input_summary: {
          contact: params.contact_name,
          action_type: params.suggested_action
        },
        output_summary: { status: 'simulated' },
        success: true
      });

      return {
        status: 'simulated',
        contact: params.contact_name,
        action: params.suggested_action,
        note: 'In production, this would send an actual outreach'
      };
    });

    if (result.success) {
      console.log(`  ✅ Completed in ${result.duration}ms\n`);
    } else {
      console.log(`  ❌ Failed: ${result.error}\n`);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATUS REPORT
// Show agent activity summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function showStatus() {
  console.log('\n📊 Relationship Alert Agent Status\n');
  console.log('━'.repeat(50));

  // Pending proposals
  const pending = await workflow.getPendingProposals();
  console.log(`\n📋 Pending proposals: ${pending.length}`);
  pending.slice(0, 5).forEach(p => {
    console.log(`   • ${p.title} [${p.priority}]`);
  });

  // Approved (ready to execute)
  const approved = await workflow.getApprovedProposals();
  console.log(`\n✅ Approved (ready): ${approved.length}`);
  approved.slice(0, 5).forEach(p => {
    console.log(`   • ${p.title}`);
  });

  // Recent completions
  const { data: recent } = await supabase
    .from('agent_proposals')
    .select('title, status, execution_completed_at')
    .eq('agent_id', AGENT_ID)
    .eq('status', 'completed')
    .order('execution_completed_at', { ascending: false })
    .limit(5);

  console.log(`\n🏁 Recent completions: ${recent?.length || 0}`);
  (recent || []).forEach(p => {
    console.log(`   • ${p.title}`);
  });

  // Summary
  const { data: stats } = await supabase
    .from('agent_proposals')
    .select('status')
    .eq('agent_id', AGENT_ID);

  if (stats) {
    const statusCounts = stats.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 All-time stats:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  }

  console.log('\n' + '━'.repeat(50));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const command = process.argv[2];

console.log('🤖 Relationship Alert Agent');
console.log('━'.repeat(50));

switch (command) {
  case 'analyze':
    await analyzeAndPropose();
    break;

  case 'execute':
    await executeApproved();
    break;

  case 'status':
    await showStatus();
    break;

  default:
    console.log(`
Usage:
  node scripts/relationship-alert-agent.mjs analyze   - Find issues & propose actions
  node scripts/relationship-alert-agent.mjs execute   - Execute approved proposals
  node scripts/relationship-alert-agent.mjs status    - Show agent status

Workflow:
  1. Agent analyzes contacts autonomously
  2. Agent creates proposals for outreach
  3. Human reviews: approve/reject/modify
  4. Agent executes approved actions

This demonstrates bounded autonomy:
  - Agent CAN identify problems automatically
  - Agent CAN propose solutions
  - Agent CANNOT execute without approval (Level 2)
  - Human remains in control
    `);
}
