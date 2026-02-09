#!/usr/bin/env node

/**
 * Embed iMessage conversations into knowledge_chunks for semantic search.
 *
 * Groups messages into conversation windows (messages within 10 min of each other)
 * to create meaningful semantic chunks rather than embedding each "ok" individually.
 *
 * Usage:
 *   node scripts/embed-imessages.mjs              # Embed all un-embedded messages
 *   node scripts/embed-imessages.mjs --dry-run    # Preview without changes
 *   node scripts/embed-imessages.mjs --stats      # Show stats only
 */

import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(import.meta.dirname, '..', '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { trackedBatchEmbedding } from './lib/llm-client.mjs';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'embed-imessages.mjs';
const WINDOW_MINUTES = 10; // Group messages within this window
const MIN_CHUNK_LENGTH = 20; // Skip chunks shorter than this
const EMBED_BATCH_SIZE = 100; // OpenAI batch size
const DB_PAGE_SIZE = 1000; // Supabase fetch page size

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statsOnly = args.includes('--stats');

async function main() {
  console.log('=== iMessage Embedding ===');
  if (dryRun) console.log('DRY RUN — no changes will be made\n');

  // Check how many are already embedded
  const { count: embeddedCount } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'communication')
    .contains('metadata', { channel: 'imessage' });

  const { count: totalMessages } = await supabase
    .from('communications_history')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'imessage');

  console.log(`Total iMessages: ${totalMessages}`);
  console.log(`Already embedded chunks: ${embeddedCount || 0}`);

  if (statsOnly) {
    process.exit(0);
  }

  // Skip if already embedded
  if (embeddedCount > 0) {
    console.log(`\nAlready have ${embeddedCount} iMessage chunks. Skipping to avoid duplicates.`);
    console.log('To re-embed, first delete existing: DELETE FROM knowledge_chunks WHERE source_type = \'communication\' AND metadata->>\'channel\' = \'imessage\'');
    process.exit(0);
  }

  // Fetch all iMessages ordered by time
  console.log('\nFetching messages...');
  let allMessages = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('communications_history')
      .select('id, content_preview, direction, occurred_at, metadata')
      .eq('channel', 'imessage')
      .not('content_preview', 'is', null)
      .order('occurred_at', { ascending: true })
      .range(offset, offset + DB_PAGE_SIZE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allMessages.push(...data);
    offset += data.length;
    if (data.length < DB_PAGE_SIZE) break;
  }

  console.log(`Fetched ${allMessages.length} messages with content`);

  // Filter out messages that are just attachments with no real text
  allMessages = allMessages.filter(m => {
    const text = m.content_preview || '';
    // Skip pure attachment references, very short messages, and binary artifacts
    if (text.length < 5) return false;
    if (/^\[image\//.test(text) || /^\[video\//.test(text)) return false;
    if (text.startsWith('__kIM')) return false;
    return true;
  });

  console.log(`After filtering: ${allMessages.length} messages with meaningful text`);

  // Group into conversation windows
  const windows = [];
  let currentWindow = [];
  let windowStart = null;

  for (const msg of allMessages) {
    const msgTime = new Date(msg.occurred_at).getTime();

    if (windowStart && (msgTime - windowStart) > WINDOW_MINUTES * 60 * 1000) {
      // Start new window
      if (currentWindow.length > 0) windows.push(currentWindow);
      currentWindow = [msg];
      windowStart = msgTime;
    } else {
      if (!windowStart) windowStart = msgTime;
      currentWindow.push(msg);
    }
  }
  if (currentWindow.length > 0) windows.push(currentWindow);

  console.log(`Grouped into ${windows.length} conversation windows`);

  // Build chunks from windows
  const chunks = [];
  for (const window of windows) {
    const date = window[0].occurred_at?.slice(0, 10) || 'unknown';
    const lines = window.map(m => {
      const sender = m.direction === 'outbound' ? 'Ben' : 'Nick';
      const text = (m.content_preview || '').slice(0, 500);
      return `${sender}: ${text}`;
    });
    const content = lines.join('\n');

    if (content.length < MIN_CHUNK_LENGTH) continue;

    // Trim to ~1500 chars for embedding (longer chunks dilute the signal)
    const trimmed = content.length > 1500 ? content.slice(0, 1500) + '...' : content;

    chunks.push({
      content: trimmed,
      date,
      sourceIds: window.map(m => m.id),
      messageCount: window.length,
    });
  }

  console.log(`Built ${chunks.length} embeddable chunks (avg ${(allMessages.length / chunks.length).toFixed(1)} msgs/chunk)`);

  if (dryRun) {
    // Show sample chunks
    console.log('\nSample chunks:');
    for (const chunk of chunks.slice(0, 5)) {
      console.log(`\n--- ${chunk.date} (${chunk.messageCount} msgs) ---`);
      console.log(chunk.content.slice(0, 200) + '...');
    }
    console.log(`\n\nDRY RUN — ${chunks.length} chunks would be embedded.`);
    process.exit(0);
  }

  // Embed in batches
  let embedded = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map(c => c.content);

    try {
      const embeddings = await trackedBatchEmbedding(texts, SCRIPT_NAME);

      // Insert into knowledge_chunks
      const rows = batch.map((chunk, j) => ({
        content: chunk.content,
        embedding: embeddings[j],
        source_type: 'communication',
        source_id: chunk.sourceIds[0], // Primary message ID
        metadata: {
          channel: 'imessage',
          date: chunk.date,
          message_count: chunk.messageCount,
          source_ids: chunk.sourceIds.slice(0, 10), // Cap to avoid huge metadata
        },
      }));

      const { error } = await supabase
        .from('knowledge_chunks')
        .insert(rows);

      if (error) {
        console.error(`  Batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1} insert error: ${error.message}`);
        errors++;
      } else {
        embedded += batch.length;
      }
    } catch (err) {
      console.error(`  Batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1} embed error: ${err.message}`);
      errors++;
    }

    // Progress
    const pct = (((i + batch.length) / chunks.length) * 100).toFixed(0);
    process.stdout.write(`\r  Embedding: ${pct}% (${embedded}/${chunks.length} chunks)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n=== Summary ===`);
  console.log(`Duration:     ${duration}s`);
  console.log(`Chunks:       ${chunks.length}`);
  console.log(`Embedded:     ${embedded}`);
  console.log(`Errors:       ${errors}`);
  console.log(`Messages:     ${allMessages.length}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
