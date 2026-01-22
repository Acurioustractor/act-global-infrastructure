#!/usr/bin/env node
/**
 * Cultivator Agent - Relationship Outreach That Actually Sends
 *
 * The first ACT executing agent. Cultivator:
 * 1. Identifies contacts needing outreach (relationship health alerts)
 * 2. Pulls full context for each contact
 * 3. Generates personalized outreach message
 * 4. Queues for human approval
 * 5. On approval: ACTUALLY SENDS via Signal/Email
 * 6. Logs the interaction and schedules follow-up
 *
 * Usage:
 *   node scripts/cultivator-agent.mjs run             # Find cold contacts, propose outreach
 *   node scripts/cultivator-agent.mjs pending         # Show pending approvals
 *   node scripts/cultivator-agent.mjs approve <id>    # Approve and SEND
 *   node scripts/cultivator-agent.mjs execute         # Execute all approved
 *   node scripts/cultivator-agent.mjs test            # Dry run with test data
 *
 * Environment Variables:
 *   SUPABASE_SERVICE_ROLE_KEY - Database access
 *   SIGNAL_PHONE - For Signal sending
 *   OPENAI_API_KEY or ANTHROPIC_API_KEY - For message generation
 */

import { createClient } from '@supabase/supabase-js';
import { AgenticWorkflow, approveProposal, listPendingProposals } from './lib/agentic-workflow.mjs';
import { ActionExecutor, executeAction } from './lib/action-executor.mjs';
import { sendDiscordMessage, sendEmbed, templates } from './discord-notify.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const AGENT_ID = 'cultivator';
const DEFAULT_CHANNEL = 'email'; // Default to email (more formal, paper trail)
const DEFAULT_FOLLOWUP_DAYS = 14;

// ============================================================================
// CONTACT CONTEXT
// ============================================================================

/**
 * Get full context for a contact
 */
