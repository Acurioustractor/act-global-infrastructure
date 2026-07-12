#!/usr/bin/env node
/**
 * SL clean-up receipt confirmation — for a given set of line indices, re-fetch the best
 * receipt-like Gmail candidate (from gmail-deephunt.json) and confirm the exact $ amount ties.
 * Prints FOUND/NOT for the expected amount + every dollar figure in the body, so a booking
 * confirmation can be matched to the specific card charge (rejects wrong-booking matches).
 * READ-ONLY. Usage: node scripts/sl-cleanup-confirm-receipt.mjs 47 55 57 59 53 64
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const R = JSON.parse(readFileSync(path.join(DIR, 'gmail-deephunt.json'), 'utf8'));
const wanted = process.argv.slice(2).map(Number);

let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  secretCache = {};
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' });
    for (const s of JSON.parse(result)) secretCache[s.key] = s.value;
  } catch {}
  return secretCache;
}
const getSecret = (n) => loadSecrets()[n] || process.env[n];
async function gmailFor(u) {
  const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}
function decodeBody(payload) {
  let out = '';
  const walk = (p) => { if (!p) return;
    if (p.body?.data && /text\/(plain|html)/.test(p.mimeType || '')) out += Buffer.from(p.body.data, 'base64').toString('utf8') + ' ';
    (p.parts || []).forEach(walk); };
  walk(payload);
  return out.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
}
function attachments(payload) {
  const names = [];
  const walk = (p) => { if (!p) return; if (p.filename) names.push(p.filename); (p.parts || []).forEach(walk); };
  walk(payload);
  return names.filter(Boolean);
}
const VENDOR_HINT = process.env.VENDOR_HINT || '';
const receiptish = /receipt|invoice|tax invoice|order (is |complete|confirm)|confirmation|booking|itinerary|folio|rental|statement|completed/i;
const MKTG = /store-news|newsletter|news@|marketing|deals@|promo|@e\.kogan|sale|% off/i;

const clients = {};
async function getClient(u) { if (!clients[u]) clients[u] = await gmailFor(u); return clients[u]; }

for (const i of wanted) {
  const line = R.find(l => l.i === i);
  if (!line) { console.log(`#${i} not in deephunt set\n`); continue; }
  const amt = Math.abs(line.amount);
  const cands = (line.candidates || [])
    .map(c => ({ ...c, score: (c.amount_confirmed ? 2 : 0) + (receiptish.test(c.subject) ? 2 : 0) - (MKTG.test(c.from) || MKTG.test(c.subject) ? 3 : 0)
      + (VENDOR_HINT && (c.from.toLowerCase().includes(VENDOR_HINT) || c.subject.toLowerCase().includes(VENDOR_HINT)) ? 5 : 0) }))
    .sort((a, b) => b.score - a.score)
    .filter(c => c.score > 0)
    .slice(0, 3);
  console.log(`#${i}  expected $${amt}  ${line.particulars.split('|')[0].trim()}`);
  if (!cands.length) { console.log(`   ❌ no credible candidate\n`); continue; }
  for (const c of cands) {
    try {
      const gm = await getClient(c.mailbox);
      const full = await gm.users.messages.get({ userId: 'me', id: c.gmail_id, format: 'full' });
      const body = decodeBody(full.data.payload);
      const two = amt.toFixed(2), comma = two.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const found = body.includes(two) || body.includes(comma);
      const dollars = [...new Set((body.match(/\$\s?[\d,]+\.?\d{0,2}/g) || []).map(s => s.replace(/\s/g, '')))].slice(0, 12);
      const atts = attachments(full.data.payload);
      console.log(`   [${c.mailbox.split('@')[0]}] ${c.from.slice(0, 44)}`);
      console.log(`      "${c.subject.slice(0, 64)}" (${c.date.slice(0, 16)})`);
      console.log(`      amount $${amt} ${found ? '✅ FOUND in body' : '— not literal; $ figures:'} ${found ? '' : dollars.join('  ')}`);
      if (atts.length) console.log(`      📎 ${atts.join(', ')}`);
    } catch (e) { console.log(`      ⚠ fetch failed: ${e.message}`); }
  }
  console.log('');
}
