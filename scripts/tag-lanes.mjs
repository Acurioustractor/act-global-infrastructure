#!/usr/bin/env node
/**
 * tag-lanes.mjs: assign To Us / To Down / To Grow / To Others lane to bank
 * statement lines so we can read ACT's internal economy as money flows.
 *
 * Resolution order (debits only, credits are revenue and stay NULL):
 *   1. Skip rows with lane already set unless --retag-defaults is set
 *      (in which case rows tagged via the to_grow default are re-evaluated
 *      against vendor rules; manually-tagged rows still skipped)
 *   2. Vendor override (regex on payee + particulars)
 *   3. Default: to_grow (debits that don't match any other rule are growth spend)
 *
 * Source-of-truth for the lanes: wiki/concepts/four-lanes.md
 * Strategy plan:                 thoughts/shared/plans/strategy-from-soul.md
 *
 * Usage:
 *   node scripts/tag-lanes.mjs                   # Dry run, print counts
 *   node scripts/tag-lanes.mjs --apply           # Write tags to DB
 *   node scripts/tag-lanes.mjs --untagged        # Show what would not be tagged
 *   node scripts/tag-lanes.mjs --retag-defaults  # Also re-evaluate to_grow defaults
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

const LANE_LABELS = {
  to_us: 'To Us',
  to_down: 'To Down',
  to_grow: 'To Grow',
  to_others: 'To Others',
};

// Vendor overrides: regex match → lane. Most specific first.
// All matches case-insensitive against `payee` + ` ` + `particulars`.
//
// To Us catcher is forward-looking: 0 matches today. Will fire when founder
// distributions, director fees, or trust transfers land. Soul-check signal.
const VENDOR_OVERRIDES = [
  // To Us: founder pay, trust distributions, director fees, drawing accounts.
  // Fires when ACT Pty Ltd starts paying founders through the entity.
  { match: /knight family trust|marchesi family trust|director fee|director's fee|director distribution|founder distribution|^drawing account|trust distribution to (knight|marchesi)/i, lane: 'to_us', reason: 'founder_pay' },

  // To Down: paying old debts, ATO, bank fees on legacy accounts.
  { match: /^ato$|australian tax|australian taxation/i, lane: 'to_down', reason: 'ato' },
  { match: /nab international fee|nab intnl|nab foreign/i, lane: 'to_down', reason: 'banking:foreign' },
  { match: /^bank fees|account fee|service fee/i, lane: 'to_down', reason: 'banking:fee' },

  // To Others: anchor partner fellowships, community payments routed out.
  // Currently no automated rule. Add explicit vendor matches as fellowships
  // start landing in the books.
];

function classifyLane(row) {
  // Credits stay NULL: revenue is not in any lane (it feeds the lanes).
  if (row.direction !== 'debit') {
    return { lane: null, source: null };
  }
  const haystack = `${row.payee ?? ''} ${row.particulars ?? ''}`;
  for (const rule of VENDOR_OVERRIDES) {
    if (rule.match.test(haystack)) {
      return { lane: rule.lane, source: `rule:vendor:${rule.reason}` };
    }
  }
  // Default: every other debit is growth spend until proven otherwise.
  return { lane: 'to_grow', source: 'rule:default:to_grow' };
}

// Fetch debit rows that need (re-)classification.
// Page size kept small (200) and retry-with-backoff on transient PostgREST
// timeouts, matching the pattern in tag-lcaa-phases.mjs.
async function fetchRowsToClassify() {
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
        .select('id, date, payee, particulars, amount, direction, lane, lane_source')
        .eq('direction', 'debit')
        .order('id', { ascending: true })
        .limit(PAGE);
      if (RETAG_DEFAULTS) {
        // Match both new (rule:default:to_grow) and legacy (rule:default_debit)
        // source strings so an earlier DB-side backfill gets normalised on
        // first --retag-defaults --apply run.
        q = q.or('lane.is.null,lane_source.eq.rule:default:to_grow,lane_source.eq.rule:default_debit');
      } else {
        q = q.is('lane', null);
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
      console.warn(`[tag-lanes] fetch error (${res.error.message}); retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
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
  console.log(`[tag-lanes] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${RETAG_DEFAULTS ? ' (+retag-defaults)' : ''}`);
  const rows = await fetchRowsToClassify();
  console.log(`[tag-lanes] fetched ${rows.length} candidate debit rows`);

  const counts = { to_us: 0, to_down: 0, to_grow: 0, to_others: 0 };
  const sums = { to_us: 0, to_down: 0, to_grow: 0, to_others: 0 };
  const reclassified = { to_us: 0, to_down: 0, to_grow: 0, to_others: 0 };
  const updates = [];
  const untaggedSamples = [];

  for (const row of rows) {
    const { lane, source } = classifyLane(row);
    const wasTagged = row.lane != null;
    const laneChanged = lane && lane !== row.lane;

    if (lane) {
      if (!wasTagged || laneChanged) {
        counts[lane]++;
        sums[lane] += Number(row.amount ?? 0);
        if (wasTagged) reclassified[lane]++;
        updates.push({ id: row.id, lane, lane_source: source });
      }
    } else if (!wasTagged && SHOW_UNTAGGED && untaggedSamples.length < 20) {
      untaggedSamples.push({
        date: row.date,
        payee: row.payee,
        amount: row.amount,
      });
    }
  }

  console.log('');
  console.log('Counts (new tags or lane changes: rows / $ total):');
  for (const lane of ['to_us', 'to_down', 'to_grow', 'to_others']) {
    const reclass = reclassified[lane] ? ` (${reclassified[lane]} re-classified)` : '';
    console.log(
      `  ${LANE_LABELS[lane].padEnd(10)} ${String(counts[lane]).padStart(4)} rows  $${Math.round(sums[lane]).toLocaleString('en-AU')}${reclass}`,
    );
  }

  if (SHOW_UNTAGGED && untaggedSamples.length > 0) {
    console.log('');
    console.log('Sample untagged rows (first 20):');
    for (const s of untaggedSamples) {
      console.log(`  ${s.date}  ${(s.payee ?? '').slice(0, 40).padEnd(40)}  $${s.amount}`);
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
    await Promise.all(
      batch.map((u) =>
        sb
          .from('bank_statement_lines')
          .update({ lane: u.lane, lane_source: u.lane_source })
          .eq('id', u.id),
      ),
    );
    written += batch.length;
    process.stdout.write(`\r[tag-lanes] wrote ${written}/${updates.length}`);
  }
  process.stdout.write('\n');
  console.log(`[tag-lanes] done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
