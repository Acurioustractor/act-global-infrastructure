#!/usr/bin/env node
/**
 * One command that answers "is every door into ACT open, and is anyone behind it".
 *
 * Three questions, in the order they can fail:
 *   1. Does the origin answer?          HTTP, following redirects.
 *   2. Can a reply reach the sender?    MX for every domain that publishes an address.
 *   3. Is anyone reading what arrived?  Unactioned rows in every intake table.
 *
 * The registry below is the estate. It is code rather than a document because the
 * 2026-08-29 survey was wrong within a day: three tables had grown, and it never
 * listed oonchiumpa.com.au or picc.studio at all. A document cannot be run.
 *
 * The authority for what exists is `vercel domains ls`, not this file. When those
 * disagree, this file is stale. Re-run it and fix the registry.
 *
 *   node scripts/check-estate.mjs           # everything
 *   node scripts/check-estate.mjs --web     # skip the database half
 *   node scripts/check-estate.mjs --quiet   # failures and warnings only
 *
 * Exit 1 if anything is FAIL. WARN never fails the run: a warn is a thing that is
 * known-broken and already ticketed, and a gate that cries every day gets muted.
 */

import { resolveMx } from 'node:dns/promises';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------- the estate

/** Origins that serve a form a member of the public can submit. */
const ORIGINS = [
  { name: 'A Curious Tractor (hub)', url: 'https://act.place', expect: 200, lands: 'https://www.act.place/', forms: 7, note: 'Webflow. 445 rows, none routed (#91)' },
  { name: 'Goods on Country',        url: 'https://www.goodsoncountry.com', expect: 200, forms: 12 },
  { name: 'JusticeHub + CONTAINED',  url: 'https://justicehub.com.au', expect: 200, forms: 22 },
  { name: 'The Harvest Witta',       url: 'https://www.theharvestwitta.com.au', expect: 200, forms: 16 },
  { name: 'Empathy Ledger',          url: 'https://empathyledger.com', expect: 200, forms: 6 },
  { name: 'Oonchiumpa',              url: 'https://oonchiumpa.com.au', expect: 200, lands: 'https://www.oonchiumpa.com.au/', forms: null, note: 'ACT-OO is a duty-of-care code. Forms never surveyed' },
  { name: 'Mounty Yarns',            url: 'https://mounty-yarns.vercel.app', expect: 200, forms: null, note: 'ACT-MY is a duty-of-care code. Next.js, no forms in the initial HTML, never crawled' },
  { name: 'PICC (Great Palm Island)', url: 'https://great-palm-island-picc.vercel.app', expect: 200, forms: null, note: 'ACT-PI is a duty-of-care code. Live behind a domain that does not resolve' },
  { name: 'CivicGraph / GrantScope', url: 'https://civicgraph.app', expect: 200, warnOn: [429], forms: 8, note: '429 is Vercel challenge mode, not an outage' },
  { name: 'ACT Farm / BCV',          url: 'https://act-farm.vercel.app', expect: 200, forms: 5, note: 'No working branded domain' },
  { name: 'ACT Regenerative Studio', url: 'https://act-regenerative-studio.vercel.app', expect: 200, forms: 5 },
  { name: 'CAMPFIRE / BG Fit',       url: 'https://campfire-website-amber.vercel.app', expect: 200, forms: 2 },
  { name: 'JusticeHub beta',         url: 'https://acurioustractor.github.io/justicehub/', expect: 200, forms: 1, warn: 'Answers 200 and discards 100% of submissions. Take out of service, do not wire up' },
];

/** Hosts that are not origins: they redirect, or they are meant to be dead. */
const ALIASES = [
  { url: 'https://goodsoncountry.netlify.app', lands: 'https://www.goodsoncountry.com/', note: 'LOAD BEARING: printed QR stickers on beds point here. Do not delete' },
  { url: 'https://witta-swot-analysis.vercel.app', expectDead: false, warn: 'Byte-identical Harvest build still serving. Should redirect' },
  { url: 'https://picc.studio', expectDead: true, warn: 'Vercel holds this domain and palm-island-repository claims it as production, but it does not resolve' },
  { url: 'https://fromthecentre.com', expectDead: true, warnOn: [404] },
  { url: 'https://v2-rho-ochre.vercel.app', expectDead: true, warnOn: [404], note: 'Still the wiki canonicalUrl for Goods' },
  { url: 'https://justicehub-vert.vercel.app', expectDead: true, warnOn: [404] },
  { url: 'https://aesthetics.civicgraph.app', expectDead: true, warnOn: [404] },
  { url: 'https://blackcockatoovalley.com', expectDead: true },
  { url: 'https://empathyledger.org', expectDead: true },
  { url: 'https://theharvest.place', expectDead: true },
  { url: 'https://theharvest.community', expectDead: true },
  { url: 'https://justicehub.au', expectDead: true, note: 'Belongs to NSW Dept of Communities and Justice. Not acquirable' },
  { url: 'https://campfire.org.au', expectDead: true },
];

