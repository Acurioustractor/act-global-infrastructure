#!/usr/bin/env node
/**
 * A1 — Procurement Analyst
 *
 * Weekly Monday 08:00 AEST (after reconciliation cron).
 *
 * Given: new contract alerts, new demand signals, current anchor relationship
 * state, last 30 days of GHL Goods pipeline activity.
 *
 * Task: rank this week's top 3 buyer touches. Draft the opening line for each.
 *
 * Cost: Sonnet tier. Typical run ≤ $0.04.
 * Autonomy: L2 — agent proposes; Ben sends or reassigns.
 *
 * STUB: first production deployment May Week 1 per 6-month plan. Data-fetch
 * layer here is real; prompt composition exercises runtime; production use
 * awaits PM2 registration.
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

const ANCHOR_BUYERS = [
  'centrecorp',
  'picc',
  'palm island',
  'oonchiumpa',
  'miwatj',
  'anyinginyi',
  'alpa',
  'arnhem land progress',
  'outback stores',
  'julalikari',
  'tangentyere',
  'west arnhem',
];

async function gatherContext() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [goodsOpps, anchorContacts, recentInvoices] = await Promise.all([
    supabase
      .from('ghl_opportunities')
      .select('id, name, status, monetary_value, last_status_change_at, pipeline_name, stage_name, contact_name, updated_at')
      .ilike('pipeline_name', '%goods%')
      .gte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(50),

    supabase
      .from('ghl_contacts')
      .select('id, name, email, phone, tags, custom_fields, updated_at')
      .or(ANCHOR_BUYERS.map(b => `name.ilike.%${b}%`).join(','))
      .order('updated_at', { ascending: false })
      .limit(30),

    supabase
      .from('xero_invoices')
      .select('invoice_number, contact_name, date, total, status, amount_due')
      .eq('type', 'ACCREC')
      .or(ANCHOR_BUYERS.map(b => `contact_name.ilike.%${b}%`).join(','))
      .gte('date', thirtyDaysAgo.slice(0, 10))
      .order('date', { ascending: false })
      .limit(20),
  ]);

  return {
    goodsOpps: goodsOpps.data ?? [],
    anchorContacts: anchorContacts.data ?? [],
    recentInvoices: recentInvoices.data ?? [],
    windowStart: thirtyDaysAgo.slice(0, 10),
  };
}

function composePrompt({ goodsOpps, anchorContacts, recentInvoices, windowStart }) {
  const oppsSummary = goodsOpps.slice(0, 20).map(o =>
    `- ${o.name} | ${o.stage_name} | $${o.monetary_value ?? '—'} | contact: ${o.contact_name} | updated: ${o.updated_at?.slice(0, 10)}`
  ).join('\n');

  const contactsSummary = anchorContacts.slice(0, 15).map(c =>
    `- ${c.name} | email: ${c.email ?? '—'} | last_updated: ${c.updated_at?.slice(0, 10)}`
  ).join('\n');

  const invoicesSummary = recentInvoices.slice(0, 10).map(i =>
    `- ${i.invoice_number} ${i.contact_name} ${i.date} $${i.total} due:$${i.amount_due} status:${i.status}`
  ).join('\n');

  return `
CONTEXT — last 30 days (since ${windowStart}):

GHL PIPELINE (Goods opportunities with activity):
${oppsSummary || '(none)'}

ANCHOR CONTACTS (recent activity):
${contactsSummary || '(none)'}

RECENT INVOICES (ACCREC, anchor buyers):
${invoicesSummary || '(none)'}

---

TASK:
Rank this week's top 3 buyer touches for Ben. Each touch is one named action for a specific buyer this week.

Criteria:
1. Active opportunity with high monetary value + recent stage movement = hot
2. Paid invoice in last 30 days = bill-them-next-week / order-expansion conversation
3. Named contact whose last_updated is >21 days ago = silence-breaker
4. Anchor buyer with NO opportunities in pipeline = pipeline-origination conversation

OUTPUT:
## This week's three (${todayISO()})

### 1. <Buyer name> — <Action type>
**Why this week:** <1–2 sentences grounded in the data above>
**Opening line:** "<a single sentence Ben can paste into an email>"
**Expected outcome:** <one concrete predicate, e.g., "commitment to a call this week" or "signed PO for 50 beds">

### 2. <same>

### 3. <same>

## Passed over
- <buyer> — <why this buyer was considered but ranked lower>
- <buyer> — <same>

RULES:
- No AI tells. No "leveraging," "fostering," "transformative." Plain direct English.
- Do not fabricate contract values, story quotes, or named-person promises. Use only what the context shows.
- If fewer than 3 buyers warrant action this week, return only the number warranted — do not pad.
`.trim();
}

async function main() {
  const context = await gatherContext();
  const userPrompt = composePrompt(context);

  const result = await runAgent({
    name: 'procurement-analyst',
    task: 'generate',

    budget: {
      maxTokens: 2500,
      maxToolCalls: 0,
    },

    stopCriteria:
      'stop when the three ranked buyer touches are written with why/opening-line/outcome each, or when a smaller number is produced with a stated reason for stopping short',

    fallback:
      'if the context data is empty (no GHL opps, no contacts, no invoices in the 30-day window), return a single-line output "no signals this week — check GHL sync cron" and do not fabricate activity',

    scopedFiles: [
      'ghl_opportunities (supabase, pipeline ilike %goods%)',
      'ghl_contacts (supabase, filtered to anchor buyers)',
      'xero_invoices (supabase, ACCREC to anchor buyers last 30 days)',
    ],

    systemPrompt: `
You are the Procurement Analyst agent for Goods on Country.

Your single task: every Monday morning, look at the last 30 days of buyer signals across GHL pipeline, anchor contacts, and ACCREC invoices, and rank the top three buyer touches for this week.

You are opinionated. You pick three. You say why. You draft the opening line.

You are NOT a summariser. You do not list 12 possibilities. You pick three and stand behind them.

Voice: plain, direct. No pitch-deck register. No AI tells. Short sentences. The opening line you draft must be something Ben can paste into an email without editing — one sentence, concrete, ends with a specific ask or observation.
`.trim(),

    userPrompt,

    outputPath: `thoughts/shared/cockpit/procurement-analyst/${todayISO()}.md`,

    autonomyLevel: 2,
    knowledgeType: 'action_item',
    telegramSummary: true,

    dryRun: DRY_RUN,
  });

  if (VERBOSE) {
    console.log('\n=== procurement analyst output ===');
    console.log(result.output);
  }
}

main().catch(err => {
  console.error(`[procurement-analyst] FAILED: ${err.message}`);
  process.exit(1);
});
