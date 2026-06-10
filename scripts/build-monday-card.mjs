#!/usr/bin/env node
/**
 * build-monday-card.mjs - the Monday 8:45am ONE-card builder.
 *
 * Read-only fold of four existing artifacts into one founders' card:
 *   1. Money engine row  - four lanes + LCAA + soul check lifted verbatim from
 *      wiki/cockpit/four-lanes-today.md; pipeline numbers (receivables, grants in
 *      flight, weighted pipeline, tagging coverage) from the latest money snapshot
 *      thoughts/shared/data/money-command-snapshots/YYYY-MM-DD.json.
 *   2. One line per project - thoughts/shared/reports/project-pipelines-latest.json
 *      + shipped-this-week from thoughts/shared/cross-codebase-feed/ (the latest.json
 *      window is 1 DAY, so the weekly view aggregates the dated daily files).
 *   3. Harvest row derived from the same feeds, labelled honestly.
 *   4. Drift lights (Art <10%, Listen <20%, To Us behind) computed ONLY from ratios
 *      already present in the four-lanes card. No new money math anywhere.
 *   5. Key dates - cutover countdown to 30 Jun 2026 (sole trader -> A Curious
 *      Tractor Pty Ltd) + next founders' session (first Tuesday of the month,
 *      starting 7 Jul 2026). Pure date arithmetic, no external input.
 *
 * Cash on hand / runway / monthly burn / R&D basis $ are WITHHELD in v1 (no
 * trustworthy pipeline). The money snapshot .cash field is NOT cash on hand
 * (it sums every non-archived xero_bank_accounts mirror balance, ignores the
 * two-account rule, and the feed is known-stale) - it is never displayed here.
 *
 * Staleness never lies: every section renders as-of + age; STALE badge past
 * 26h (daily inputs) / 8d (weekly inputs); a dead input renders a FAILED line
 * (per-section try/catch isolation) and the card still ships.
 *
 * READ-ONLY fold: reads artifacts, computes date arithmetic, writes its own
 * outputs. Never writes to Xero/GHL/Supabase, never re-runs other crons.
 *
 * Outputs:
 *   - thoughts/shared/cockpit/monday-card/YYYY-MM-DD.md + latest.md
 *   - thoughts/shared/monday-card.html (self-contained Field surface)
 *   - Notion week page (create-if-absent, NEVER updates an existing week page;
 *     parent = env NOTION_FOUNDERS_HUB_PAGE_ID, else "foundersHub" key in
 *     config/notion-database-ids.json, else skipped with a logged warning;
 *     idempotency state lives OUTSIDE the repo at ~/.act-monday-card-state.json)
 *   - Telegram (<=30 lines) via scripts/lib/telegram.mjs to TELEGRAM_CHAT_ID
 *     and, only if set, TELEGRAM_CHAT_ID_NIC.
 *
 * Run:  node scripts/build-monday-card.mjs --dry-run   (writes md + html, prints
 *       the would-be Telegram message, prints what Notion WOULD create - safe)
 * Cron: node scripts/build-monday-card.mjs              (Mon 8:45am AEST - SENDS)
 *
 * All times AEST (Australia/Brisbane, no DST). Errors append to
 * /tmp/build-monday-card-error.log.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// .env.local from repo root (cwd-safe, override:true per lib/load-env.mjs rationale)
try {
  const { config } = await import('dotenv');
  const envPath = join(ROOT, '.env.local');
  if (existsSync(envPath)) config({ path: envPath, override: true });
} catch { /* env may already be in process.env (CI / PM2) */ }

// ---------- constants ----------
const TZ = 'Australia/Brisbane'; // AEST, no DST
const DAILY_STALE_H = 26;
const WEEKLY_STALE_H = 8 * 24;
const ERR_LOG = '/tmp/build-monday-card-error.log';
const SNAP_DIR = join(ROOT, 'thoughts/shared/data/money-command-snapshots');
const FOUR_LANES = join(ROOT, 'wiki/cockpit/four-lanes-today.md');
const PIPELINES = join(ROOT, 'thoughts/shared/reports/project-pipelines-latest.json');
const FEED_DIR = join(ROOT, 'thoughts/shared/cross-codebase-feed');
const OUT_DIR = join(ROOT, 'thoughts/shared/cockpit/monday-card');
const OUT_HTML = join(ROOT, 'thoughts/shared/monday-card.html');
const NOTION_STATE = join(homedir(), '.act-monday-card-state.json'); // outside the repo on purpose: cron must never dirty a tracked file
const REGEN_CMD = 'node scripts/build-monday-card.mjs --dry-run';

