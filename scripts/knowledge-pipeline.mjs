#!/usr/bin/env node
/**
 * Knowledge Pipeline Orchestrator
 *
 * Runs the full knowledge pipeline in sequence:
 *   Step 1: Embed — Generate embeddings for new project_knowledge + knowledge_chunks
 *   Step 2: Align — Cross-source vector similarity matching (KnowledgeAligner)
 *   Step 3: Consolidate — Merge near-duplicate chunks, run decay (MemoryLifecycle)
 *   Step 4: Graph — Auto-link entities and knowledge items (KnowledgeGraph)
 *
 * Each step is independent and will not block subsequent steps on failure.
 * Results are logged to api_usage table for monitoring.
 *
 * Usage:
 *   node scripts/knowledge-pipeline.mjs              # Full pipeline
 *   node scripts/knowledge-pipeline.mjs --step embed # Single step
 *   node scripts/knowledge-pipeline.mjs --step align
 *   node scripts/knowledge-pipeline.mjs --step consolidate
 *   node scripts/knowledge-pipeline.mjs --step graph
 *   node scripts/knowledge-pipeline.mjs --dry-run    # Preview without changes
 *   node scripts/knowledge-pipeline.mjs --verbose     # Extra logging
 *
 * Schedule: Daily at 8am AEST (after embed-knowledge runs at 7am)
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { KnowledgeAligner } from './lib/knowledge-aligner.mjs';
import { MemoryLifecycle } from './lib/memory-lifecycle.mjs';
import { KnowledgeGraph } from './lib/knowledge-graph.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'knowledge-pipeline';

// Parse CLI args
const args = process.argv.slice(2);
const stepFilter = args.includes('--step') ? args[args.indexOf('--step') + 1] : null;
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || args.includes('-v');

const steps = ['embed', 'align', 'consolidate', 'graph'];

async function main() {
  const start = Date.now();
  console.log('=== Knowledge Pipeline ===');
  console.log(`Time: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);
  if (stepFilter) console.log(`Step filter: ${stepFilter}`);
  if (dryRun) console.log('DRY RUN — no changes');
  console.log('');

  const results = {};

  for (const step of steps) {
    if (stepFilter && step !== stepFilter) continue;

    const stepStart = Date.now();
    console.log(`--- Step: ${step} ---`);

    try {
      results[step] = await runStep(step);
      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      console.log(`  ✓ ${step} complete (${elapsed}s): ${JSON.stringify(results[step])}`);
    } catch (err) {
      const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      console.error(`  ✗ ${step} failed (${elapsed}s): ${err.message}`);
      results[step] = { error: err.message };
    }
    console.log('');
  }

  // Log pipeline run
  const totalMs = Date.now() - start;
  const hasErrors = Object.values(results).some(r => r?.error);

  if (!dryRun) {
    await logPipelineRun(results, totalMs, hasErrors);
  }

  console.log(`=== Pipeline complete (${(totalMs / 1000).toFixed(1)}s) ===`);
  console.log(`Results: ${JSON.stringify(results, null, 2)}`);

  if (hasErrors) {
    console.log('\n⚠ Some steps had errors — check logs above');
    process.exit(1);
  }
}

async function runStep(step) {
  switch (step) {
    case 'embed':
      return await runEmbed();
    case 'align':
      return await runAlign();
    case 'consolidate':
      return await runConsolidate();
    case 'graph':
      return await runGraph();
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

// Step 1: Check for un-embedded records and report count
// (Actual embedding is handled by embed-knowledge.mjs which should run first)
async function runEmbed() {
  const { count: missingKnowledge } = await supabase
    .from('project_knowledge')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  const { count: missingChunks } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null);

  const total = (missingKnowledge || 0) + (missingChunks || 0);

  if (total > 0) {
    console.log(`  ⚠ ${total} records missing embeddings (${missingKnowledge || 0} knowledge, ${missingChunks || 0} chunks)`);
    console.log(`  Run: node scripts/embed-knowledge.mjs`);
  } else {
    console.log(`  All records have embeddings`);
  }

  return { missing_knowledge: missingKnowledge || 0, missing_chunks: missingChunks || 0 };
}

// Step 2: Cross-source alignment
async function runAlign() {
  if (dryRun) {
    const { count } = await supabase
      .from('knowledge_chunks')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null)
      .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    return { would_process: count || 0, dry_run: true };
  }

  const aligner = new KnowledgeAligner({
    supabase,
    verbose,
    similarityThreshold: 0.75,
    maxEdgesPerRun: 50,
  });

  // Look back 48 hours to catch anything missed
  const result = await aligner.runAlignment(48);
  return result;
}

// Step 3: Memory decay + consolidation candidates
async function runConsolidate() {
  const lifecycle = new MemoryLifecycle({
    supabase,
    verbose,
    similarityThreshold: 0.85,
  });

  if (dryRun) {
    const candidates = await lifecycle.findConsolidationCandidates(5);
    return { consolidation_candidates: candidates.length, dry_run: true };
  }

  // Run decay first
  let decayResult;
  try {
    decayResult = await lifecycle.runDecayCycle();
  } catch (err) {
    console.warn(`  Decay cycle skipped: ${err.message}`);
    decayResult = { skipped: true, reason: err.message };
  }

  // Find consolidation candidates (log them but don't auto-merge — needs review)
  const candidates = await lifecycle.findConsolidationCandidates(10);

  return {
    decay: decayResult,
    consolidation_candidates: candidates.length,
    candidate_groups: candidates.map(c => ({
      chunks: c.totalChunks,
      preview: c.primaryContent?.substring(0, 60),
    })),
  };
}

// Step 4: Auto-link entities via knowledge graph
async function runGraph() {
  const graph = new KnowledgeGraph({
    supabase,
    verbose,
  });

  // Find project_knowledge items without graph edges
  const { data: unlinked, error } = await supabase
    .from('project_knowledge')
    .select('id, project_code, title, knowledge_type')
    .is('embedding', null) // Start with those that have no edges likely
    .order('created_at', { ascending: false })
    .limit(50);

  // Count existing edges for context
  const { count: edgeCount } = await supabase
    .from('knowledge_edges')
    .select('id', { count: 'exact', head: true });

  if (dryRun) {
    return { total_edges: edgeCount || 0, dry_run: true };
  }

  // Auto-link project_knowledge items to their project entities
  let linksCreated = 0;
  const { data: recentKnowledge } = await supabase
    .from('project_knowledge')
    .select('id, project_code, knowledge_type')
    .gt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .limit(100);

  for (const item of recentKnowledge || []) {
    if (!item.project_code) continue;

    // Link knowledge to its project via canonical_entities
    const { data: entity } = await supabase
      .from('canonical_entities')
      .select('id')
      .eq('type', 'project')
      .ilike('name', `%${item.project_code}%`)
      .limit(1)
      .maybeSingle();

    if (entity) {
      try {
        await graph.addEdge(
          'project_knowledge', item.id,
          'entity', entity.id,
          'about',
          {
            strength: 0.9,
            confidence: 0.95,
            createdBy: 'knowledge-pipeline',
            reasoning: `Auto-linked ${item.knowledge_type} to project ${item.project_code}`,
          }
        );
        linksCreated++;
      } catch {
        // Duplicate edge — fine
      }
    }
  }

  return { total_edges: edgeCount || 0, new_links: linksCreated };
}

async function logPipelineRun(results, totalMs, hasErrors) {
  try {
    await supabase.from('api_usage').insert({
      provider: 'internal',
      model: 'knowledge-pipeline',
      endpoint: 'pipeline-run',
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      script_name: SCRIPT_NAME,
      agent_id: SCRIPT_NAME,
      operation: 'pipeline-run',
      latency_ms: totalMs,
      response_status: hasErrors ? 500 : 200,
      metadata: results,
    });
  } catch (err) {
    console.warn('Failed to log pipeline run:', err.message);
  }
}

main().catch((err) => {
  console.error('Pipeline fatal error:', err);
  process.exit(1);
});
