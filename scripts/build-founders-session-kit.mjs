#!/usr/bin/env node
/**
 * build-founders-session-kit.mjs - the MONTHLY founders'-session prep builder.
 *
 * Monthly sibling of build-monday-card.mjs. A read-only fold that preps the
 * UPCOMING 1st-Tuesday founders' session - same architecture, same conventions,
 * same withheld treatment for the money-math half. Fires Sat 7am via PM2; an
 * in-script first-Tuesday guard means it only builds/sends on the Saturday three
 * days before the first Tuesday of a month (Sat+3d = Tue), so it preps the
 * session exactly once per month.
 *
 * Read-only fold of the same artifacts the Monday card uses:
 *   1. Key dates - the upcoming founders'-session date (the one 3 days out) +
 *      cutover countdown to 30 Jun 2026 (sole trader -> A Curious Tractor Pty Ltd).
 *      Pure date arithmetic, no external input.
 *   2. Money engine row - four lanes + LCAA + soul check lifted verbatim from
 *      wiki/cockpit/four-lanes-today.md; pipeline numbers (receivables, grants in
 *      flight, weighted pipeline, tagging coverage) from the latest money snapshot
 *      thoughts/shared/data/money-command-snapshots/YYYY-MM-DD.json.
 *   3. Drift lights (Art <10%, Listen <20%, To Us behind) computed ONLY from ratios
 *      already present in the four-lanes card. No new money math anywhere.
 *   4. Session agenda scaffold - standing "decisions to ratify / review", per-founder
 *      per-lane moves (To Us / To Down / To Grow / To Others x [5y|10y|20y|30y]) and
 *      "open questions" placeholders. A scaffold, never invented session content.
 *
 * Cash on hand / runway / monthly burn / R&D basis $ are WITHHELD (no trustworthy
 * pipeline). Deliberate and gated elsewhere (whole-picture v1.5, behind founders'
 * decisions N3/N14). The money snapshot .cash field is NOT cash on hand (it sums
 * every non-archived xero_bank_accounts mirror balance, ignores the two-account
 * rule, and the feed is known-stale) - it is never displayed here.
 *
 * Staleness never lies: every section renders as-of + age; STALE badge past
 * 26h (daily inputs) / 8d (weekly inputs); a dead input renders a FAILED line
 * (per-section try/catch isolation) and the kit still ships.
 *
 * READ-ONLY fold: reads artifacts, computes date arithmetic, writes its own
 * outputs. Never writes to Xero/GHL/Supabase, never re-runs other crons.
 *
 * Outputs:
 *   - thoughts/shared/cockpit/founders-session/YYYY-MM-DD.md + latest.md
 *     (YYYY-MM-DD = the session date being prepped)
 *   - thoughts/shared/founders-session-kit.html (self-contained Field surface)
 *   - Notion session page (create-if-absent, NEVER updates an existing page;
 *     parent = env NOTION_FOUNDERS_HUB_PAGE_ID, else "foundersHub" key in
 *     config/notion-database-ids.json, else skipped with a logged warning;
 *     idempotency state lives OUTSIDE the repo at ~/.act-founders-session-state.json,
 *     keyed by session date)
 *   - Telegram (<=30 lines) via scripts/lib/telegram.mjs to TELEGRAM_CHAT_ID
 *     and, only if set, TELEGRAM_CHAT_ID_NIC.
 *
 * Run:  node scripts/build-founders-session-kit.mjs --dry-run   (writes md + html,
 *       prints the would-be Telegram message, prints what Notion WOULD create - safe)
 * Cron: node scripts/build-founders-session-kit.mjs              (Sat 7am AEST - the
 *       first-Tuesday guard decides whether it builds/sends or exits clean)
 *
 * All times AEST (Australia/Brisbane, no DST). Errors append to
 * /tmp/build-founders-session-kit-error.log.
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
const ERR_LOG = '/tmp/build-founders-session-kit-error.log';
const SNAP_DIR = join(ROOT, 'thoughts/shared/data/money-command-snapshots');
const FOUR_LANES = join(ROOT, 'wiki/cockpit/four-lanes-today.md');
const OUT_DIR = join(ROOT, 'thoughts/shared/cockpit/founders-session');
const OUT_HTML = join(ROOT, 'thoughts/shared/founders-session-kit.html');
const NOTION_STATE = join(homedir(), '.act-founders-session-state.json'); // outside the repo on purpose: cron must never dirty a tracked file
const REGEN_CMD = 'node scripts/build-founders-session-kit.mjs --dry-run';

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

// ---------- key dates (pure date arithmetic - no money math, no external input) ----------
const CUTOVER_YMD = '2026-06-30'; // sole trader -> A Curious Tractor Pty Ltd cutover
const SESSION_FLOOR_YMD = '2026-07-07'; // monthly founders' session starts 7 Jul 2026 (itself a first Tuesday)

const dayDiff = (fromYmd, toYmd) =>
  Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);

// add n calendar days to a YYYY-MM-DD, returning YYYY-MM-DD (UTC arithmetic = AEST-safe for date-only)
const addDaysYmd = (ymd, n) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

function firstTuesdayYmd(year, monthIdx) { // monthIdx 0-11
  const dow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
  const offset = (2 - dow + 7) % 7; // 2 = Tuesday
  return new Date(Date.UTC(year, monthIdx, 1 + offset)).toISOString().slice(0, 10);
}

// is this YYYY-MM-DD the first Tuesday of its own month?
function isFirstTuesday(ymd) {
  const [y, m] = ymd.split('-').map(Number);
  return firstTuesdayYmd(y, m - 1) === ymd;
}

// next founders' session: first Tuesday of the month, never before 7 Jul 2026.
// Used to display a sensible session date in dry-run/force runs that happen on a
// day other than the Saturday the cron fires on (where Sat+3 would not be a Tuesday).
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

function keyDates(todayYmd, sessionYmd) {
  const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
  const cutDays = dayDiff(todayYmd, CUTOVER_YMD);
  const cutover = cutDays > 0
    ? `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): ${days(cutDays)} to go`
    : cutDays === 0
      ? `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): TODAY`
      : `Cutover to ACT Pty (${aestHuman(CUTOVER_YMD)}): done ${days(-cutDays)} ago`;
  const sessDays = dayDiff(todayYmd, sessionYmd);
  const session = `Founders' session being prepped: ${aestHuman(sessionYmd)} (first Tuesday of the month, from 7 Jul 2026)`
    + (sessDays === 0 ? ' - TODAY' : ` - ${days(sessDays)} away`);
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

// ---------- build the fold (per-section isolation) ----------
function buildKit(sessionYmd) {
  const todayY = aestYmd();
  const kit = {
    todayYmd: todayY,
    todayHuman: aestHuman(todayY),
    builtAt: aestStamp(),
    sessionYmd,
    sessionHuman: aestHuman(sessionYmd),
    sections: {},
  };
  const isolate = (name, fn) => {
    try { return fn(); }
    catch (e) { logErr(name, e); return { failed: true }; }
  };

  const snap = isolate('money-snapshot', loadSnapshot);
  const lanes = isolate('four-lanes', loadFourLanes);

  // 1. key dates (cutover countdown + the session being prepped) - pure date arithmetic
  kit.sections.dates = isolate('key-dates', () => keyDates(todayY, sessionYmd));

  // 2. money engine
  kit.sections.money = { snap, lanes, withheld: WITHHELD };

  // 3. drift lights - ONLY from ratios already present in the four-lanes card
  kit.sections.drift = isolate('drift-lights', () => {
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

  // 4. session agenda scaffold - a standing scaffold, never invented session content
  kit.sections.agenda = {
    ratify: [
      'Decisions to ratify / review (carry-over from the OS decision log - confirm or revise):',
      'N3 one money truth: which org-level FY26 net is canon (still undecided - no net ships until declared)',
      'N14 runway-in-months model: replace-vs-additive basis + the 10-week Harvest/Goods staffing commitments',
      'R&D basis: nothing on paper yet (15078-81 absent from the mirror) - confirm the collapse-to-$55K risk read',
      'Founder pay from Jul 2026 ($120K each, D11.2) - confirm against current cash band',
      'Cutover readiness (sole trader -> A Curious Tractor Pty Ltd by 30 Jun 2026)',
    ],
    founders: ['Ben', 'Nic'],
    lanes: ['To Us', 'To Down', 'To Grow', 'To Others'],
    horizons: ['5y', '10y', '20y', '30y'],
    openQuestions: [
      'Open questions (fill before / during the session):',
      '................',
      '................',
      '................',
    ],
  };

  // stale roll-up across the inputs we actually read
  const inputs = [
    ['four-lanes', lanes], ['snapshot', snap],
  ];
  kit.staleInputs = inputs
    .filter(([, v]) => v.failed || v.asOf?.stale)
    .map(([n, v]) => (v.failed ? `${n} FAILED` : `${n} ${fmtAge(v.asOf.ageH)}`));
  return kit;
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
  out.push('Withheld (gated on session decisions - whole-picture v1.5):');
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

function agendaLinesMd(a) {
  const out = [];
  for (const r of a.ratify) out.push(`- ${r}`);
  out.push('');
  const tag = `[${a.horizons.join('|')}]`;
  for (const founder of a.founders) {
    out.push(`### ${founder} - moves per lane`);
    out.push('');
    for (const lane of a.lanes) out.push(`- ${lane} - move: ................ ${tag}`);
    out.push('');
  }
  for (const q of a.openQuestions) out.push(`- ${q}`);
  return out;
}

function toMarkdown(kit) {
  const L = [];
  L.push('---');
  L.push("title: ACT Founders' Session Prep");
  L.push(`date: ${kit.todayYmd}`);
  L.push(`session: ${kit.sessionYmd}`);
  L.push('status: live');
  L.push('generated_by: scripts/build-founders-session-kit.mjs');
  L.push('---');
  L.push('');
  L.push(`# ACT Founders' Session Prep - ${kit.sessionHuman}`);
  L.push('');
  L.push(`> Built ${kit.builtAt}. Read-only fold of existing artifacts - no new money math. Preps the upcoming first-Tuesday session.`);
  if (kit.staleInputs.length) L.push(`> STALE inputs: ${kit.staleInputs.length} (${kit.staleInputs.join(', ')})`);
  L.push('');
  L.push('## Key dates');
  L.push('');
  const kd = kit.sections.dates;
  if (kd.failed) {
    L.push(FAILED_LINE);
  } else {
    L.push(`- ${kd.session}`);
    L.push(`- ${kd.cutover}`);
  }
  L.push('');
  L.push('## Money engine');
  L.push('');
  L.push(...moneyLinesMd(kit.sections.money));
  L.push('');
  L.push('## Drift lights');
  L.push('');
  const dr = kit.sections.drift;
  if (dr.failed) {
    L.push(FAILED_LINE);
  } else {
    L.push(`> as-of ${asOfText(dr.asOf)}`);
    L.push('');
    for (const l of dr.lights) L.push(`- ${l.text}`);
  }
  L.push('');
  L.push('## Session agenda');
  L.push('');
  L.push(...agendaLinesMd(kit.sections.agenda));
  L.push('');
  L.push('---');
  L.push('');
  L.push(`Refresh: \`${REGEN_CMD}\` (files only). The bare run sends Telegram + creates the Notion session page - cron does that Sat 7am AEST on the Saturday before a first Tuesday.`);
  L.push('');
  return L.join('\n');
}

function toHtml(kit) {
  const m = kit.sections.money;
  const dr = kit.sections.drift;
  const kd = kit.sections.dates;
  const a = kit.sections.agenda;
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
    + `<p class="withheld">Withheld (gated on session decisions):<br>${m.withheld.map(esc).join('<br>')}</p>`;

  const lanesBody = m.lanes.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<pre>${esc(m.lanes.lanes)}\n\nLCAA by spend (last 90 days):\n${esc(m.lanes.lcaa)}\n\nSoul check:\n${esc(m.lanes.soul)}</pre>`;

  const driftBody = dr.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<ul>${dr.lights.map((l) => `<li class="${l.on ? 'lon' : 'loff'}">${esc(l.text)}</li>`).join('\n')}</ul>`;

  const datesBody = kd.failed
    ? `<p class="bad">${esc(FAILED_LINE)}</p>`
    : `<ul><li>${esc(kd.session)}</li>\n<li>${esc(kd.cutover)}</li></ul>`;

  const tag = `[${a.horizons.join('|')}]`;
  const agendaBody = `<p class="sub2">Decisions to ratify / review</p>
<ul>${a.ratify.map((r) => `<li>${esc(r)}</li>`).join('\n')}</ul>
${a.founders.map((founder) => `<p class="sub2">${esc(founder)} - moves per lane</p>
<ul>${a.lanes.map((lane) => `<li>${esc(`${lane} - move: ................ ${tag}`)}</li>`).join('\n')}</ul>`).join('\n')}
<p class="sub2">Open questions</p>
<ul>${a.openQuestions.map((q) => `<li>${esc(q)}</li>`).join('\n')}</ul>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACT Founders' Session Prep - ${esc(kit.sessionHuman)}</title>
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
.lon{color:var(--bad)}.loff{color:var(--ok)}
pre{white-space:pre-wrap;margin:0;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
ul{margin:6px 0;padding-left:20px}li{margin:2px 0}
footer{color:var(--stale);font-size:12px;margin-top:16px;border-top:1px solid var(--line);padding-top:10px}
footer code{color:var(--info)}
</style></head><body>
<h1>ACT Founders' Session Prep - ${esc(kit.sessionHuman)}</h1>
<div class="sub">Built ${esc(kit.builtAt)} | read-only fold, no new money math | preps the upcoming first-Tuesday session | companions: <a href="monday-card.html">Monday card</a> | <a href="the-field-morning.html">morning read</a> | <a href="orbit-viz.html">orbit</a>${kit.staleInputs.length ? ` | <span style="color:var(--warn)">STALE inputs: ${kit.staleInputs.length} (${esc(kit.staleInputs.join(', '))})</span>` : ''}</div>
${panel('Key dates', kd.failed ? kd : null, datesBody)}
${panel('Money engine - pipeline + withheld', m.snap.failed ? m.snap : m.snap, moneyBody)}
${panel('Four lanes + LCAA + soul check (verbatim)', m.lanes.failed ? m.lanes : m.lanes, lanesBody)}
${panel('Drift lights', dr.failed ? dr : { asOf: dr.asOf }, driftBody)}
${panel('Session agenda', null, agendaBody)}
<footer>Regenerate: <code>${esc(REGEN_CMD)}</code> (files only - the bare run sends Telegram + Notion; cron Sat 7am AEST before a first Tuesday)</footer>
</body></html>
`;
}

function toTelegram(kit, notionLine, mdRelPath) {
  const m = kit.sections.money;
  const dr = kit.sections.drift;
  const plain = (s) => deDash(String(s)).replace(/\*\*/g, ''); // legacy-Markdown-safe
  const L = [];
  if (kit.staleInputs.length) L.push(`STALE inputs: ${kit.staleInputs.length} - ${kit.staleInputs.join(', ')}`);
  L.push(`*ACT Founders' Session Prep - ${kit.sessionHuman}*`);
  const kd = kit.sections.dates;
  L.push(kd.failed
    ? `Key dates: ${FAILED_LINE}`
    : `${plain(kd.session).replace(' (first Tuesday of the month, from 7 Jul 2026)', '')} | ${plain(kd.cutover)}`);
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
  L.push('*Agenda* (scaffold in the kit): decisions to ratify, per-founder per-lane moves, open questions');
  L.push(`Kit: ${mdRelPath}`);
  L.push(notionLine);
  // hard cap 30 lines: nothing here approaches it, but mirror the Monday card's guarantee
  return L.slice(0, 30).join('\n');
}

