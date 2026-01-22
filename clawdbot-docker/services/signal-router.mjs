/**
 * Signal Message Router
 *
 * Polls signal-cli-rest-api for incoming messages and routes them to:
 * - Claude for text messages (via agent system)
 * - Voice pipeline for audio messages
 * - Sync events for communication history
 *
 * @author ACT Technology
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { processVoiceNote } from './voice-pipeline.mjs';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const config = {
  signal: {
    apiUrl: process.env.SIGNAL_API_URL || 'http://signal-api:8080',
    phoneNumber: process.env.SIGNAL_PHONE_NUMBER,  // E.164 format: +61...
    pollInterval: 5000,  // 5 seconds
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022',
  },
  syncEventsUrl: process.env.SYNC_EVENTS_URL || 'https://tednluwflfhxyucgwigh.supabase.co/functions/v1/sync-events',
  syncApiKey: process.env.SYNC_API_KEY,
};

// Initialize clients
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

// Track processed messages to avoid duplicates
const processedMessages = new Set();

// User phone number to identity mapping (loaded from DB)
const phoneToUser = new Map();

/**
 * Load user identities from database
 */
async function loadUserIdentities() {
  const db = getSupabase();
  if (!db) return;

  const { data } = await db
    .from('user_identities')
    .select('canonical_name, signal_number');

  if (data) {
    for (const user of data) {
      if (user.signal_number) {
        phoneToUser.set(user.signal_number, user.canonical_name);
      }
    }
    console.log(`[signal-router] Loaded ${phoneToUser.size} user identities`);
  }
}

/**
 * Fetch messages from Signal API
 */
async function fetchMessages() {
  try {
    const response = await fetch(`${config.signal.apiUrl}/v1/receive/${config.signal.phoneNumber}`);

    if (!response.ok) {
      console.error(`[signal-router] Receive failed: ${response.status}`);
      return [];
    }

    const messages = await response.json();
    return messages || [];
  } catch (error) {
    console.error(`[signal-router] Fetch error:`, error.message);
    return [];
  }
}

/**
 * Send message via Signal
 */
async function sendMessage(recipient, message, attachments = []) {
  try {
    const payload = {
      message: message,
      number: config.signal.phoneNumber,
      recipients: [recipient],
    };

    if (attachments.length > 0) {
      payload.base64_attachments = attachments;
    }

    const response = await fetch(`${config.signal.apiUrl}/v2/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[signal-router] Send failed: ${response.status} - ${text}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[signal-router] Send error:`, error.message);
    return false;
  }
}

/**
 * Process a text message
 */
async function processTextMessage(message) {
  const sender = message.sourceNumber;
  const text = message.dataMessage?.message;
  const timestamp = message.timestamp;

  if (!text) return;

  console.log(`[signal-router] Text from ${sender}: ${text.slice(0, 50)}...`);

  // Identify sender
  const senderName = phoneToUser.get(sender) || 'unknown';

  // Check if it's a command
  if (text.startsWith('/')) {
    await handleCommand(sender, text, senderName);
    return;
  }

  // Route to Claude for response
  const claude = getAnthropic();
  if (claude) {
    try {
      const systemPrompt = `You are an ACT assistant responding via Signal messenger.
Keep responses concise (under 500 chars if possible) as this is a mobile chat.
You're chatting with ${senderName}.
Current time: ${new Date().toISOString()}

ACT (Applied Creative Technologies) builds social impact technology.
Be helpful, warm, and practical.`;

      const response = await claude.messages.create({
        model: config.anthropic.model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      });

      const reply = response.content[0]?.text || 'Sorry, I couldn\'t process that.';
      await sendMessage(sender, reply);
    } catch (error) {
      console.error(`[signal-router] Claude error:`, error.message);
      await sendMessage(sender, 'Sorry, I encountered an error processing your message.');
    }
  }

  // Sync to communications history
  await syncToHistory({
    type: 'signal',
    direction: 'inbound',
    content_preview: text.slice(0, 500),
    occurred_at: new Date(timestamp).toISOString(),
    source_system: 'signal',
    source_id: `signal-${timestamp}`,
    contact_phone: sender,
    from_user: senderName !== 'unknown' ? senderName : null,
  });
}

