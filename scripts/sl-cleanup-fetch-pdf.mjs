#!/usr/bin/env node
/**
 * SL clean-up — fetch specific invoice PDFs from Gmail + probe Xero for the Plasticians gap.
 * READ-ONLY. Downloads attachments to /tmp/sl-pdfs/ for the Read tool to open.
 * Usage: node scripts/sl-cleanup-fetch-pdf.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const OUT = '/tmp/sl-pdfs';
mkdirSync(OUT, { recursive: true });

let sc = null;
function secrets() { if (sc) return sc; sc = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) sc[s.key] = s.value;
  } catch {} return sc; }
const getSecret = (n) => secrets()[n] || process.env[n];
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize(); return google.gmail({ version: 'v1', auth }); }

function walkParts(payload, cb) { const w = p => { if (!p) return; cb(p); (p.parts || []).forEach(w); }; w(payload); }

async function fetchPdfs(mailbox, query, tag) {
  const gm = await gmailFor(mailbox);
  const { data: list } = await gm.users.messages.list({ userId: 'me', q: query, maxResults: 6 });
  console.log(`\n[${tag}] query "${query}" in ${mailbox}: ${list.messages?.length || 0} msgs`);
  let n = 0;
  for (const m of list.messages || []) {
    const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const h = full.data.payload?.headers || []; const gh = x => h.find(y => y.name === x)?.value || '';
    const subj = gh('Subject'), from = gh('From'), date = gh('Date');
    const atts = [];
    walkParts(full.data.payload, p => { if (p.filename && /\.pdf$/i.test(p.filename) && p.body?.attachmentId) atts.push({ name: p.filename, id: p.body.attachmentId }); });
    if (!atts.length) continue;
    console.log(`  msg "${subj.slice(0, 50)}" from ${from.slice(0, 36)} (${date.slice(0, 16)}) — ${atts.length} pdf(s)`);
    for (const a of atts) {
      const att = await gm.users.messages.attachments.get({ userId: 'me', messageId: m.id, id: a.id });
      const buf = Buffer.from(att.data.data, 'base64');
      const safe = `${tag}-${n++}-${a.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      writeFileSync(`${OUT}/${safe}`, buf);
      console.log(`    -> ${OUT}/${safe} (${buf.length} bytes)`);
    }
  }
}

// ---- (b) Plasticians invoice — hunt all 4 mailboxes ----
for (const mb of ['nicholas@act.place', 'benjamin@act.place', 'accounts@act.place', 'hi@act.place'])
  await fetchPdfs(mb, '(Plasticians OR Circularity OR "Hensley Park") has:attachment filename:pdf after:2025/11/01 before:2026/02/01', 'plasticians');

// ---- (b) Xero probe for the Plasticians gap ----
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = async s => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.log('ERR', error.message); return []; } return data; };
console.log('\n=== xero_invoices columns (sub/tax/total) ===');
for (const r of await q(`SELECT column_name FROM information_schema.columns WHERE table_name='xero_invoices' AND (column_name ILIKE '%total%' OR column_name ILIKE '%sub%' OR column_name ILIKE '%tax%')`)) console.log('  '+r.column_name);
console.log('=== Xero: all Plasticians invoices (full line_items) ===');
for (const r of await q(`SELECT invoice_number,type,total,total_tax,status,date,project_code,line_items FROM xero_invoices WHERE contact_name ILIKE '%plasticians%' ORDER BY date`))
  console.log(`  ${r.type} #${r.invoice_number||'-'} $${r.total} tax:${r.total_tax} ${r.status} ${r.date} proj:${r.project_code||'-'} LI:${JSON.stringify(r.line_items).slice(0,200)}`);
console.log('=== Xero: any record at $32,780 or $2,980 ===');
for (const r of await q(`SELECT 'inv' src,contact_name,total,status,date FROM xero_invoices WHERE total IN (32780,2980,2980.00) UNION ALL SELECT 'txn',contact_name,total,status,date FROM xero_transactions WHERE total IN (32780,2980) ORDER BY date`))
  console.log(`  ${r.src} ${r.contact_name} $${r.total} ${r.status} ${r.date}`);
console.log('=== Bank: lines near 2025-12-17 for 2980 / 32780 / 29800 ===');
for (const r of await q(`SELECT date,bank_account,amount,payee,particulars FROM bank_statement_lines WHERE ABS(amount) IN (2980,32780,29800) AND date BETWEEN '2025-11-15' AND '2026-01-31' ORDER BY date`))
  console.log(`  ${r.date} ${r.bank_account} $${r.amount} ${(r.particulars||r.payee||'').slice(0,40)}`);