async function getContactContext(contactId) {
  if (!supabase) throw new Error('Database required');

  // Get contact
  const { data: contact } = await supabase
    .from('ghl_contacts')
    .select('*')
    .eq('ghl_id', contactId)
    .single();

  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  // Get relationship health
  const { data: health } = await supabase
    .from('relationship_health')
    .select('*')
    .eq('ghl_contact_id', contactId)
    .single();

  // Get recent communications
  const { data: comms } = await supabase
    .from('communications_history')
    .select('*')
    .eq('ghl_contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(10);

  // Get voice note mentions
  const name = contact.full_name || '';
  const { data: voiceNotes } = await supabase
    .from('voice_notes')
    .select('summary, recorded_at, project_context')
    .or(`mentioned_people.cs.{${name}},transcript.ilike.%${name}%`)
    .order('recorded_at', { ascending: false })
    .limit(5);

  // Calculate days since last contact
  const lastContactDate = contact.last_contact_date || health?.last_contact_at;
  const daysSince = lastContactDate
    ? Math.floor((Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Get project involvement from tags
  const tags = contact.tags || [];

  return {
    contact,
    health,
    recentComms: comms || [],
    voiceNotes: voiceNotes || [],
    daysSinceContact: daysSince,
    tags,
    lastInteraction: comms?.[0] || null
  };
}

/**
 * Get contacts needing outreach
 */
async function getContactsNeedingOutreach(limit = 5) {
  if (!supabase) throw new Error('Database required');

  // Get contacts with low relationship health that have phone/email
  const { data: coldContacts, error } = await supabase
    .from('relationship_health')
    .select(`
      ghl_contact_id,
      temperature,
      days_since_contact,
      lcaa_stage,
      suggested_actions,
      risk_flags
    `)
    .or('temperature.lt.40,days_since_contact.gt.30')
    .order('temperature', { ascending: true })
    .limit(limit * 2); // Get more to filter

  if (error) throw error;
  if (!coldContacts || coldContacts.length === 0) {
    return [];
  }

  // Enrich with contact details
  const enriched = [];
  for (const health of coldContacts) {
    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, phone, tags, company_name')
      .eq('ghl_id', health.ghl_contact_id)
      .single();

    if (contact && (contact.phone || contact.email)) {
      enriched.push({
        ...contact,
        ...health,
        // Prefer email (more formal, paper trail) - fall back to signal if no email
        preferred_channel: contact.email ? 'email' : 'signal'
      });
    }

    if (enriched.length >= limit) break;
  }

  return enriched;
}

// ============================================================================
// MESSAGE GENERATION
// ============================================================================

/**
 * Generate personalized outreach message
 */
async function generateOutreachMessage(context) {
  const { contact, health, recentComms, voiceNotes, daysSinceContact, lastInteraction } = context;

  // Build context for message generation
  const name = contact.first_name || contact.full_name?.split(' ')[0] || 'there';
  const tags = contact.tags || [];

  // Find relevant context
  const lastTopic = lastInteraction?.content_preview ||
                    voiceNotes[0]?.summary ||
                    (tags.length > 0 ? `your work in ${tags[0]}` : 'our previous conversations');

  // Simple template-based generation (replace with LLM later)
  const templates = [
    // General check-in
    `Hi ${name}, hope you're doing well! It's been a while since we caught up${daysSinceContact ? ` (about ${daysSinceContact} days)` : ''}. Would love to hear how things are going with ${lastTopic}. Do you have time for a quick call this week?`,

    // Project-focused
    `Hey ${name}! Was thinking about ${lastTopic} today and wanted to check in. How's everything progressing? Happy to help if there's anything on your plate.`,

    // Casual reconnect
    `Hi ${name}, ${daysSinceContact > 45 ? "It's been too long!" : "Just wanted to reach out"} How are things going? I'd love to catch up when you have a moment.`,
  ];

  // Pick based on relationship temperature
  const templateIndex = health?.temperature < 30 ? 0 :
                        health?.temperature < 50 ? 1 : 2;

  let message = templates[templateIndex];

  // If we have an LLM configured, use it for better personalization
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    try {
      message = await generateWithLLM(context);
    } catch (e) {
      console.warn('LLM generation failed, using template:', e.message);
    }
  }

  return message;
}

/**
 * Generate message using LLM (OpenAI or Anthropic)
 */
async function generateWithLLM(context) {
  const { contact, health, recentComms, voiceNotes, daysSinceContact, tags } = context;

  const prompt = `Generate a brief, warm outreach message to reconnect with a contact.

Contact Info:
- Name: ${contact.full_name}
- Company: ${contact.company_name || 'N/A'}
- Tags: ${tags.join(', ') || 'None'}
- Days since last contact: ${daysSinceContact || 'Unknown'}
- Relationship temperature: ${health?.temperature || 'Unknown'}/100

Recent context:
${recentComms.slice(0, 3).map(c =>
  `- ${new Date(c.occurred_at).toLocaleDateString()}: ${c.content_preview?.slice(0, 100) || c.channel}`
).join('\n') || 'No recent communications'}

${voiceNotes.length > 0 ? `Voice note mentions:\n${voiceNotes.slice(0, 2).map(v => `- ${v.summary?.slice(0, 100)}`).join('\n')}` : ''}

Write a SHORT (2-3 sentences max) message that:
1. Uses their first name
2. References something specific if available
3. Suggests reconnecting
4. Sounds natural and human, not AI-generated
5. Does NOT use exclamation marks excessively

Message:`;

  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // Try Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return data.content[0].text.trim();
  }

  throw new Error('No LLM API key configured');
}

// ============================================================================
// PROPOSAL CREATION
// ============================================================================

/**
 * Create outreach proposal for a contact
 */
async function proposeOutreach(contact, context) {
  const workflow = new AgenticWorkflow(AGENT_ID, { verbose: true });

  // Generate the message
  const message = await generateOutreachMessage(context);

  // Determine channel - prefer email (more formal, paper trail)
  const channel = contact.email ? 'email' : 'signal';
  const recipient = channel === 'signal' ? contact.phone : contact.email;

  // Create proposal with full action payload
  const proposal = await workflow.propose({
    action: channel === 'signal' ? 'send_signal' : 'send_email',
    title: `Reconnect with ${contact.full_name}`,
    description: `${context.daysSinceContact || 'Many'} days since last contact. Relationship temperature: ${context.health?.temperature || 'Unknown'}`,
    reasoning: {
      trigger: 'relationship_health_alert',
      confidence: 0.85,
      days_since_contact: context.daysSinceContact,
      temperature: context.health?.temperature,
      explanation: `Contact hasn't been reached in ${context.daysSinceContact || 'many'} days`
    },
    params: {
      type: channel === 'signal' ? 'send_signal' : 'send_email',
      to: recipient,
      message,
      contact_id: contact.ghl_id,
      contact_name: contact.full_name
    },
    priority: context.daysSinceContact > 60 ? 'high' : 'normal',
    expectedOutcome: `Message sent via ${channel}, follow-up scheduled in ${DEFAULT_FOLLOWUP_DAYS} days`
  });

  // Store action details in the proposal's proposed_action field (already exists)
  // Note: target_contact_id and execution_channel are optional columns that may not exist yet
  if (supabase) {
    const updateData = {
      proposed_action: {
        type: channel === 'signal' ? 'send_signal' : 'send_email',
        to: recipient,
        message,
        contact_id: contact.ghl_id,
        contact_name: contact.full_name,
        channel,
        followup_days: DEFAULT_FOLLOWUP_DAYS
      }
    };

    // Try to update with optional columns, fall back if they don't exist
    const { error } = await supabase
      .from('agent_proposals')
      .update(updateData)
      .eq('id', proposal.proposalId);

    if (error) {
      console.warn('Note: Could not update proposal extras:', error.message);
    }
  }

  return {
    ...proposal,
    contactName: contact.full_name,
    channel,
    message
  };
}

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute an approved proposal
 */
async function executeProposal(proposalId) {
  if (!supabase) throw new Error('Database required');

  // Get proposal
  const { data: proposal, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error) throw new Error(`Failed to get proposal: ${error.message}`);
  if (proposal.status !== 'approved') {
    throw new Error(`Proposal not approved (status: ${proposal.status})`);
  }

  // Get action details from proposed_action (may also be in action_payload if migration applied)
  const payload = proposal.action_payload || proposal.proposed_action;
  if (!payload) {
    throw new Error('No action payload in proposal');
  }

  const channel = payload.channel || proposal.execution_channel || 'email';

  console.log(`\n🚀 Executing proposal: ${proposal.title}`);
  console.log(`   Channel: ${channel}`);
  console.log(`   To: ${payload.to}`);

  // Create executor
  const executor = new ActionExecutor({
    agentId: AGENT_ID,
    verbose: true,
    dryRun: false
  });

  // Execute the full outreach workflow
  const contactId = payload.contact_id || proposal.target_contact_id;
  const result = await executor.executeOutreach({
    contact_id: contactId,
    contact_phone: channel === 'signal' ? payload.to : null,
    contact_email: channel === 'email' ? payload.to : null,
    message: payload.message,
    channel: channel,
    followup_days: payload.followup_days || DEFAULT_FOLLOWUP_DAYS,
    agent_name: AGENT_ID
  });

  // Update proposal status
  await supabase
    .from('agent_proposals')
    .update({
      status: result.success ? 'completed' : 'failed',
      execution_completed_at: new Date().toISOString(),
      execution_result: result,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId);

  // Notify Discord
  if (result.success) {
    await sendDiscordMessage('alerts',
      `✅ **Outreach Sent** to ${proposal.title?.replace('Reconnect with ', '')}\n` +
      `Channel: ${proposal.execution_channel}\n` +
      `Follow-up scheduled: ${payload.followup_days || DEFAULT_FOLLOWUP_DAYS} days`
    );
  } else {
    await sendDiscordMessage('errors',
      `❌ **Outreach Failed** for ${proposal.title}\n` +
      `Error: ${result.error || 'Unknown'}`
    );
  }

  return result;
}

// ============================================================================
// DISCORD NOTIFICATION
// ============================================================================

/**
 * Post approval request to Discord
 */
async function notifyDiscordForApproval(proposal, context) {
  const embed = {
    title: `🌱 Cultivator: Outreach Suggestion`,
    color: 0x00AE86,
    fields: [
      { name: '👤 Contact', value: proposal.contactName, inline: true },
      { name: '📞 Channel', value: proposal.channel.toUpperCase(), inline: true },
      { name: '📅 Days Silent', value: context.daysSinceContact?.toString() || '?', inline: true },
      { name: '💬 Message', value: `\`\`\`${proposal.message.slice(0, 500)}\`\`\``, inline: false },
      { name: '🔑 Proposal ID', value: `\`${proposal.proposalId}\``, inline: false }
    ],
    footer: {
      text: `Approve: node scripts/cultivator-agent.mjs approve ${proposal.proposalId}`
    },
    timestamp: new Date().toISOString()
  };

  await sendEmbed('alerts', embed);
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

/**
 * Run: Find cold contacts and propose outreach
 */
async function runCultivator(limit = 5) {
  console.log('\n🌱 Cultivator Agent - Finding contacts for outreach...\n');

  const contacts = await getContactsNeedingOutreach(limit);

  if (contacts.length === 0) {
    console.log('✨ All relationships are healthy! No outreach needed.');
    return [];
  }

  console.log(`Found ${contacts.length} contacts needing attention:\n`);

  const proposals = [];

  for (const contact of contacts) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📇 ${contact.full_name}`);
    console.log(`   Temperature: ${contact.temperature || '?'}/100`);
    console.log(`   Days since contact: ${contact.days_since_contact || '?'}`);
    console.log(`   Channel: ${contact.preferred_channel}`);

    try {
      const context = await getContactContext(contact.ghl_contact_id);
      const proposal = await proposeOutreach(contact, context);
      proposals.push(proposal);

      console.log(`   ✅ Proposal created: ${proposal.proposalId}`);
      console.log(`   📝 Message preview: "${proposal.message.slice(0, 80)}..."`);

      // Notify Discord
      await notifyDiscordForApproval(proposal, context);

    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📋 Created ${proposals.length} proposals for approval.`);
  console.log(`\nTo approve: node scripts/cultivator-agent.mjs approve <proposal-id>`);
  console.log(`To see all: node scripts/cultivator-agent.mjs pending\n`);

  return proposals;
}

/**
 * Show pending approvals
 */
async function showPending() {
  console.log('\n📋 Pending Cultivator Proposals\n');

  const { data: proposals, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('agent_id', AGENT_ID)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!proposals || proposals.length === 0) {
    console.log('No pending proposals.\n');
    console.log('Run: node scripts/cultivator-agent.mjs run');
    return;
  }

  proposals.forEach((p, i) => {
    const payload = p.action_payload || p.proposed_action || {};
    const channel = payload.channel || p.execution_channel || '?';
    console.log(`${i + 1}. [${p.priority?.toUpperCase() || 'NORMAL'}] ${p.title}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Channel: ${channel}`);
    console.log(`   To: ${payload.to || '?'}`);
    console.log(`   Message: "${(payload.message || '').slice(0, 60)}..."`);
    console.log(`   Created: ${new Date(p.created_at).toLocaleString()}`);
    console.log('');
  });

  console.log(`\nTo approve: node scripts/cultivator-agent.mjs approve <id>`);
  console.log(`To approve all: node scripts/cultivator-agent.mjs approve-all\n`);
}

/**
 * Approve and execute a proposal
 */
async function approveAndExecute(proposalId) {
  console.log(`\n🔐 Approving proposal: ${proposalId}\n`);

  // Approve it
  await approveProposal(proposalId, 'cli-user', 'Approved via CLI');
  console.log('✅ Proposal approved');

  // Execute it
  console.log('\n🚀 Executing...\n');
  const result = await executeProposal(proposalId);

  if (result.success) {
    console.log('\n✅ Message sent successfully!');
    console.log(`   Follow-up scheduled.`);
  } else {
    console.log(`\n❌ Execution failed: ${result.error}`);
  }

  return result;
}

/**
 * Execute all approved proposals
 */
async function executeApproved() {
  const { data: approved } = await supabase
    .from('agent_proposals')
    .select('id, title')
    .eq('agent_id', AGENT_ID)
    .eq('status', 'approved');

  if (!approved || approved.length === 0) {
    console.log('No approved proposals to execute.\n');
    return;
  }

  console.log(`\n🚀 Executing ${approved.length} approved proposals...\n`);

  for (const proposal of approved) {
    try {
      console.log(`Executing: ${proposal.title}`);
      await executeProposal(proposal.id);
    } catch (e) {
      console.log(`  Failed: ${e.message}`);
    }
  }
}

/**
 * Test mode - dry run with fake data
 */
async function testMode() {
  console.log('\n🧪 Cultivator Agent - TEST MODE\n');

  // Get a real contact for testing (but don't send)
  const contacts = await getContactsNeedingOutreach(1);

  if (contacts.length === 0) {
    console.log('No contacts found for testing. Creating synthetic test...\n');

    const mockContext = {
      contact: {
        ghl_id: 'test-123',
        full_name: 'Test Contact',
        first_name: 'Test',
        email: 'test@example.com',
        phone: '+61400000000',
        tags: ['partner']
      },
      health: { temperature: 25 },
      recentComms: [],
      voiceNotes: [],
      daysSinceContact: 45,
      tags: ['partner']
    };

    const message = await generateOutreachMessage(mockContext);
    console.log('Generated message:\n');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));

    console.log('\n✅ Test complete. Message generation working.');
    return;
  }

  const contact = contacts[0];
  const context = await getContactContext(contact.ghl_contact_id);

  console.log(`Test contact: ${contact.full_name}`);
  console.log(`Days since contact: ${context.daysSinceContact}`);
  console.log(`Temperature: ${context.health?.temperature || '?'}\n`);

  const message = await generateOutreachMessage(context);

  console.log('Generated message:\n');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));

  console.log('\n📝 Would create proposal for this contact.');
  console.log('Run without "test" to create actual proposals.\n');
}

