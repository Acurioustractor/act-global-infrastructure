#!/usr/bin/env node
/**
 * four-lanes-snapshot.mjs — generate the current four-lane money-story card.
 *
 * Reads bank_statement_lines and writes a markdown snapshot to
 * wiki/cockpit/four-lanes-today.md so Ben can see the four lanes alongside
 * the rest of the daily cockpit (and reference / iframe from Notion).
 *
 * Source-of-truth: wiki/concepts/four-lanes.md
 * Strategy plan:   thoughts/shared/plans/strategy-from-soul.md (item 8)
 *
 * Usage:
 *   node scripts/four-lanes-snapshot.mjs              # write to wiki/cockpit/
 *   node scripts/four-lanes-snapshot.mjs --stdout      # print only, do not write
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const STDOUT_ONLY = process.argv.includes('--stdout');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'wiki', 'cockpit', 'four-lanes-today.md');

const LANES = ['to_us', 'to_down', 'to_grow', 'to_others'];
const LANE_LABELS = {
  to_us: 'To Us',
  to_down: 'To Down',
  to_grow: 'To Grow',
  to_others: 'To Others',
};
const PHASES = ['listen', 'curiosity', 'action', 'art'];
const PHASE_LABELS = {
  listen: 'Listen',
  curiosity: 'Curiosity',
  action: 'Action',
  art: 'Art',
};

function fmtMoney(n) {
  if (n === null || n === undefined) return '$0';
  return '$' + Math.round(Number(n)).toLocaleString('en-AU');
}

function pct(part, whole) {
  if (!whole) return '0%';
  return Math.round((part / whole) * 100) + '%';
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function australianFyQuarter(date) {
  const d = new Date(date);
  const m = d.getUTCMonth() + 1; // 1-12
  const y = d.getUTCFullYear();
  // Australian FY: Jul-Jun. Q1 = Jul-Sep, Q2 = Oct-Dec, Q3 = Jan-Mar, Q4 = Apr-Jun.
  const fy = m >= 7 ? y + 1 : y;
  const q =
    m >= 7 && m <= 9 ? 1 :
    m >= 10 && m <= 12 ? 2 :
    m >= 1 && m <= 3 ? 3 :
    4;
  const fyShort = String(fy).slice(2);
  return `Q${q} FY${fyShort}`;
}

async function laneTotalsForRange(fromIso, toIso) {
  const { data, error } = await sb
    .from('bank_statement_lines')
    .select('lane, amount, direction')
    .gte('date', fromIso)
    .lte('date', toIso)
    .eq('direction', 'debit');
  if (error) throw error;
  const totals = { to_us: 0, to_down: 0, to_grow: 0, to_others: 0, untagged: 0 };
  let count = 0;
  for (const row of data ?? []) {
    count++;
    const lane = row.lane && LANES.includes(row.lane) ? row.lane : 'untagged';
    totals[lane] += Number(row.amount ?? 0);
  }
  return { totals, count };
}

async function phaseTotalsForRange(fromIso, toIso) {
  const { data, error } = await sb
    .from('bank_statement_lines')
    .select('lcaa_phase, amount, direction')
    .gte('date', fromIso)
    .lte('date', toIso)
    .eq('direction', 'debit');
  if (error) throw error;
  const totals = { listen: 0, curiosity: 0, action: 0, art: 0, untagged: 0 };
  for (const row of data ?? []) {
    const phase = row.lcaa_phase && PHASES.includes(row.lcaa_phase)
      ? row.lcaa_phase
      : 'untagged';
    totals[phase] += Number(row.amount ?? 0);
  }
  return totals;
}

async function revenueForRange(fromIso, toIso) {
  const { data, error } = await sb
    .from('bank_statement_lines')
    .select('amount, direction')
    .gte('date', fromIso)
    .lte('date', toIso)
    .eq('direction', 'credit');
  if (error) throw error;
  let total = 0;
  for (const row of data ?? []) total += Number(row.amount ?? 0);
  return total;
}

function quarterRange(quartersBack = 0) {
  // Returns the Australian FY quarter range that is `quartersBack` from current.
  const now = new Date();
  const month = now.getUTCMonth(); // 0-11
  const year = now.getUTCFullYear();
  const qStartMonths = [6, 9, 0, 3]; // Jul, Oct, Jan, Apr (0-indexed)
  let qIndex =
    month >= 6 && month <= 8 ? 0 :
    month >= 9 && month <= 11 ? 1 :
    month >= 0 && month <= 2 ? 2 :
    3;
  let baseYear = year;
  if (qIndex >= 2) {
    // Jan-Jun belongs to FY ending this year, but quarter math anchors on year-of-quarter-start.
  }
  qIndex -= quartersBack;
  while (qIndex < 0) {
    qIndex += 4;
    baseYear--;
  }
  const startMonth = qStartMonths[qIndex];
  const startYear =
    qIndex === 0 ? (month >= 6 ? year : year - 1) - Math.floor(quartersBack / 4) :
    qIndex === 1 ? (month >= 9 ? year : month <= 5 ? year - 1 : year) - Math.floor(quartersBack / 4) :
    qIndex === 2 ? (month >= 0 && month <= 2 ? year : year + (month >= 6 ? 1 : 0)) :
    /* qIndex 3 */ (month >= 3 && month <= 5 ? year : year + (month >= 6 ? 1 : 0));
  const start = new Date(Date.UTC(startYear, startMonth, 1));
  const end = new Date(Date.UTC(startYear, startMonth + 3, 0)); // last day of quarter
  return { start, end, label: australianFyQuarter(start) };
}