/** Every domain whose address is printed on a live page. No MX means it bounces. */
const MAILBOXES = [
  { address: 'hi@act.place', domain: 'act.place', mustReceive: true },
  { address: 'hello@empathyledger.com', domain: 'empathyledger.com', mustReceive: true, published: 'EL /contact x3, /share-your-story x2' },
  { address: 'notifications@goodsoncountry.com', domain: 'goodsoncountry.com', mustReceive: true, published: 'Goods notification sender: replies bounce' },
  { address: '@justicehub.com.au', domain: 'justicehub.com.au', mustReceive: true },
  { address: '@theharvestwitta.com.au', domain: 'theharvestwitta.com.au', mustReceive: true },
  { address: '@oonchiumpa.com.au', domain: 'oonchiumpa.com.au', mustReceive: true },
  { address: 'hello@acurioustractor.com', domain: 'acurioustractor.com', mustReceive: true, published: 'act-farm /connect, footer, submit-success message' },
  // The site sits on oonchiumpa.com.au, which HAS mail. The address it prints is on a
  // different domain that does not. It is the only contact route on the whole site.
  { address: 'admin@oonchiumpaconsultancy.com.au', domain: 'oonchiumpaconsultancy.com.au', mustReceive: true, published: 'oonchiumpa.com.au, the only contact route on the site' },
];

/**
 * Intake tables and what counts as unactioned in each. `filter` is PostgREST syntax.
 * A table with no way to say "handled" gets filter null: every row counts, which is
 * honest, because nothing in it can ever be marked done.
 */
const QUEUES = [
  { db: 'main', table: 'community_submissions',   filter: 'ghl_synced=eq.false', label: 'JusticeHub community submissions' },
  { db: 'main', table: 'org_action_items',        filter: 'status=neq.done',     label: 'JusticeHub org action items' },
  { db: 'main', table: 'contained_capture_log',   filter: 'receipt_sent=eq.false', label: 'CONTAINED Brisbane captures' },
  { db: 'main', table: 'organization_claims',     filter: 'status=eq.pending',   label: 'JusticeHub org claims' },
  { db: 'main', table: 'contact_submissions',     filter: 'status=eq.new',       label: 'JusticeHub contact' },
  { db: 'main', table: 'project_backers',         filter: null,                  label: 'JusticeHub backers (nobody is told)' },
  { db: 'main', table: 'witta_contributions',     filter: 'status=eq.pending',   label: "Harvest elders' memories" },
  { db: 'main', table: 'harvest_businesses',      filter: null,                  label: 'Harvest business registrations' },
  { db: 'main', table: 'harvest_events',          filter: null,                  label: 'Harvest event submissions' },
  { db: 'main', table: 'pulse_responses',         filter: null,                  label: 'Harvest community pulse' },
  { db: 'main', table: 'event_feedback',          filter: null,                  label: 'Harvest event feedback' },
  { db: 'main', table: 'place_corrections',       filter: 'status=eq.new',       label: 'CivicGraph place corrections' },
  { db: 'main', table: 'report_leads',            filter: null,                  label: 'CivicGraph report leads (no path can send one)' },
  { db: 'main', table: 'act_intake',              filter: 'ghl_status=eq.pending', label: 'Spine outbox, undelivered',
    on403: 'service_role has no grant. Apply 20260830010000_act_intake_service_role_grants.sql' },
  { db: 'main', table: 'act_duty_of_care_register', filter: 'acknowledged_at=is.null', label: 'DUTY OF CARE, unacknowledged', critical: true,
    on403: 'service_role has no grant. Apply 20260830010000_act_intake_service_role_grants.sql' },
  { db: 'goods', table: 'partnership_inquiries',  filter: 'status=eq.new',       label: 'Goods partnership inquiries' },
  { db: 'goods', table: 'bed_signals',            filter: null,                  label: 'Goods bed signals (notifies nobody)' },
  { db: 'el',   table: 'contact_submissions',     filter: null,                  label: 'Empathy Ledger contact' },
  { db: 'el',   table: 'deletion_requests',       filter: null,                  label: 'EL deletion requests', critical: true },
  { db: 'el',   table: 'storyteller_support_requests', filter: null,             label: 'EL storyteller support', critical: true },
  { db: 'el',   table: 'syndication_removal_requests', filter: null,             label: 'EL syndication removals', critical: true },
];

