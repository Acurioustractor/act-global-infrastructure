#!/usr/bin/env node
// READ-ONLY broadened receipt hunt for the above-threshold vendors the tight ±7d
// deep-search missed. Searches the WHOLE FY26 window, free-text (not just from:domain),
// preferring messages WITH attachments — catches Stripe-relayed SaaS receipts.
// Surfaces candidates for human review; writes nothing back.
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { execSync } from 'child_process';

let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' });
    secretCache = {};
    for (const s of JSON.parse(result)) secretCache[s.key] = s.value;
    return secretCache;
  } catch { return {}; }
}
function getSecret(name) { return loadSecrets()[name] || process.env[name]; }

async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email, key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: userEmail,
  });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

const users = (getSecret('GOOGLE_DELEGATED_USERS') || getSecret('GOOGLE_DELEGATED_USER') || '').split(',').map(s=>s.trim()).filter(Boolean);

// above-threshold no-hit vendors from the Q2/Q3 deep-search + the SaaS tail
const VENDORS = [
  { name: 'Descript',   terms: 'descript' },
  { name: 'Supabase',   terms: 'supabase OR superbase' },
  { name: 'Claude/Anthropic', terms: 'anthropic OR claude.ai OR "claude pro" OR "claude max"' },
  { name: 'Bunnings',   terms: 'bunnings' },
  { name: 'Notion',     terms: '"notion labs" OR notion.so' },
  { name: 'Mighty Networks', terms: '"mighty networks"' },
  { name: 'LinkedIn',   terms: 'linkedin' },
  { name: 'Squarespace',terms: 'squarespace' },
  { name: 'OpenAI',     terms: 'openai' },
];

const WIN = 'after:2025/07/01 before:2026/06/30';

import { writeFileSync } from 'fs';

// keep only genuine receipt/invoice messages, drop newsletters & reply threads
const RECEIPT_FROM = /invoice|billing|receipt|noreply|no-reply|statements|stripe|payment|notification|payments|accounts@/i;
const RECEIPT_SUBJ = /receipt|tax invoice|invoice|payment received|your.*(order|payment|subscription)|paid|charged/i;
const JUNK_SUBJ   = /^re:|^fwd:|newsletter|webinar|tier of|points|growth channel|vibe|check:|changes|increased/i;

const clients = new Map();
for (const u of users) { try { clients.set(u, await getGmailForUser(u)); } catch(e){ console.error('auth fail', u, e.message); } }
console.log(`Authenticated ${clients.size}/${users.length} mailboxes\n`);

const out = ['# Broadened receipt hunt — full FY26, free-text + Stripe-relay  ·  READ-ONLY', ''];
const summary = [];
for (const v of VENDORS) {
  const q = `(${v.terms}) (receipt OR invoice OR "tax invoice" OR payment OR statement) ${WIN}`;
  const hits = [];
  for (const [mailbox, client] of clients) {
    try {
      const { data } = await client.users.messages.list({ userId:'me', q, maxResults: 15 });
      for (const msg of data.messages || []) {
        const full = await client.users.messages.get({ userId:'me', id:msg.id, format:'metadata', metadataHeaders:['From','Subject','Date'] });
        const h = full.data.payload?.headers || [];
        const get = n => h.find(x=>x.name===n)?.value || '';
        const from = get('From'), subj = get('Subject');
        if (JUNK_SUBJ.test(subj)) continue;
        if (!(RECEIPT_FROM.test(from) || RECEIPT_SUBJ.test(subj))) continue;
        hits.push({ mailbox, from, subj, date: get('Date'), id: msg.id });
      }
    } catch(e) { /* ignore per-mailbox */ }
  }
  // dedupe by subject+date across mailboxes
  const seen = new Set(); const uniq = hits.filter(x=>{const k=x.subj+x.date.slice(0,16); if(seen.has(k))return false; seen.add(k); return true;});
  out.push(`## ${v.name} — ${uniq.length} receipt candidate(s)`);
  for (const x of uniq.sort((a,b)=>new Date(a.date)-new Date(b.date))) {
    out.push(`- **${x.date}** — ${x.subj}`);
    out.push(`  ${x.from} · [${x.mailbox}] · https://mail.google.com/mail/u/0/#inbox/${x.id}`);
  }
  out.push('');
  summary.push(`${v.name}: ${uniq.length}`);
}
const path = 'thoughts/shared/reports/receipt-broad-search-2026-06-02.md';
writeFileSync(path, out.join('\n'));
console.log(summary.join('  ·  '));
console.log(`\nReport: ${path}`);
