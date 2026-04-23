#!/usr/bin/env node
/**
 * Seed Goods GHL opportunities from Xero paid invoices
 *
 * For every ACCREC Xero invoice tagged ACT-GD (or matching Goods pattern)
 * that does NOT have a corresponding GHL opportunity, create one in the
 * "Goods" buyer pipeline at the appropriate stage based on invoice status:
 *
 *   Xero PAID       → GHL Paid (or "Closed" pre-stage-rename)
 *   Xero AUTHORISED → GHL Invoiced
 *   Xero DRAFT      → GHL Proposed (receivable exists but not sent yet)
 *   Xero VOIDED     → skip (unless opp already exists, then move to Lost — handled by reconciler agent)
 *
 * Usage:
 *   node scripts/seed-goods-opps-from-xero.mjs --dry-run      # report what would change
 *   node scripts/seed-goods-opps-from-xero.mjs --verbose      # full logs
 *   node scripts/seed-goods-opps-from-xero.mjs                # execute
 *
 * Idempotent: running twice does not create duplicates. Matches existing
 * opps by xero_invoice_id; creates new ones only when no match is found.
 *
 * Logs each action to ghl_sync_log with operation=SeedFromXero.
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

// Status → stage name mapping. If Ben has renamed the stages per the
// setup doc, these names will resolve to the new 12-stage set. Before
// the rename, "Paid" falls through to "Closed" (the closest equivalent
// in the 4-stage layout).
const STATUS_TO_STAGE = {
  PAID: 'Paid',
  AUTHORISED: 'Invoiced',
  SUBMITTED: 'Invoiced',
  DRAFT: 'Proposed',
};

const LEGACY_FALLBACKS = {
  Paid: 'Closed',
  Invoiced: 'Proposal Sent',
  Proposed: 'Proposal Sent',
};

async function main() {
  console.log(`[seed-goods-opps-from-xero] mode=${DRY_RUN ? 'dry-run' : 'live'}`);

  // ━━━ Load Xero invoices tagged ACT-GD
  const { data: invoices, error: invErr } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, type, contact_name, contact_id, date, due_date, total, amount_paid, amount_due, status, reference, line_items')
    .eq('type', 'ACCREC')
    .in('status', ['PAID', 'AUTHORISED', 'SUBMITTED', 'DRAFT'])
    .order('date', { ascending: false })
    .limit(500);

  if (invErr) throw invErr;

  // Filter to ACT-GD / Goods-relevant invoices by line-item tracking or description heuristics
  const goodsInvoices = (invoices ?? []).filter(inv => {
    const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
    const hasGoodsLine = lines.some(li => {
      const desc = (li?.description ?? '').toLowerCase();
      return desc.includes('goods') || desc.includes('weave bed') || desc.includes('production plant') || desc.includes('washing machine') || desc.includes('fridge');
    });
    const tracked = lines.some(li =>
      Array.isArray(li?.tracking) &&
      li.tracking.some(t => (t?.name ?? '').toLowerCase().includes('gd') || (t?.option ?? '').toLowerCase().includes('goods'))
    );
    return hasGoodsLine || tracked;
  });

  console.log(`[seed-goods-opps-from-xero] candidate invoices: ${goodsInvoices.length} (of ${invoices?.length ?? 0} ACCREC)`);

  // ━━━ Load existing GHL opps in the Goods pipeline to avoid duplicates
  const { data: existingOpps, error: oppsErr } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, name, xero_invoice_id, pipeline_name, stage_name')
    .ilike('pipeline_name', '%goods%');

  if (oppsErr) throw oppsErr;

  const oppByXeroId = new Map((existingOpps ?? [])
    .filter(o => o.xero_invoice_id)
    .map(o => [o.xero_invoice_id, o])
  );

  console.log(`[seed-goods-opps-from-xero] existing opps with xero_invoice_id: ${oppByXeroId.size}`);

  // ━━━ Load GHL pipeline structure (need stage IDs for creates)
  const { data: pipelines } = await supabase
    .from('ghl_pipelines')
    .select('ghl_id, name, stages')
    .ilike('name', '%goods%');

  const buyerPipeline = pipelines?.find(p =>
    p.name.toLowerCase().includes('buyer') || p.name.toLowerCase() === 'goods'
  );

  if (!buyerPipeline) {
    throw new Error('Could not find Goods buyer pipeline in ghl_pipelines. Sync GHL pipelines first.');
  }

  const stages = Array.isArray(buyerPipeline.stages) ? buyerPipeline.stages : [];
  const stageByName = new Map(stages.map(s => [s.name, s]));

  function resolveStage(targetName) {
    if (stageByName.has(targetName)) return stageByName.get(targetName);
    const fallback = LEGACY_FALLBACKS[targetName];
    if (fallback && stageByName.has(fallback)) return stageByName.get(fallback);
    return null;
  }

  // ━━━ Plan creations
  const plan = [];
  const skipped = [];

  for (const inv of goodsInvoices) {
    if (oppByXeroId.has(inv.xero_id)) {
      skipped.push({ invoice: inv.invoice_number, reason: 'already has GHL opp' });
      continue;
    }

    const targetStageName = STATUS_TO_STAGE[inv.status];
    if (!targetStageName) {
      skipped.push({ invoice: inv.invoice_number, reason: `no stage mapping for status ${inv.status}` });
      continue;
    }

    const stage = resolveStage(targetStageName);
    if (!stage) {
      skipped.push({ invoice: inv.invoice_number, reason: `no stage "${targetStageName}" or fallback in pipeline` });
      continue;
    }

    // Try to find matching GHL contact by company name
    let contactId = null;
    const { data: contactMatch } = await supabase
      .from('ghl_contacts')
      .select('ghl_id')
      .or(`company_name.ilike.${inv.contact_name}%,full_name.ilike.${inv.contact_name}%`)
      .limit(1);
    if (contactMatch?.[0]) contactId = contactMatch[0].ghl_id;

    plan.push({
      invoice: inv.invoice_number,
      xero_id: inv.xero_id,
      contact_name: inv.contact_name,
      ghl_contact_id: contactId,
      total: Number(inv.total ?? 0),
      status: inv.status,
      target_stage: targetStageName,
      stage_id: stage.id,
      stage_id_used: stage.name !== targetStageName ? `(fallback: ${stage.name})` : null,
      name: `${inv.contact_name} — ${invoiceDescription(inv)}`,
    });
  }

  // ━━━ Report plan
  console.log(`\n[seed-goods-opps-from-xero] plan: ${plan.length} creates, ${skipped.length} skipped`);
  if (VERBOSE) {
    console.log('\n=== plan ===');
    for (const p of plan) {
      console.log(`  CREATE "${p.name}" total=$${p.total} status=${p.status} → ${p.target_stage}${p.stage_id_used ? ' ' + p.stage_id_used : ''}`);
    }
    console.log('\n=== skipped ===');
    for (const s of skipped) {
      console.log(`  SKIP ${s.invoice}: ${s.reason}`);
    }
  } else {
    for (const p of plan) {
      console.log(`  CREATE "${p.name}" $${p.total} → ${p.target_stage}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n[seed-goods-opps-from-xero] dry-run — no changes made');
    return;
  }

  // ━━━ Execute plan
  const ghl = createGHLService();
  const startedAt = new Date().toISOString();
  let created = 0;
  let failed = 0;

  for (const p of plan) {
    try {
      const opp = await ghl.createOpportunity({
        pipelineId: buyerPipeline.ghl_id,
        stageId: p.stage_id,
        name: p.name,
        monetaryValue: p.total,
        contactId: p.ghl_contact_id,
        status: p.status === 'PAID' ? 'won' : 'open',
      });

      // Store xero_invoice_id in Supabase mirror for future dedup
      await supabase
        .from('ghl_opportunities')
        .update({ xero_invoice_id: p.xero_id, project_code: 'ACT-GD' })
        .eq('ghl_id', opp.opportunity?.id ?? opp.id);

      created++;
      if (VERBOSE) console.log(`  ✓ created ${p.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ failed ${p.name}: ${err.message}`);
    }
  }

  // ━━━ Log to ghl_sync_log
  await supabase.from('ghl_sync_log').insert({
    operation: 'SeedFromXero',
    direction: 'push',
    status: failed === 0 ? 'success' : 'partial',
    records_processed: plan.length,
    records_created: created,
    records_failed: failed,
    records_skipped: skipped.length,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    triggered_by: 'seed-goods-opps-from-xero',
    metadata: {
      dry_run: false,
      skipped_reasons: Object.fromEntries(
        [...new Set(skipped.map(s => s.reason))].map(r => [r, skipped.filter(s => s.reason === r).length])
      ),
    },
  });

  console.log(`\n[seed-goods-opps-from-xero] done: ${created} created, ${failed} failed, ${skipped.length} skipped`);
}

function invoiceDescription(inv) {
  const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
  const firstDesc = lines[0]?.description?.split('\n')[0]?.trim() ?? '';
  if (firstDesc) {
    return firstDesc.slice(0, 60);
  }
  return `${inv.invoice_number} ${inv.status}`;
}

main().catch(err => {
  console.error(`[seed-goods-opps-from-xero] FAILED: ${err.message}`);
  process.exit(1);
});
