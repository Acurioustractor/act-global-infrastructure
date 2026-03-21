#!/usr/bin/env node
/**
 * Discord Notification System for ACT Agents
 *
 * Sends notifications to Discord channels via webhooks.
 * Each agent type has its own channel for organized updates.
 *
 * Usage:
 *   node scripts/discord-notify.mjs <channel> <message>
 *   node scripts/discord-notify.mjs test "Hello from ACT!"
 *
 * Channels:
 *   alerts      - Relationship alerts, urgent notifications
 *   enrichment  - Contact enrichment cycle updates
 *   ralph       - Ralph agent task progress
 *   morning     - Morning briefs and daily summaries
 *   errors      - Error notifications and system issues
 *   general     - General updates
 *
 * Environment Variables (add to .env.local):
 *   DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_ENRICHMENT=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_RALPH=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_MORNING=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_ERRORS=https://discord.com/api/webhooks/...
 *   DISCORD_WEBHOOK_GENERAL=https://discord.com/api/webhooks/...
 */

import '../lib/load-env.mjs';
import { fileURLToPath } from 'url';

// Channel webhook mappings
const CHANNELS = {
    alerts: process.env.DISCORD_WEBHOOK_ALERTS,
    enrichment: process.env.DISCORD_WEBHOOK_ENRICHMENT,
    ralph: process.env.DISCORD_WEBHOOK_RALPH,
    morning: process.env.DISCORD_WEBHOOK_MORNING,
    errors: process.env.DISCORD_WEBHOOK_ERRORS,
    general: process.env.DISCORD_WEBHOOK_GENERAL,
    tasks: process.env.DISCORD_WEBHOOK_TASKS,
    voice: process.env.DISCORD_WEBHOOK_VOICE,
    // Fallback - use general for any undefined channel
    default: process.env.DISCORD_WEBHOOK_GENERAL
};

// Agent avatars and names
const AGENTS = {
    alerts: {
        username: '🚨 ACT Relationship Alerts',
        avatar_url: 'https://act.place/icons/alert.png'
    },
    enrichment: {
        username: '🔄 ACT Enrichment Engine',
        avatar_url: 'https://act.place/icons/enrichment.png'
    },
    ralph: {
        username: '🤖 Ralph',
        avatar_url: 'https://act.place/icons/ralph.png'
    },
    morning: {
        username: '☀️ ACT Morning Brief',
        avatar_url: 'https://act.place/icons/morning.png'
    },
    errors: {
        username: '❌ ACT Error Monitor',
        avatar_url: 'https://act.place/icons/error.png'
    },
    general: {
        username: '📢 ACT System',
        avatar_url: 'https://act.place/icons/act.png'
    },
    tasks: {
        username: '✅ ACT Tasks',
        avatar_url: 'https://act.place/icons/tasks.png'
    },
    voice: {
        username: '🎙️ ACT Voice Notes',
        avatar_url: 'https://act.place/icons/voice.png'
    }
};

/**
 * Send a message to a Discord channel
 */
export async function sendDiscordMessage(channel, content, options = {}) {
    const webhookUrl = CHANNELS[channel] || CHANNELS.default;

    if (!webhookUrl) {
        console.error(`No webhook configured for channel: ${channel}`);
        console.error('Add DISCORD_WEBHOOK_<CHANNEL> to your .env.local');
        return false;
    }

    const agent = AGENTS[channel] || AGENTS.general;

    const payload = {
        username: options.username || agent.username,
        avatar_url: options.avatar_url || agent.avatar_url,
        content: typeof content === 'string' ? content : undefined,
        embeds: options.embeds || (typeof content === 'object' ? [content] : undefined)
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`Discord API error: ${response.status} - ${error}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Failed to send Discord message: ${error.message}`);
        return false;
    }
}

/**
 * Send a rich embed message
 */
export async function sendEmbed(channel, embed) {
    return sendDiscordMessage(channel, null, { embeds: [embed] });
}

/**
 * Pre-built message templates
 */
