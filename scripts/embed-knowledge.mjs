/**
 * Embed Knowledge Records
 *
 * Generates embeddings for all project_knowledge records that don't have one yet.
 * Uses OpenAI text-embedding-3-small (384 dimensions) via the tracked LLM client.
 * Processes in batches of 20 for efficiency.
 *
 * Usage:
 *   node scripts/embed-knowledge.mjs              # Embed all types missing embeddings
 *   node scripts/embed-knowledge.mjs --type meeting  # Only meetings
 *   node scripts/embed-knowledge.mjs --dry-run       # Preview without changes
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { trackedBatchEmbedding } from './lib/llm-client.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCRIPT_NAME = 'embed-knowledge.mjs';
const BATCH_SIZE = 20;
const MAX_TEXT_LENGTH = 8000;

// Parse CLI args
const args = process.argv.slice(2);
const typeFilter = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;
const dryRun = args.includes('--dry-run');

async function main() {
  console.log('=== Embed Knowledge Records ===');
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (typeFilter) console.log(`Type filter: ${typeFilter}`);
  if (dryRun) console.log('DRY RUN - no changes will be made');
  console.log('');

  // 1. Query records missing embeddings
  let query = supabase
    .from('project_knowledge')
    .select('id, title, content, knowledge_type')
    .is('embedding', null)
    .order('created_at', { ascending: true });

  if (typeFilter) {
    query = query.eq('knowledge_type', typeFilter);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('Failed to query project_knowledge:', error.message);
    process.exit(1);
  }

  if (!records || records.length === 0) {
    console.log('No records found missing embeddings. All done!');
    process.exit(0);
  }

  // Stats by type
  const typeCounts = {};
  for (const r of records) {
    typeCounts[r.knowledge_type] = (typeCounts[r.knowledge_type] || 0) + 1;
  }
  console.log(`Found ${records.length} records missing embeddings:`);
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');

  if (dryRun) {
    console.log('Dry run complete. Exiting.');
    process.exit(0);
  }

  // 2. Process in batches
  let totalProcessed = 0;
  let totalFailed = 0;
  let totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    // Prepare texts: combine title + content, truncate
    const texts = batch.map(r => {
      const combined = `${r.title || ''}\n\n${r.content || ''}`.trim();
      return combined.substring(0, MAX_TEXT_LENGTH);
    });

    try {
      // Generate embeddings for the batch
      const embeddings = await trackedBatchEmbedding(texts, SCRIPT_NAME);

      // Update each record with its embedding
      let batchSuccess = 0;
      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('project_knowledge')
          .update({ embedding: embeddings[j] })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`  Failed to update id=${batch[j].id}: ${updateError.message}`);
          totalFailed++;
        } else {
          batchSuccess++;
        }
      }

      totalProcessed += batchSuccess;
      console.log(`  Done: ${batchSuccess}/${batch.length} updated`);

    } catch (err) {
      console.error(`  Batch ${batchNum} embedding failed: ${err.message}`);
      totalFailed += batch.length;
    }

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < records.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // 3. Report stats
  console.log('');
  console.log('=== Summary ===');
  console.log(`Total records:   ${records.length}`);
  console.log(`Embedded:        ${totalProcessed}`);
  console.log(`Failed:          ${totalFailed}`);
  console.log(`Batches:         ${totalBatches}`);

  // Verify final count
  const { count, error: countError } = await supabase
    .from('project_knowledge')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  if (!countError) {
    console.log(`Remaining null:  ${count}`);
  }

  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