/** Which env var pair reaches which database. A missing key is reported, never skipped silently. */
const DATABASES = {
  main:  { ref: 'tednluwflfhxyucgwigh', url: 'SUPABASE_URL',       key: 'SUPABASE_SERVICE_ROLE_KEY' },
  el:    { ref: 'yvnuayzslukamizrlhwb', url: 'EL_SUPABASE_URL',    key: 'EL_SUPABASE_SERVICE_ROLE_KEY' },
  goods: { ref: 'cwsyhpiuepvdjtxaozwf', url: 'GOODS_SUPABASE_URL', key: 'GOODS_SUPABASE_SERVICE_ROLE_KEY' },
};


/**
 * Regression gate on the 2026-08-30 exposure sweep.
 *
 * Every `closed` table was readable by the project's public key that morning and must
 * not be again. Every `control` table must still answer 200 — without it a wholesale
 * key failure reads as a clean pass, which happened three times during the sweep and
 * is the reason this shape exists.
 *
 * Keys come from the Supabase CLI at run time rather than from env, because publishable
 * keys rotate and a stale copy here would fail closed for the wrong reason.
 */
const EXPOSURE = [
  { label: 'Goods', ref: 'cwsyhpiuepvdjtxaozwf', control: 'assets',
    closed: ['crm_activities', 'webhook_receipts', 'engagement_scores', 'crm_deals',
             'machine_commentary', 'admin_kv_state', 'linkedin_posts'] },
  { label: 'Palm Island', ref: 'uaxhjzqrdotoahjnxmbj', control: 'stories',
    closed: ['story_captures', 'service_notes', 'notifications', 'chat_messages', 'documents'] },
  { label: 'Empathy Ledger Enhanced', ref: 'yvnuayzslukamizrlhwb', control: 'stories',
    closed: ['_bio_backup_20260723', '_storyteller_bio_backup_20260723',
             'data_migration_20260806_story_import_consent_backup',
             '_clear_20260810_false_elder_reviewed', 'archived_collective_access_tokens'] },
  { label: 'Empathy Ledger main', ref: 'tednluwflfhxyucgwigh', control: 'phidu_lga_health',
    closed: [] },
  { label: 'ACT Farmhand', ref: 'bhwyqqbovcjoefezgfnq', control: null,
    closed: ['contact_review_decisions', 'contact_communications', 'knowledge_chunks'] },
  { label: 'Barkly Backbone', ref: 'gkwzdnzwpfpkvgpcbeeq', control: null,
    closed: ['document_themes', 'documents', 'referral_submissions'] },
];