// repo -> project code (confident maps only; unmapped repos listed honestly)
const REPO_TO_CODE = {
  'act-global-infrastructure': 'ACT-CORE',
  'empathy-ledger-v2': 'ACT-EL',
  'justicehub': 'ACT-JH',
  'goods': 'ACT-GD',
  'act-farm': 'ACT-FM',
};

const WITHHELD = ['Cash on hand', 'Runway', 'Monthly burn', 'R&D basis $']
  .map((k) => `${k}: withheld - no pipeline`);

// ---------- small helpers ----------
const logErr = (section, err) => {
  const line = `[${new Date().toISOString()}] ${section}: ${err?.message || err}\n${err?.stack || ''}\n`;
  try { appendFileSync(ERR_LOG, line); } catch { /* /tmp unwritable: nothing more we can do */ }
  console.error(`  ! ${section} FAILED: ${err?.message || err}`);
};
const FAILED_LINE = `FAILED - see ${ERR_LOG}`;

const deDash = (s) => String(s).replace(/[—–]/g, '-'); // no em/en dashes in user-facing copy
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });

const aestYmd = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const aestStamp = (d = new Date()) => {
  const ymd = aestYmd(d);
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${ymd} ${hm} AEST`;
};
const aestHuman = (ymd) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${ymd}T00:00:00Z`));

const ageHours = (epochMs) => (Date.now() - epochMs) / 3.6e6;
const fmtAge = (h) => (h == null ? 'age unknown' : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`);

// as-of descriptor: { label, ymdOrIso, epochMs|null, cadence: 'daily'|'weekly' }
function asOf(label, value, cadence) {
  let epochMs = null;
  if (value) {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+10:00` : value; // date-only = midnight AEST
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) epochMs = t;
  }
  const h = epochMs == null ? null : ageHours(epochMs);
  const limit = cadence === 'weekly' ? WEEKLY_STALE_H : DAILY_STALE_H;
  const stale = h == null ? true : h > limit;
  return { label, value: value || 'unknown', ageH: h, stale, cadence };
}
const asOfText = (a) => `${a.label} ${a.value} (${fmtAge(a.ageH)}, ${a.cadence})${a.stale ? ' [STALE]' : ''}`;

// Monday of the AEST week (Mon-Fri -> this week's Monday; Sat/Sun rolls forward)
function mondayOf(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const shiftDays = dow === 0 ? 1 : dow === 6 ? 2 : -(dow - 1);
  return new Date(d.getTime() + shiftDays * 86400000).toISOString().slice(0, 10);
}

// ---------- key dates (pure date arithmetic - no money math, no external input) ----------
const CUTOVER_YMD = '2026-06-30'; // sole trader -> A Curious Tractor Pty Ltd cutover
const SESSION_FLOOR_YMD = '2026-07-07'; // monthly founders' session starts 7 Jul 2026 (itself a first Tuesday)

const dayDiff = (fromYmd, toYmd) =>
  Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);

function firstTuesdayYmd(year, monthIdx) { // monthIdx 0-11
  const dow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
  const offset = (2 - dow + 7) % 7; // 2 = Tuesday
  return new Date(Date.UTC(year, monthIdx, 1 + offset)).toISOString().slice(0, 10);
}

// next founders' session: first Tuesday of the month, never before 7 Jul 2026
function nextFoundersSession(todayYmd) {
  let [y, m] = todayYmd.split('-').map(Number);
  m -= 1; // 0-based month
  let s = firstTuesdayYmd(y, m);
  if (s < todayYmd) { // this month's first Tuesday already passed -> next month (Dec rolls to Jan)
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    s = firstTuesdayYmd(y, m);
  }
  return s < SESSION_FLOOR_YMD ? SESSION_FLOOR_YMD : s;
}

function keyDates(todayYmd) {
  const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
  const cutDays = dayDiff(todayYmd, CUTOVER_YMD);
  const cutover = cutDays > 0
    ? `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): ${days(cutDays)} to go`
    : cutDays === 0
      ? `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): TODAY`
      : `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): done ${days(-cutDays)} ago`;
  const sessionYmd = nextFoundersSession(todayYmd);
  const sessDays = dayDiff(todayYmd, sessionYmd);
  const session = `Next founders' session: ${aestHuman(sessionYmd)} (first Tuesday monthly, from 7 Jul 2026)`
    + (sessDays === 0 ? ' - TODAY' : ` - ${days(sessDays)} to go`);
  return { cutover, session, cutoverYmd: CUTOVER_YMD, sessionYmd };
}