// ---------- notion (create-if-absent, never update) ----------
function notionBlocks(kit, md) {
  const rt = (c) => ({ type: 'text', text: { content: String(c).slice(0, 2000) } });
  const h2 = (t) => ({ heading_2: { rich_text: [rt(t)] } });
  const para = (t) => ({ paragraph: { rich_text: [rt(t)] } });
  const bullet = (t) => ({ bulleted_list_item: { rich_text: [rt(t)] } });
  const todo = (t) => ({ to_do: { rich_text: [rt(t)], checked: false } });
  const divider = () => ({ divider: {} });

  const blocks = [];
  blocks.push(para(`Built ${kit.builtAt} by scripts/build-founders-session-kit.mjs (read-only fold). ${kit.staleInputs.length ? `STALE inputs: ${kit.staleInputs.length} (${kit.staleInputs.join(', ')})` : 'All inputs fresh.'}`));
  // walk the markdown body into simple blocks (skip frontmatter, footer, and the
  // agenda section - the agenda is re-rendered below as interactive to-do blocks)
  const body = md.split('\n---\n').slice(1).join('\n---\n');
  let inAgenda = false;
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (t === '## Session agenda') { inAgenda = true; continue; }
    if (inAgenda) continue; // stop mirroring once we reach the agenda - rebuilt as to-dos
    if (!t || t.startsWith('# ') || t === '---') continue;
    if (t.startsWith('## ')) blocks.push(h2(t.slice(3)));
    else if (t.startsWith('- ')) blocks.push(bullet(t.slice(2).replace(/\*\*/g, '')));
    else if (t.startsWith('Refresh:')) continue;
    else blocks.push(para(t.replace(/^> /, '').replace(/\*\*/g, '')));
  }
  // session agenda as interactive scaffold
  const a = kit.sections.agenda;
  blocks.push(divider());
  blocks.push(h2('Decisions to ratify / review'));
  for (const r of a.ratify.slice(1)) blocks.push(todo(r)); // slice(1): drop the header line
  const tag = `[${a.horizons.join('|')}]`;
  for (const founder of a.founders) {
    blocks.push(h2(`${founder} - moves per lane`));
    for (const lane of a.lanes) blocks.push(todo(`${lane} - move: ................ ${tag}`));
  }
  blocks.push(h2('Open questions'));
  for (const q of a.openQuestions.slice(1)) blocks.push(bullet(q)); // slice(1): drop the header line
  return blocks.slice(0, 100); // Notion create caps children at 100
}

