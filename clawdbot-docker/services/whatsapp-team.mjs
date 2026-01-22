/**
 * WhatsApp Team Service
 *
 * Handles team communication via WhatsApp through GHL.
 * Features:
 * - Daily summaries pushed to team channel
 * - Weekly digests on Sunday evening
 * - Reflection prompts at key times
 * - Voice note processing
 *
 * @author ACT Technology
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Configuration
const config = {
  ghl: {
    apiKey: process.env.GHL_API_KEY,
    locationId: process.env.GHL_LOCATION_ID,
    baseUrl: 'https://services.leadconnectorhq.com',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-haiku-20240307',
  },
  team: {
    // Team WhatsApp numbers (GHL conversation IDs)
    members: {
      ben: process.env.WHATSAPP_BEN_CONVERSATION_ID,
      nic: process.env.WHATSAPP_NIC_CONVERSATION_ID,
    },
  },
};

// Initialize clients lazily
let supabase = null;
let anthropic = null;

function getSupabase() {
  if (!supabase && config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key);
  }
  return supabase;
}

function getAnthropic() {
  if (!anthropic && config.anthropic.key) {
    anthropic = new Anthropic({ apiKey: config.anthropic.key });
  }
  return anthropic;
}

/**
 * Send WhatsApp message via GHL
 *
 * @param {string} conversationId - GHL conversation ID
 * @param {string} message - Message text
 * @returns {boolean} Success status
 */
async function sendWhatsAppMessage(conversationId, message) {
  if (!config.ghl.apiKey) {
    console.error('[whatsapp-team] GHL API key not configured');
    return false;
  }

  try {
    const response = await fetch(`${config.ghl.baseUrl}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ghl.apiKey}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        type: 'WhatsApp',
        contactId: conversationId,
        message: message,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[whatsapp-team] Send failed: ${response.status} - ${text}`);
      return false;
    }

    console.log(`[whatsapp-team] Message sent to ${conversationId}`);
    return true;
  } catch (error) {
    console.error(`[whatsapp-team] Send error:`, error.message);
    return false;
  }
}

/**
 * Send message to a team member by name
 *
 * @param {string} userName - 'ben' or 'nic'
 * @param {string} message - Message text
 */
async function sendToTeamMember(userName, message) {
  const conversationId = config.team.members[userName];
  if (!conversationId) {
    console.error(`[whatsapp-team] No WhatsApp ID for: ${userName}`);
    return false;
  }

  return sendWhatsAppMessage(conversationId, message);
}

/**
 * Send message to all team members
 *
 * @param {string} message - Message text
 */
async function sendToTeam(message) {
  const results = {};

  for (const [name, conversationId] of Object.entries(config.team.members)) {
    if (conversationId) {
      results[name] = await sendWhatsAppMessage(conversationId, message);
    }
  }

  return results;
}

/**
 * Generate and send daily summary
 */