/**
 * Process an attachment (voice note, image, etc.)
 */
async function processAttachment(message) {
  const sender = message.sourceNumber;
  const timestamp = message.timestamp;
  const attachments = message.dataMessage?.attachments || [];
  const senderName = phoneToUser.get(sender) || 'unknown';

  for (const attachment of attachments) {
    const { contentType, id, filename } = attachment;

    console.log(`[signal-router] Attachment from ${sender}: ${contentType}`);

    // Download attachment
    const downloadUrl = `${config.signal.apiUrl}/v1/attachments/${id}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      console.error(`[signal-router] Attachment download failed: ${response.status}`);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Handle voice notes
    if (contentType.startsWith('audio/')) {
      console.log(`[signal-router] Processing voice note...`);

      try {
        const voiceNote = await processVoiceNote({
          audioBuffer: buffer,
          sourceChannel: 'signal',
          recordedBy: senderName,
          visibility: 'team',
        });

        // Reply with summary
        if (voiceNote.summary) {
          await sendMessage(sender, `Got your voice note. Summary: ${voiceNote.summary}`);
        } else {
          await sendMessage(sender, 'Voice note received and transcribed.');
        }
      } catch (error) {
        console.error(`[signal-router] Voice note error:`, error.message);
        await sendMessage(sender, 'Received your voice note, but had trouble processing it.');
      }
    }

    // Handle images (could add OCR/vision later)
    else if (contentType.startsWith('image/')) {
      await sendMessage(sender, 'Image received. Image analysis coming soon!');
    }
  }
}

/**
 * Handle slash commands
 */
async function handleCommand(sender, text, senderName) {
  const [command, ...args] = text.slice(1).split(' ');

  switch (command.toLowerCase()) {
    case 'help':
      await sendMessage(sender, `ACT Signal Bot Commands:
/help - Show this help
/brief - Get morning brief
/search <query> - Search ACT data
/note <text> - Save a quick note
/voice - Info about voice notes`);
      break;

    case 'brief':
      await sendMessage(sender, 'Morning brief coming soon! This will show your daily summary.');
      break;

    case 'search':
      const query = args.join(' ');
      if (!query) {
        await sendMessage(sender, 'Usage: /search <query>');
      } else {
        await sendMessage(sender, `Searching for "${query}"... (search integration coming soon)`);
      }
      break;

    case 'note':
      const noteText = args.join(' ');
      if (!noteText) {
        await sendMessage(sender, 'Usage: /note <your note text>');
      } else {
        await syncToHistory({
          type: 'signal',
          direction: 'internal',
          content_preview: `Note: ${noteText}`,
          occurred_at: new Date().toISOString(),
          source_system: 'signal',
          source_id: `signal-note-${Date.now()}`,
          contact_phone: sender,
          from_user: senderName,
          topics: ['note'],
        });
        await sendMessage(sender, 'Note saved!');
      }
      break;

    case 'voice':
      await sendMessage(sender, `Voice Notes:
Just send me a voice message and I'll:
1. Transcribe it
2. Generate a summary
3. Extract action items
4. Make it searchable

Your voice notes are shared with the team by default.`);
      break;

    default:
      await sendMessage(sender, `Unknown command: /${command}. Try /help`);
  }
}

/**
 * Sync message to communications history
 */
async function syncToHistory(event) {
  if (!config.syncEventsUrl || !config.syncApiKey) {
    console.log(`[signal-router] Sync not configured, skipping`);
    return;
  }

  try {
    const response = await fetch(config.syncEventsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.syncApiKey,
      },
      body: JSON.stringify({
        events: [event],
        source: 'signal-router',
      }),
    });

    if (!response.ok) {
      console.error(`[signal-router] Sync failed: ${response.status}`);
    }
  } catch (error) {
    console.error(`[signal-router] Sync error:`, error.message);
  }
}

/**
 * Main message loop
 */
async function messageLoop() {
  console.log(`[signal-router] Starting message loop...`);

  while (true) {
    try {
      const messages = await fetchMessages();

      for (const message of messages) {
        const messageId = `${message.sourceNumber}-${message.timestamp}`;

        // Skip if already processed
        if (processedMessages.has(messageId)) {
          continue;
        }
        processedMessages.add(messageId);

        // Clean up old processed IDs (keep last 1000)
        if (processedMessages.size > 1000) {
          const ids = Array.from(processedMessages);
          for (let i = 0; i < 500; i++) {
            processedMessages.delete(ids[i]);
          }
        }

        // Process based on type
        if (message.dataMessage?.attachments?.length > 0) {
          await processAttachment(message);
        } else if (message.dataMessage?.message) {
          await processTextMessage(message);
        }
      }
    } catch (error) {
      console.error(`[signal-router] Loop error:`, error.message);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, config.signal.pollInterval));
  }
}

/**
 * Health check endpoint info
 */
function getHealthStatus() {
  return {
    service: 'signal-router',
    status: 'running',
    phoneNumber: config.signal.phoneNumber ? 'configured' : 'missing',
    apiUrl: config.signal.apiUrl,
    usersLoaded: phoneToUser.size,
  };
}

/**
 * Send a message to a team member by name
 */
async function sendToUser(userName, message) {
  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  const { data: user } = await db
    .from('user_identities')
    .select('signal_number')
    .eq('canonical_name', userName)
    .single();

  if (!user?.signal_number) {
    throw new Error(`No Signal number for user: ${userName}`);
  }

  return sendMessage(user.signal_number, message);
}

/**
 * Broadcast message to all team members with Signal
 */
async function broadcastToTeam(message) {
  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  const { data: users } = await db
    .from('user_identities')
    .select('signal_number')
    .not('signal_number', 'is', null);

  const results = [];
  for (const user of users || []) {
    const success = await sendMessage(user.signal_number, message);
    results.push({ phone: user.signal_number, success });
  }

  return results;
}

// CLI and service startup
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, ...args] = process.argv;

  const commands = {
    async start() {
      console.log('[signal-router] Starting Signal Router Service');

      if (!config.signal.phoneNumber) {
        console.error('[signal-router] SIGNAL_PHONE_NUMBER not configured');
        process.exit(1);
      }

      await loadUserIdentities();
      await messageLoop();
    },

    async send() {
      const [recipient, ...messageParts] = args;
      const message = messageParts.join(' ');

      if (!recipient || !message) {
        console.log('Usage: node signal-router.mjs send <phone> <message>');
        process.exit(1);
      }

      const success = await sendMessage(recipient, message);
      console.log(success ? 'Message sent' : 'Send failed');
    },

    async broadcast() {
      const message = args.join(' ');
      if (!message) {
        console.log('Usage: node signal-router.mjs broadcast <message>');
        process.exit(1);
      }

      await loadUserIdentities();
      const results = await broadcastToTeam(message);
      console.log('Broadcast results:', results);
    },

    async test() {
      console.log('Testing Signal API connection...');

      const response = await fetch(`${config.signal.apiUrl}/v1/about`);
      if (response.ok) {
        const data = await response.json();
        console.log('Signal API:', data);
      } else {
        console.log('Signal API not reachable');
      }

      console.log('\nConfiguration:');
      console.log('- Phone:', config.signal.phoneNumber || 'NOT SET');
      console.log('- API URL:', config.signal.apiUrl);
    },
  };

  if (commands[command]) {
    commands[command]().catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
  } else {
    console.log('Signal Router Service');
    console.log('Commands:');
    console.log('  start                    - Start the message loop');
    console.log('  send <phone> <message>   - Send a message');
    console.log('  broadcast <message>      - Send to all team members');
    console.log('  test                     - Test API connection');
  }
}

export {
  sendMessage,
  sendToUser,
  broadcastToTeam,
  getHealthStatus,
  loadUserIdentities,
};

export default {
  sendMessage,
  sendToUser,
  broadcastToTeam,
  getHealthStatus,
};