function loadNotionState() {
  try { return JSON.parse(readFileSync(NOTION_STATE, 'utf8')); } catch { return { runs: {} }; }
}

async function notionSessionPage(kit, md) {
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
  const session = kit.sessionYmd;
  const title = `ACT Founders' Session - ${aestHuman(session)}`;
  const state = loadNotionState();
  if (state.runs?.[session]?.pageId) {
    const url = `https://www.notion.so/${state.runs[session].pageId.replace(/-/g, '')}`;
    console.log(`  Notion: session page already exists for ${session} - NOT updating (may hold founder edits): ${url}`);
    return `Notion (existing session page, not touched): ${url}`;
  }
  const blocks = notionBlocks(kit, md);
  if (DRY_RUN) {
    console.log(`  Notion (dry-run): WOULD create "${title}" under parent ${parent} with ${blocks.length} blocks (state file ${NOTION_STATE} untouched)`);
    return `Notion (dry-run): would create "${title}"`;
  }
  const { Client } = await import('@notionhq/client');
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const page = await notion.pages.create({
    parent: { page_id: parent },
    icon: { type: 'emoji', emoji: '🧭' },
    properties: { title: { title: [{ type: 'text', text: { content: title } }] } },
    children: blocks,
  });
  state.runs ||= {};
  state.runs[session] = { pageId: page.id, createdAt: new Date().toISOString() };
  writeFileSync(NOTION_STATE, JSON.stringify(state, null, 2));
  const url = `https://www.notion.so/${page.id.replace(/-/g, '')}`;
  console.log(`  Notion: created session page ${url}`);
  return `Notion: ${url}`;
}

