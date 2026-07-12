#!/usr/bin/env node
/**
 * SL clean-up — research the 3 still-unknown lines (#16 little beach shacks, #56 SP Retro,
 * #61 Hannah St Melbourne) across the ACT mailboxes: booking confirmations / order receipts /
 * location + date. READ-ONLY, prints subjects + snippets. Usage: node scripts/sl-cleanup-research-unknowns.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { execSync } from 'child_process';

let sc = null;
function secrets() { if (sc) return sc; sc = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) sc[s.key] = s.value;
  } catch {} return sc; }
const getSecret = n => secrets()[n] || process.env[n];
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize(); return google.gmail({ version: 'v1', auth }); }

const MAILBOXES = ['nicholas@act.place', 'benjamin@act.place', 'hi@act.place', 'accounts@act.place'];
const clients = await Promise.all(MAILBOXES.map(async u => [u, await gmailFor(u)]));

async function hunt(tag, query) {
  console.log(`\n=== [${tag}] ${query} ===`);
  for (const [mb, gm] of clients) {
    try {
      const { data } = await gm.users.messages.list({ userId: 'me', q: query, maxResults: 4 });
      for (const m of data.messages || []) {
        const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const h = full.data.payload?.headers || []; const gh = x => h.find(y => y.name === x)?.value || '';
        console.log(`  [${mb.split('@')[0]}] ${gh('Subject').slice(0, 56)} | ${gh('From').slice(0, 34)} | ${gh('Date').slice(0, 17)}`);
        console.log(`     ${(full.data.snippet || '').slice(0, 150)}`);
      }
    } catch {}
  }
}

await hunt('#16 little beach shacks', '"little beach shacks" OR "beach shack" after:2025/12/15 before:2026/02/15');
await hunt('#56 SP Retro', '("SP Retro" OR "Retro Outdoor" OR "outdoor co") after:2026/02/01 before:2026/03/20');
await hunt('#61 Hannah St', '("Hannah St" OR "Hannah Street") after:2026/04/15 before:2026/05/10');
