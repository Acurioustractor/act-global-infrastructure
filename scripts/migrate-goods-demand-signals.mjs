#!/usr/bin/env node
/**
 * Migrate CivicGraph-generated community demand signals from the Goods
 * Buyer Pipeline to the Goods Demand Register pipeline.
 *
 * Identifies signals by name pattern: `COMMUNITY — Goods Demand $XK`.
 *
 * Prerequisites:
 *   - Ben has created a new "Goods — Demand Register" pipeline in GHL
 *     with stage "Signal" (see thoughts/shared/drafts/ghl-pipeline-setup-instructions.md)
 *   - The pipeline has synced to ghl_pipelines table
 *
 * Usage:
 *   node scripts/migrate-goods-demand-signals.mjs --dry-run   # report moves
 *   node scripts/migrate-goods-demand-signals.mjs             # execute
 *
 * Idempotent: only moves opps still in the Buyer Pipeline.
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import './lib/load-env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log(`[migrate-demand-signals] mode=${DRY_RUN ? 'dry-run' : 'live'}`);

  // ━━━ Load pipelines
  const { data: pipelines } = await supabase
    .from('ghl_pipelines')
    .select('ghl_id, name, stages')
    .ilike('name', '%goods%');

  const buyerPipeline = pipelines?.find(p =>
    (p.name.toLowerCase().includes('buyer') || p.name.toLowerCase() === 'goods') &&
    !p.name.toLowerCase().includes('demand')
  );
  const demandPipeline = pipelines?.find(p =>
    p.name.toLowerCase().includes('demand')
  );

  if (!buyerPipeline) {
    throw new Error('Buyer pipeline not found.');
  }

  if (!demandPipeline) {
    console.error('\n✗ Demand Register pipeline not found in GHL.\n');
    console.error('Before running this script:');
    console.error('  1. In GHL UI, create a new pipeline named "Goods — Demand Register"');
    console.error('  2. Add four stages: Signal, Buyer Matched, Converted, Dormant');
    console.error('  3. Run the GHL sync: node scripts/sync-ghl-to-supabase.mjs');
    console.error('  4. Re-run this script.');
    console.error('\nFull setup: thoughts/shared/drafts/ghl-pipeline-setup-instructions.md');
    process.exit(2);
  }

  const demandStages = Array.isArray(demandPipeline.stages) ? demandPipeline.stages : [];
  const signalStage = demandStages.find(s => s.name.toLowerCase() === 'signal');

  if (!signalStage) {
    throw new Error('Demand Register pipeline has no "Signal" stage.');
  }

  // ━━━ Find demand signal opps still in Buyer Pipeline
  const { data: signals, error } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, name, stage_name, monetary_value')
    .eq('pipeline_name', buyerPipeline.name)
    .ilike('name', '%— Goods Demand $%')
    .limit(200);

  if (error) throw error;

  console.log(`[migrate-demand-signals] found ${signals?.length ?? 0} demand signals in ${buyerPipeline.name}`);

  if (!signals?.length) {
    console.log('[migrate-demand-signals] nothing to migrate');
    return;
  }

  if (VERBOSE || DRY_RUN) {
    console.log('\n=== would move ===');
    for (const s of signals.slice(0, 20)) {
      console.log(`  ${s.name} $${Number(s.monetary_value).toLocaleString()}`);
    }
    if (signals.length > 20) console.log(`  ... and ${signals.length - 20} more`);
  }

  if (DRY_RUN) {
    console.log(`\n[migrate-demand-signals] dry-run — ${signals.length} signals would move to ${demandPipeline.name}/Signal`);
    return;
  }

  // ━━━ Execute moves
  const ghl = createGHLService();
  const startedAt = new Date().toISOString();
  let updated = 0;
  let failed = 0;

  for (const s of signals) {
    try {
      await ghl.updateOpportunity(s.ghl_id, {
        pipelineId: demandPipeline.ghl_id,
        stageId: signalStage.id,
      });

      // Mirror update: Supabase will sync on next GHL pull; for immediate UI
      // reflection, update the mirror now.
      await supabase
        .from('ghl_opportunities')
        .update({
          ghl_pipeline_id: demandPipeline.ghl_id,
          pipeline_name: demandPipeline.name,
          ghl_stage_id: signalStage.id,
          stage_name: signalStage.name,
        })
        .eq('id', s.id);

      updated++;
      if (VERBOSE) console.log(`  ✓ moved ${s.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ failed ${s.name}: ${err.message}`);
    }
  }

  await supabase.from('ghl_sync_log').insert({
    operation: 'MigrateDemandSignals',
    direction: 'push',
    status: failed === 0 ? 'success' : 'partial',
    records_processed: signals.length,
    records_updated: updated,
    records_failed: failed,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    triggered_by: 'migrate-goods-demand-signals',
    metadata: {
      from_pipeline: buyerPipeline.name,
      to_pipeline: demandPipeline.name,
      to_stage: signalStage.name,
    },
  });

  console.log(`\n[migrate-demand-signals] done: ${updated} moved, ${failed} failed`);
}

main().catch(err => {
  console.error(`[migrate-demand-signals] FAILED: ${err.message}`);
  process.exit(1);
});