export const templates = {
    // Morning brief summary
    morningBrief: (stats) => ({
        title: '☀️ ACT Morning Brief',
        color: 0x00AE86,
        fields: [
            { name: '🔥 Needs Response', value: stats.needsResponse?.toString() || '0', inline: true },
            { name: '🚨 Going Cold', value: stats.goingCold?.toString() || '0', inline: true },
            { name: '📊 Active (30d)', value: stats.active?.toString() || '0', inline: true },
            { name: '💡 Top Priority', value: stats.topPriority || 'None', inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'ACT Relationship Intelligence' }
    }),

    // Enrichment cycle complete
    enrichmentComplete: (results) => ({
        title: '🔄 Enrichment Cycle Complete',
        color: 0x5865F2,
        description: `Completed in ${results.duration}s`,
        fields: [
            { name: 'Communications Linked', value: results.commsLinked?.toString() || '0', inline: true },
            { name: 'Identities Consolidated', value: results.identitiesLinked?.toString() || '0', inline: true },
            { name: 'Contacts Updated', value: results.contactsUpdated?.toString() || '0', inline: true }
        ],
        timestamp: new Date().toISOString()
    }),

    // Ralph task update
    ralphTask: (task, status) => ({
        title: `🤖 Ralph: ${task.title}`,
        color: status === 'complete' ? 0x57F287 : status === 'failed' ? 0xED4245 : 0xFEE75C,
        description: task.description,
        fields: [
            { name: 'Status', value: status.toUpperCase(), inline: true },
            { name: 'Project', value: task.project || 'ACT', inline: true }
        ],
        timestamp: new Date().toISOString()
    }),

    // Error alert
    error: (service, message, severity = 'error') => ({
        title: `❌ ${severity.toUpperCase()}: ${service}`,
        color: severity === 'critical' ? 0xED4245 : 0xFEE75C,
        description: message,
        timestamp: new Date().toISOString(),
        footer: { text: 'ACT Error Monitor' }
    }),

    // Contact alert
    contactAlert: (contact, reason) => ({
        title: `👤 Contact Alert: ${contact.name}`,
        color: 0xEB459E,
        description: reason,
        fields: [
            { name: 'Email', value: contact.email || 'N/A', inline: true },
            { name: 'Days Since Contact', value: contact.daysSince?.toString() || '?', inline: true },
            { name: 'Tags', value: contact.tags?.slice(0, 3).join(', ') || 'None', inline: false }
        ],
        timestamp: new Date().toISOString()
    }),

    // Task completion
    taskComplete: (task) => ({
        title: `✅ Task Completed: ${task.title}`,
        color: 0x57F287,
        description: task.description || null,
        fields: [
            { name: 'Project', value: task.project || 'ACT', inline: true },
            { name: 'Completed By', value: task.completedBy || 'Team', inline: true },
            task.duration ? { name: 'Duration', value: task.duration, inline: true } : null
        ].filter(Boolean),
        timestamp: new Date().toISOString()
    }),

    // Task created
    taskCreated: (task) => ({
        title: `📝 New Task: ${task.title}`,
        color: 0x5865F2,
        description: task.description || null,
        fields: [
            { name: 'Project', value: task.project || 'ACT', inline: true },
            { name: 'Priority', value: task.priority || 'Medium', inline: true },
            { name: 'Source', value: task.source || 'Manual', inline: true }
        ],
        timestamp: new Date().toISOString()
    }),

    // Voice note processed
    voiceNote: (note) => ({
        title: `🎙️ Voice Note Processed`,
        color: note.culturalFlags?.length > 0 ? 0xFEE75C : 0x5865F2,
        description: note.summary,
        fields: [
            { name: 'By', value: note.recordedBy || 'Unknown', inline: true },
            { name: 'Project', value: note.projectCode || 'Not matched', inline: true },
            note.actionItems?.length > 0
                ? { name: 'Action Items', value: note.actionItems.slice(0, 3).map(a => `• ${a.slice(0, 50)}`).join('\n'), inline: false }
                : null,
            note.culturalFlags?.length > 0
                ? { name: '⚠️ Cultural Flags', value: note.culturalFlags.join(', '), inline: false }
                : null
        ].filter(Boolean),
        timestamp: new Date().toISOString()
    }),

    // Partner digest sent
    partnerDigest: (digest) => ({
        title: `📬 Partner Digest Sent: ${digest.projectName}`,
        color: 0x00AE86,
        description: `${digest.theme} edition sent to ${digest.recipientCount} partners`,
        fields: [
            { name: 'Project', value: digest.projectCode, inline: true },
            { name: 'Moon Phase', value: digest.moonPhase, inline: true },
            { name: 'Recipients', value: digest.recipientCount?.toString() || '0', inline: true }
        ],
        timestamp: new Date().toISOString()
    })
};

/**
 * Setup instructions
 */
function showSetup() {
    console.log(`
═══════════════════════════════════════════════════════════════
  Discord Agent Channels Setup
═══════════════════════════════════════════════════════════════

1. CREATE DISCORD CHANNELS
   In your Discord server, create these channels:
   • #act-alerts        - Relationship alerts
   • #act-enrichment    - Enrichment cycle updates
   • #act-ralph         - Ralph agent progress
   • #act-morning-brief - Daily summaries
   • #act-errors        - System errors
   • #act-general       - General updates
   • #act-tasks         - Task creation/completion
   • #act-voice-notes   - Voice note processing

2. CREATE WEBHOOKS
   For each channel:
   • Right-click channel → Edit Channel → Integrations → Webhooks
   • Click "New Webhook"
   • Name it (e.g., "ACT Bot")
   • Copy the Webhook URL

3. ADD TO .env.local
   Add these lines to your .env.local file:

   DISCORD_WEBHOOK_ALERTS=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_ENRICHMENT=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_RALPH=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_MORNING=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_ERRORS=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_GENERAL=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_TASKS=https://discord.com/api/webhooks/...
   DISCORD_WEBHOOK_VOICE=https://discord.com/api/webhooks/...

4. TEST
   node scripts/discord-notify.mjs test "Hello from ACT!"

5. INTEGRATE
   The notification system is now available in your scripts:

   import { sendDiscordMessage, sendEmbed, templates } from './discord-notify.mjs';

   // Simple message
   await sendDiscordMessage('alerts', '🚨 New contact needs attention!');

   // Rich embed
   await sendEmbed('morning', templates.morningBrief({
     needsResponse: 5,
     goingCold: 12,
     active: 22,
     topPriority: 'Reply to Katie Norman'
   }));

═══════════════════════════════════════════════════════════════
`);
}

/**
 * Check webhook configuration
 */
function checkConfig() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Discord Webhook Configuration');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const channels = ['alerts', 'enrichment', 'ralph', 'morning', 'errors', 'general', 'tasks', 'voice'];

    channels.forEach(channel => {
        const configured = !!CHANNELS[channel];
        const status = configured ? '✅' : '❌';
        const envVar = `DISCORD_WEBHOOK_${channel.toUpperCase()}`;
        console.log(`  ${status} ${channel.padEnd(12)} ${configured ? 'Configured' : `Missing ${envVar}`}`);
    });

    console.log('');
}

// ============================================================================
// CLI (only runs when script is executed directly)
// ============================================================================

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    const command = process.argv[2];
    const message = process.argv.slice(3).join(' ');

    if (!command || command === 'help') {
        showSetup();
    } else if (command === 'config' || command === 'check') {
        checkConfig();
    } else if (command === 'test') {
        const testMessage = message || '🧪 Test message from ACT Discord notification system!';
        const channel = 'general';

        console.log(`Sending test message to ${channel}...`);
        const success = await sendDiscordMessage(channel, testMessage);

        if (success) {
            console.log('✅ Message sent successfully!');
        } else {
            console.log('❌ Failed to send message. Check webhook configuration.');
            checkConfig();
        }
    } else {
        // Send to specified channel
        const channel = command;
        if (!message) {
            console.log(`Usage: node scripts/discord-notify.mjs ${channel} "Your message here"`);
            process.exit(1);
        }

        const success = await sendDiscordMessage(channel, message);
        if (success) {
            console.log(`✅ Sent to #${channel}`);
        } else {
            console.log(`❌ Failed to send to #${channel}`);
        }
    }
}