async function sendDailySummary() {
  console.log('[whatsapp-team] Generating daily summary...');

  const db = getSupabase();
  const claude = getAnthropic();

  if (!db || !claude) {
    console.error('[whatsapp-team] Missing Supabase or Anthropic config');
    return;
  }

  // Get today's data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Fetch recent communications
  const { data: comms } = await db
    .from('communications_history')
    .select('channel, direction, subject, summary, contact_email, ghl_contact_id')
    .gte('occurred_at', todayISO)
    .order('occurred_at', { ascending: false })
    .limit(20);

  // Fetch awaiting response
  const { data: awaiting } = await db
    .from('v_awaiting_response')
    .select('contact_name, subject, days_waiting')
    .limit(5);

  // Fetch need to respond
  const { data: needRespond } = await db
    .from('v_need_to_respond')
    .select('contact_name, subject, days_since')
    .limit(5);

  // Fetch recent voice notes
  const { data: voiceNotes } = await db
    .from('voice_notes')
    .select('summary, recorded_by_name, topics')
    .gte('recorded_at', todayISO)
    .limit(5);

  // Generate summary with Claude
  const prompt = `Create a concise WhatsApp daily summary for the ACT team.
Format it nicely with emojis for mobile reading. Keep it under 1000 characters.

Today's data:
- Communications: ${comms?.length || 0} (${comms?.filter(c => c.direction === 'inbound').length || 0} inbound, ${comms?.filter(c => c.direction === 'outbound').length || 0} outbound)
- Awaiting their response: ${awaiting?.map(a => `${a.contact_name} (${a.days_waiting}d)`).join(', ') || 'None'}
- We need to respond to: ${needRespond?.map(n => `${n.contact_name} (${n.days_since}d)`).join(', ') || 'None'}
- Voice notes today: ${voiceNotes?.length || 0}

Recent communication highlights:
${comms?.slice(0, 5).map(c => `- ${c.channel}: ${c.subject || c.summary?.slice(0, 50) || 'No subject'}`).join('\n') || 'No communications yet today'}

Voice note summaries:
${voiceNotes?.map(v => `- ${v.recorded_by_name}: ${v.summary?.slice(0, 50) || 'No summary'}`).join('\n') || 'No voice notes today'}`;

  const response = await claude.messages.create({
    model: config.anthropic.model,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = response.content[0]?.text || 'Daily summary generation failed.';

  // Send to team
  const results = await sendToTeam(summary);
  console.log('[whatsapp-team] Daily summary sent:', results);

  return summary;
}

/**
 * Generate and send weekly digest
 */
async function sendWeeklyDigest() {
  console.log('[whatsapp-team] Generating weekly digest...');

  const db = getSupabase();
  const claude = getAnthropic();

  if (!db || !claude) {
    console.error('[whatsapp-team] Missing configuration');
    return;
  }

  // Get week's data
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  // Fetch week's stats
  const { data: comms } = await db
    .from('communications_history')
    .select('channel, direction')
    .gte('occurred_at', weekAgoISO);

  const { data: voiceNotes } = await db
    .from('voice_notes')
    .select('summary, topics')
    .gte('recorded_at', weekAgoISO);

  // Get relationship health changes
  const { data: relationships } = await db
    .from('relationship_health')
    .select('ghl_contact_id, temperature, temperature_trend')
    .or('temperature_trend.eq.rising,temperature_trend.eq.falling')
    .limit(10);

  // Get cold contacts
  const { data: coldContacts } = await db
    .from('relationship_health')
    .select('ghl_contact_id')
    .lte('temperature', 30)
    .limit(5);

  // Generate digest
  const channels = {};
  comms?.forEach(c => {
    channels[c.channel] = (channels[c.channel] || 0) + 1;
  });

  const topics = {};
  voiceNotes?.forEach(v => {
    v.topics?.forEach(t => {
      topics[t] = (topics[t] || 0) + 1;
    });
  });

  const prompt = `Create a concise WhatsApp weekly digest for ACT team.
Format nicely with emojis. Keep under 1500 characters. Include reflection prompts.

Week's stats:
- Total communications: ${comms?.length || 0}
- By channel: ${JSON.stringify(channels)}
- Inbound: ${comms?.filter(c => c.direction === 'inbound').length || 0}
- Outbound: ${comms?.filter(c => c.direction === 'outbound').length || 0}
- Voice notes: ${voiceNotes?.length || 0}
- Top topics: ${Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `${t}(${c})`).join(', ') || 'None'}

Relationship trends:
- Warming up: ${relationships?.filter(r => r.temperature_trend === 'rising').length || 0} contacts
- Cooling down: ${relationships?.filter(r => r.temperature_trend === 'falling').length || 0} contacts
- Cold (need attention): ${coldContacts?.length || 0} contacts

End with 2-3 reflection questions for the coming week.`;

  const response = await claude.messages.create({
    model: config.anthropic.model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const digest = response.content[0]?.text || 'Weekly digest generation failed.';

  const results = await sendToTeam(digest);
  console.log('[whatsapp-team] Weekly digest sent:', results);

  return digest;
}

/**
 * Send reflection prompt
 *
 * @param {string} promptType - 'morning', 'evening', 'weekend'
 */
async function sendReflectionPrompt(promptType = 'evening') {
  const prompts = {
    morning: `Good morning!

Quick reflection before you start:
- What's the ONE thing that would make today great?
- Who needs your attention today?
- What are you grateful for?

Have a wonderful day!`,

    evening: `Evening reflection time

Before you switch off:
- What went well today?
- What did you learn?
- What would you do differently?

Rest well!`,

    weekend: `Weekend reflection

Take a moment to look back at the week:
- What are you most proud of?
- What relationships did you nurture?
- What's one thing you want to focus on next week?

Enjoy your weekend!`,
  };

  const message = prompts[promptType] || prompts.evening;
  const results = await sendToTeam(message);

  console.log(`[whatsapp-team] ${promptType} reflection sent:`, results);
  return results;
}

/**
 * Send a quick update/notification
 */
async function sendNotification(title, body, urgent = false) {
  const emoji = urgent ? '' : '';
  const message = `${emoji} *${title}*\n\n${body}`;

  return sendToTeam(message);
}

/**
 * Health check
 */
function getHealthStatus() {
  return {
    service: 'whatsapp-team',
    status: 'ready',
    ghlConfigured: !!config.ghl.apiKey,
    teamMembers: Object.keys(config.team.members).filter(k => config.team.members[k]),
  };
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, ...args] = process.argv;

  const commands = {
    async daily() {
      await sendDailySummary();
    },

    async weekly() {
      await sendWeeklyDigest();
    },

    async reflect() {
      const type = args[0] || 'evening';
      await sendReflectionPrompt(type);
    },

    async send() {
      const [recipient, ...messageParts] = args;
      const message = messageParts.join(' ');

      if (!recipient || !message) {
        console.log('Usage: node whatsapp-team.mjs send <ben|nic|team> <message>');
        process.exit(1);
      }

      if (recipient === 'team') {
        await sendToTeam(message);
      } else {
        await sendToTeamMember(recipient, message);
      }
    },

    async notify() {
      const [title, ...bodyParts] = args;
      const body = bodyParts.join(' ');

      if (!title || !body) {
        console.log('Usage: node whatsapp-team.mjs notify <title> <body>');
        process.exit(1);
      }

      await sendNotification(title, body);
    },

    async test() {
      console.log('WhatsApp Team Configuration:');
      console.log('- GHL API:', config.ghl.apiKey ? 'Configured' : 'MISSING');
      console.log('- Team members:', Object.entries(config.team.members)
        .map(([name, id]) => `${name}: ${id ? 'OK' : 'MISSING'}`)
        .join(', '));
      console.log('- Supabase:', config.supabase.url ? 'Configured' : 'MISSING');
      console.log('- Anthropic:', config.anthropic.key ? 'Configured' : 'MISSING');
    },
  };

  if (commands[command]) {
    commands[command]().catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
  } else {
    console.log('WhatsApp Team Service');
    console.log('Commands:');
    console.log('  daily                     - Send daily summary');
    console.log('  weekly                    - Send weekly digest');
    console.log('  reflect [morning|evening|weekend] - Send reflection prompt');
    console.log('  send <ben|nic|team> <message>    - Send a message');
    console.log('  notify <title> <body>     - Send notification');
    console.log('  test                      - Check configuration');
  }
}

export {
  sendWhatsAppMessage,
  sendToTeamMember,
  sendToTeam,
  sendDailySummary,
  sendWeeklyDigest,
  sendReflectionPrompt,
  sendNotification,
  getHealthStatus,
};

export default {
  sendToTeamMember,
  sendToTeam,
  sendDailySummary,
  sendWeeklyDigest,
  sendReflectionPrompt,
  sendNotification,
  getHealthStatus,
};