// ---------- main ----------
async function main() {
  // Day + first-Tuesday guard. PM2 fires Sat 7am, but also one-shots on register /
  // restart / reboot. A live run on the wrong day would push a real Telegram kit, so
  // unless --dry-run / --force: the session this run preps is 3 days out (Sat+3 = Tue),
  // and it is only the right Saturday when that Tuesday is the FIRST Tuesday of its
  // month - otherwise exit clean (so the kit preps a session exactly once per month).
  const todayY = aestYmd();
  const satPlus3 = addDaysYmd(todayY, 3); // Sat + 3 days = the Tuesday being prepped

  if (!DRY_RUN && !process.argv.includes('--force')) {
    if (!isFirstTuesday(satPlus3)) {
      console.log(`build-founders-session-kit: Sat+3d = ${satPlus3} (AEST) is not the first Tuesday of its month - the kit only preps the monthly first-Tuesday session (use --dry-run or --force). Exiting clean.`);
      return;
    }
    if (satPlus3 < SESSION_FLOOR_YMD) {
      console.log(`build-founders-session-kit: prepped session ${satPlus3} is before the 7 Jul 2026 floor - nothing to prep yet. Exiting clean.`);
      return;
    }
  }

  // Session being prepped: live runs use the guarded Sat+3 Tuesday. dry-run/force
  // can fire on any weekday (where Sat+3 is not a Tuesday), so fall back to the next
  // real first-Tuesday session so the artifact never references a non-session date.
  const sessionYmd = isFirstTuesday(satPlus3) ? satPlus3 : nextFoundersSession(todayY);

  console.log(`build-founders-session-kit ${DRY_RUN ? '(dry-run)' : '(LIVE - will send)'} at ${aestStamp()} - prepping session ${sessionYmd}`);
  const kit = buildKit(sessionYmd);
  const md = toMarkdown(kit);
  const html = toHtml(kit);

  mkdirSync(OUT_DIR, { recursive: true });
  const datedPath = join(OUT_DIR, `${kit.sessionYmd}.md`);
  writeFileSync(datedPath, md);
  writeFileSync(join(OUT_DIR, 'latest.md'), md);
  writeFileSync(OUT_HTML, html);
  console.log(`  md:   ${datedPath} (+ latest.md)`);
  console.log(`  html: ${OUT_HTML}`);

  let notionLine;
  try {
    notionLine = await notionSessionPage(kit, md);
  } catch (e) {
    logErr('notion', e);
    notionLine = `Notion: ${FAILED_LINE}`;
  }

  const mdRel = `thoughts/shared/cockpit/founders-session/${kit.sessionYmd}.md`;
  const msg = toTelegram(kit, notionLine, mdRel);
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
  if (kit.staleInputs.length) console.log(`  STALE inputs: ${kit.staleInputs.join(', ')}`);
  console.log(`Open: open ${OUT_HTML}`);
}

main().catch((e) => {
  logErr('fatal', e);
  process.exit(1);
});
