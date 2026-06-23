#!/usr/bin/env node
/**
 * SL clean-up Gmail DEEP hunt — second-pass receipt recovery for the high-value GAP lines.
 *
 * The first pass (sl-cleanup-gmail-hunt.mjs) used a narrow ±12-day window + a bare vendor
 * token. This deep pass, for the still-missing real-merchant lines, adds:
 *   - curated per-vendor queries + sender-domain guesses (hotels, car hire, B2B suppliers)
 *   - a wide ±40-day window (hotels/cars confirm weeks before the card settles)
 *   - body-amount CONFIRMATION: fetches the full body of the top candidates and checks the
 *     exact dollar amount appears → upgrades an amount-only guess to a real vendor+amount hit.
 *
 * READ-ONLY. Writes thoughts/shared/handoffs/sl-cleanup/gmail-deephunt.json + a readable report.
 * Skips gracefully if the Google service-account secret can't be loaded.
 *
 * Usage: node scripts/sl-cleanup-gmail-deephunt.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const digest = JSON.parse(readFileSync(path.join(DIR, 'digest.json'), 'utf8'));
const verdicts = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));
const statusByI = new Map(verdicts.map(v => [v.i, v.receipt_status]));

// ---- secrets / auth (same path as sl-cleanup-gmail-hunt.mjs) ----
let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  secretCache = {};
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' });
    for (const s of JSON.parse(result)) secretCache[s.key] = s.value;
  } catch { /* fall through to env */ }
  return secretCache;
}
const getSecret = (n) => loadSecrets()[n] || process.env[n];
async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured (Bitwarden + env both empty)');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: userEmail });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}
function getDelegatedUsers() {
  const multi = getSecret('GOOGLE_DELEGATED_USERS');
  if (multi) return multi.split(',').map(e => e.trim()).filter(Boolean);
  const single = getSecret('GOOGLE_DELEGATED_USER');
  return single ? [single.trim()] : [];
}

// ---- curated deep queries for the named high-value GAP vendors ----
// key = lowercase substring to detect in particulars → array of query bodies (no date window yet)
const CURATED = [
  { match: 'container options', qs: ['(from:containeroptions.com.au OR "container options") (invoice OR receipt OR tax)', '"container options"'] },
  { match: 'carla furnishers',  qs: ['("carla furnishers" OR ciccone) (invoice OR receipt OR tax)', '"carla furnishers"'] },
  { match: 'adge hotel',        qs: ['(from:adgehotel.com.au OR "adge hotel" OR "adge apartment") (booking OR confirmation OR receipt OR invoice OR folio)', 'from:booking.com (adge OR "surry hills")'] },
  { match: 'hertz',             qs: ['(from:hertz.com OR from:hertz.com.au OR "hertz") (receipt OR invoice OR rental OR "rental record")'] },
  { match: 'bargaincarrentals', qs: ['(from:bargaincarrentals.com OR "bargain car rentals" OR "bargaincarrentals") (receipt OR invoice OR confirmation OR rental)'] },
  { match: 'steelmart',         qs: ['("steelmart" OR from:steelmart) (invoice OR receipt OR tax)'] },
  { match: 'kogan',             qs: ['(from:kogan.com OR "kogan") (receipt OR invoice OR order OR "tax invoice")'] },
  { match: 'airtasker',         qs: ['(from:airtasker.com OR "airtasker") (receipt OR invoice OR payment)'] },
  { match: 'alicetronics',      qs: ['("alicetronics") (invoice OR receipt OR tax)'] },
  { match: 'colemans printing', qs: ['("colemans printing" OR "colemans") (invoice OR receipt OR tax)'] },
  { match: 'bearpep',           qs: ['("bearpep" OR "bear pep") (invoice OR receipt OR tax)'] },
  { match: 'tullah',            qs: ['("tullah lakeside" OR "tullah") (booking OR confirmation OR receipt OR invoice)'] },
  { match: 'colyton hotel',     qs: ['("colyton hotel" OR "colyton") (booking OR confirmation OR receipt OR invoice)'] },
  { match: 'australian tourist park', qs: ['("australian tourist park" OR "tourist park") (booking OR confirmation OR receipt OR invoice)'] },
  { match: 'tradexpr',          qs: ['("hannah st" OR "hannah street") (receipt OR invoice OR tax)'] },
  { match: 'sp retro',          qs: ['("sp retro" OR "retro outdoor") (invoice OR receipt OR tax)'] },
  { match: 'jmc no2',           qs: ['("jmc" OR kenilworth) (invoice OR receipt OR tax)'] },
];

