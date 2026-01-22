#!/usr/bin/env node
/**
 * Discord Voice Note Capture & Processing
 *
 * Captures voice notes from Discord, transcribes them, and processes
 * to extract topics, action items, and cultural content.
 *
 * Flow:
 *   Voice Note Dropped
 *        |
 *        v
 *   Transcribe (Whisper)
 *   + Extract: topics, actions, people
 *   + Flag: cultural content
 *        |
 *   +----+----+
 *   |         |
 *   v         v
 *   Store in    Create task
 *   voice_notes  in Notion?
 *   (searchable)  (if action item)
 *
 * Usage:
 *   node scripts/voice-capture-discord.mjs listen     - Start webhook listener
 *   node scripts/voice-capture-discord.mjs process <file> - Process a voice file
 *   node scripts/voice-capture-discord.mjs test       - Test transcription
 *
 * Environment Variables:
 *   OPENAI_API_KEY       - For Whisper transcription
 *   DISCORD_WEBHOOK_VOICE - Webhook for voice note channel
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Load project codes for keyword matching
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes');
}

// Load workflow config
let WORKFLOW_CONFIG = {};
try {
  WORKFLOW_CONFIG = JSON.parse(readFileSync('config/workflow-config.json', 'utf8'));
} catch (e) {
  console.warn('Could not load workflow config');
}

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ============================================================================
// TRANSCRIPTION (Whisper API)
// ============================================================================

async function transcribeAudio(audioPath) {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set - cannot transcribe');
    return null;
  }

  const { createReadStream } = await import('fs');
  const FormData = (await import('form-data')).default;

  const form = new FormData();
  form.append('file', createReadStream(audioPath));
  form.append('model', 'whisper-1');
  form.append('language', 'en');
  form.append('response_format', 'verbose_json');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Transcription failed:', error.message);
    return null;
  }
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

function extractTopics(text) {
  const topics = [];
  const textLower = text.toLowerCase();

  // Match against project codes
  for (const [code, proj] of Object.entries(PROJECT_CODES.projects || {})) {
    const keywords = [
      proj.name.toLowerCase(),
      ...(proj.ghl_tags || []).map(t => t.toLowerCase()),
    ];

    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        topics.push({ type: 'project', code, name: proj.name, keyword });
        break;
      }
    }
  }

  // Common topic patterns
  const topicPatterns = [
    { pattern: /meeting|call|chat|catch up/i, topic: 'meeting' },
    { pattern: /invoice|payment|money|funding/i, topic: 'finance' },
    { pattern: /deadline|due|urgent|asap/i, topic: 'urgent' },
    { pattern: /idea|thinking|consider/i, topic: 'ideation' },
    { pattern: /follow up|remind|reminder/i, topic: 'follow-up' },
    { pattern: /story|narrative|tale/i, topic: 'storytelling' },
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(text)) {
      topics.push({ type: 'topic', name: topic });
    }
  }

  return topics;
}

function extractActionItems(text) {
  const actions = [];

  // Action patterns
  const patterns = [
    /need to ([^.!?]+)[.!?]/gi,
    /should ([^.!?]+)[.!?]/gi,
    /must ([^.!?]+)[.!?]/gi,
    /have to ([^.!?]+)[.!?]/gi,
    /going to ([^.!?]+)[.!?]/gi,
    /will ([^.!?]+)[.!?]/gi,
    /todo:?\s*([^.!?]+)[.!?]/gi,
    /action:?\s*([^.!?]+)[.!?]/gi,
    /remind me to ([^.!?]+)[.!?]/gi,
    /don't forget to ([^.!?]+)[.!?]/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[1].trim();
      if (action.length > 5 && action.length < 200) {
        actions.push(action);
      }
    }
  }

  return [...new Set(actions)];
}

function extractPeopleMentioned(text) {
  const people = [];

  // Common name patterns (basic - could be enhanced with NER)
  const namePatterns = [
    /(?:talk to|call|email|meet with|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|mentioned|asked|told)/g,
  ];

  for (const pattern of namePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 2) {
        people.push(name);
      }
    }
  }

  return [...new Set(people)];
}

function flagCulturalContent(text) {
  const flags = [];
  const textLower = text.toLowerCase();

  // Cultural protocol keywords
  const culturalKeywords = [
    'indigenous', 'aboriginal', 'first nations', 'traditional owner',
    'elder', 'uncle', 'aunty', 'country', 'dreaming', 'songline',
    'ceremony', 'cultural', 'palm island', 'ranger', 'custodian',
  ];

  for (const keyword of culturalKeywords) {
    if (textLower.includes(keyword)) {
      flags.push({
        type: 'cultural_protocol',
        keyword,
        note: 'May require cultural sensitivity review',
      });
    }
  }

  return flags;
}

// ============================================================================
// PROCESSING
// ============================================================================

async function processVoiceNote(audioPath, metadata = {}) {
  console.log('\n=========================================');
  console.log('  Processing Voice Note');
  console.log('=========================================\n');

  console.log(`File: ${audioPath}`);

  // 1. Transcribe
  console.log('Transcribing...');
  const transcription = await transcribeAudio(audioPath);

  if (!transcription?.text) {
    console.error('Transcription failed');
    return null;
  }

  console.log(`Transcription: "${transcription.text.slice(0, 100)}..."`);

  // 2. Extract content
  console.log('\nExtracting content...');
  const topics = extractTopics(transcription.text);
  const actionItems = extractActionItems(transcription.text);
  const peopleMentioned = extractPeopleMentioned(transcription.text);
  const culturalFlags = flagCulturalContent(transcription.text);

  // 3. Generate summary (first sentence or 100 chars)
  const summary = transcription.text.split(/[.!?]/)[0].trim() ||
                  transcription.text.slice(0, 100);

  // 4. Build voice note record
  const voiceNote = {
    source: metadata.source || 'discord',
    source_message_id: metadata.message_id,
    recorded_by_name: metadata.user_name || 'Unknown',
    recorded_at: metadata.timestamp || new Date().toISOString(),
    duration_seconds: transcription.duration || null,
    transcript: transcription.text,
    summary,
    topics: topics.map(t => t.name || t.code),
    action_items: actionItems,
    people_mentioned: peopleMentioned,
    cultural_flags: culturalFlags.length > 0 ? culturalFlags : null,
    project_code: topics.find(t => t.type === 'project')?.code || null,
    processed_at: new Date().toISOString(),
  };

  console.log('\n-----------------------------------------');
  console.log('  Extraction Results');
  console.log('-----------------------------------------');
  console.log(`Summary: ${summary}`);
  console.log(`Topics: ${voiceNote.topics.join(', ') || 'none'}`);
  console.log(`Action Items: ${actionItems.length}`);
  actionItems.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  console.log(`People: ${peopleMentioned.join(', ') || 'none'}`);
  if (culturalFlags.length > 0) {
    console.log(`Cultural Flags: ${culturalFlags.map(f => f.keyword).join(', ')}`);
  }
  console.log(`Project: ${voiceNote.project_code || 'not matched'}`);

  // 5. Store in Supabase
  if (supabase) {
    console.log('\nStoring in database...');
    const { data, error } = await supabase
      .from('voice_notes')
      .insert(voiceNote)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error.message);
    } else {
      console.log(`Stored with ID: ${data.id}`);
      voiceNote.id = data.id;
    }
  }

  // 6. Create Notion task if action items found
  if (actionItems.length > 0 && NOTION_TOKEN) {
    console.log('\nCreating Notion tasks...');
    await createNotionTasks(actionItems, voiceNote);
  }

  // 7. Notify Discord
  await notifyDiscord(voiceNote);

  return voiceNote;
}

async function createNotionTasks(actionItems, voiceNote) {
  // Load Notion config
  let notionConfig = {};
  try {
    notionConfig = JSON.parse(readFileSync('config/notion-database-ids.json', 'utf8'));
  } catch (e) {
    console.warn('Could not load Notion config');
    return;
  }

  const taskDbId = notionConfig.githubIssues; // Reuse tasks database

  if (!taskDbId) {
    console.warn('No task database configured');
    return;
  }

  for (const action of actionItems.slice(0, 3)) { // Max 3 tasks per voice note
    try {
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: taskDbId },
          properties: {
            Title: {
              title: [{ text: { content: action.slice(0, 100) } }],
            },
            Status: {
              select: { name: 'To Do' },
            },
            Labels: {
              multi_select: [{ name: 'from-voice-note' }],
            },
          },
        }),
      });

      if (response.ok) {
        console.log(`  Created task: "${action.slice(0, 50)}..."`);
      }
    } catch (e) {
      console.warn(`  Failed to create task: ${e.message}`);
    }
  }
}

async function notifyDiscord(voiceNote) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_VOICE || process.env.DISCORD_WEBHOOK_GENERAL;

  if (!webhookUrl) return;

  const embed = {
    title: `Voice Note Processed`,
    color: 0x5865F2,
    description: voiceNote.summary,
    fields: [
      {
        name: 'By',
        value: voiceNote.recorded_by_name,
        inline: true,
      },
      {
        name: 'Project',
        value: voiceNote.project_code || 'Not matched',
        inline: true,
      },
      {
        name: 'Action Items',
        value: voiceNote.action_items.length > 0
          ? voiceNote.action_items.slice(0, 3).map(a => `• ${a.slice(0, 50)}`).join('\n')
          : 'None',
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  if (voiceNote.cultural_flags?.length > 0) {
    embed.fields.push({
      name: 'Cultural Flags',
      value: voiceNote.cultural_flags.map(f => f.keyword).join(', '),
      inline: false,
    });
    embed.color = 0xFEE75C; // Yellow for attention
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ACT Voice Notes',
        embeds: [embed],
      }),
    });
  } catch (e) {
    console.warn('Discord notification failed:', e.message);
  }
}

// ============================================================================
// WEBHOOK LISTENER
// ============================================================================

async function startWebhookListener(port = 3456) {
  console.log('\n=========================================');
  console.log('  Discord Voice Note Webhook Listener');
  console.log('=========================================\n');

  const server = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/voice-note') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log('Received voice note webhook:', data);

          // Process the voice note
          if (data.audio_url) {
            // Download and process
            // In production, you'd download the file and process it
            console.log('Would process:', data.audio_url);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'received' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
    console.log('Send voice notes to POST /voice-note');
    console.log('\nPress Ctrl+C to stop');
  });
}

// ============================================================================
// TEST
// ============================================================================

async function runTest() {
  console.log('\n=========================================');
  console.log('  Voice Capture Test');
  console.log('=========================================\n');

  // Test with sample text
  const sampleText = `Hey, this is Ben. I need to follow up with Kristy about the Diagrama funding proposal.
Also, I was thinking about the JusticeHub workshop next week - we should talk to Uncle Allan about
involving some Palm Island youth. Don't forget to send the invoice to SEFA. Meeting with Nic tomorrow
at 10am to discuss the Goods partnership. Todo: update the morning brief script.`;

  console.log('Sample text:', sampleText);
  console.log('\n-----------------------------------------');

  const topics = extractTopics(sampleText);
  console.log('Topics:', topics.map(t => t.name || t.code));

  const actions = extractActionItems(sampleText);
  console.log('Actions:', actions);

  const people = extractPeopleMentioned(sampleText);
  console.log('People:', people);

  const flags = flagCulturalContent(sampleText);
  console.log('Cultural Flags:', flags.map(f => f.keyword));

  console.log('\nTest complete!');
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'help';
const arg = process.argv[3];

switch (command) {
  case 'listen':
    await startWebhookListener(arg ? parseInt(arg) : 3456);
    break;

  case 'process':
    if (!arg || !existsSync(arg)) {
      console.log('Usage: node scripts/voice-capture-discord.mjs process <audio-file>');
      process.exit(1);
    }
    await processVoiceNote(arg, { source: 'cli' });
    break;

  case 'test':
    await runTest();
    break;

  default:
    console.log(`
Discord Voice Note Capture

Commands:
  listen [port]     - Start webhook listener (default: 3456)
  process <file>    - Process a voice note file
  test              - Run extraction test with sample text

Environment:
  OPENAI_API_KEY           - Required for transcription
  DISCORD_WEBHOOK_VOICE    - Webhook for notifications
  NOTION_TOKEN             - For creating tasks

Flow:
  Voice Note -> Transcribe -> Extract -> Store -> Notify
`);
}
