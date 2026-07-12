#!/usr/bin/env node
/**
 * SL clean-up — FINAL comprehensive receipt hunt for the remaining "[receipt to provide]" lines.
 * For each still-missing line: (1) strong per-vendor Gmail search (download any PDF to
 * ~/Downloads/sl-receipts/), (2) relaxed finance_receipt_documents (Dext/Xero) match.
 * Emits a per-vendor status so the comments can be rewritten. READ-ONLY.
 * Usage: node scripts/sl-cleanup-final-hunt.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

const OUT = path.join(os.homedir(), 'Downloads', 'sl-receipts');
mkdirSync(OUT, { recursive: true });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const q = async s => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.log('ERR', error.message); return []; } return data; };

let sc = null;
function secrets() { if (sc) return sc; sc = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) sc[s.key] = s.value;
  } catch {} return sc; }
const getSecret = n => secrets()[n] || process.env[n];
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize(); return google.gmail({ version: 'v1', auth }); }
function pdfAtts(p) { const a = []; const w = x => { if (!x) return; if (x.filename && /\.pdf$/i.test(x.filename) && x.body?.attachmentId) a.push({ name: x.filename, id: x.body.attachmentId }); (x.parts || []).forEach(w); }; w(p); return a; }
function bodyText(p) { let o = ''; const w = x => { if (!x) return; if (x.body?.data && /text\/(plain|html)/.test(x.mimeType || '')) o += Buffer.from(x.body.data, 'base64').toString('utf8') + ' '; (x.parts || []).forEach(w); }; w(p); return o.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }

const MB = ['nicholas@act.place', 'benjamin@act.place', 'hi@act.place', 'accounts@act.place'];
const clients = await Promise.all(MB.map(async u => [u, await gmailFor(u)]));

// Remaining GAP lines: vendor file-tag, strong Gmail query, amount (for body confirm + Dext match), date
const TARGETS = [
  { tag: 'Bearpep-323', q: '(Bearpep OR "Bear pep") (receipt OR invoice OR order OR tax)', amt: 323.30, date: '2025-10-14' },
  { tag: 'JMC-Kenilworth-314', q: '(JMC OR Kenilworth OR "TS Ken") (receipt OR invoice OR fuel OR tax)', amt: 314.20, date: '2025-10-28' },
  { tag: 'Kogan-292', q: '(from:kogan.com OR "kogan") (order OR receipt OR invoice OR 3BUDH9QW OR "tax invoice")', amt: 291.98, date: '2025-11-17' },
  { tag: 'IndonesiaVisa-204', q: '("Indonesia" (eVOA OR visa OR arrival)) OR molina', amt: 204.55, date: '2025-11-17' },
  { tag: 'IndonesiaVisa-393', q: '("Indonesia" (eVOA OR visa OR arrival))', amt: 393.72, date: '2025-11-17' },
  { tag: 'BargainCar-Hobart-998', q: '(from:bargaincarrentals OR "bargain car" OR bargaincar) (receipt OR invoice OR confirmation OR rental OR hobart)', amt: 998.94, date: '2025-12-01' },
  { tag: 'Airtasker-399', q: '(from:airtasker.com OR airtasker) (receipt OR invoice OR payment OR tax)', amt: 399.45, date: '2026-01-15' },
  { tag: 'Steelmart-538', q: '(steelmart OR "steel mart" OR caloundra) (invoice OR receipt OR tax)', amt: 538.12, date: '2026-02-06' },
  { tag: 'ADGE-Hotel-2161', q: '(from:adgehotel OR "adge hotel" OR "adge" OR "surry hills") (folio OR invoice OR receipt OR tax OR booking OR confirmation OR stay)', amt: 2161.19, date: '2026-02-26' },
  { tag: 'Hertz-598', q: '(from:hertz OR hertz) (receipt OR invoice OR rental OR "rental record" OR 643314792)', amt: 598.57, date: '2026-03-30' },
  { tag: 'BigW-388', q: '("big w" OR bigw) (receipt OR invoice OR order OR tax)', amt: 388.20, date: '2026-02-25' },
  { tag: 'Kogan-Alt', q: '"3BUDH9QW"', amt: 291.98, date: '2025-11-17' },
];

const amtVars = a => { const t = Math.abs(a).toFixed(2); return [...new Set([t, t.replace(/\B(?=(\d{3})+(?!\d))/g, ',')])]; };

const report = [];
for (const t of TARGETS) {
  let pdf = null, bodyHit = null, mbHit = null, subj = null;
  for (const [mb, gm] of clients) {
    if (pdf) break;
    try {
      const { data } = await gm.users.messages.list({ userId: 'me', q: t.q, maxResults: 4 });
      for (const m of data.messages || []) {
        const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const h = full.data.payload?.headers || []; const gh = x => h.find(y => y.name === x)?.value || '';
        const atts = pdfAtts(full.data.payload);
        const body = bodyText(full.data.payload);
        const amtIn = amtVars(t.amt).find(v => body.includes(v));
        if (atts.length) { const att = await gm.users.messages.attachments.get({ userId: 'me', messageId: m.id, id: atts[0].id });
          const fn = `${t.tag}.pdf`; writeFileSync(path.join(OUT, fn), Buffer.from(att.data.data, 'base64')); pdf = fn; mbHit = mb.split('@')[0]; subj = gh('Subject'); break; }
        if (amtIn && !bodyHit) { bodyHit = amtIn; mbHit = mb.split('@')[0]; subj = gh('Subject'); }
      }
    } catch {}
  }
  // Dext / Xero finance_receipt_documents relaxed match
  const lo = (Math.abs(t.amt) * 0.85).toFixed(2), hi = (Math.abs(t.amt) * 1.15).toFixed(2);
  const recs = await q(`SELECT vendor_name,amount_total,document_date,source FROM finance_receipt_documents WHERE amount_total BETWEEN ${lo} AND ${hi} AND document_date BETWEEN '${t.date}'::date-20 AND '${t.date}'::date+20 LIMIT 5`);
  const vtok = t.tag.split('-')[0].toLowerCase().slice(0, 5);
  const dext = recs.find(r => (r.vendor_name || '').toLowerCase().includes(vtok));
  const status = pdf ? `PDF -> ${pdf} (${mbHit})` : bodyHit ? `GMAIL body amt-match (${mbHit}): "${(subj || '').slice(0, 40)}"` : dext ? `DEXT/XERO: ${dext.source} "${dext.vendor_name}" $${dext.amount_total}` : 'NOT FOUND';
  report.push({ tag: t.tag, amt: t.amt, status });
  console.log(`${pdf ? 'PDF ' : bodyHit ? 'MAIL' : dext ? 'DEXT' : 'none'}  $${String(Math.abs(t.amt)).padStart(8)}  ${t.tag.padEnd(22)} ${status}`);
}
console.log(`\nNew PDFs in ${OUT}. Found ${report.filter(r => /PDF|GMAIL|DEXT/.test(r.status)).length}/${TARGETS.length}.`);
