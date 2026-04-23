#!/usr/bin/env node
/**
 * Invoice Drift Detector
 *
 * Cross-references wiki financial claims against live Xero state per project.
 * Prevents the Tennant Creek 36K-ghost pattern: wiki carries a dollar figure that
 * has since been paid/voided/adjusted, and nobody catches it.
 *
 * Schedule: Monday 08:30 AEST (after the weekly reconciliation cron)
 *
 * What it does:
 *   1. Parse every dollar figure in wiki/projects/goods.md (and later, all wiki/projects/*.md)
 *   2. Query Xero actuals via Supabase (xero_invoices + bank_statement_lines) for ACT-GD
 *   3. For each wiki figure, find the closest corresponding Xero row
 *   4. If drift >5% or status changed (e.g., invoice now PAID or VOIDED), flag
 *   5. Propose a wiki edit with provenance sidecar
 *   6. Write PR draft to thoughts/shared/drafts/wiki-drift/<date>.md
 *
 * Cost: Sonnet tier. Typical run ≤ $0.05.
 *
 * Autonomy: L2 — agent proposes wiki PR; Ben merges.
 *
 * STUB: first production deployment May Week 2. This file shows the structure
 * and exercises the runtime. TODO marks where the concrete logic lands.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runAgent, todayISO } from '../lib/goods-agent-runtime.mjs';
import '../../lib/load-env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WIKI_PATH = 'wiki/projects/goods.md';

async function gatherContext() {
  const wikiText = await fs.readFile(WIKI_PATH, 'utf8');

  // TODO (May Week 2): parse every $ figure with line number, context snippet
  // For stub, we just expose the raw text.
  const { data: xeroInvoices } = await supabase
    .from('xero_invoices')
    .select('xero_id, type, invoice_number, contact_name, date, due_date, total, amount_paid, amount_due, status')
    .eq('type', 'ACCREC')
    .or('tracking_category_1.eq.ACT-GD,tracking_category_2.eq.ACT-GD')
    .order('date', { ascending: false })
    .limit(100);

  const { data: bslSummary } = await supabase
    .from('bank_statement_lines')
    .select('project_code, receipt_match_status, amount')
    .eq('project_code', 'ACT-GD')
    .limit(500);

  return {
    wikiText,
    xeroInvoices: xeroInvoices ?? [],
    bslSummary: bslSummary ?? [],
  };
}

function composePrompt({ wikiText, xeroInvoices, bslSummary }) {
  const xeroSummary = xeroInvoices.slice(0, 30).map(i =>
    `${i.invoice_number} ${i.contact_name} ${i.date} $${i.total} (paid $${i.amount_paid}, due $${i.amount_due}) ${i.status}`
  ).join('\n');

  const bslCount = bslSummary.length;
  const bslTotal = bslSummary.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return `
LIVE XERO STATE (ACT-GD, last 30 ACCREC invoices):
${xeroSummary}

BANK STATEMENT LINES ACT-GD SUMMARY:
- ${bslCount} lines
- total $${bslTotal.toFixed(2)}

---

WIKI PROJECT FILE (wiki/projects/goods.md):
${wikiText}

---

TASK:
1. Extract every dollar figure claimed in the wiki (e.g., "$445,685 philanthropic funding", "$36K outstanding", "$537,595 total revenue").
2. For each figure, identify the closest matching real-world source (invoice, bank line, pipeline opp).
3. Compare wiki claim to live Xero state. Flag any figure where:
   - Status changed (e.g., wiki says "outstanding" but Xero shows PAID)
   - Amount drift > 5%
   - Date claim no longer accurate

Return a structured report with:
- FIGURES_VERIFIED_OK: list of figures that match live state
- FIGURES_DRIFTED: list with wiki_claim, live_state, proposed_wiki_edit (exact before/after text)
- FIGURES_UNVERIFIABLE: list of figures where no clear source exists in Xero (may need other source)
- RECOMMENDED_PR_SUMMARY: 2-sentence commit message if drift exists, else "no drift — wiki financial claims match Xero"

Do not fabricate figures. If a claim has no source, say so — do not invent a match.
`.trim();
}

async function main() {
  const context = await gatherContext();
  const userPrompt = composePrompt(context);

  const result = await runAgent({
    name: 'invoice-drift-detector',
    task: 'analyze',

    budget: {
      maxTokens: 4000,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when every wiki dollar figure has been classified into VERIFIED_OK, DRIFTED, or UNVERIFIABLE, and the RECOMMENDED_PR_SUMMARY has been written',

    fallback:
      'if the wiki file cannot be parsed or Xero data is empty, return "wiki=empty" or "xero=empty" in the PR summary and do not fabricate any comparison',

    scopedFiles: [
      WIKI_PATH,
      'xero_invoices (via supabase)',
      'bank_statement_lines (via supabase)',
    ],

    systemPrompt: `
You are the Invoice Drift Detector agent for Goods on Country.

Your single task: catch stale financial claims in the wiki before they become embarrassing. The Tennant Creek $36K claim sat in the wiki for 8 months after the invoice was paid; your job is to ensure that never happens again.

You compare wiki dollar figures against live Xero state via Supabase. You do not guess. If a claim has no verifiable source, you say so plainly. If the wiki says one thing and Xero says another, you propose the exact wiki edit — before/after text — to fix it.

You produce a PR summary that a human reviews and merges. You are NOT authorised to edit the wiki directly; your output is a draft proposal only.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/drafts/wiki-drift/${todayISO()}-goods.md`,

    autonomyLevel: 2,
    knowledgeType: 'decision',
    telegramSummary: true,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== drift report ===');
    console.log(result.output);
  }

  const hasDrift = /FIGURES_DRIFTED:\s*\n(?!\s*(none|\(none\)|\s*\n))/i.test(result.output);
  console.log(`[invoice-drift-detector] drift=${hasDrift ? 'YES' : 'no'} wrote ${result.outputPath ?? '[dry-run]'}`);
}

main().catch(err => {
  console.error(`[invoice-drift-detector] FAILED: ${err.message}`);
  process.exit(1);
});
