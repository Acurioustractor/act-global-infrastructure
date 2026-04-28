#!/usr/bin/env node
/**
 * tag-lcaa-phases.mjs — assign Listen / Curiosity / Action / Art phase to bank
 * statement lines so we can see the LCAA-by-spend ratio.
 *
 * Resolution order:
 *   1. Skip rows with lcaa_phase already set unless --retag-defaults is set
 *      (in which case rows tagged via project-default are re-evaluated against
 *      vendor rules; manually-tagged rows still skipped)
 *   2. Vendor override (explicit phase by payee match)
 *   3. Project default (by project_code)
 *   4. Leave untagged
 *
 * Source-of-truth for the phases: wiki/concepts/lcaa-method.md
 * Strategy plan:                 thoughts/shared/plans/strategy-from-soul.md
 *
 * Usage:
 *   node scripts/tag-lcaa-phases.mjs                   # Dry run, print counts
 *   node scripts/tag-lcaa-phases.mjs --apply           # Write tags to DB
 *   node scripts/tag-lcaa-phases.mjs --untagged        # Show what would not be tagged
 *   node scripts/tag-lcaa-phases.mjs --retag-defaults  # Also re-evaluate project-default tags
 *   node scripts/tag-lcaa-phases.mjs --retag-defaults --apply  # Re-evaluate and write
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.argv.includes('--apply');
const SHOW_UNTAGGED = process.argv.includes('--untagged');
const RETAG_DEFAULTS = process.argv.includes('--retag-defaults');

const PHASE_LABELS = {
  listen: 'Listen',
  curiosity: 'Curiosity',
  action: 'Action',
  art: 'Art',
};

// Vendor overrides: payee match → phase. Most specific first.
// Vendor rules win over project defaults. All matches case-insensitive.
//
// Order matters: rules are checked top-down, first match wins. Specific Action
// rules (e.g. "qantas club" membership) MUST sit above the broader Listen
// travel rules below or they will be eaten by the generic match.
const VENDOR_OVERRIDES = [
  // Art-supply vendors → Art
  { match: /^adobe/i, phase: 'art', reason: 'design_tooling' },
  { match: /eckersley|whitehouse institute|frame shop|^gallery|atkins photo|vanbar|kayell|printful|printify|raspberry pi|core electronics|element14|pixapro|b&h photo|adorama|kadmium|illustrator sydney/i, phase: 'art', reason: 'art_supply' },

  // Cultural production vendors → Art (journals, identity, design studios, print runs)
  { match: /editandprin|^edit and print|defy design|stacks of wax/i, phase: 'art', reason: 'cultural_production' },

  // Materials and manufacturing vendors → Action (override project defaults like ACT-GD = Listen)
  { match: /carla furnishers/i, phase: 'action', reason: 'materials' },
  { match: /stratco|telford smith/i, phase: 'action', reason: 'materials' },
  { match: /loadshift|sydney tools/i, phase: 'action', reason: 'materials' },
  { match: /maleny landscaping|maleny hardware|savage landscape|steelmart|diggermate|seasons supermarket/i, phase: 'action', reason: 'materials:farm' },

  // R&D infrastructure → Curiosity (engineering of things still being proven)
  { match: /anthropic|claude\.ai/i, phase: 'curiosity', reason: 'r&d:llm' },
  { match: /openai/i, phase: 'curiosity', reason: 'r&d:llm' },
  { match: /vercel/i, phase: 'curiosity', reason: 'r&d:platform' },
  { match: /supabase/i, phase: 'curiosity', reason: 'r&d:db' },
  { match: /github|netlify|cloudflare/i, phase: 'curiosity', reason: 'r&d:infra' },
  { match: /firecrawl|railway/i, phase: 'curiosity', reason: 'r&d:infra' },
  { match: /webflow|squarespace/i, phase: 'curiosity', reason: 'r&d:platform' },
  { match: /gohighlevel|highlevel/i, phase: 'curiosity', reason: 'r&d:crm' },
  { match: /dialpad/i, phase: 'curiosity', reason: 'r&d:comms' },
  { match: /notion/i, phase: 'curiosity', reason: 'r&d:knowledge' },
  { match: /^linkedin|^mighty networks|founderpass|codeguide/i, phase: 'curiosity', reason: 'r&d:platform' },

  // Compliance, banking, insurance, accounting → Action (operations)
  { match: /^ato$|australian tax/i, phase: 'action', reason: 'ops:compliance' },
  { match: /nab international fee|nab intnl|nab foreign/i, phase: 'action', reason: 'ops:banking' },
  { match: /^bank fees|account fee|service fee/i, phase: 'action', reason: 'ops:banking' },
  { match: /nrma|aig australia|aami|insurance/i, phase: 'action', reason: 'ops:insurance' },
  { match: /thriday|standard ledger|^xero\b/i, phase: 'action', reason: 'ops:accounting' },
  { match: /^agl\b|^telstra|^apple\b/i, phase: 'action', reason: 'ops:utility' },

  // Office / travel-admin → Action (must precede the Listen travel rules below
  // because "qantas" appears in "qantas club" and would otherwise match Listen)
  { match: /officeworks|kogan/i, phase: 'action', reason: 'ops:office' },
  { match: /flyparks|qantas club/i, phase: 'action', reason: 'ops:travel-admin' },

  // Travel and fieldwork → Listen (sitting in rooms with people in places).
  // For ACT, almost all travel is fieldwork — Mounty Yarns, BG Fit, Doomadgee,
  // PICC, Oonchiumpa, Bundanon residency, Europe research trips. Operations
  // travel-admin (qantas club, flyparks) is caught above and wins.
  { match: /qantas|virgin australia|jetstar|regional express|rex airlines|^air new zealand|^airnz\b|^air asia/i, phase: 'listen', reason: 'travel:flight' },
  { match: /\bhertz\b|\bavis\b|^budget car|sixt|\bthrifty\b|europcar|green motion/i, phase: 'listen', reason: 'travel:rental' },
  { match: /^uber\b|cabfare|13cabs|\btaxi\b/i, phase: 'listen', reason: 'travel:rideshare' },
  // Fuel: ACT-IN trip fuel only. Farm-vehicle fuel (Liberty in Maleny) stays
  // under ACT-FM project default (action). No bare "liberty" pattern below.
  { match: /\bbp\s|^bp\s|\bampol\b|reddy express|7-eleven|^caltex|united petroleum|pearl energy|^mol \d/i, phase: 'listen', reason: 'travel:fuel' },
  { match: /\bhotel\b|\bmotel\b|\blodge\b|\bresort\b|\binn\b|airbnb|stayz|hideaway|booking\.com|guesthouse|holiday park|tourist park|kanzlera|adge hotel|grand hotel|tullah lakeside|reef resort/i, phase: 'listen', reason: 'travel:accom' },
  { match: /holafly/i, phase: 'listen', reason: 'travel:sim' },
  { match: /bundanon/i, phase: 'listen', reason: 'travel:residency' },
];

// Project defaults: project_code → phase. Used when no vendor override matches.
// Choices below are first-cut. Edit the table and re-run.
const PROJECT_DEFAULTS = {
  // Listen-flavoured: deep community fieldwork
  'ACT-MY': 'listen',  // Mounty Yarns
  'ACT-PI': 'listen',  // PICC

  // Curiosity-flavoured: platform R&D
  'ACT-EL': 'curiosity', // Empathy Ledger
  'ACT-JH': 'curiosity', // JusticeHub

  // Action-flavoured: operations, delivery, manufacturing
  'ACT-IN': 'action',   // Internal / general ops
  'ACT-FM': 'action',   // Farm operations
  'ACT-HV': 'action',   // Harvest operations
  'ACT-GD': 'listen',   // Goods on Country: most spend is fieldwork (travel/meals/Country time);
                        // materials vendors (Carla Furnishers, Stratco, etc.) override → Action via VENDOR_OVERRIDES above
  'ACT-CORE': 'action', // Core studio
  'ACT-CE': 'action',   // Custodian Economy partner work
  'ACT-CC': 'action',   // Community Capital

  // Art-flavoured: cultural production
  // 'ACT-AT': 'art',
};

function classify(row) {
  const payee = row.payee ?? '';
  const particulars = row.particulars ?? '';
  const haystack = `${payee} ${particulars}`;

  for (const rule of VENDOR_OVERRIDES) {
    if (rule.match.test(haystack)) {
      return { phase: rule.phase, source: `rule:vendor:${rule.reason}` };
    }
  }
  if (row.project_code && PROJECT_DEFAULTS[row.project_code]) {
    return {
      phase: PROJECT_DEFAULTS[row.project_code],
      source: `rule:project:${row.project_code}`,
    };
  }
  return { phase: null, source: null };
}

// Fetch debit rows that need (re-)classification.
//   - default: untagged rows only (lcaa_phase IS NULL)
//   - --retag-defaults: untagged rows PLUS rows tagged via project default
//     (so vendor-rule changes pick up rows previously caught by the fallback)
//
// Page size kept small (200) and retry-with-backoff on transient PostgREST
// timeouts. Earlier 500-row pages hit a connection terminated timeout when the
// untagged set was first populated; smaller pages survive that.
async function fetchDebitsToClassify() {
  const PAGE = 200;
  const MAX_RETRIES = 3;
  const all = [];
  let lastId = null;

  while (true) {
    let attempt = 0;
    let data;
    while (true) {
      let q = sb
        .from('bank_statement_lines')
        .select('id, date, payee, particulars, amount, project_code, direction, lcaa_phase, lcaa_phase_source')
        .eq('direction', 'debit')
        .order('id', { ascending: true })
        .limit(PAGE);
      if (RETAG_DEFAULTS) {
        // OR: lcaa_phase IS NULL OR lcaa_phase_source LIKE 'rule:project:%'
        q = q.or('lcaa_phase.is.null,lcaa_phase_source.like.rule:project:%');
      } else {
        q = q.is('lcaa_phase', null);
      }
      if (lastId) q = q.gt('id', lastId);

      const res = await q;
      if (!res.error) {
        data = res.data;
        break;
      }
      attempt++;
      if (attempt >= MAX_RETRIES) throw res.error;
      const delay = 500 * 2 ** (attempt - 1);
      console.warn(`[tag-lcaa-phases] fetch error (${res.error.message}); retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }

    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    lastId = data[data.length - 1].id;
  }
  return all;
}

async function main() {
  console.log(`[tag-lcaa-phases] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${RETAG_DEFAULTS ? ' (+retag-defaults)' : ''}`);
  const rows = await fetchDebitsToClassify();
  console.log(`[tag-lcaa-phases] fetched ${rows.length} candidate debit rows`);

  const counts = { listen: 0, curiosity: 0, action: 0, art: 0, untagged: 0 };
  const sums = { listen: 0, curiosity: 0, action: 0, art: 0, untagged: 0 };
  const reclassified = { listen: 0, curiosity: 0, action: 0, art: 0 };
  const updates = [];
  const untaggedSamples = [];

  for (const row of rows) {
    const { phase, source } = classify(row);
    const wasTagged = row.lcaa_phase != null;
    const phaseChanged = phase && phase !== row.lcaa_phase;

    if (phase) {
      // For retag-defaults runs, only emit an update if the phase actually
      // changes (or if it was untagged). Otherwise we'd needlessly rewrite
      // the same value with potentially the same source.
      if (!wasTagged || phaseChanged) {
        counts[phase]++;
        sums[phase] += Number(row.amount ?? 0);
        if (wasTagged) reclassified[phase]++;
        updates.push({ id: row.id, lcaa_phase: phase, lcaa_phase_source: source });
      }
    } else if (!wasTagged) {
      counts.untagged++;
      sums.untagged += Number(row.amount ?? 0);
      if (untaggedSamples.length < 20) {
        untaggedSamples.push({
          date: row.date,
          payee: row.payee,
          amount: row.amount,
          project_code: row.project_code,
        });
      }
    }
  }

  console.log('');
  console.log('Counts (new tags or phase changes — rows / $ total):');
  for (const phase of ['listen', 'curiosity', 'action', 'art', 'untagged']) {
    const label = phase === 'untagged' ? 'Untagged' : PHASE_LABELS[phase];
    const reclass = reclassified[phase] ? ` (${reclassified[phase]} re-classified)` : '';
    console.log(
      `  ${label.padEnd(10)} ${String(counts[phase]).padStart(4)} rows  $${Math.round(sums[phase]).toLocaleString('en-AU')}${reclass}`,
    );
  }

  if (SHOW_UNTAGGED && untaggedSamples.length > 0) {
    console.log('');
    console.log('Sample untagged rows (first 20):');
    for (const s of untaggedSamples) {
      console.log(`  ${s.date}  ${(s.payee ?? '').slice(0, 40).padEnd(40)}  ${s.project_code ?? '(no project)'}  $${s.amount}`);
    }
  }

  if (!APPLY) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to write tags.');
    return;
  }

  // Apply updates in batches
  const BATCH = 100;
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    // Supabase JS does not support batched conditional updates in one call,
    // so we emit individual updates. For 1500 rows this finishes in seconds.
    await Promise.all(
      batch.map((u) =>
        sb
          .from('bank_statement_lines')
          .update({ lcaa_phase: u.lcaa_phase, lcaa_phase_source: u.lcaa_phase_source })
          .eq('id', u.id),
      ),
    );
    written += batch.length;
    process.stdout.write(`\r[tag-lcaa-phases] wrote ${written}/${updates.length}`);
  }
  process.stdout.write('\n');
  console.log(`[tag-lcaa-phases] done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
