#!/usr/bin/env node
/**
 * Signal Bridge for ACT Workflow
 *
 * Captures messages and voice notes from Signal using signal-cli,
 * processes them, and integrates with the ACT brain (Supabase).
 *
 * Requirements:
 *   - signal-cli installed and registered
 *   - Java runtime
 *
 * Setup:
 *   1. Install signal-cli: brew install signal-cli
 *   2. Register: signal-cli -a +61XXXXXXXXX register
 *   3. Verify: signal-cli -a +61XXXXXXXXX verify CODE
 *   4. Set SIGNAL_PHONE in .env.local
 *
 * Usage:
 *   node scripts/signal-bridge.mjs listen    - Listen for messages
 *   node scripts/signal-bridge.mjs send <to> <message>
 *   node scripts/signal-bridge.mjs status    - Check signal-cli status
 *
 * Environment Variables:
 *   SIGNAL_PHONE         - Your Signal phone number (+61XXXXXXXXX)
 *   SIGNAL_CLI_PATH      - Path to signal-cli (default: signal-cli)
 */

import { createClient } from '@supabase/supabase-js';
import { spawn, execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SIGNAL_PHONE = process.env.SIGNAL_PHONE;
const SIGNAL_CLI = process.env.SIGNAL_CLI_PATH || 'signal-cli';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Voice note processing - import from voice-capture
let processVoiceNote;
try {
  const voiceCapture = await import('./voice-capture-discord.mjs');
  processVoiceNote = voiceCapture.processVoiceNote;
} catch (e) {
  // Will use inline processing
}

// ============================================================================
// SIGNAL-CLI WRAPPER
// ============================================================================

function checkSignalCli() {
  try {
    execSync(`${SIGNAL_CLI} --version`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function signalCliReceive() {
  if (!SIGNAL_PHONE) {
    throw new Error('SIGNAL_PHONE not set in environment');
  }

  return spawn(SIGNAL_CLI, [
    '-a', SIGNAL_PHONE,
    'receive',
    '--json',
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

async function sendSignalMessage(to, message) {
  if (!SIGNAL_PHONE) {
    throw new Error('SIGNAL_PHONE not set');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(SIGNAL_CLI, [
      '-a', SIGNAL_PHONE,
      'send',
      '-m', message,
      to,
    ]);

    proc.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`signal-cli exited with code ${code}`));
    });

    proc.stderr.on('data', data => {
      console.error('Signal error:', data.toString());
    });
  });
}

// ============================================================================
// MESSAGE PROCESSING
// ============================================================================

async function processMessage(envelope) {
  const { source, timestamp, dataMessage } = envelope;

  if (!dataMessage) return null;

  const { message, attachments, groupInfo } = dataMessage;

  console.log('\n-----------------------------------------');
  console.log(`From: ${source}`);
  console.log(`Time: ${new Date(timestamp).toISOString()}`);
  if (groupInfo) {
    console.log(`Group: ${groupInfo.groupId}`);
  }
  console.log(`Message: ${message || '(attachment)'}`);

  // Process voice notes (attachments with voice/audio type)
  const voiceNotes = (attachments || []).filter(a =>
    a.contentType?.startsWith('audio/') || a.voiceNote
  );

  const results = {
    source,
    timestamp,
    message,
    isGroup: !!groupInfo,
    groupId: groupInfo?.groupId,
    hasVoiceNote: voiceNotes.length > 0,
    processed: [],
  };

  // Store the message
  if (supabase && message) {
    try {
      await supabase.from('communications_history').insert({
        channel: 'signal',
        direction: 'inbound',
        occurred_at: new Date(timestamp).toISOString(),
        content_preview: message.slice(0, 500),
        raw_data: { envelope },
      });
      results.processed.push('stored_message');
    } catch (e) {
      console.warn('Failed to store message:', e.message);
    }
  }

  // Process voice notes
  for (const voiceNote of voiceNotes) {
    console.log(`Voice note: ${voiceNote.filename || voiceNote.id}`);

    // signal-cli stores attachments in ~/.local/share/signal-cli/attachments/
    const attachmentPath = voiceNote.id
      ? join(process.env.HOME, '.local/share/signal-cli/attachments', voiceNote.id)
      : null;

    if (attachmentPath && existsSync(attachmentPath)) {
      if (processVoiceNote) {
        await processVoiceNote(attachmentPath, {
          source: 'signal',
          user_name: source,
          timestamp: new Date(timestamp).toISOString(),
        });
        results.processed.push('voice_note');
      } else {
        console.log('Voice note processing not available');
      }
    }
  }

  // Extract action items from text messages
  if (message) {
    const actionPatterns = [
      /(?:need to|should|must|have to|going to|will|todo:?|action:?|remind me to|don't forget to)\s+([^.!?]+)/gi,
    ];

    const actions = [];
    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        actions.push(match[1].trim());
      }
    }

    if (actions.length > 0) {
      console.log(`Found ${actions.length} action items`);
      results.actionItems = actions;
    }
  }

  return results;
}

// ============================================================================
// LISTENER
// ============================================================================

async function startListener() {
  console.log('\n=========================================');
  console.log('  Signal Bridge - Listening');
  console.log('=========================================\n');

  if (!checkSignalCli()) {
    console.error('signal-cli not found!');
    console.error('Install with: brew install signal-cli');
    process.exit(1);
  }

  if (!SIGNAL_PHONE) {
    console.error('SIGNAL_PHONE not set in environment');
    console.error('Add SIGNAL_PHONE=+61XXXXXXXXX to .env.local');
    process.exit(1);
  }

  console.log(`Phone: ${SIGNAL_PHONE}`);
  console.log('Waiting for messages... (Ctrl+C to stop)\n');

  const receiver = signalCliReceive();

  let buffer = '';

  receiver.stdout.on('data', async (data) => {
    buffer += data.toString();

    // Process complete JSON objects
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);
        if (json.envelope) {
          await processMessage(json.envelope);
        }
      } catch (e) {
        // Not valid JSON, might be partial
      }
    }
  });

  receiver.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('INFO')) {
      console.error('Signal error:', msg);
    }
  });

  receiver.on('close', (code) => {
    console.log(`\nSignal receiver exited with code ${code}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    receiver.kill();
    process.exit(0);
  });
}

// ============================================================================
// STATUS CHECK
// ============================================================================

function checkStatus() {
  console.log('\n=========================================');
  console.log('  Signal Bridge Status');
  console.log('=========================================\n');

  // Check signal-cli
  const cliInstalled = checkSignalCli();
  console.log(`signal-cli: ${cliInstalled ? 'Installed' : 'NOT FOUND'}`);

  if (!cliInstalled) {
    console.log('  Install with: brew install signal-cli');
    return;
  }

  // Check phone number
  console.log(`SIGNAL_PHONE: ${SIGNAL_PHONE || 'NOT SET'}`);

  if (!SIGNAL_PHONE) {
    console.log('  Add SIGNAL_PHONE=+61XXXXXXXXX to .env.local');
    return;
  }

  // Try to get account info
  try {
    const result = execSync(`${SIGNAL_CLI} -a ${SIGNAL_PHONE} listIdentities`, {
      stdio: 'pipe',
      timeout: 10000,
    });
    console.log(`Account: Registered`);
  } catch (e) {
    console.log(`Account: Not registered or error`);
    console.log('  Register with: signal-cli -a +61XXX register');
  }

  // Check Supabase
  console.log(`Supabase: ${supabase ? 'Connected' : 'NOT CONFIGURED'}`);

  console.log('\n-----------------------------------------');
  console.log('Ready to listen: node scripts/signal-bridge.mjs listen');
}

// ============================================================================
// MANUAL VOICE NOTE UPLOAD
// ============================================================================

async function uploadVoiceNote(filePath) {
  console.log('\n=========================================');
  console.log('  Manual Voice Note Upload');
  console.log('=========================================\n');

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  console.log(`Processing: ${filePath}`);

  if (processVoiceNote) {
    await processVoiceNote(filePath, {
      source: 'signal-manual',
      user_name: 'Manual Upload',
      timestamp: new Date().toISOString(),
    });
  } else {
    console.error('Voice processing module not available');
    console.log('Run: node scripts/voice-capture-discord.mjs process ' + filePath);
  }
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'help';
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4).join(' ');

switch (command) {
  case 'listen':
    await startListener();
    break;

  case 'send':
    if (!arg1 || !arg2) {
      console.log('Usage: node scripts/signal-bridge.mjs send <phone> <message>');
      process.exit(1);
    }
    try {
      await sendSignalMessage(arg1, arg2);
      console.log('Message sent!');
    } catch (e) {
      console.error('Failed:', e.message);
    }
    break;

  case 'status':
    checkStatus();
    break;

  case 'upload':
    if (!arg1) {
      console.log('Usage: node scripts/signal-bridge.mjs upload <voice-file>');
      process.exit(1);
    }
    await uploadVoiceNote(arg1);
    break;

  default:
    console.log(`
Signal Bridge for ACT Workflow

Commands:
  listen            - Listen for incoming messages and voice notes
  send <to> <msg>   - Send a message
  status            - Check signal-cli configuration
  upload <file>     - Manually upload a voice note for processing

Setup:
  1. Install: brew install signal-cli
  2. Register: signal-cli -a +61XXXXXXXXX register
  3. Verify: signal-cli -a +61XXXXXXXXX verify CODE
  4. Configure: Add SIGNAL_PHONE=+61XXXXXXXXX to .env.local

Flow:
  Signal Message/Voice -> Capture -> Process -> Supabase -> Notify
`);
}