function lastNDaysRange(n) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - n);
  return { start, end };
}

async function dataFreshness() {
  const { data, error } = await sb
    .from('bank_statement_lines')
    .select('date')
    .eq('direction', 'debit')
    .order('date', { ascending: false })
    .limit(1);
  if (error) throw error;
  const latest = data?.[0]?.date ?? null;
  const { data: earliestData } = await sb
    .from('bank_statement_lines')
    .select('date')
    .eq('direction', 'debit')
    .order('date', { ascending: true })
    .limit(1);
  const earliest = earliestData?.[0]?.date ?? null;
  return { earliest, latest };
}

async function main() {
  // Current Australian FY quarter
  const cq = quarterRange(0);
  const lastQ = quarterRange(1);
  const last90 = lastNDaysRange(90);

  const [cqLanes, lastQLanes, last90Lanes, cqPhases, last90Phases, cqRevenue, last90Revenue, freshness] =
    await Promise.all([
      laneTotalsForRange(isoDate(cq.start), isoDate(cq.end)),
      laneTotalsForRange(isoDate(lastQ.start), isoDate(lastQ.end)),
      laneTotalsForRange(isoDate(last90.start), isoDate(last90.end)),
      phaseTotalsForRange(isoDate(cq.start), isoDate(cq.end)),
      phaseTotalsForRange(isoDate(last90.start), isoDate(last90.end)),
      revenueForRange(isoDate(cq.start), isoDate(cq.end)),
      revenueForRange(isoDate(last90.start), isoDate(last90.end)),
      dataFreshness(),
    ]);

  const cqDebitTotal = LANES.reduce((s, l) => s + cqLanes.totals[l], 0) + cqLanes.totals.untagged;
  const last90DebitTotal = LANES.reduce((s, l) => s + last90Lanes.totals[l], 0) + last90Lanes.totals.untagged;

  const cqPhaseTotal = PHASES.reduce((s, p) => s + cqPhases[p], 0);
  const last90PhaseTotal = PHASES.reduce((s, p) => s + last90Phases[p], 0);

  // Lane most behind: use current quarter if populated, else last 90 days.
  const behindBasis = cqDebitTotal > 0 ? cqLanes.totals : last90Lanes.totals;
  const behindLabel = cqDebitTotal > 0 ? cq.label : 'last 90 days';
  let mostBehind = LANES[0];
  for (const l of LANES) if (behindBasis[l] < behindBasis[mostBehind]) mostBehind = l;

  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push('title: Four Lanes Today');
  lines.push('status: Live');
  lines.push(`updated: ${today}`);
  lines.push('source_of_truth: wiki/concepts/four-lanes.md');
  lines.push('---');
  lines.push('');
  lines.push('# Four Lanes Today');
  lines.push('');
  lines.push(`> Live snapshot of ACT's internal economy. Generated ${today}.`);
  lines.push(`> Methodology and meaning: [[../concepts/four-lanes|The Four Lanes]].`);
  lines.push('');
  lines.push(`> **Data range:** ${freshness.earliest} to ${freshness.latest}. If this lags the current date, statement ingestion is behind.`);
  lines.push('');

  lines.push(`## Current quarter (${cq.label}: ${isoDate(cq.start)} to ${isoDate(cq.end)})`);
  lines.push('');
  if (cqDebitTotal === 0) {
    lines.push(`_No data ingested for ${cq.label} yet. Latest data ends ${freshness.latest}._`);
    lines.push('');
  } else {
    lines.push('| Lane | Total | Share |');
    lines.push('|------|------:|------:|');
    for (const l of LANES) {
      lines.push(`| **${LANE_LABELS[l]}** | ${fmtMoney(cqLanes.totals[l])} | ${pct(cqLanes.totals[l], cqDebitTotal)} |`);
    }
    if (cqLanes.totals.untagged > 0) {
      lines.push(`| _(untagged)_ | ${fmtMoney(cqLanes.totals.untagged)} | ${pct(cqLanes.totals.untagged, cqDebitTotal)} |`);
    }
    lines.push('');
    lines.push(`Revenue this quarter: ${fmtMoney(cqRevenue)}`);
    lines.push('');
  }

  lines.push('## Previous quarter');
  lines.push('');
  lines.push(`${lastQ.label} (${isoDate(lastQ.start)} to ${isoDate(lastQ.end)}):`);
  lines.push('');
  for (const l of LANES) {
    lines.push(`- **${LANE_LABELS[l]}**: ${fmtMoney(lastQLanes.totals[l])}`);
  }
  lines.push('');

  lines.push('## Last 90 days');
  lines.push('');
  for (const l of LANES) {
    lines.push(`- **${LANE_LABELS[l]}**: ${fmtMoney(last90Lanes.totals[l])} (${pct(last90Lanes.totals[l], last90DebitTotal)})`);
  }
  lines.push('');
  lines.push(`Revenue last 90 days: ${fmtMoney(last90Revenue)}`);
  lines.push('');

  lines.push('## LCAA by spend (last 90 days)');
  lines.push('');
  if (last90PhaseTotal === 0) {
    lines.push('_LCAA phase tagging is not yet populated. Run `node scripts/tag-lcaa-phases.mjs --apply` to backfill._');
  } else {
    for (const p of PHASES) {
      lines.push(`- **${PHASE_LABELS[p]}**: ${fmtMoney(last90Phases[p])} (${pct(last90Phases[p], last90PhaseTotal)})`);
    }
  }
  lines.push('');

  lines.push('## Soul check');
  lines.push('');
  lines.push(`Lane most behind (${behindLabel}): **${LANE_LABELS[mostBehind]}** (${fmtMoney(behindBasis[mostBehind])}).`);
  lines.push('');
  if (mostBehind === 'to_us') {
    lines.push('When did Ben and Nic last get paid by the entity that earns the money? If the answer is "not this quarter," that is the work.');
  } else if (mostBehind === 'to_down') {
    lines.push('What old liability is unblocked by clearing this quarter? Receivables, ATO, legacy debts. Pick one.');
  } else if (mostBehind === 'to_grow') {
    lines.push('Which project most needs the next dollar? Equipment, sites, engineering hours, travel.');
  } else {
    lines.push('Which community partner has not had a fellowship or anchor payment yet? Make the list.');
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('Refresh: `node scripts/four-lanes-snapshot.mjs`');

  const out = lines.join('\n') + '\n';

  if (STDOUT_ONLY) {
    process.stdout.write(out);
    return;
  }

  writeFileSync(OUT_PATH, out, 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log('');
  console.log(`Current quarter (${cq.label}): To Us ${fmtMoney(cqLanes.totals.to_us)} · To Down ${fmtMoney(cqLanes.totals.to_down)} · To Grow ${fmtMoney(cqLanes.totals.to_grow)} · To Others ${fmtMoney(cqLanes.totals.to_others)}`);
  console.log(`Lane most behind: ${LANE_LABELS[mostBehind]}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
