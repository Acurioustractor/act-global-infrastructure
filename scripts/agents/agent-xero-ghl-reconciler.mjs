#!/usr/bin/env node
/**
 * Xero ↔ GHL Reconciler
 *
 * Daily 05:00 AEST (before weekly reconciliation + A1 procurement sweep).
 *
 * The single most valuable agent in the Goods operating system. Prevents the
 * $84,700-Production-Plant-DRAFT invisibility pattern from ever recurring:
 *
 *   For every ACCREC Xero invoice tagged ACT-GD:
 *     - If no matching GHL opp exists → create one at appropriate stage (Paid/Invoiced/Proposed)
 *     - If matching GHL opp exists but not at the right stage → move it
 *     - If Xero invoice is VOIDED/DELETED and opp exists → propose move to Lost
 *     - If Xero invoice is DRAFT and opp is at Committed+ → flag for CEO review
 *
 * Cost: Sonnet tier for the reasoning step (decides stage movements where
 *   ambiguous). Haiku for straightforward create/update operations handled
 *   directly via the seed script as a subprocess.
 *
 * Autonomy: L2 — proposes stage changes for CEO approval via cockpit panel.
 *   Does NOT auto-move opps through stages without approval (except the
 *   create-from-paid-invoice case, which is mechanical).
 *
 * STUB: first real deployment May Week 2 per 6-month plan, after the
 *   seed-goods-opps-from-xero.mjs script has been run once as backfill.
 */

import { createClient } from '@supabase/supabase-js';
import { runAgent, todayISO } from '../lib/goods-agent-runtime.mjs';
import '../../lib/load-env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function gatherContext() {
  // All ACCREC Xero invoices tagged ACT-GD or Goods-line-item-detected
  const { data: xeroInvoices } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, date, total, amount_paid, amount_due, status, line_items')
    .eq('type', 'ACCREC')
    .order('date', { ascending: false })
    .limit(500);

  // All Goods-pipeline GHL opps
  const { data: ghlOpps } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, name, pipeline_name, stage_name, status, monetary_value, xero_invoice_id')
    .ilike('pipeline_name', '%goods%');

  // Index opps by xero_invoice_id for fast lookup
  const oppByXeroId = new Map(
    (ghlOpps ?? []).filter(o => o.xero_invoice_id).map(o => [o.xero_invoice_id, o])
  );

  // Classify drift
  const goodsInvoices = (xeroInvoices ?? []).filter(inv => {
    const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
    return lines.some(li => {
      const desc = (li?.description ?? '').toLowerCase();
      return desc.includes('goods') || desc.includes('weave bed') || desc.includes('production plant');
    });
  });

  const drift = [];

  for (const inv of goodsInvoices) {
    const opp = oppByXeroId.get(inv.xero_id);

    if (!opp && ['PAID', 'AUTHORISED', 'DRAFT'].includes(inv.status)) {
      drift.push({
        type: 'MISSING_OPP',
        severity: inv.status === 'DRAFT' ? 'high' : 'medium',
        xero_invoice: inv.invoice_number,
        xero_status: inv.status,
        contact: inv.contact_name,
        total: Number(inv.total ?? 0),
        proposed_action: `Create GHL opp at stage "${stageForStatus(inv.status)}" for ${inv.contact_name} $${Number(inv.total ?? 0).toLocaleString()}`,
      });
    } else if (opp && inv.status === 'PAID' && opp.stage_name?.toLowerCase() !== 'paid' && opp.stage_name?.toLowerCase() !== 'closed') {
      drift.push({
        type: 'STAGE_MISMATCH',
        severity: 'medium',
        xero_invoice: inv.invoice_number,
        xero_status: inv.status,
        ghl_opp: opp.name,
        current_stage: opp.stage_name,
        proposed_action: `Move opp "${opp.name}" from "${opp.stage_name}" to "Paid"`,
      });
    } else if (opp && ['VOIDED', 'DELETED'].includes(inv.status) && !['lost'].includes(opp.stage_name?.toLowerCase() ?? '')) {
      drift.push({
        type: 'VOIDED_INVOICE_LIVE_OPP',
        severity: 'medium',
        xero_invoice: inv.invoice_number,
        xero_status: inv.status,
        ghl_opp: opp.name,
        current_stage: opp.stage_name,
        proposed_action: `Move opp "${opp.name}" to "Lost" with note "Xero invoice ${inv.status}"`,
      });
    } else if (inv.status === 'DRAFT' && opp && ['committed', 'in delivery', 'delivered'].includes(opp.stage_name?.toLowerCase() ?? '')) {
      drift.push({
        type: 'DRAFT_INVOICE_COMMITTED_DEAL',
        severity: 'high',
        xero_invoice: inv.invoice_number,
        xero_status: inv.status,
        ghl_opp: opp.name,
        current_stage: opp.stage_name,
        proposed_action: `CEO review required: invoice "${inv.invoice_number}" is DRAFT but deal is ${opp.stage_name}. Send invoice or void.`,
      });
    }
  }

  return {
    goodsInvoiceCount: goodsInvoices.length,
    oppCount: ghlOpps?.length ?? 0,
    drift,
    byType: {
      MISSING_OPP: drift.filter(d => d.type === 'MISSING_OPP').length,
      STAGE_MISMATCH: drift.filter(d => d.type === 'STAGE_MISMATCH').length,
      VOIDED_INVOICE_LIVE_OPP: drift.filter(d => d.type === 'VOIDED_INVOICE_LIVE_OPP').length,
      DRAFT_INVOICE_COMMITTED_DEAL: drift.filter(d => d.type === 'DRAFT_INVOICE_COMMITTED_DEAL').length,
    },
  };
}

