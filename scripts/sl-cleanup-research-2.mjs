#!/usr/bin/env node
/**
 * SL clean-up — round-2 research per Ben (2026-06-25): Thriday invoice (#11), Ross Built /
 * Oonchiumpa-station-build invoice (#5), and the Empathy Ledger project code (#63/#16).
 * READ-ONLY. Downloads any matching PDFs to /tmp/sl-pdfs/. Usage: node scripts/sl-cleanup-research-2.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
const OUT = '/tmp/sl-pdfs'; mkdirSync(OUT, { recursive: true });

let sc = null;
function secrets() { if (sc) return sc; sc = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) sc[s.key] = s.value;
  } catch {} return sc; }
const getSecret = n => secrets()[n] || process.env[n];
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize(); return google.gmail({ version: 'v1', auth }); }
function walk(payload, cb) { const w = p => { if (!p) return; cb(p); (p.parts || []).forEach(w); }; w(payload); }

const MB = ['hi@act.place', 'accounts@act.place', 'nicholas@act.place', 'benjamin@act.place'];
const clients = await Promise.all(MB.map(async u => [u, await gmailFor(u)]));

async function hunt(tag, query, dl = false) {
  console.log(`\n=== [${tag}] ${query} ===`);
  let got = 0;
  for (const [mb, gm] of clients) {
    try {
      const { data } = await gm.users.messages.list({ userId: 'me', q: query, maxResults: 4 });
      for (const m of data.messages || []) {
        const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const h = full.data.payload?.headers || []; const gh = x => h.find(y => y.name === x)?.value || '';
        const atts = []; walk(full.data.payload, p => { if (p.filename && /\.pdf$/i.test(p.filename) && p.body?.attachmentId) atts.push({ name: p.filename, id: p.body.attachmentId }); });
        console.log(`  [${mb.split('@')[0]}] ${gh('Subject').slice(0, 54)} | ${gh('From').slice(0, 32)} | ${gh('Date').slice(0, 17)}${atts.length ? ' 📎' + atts.map(a => a.name).join(',') : ''}`);
        console.log(`     ${(full.data.snippet || '').slice(0, 130)}`);
        if (dl) for (const a of atts) { const att = await gm.users.messages.attachments.get({ userId: 'me', messageId: m.id, id: a.id });
          const f = `${tag}-${got++}-${a.name.replace(/[^A-Za-z0-9._-]/g, '_')}`; writeFileSync(`${OUT}/${f}`, Buffer.from(att.data.data, 'base64')); console.log(`     -> ${OUT}/${f}`); }
      }
    } catch {}
  }
}

await hunt('thriday', '(Thriday) (invoice OR receipt OR tax OR subscription OR payment) after:2025/11/01 before:2026/01/15', true);
await hunt('rossbuilt', '("Ross Built" OR "Ross Building" OR (Oonchiumpa (build OR station OR construction))) (invoice OR tax OR receipt) after:2025/10/01 before:2026/01/15', true);

// Empathy Ledger project code
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = async s => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.log('ERR', error.message); return []; } return data; };
console.log('\n=== Project codes containing EL / empathy / ledger / story ===');
for (const r of await q(`SELECT DISTINCT project_code FROM xero_invoices WHERE project_code ILIKE '%el%' OR project_code ILIKE '%emp%' OR project_code ILIKE '%story%' OR project_code ILIKE '%ledger%' ORDER BY 1`)) console.log('  inv:', r.project_code);
for (const r of await q(`SELECT DISTINCT project_code FROM xero_transactions WHERE project_code ILIKE '%el%' OR project_code ILIKE '%emp%' OR project_code ILIKE '%story%' ORDER BY 1`)) console.log('  txn:', r.project_code);
console.log('=== ALL distinct project codes (for reference) ===');
const all = await q(`SELECT project_code, count(*)::int n FROM xero_invoices WHERE project_code IS NOT NULL GROUP BY project_code ORDER BY project_code`);
console.log('  ' + all.map(r => `${r.project_code}(${r.n})`).join('  '));