// ============================================================================
// MAIN
// ============================================================================

const command = process.argv[2] || 'help';
const arg1 = process.argv[3];

switch (command) {
  case 'run':
    await runCultivator(parseInt(arg1) || 5);
    break;

  case 'pending':
    await showPending();
    break;

  case 'approve':
    if (!arg1) {
      console.log('Usage: node scripts/cultivator-agent.mjs approve <proposal-id>');
      process.exit(1);
    }
    await approveAndExecute(arg1);
    break;

  case 'approve-all':
    const { data: pending } = await supabase
      .from('agent_proposals')
      .select('id')
      .eq('agent_id', AGENT_ID)
      .eq('status', 'pending');

    for (const p of pending || []) {
      await approveAndExecute(p.id);
    }
    break;

  case 'execute':
    await executeApproved();
    break;

  case 'test':
    await testMode();
    break;

  default:
    console.log(`
🌱 Cultivator Agent - Relationship Outreach

Commands:
  run [limit]     Find cold contacts and propose outreach (default: 5)
  pending         Show pending approval queue
  approve <id>    Approve and SEND a specific proposal
  approve-all     Approve and send ALL pending proposals
  execute         Execute all approved proposals
  test            Test mode - generate message without sending

Workflow:
  1. Run "cultivator run" to find contacts needing outreach
  2. Review proposals in Discord or with "cultivator pending"
  3. Approve with "cultivator approve <id>"
  4. Message is SENT, interaction logged, follow-up scheduled

Example:
  node scripts/cultivator-agent.mjs run
  node scripts/cultivator-agent.mjs pending
  node scripts/cultivator-agent.mjs approve abc123-def456

The cultivator actually SENDS messages. It doesn't just suggest.
`);
}
