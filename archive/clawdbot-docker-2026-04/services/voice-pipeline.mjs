/**
 * Voice Pipeline Service
 *
 * Handles voice note capture, transcription, AI enrichment, and storage.
 * Supports input from Discord, Signal, WhatsApp, and direct CLI.
 *
 * Flow:
 * 1. CAPTURE  - Receive audio from channel
 * 2. STORE    - Upload to Supabase Storage
 * 3. TRANSCRIBE - Whisper transcription
 * 4. ENRICH   - AI summary, topics, action items, embeddings
 * 5. SHARE    - Based on visibility, notify via preferred channel
 *
 * @author ACT Technology
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: 'voice-notes',
  },
  openai: {
    key: process.env.OPENAI_API_KEY,
    whisperModel: 'whisper-1',
  },
  anthropic: {
    key: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-haiku-20240307',
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
};

// Initialize clients lazily
let supabase = null;
let openai = null;
let anthropic = null;
let embedder = null;

function getSupabase() {
  if (!supabase && config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key);
  }
  return supabase;
}

function getOpenAI() {
  if (!openai && config.openai.key) {
    openai = new OpenAI({ apiKey: config.openai.key });
  }
  return openai;
}

function getAnthropic() {
  if (!anthropic && config.anthropic.key) {
    anthropic = new Anthropic({ apiKey: config.anthropic.key });
  }
  return anthropic;
}

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', config.embedding.model);
  }
  return embedder;
}

/**
 * Process a voice note through the full pipeline
 *
 * @param {Object} options
 * @param {string} options.audioPath - Local path to audio file
 * @param {Buffer} options.audioBuffer - Audio as buffer
 * @param {string} options.sourceChannel - 'discord', 'signal', 'whatsapp', 'direct'
 * @param {string} options.recordedBy - User canonical name
 * @param {string} options.visibility - 'private', 'team', 'project', 'public'
 * @param {string} options.projectContext - Project this relates to
 * @param {string} options.relatedContactId - GHL contact ID if relevant
 * @returns {Object} Processed voice note record
 */