function publicKey(ref) {
  try {
    const raw = execFileSync('supabase',
      ['projects', 'api-keys', '--project-ref', ref, '--reveal', '-o', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
    const keys = JSON.parse(raw);
    const pub = keys.find((k) => k.type === 'publishable');
    if (pub) return pub.api_key;
    const legacy = keys.find((k) => k.id === 'anon');
    return legacy ? legacy.api_key : null;
  } catch {
    return null;
  }
}

async function reachable(ref, key, table) {
  const r = await fetch(`https://${ref}.supabase.co/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return r.status;
}

// ---------------------------------------------------------------- plumbing

const args = new Set(process.argv.slice(2));
const WEB_ONLY = args.has('--web');
const QUIET = args.has('--quiet');

let pass = 0, warn = 0, fail = 0;
const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', D = '\x1b[2m', X = '\x1b[0m';

function line(state, label, detail) {
  if (state === 'PASS') { pass++; if (QUIET) return; }
  if (state === 'WARN') warn++;
  if (state === 'FAIL') fail++;
  const c = state === 'PASS' ? G : state === 'WARN' ? Y : R;
  console.log(`  ${c}${state}${X}  ${label.padEnd(38)} ${D}${detail ?? ''}${X}`);
}

function loadEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const p of [join(here, '..', '.env.local'), join(here, '..', '.env')]) {
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, 'utf8').split('\n')) {
      const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

async function probe(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'act-estate-check' } });
    return { status: r.status, landed: r.url };
  } catch {
    return { status: null, landed: null };
  } finally {
    clearTimeout(t);
  }
}

async function count(db, table, filter) {
  const cfg = DATABASES[db];
  const base = process.env[cfg.url];
  const key = process.env[cfg.key];
  if (!base || !key) return { missingCreds: true };
  const q = `${base}/rest/v1/${table}?select=id${filter ? `&${filter}` : ''}`;
  const r = await fetch(q, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!r.ok) return { error: `${r.status}` };
  const cr = r.headers.get('content-range');
  return { n: Number((cr ?? '').split('/')[1] ?? 0) };
}

// ---------------------------------------------------------------- the checks

loadEnv();
console.log('\n\x1b[1mACT estate health\x1b[0m  ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n');

console.log('\x1b[1mOrigins\x1b[0m  does the door open');
for (const o of ORIGINS) {
  const { status, landed } = await probe(o.url);
  const where = landed && o.lands && landed !== o.lands ? `landed ${landed}` : landed ? `${landed}` : 'no route';
  if (status === null) line('FAIL', o.name, `${o.url} unreachable`);
  else if (status === o.expect && o.warn) line('WARN', o.name, o.warn);
  else if (status === o.expect) line('PASS', o.name, `${status} ${o.forms ? `· ${o.forms} forms` : ''} ${o.note ? `· ${o.note}` : ''}`);
  else if ((o.warnOn ?? []).includes(status)) line('WARN', o.name, `${status} · ${o.note ?? ''}`);
  else line('FAIL', o.name, `expected ${o.expect}, got ${status} · ${where}`);
}

console.log('\n\x1b[1mAliases and dead hosts\x1b[0m  is anything pointing at a ghost');
for (const a of ALIASES) {
  const { status, landed } = await probe(a.url);
  const host = a.url.replace('https://', '');
  if (a.expectDead) {
    if (status === null) line('PASS', host, 'no route, as expected');
    else if ((a.warnOn ?? []).includes(status)) line('PASS', host, `${status}, as expected · ${a.note ?? ''}`);
    else line('WARN', host, `${a.warn ?? `answers ${status} but is expected dead`}`);
  } else if (a.lands) {
    if (landed === a.lands) line('PASS', host, `redirects correctly · ${a.note ?? ''}`);
    else line('FAIL', host, `expected ${a.lands}, landed ${landed ?? 'nowhere'} · ${a.note ?? ''}`);
  } else {
    line('WARN', host, a.warn ?? `answers ${status}`);
  }
}

console.log('\n\x1b[1mMailboxes\x1b[0m  can a reply reach the sender');
for (const m of MAILBOXES) {
  let mx = [];
  try { mx = await resolveMx(m.domain); } catch { mx = []; }
  if (mx.length) line('PASS', m.address, `${mx.length} MX · ${mx[0].exchange}`);
  else line('FAIL', m.address, `NO MX, every message bounces${m.published ? ` · published on ${m.published}` : ''}`);
}

if (!WEB_ONLY) {
  console.log('\n\x1b[1mQueues\x1b[0m  is anyone reading what arrived');
  for (const q of QUEUES) {
    const r = await count(q.db, q.table, q.filter);
    if (r.missingCreds) { line('WARN', q.label, `no credentials for ${DATABASES[q.db].ref} (set ${DATABASES[q.db].key})`); continue; }
    if (r.error === '403' && q.on403) { line('FAIL', q.label, q.on403); continue; }
    if (r.error) { line('WARN', q.label, `query failed ${r.error}`); continue; }
    if (r.n === 0) line('PASS', q.label, 'empty');
    else if (q.critical) line('FAIL', q.label, `${r.n} waiting · a person is owed a reply`);
    else line('WARN', q.label, `${r.n} waiting`);
  }
}


if (!WEB_ONLY) {
  console.log('\n\x1b[1mExposure\x1b[0m  is anything open again that we closed');
  for (const e of EXPOSURE) {
    const key = publicKey(e.ref);
    if (!key) { line('WARN', e.label, 'no public key (is the Supabase CLI logged in?)'); continue; }

    if (e.control) {
      const c = await reachable(e.ref, key, e.control);
      if (c !== 200) {
        line('WARN', e.label, `control ${e.control} returned ${c}, so a pass here would be meaningless`);
        continue;
      }
    }
    let open = [];
    for (const t of e.closed) {
      const st = await reachable(e.ref, key, t);
      if (st === 200) open.push(t);
    }
    if (open.length) line('FAIL', e.label, `REOPENED to the public key: ${open.join(', ')}`);
    else line('PASS', e.label, `${e.closed.length} closed table(s) still shut${e.control ? `, ${e.control} still serving` : ''}`);
  }
}

console.log(`\n  ${G}${pass} pass${X}   ${Y}${warn} warn${X}   ${R}${fail} fail${X}\n`);
if (fail > 0) console.log(`  ${D}Warnings are known and ticketed. A FAIL means a door is shut or a person is unanswered.${X}\n`);
process.exit(fail > 0 ? 1 : 0);