function stageForStatus(status) {
  switch (status) {
    case 'PAID': return 'Paid';
    case 'AUTHORISED':
    case 'SUBMITTED': return 'Invoiced';
    case 'DRAFT': return 'Proposed';
    default: return 'Outreach Queued';
  }
}

function composePrompt(context) {
  if (context.drift.length === 0) {
    return `
RECONCILER STATE (${todayISO()}):
Xero ACCREC Goods-tagged invoices: ${context.goodsInvoiceCount}
GHL Goods-pipeline opps: ${context.oppCount}
Drift detected: NONE

TASK: Return exactly: "Xero ↔ GHL in sync. No actions required."
`.trim();
  }

  const driftList = context.drift.map((d, i) =>
    `[${i + 1}] ${d.type} (severity: ${d.severity})
    xero: ${d.xero_invoice} status=${d.xero_status}${d.contact ? ` contact=${d.contact}` : ''}${d.total ? ` $${d.total.toLocaleString()}` : ''}
    ${d.ghl_opp ? `ghl opp: "${d.ghl_opp}" at "${d.current_stage}"` : ''}
    proposed: ${d.proposed_action}`
  ).join('\n\n');

  return `
RECONCILER STATE (${todayISO()}):
Xero ACCREC Goods-tagged invoices: ${context.goodsInvoiceCount}
GHL Goods-pipeline opps: ${context.oppCount}

DRIFT DETECTED:
  MISSING_OPP:                   ${context.byType.MISSING_OPP}
  STAGE_MISMATCH:                ${context.byType.STAGE_MISMATCH}
  VOIDED_INVOICE_LIVE_OPP:       ${context.byType.VOIDED_INVOICE_LIVE_OPP}
  DRAFT_INVOICE_COMMITTED_DEAL:  ${context.byType.DRAFT_INVOICE_COMMITTED_DEAL}

---

DRIFT DETAILS:
${driftList}

---

TASK:
Review the drift list. For each item, decide:

  - AUTO-APPLY: the proposed action is mechanical and safe (create a missing opp from a PAID invoice, move a PAID-backed opp to Paid stage). These become a bash command list.

  - CEO-REVIEW: the proposed action requires judgement (VOIDED invoice might represent a real project cancellation or a rebill; DRAFT invoice on a Committed deal might be a genuine send-soon or a stale draft). These surface to the CEO cockpit for manual decision.

OUTPUT FORMAT:

## Summary
<one-line state: "X auto-apply, Y need CEO review">

## Auto-apply (executed by this agent when authorised)
\`\`\`
[list of concrete actions: CREATE_OPP / MOVE_STAGE / SET_WON — one per line]
\`\`\`

## CEO review queue
<for each: what the situation is, why it's ambiguous, recommended action, blast radius>

## Alerts
<any item with severity=high that needs Telegram escalation>

RULES:
- Be conservative. Default to CEO-REVIEW when judgement is involved.
- Auto-apply is only for PAID-invoice → Paid-stage moves, and MISSING_OPP for PAID status (unambiguous).
- Never auto-move anything to "Lost" — VOIDED invoices always need CEO review because they might mean "project cancelled" or "rebilled under different number".
- DRAFT invoices on Committed deals always need CEO review — they're the $84.7K-Production-Plant pattern.
`.trim();
}

async function main() {
  const context = await gatherContext();

  console.log(`[xero-ghl-reconciler] ${context.goodsInvoiceCount} invoices, ${context.oppCount} opps, ${context.drift.length} drift`);

  if (context.drift.length === 0) {
    console.log(`[xero-ghl-reconciler] in sync`);
    return;
  }

  const userPrompt = composePrompt(context);

  const result = await runAgent({
    name: 'xero-ghl-reconciler',
    task: 'analyze',

    budget: {
      maxTokens: 3500,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when every drift item is classified as auto-apply or ceo-review with reasoning, and auto-apply actions are rendered as a concrete command list',

    fallback:
      'if drift list is empty (gatherContext returned 0 items), return "Xero ↔ GHL in sync — no actions required" and do not fabricate work',

    scopedFiles: [
      'xero_invoices (supabase, ACCREC)',
      'ghl_opportunities (supabase, Goods pipeline)',
      'ghl_sync_log (supabase, write-only)',
    ],

    systemPrompt: `
You are the Xero ↔ GHL Reconciler agent for Goods on Country.

Your single task: every morning, detect drift between Xero (accounting truth) and GHL (pipeline truth), and propose safe reconciliation actions.

You are conservative. You auto-apply only the mechanical, unambiguous cases (PAID invoice → create or move to Paid stage). Everything else becomes a CEO-review item.

You are especially sharp on the DRAFT-invoice-on-Committed-deal pattern — that's the one that cost $84,700 of invisibility for the Production Plant. Every DRAFT-plus-committed case must be flagged for CEO with recommended action ("send" or "void").

Voice: plain, direct. No pitch-deck register. No AI tells. If you escalate, be specific about why.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/cockpit/xero-ghl-reconciler/${todayISO()}.md`,

    autonomyLevel: 2,
    knowledgeType: 'action_item',
    telegramSummary: context.byType.DRAFT_INVOICE_COMMITTED_DEAL > 0 || context.byType.MISSING_OPP > 3,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== reconciler output ===');
    console.log(result.output);
  }
}

main().catch(err => {
  console.error(`[xero-ghl-reconciler] FAILED: ${err.message}`);
  process.exit(1);
});