export async function processVoiceNote(options) {
  const {
    audioPath,
    audioBuffer,
    sourceChannel,
    recordedBy,
    visibility = 'team',
    projectContext,
    relatedContactId,
  } = options;

  console.log(`[voice-pipeline] Processing voice note from ${sourceChannel} by ${recordedBy}`);

  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  // Get user identity
  const { data: identity } = await db
    .from('user_identities')
    .select('id')
    .eq('canonical_name', recordedBy)
    .single();

  // Read audio file if path provided
  let audio = audioBuffer;
  if (audioPath && !audio) {
    audio = await fs.readFile(audioPath);
  }

  if (!audio) {
    throw new Error('No audio provided');
  }

  // Detect format from path or default to ogg
  const format = audioPath
    ? path.extname(audioPath).slice(1).toLowerCase()
    : 'ogg';

  // Generate ID for the voice note
  const noteId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Step 1: Upload to Supabase Storage
  console.log(`[voice-pipeline] Uploading audio to storage...`);
  const storagePath = `${recordedBy}/${noteId}.${format}`;

  const { error: uploadError } = await db.storage
    .from(config.supabase.bucket)
    .upload(storagePath, audio, {
      contentType: getContentType(format),
      upsert: false,
    });

  if (uploadError) {
    console.error(`[voice-pipeline] Upload error:`, uploadError);
    throw uploadError;
  }

  const { data: urlData } = db.storage
    .from(config.supabase.bucket)
    .getPublicUrl(storagePath);

  const audioUrl = urlData.publicUrl;
  console.log(`[voice-pipeline] Uploaded to: ${audioUrl}`);

  // Step 2: Transcribe with Whisper
  console.log(`[voice-pipeline] Transcribing...`);
  let transcript = '';
  let transcriptConfidence = 0;

  const oai = getOpenAI();
  if (oai) {
    try {
      const file = new File([audio], `audio.${format}`, { type: getContentType(format) });
      const transcription = await oai.audio.transcriptions.create({
        file: file,
        model: config.openai.whisperModel,
        response_format: 'verbose_json',
      });

      transcript = transcription.text;
      // Average segment confidence
      if (transcription.segments?.length) {
        transcriptConfidence = transcription.segments.reduce((sum, s) => sum + (s.confidence || 0.9), 0) / transcription.segments.length;
      } else {
        transcriptConfidence = 0.9;
      }

      console.log(`[voice-pipeline] Transcribed: "${transcript.slice(0, 100)}..."`);
    } catch (err) {
      console.error(`[voice-pipeline] Transcription error:`, err);
    }
  }

  // Step 3: AI Enrichment
  console.log(`[voice-pipeline] Enriching with AI...`);
  let summary = '';
  let topics = [];
  let actionItems = [];
  let keyPoints = [];
  let mentionedPeople = [];

  const claude = getAnthropic();
  if (claude && transcript) {
    try {
      const enrichment = await enrichWithClaude(claude, transcript, projectContext);
      summary = enrichment.summary;
      topics = enrichment.topics;
      actionItems = enrichment.action_items;
      keyPoints = enrichment.key_points;
      mentionedPeople = enrichment.mentioned_people;
    } catch (err) {
      console.error(`[voice-pipeline] Enrichment error:`, err);
    }
  }

  // Step 4: Generate embedding for semantic search
  console.log(`[voice-pipeline] Generating embedding...`);
  let embedding = null;

  if (transcript) {
    try {
      const embed = await getEmbedder();
      const result = await embed(transcript, { pooling: 'mean', normalize: true });
      embedding = Array.from(result.data);
    } catch (err) {
      console.error(`[voice-pipeline] Embedding error:`, err);
    }
  }

  // Step 5: Store in database
  console.log(`[voice-pipeline] Storing in database...`);

  const voiceNote = {
    id: noteId,
    source_channel: sourceChannel,
    recorded_by: identity?.id,
    recorded_by_name: recordedBy,
    audio_url: audioUrl,
    audio_format: format,
    file_size_bytes: audio.length,
    transcript: transcript,
    transcript_confidence: transcriptConfidence,
    transcription_model: config.openai.whisperModel,
    transcribed_at: transcript ? new Date().toISOString() : null,
    summary: summary,
    topics: topics,
    action_items: actionItems.length ? actionItems : null,
    key_points: keyPoints,
    mentioned_people: mentionedPeople,
    embedding: embedding,
    visibility: visibility,
    project_context: projectContext,
    related_contact_id: relatedContactId,
    recorded_at: timestamp,
    enriched_at: summary ? new Date().toISOString() : null,
  };

  const { data, error: insertError } = await db
    .from('voice_notes')
    .insert(voiceNote)
    .select()
    .single();

  if (insertError) {
    console.error(`[voice-pipeline] Insert error:`, insertError);
    throw insertError;
  }

  console.log(`[voice-pipeline] Complete: ${noteId}`);
  return data;
}

/**
 * Enrich transcript using Claude
 */
async function enrichWithClaude(client, transcript, projectContext) {
  const prompt = `Analyze this voice note transcript and extract:

1. A brief summary (1-2 sentences)
2. Topics as tags (e.g., "project:harvest", "planning", "budget")
3. Any action items mentioned
4. Key points (bullet points)
5. Names of people mentioned

${projectContext ? `Context: This relates to project "${projectContext}"` : ''}

Transcript:
${transcript}

Respond in JSON format:
{
  "summary": "...",
  "topics": ["..."],
  "action_items": [{"text": "...", "assigned_to": "..."}],
  "key_points": ["..."],
  "mentioned_people": ["..."]
}`;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {
    summary: '',
    topics: [],
    action_items: [],
    key_points: [],
    mentioned_people: [],
  };
}

/**
 * Search voice notes semantically
 *
 * @param {string} query - Search query
 * @param {Object} options
 * @param {number} options.limit - Max results
 * @param {string} options.visibility - Filter by visibility
 * @param {string} options.userId - Filter by user
 * @returns {Array} Matching voice notes
 */
export async function searchVoiceNotes(query, options = {}) {
  const { limit = 10, visibility, userId } = options;

  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  // Generate query embedding
  const embed = await getEmbedder();
  const result = await embed(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(result.data);

  // Use the semantic search function
  const { data, error } = await db.rpc('search_voice_notes', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    filter_visibility: visibility || null,
    filter_user_id: userId || null,
  });

  if (error) {
    console.error(`[voice-pipeline] Search error:`, error);
    throw error;
  }

  return data;
}

/**
 * Share a voice note with specific users
 *
 * @param {string} noteId - Voice note ID
 * @param {string[]} userNames - Canonical names to share with
 * @param {string} sharedBy - Who is sharing
 */
