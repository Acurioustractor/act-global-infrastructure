#!/usr/bin/env node
/**
 * Re-embed Knowledge Chunks
 *
 * Converts knowledge chunks to 384-dim embeddings using all-MiniLM-L6-v2.
 * This is needed after migrating from Farmhand (which may have used different models).
 *
 * Uses @xenova/transformers for local embedding generation (no API calls).
 *
 * Usage:
 *   node scripts/reembed-knowledge.mjs [command]
 *
 * Commands:
 *   status   - Show embedding status (default)
 *   embed    - Re-embed all chunks without embeddings
 *   reembed  - Force re-embed all chunks (even with existing embeddings)
 *   test     - Test embedding generation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' });

// Database configuration
const MAIN_URL = 'https://tednluwflfhxyucgwigh.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAIN_KEY) {
    console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(MAIN_URL, MAIN_KEY);

// Embedding model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const BATCH_SIZE = 10;  // Process in batches to avoid memory issues

let embedder = null;

/**
 * Initialize the embedding model
 */
async function initEmbedder() {
    if (embedder) return;

    console.log(`📦 Loading embedding model: ${MODEL_NAME}`);
    console.log('   (First run may download ~23MB model)');

    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', MODEL_NAME);

    console.log('✅ Model loaded');
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
    if (!embedder) await initEmbedder();

    // Truncate to model's max length (~512 tokens ≈ ~2000 chars)
    const truncated = text.slice(0, 2000);

    const output = await embedder(truncated, {
        pooling: 'mean',
        normalize: true
    });

    // Convert to regular array
    return Array.from(output.data);
}

/**
 * Show embedding status
 */
async function showStatus() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Knowledge Chunks Embedding Status');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Count total chunks
    const { count: total } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true });

    // Count chunks with embeddings
    const { count: withEmbeddings } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

    // Count chunks by source type
    const { data: bySource } = await supabase
        .from('knowledge_chunks')
        .select('source_type')
        .then(({ data }) => {
            const counts = {};
            (data || []).forEach(row => {
                counts[row.source_type] = (counts[row.source_type] || 0) + 1;
            });
            return { data: counts };
        });

    console.log(`Total chunks:        ${total || 0}`);
    console.log(`With embeddings:     ${withEmbeddings || 0}`);
    console.log(`Need embedding:      ${(total || 0) - (withEmbeddings || 0)}`);
    console.log('');
    console.log('By source type:');
    for (const [source, count] of Object.entries(bySource || {})) {
        console.log(`  ${source.padEnd(15)} ${count}`);
    }

    console.log('');
    console.log(`Model: ${MODEL_NAME}`);
    console.log(`Dimensions: ${EMBEDDING_DIM}`);
}

/**
 * Embed chunks that don't have embeddings
 */
async function embedChunks(forceReembed = false) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ${forceReembed ? 'Force Re-embedding' : 'Embedding'} Knowledge Chunks`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    await initEmbedder();

    // Build query
    let query = supabase
        .from('knowledge_chunks')
        .select('id, content')
        .order('created_at', { ascending: true });

    if (!forceReembed) {
        query = query.is('embedding', null);
    }

    const { data: chunks, error } = await query;

    if (error) {
        console.error('Error fetching chunks:', error.message);
        return;
    }

    if (!chunks || chunks.length === 0) {
        console.log('✅ All chunks already have embeddings!');
        return;
    }

    console.log(`Found ${chunks.length} chunks to embed`);
    console.log(`Processing in batches of ${BATCH_SIZE}...`);
    console.log('');

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

        process.stdout.write(`\rBatch ${batchNum}/${totalBatches} (${processed}/${chunks.length} chunks)...`);

        for (const chunk of batch) {
            try {
                const embedding = await generateEmbedding(chunk.content);

                const { error: updateError } = await supabase
                    .from('knowledge_chunks')
                    .update({ embedding })
                    .eq('id', chunk.id);

                if (updateError) {
                    console.error(`\n  Error updating ${chunk.id}: ${updateError.message}`);
                    errors++;
                } else {
                    processed++;
                }
            } catch (err) {
                console.error(`\n  Error embedding ${chunk.id}: ${err.message}`);
                errors++;
            }
        }
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Complete');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Processed: ${processed}`);
    console.log(`Errors:    ${errors}`);
}

/**
 * Test embedding generation
 */
async function testEmbedding() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Testing Embedding Generation');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await initEmbedder();

    const testTexts = [
        'ACT brings people together through art and community.',
        'The Empathy Ledger captures stories of transformation.',
        'Climate action requires listening to those most affected.'
    ];

    for (const text of testTexts) {
        console.log(`\nText: "${text.slice(0, 50)}..."`);

        const embedding = await generateEmbedding(text);

        console.log(`  Dimensions: ${embedding.length}`);
        console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Magnitude: ${Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)).toFixed(4)}`);
    }

    // Test similarity
    console.log('\n--- Similarity Test ---');
    const emb1 = await generateEmbedding(testTexts[0]);
    const emb2 = await generateEmbedding(testTexts[1]);
    const emb3 = await generateEmbedding('The weather is nice today.');

    const cosineSim = (a, b) => {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    console.log(`\nSimilarity (ACT ↔ EL): ${cosineSim(emb1, emb2).toFixed(4)}`);
    console.log(`Similarity (ACT ↔ weather): ${cosineSim(emb1, emb3).toFixed(4)}`);
    console.log('(Higher = more similar, range 0-1)');

    console.log('\n✅ Embedding test complete!');
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2] || 'status';

switch (command) {
    case 'status':
        await showStatus();
        break;
    case 'embed':
        await embedChunks(false);
        break;
    case 'reembed':
        await embedChunks(true);
        break;
    case 'test':
        await testEmbedding();
        break;
    default:
        console.log('Usage: node scripts/reembed-knowledge.mjs [command]');
        console.log('');
        console.log('Commands:');
        console.log('  status   - Show embedding status (default)');
        console.log('  embed    - Embed chunks without embeddings');
        console.log('  reembed  - Force re-embed all chunks');
        console.log('  test     - Test embedding generation');
}
