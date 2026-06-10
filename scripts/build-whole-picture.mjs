#!/usr/bin/env node
/**
 * build-whole-picture.mjs - THE WHOLE PICTURE: the fourth Field surface.
 *
 * One page that holds the whole of A Curious Tractor at a glance: THIS WEEK
 * (cutover / sessions / canary / shipped), THE SYSTEM (12 node cards across
 * entities / projects / systems), THE MONEY ENGINE (display-only numbers from
 * the latest money snapshot), THE DRUMBEAT (cron freshness + horizons + open
 * decisions). Daily 8:20am AEST.
 *
 * Reads: thoughts/shared/data/money-command-snapshots/<newest>.json
 *        thoughts/shared/reports/project-pipelines-latest.json
 *        thoughts/shared/cross-codebase-feed/<last 7 days>.json
 *        thoughts/shared/field-freshness.json
 *        wiki/cockpit/four-lanes-today.md (frontmatter date only)
 *        wiki/cockpit/weekly-digest-*.md (newest, mtime only)
 *        thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md (section 10 decision rows)
 *        thoughts/shared/cockpit/monday-card/latest.md (mtime, if present)
 *
 * Read-only fold: reads artifacts, does date arithmetic, writes its own output.
 * Never writes to Xero / GHL / Supabase, never re-runs other crons.
 * Money rule: no new dollar aggregations - only numbers that already exist in
 * artifacts, labelled with their source. Staleness never lies: every number
 * carries its as-of date + age, greys past the rule, and a missing input
 * renders a FAILED line while the page still ships.
 *
 * WHY CASH ON HAND IS WITHHELD (the snapshot .cash trace):
 *   The money snapshot's top-level `.cash` is the output of loadCashInBank()
 *   in scripts/money-command-digest.mjs: a SUM of `current_balance` across
 *   ALL non-ARCHIVED rows of the `xero_bank_accounts` Supabase mirror. That
 *   means it (a) ignores the two-account rule (NAB Visa #8815 + NJ Marchesi
 *   T/as ACT Everyday are the only ACT operating accounts - .cash also sums
 *   NM Personal, Maximiser, and negative credit-card balances, hence
 *   -$152,230.52 on 2026-06-09), and (b) rides a bank-balance feed that is
 *   known to go stale, with no freshness check on the mirror. It is a
 *   point-in-time "everything in the mirror" figure, NOT ACT cash on hand.
 *   Until a trustworthy cash pipeline exists, cash on hand / runway / monthly
 *   burn / R&D basis $ render literally as "withheld - no pipeline".
 *
 * Run:  node scripts/build-whole-picture.mjs
 * Out:  thoughts/shared/the-whole-picture.html
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const P = (...s) => join(ROOT, ...s);
const CC = 'http://localhost:3002'; // command-center

// ── AEST (Australia/Brisbane, UTC+10, no DST) - explicit, never server-local ──
const TZ = 'Australia/Brisbane';
const aestDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const aestTime = (d = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const aestLong = (d = new Date()) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
const TODAY = aestDate(); // YYYY-MM-DD in AEST
const dayMs = 864e5;
// days from today's AEST date to a YYYY-MM-DD target (AEST midnights, +10:00 pinned)
const daysUntil = (ymd) => Math.round((Date.parse(ymd + 'T00:00:00+10:00') - Date.parse(TODAY + 'T00:00:00+10:00')) / dayMs);
const ageH = (ms) => (Date.now() - ms) / 3600e3;
const fmtAge = (h) => (h == null ? 'age unknown' : h < 1 ? 'under 1h ago' : h < 48 ? Math.round(h) + 'h ago' : Math.round(h / 24) + 'd ago');
const mtimeOf = (p) => statSync(p).mtimeMs;
const $n = (v) => '$' + Math.round(v).toLocaleString('en-AU'); // display formatting only, no aggregation
const ymdShift = (ymd, days) => new Date(Date.parse(ymd + 'T00:00:00Z') + days * dayMs).toISOString().slice(0, 10);

// first Tuesday of a month (pure calendar math, timezone-free)
function firstTuesday(y, m) {
  const dow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const day = 1 + ((2 - dow + 7) % 7);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function nextFoundersSession() { // first Tuesday monthly, series starts 7 Jul 2026
  let [y, m] = TODAY.split('-').map(Number);
  for (let i = 0; i < 36; i++) {
    const d = firstTuesday(y, m);
    if (d >= TODAY && d >= '2026-07-07') return d;
    m++; if (m > 12) { m = 1; y++; }
  }
  return null;
}
const longOf = (ymd) => aestLong(new Date(ymd + 'T12:00:00+10:00'));

// per-section failure isolation: a dead input renders FAILED, the page still ships
const safe = (label, fn) => {
  try { return fn(); }
  catch (e) { console.error(`  FAILED ${label}: ${e.message}`); return { failed: true, label, error: String(e.message || e) }; }
};

// ════ shared inputs (each fail-soft) ════
const freshness = safe('thoughts/shared/field-freshness.json', () =>
  JSON.parse(readFileSync(P('thoughts/shared/field-freshness.json'), 'utf8')));

const snap = safe('money-command-snapshots', () => {
  const dir = P('thoughts/shared/data/money-command-snapshots');
  const files = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error('no snapshot files');
  const file = files[files.length - 1];
  const j = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  // staleness is judged on the AS-OF date (.today), not file mtime - a snapshot
  // written today but holding 2-day-old data is still 2-day-old data
  const asOfAge = j.today ? ageH(Date.parse(j.today + 'T00:00:00+10:00')) : null;
  return { j, file, rel: 'thoughts/shared/data/money-command-snapshots/' + file, age: asOfAge ?? ageH(mtimeOf(join(dir, file))), wroteAge: ageH(mtimeOf(join(dir, file))) };
});

// ════ BAND 1 - THIS WEEK ════
const week = safe('this-week', () => {
  const rows = [];
  const cut = daysUntil('2026-06-30');
  rows.push({ k: 'Pty cutover - 30 Jun 2026', v: cut + ' days', m: 'sole trader dies 30 Jun · date arithmetic', tone: cut <= 21 ? 'warn' : '' });

  const mc = P('thoughts/shared/cockpit/monday-card/latest.md');
  if (existsSync(mc)) {
    const h = ageH(mtimeOf(mc));
    rows.push({ k: 'Last Monday card', v: fmtAge(h), m: 'thoughts/shared/cockpit/monday-card/latest.md', tone: h > 8 * 24 ? 'stale' : 'ok' });
  } else {
    rows.push({ k: 'Monday card', v: 'first card Mon 15 Jun', m: 'thoughts/shared/cockpit/monday-card/latest.md not present yet (new cron)', tone: 'mut' });
  }

  const fs2 = nextFoundersSession();
  rows.push({ k: "Next founders' session", v: daysUntil(fs2) + ' days (' + longOf(fs2) + ')', m: 'first Tuesday monthly from 7 Jul 2026 · date arithmetic' });

  if (freshness.failed) {
    rows.push({ k: 'Spine canary', v: 'FAILED - thoughts/shared/field-freshness.json', m: freshness.error, tone: 'bad' });
  } else {
    const sd = freshness.stale_days;
    const checked = freshness.checked_at ? aestDate(new Date(freshness.checked_at)) + ' · checked ' + fmtAge(ageH(Date.parse(freshness.checked_at))) : 'checked_at missing';
    if (sd == null) rows.push({ k: 'Spine canary', v: 'UNKNOWN - treat as stale', m: 'field-freshness.json stale_days null (gmail canary gave nothing) · ' + checked, tone: 'bad' });
    else if (sd > 2) rows.push({ k: 'Spine canary', v: 'STALE - ' + sd + 'd behind', m: 'field-freshness.json · ' + checked, tone: 'bad' });
    else rows.push({ k: 'Spine canary', v: 'OK - ' + sd + 'd', m: 'field-freshness.json · ' + checked, tone: 'ok' });
  }

  // shipped this week: latest.json is a 1-DAY window, so aggregate the dated daily files
  const shipped = safe('cross-codebase-feed weekly', () => {
    const dir = P('thoughts/shared/cross-codebase-feed');
    const since = ymdShift(TODAY, -6);
    const seen = new Set(); let events = 0, commits = 0; const repos = new Set(); const days = []; let newest = null;
    for (let i = 6; i >= 0; i--) {
      const d = ymdShift(TODAY, -i);
      const f = join(dir, d + '.json');
      if (!existsSync(f)) continue;
      days.push(d); newest = d;
      for (const e of JSON.parse(readFileSync(f, 'utf8')).events || []) {
        const key = `${e.type}|${e.repo}|${e.sha || e.path || ''}|${e.date || ''}`;
        if (seen.has(key)) continue;
        seen.add(key); events++; repos.add(e.repo);
        if (e.type === 'commit') commits++;
      }
    }
    if (!days.length) throw new Error('no daily feed files in window ' + since + '..' + TODAY);
    return { events, commits, repos: repos.size, days: days.length, newest, since };
  });
  if (shipped.failed) rows.push({ k: 'Shipped this week', v: 'FAILED - thoughts/shared/cross-codebase-feed/', m: shipped.error, tone: 'bad' });
  else {
    const behind = daysUntil(shipped.newest) * -1; // days the newest daily file lags today
    rows.push({
      k: 'Shipped this week', v: `${shipped.commits} commits · ${shipped.events} events · ${shipped.repos} repos`,
      m: `cross-codebase-feed ${shipped.days} daily files ${shipped.since}..${TODAY} · newest ${shipped.newest}` + (behind > 1 ? ` (${behind}d behind)` : ''),
      tone: behind > 1 ? 'stale' : '',
    });
  }
  return { rows };
});

// ════ BAND 2 - THE SYSTEM (12 nodes) ════
const system = safe('the-system', () => {
  const dotOf = (state) => (state === 'wired' ? '●' : state === 'thin' ? '◐' : '○');
  const card = (name, state, note, href, tone) => ({ name, dot: dotOf(state), state, note, href, tone: tone || (state === 'wired' ? 'ok' : state === 'thin' ? 'warn' : 'mut') });

  // ENTITIES - static doctrine
  const cutD = daysUntil('2026-06-30'), butD = daysUntil('2026-06-26');
  const entities = [
    card('ACT Pty Ltd', 'wired', 'trading entity · ACN 697 347 676 · R&D claimant', CC + '/company'),
    card('Sole trader (NJ Marchesi)', 'thin', 'winding down - dies 30 Jun 2026 (' + cutD + 'd)', CC + '/company'),
    card('Goods = The Butterfly Movement Ltd', 'thin', 'DGR charity vehicle · board handover 26 Jun 2026 (' + butD + 'd)', CC + '/company'),
    card('A Kind Tractor Ltd', 'unwired', 'dormant charity · not DGR · not the Goods vehicle', CC + '/company'),
  ];

  // PROJECTS - health from project-pipelines-latest.json activity
  const projects = safe('project-pipelines-latest.json', () => {
    const j = JSON.parse(readFileSync(P('thoughts/shared/reports/project-pipelines-latest.json'), 'utf8'));
    const repAge = ageH(Date.parse(j.generated_at));
    const latest = {};
    for (const p of j.projects || []) {
      let max = null;
      for (const pl of p.pipelines || []) {
        const t = Date.parse(pl.latest_activity_at);
        if (!isNaN(t) && (max == null || t > max)) max = t;
      }
      latest[p.project_code] = max;
    }
    const mk = (name, code, href) => {
      const t = latest[code];
      if (t === undefined) return card(name, 'unwired', code + ': no pipeline in report', href);
      if (t === null) return card(name, 'unwired', code + ': pipelines carry no activity dates', href);
      const d = Math.round((Date.now() - t) / dayMs);
      const state = d <= 14 ? 'wired' : d <= 45 ? 'thin' : 'unwired';
      return card(name, state, code + ': pipeline activity ' + d + 'd ago', href);
    };
    return {
      cards: [
        mk('Goods', 'ACT-GD', CC + '/company'),
        mk('Harvest', 'ACT-HV', CC + '/company'),
        mk('JusticeHub / Empathy Ledger', 'ACT-JH', CC + '/company'),
        mk('CivicGraph', 'ACT-CG', CC + '/company'),
      ],
      meta: 'project-pipelines-latest.json · generated ' + aestDate(new Date(j.generated_at)) + ' · ' + fmtAge(repAge),
      stale: repAge > 36,
    };
  });

  // SYSTEMS - health from artifact freshness (source named on each card)
  const systems = safe('systems-health', () => {
    const cards = [];
    if (snap.failed) cards.push(card('Finance spine', 'unwired', 'money snapshot FAILED: ' + snap.error, CC + '/finance/reconciliation', 'bad'));
    else cards.push(card('Finance spine', snap.age <= 36 ? 'wired' : snap.age <= 72 ? 'thin' : 'unwired',
      'money snapshot as of ' + snap.j.today + ' (' + fmtAge(snap.age).replace(' ago', ' old') + ')', CC + '/finance/reconciliation'));

    if (freshness.failed) cards.push(card('The Field', 'unwired', 'field-freshness.json FAILED: ' + freshness.error, CC + '/api/field/surface?name=morning', 'bad'));
    else {
      const sd = freshness.stale_days;
      cards.push(card('The Field', sd != null && sd <= 2 ? 'wired' : sd == null ? 'thin' : 'unwired',
        'field-freshness.json stale_days ' + (sd == null ? 'null (unknown - treat as stale)' : sd + 'd'), CC + '/api/field/surface?name=morning'));
    }

    const fl = safe('four-lanes-today.md', () => {
      const md = readFileSync(P('wiki/cockpit/four-lanes-today.md'), 'utf8');
      const updated = (md.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m) || [])[1];
      if (!updated) throw new Error('no updated: in frontmatter');
      return updated;
    });
    if (fl.failed) cards.push(card('Wiki / Brain', 'unwired', 'four-lanes-today.md FAILED: ' + fl.error, CC + '/company', 'bad'));
    else {
      const d = -daysUntil(fl);
      cards.push(card('Wiki / Brain', d <= 8 ? 'wired' : d <= 16 ? 'thin' : 'unwired', 'four-lanes-today.md updated ' + fl + ' (' + d + 'd ago, weekly cadence)', CC + '/company'));
    }

    if (freshness.failed) cards.push(card('Comms / CRM', 'unwired', 'gmail spine canary FAILED: ' + freshness.error, CC + '/company', 'bad'));
    else cards.push(card('Comms / CRM', freshness.gmail_max_created ? 'wired' : 'unwired',
      'gmail spine max ' + (freshness.gmail_max_created ? aestDate(new Date(freshness.gmail_max_created)) : 'unknown (canary returned null)'), CC + '/company'));
    return { cards };
  });

  const groups = [{ name: 'ENTITIES', cards: entities, meta: 'static doctrine (act-core-facts)' }];
  groups.push(projects.failed
    ? { name: 'PROJECTS', cards: [], failed: 'FAILED - thoughts/shared/reports/project-pipelines-latest.json: ' + projects.error }
    : { name: 'PROJECTS', cards: projects.cards, meta: projects.meta + (projects.stale ? ' - STALE (rule: 36h)' : ''), stale: projects.stale });
  groups.push(systems.failed
    ? { name: 'SYSTEMS', cards: [], failed: 'FAILED - systems health: ' + systems.error }
    : { name: 'SYSTEMS', cards: systems.cards, meta: 'health from each artifact, named per card' });
  return { groups };
});

// ════ BAND 3 - THE MONEY ENGINE ════
const money = safe('the-money-engine', () => {
  if (snap.failed) throw new Error('money snapshot: ' + snap.error);
  const { j, rel, age, wroteAge } = snap;
  const stale = age > 36; // the rule: grey past 36h from the as-of date
  const head = 'Source: ' + rel + ' · as of ' + j.today + ' (' + fmtAge(age).replace(' ago', ' old') + ') · file written ' + fmtAge(wroteAge) + (stale ? ' - STALE (rule: 36h from as-of), numbers greyed' : '');
  const num = (k, v, m) => (typeof v === 'number'
    ? { k, v: $n(v), m, href: CC + '/company', tone: stale ? 'stale' : '' }
    : { k, v: 'FAILED - field missing in snapshot', m, tone: 'bad' });
  const rows = [
    num('Receivables', j.incoming?.receivables, '.incoming.receivables · ' + rel),
    num('Grants in flight', j.incoming?.grantsInFlight, '.incoming.grantsInFlight · ' + rel),
    num('Weighted pipeline (90d window)', j.incoming?.pipelineWeighted, '.incoming.pipelineWeighted · ' + rel),
    num('Projected 90d (snapshot sum)', j.incoming?.projected90d, '.incoming.projected90d · ' + rel),
    (typeof j.coverage?.transactions?.pct === 'number'
      ? { k: 'Tagging coverage (transactions)', v: j.coverage.transactions.pct.toFixed(1) + '%', m: '.coverage.transactions.pct (' + j.coverage.transactions.tagged + '/' + j.coverage.transactions.total + ') · ' + rel, href: CC + '/finance/reconciliation', tone: stale ? 'stale' : '' }
      : { k: 'Tagging coverage (transactions)', v: 'FAILED - field missing in snapshot', m: rel, tone: 'bad' }),
    // withheld in v1 - see the .cash trace in this script's header
    { k: 'Cash on hand', v: 'withheld - no pipeline', m: 'snapshot .cash is the whole xero_bank_accounts mirror, not ACT cash on hand', tone: 'mut' },
    { k: 'Runway', v: 'withheld - no pipeline', m: 'needs a trusted cash + burn pipeline first', tone: 'mut' },
    { k: 'Monthly burn', v: 'withheld - no pipeline', m: 'needs a trusted cash + burn pipeline first', tone: 'mut' },
    { k: 'R&D basis $', v: 'withheld - no pipeline', m: '81% of the FY26 R&D flag was founder drawings - basis unsettled', tone: 'mut' },
    // pure date arithmetic + static doctrine
    { k: 'First $120K-each pay run', v: daysUntil('2026-07-01') + ' days (window opens 1 Jul 2026)', m: 'D11.2 founder pay from Jul 2026 · date arithmetic', href: CC + '/company' },
    { k: 'Top-up gate', v: 'RULE PENDING (7 Jul)', m: 'static label until the founders’ session ratifies', tone: 'mut' },
    { k: 'R&D window', v: 'lodge Jul 2026 - 30 Apr 2027', m: 'static doctrine (Path C, FY25-26 claim)', tone: 'mut' },
  ];
  return { head, stale, rows };
});

// ════ BAND 4 - THE DRUMBEAT ════
const drum = safe('the-drumbeat', () => {
  const rows = [];
  const beat = (time, name, fresh, tone, isNew) => rows.push({ time, name, fresh, tone: tone || '', isNew: !!isNew });
  const fileBeat = (time, name, p, rel, ruleH, isNew) => {
    if (!existsSync(p)) return beat(time, name, rel + ' not present yet', 'mut', isNew);
    const h = ageH(mtimeOf(p));
    beat(time, name, rel + ' · ' + fmtAge(h), h > ruleH ? 'stale' : 'ok', isNew);
  };

  fileBeat('6:50', 'field read', P('thoughts/shared/the-field-morning.html'), 'the-field-morning.html', 36);
  beat('7:30', 'focus push', 'Telegram push only - no artifact to check', 'mut');
  beat('8:00 Mon', 'weekly recon', safe('weekly-digest', () => {
    const dir = P('wiki/cockpit');
    const f = readdirSync(dir).filter((x) => /^weekly-digest-\d{4}-\d{2}-\d{2}\.md$/.test(x)).sort().pop();
    if (!f) throw new Error('no weekly-digest files');
    return 'wiki/cockpit/' + f + ' · ' + fmtAge(ageH(mtimeOf(join(dir, f))));
  }), null);
  if (typeof rows[rows.length - 1].fresh === 'object') { // weekly-digest safe() failed
    const r = rows[rows.length - 1]; r.fresh = 'FAILED - wiki/cockpit/weekly-digest-*.md: ' + r.fresh.error; r.tone = 'bad';
  } else { const r = rows[rows.length - 1]; r.tone = /(\d+)d ago/.test(r.fresh) && Number(RegExp.$1) > 8 ? 'stale' : 'ok'; }
  if (snap.failed) beat('8:15', 'money snapshot', 'FAILED - money-command-snapshots: ' + snap.error, 'bad');
  else beat('8:15', 'money snapshot', snap.file + ' · as of ' + snap.j.today + ' (' + fmtAge(snap.age).replace(' ago', ' old') + ') · written ' + fmtAge(snap.wroteAge), snap.age > 36 ? 'stale' : 'ok');
  beat('8:20', 'whole picture', 'this page - built just now', 'ok', true);
  const mc = P('thoughts/shared/cockpit/monday-card/latest.md');
  if (existsSync(mc)) fileBeat('8:45 Mon', 'Monday card', mc, 'monday-card/latest.md', 8 * 24, true);
  else beat('8:45 Mon', 'Monday card', 'first card Mon 15 Jun - monday-card/latest.md not present yet', 'mut', true);
  beat('1st of month', 'monthly close', 'no artifact tracked yet', 'mut');
  const fs3 = nextFoundersSession(); const kit = ymdShift(fs3, -3); // the Saturday before the first Tuesday
  beat('Sat before 1st Tue', "founders' kit", 'first kit ' + longOf(kit) + ' (' + daysUntil(kit) + 'd) - no artifact yet', 'mut', true);
  const q = ['2026-07-01', '2026-10-01', '2027-01-01', '2027-04-01'].find((d) => d >= TODAY);
  beat('1 Jul / Oct / Jan / Apr', 'quarterly', 'next ' + longOf(q) + ' (' + daysUntil(q) + 'd)', '');

  const dec = safe('founders-os plan section 10', () => {
    const p = P('thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md');
    const md = readFileSync(p, 'utf8');
    const n = (md.match(/^\| N\d+ \|/gm) || []).length;
    const s = (md.match(/^\| S\d+ \|/gm) || []).length;
    return { n, s, mtime: mtimeOf(p) };
  });
  const decisions = dec.failed
    ? 'FAILED - thoughts/shared/plans/2026-06-10-act-whole-picture-founders-os.md: ' + dec.error
    : `Open decisions: ${dec.n + dec.s} (${dec.n} with Nic + ${dec.s} for Standard Ledger) · section 10 table rows of 2026-06-10-act-whole-picture-founders-os.md · doc updated ${aestDate(new Date(dec.mtime))} ${fmtAge(ageH(dec.mtime))}`;

  return { rows, horizon: 'HORIZONS   2031 - 2036 - 2046 - 2056', decisions, decFailed: !!dec.failed };
});

// ════ render ════
const D = { builtAt: aestTime() + ' AEST · ' + aestLong(), week, system, money, drum };
const DATA = JSON.stringify(D).replace(/</g, '\\u003c');

const html = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>THE WHOLE PICTURE - A Curious Tractor</title><style>
:root{--bg:#0b0e14;--panel:#121826;--ink:#e6edf3;--mut:#8b98a9;--line:#28323f;--ok:#3ddc97;--warn:#ffb454;--bad:#ff5d5d;--warm:#5fb3ff;--stale:#71808f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
header{padding:16px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px}
h1{margin:0;font-size:17px;letter-spacing:.5px}h1 .co{color:var(--mut);font-weight:400}
.built{color:var(--mut);font-size:12.5px}
section{padding:14px 24px 4px}
h2{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:var(--warm)}
.mets{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.met{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 13px}
.met .k{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)}
.met .v{font-size:16px;font-weight:600;display:block;margin:3px 0 2px;color:var(--ink);text-decoration:none}
.met .m{font-size:11px;color:var(--mut)}
.met.ok .v{color:var(--ok)}.met.warn .v{color:var(--warn)}.met.bad .v{color:var(--bad)}
.met.stale .v,.met.stale .k{color:var(--stale)}.met.mut .v{color:var(--mut);font-weight:400}
.group{margin-bottom:12px}.group h3{margin:0 0 7px;font-size:11px;letter-spacing:1px;color:var(--mut)}
.group h3 .gm{font-weight:400;text-transform:none;letter-spacing:0;margin-left:8px}
.group h3 .gm.stale{color:var(--stale)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.node{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:9px 12px;text-decoration:none;color:var(--ink);display:block}
.node .dot{margin-right:7px}.node.ok .dot{color:var(--ok)}.node.warn .dot{color:var(--warn)}.node.mut .dot{color:var(--stale)}.node.bad .dot{color:var(--bad)}
.node .state{font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin:2px 0}
.node.ok .state{color:var(--ok)}.node.warn .state{color:var(--warn)}.node.mut .state{color:var(--stale)}.node.bad .state{color:var(--bad)}
.node .m{font-size:11px;color:var(--mut)}
.asof{font-size:11.5px;color:var(--mut);margin-bottom:9px}.asof.stale{color:var(--stale)}
.cron{display:flex;gap:10px;align-items:baseline;font-size:12.5px;padding:4px 0;border-bottom:1px dashed #1c2533}
.cron .t{color:var(--warm);font-variant-numeric:tabular-nums;min-width:130px}
.cron b{font-weight:600}.cron .m{color:var(--mut);font-size:11.5px}
.cron.ok .m{color:var(--ok)}.cron.stale .m,.cron.stale b{color:var(--stale)}.cron.bad .m{color:var(--bad)}.cron.mut .m{color:var(--mut)}
.new{color:var(--warm);font-size:10.5px;font-weight:400}
.horizon{margin:12px 0 4px;font-size:12px;letter-spacing:2px;color:var(--warm)}
.dec{font-size:12px;color:var(--mut);padding:4px 0 8px}.dec.bad{color:var(--bad)}
.failed{background:#3a1414;color:var(--bad);border:1px solid var(--bad);border-radius:8px;padding:9px 12px;font-size:12.5px;margin-bottom:10px}
footer{padding:14px 24px 22px;color:var(--mut);font-size:11.5px;border-top:1px solid var(--line);margin-top:12px}
footer code{color:var(--ink);background:var(--panel);padding:2px 6px;border-radius:5px}
</style></head><body>
<header><h1>THE WHOLE PICTURE <span class=co>- A Curious Tractor</span></h1><div class=built>built ${D.builtAt}</div></header>
<section><h2>This week</h2><div id=b-week class=mets></div></section>
<section><h2>The system</h2><div id=b-system></div></section>
<section><h2>The money engine</h2><div id=b-money></div></section>
<section><h2>The drumbeat</h2><div id=b-drum></div></section>
<footer>regenerate: <code>node scripts/build-whole-picture.mjs</code> &nbsp;·&nbsp; every number carries its as-of date and source file; numbers grey to <span style="color:var(--stale)">#71808f</span> past their staleness rule; a missing input renders FAILED, never a guess; cash on hand / runway / burn / R&amp;D basis are withheld in v1 (no trusted pipeline).</footer>
<script>
const D=${DATA};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const met=r=>'<div class="met '+(r.tone||'')+'"><div class=k>'+esc(r.k)+'</div>'+(r.href?'<a class=v href="'+r.href+'">'+esc(r.v)+'</a>':'<span class=v>'+esc(r.v)+'</span>')+(r.m?'<div class=m>'+esc(r.m)+'</div>':'')+'</div>';
const band=(id,b,fn)=>{$(id).innerHTML=b&&b.failed?'<div class=failed>FAILED - '+esc(b.label||'')+': '+esc(b.error)+'</div>':fn(b);};
band('b-week',D.week,b=>b.rows.map(met).join(''));
band('b-system',D.system,b=>b.groups.map(g=>'<div class=group><h3>'+esc(g.name)+(g.meta?'<span class="gm'+(g.stale?' stale':'')+'">'+esc(g.meta)+'</span>':'')+'</h3>'+(g.failed?'<div class=failed>'+esc(g.failed)+'</div>':'<div class=cards>'+g.cards.map(c=>'<a class="node '+(c.tone||'')+'" href="'+c.href+'"><span class=dot>'+c.dot+'</span><b>'+esc(c.name)+'</b><div class=state>'+esc(c.state)+'</div><div class=m>'+esc(c.note)+'</div></a>').join('')+'</div>')+'</div>').join(''));
band('b-money',D.money,b=>'<div class="asof'+(b.stale?' stale':'')+'">'+esc(b.head)+'</div><div class=mets>'+b.rows.map(met).join('')+'</div>');
band('b-drum',D.drum,b=>b.rows.map(r=>'<div class="cron '+(r.tone||'')+'"><span class=t>'+esc(r.time)+'</span><b>'+esc(r.name)+(r.isNew?' <span class=new>(new)</span>':'')+'</b><span class=m>'+esc(r.fresh)+'</span></div>').join('')+'<div class=horizon>'+esc(b.horizon)+'</div><div class="dec'+(b.decFailed?' bad':'')+'">'+esc(b.decisions)+'</div>');
</script></body></html>`;

const OUT = P('thoughts/shared/the-whole-picture.html');
writeFileSync(OUT, html);
console.log('Wrote thoughts/shared/the-whole-picture.html\n');
for (const [name, b] of [['THIS WEEK', week], ['THE SYSTEM', system], ['THE MONEY ENGINE', money], ['THE DRUMBEAT', drum]])
  console.log(`  ${b.failed ? 'FAILED ' : 'ok     '}${name}${b.failed ? ' - ' + b.error : ''}`);
if (!money.failed && money.stale) console.log('  note: money snapshot is past the 36h rule - numbers greyed, as designed');
console.log('\nOpen:  open thoughts/shared/the-whole-picture.html');
