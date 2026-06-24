#!/usr/bin/env node
/**
 * SL clean-up — work out what the $3,000 Thriday payment (4 Dec 2025) actually is:
 * (a) service fee, (b) BAS/GST payment to ATO, or (c) a transfer into Nic's own Thriday
 * bank/tax-savings account. Pulls Thriday banking/account emails, any $3,000 receipt, the
 * Sep-2025 BAS amount, and the Xero picture. READ-ONLY. Usage: node scripts/sl-cleanup-thriday-probe.mjs
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
function decode(payload) { let o = ''; const w = p => { if (!p) return;
  if (p.body?.data && /text\/(plain|html)/.test(p.mimeType || '')) o += Buffer.from(p.body.data, 'base64').toString('utf8') + ' ';
  (p.parts || []).forEach(w); }; w(payload); return o.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' '); }
function atts(payload) { const a = []; const w = p => { if (!p) return; if (p.filename && p.body?.attachmentId) a.push({ name: p.filename, id: p.body.attachmentId }); (p.parts || []).forEach(w); }; w(payload); return a; }

const MB = ['nicholas@act.place', 'benjamin@act.place', 'hi@act.place', 'accounts@act.place'];
const clients = await Promise.all(MB.map(async u => [u, await gmailFor(u)]));

async function hunt(tag, query, opts = {}) {
  console.log(`\n=== [${tag}] ${query} ===`);
  for (const [mb, gm] of clients) {
    try {
      const { data } = await gm.users.messages.list({ userId: 'me', q: query, maxResults: opts.max || 4 });
      for (const m of data.messages || []) {
        const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const h = full.data.payload?.headers || []; const gh = x => h.find(y => y.name === x)?.value || '';
        const body = decode(full.data.payload);
        const dollars = [...new Set((body.match(/\$\s?[\d,]+\.?\d{0,2}/g) || []).map(s => s.replace(/\s/g, '')))].slice(0, 10);
        const A = atts(full.data.payload);
        console.log(`  [${mb.split('@')[0]}] ${gh('Subject').slice(0, 56)} | ${gh('Date').slice(0, 17)}${A.length ? ' 📎' + A.map(a => a.name).join(',') : ''}`);
        if (opts.body) console.log(`     ${body.slice(0, 280)}`);
        if (dollars.length) console.log(`     $: ${dollars.join('  ')}`);
        if (opts.dl) for (const a of A.filter(x => /\.pdf$/i.test(x.name))) { const att = await gm.users.messages.attachments.get({ userId: 'me', messageId: m.id, id: a.id });
          const f = `${tag}-${a.name.replace(/[^A-Za-z0-9._-]/g, '_')}`; writeFileSync(`${OUT}/${f}`, Buffer.from(att.data.data, 'base64')); console.log(`     -> ${OUT}/${f}`); }
      }
    } catch {}
  }
}

await hunt('thriday-3000', 'Thriday (3000 OR "3,000" OR "$3,000")', { body: true, max: 5 });
await hunt('thriday-acct', 'Thriday (account OR welcome OR "set aside" OR savings OR tax OR transfer OR subscription OR plan OR pricing)', { body: false, max: 6 });
await hunt('thriday-receipt', 'from:thriday (receipt OR invoice OR payment OR confirmation)', { body: true, dl: true, max: 5 });
await hunt('sep-bas', 'BAS (lodg OR "July to Sep" OR "Jul-Sep" OR september) after:2025/11/15 before:2026/01/05', { body: true, dl: true, max: 4 });

// Xero picture
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = async s => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.log('ERR', error.message); return []; } return data; };
console.log('\n=== Xero: any Thriday / ATO $3,000 around Dec 2025 ===');
for (const r of await q(`SELECT contact_name,type,total,date,project_code,line_items FROM xero_transactions WHERE (contact_name ILIKE '%thriday%' OR contact_name ILIKE '%ATO%' OR contact_name ILIKE '%taxation%') AND date BETWEEN '2025-11-01' AND '2026-01-15' ORDER BY date LIMIT 10`))
  console.log(`  txn ${r.date} ${r.type} $${r.total} ${r.contact_name} proj:${r.project_code||'-'}`);
for (const r of await q(`SELECT date,bank_account,amount,particulars FROM bank_statement_lines WHERE particulars ILIKE '%thriday%' ORDER BY date LIMIT 10`))
  console.log(`  bank ${r.date} ${r.bank_account} $${r.amount} ${(r.particulars||'').slice(0,40)}`);
