#!/usr/bin/env node
/**
 * SL clean-up Gmail hunt — for every receipt-GAP line in grounded.json, query the raw
 * Gmail API across ALL delegated ACT mailboxes (accounts@ / nicholas@ / benjamin@ / hi@)
 * by vendor token + date window, and attach candidate receipt emails to each line.
 *
 * Goes beyond finance_receipt_documents (only what Dext/ingest captured) — hits Gmail direct.
 * READ-ONLY. Augments grounded.json in place with a `gmail_candidates` array per line.
 * Skips gracefully if the Google service-account secret can't be loaded.
 *
 * Usage: node scripts/sl-cleanup-gmail-hunt.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { buildGmailQuery } from './lib/gmail-vendor-queries.mjs';
import path from 'path';

const GROUNDED = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup/grounded.json');

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

// Derive a vendor name from the SL particulars for query building.
function vendorFromParticulars(p) {
  let s = String(p || '').split('|')[0];                 // drop "| Transfer Debit" etc.
  s = s.replace(/\b[A-Z]?\d{6,}\b/g, ' ')                 // strip reference numbers
       .replace(/\b(thanks|refund|transfer|debit|credit|purchase|card|money)\b/gi, ' ')
       .replace(/\s+/g, ' ').trim();
  return s;
}

const data = JSON.parse(readFileSync(GROUNDED, 'utf8'));
const gaps = data.lines.filter(l => !l.has_receipt);
console.log(`Hunting Gmail for ${gaps.length} receipt-gap lines across ACT mailboxes...\n`);

let gmailClients;
try {
  const users = getDelegatedUsers();
  gmailClients = await Promise.all(users.map(async u => [u, await getGmailForUser(u)]));
  console.log(`Authed mailboxes: ${gmailClients.map(c => c[0]).join(', ')}\n`);
} catch (e) {
  console.log(`⚠ Gmail auth unavailable — skipping hunt (${e.message}).`);
  console.log('  grounded.json left unchanged; classification will rely on on-file receipts + nature.');
  process.exit(0);
}

async function hunt(line) {
  const vendor = vendorFromParticulars(line.particulars);
  const query = buildGmailQuery(vendor.toLowerCase(), line.date, 12);
  if (!query) return [];
  const hits = [];
  for (const [mailbox, client] of gmailClients) {
    try {
      const { data: list } = await client.users.messages.list({ userId: 'me', q: query, maxResults: 4 });
      for (const msg of list.messages || []) {
        const full = await client.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const h = full.data.payload?.headers || [];
        const getH = (n) => h.find(x => x.name === n)?.value || '';
        hits.push({ mailbox, from: getH('From'), subject: getH('Subject'), date: getH('Date'), gmail_id: msg.id });
      }
    } catch { /* per-mailbox ignore */ }
    await new Promise(r => setTimeout(r, 120));
  }
  return hits;
}

let found = 0;
for (const line of data.lines) {
  if (line.has_receipt) { line.gmail_candidates = []; continue; }
  const hits = await hunt(line);
  line.gmail_candidates = hits;
  if (hits.length) {
    found++;
    console.log(`📧 ${line.date} $${line.amount} ${vendorFromParticulars(line.particulars).slice(0,32)} → ${hits.length} hit(s): ${hits.slice(0,2).map(h => h.subject.slice(0,40)).join(' | ')}`);
  }
}
writeFileSync(GROUNDED, JSON.stringify(data, null, 2));
console.log(`\nDone. ${found}/${gaps.length} gap lines got Gmail candidates. grounded.json augmented.`);