function genericQueries(particulars) {
  // strip refs + noise, keep alpha tokens >=4 chars
  let s = String(particulars || '').split('|')[0]
    .replace(/\b[A-Z]?\d{6,}\b/g, ' ')
    .replace(/\bSQ ?\*?|\bSP ?\*?/gi, ' ')
    .replace(/\b(thanks|refund|transfer|debit|credit|purchase|card|money|pty|ltd)\b/gi, ' ')
    .replace(/[^A-Za-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = s.split(' ').filter(w => w.length >= 4);
  if (!tokens.length) return [];
  const phrase = tokens.slice(0, 3).join(' ').toLowerCase();
  const first = tokens[0].toLowerCase();
  return [
    `("${phrase}") (receipt OR invoice OR tax OR confirmation OR order OR booking)`,
    `(from:${first}) (receipt OR invoice OR tax)`,
  ];
}

function withWindow(body, txDate, days = 40) {
  const d = new Date(txDate);
  const after = new Date(d.getTime() - days * 86400000).toISOString().slice(0, 10).replace(/-/g, '/');
  const before = new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10).replace(/-/g, '/');
  return `${body} after:${after} before:${before}`;
}

function amountVariants(amt) {
  const a = Math.abs(amt);
  const two = a.toFixed(2);                                    // 5904.05
  const comma = two.replace(/\B(?=(\d{3})+(?!\d))/g, ',');     // 5,904.05
  const intComma = Math.round(a).toLocaleString('en-US');      // 5,904
  return [...new Set([two, comma, intComma, String(Math.round(a))])];
}

function decodeBody(payload) {
  let out = '';
  const walk = (p) => {
    if (!p) return;
    if (p.body?.data && /text\/(plain|html)/.test(p.mimeType || '')) {
      out += Buffer.from(p.body.data, 'base64').toString('utf8') + ' ';
    }
    (p.parts || []).forEach(walk);
  };
  walk(payload);
  return out.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
}

// ---- target selection: real-merchant lines still missing a receipt ----
const targets = digest
  .filter(d => ['GAP_PLEASE_PROVIDE', 'GMAIL_CANDIDATE', 'RECEIPT_VENDOR_MISMATCH'].includes(statusByI.get(d.i)))
  .filter(d => d.dir === 'spent')                  // income/transfers don't have vendor receipts
  .sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));

console.log(`Deep-hunting ${targets.length} still-missing merchant lines (sorted by value)...\n`);

let gmailClients;
try {
  const users = getDelegatedUsers();
  if (!users.length) throw new Error('no delegated users configured');
  gmailClients = await Promise.all(users.map(async u => [u, await getGmailForUser(u)]));
  console.log(`Authed mailboxes: ${gmailClients.map(c => c[0]).join(', ')}\n`);
} catch (e) {
  console.log(`⚠ Gmail auth unavailable — cannot deep-hunt (${e.message}).`);
  console.log('  Ben must add the service-account secret / Sheets path; nothing written.');
  process.exit(2);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function queriesFor(d) {
  const lc = (d.particulars || '').toLowerCase();
  const curated = CURATED.find(c => lc.includes(c.match));
  const bodies = curated ? curated.qs : genericQueries(d.particulars);
  return bodies.map(b => withWindow(b, d.date, 40));
}

const report = [];
for (const d of targets) {
  const queries = await queriesFor(d);
  const amtVars = amountVariants(d.amt);
  const seen = new Set();
  const cands = [];
  for (const [mailbox, client] of gmailClients) {
    for (const q of queries) {
      try {
        const { data: list } = await client.users.messages.list({ userId: 'me', q, maxResults: 4 });
        for (const m of list.messages || []) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          // full fetch to confirm amount in body
          const full = await client.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
          const h = full.data.payload?.headers || [];
          const getH = (n) => h.find(x => x.name === n)?.value || '';
          const body = decodeBody(full.data.payload);
          const amtHit = amtVars.find(v => body.includes(v)) || null;
          cands.push({ mailbox, from: getH('From'), subject: getH('Subject'), date: getH('Date'), gmail_id: m.id, amount_confirmed: amtHit });
          await sleep(100);
        }
      } catch { /* per-query ignore */ }
      await sleep(90);
    }
  }
  // rank: amount-confirmed first
  cands.sort((a, b) => (b.amount_confirmed ? 1 : 0) - (a.amount_confirmed ? 1 : 0));
  const confirmed = cands.filter(c => c.amount_confirmed);
  const tag = confirmed.length ? '✅ AMOUNT-MATCH' : cands.length ? '🔶 candidates' : '❌ none';
  console.log(`${tag.padEnd(16)} ${d.date} $${String(Math.abs(d.amt)).padStart(9)} ${(d.particulars.split('|')[0]).trim().slice(0,36).padEnd(37)}` +
    (confirmed.length ? ` → ${confirmed[0].from.slice(0,40)} | ${confirmed[0].subject.slice(0,46)}` :
     cands.length ? ` → ${cands.length} unconfirmed cand(s)` : ''));
  report.push({ i: d.i, date: d.date, amount: d.amt, particulars: d.particulars, status: statusByI.get(d.i), candidates: cands });
}

writeFileSync(path.join(DIR, 'gmail-deephunt.json'), JSON.stringify(report, null, 2));
const matched = report.filter(r => r.candidates.some(c => c.amount_confirmed)).length;
const anyCand = report.filter(r => r.candidates.length).length;
console.log(`\nDone. ${matched}/${targets.length} lines got an AMOUNT-CONFIRMED receipt; ${anyCand} had any candidate.`);
console.log(`→ ${DIR}/gmail-deephunt.json`);
