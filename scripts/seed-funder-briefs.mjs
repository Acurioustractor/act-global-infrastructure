#!/usr/bin/env node
/**
 * Seeds funder_briefs with 2 known cases:
 *   - Snow Foundation × ACT-GD  (from SNOW_SUBMISSION_REVIEW_FEBRUARY_2026.md)
 *   - QBE × ACT-GD              (from Catalysing_Impact_Application_DRAFT.md + Notion HQ)
 *
 * Pattern from the QBE Catalysing Impact HQ Notion template — generalised so
 * every (funder × project) intersection can have one of these.
 *
 * Plan: ghl-pipelines-supporter-integration-2026-05-23 / funder briefs overlay
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const briefs = [
  // ─────────────────────────────────────────────
  // SNOW FOUNDATION × ACT-GD (Goods)
  // ─────────────────────────────────────────────
  {
    funder_slug: 'snow-foundation',
    project_code: 'ACT-GD',
    brief_title: 'Snow Foundation × Goods — Feb 2026 review',
    status: 'active',

    asks_from_them: [
      { ask: 'Remove Deadly Heart Trek reference; relocate "Do No Harm" principle elsewhere', source: 'sally-feedback-2026-02', done: false },
      { ask: 'Expand Risks & Mitigations section significantly (cover waste, demand for plant, payment first, key learnings)', source: 'sally-feedback-2026-02', done: false },
      { ask: 'Split into main doc + attachments format for ease of sharing with board', source: 'sally-feedback-2026-02', done: false },
      { ask: 'Add Alice Springs location strategy (Oonchiumpa warehouse partnership)', source: 'sally-feedback-2026-02', done: false },
      { ask: 'Create funding pipeline table showing Sally\'s suggested funders (Minderoo/SEDI/SELF/ACF/Future Fund-ABC/First Nations Business Acceleration/NTRAI/Giant Leap)', source: 'sally-feedback-2026-02', done: false },
      { ask: 'Verify bed numbers consistency (369 vs 389 vs 140)', source: 'codebase-review-2026-02', done: false },
      { ask: 'Add explicit dynamic consent commitment', source: 'sally-feedback-2026-02', done: false },
    ],

    ask_amount_aud: 120000,
    ask_outcome: 'Production facility scale-up · bed deployment to 350+ homes · Alice Springs hub partnership',
    ask_status: 'in-review',
    ask_submitted_at: '2026-02-15',

    alignment_status: 'WARN',
    alignment_notes: 'Bed count discrepancy needs resolution (369+ deployed vs 389 assets tracked vs 140+ field deployments) — confirm "deployed" vs "constructed" vs "tracked" definitions before next submission.',

    procurement_delivered_count: 369,
    procurement_unit: 'beds',
    procurement_demand_count: 350,
    procurement_notes: '15-20 stretch beds with ~8 families · 20+ washing machines deployed · 9,225kg+ plastic diverted · $193,785 from Snow to date · $100k invested in production facility',

    strategy_their_priorities: ['First Nations principles', 'Do no harm', 'Dynamic consent', 'Evidence-based culturally safe programs'],
    strategy_our_claims: ['40% profit share to artisan communities', '25kg plastic per bed', 'Oonchiumpa partnership', 'V4 design from 140+ deployments', 'Orange Sky model (ACT builds, local orgs staff)'],

    next_move: 'Update submission with revised risk table + drop Deadly Heart Trek + add Alice Springs strategy + verify bed numbers',
    next_move_owner: 'nic',
    next_move_due: '2026-03-15',

    notion_hq_url: null,
    related_files: [
      '/Users/benknight/Code/Goods Asset Register/SNOW_SUBMISSION_REVIEW_FEBRUARY_2026.md',
      '/Users/benknight/Code/Goods Asset Register/Catalysing_Impact_Application_DRAFT.md',
    ],

    last_feedback_date: '2026-02-10',
    last_feedback_summary: 'Sally flagged: remove Deadly Heart Trek ref, expand risks, split into attachments, add Alice Springs partnership, investigate Minderoo/SEDI/etc, dynamic consent commitment.',
  },

  // ─────────────────────────────────────────────
  // QBE Catalysing Impact × ACT-GD (Goods)
  // ─────────────────────────────────────────────
  {
    funder_slug: 'qbe-catalysing-impact',
    project_code: 'ACT-GD',
    brief_title: 'QBE Catalysing Impact 2026 — Cohort intake',
    status: 'active',

    asks_from_them: [
      { ask: 'Submit Catalysing Impact application (eligibility confirmed)', source: 'qbe-hq-2026', done: true },
      { ask: 'Cohort program — capacity-building + investor-ready prep', source: 'qbe-hq-2026', done: false },
      { ask: 'Demonstrate climate resilience AND social inclusion alignment', source: 'qbe-application-form', done: true },
      { ask: 'Show readiness for 2026 investment / repayable finance', source: 'qbe-application-form', done: false },
    ],

    ask_amount_aud: null,
    ask_outcome: 'Cohort acceptance · capacity-building program · access to repayable finance pathway',
    ask_status: 'submitted',
    ask_submitted_at: '2026-02-28',

    alignment_status: 'PASS',
    alignment_notes: 'Application aligned with Catalysing Impact eligibility — Australian-incorporated (A Curious Tractor Pty Ltd, Oct 2022), climate resilience (25kg plastic/bed diverted) + social inclusion (40% profit share, remote community health), actively seeking 2026 investment.',

    procurement_delivered_count: 369,
    procurement_unit: 'beds',
    procurement_demand_count: 350,
    procurement_notes: '8 communities (Palm Island, Tennant Creek, Kalgoorlie, Maningrida + others) · 20+ washing machines field testing · 1,000+ lives directly impacted · 500+ minutes community consultation · Groote Eylandt alone requested 500 mattresses + 300 washing machines',

    strategy_their_priorities: ['Climate resilience', 'Social inclusion', '2026 investment-ready', 'Circular economy'],
    strategy_our_claims: ['Plastic waste → beds (climate)', 'Remote community health (inclusion)', '40% profit share (community ownership)', 'Waste-to-wealth model', 'On-country containerised manufacturing'],

    next_move: 'Await cohort intake outcome; prepare investor-ready financials + community ownership governance template',
    next_move_owner: 'nic',
    next_move_due: '2026-04-30',

    notion_hq_url: 'https://www.notion.so/acurioustractor/QBE-Catalysing-Impact-HQ-33febcf981cf804198f1ee881fa515b2',
    related_files: [
      '/Users/benknight/Code/Goods Asset Register/Catalysing_Impact_Application_DRAFT.md',
      '/Users/benknight/Code/Goods Asset Register/MARKET_INTELLIGENCE_2026.md',
      '/Users/benknight/Code/Goods Asset Register/GO_TO_MARKET_THOUSANDS_2026.md',
    ],

    last_feedback_date: '2026-02-28',
    last_feedback_summary: 'Application drafted with full alignment to Catalysing Impact criteria. Eligibility confirmed. Awaiting cohort intake decision.',
  },
];

async function main() {
  console.log(`🌱 Seeding ${briefs.length} funder briefs...\n`);

  for (const b of briefs) {
    const { error } = await supabase
      .from('funder_briefs')
      .upsert(b, { onConflict: 'funder_slug,project_code' });
    if (error) {
      console.error(`  ✗ ${b.funder_slug} × ${b.project_code}: ${error.message}`);
    } else {
      console.log(`  ✓ ${b.funder_slug} × ${b.project_code} — ${b.brief_title}`);
    }
  }

  // Sanity
  const { data, error } = await supabase.from('funder_briefs').select('funder_slug, project_code, alignment_status, next_move_due');
  if (error) throw error;
  console.log(`\n✓ ${data.length} briefs in funder_briefs:`);
  for (const r of data) console.log(`  ${r.funder_slug.padEnd(28)} × ${r.project_code.padEnd(8)} ${r.alignment_status}  next-due:${r.next_move_due}`);
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); });