// ---------- collectors (each throws; callers isolate) ----------
function loadSnapshot() {
  const files = readdirSync(SNAP_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error(`no snapshots in ${SNAP_DIR}`);
  const file = files[files.length - 1];
  const j = JSON.parse(readFileSync(join(SNAP_DIR, file), 'utf8'));
  return {
    asOf: asOf('snapshot', j.today || file.replace('.json', ''), 'daily'),
    receivables: j.incoming?.receivables,
    grantsInFlight: j.incoming?.grantsInFlight,
    pipelineWeighted: j.incoming?.pipelineWeighted,
    coveragePct: j.coverage?.transactions?.pct,
    // NOTE: j.cash is deliberately NOT read out - it is not cash on hand.
  };
}

function loadFourLanes() {
  const raw = readFileSync(FOUR_LANES, 'utf8');
  const updated = raw.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  const sect = (heading) => {
    const m = raw.match(new RegExp(`## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`));
    return m ? deDash(m[1].trim()) : null;
  };
  const lanes = sect('Last 90 days');
  const lcaa = sect('LCAA by spend \\(last 90 days\\)');
  const soul = sect('Soul check');
  if (!lanes || !lcaa || !soul) throw new Error('four-lanes card missing expected sections (Last 90 days / LCAA / Soul check)');
  const pct = (name) => {
    const m = lcaa.match(new RegExp(`\\*\\*${name}\\*\\*:[^(]*\\((\\d+)%\\)`));
    return m ? Number(m[1]) : null;
  };
  return {
    asOf: asOf('four-lanes card', updated, 'weekly'),
    lanes, lcaa, soul,
    artPct: pct('Art'),
    listenPct: pct('Listen'),
    laneBehind: soul.match(/Lane most behind \(last 90 days\): \*\*(.+?)\*\*/)?.[1] || null,
  };
}

function loadPipelines() {
  const j = JSON.parse(readFileSync(PIPELINES, 'utf8'));
  const projects = (j.projects || []).map((p) => {
    const latest = p.pipelines.map((x) => x.latest_activity_at).filter(Boolean).sort().pop() || null;
    const stages = [...new Set(p.pipelines.flatMap((x) => x.stages_present || []))];
    return {
      code: p.project_code,
      open: p.total_open, won: p.total_won, openValue: p.open_value,
      latest: latest ? latest.slice(0, 10) : null,
      stages,
      pipelineNames: p.pipelines.map((x) => x.pipeline_name),
    };
  }).sort((a, b) => String(b.latest || '').localeCompare(String(a.latest || '')));
  return { asOf: asOf('pipelines', j.generated_at, 'daily'), projects };
}

function loadFeed() {
  // latest.json is a 1-DAY window; aggregate dated daily files over the last 7 days.
  const latest = JSON.parse(readFileSync(join(FEED_DIR, 'latest.json'), 'utf8'));
  const todayY = aestYmd();
  const cutoff = new Date(Date.parse(`${todayY}T00:00:00+10:00`) - 7 * 86400000);
  const files = readdirSync(FEED_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && new Date(`${f.slice(0, 10)}T00:00:00+10:00`) >= cutoff);
  const seen = new Set();
  const byRepo = {};
  const ingest = (events) => {
    for (const e of events || []) {
      const key = e.type === 'commit' ? `c:${e.repo}:${e.sha}` : `${e.type}:${e.repo}:${e.path}:${e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      byRepo[e.repo] = (byRepo[e.repo] || 0) + 1;
    }
  };
  for (const f of files) {
    try { ingest(JSON.parse(readFileSync(join(FEED_DIR, f), 'utf8')).events); }
    catch (e) { logErr(`feed:${f}`, e); }
  }
  ingest(latest.events);
  return {
    asOf: asOf('cross-codebase feed', latest.generated_at, 'daily'),
    windowNote: `last 7d aggregated from ${files.length} daily files + latest (latest alone is a 1d window)`,
    byRepo,
  };
}

// ---------- build the fold (per-section isolation) ----------
function buildCard() {
  const todayY = aestYmd();
  const card = {
    todayYmd: todayY,
    todayHuman: aestHuman(todayY),
    builtAt: aestStamp(),
    weekMonday: mondayOf(todayY),
    sections: {},
  };
  const isolate = (name, fn) => {
    try { return fn(); }
    catch (e) { logErr(name, e); return { failed: true }; }
  };

  const snap = isolate('money-snapshot', loadSnapshot);
  const lanes = isolate('four-lanes', loadFourLanes);
  const pipes = isolate('pipelines', loadPipelines);
  const feed = isolate('cross-codebase-feed', loadFeed);

  // 1. money engine
  card.sections.money = { snap, lanes, withheld: WITHHELD };

  // 5. key dates (cutover countdown + next founders' session) - pure date arithmetic
  card.sections.dates = isolate('key-dates', () => keyDates(todayY));

  // 2 + 3. projects + Harvest row
  card.sections.projects = isolate('projects-fold', () => {
    if (pipes.failed) throw new Error('pipelines input failed');
    const codeToRepos = {};
    for (const [repo, code] of Object.entries(REPO_TO_CODE)) (codeToRepos[code] ||= []).push(repo);
    const shipped = (code) => {
      if (feed.failed) return 'shipped: FAILED feed';
      const repos = codeToRepos[code] || [];
      const n = repos.reduce((s, r) => s + (feed.byRepo[r] || 0), 0);
      return repos.length ? `shipped 7d: ${n} events (${repos.join(', ')})` : null;
    };
    const line = (p) => {
      const bits = [
        `${p.open} open / ${p.won} won`,
        `open ${money(p.openValue)} (GHL pipelines)`,
        `latest ${p.latest || 'n/a'}`,
        p.stages.length ? `stages: ${p.stages.slice(0, 4).join(', ')}${p.stages.length > 4 ? ` +${p.stages.length - 4}` : ''}` : null,
        shipped(p.code),
      ].filter(Boolean);
      return bits.join(' | ');
    };
    const harvest = pipes.projects.find((p) => p.code === 'ACT-HV');
    const rest = pipes.projects.filter((p) => p.code !== 'ACT-HV');
    const unmapped = feed.failed ? [] : Object.keys(feed.byRepo).filter((r) => !REPO_TO_CODE[r]);
    return {
      pipeAsOf: pipes.asOf,
      feedAsOf: feed.failed ? null : feed.asOf,
      feedNote: feed.failed ? FAILED_LINE : feed.windowNote,
      rows: rest.map((p) => ({ code: p.code, text: line(p) })),
      harvest: harvest
        ? `Harvest: derived (no dedicated feed yet) - ACT-HV: ${line(harvest)}`
        : 'Harvest: derived (no dedicated feed yet) - no ACT-HV pipeline row found',
      unmappedNote: unmapped.length
        ? `repos shipped but not mapped to a project code: ${unmapped.map((r) => `${r} (${feed.byRepo[r]})`).join(', ')}`
        : null,
    };
  });

  // 4. drift lights - ONLY from ratios already present in the four-lanes card
  card.sections.drift = isolate('drift-lights', () => {
    if (lanes.failed) throw new Error('four-lanes input failed');
    const light = (on, label, why) => ({ on, text: `${label}: ${on ? 'ON' : 'off'} (${why})` });
    return {
      asOf: lanes.asOf,
      lights: [
        light(lanes.artPct != null && lanes.artPct < 10, 'Art < 10%',
          lanes.artPct == null ? 'Art % not found in card' : `Art ${lanes.artPct}% of LCAA spend, last 90d`),
        light(lanes.listenPct != null && lanes.listenPct < 20, 'Listen < 20%',
          lanes.listenPct == null ? 'Listen % not found in card' : `Listen ${lanes.listenPct}%, last 90d`),
        light(lanes.laneBehind === 'To Us', 'To Us behind',
          lanes.laneBehind ? `soul check: lane most behind = ${lanes.laneBehind}` : 'lane-behind not found in card'),
      ],
    };
  });

  // stale roll-up across the four inputs
  const inputs = [
    ['four-lanes', lanes], ['snapshot', snap], ['pipelines', pipes], ['feed', feed],
  ];
  card.staleInputs = inputs
    .filter(([, v]) => v.failed || v.asOf?.stale)
    .map(([n, v]) => (v.failed ? `${n} FAILED` : `${n} ${fmtAge(v.asOf.ageH)}`));
  return card;
}

// ---------- renderers ----------
function moneyLinesMd(m) {
  const out = [];
  if (m.snap.failed) {
    out.push(`Pipeline numbers: ${FAILED_LINE}`);
  } else {
    out.push(`Pipeline numbers (as-of ${asOfText(m.snap.asOf)}):`);
    out.push(`- Receivables: ${money(m.snap.receivables)}`);
    out.push(`- Grants in flight: ${money(m.snap.grantsInFlight)}`);
    out.push(`- Weighted pipeline: ${money(m.snap.pipelineWeighted)}`);
    if (m.snap.coveragePct != null) out.push(`- Tagging coverage: ${m.snap.coveragePct.toFixed(1)}% of transactions`);
  }
  out.push('');
  out.push('Withheld in v1:');
  for (const w of m.withheld) out.push(`- ${w}`);
  out.push('');
  if (m.lanes.failed) {
    out.push(`Four lanes / LCAA / soul check: ${FAILED_LINE}`);
  } else {
    out.push(`Four lanes, last 90 days (verbatim, as-of ${asOfText(m.lanes.asOf)}):`);
    out.push('');
    out.push(m.lanes.lanes);
    out.push('');
    out.push('LCAA by spend (last 90 days):');
    out.push('');
    out.push(m.lanes.lcaa);
    out.push('');
    out.push('Soul check:');
    out.push('');
    out.push(m.lanes.soul);
  }
  return out;
}

function toMarkdown(card) {
  const L = [];
  L.push('---');
  L.push('title: ACT Monday Card');
  L.push(`date: ${card.todayYmd}`);
  L.push('status: live');
  L.push('generated_by: scripts/build-monday-card.mjs');
  L.push('---');
  L.push('');
  L.push(`# ACT Monday Card - ${card.todayHuman}`);
  L.push('');
  L.push(`> Built ${card.builtAt}. Read-only fold of existing artifacts - no new money math.`);
  if (card.staleInputs.length) L.push(`> STALE inputs: ${card.staleInputs.length} (${card.staleInputs.join(', ')})`);
  L.push('');
  L.push('## Key dates');
  L.push('');
  const kd = card.sections.dates;
  if (kd.failed) {
    L.push(FAILED_LINE);
  } else {
    L.push(`- ${kd.cutover}`);
    L.push(`- ${kd.session}`);
  }
  L.push('');
  L.push('## Money engine');
  L.push('');
  L.push(...moneyLinesMd(card.sections.money));
  L.push('');
  L.push('## Projects');
  L.push('');
  const pj = card.sections.projects;
  if (pj.failed) {
    L.push(FAILED_LINE);
  } else {
    L.push(`> as-of ${asOfText(pj.pipeAsOf)}${pj.feedAsOf ? ` | feed ${asOfText(pj.feedAsOf)}` : ''}`);
    L.push(`> shipped window: ${pj.feedNote}`);
    L.push('');
    for (const r of pj.rows) L.push(`- ${r.code}: ${r.text}`);
    if (pj.unmappedNote) { L.push(''); L.push(`_${pj.unmappedNote}_`); }
    L.push('');
    L.push('## Harvest');
    L.push('');
    L.push(pj.harvest);
  }
  L.push('');
  L.push('## Drift lights');
  L.push('');
  const dr = card.sections.drift;
  if (dr.failed) {
    L.push(FAILED_LINE);
  } else {
    L.push(`> as-of ${asOfText(dr.asOf)}`);
    L.push('');
    for (const l of dr.lights) L.push(`- ${l.text}`);
  }
  L.push('');
  L.push('---');
  L.push('');
  L.push(`Refresh: \`${REGEN_CMD}\` (files only). The bare run sends Telegram + creates the Notion week page - cron does that Mon 8:45am AEST.`);
  L.push('');
  return L.join('\n');
}

function toHtml(card) {
  const m = card.sections.money;
  const pj = card.sections.projects;
  const dr = card.sections.drift;
  const kd = card.sections.dates;
  const cls = (input) => (input?.failed ? 'failed' : input?.asOf?.stale ? 'stale' : 'ok');
  const badge = (input) =>
    input?.failed ? '<span class="badge bad">FAILED</span>'
      : `<span class="badge ${input.asOf.stale ? 'st' : 'okb'}">as-of ${esc(input.asOf.value)} (${fmtAge(input.asOf.ageH)})${input.asOf.stale ? ' STALE' : ''}</span>`;
  const panel = (title, input, bodyHtml) =>
    `<section class="panel ${cls(input)}"><h2>${esc(title)} ${input ? badge(input) : ''}</h2>${bodyHtml}</section>`;

  const moneyBody = (m.snap.failed
    ? `<p class="bad">Pipeline numbers: ${esc(FAILED_LINE)}</p>`
    : `<ul>
<li>Receivables: <b>${money(m.snap.receivables)}</b></li>
<li>Grants in flight: <b>${money(m.snap.grantsInFlight)}</b></li>
<li>Weighted pipeline: <b>${money(m.snap.pipelineWeighted)}</b></li>
${m.snap.coveragePct != null ? `<li>Tagging coverage: <b>${m.snap.coveragePct.toFixed(1)}%</b> of transactions</li>` : ''}
</ul>`)
    + `<p class="withheld">${m.withheld.map(esc).join('<br>')}</p>`;

  const lanesBody = m.lanes.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<pre>${esc(m.lanes.lanes)}\n\nLCAA by spend (last 90 days):\n${esc(m.lanes.lcaa)}\n\nSoul check:\n${esc(m.lanes.soul)}</pre>`;

  const projBody = pj.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<p class="sub2">shipped window: ${esc(pj.feedNote)}${pj.feedAsOf ? ` | feed ${esc(asOfText(pj.feedAsOf))}` : ''}</p>
<ul>${pj.rows.map((r) => `<li><b>${esc(r.code)}</b>: ${esc(r.text)}</li>`).join('\n')}</ul>
${pj.unmappedNote ? `<p class="sub2">${esc(pj.unmappedNote)}</p>` : ''}
<p class="harvest">${esc(pj.harvest)}</p>`;

  const driftBody = dr.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<ul>${dr.lights.map((l) => `<li class="${l.on ? 'lon' : 'loff'}">${esc(l.text)}</li>`).join('\n')}</ul>`;

  const datesBody = kd.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<ul><li>${esc(kd.cutover)}</li>\n<li>${esc(kd.session)}</li></ul>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACT Monday Card - ${esc(card.todayHuman)}</title>
<style>
:root{--bg:#0b0e14;--panel:#121826;--ink:#e6edf3;--ok:#3ddc97;--warn:#ffb454;--bad:#ff5d5d;--info:#5fb3ff;--stale:#71808f;--line:#28323f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:18px;max-width:980px}
h1{font-size:17px;margin:0 0 4px}h2{font-size:15px;margin:0 0 8px}
.sub{color:var(--stale);font-size:12px;margin-bottom:14px}.sub a{color:var(--info)}
.sub2{color:var(--stale);font-size:12px}
.panel{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--ok);border-radius:8px;padding:12px 14px;margin-bottom:12px}
.panel.stale{border-left-color:var(--stale)}.panel.stale h2,.panel.stale li,.panel.stale pre,.panel.stale p{color:var(--stale)}
.panel.failed{border-left-color:var(--bad)}
.badge{font-size:11px;border-radius:4px;padding:1px 6px;margin-left:8px;vertical-align:middle}
.badge.okb{background:rgba(61,220,151,.15);color:var(--ok)}.badge.st{background:rgba(113,128,143,.2);color:var(--stale)}.badge.bad{background:rgba(255,93,93,.15);color:var(--bad)}
.bad{color:var(--bad)}.withheld{color:var(--stale);font-size:12px;border-top:1px solid var(--line);padding-top:8px}
.harvest{color:var(--warn)}.lon{color:var(--bad)}.loff{color:var(--ok)}
pre{white-space:pre-wrap;margin:0;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
ul{margin:6px 0;padding-left:20px}li{margin:2px 0}
footer{color:var(--stale);font-size:12px;margin-top:16px;border-top:1px solid var(--line);padding-top:10px}
footer code{color:var(--info)}
</style></head><body>
<h1>ACT Monday Card - ${esc(card.todayHuman)}</h1>
<div class="sub">Built ${esc(card.builtAt)} | read-only fold, no new money math | companions: <a href="the-field-morning.html">morning read</a> | <a href="project-scope-board.html">scope board</a> | <a href="orbit-viz.html">orbit</a>${card.staleInputs.length ? ` | <span style="color:var(--warn)">STALE inputs: ${card.staleInputs.length} (${esc(card.staleInputs.join(', '))})</span>` : ''}</div>
${panel('Key dates', kd.failed ? kd : null, datesBody)}
${panel('Money engine - pipeline + withheld', m.snap.failed ? m.snap : m.snap, moneyBody)}
${panel('Four lanes + LCAA + soul check (verbatim)', m.lanes.failed ? m.lanes : m.lanes, lanesBody)}
${panel('Projects + Harvest', pj.failed ? pj : { asOf: pj.pipeAsOf }, projBody)}
${panel('Drift lights', dr.failed ? dr : { asOf: dr.asOf }, driftBody)}
<footer>Regenerate: <code>${esc(REGEN_CMD)}</code> (files only - the bare run sends Telegram + Notion; cron Mon 8:45am AEST)</footer>
</body></html>
`;
}

function toTelegram(card, notionLine, mdRelPath) {
  const m = card.sections.money;
  const pj = card.sections.projects;
  const dr = card.sections.drift;
  const plain = (s) => deDash(String(s)).replace(/\*\*/g, ''); // legacy-Markdown-safe
  const L = [];
  if (card.staleInputs.length) L.push(`STALE inputs: ${card.staleInputs.length} - ${card.staleInputs.join(', ')}`);
  L.push(`*ACT Monday Card - ${card.todayHuman}*`);
  const kd = card.sections.dates;
  L.push(kd.failed
    ? `Key dates: ${FAILED_LINE}`
    : `${plain(kd.cutover)} | ${plain(kd.session).replace(' (first Tuesday monthly, from 7 Jul 2026)', '')}`);
  if (m.snap.failed) {
    L.push(`Money pipeline: ${FAILED_LINE}`);
  } else {
    L.push(`Money (snapshot ${m.snap.asOf.value}, ${fmtAge(m.snap.asOf.ageH)}${m.snap.asOf.stale ? ' STALE' : ''}):`);
    L.push(`Receivables ${money(m.snap.receivables)} | grants in flight ${money(m.snap.grantsInFlight)} | weighted pipeline ${money(m.snap.pipelineWeighted)}`);
    if (m.snap.coveragePct != null) L.push(`Tagging coverage ${m.snap.coveragePct.toFixed(1)}% of transactions`);
  }
  if (m.lanes.failed) {
    L.push(`Four lanes / LCAA / soul: ${FAILED_LINE}`);
  } else {
    const laneLine = m.lanes.lanes.split('\n').filter((x) => x.startsWith('- ')).map((x) => plain(x.slice(2))).join(' | ');
    const lcaaLine = m.lanes.lcaa.split('\n').filter((x) => x.startsWith('- ')).map((x) => plain(x.slice(2))).join(' | ');
    const soulLine = plain(m.lanes.soul.split('\n')[0] || '');
    L.push(`Lanes 90d (card ${m.lanes.asOf.value}, ${fmtAge(m.lanes.asOf.ageH)}${m.lanes.asOf.stale ? ' STALE' : ''}): ${laneLine}`);
    L.push(`LCAA 90d: ${lcaaLine}`);
    L.push(`Soul: ${soulLine}`);
  }
  L.push('Cash on hand / runway / burn / R&D basis: withheld - no pipeline');
  L.push(dr.failed ? `Drift lights: ${FAILED_LINE}` : `Drift: ${dr.lights.map((l) => l.text.split(' (')[0]).join(' | ')}`);
  if (pj.failed) {
    L.push(`Projects: ${FAILED_LINE}`);
  } else {
    L.push(`*Projects* (pipelines ${pj.pipeAsOf.value.slice(0, 10)}${pj.pipeAsOf.stale ? ' STALE' : ''}, shipped = last 7d):`);
    const MAX_PROJ = 8;
    const rows = pj.rows.filter((r) => r.code !== 'untagged');
    for (const r of rows.slice(0, MAX_PROJ)) {
      const t = r.text.split(' | ');
      const ship = t.find((x) => x.startsWith('shipped'));
      L.push(`- ${r.code}: ${t[0]} | ${t[1]} | ${t[2]}${ship ? ` | ${ship.replace(/ \(.*\)$/, '')}` : ''}`);
    }
    if (rows.length > MAX_PROJ) L.push(`+${rows.length - MAX_PROJ} more in the card file`);
    L.push(plain(pj.harvest));
  }
  L.push(`Card: ${mdRelPath}`);
  L.push(notionLine);
  // hard cap 30 lines: trim project rows first
  while (L.length > 30) {
    const idx = L.findIndex((x) => x.startsWith('- ') && /^- [A-Z]/.test(x));
    if (idx === -1) break;
    L.splice(idx, 1);
  }
  return L.slice(0, 30).join('\n');
}

// ---------- notion (create-if-absent, never update) ----------
function notionBlocks(card, md) {
  const rt = (c) => ({ type: 'text', text: { content: String(c).slice(0, 2000) } });
  const h2 = (t) => ({ heading_2: { rich_text: [rt(t)] } });
  const para = (t) => ({ paragraph: { rich_text: [rt(t)] } });
  const bullet = (t) => ({ bulleted_list_item: { rich_text: [rt(t)] } });
  const todo = (t) => ({ to_do: { rich_text: [rt(t)], checked: false } });
  const divider = () => ({ divider: {} });

  const blocks = [];
  blocks.push(para(`Built ${card.builtAt} by scripts/build-monday-card.mjs (read-only fold). ${card.staleInputs.length ? `STALE inputs: ${card.staleInputs.length} (${card.staleInputs.join(', ')})` : 'All inputs fresh.'}`));
  // walk the markdown body into simple blocks (skip frontmatter + footer)
  const body = md.split('\n---\n').slice(1).join('\n---\n');
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('# ') || t === '---') continue;
    if (t.startsWith('## ')) blocks.push(h2(t.slice(3)));
    else if (t.startsWith('- ')) blocks.push(bullet(t.slice(2).replace(/\*\*/g, '')));
    else if (t.startsWith('Refresh:')) continue;
    else blocks.push(para(t.replace(/^> /, '').replace(/\*\*/g, '')));
  }
  blocks.push(divider());
  for (const founder of ['Ben', 'Nic']) {
    blocks.push(h2(`${founder} - moves this week`));
    for (const lane of ['To Us', 'To Down', 'To Grow', 'To Others']) {
      blocks.push(todo(`${lane} - move: ................ [5y|10y|20y|30y]`));
    }
  }
  return blocks.slice(0, 100); // Notion create caps children at 100
}

function loadNotionState() {
  try { return JSON.parse(readFileSync(NOTION_STATE, 'utf8')); } catch { return { runs: {} }; }
}

async function notionWeekPage(card, md) {
  const parent = process.env.NOTION_FOUNDERS_HUB_PAGE_ID
    || (() => {
      try {
        const cfg = JSON.parse(readFileSync(join(ROOT, 'config/notion-database-ids.json'), 'utf8'));
        return cfg.foundersHub?.parentPage || (typeof cfg.foundersHub === 'string' ? cfg.foundersHub : null);
      } catch { return null; }
    })();
  if (!parent) {
    const warn = 'Notion: SKIPPED - no NOTION_FOUNDERS_HUB_PAGE_ID env and no foundersHub key in config/notion-database-ids.json';
    console.warn(`  ! ${warn}`);
    return warn;
  }
  const week = card.weekMonday;
  const title = `ACT Monday Card - Week of ${aestHuman(week)}`;
  const state = loadNotionState();
  if (state.runs?.[week]?.pageId) {
    const url = `https://www.notion.so/${state.runs[week].pageId.replace(/-/g, '')}`;
    console.log(`  Notion: week page already exists for ${week} - NOT updating (may hold founder edits): ${url}`);
    return `Notion (existing week page, not touched): ${url}`;
  }
  const blocks = notionBlocks(card, md);
  if (DRY_RUN) {
    console.log(`  Notion (dry-run): WOULD create "${title}" under parent ${parent} with ${blocks.length} blocks (state file ${NOTION_STATE} untouched)`);
    return `Notion (dry-run): would create "${title}"`;
  }
  const { Client } = await import('@notionhq/client');
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const page = await notion.pages.create({
    parent: { page_id: parent },
    icon: { type: 'emoji', emoji: '🌅' },
    properties: { title: { title: [{ type: 'text', text: { content: title } }] } },
    children: blocks,
  });
  state.runs ||= {};
  state.runs[week] = { pageId: page.id, createdAt: new Date().toISOString() };
  writeFileSync(NOTION_STATE, JSON.stringify(state, null, 2));
  const url = `https://www.notion.so/${page.id.replace(/-/g, '')}`;
  console.log(`  Notion: created week page ${url}`);
  return `Notion: ${url}`;
}

// ---------- main ----------
async function main() {
  // Day guard: PM2 fires a one-shot the moment the entry is registered (and on
  // restarts/reboots), not just on its Mon 8:45 cron. A live run on any other
  // AEST day would push a real Telegram card, so bail unless forced.
  const weekday = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' }).format(new Date());
  if (!DRY_RUN && !process.argv.includes('--force') && weekday !== 'Mon') {
    console.log(`build-monday-card: today is ${weekday} (AEST) - Monday card only runs live on Mondays (use --dry-run or --force). Exiting clean.`);
    return;
  }
  console.log(`build-monday-card ${DRY_RUN ? '(dry-run)' : '(LIVE - will send)'} at ${aestStamp()}`);
  const card = buildCard();
  const md = toMarkdown(card);
  const html = toHtml(card);

  mkdirSync(OUT_DIR, { recursive: true });
  const datedPath = join(OUT_DIR, `${card.todayYmd}.md`);
  writeFileSync(datedPath, md);
  writeFileSync(join(OUT_DIR, 'latest.md'), md);
  writeFileSync(OUT_HTML, html);
  console.log(`  md:   ${datedPath} (+ latest.md)`);
  console.log(`  html: ${OUT_HTML}`);

  let notionLine;
  try {
    notionLine = await notionWeekPage(card, md);
  } catch (e) {
    logErr('notion', e);
    notionLine = `Notion: ${FAILED_LINE}`;
  }

  const mdRel = `thoughts/shared/cockpit/monday-card/${card.todayYmd}.md`;
  const msg = toTelegram(card, notionLine, mdRel);
  const nLines = msg.split('\n').length;
  if (DRY_RUN) {
    console.log(`\n--- would-be Telegram message (${nLines} lines) ---`);
    console.log(msg);
    console.log('--- end (not sent: --dry-run) ---');
  } else {
    try {
      const { sendTelegram } = await import('./lib/telegram.mjs');
      const okBen = await sendTelegram(msg);
      console.log(`  Telegram -> primary chat: ${okBen ? 'sent' : 'queued/failed (quiet hours or budget - check /tmp/.tg-queue.jsonl)'}`);
      if (process.env.TELEGRAM_CHAT_ID_NIC) {
        const okNic = await sendTelegram(msg, { chatId: process.env.TELEGRAM_CHAT_ID_NIC });
        console.log(`  Telegram -> Nic: ${okNic ? 'sent' : 'queued/failed'}`);
      }
    } catch (e) {
      logErr('telegram', e);
    }
  }
  if (card.staleInputs.length) console.log(`  STALE inputs: ${card.staleInputs.join(', ')}`);
  console.log(`Open: open ${OUT_HTML}`);
}

main().catch((e) => {
  logErr('fatal', e);
  process.exit(1);
});