export async function shareVoiceNote(noteId, userNames, sharedBy) {
  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  // Get user IDs
  const { data: users } = await db
    .from('user_identities')
    .select('id, canonical_name')
    .in('canonical_name', userNames);

  const { data: sharer } = await db
    .from('user_identities')
    .select('id')
    .eq('canonical_name', sharedBy)
    .single();

  // Create share records
  const shares = users.map(user => ({
    voice_note_id: noteId,
    shared_with: user.id,
    shared_by: sharer?.id,
    share_method: 'direct',
  }));

  const { error } = await db
    .from('voice_note_shares')
    .upsert(shares, { onConflict: 'voice_note_id,shared_with' });

  if (error) {
    console.error(`[voice-pipeline] Share error:`, error);
    throw error;
  }

  // Update voice note shared_with array
  const userIds = users.map(u => u.id);
  await db
    .from('voice_notes')
    .update({
      shared_with: db.sql`array_cat(COALESCE(shared_with, ARRAY[]::uuid[]), ${userIds}::uuid[])`,
    })
    .eq('id', noteId);

  console.log(`[voice-pipeline] Shared ${noteId} with ${userNames.join(', ')}`);
}

/**
 * Get recent voice notes for a user
 *
 * @param {string} userName - Canonical name
 * @param {number} limit - Max results
 * @returns {Array} Voice notes
 */
export async function getRecentVoiceNotes(userName, limit = 10) {
  const db = getSupabase();
  if (!db) {
    throw new Error('Supabase not configured');
  }

  const { data: user } = await db
    .from('user_identities')
    .select('id')
    .eq('canonical_name', userName)
    .single();

  if (!user) {
    return [];
  }

  const { data, error } = await db
    .from('voice_notes')
    .select('*')
    .or(`recorded_by.eq.${user.id},visibility.eq.team,visibility.eq.public`)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[voice-pipeline] Get recent error:`, error);
    throw error;
  }

  return data;
}

/**
 * Get content type for audio format
 */
function getContentType(format) {
  const types = {
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    webm: 'audio/webm',
    flac: 'audio/flac',
  };
  return types[format] || 'audio/ogg';
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, ...args] = process.argv;

  const commands = {
    async process() {
      const audioPath = args[0];
      const channel = args[1] || 'direct';
      const recordedBy = args[2] || 'ben';

      if (!audioPath) {
        console.log('Usage: node voice-pipeline.mjs process <audio-path> [channel] [recorded-by]');
        process.exit(1);
      }

      const result = await processVoiceNote({
        audioPath,
        sourceChannel: channel,
        recordedBy,
        visibility: 'team',
      });

      console.log('Processed voice note:', result.id);
      console.log('Summary:', result.summary);
      console.log('Topics:', result.topics);
    },

    async search() {
      const query = args.join(' ');
      if (!query) {
        console.log('Usage: node voice-pipeline.mjs search <query>');
        process.exit(1);
      }

      const results = await searchVoiceNotes(query);
      console.log(`Found ${results.length} matches:\n`);

      for (const note of results) {
        console.log(`- ${note.summary || note.transcript?.slice(0, 100)}`);
        console.log(`  Recorded: ${note.recorded_at} by ${note.recorded_by_name}`);
        console.log(`  Similarity: ${(note.similarity * 100).toFixed(1)}%\n`);
      }
    },

    async recent() {
      const userName = args[0] || 'ben';
      const notes = await getRecentVoiceNotes(userName);

      console.log(`Recent voice notes for ${userName}:\n`);
      for (const note of notes) {
        console.log(`- ${note.summary || 'No summary'}`);
        console.log(`  ${note.recorded_at} via ${note.source_channel}`);
        console.log(`  Topics: ${note.topics?.join(', ') || 'none'}\n`);
      }
    },
  };

  if (commands[command]) {
    commands[command]().catch(console.error);
  } else {
    console.log('Voice Pipeline Service');
    console.log('Commands:');
    console.log('  process <audio-path> [channel] [recorded-by] - Process a voice note');
    console.log('  search <query> - Semantic search voice notes');
    console.log('  recent [user] - Get recent voice notes');
  }
}

export default {
  processVoiceNote,
  searchVoiceNotes,
  shareVoiceNote,
  getRecentVoiceNotes,
};
