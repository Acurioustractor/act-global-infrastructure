#!/usr/bin/env node

/**
 * Embed Communications
 *
 * Generates vector embeddings for all communications from the `communications_history`
 * table and stores them in `knowledge_chunks` for semantic search / RAG retrieval.
 *
 * Uses OpenAI text-embedding-3-small (384 dimensions) via the tracked LLM client.
 * Processes in batches of 20 for efficiency.
 *
 * Usage:
 *   node scripts/embed-communications.mjs                # Embed all unembedded communications
 *   node scripts/embed-communications.mjs --dry-run      # Preview without changes
 *   node scripts/embed-communications.mjs --limit 50     # Only process first 50
 */

import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(import.meta.dirname, '..', '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { trackedBatchEmbedding } from './lib/llm-client.mjs';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_SHARED_URL / SUPABASE_SHARED_SERVICE_ROLE_KEY or fallbacks.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'embed-communications.mjs';
const BATCH_SIZE = 20;
const MAX_TEXT_LENGTH = 8000;

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

async function main() {
  console.log('=== Embed Communications ===');
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (dryRun) console.log('DRY RUN - no changes will be made');
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // 1. Get IDs of communications already in knowledge_chunks
  const { data: existingChunks, error: existingError } = await supabase
    .from('knowledge_chunks')
    .select('source_id')
    .eq('source_type', 'communication');

  if (existingError) {
    console.error('Failed to query existing knowledge_chunks:', existingError.message);
    process.exit(1);
  }

  const existingSourceIds = new Set((existingChunks || []).map(c => c.source_id));
  console.log(`Found ${existingSourceIds.size} communications already embedded.`);

  // 2. Fetch all communications (paginated to handle large tables)
  console.log('Fetching communications_history...');
  const communications = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error: commError } = await supabase
      .from('communications_history')
      .select('id, ghl_contact_id, channel, direction, subject, content_preview, occurred_at, project_code, contact_name, contact_email, source_system')
      .order('occurred_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (commError) {
      console.error('Failed to query communications_history:', commError.message);
      process.exit(1);
    }

    communications.push(...data);
    hasMore = data.length === pageSize;
    page++;
  }

  if (communications.length === 0) {
    console.log('No communications found.');
    process.exit(0);
  }

  // 3. Filter out already-embedded communications
  const toEmbed = communications.filter(c => !existingSourceIds.has(String(c.id)));

  console.log(`Total communications: ${communications.length}`);
  console.log(`Already embedded: ${existingSourceIds.size}`);
  console.log(`To embed: ${toEmbed.length}`);
  console.log('');

  if (toEmbed.length === 0) {
    console.log('All communications already embedded. Done!');
    process.exit(0);
  }

  // Apply limit
  const batch = limit ? toEmbed.slice(0, limit) : toEmbed;
  const totalToProcess = batch.length;

  if (limit && limit < toEmbed.length) {
    console.log(`Processing first ${limit} of ${toEmbed.length} communications.`);
    console.log('');
  }

  if (dryRun) {
    console.log('Dry run complete. Would embed the following:');
    for (const comm of batch.slice(0, 10)) {
      const preview = ((comm.subject || '') + ' ' + (comm.content_preview || '')).trim().substring(0, 80);
      console.log(`  [${comm.id}] ${comm.channel || 'unknown'} - ${preview}...`);
    }
    if (batch.length > 10) {
      console.log(`  ... and ${batch.length - 10} more`);
    }
    process.exit(0);
  }

  // 4. Process in batches
  let totalProcessed = 0;
  let totalFailed = 0;
  const totalBatches = Math.ceil(totalToProcess / BATCH_SIZE);

  for (let i = 0; i < totalToProcess; i += BATCH_SIZE) {
    const currentBatch = batch.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Batch ${batchNum}/${totalBatches} (${currentBatch.length} records)...`);

    // Prepare texts: combine subject + content_preview, truncate to 8000 chars
    const texts = currentBatch.map(c => {
      const parts = [];
      if (c.subject) parts.push(c.subject);
      if (c.content_preview) parts.push(c.content_preview);
      const combined = parts.join('\n\n').trim();
      return combined.substring(0, MAX_TEXT_LENGTH) || '(empty communication)';
    });

    // Retry up to 3 times on embedding failures
    let attempt = 0;
    const maxRetries = 3;
    let batchDone = false;

    while (attempt < maxRetries && !batchDone) {
      attempt++;
      try {
        const embeddings = await trackedBatchEmbedding(texts, SCRIPT_NAME);

        let batchSuccess = 0;
        for (let j = 0; j < currentBatch.length; j++) {
          const comm = currentBatch[j];

          const { error: insertError } = await supabase
            .from('knowledge_chunks')
            .insert({
              content: texts[j],
              embedding: embeddings[j],
              source_type: 'communication',
              source_id: String(comm.id),
              confidence: 1.0,
              metadata: {
                contact_id: comm.ghl_contact_id,
                channel: comm.channel,
                direction: comm.direction,
                sent_at: comm.occurred_at,
                project_code: comm.project_code,
                contact_name: comm.contact_name,
                contact_email: comm.contact_email,
                source_system: comm.source_system,
              },
            });

          if (insertError) {
            console.error(`  Failed to insert chunk for comm id=${comm.id}: ${insertError.message}`);
            totalFailed++;
          } else {
            batchSuccess++;
          }
        }

        totalProcessed += batchSuccess;
        console.log(`  Done: ${batchSuccess}/${currentBatch.length} inserted. Embedded ${totalProcessed}/${totalToProcess} communications.`);
        batchDone = true;
      } catch (err) {
        if (attempt < maxRetries) {
          const backoff = attempt * 2000;
          console.warn(`  Batch ${batchNum} attempt ${attempt} failed: ${err.message}. Retrying in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
        } else {
          console.error(`  Batch ${batchNum} failed after ${maxRetries} attempts: ${err.message}`);
          totalFailed += currentBatch.length;
        }
      }
    }

    // Delay between batches to respect rate limits (500ms)
    if (i + BATCH_SIZE < totalToProcess) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 5. Report stats
  console.log('');
  console.log('=== Summary ===');
  console.log(`Total to embed:  ${totalToProcess}`);
  console.log(`Embedded:        ${totalProcessed}`);
  console.log(`Failed:          ${totalFailed}`);
  console.log(`Batches:         ${totalBatches}`);

  // Verify final count
  const { count, error: countError } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'communication');

  if (!countError) {
    console.log(`Total communication chunks: ${count}`);
  }

  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
