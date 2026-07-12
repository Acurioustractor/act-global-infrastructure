#!/usr/bin/env node
/**
 * SL clean-up — collect every receipt PDF found this session into one folder
 * (~/Downloads/sl-receipts/), named by vendor, ready to drag-drop upload to Dext.
 * READ-ONLY (Gmail download only). Usage: node scripts/sl-cleanup-collect-receipts.mjs
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

const OUT = path.join(os.homedir(), 'Downloads', 'sl-receipts');
mkdirSync(OUT, { recursive: true });

let sc = null;
function secrets() { if (sc) return sc; sc = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) sc[s.key] = s.value;
  } catch {} return sc; }
const getSecret = n => secrets()[n] || process.env[n];
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY'));
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u });
  await auth.authorize(); return google.gmail({ version: 'v1', auth }); }
function pdfs(payload) { const a = []; const w = p => { if (!p) return; if (p.filename && /\.pdf$/i.test(p.filename) && p.body?.attachmentId) a.push({ name: p.filename, id: p.body.attachmentId }); (p.parts || []).forEach(w); }; w(payload); return a; }

const MB = ['nicholas@act.place', 'benjamin@act.place', 'hi@act.place', 'accounts@act.place'];
const clients = await Promise.all(MB.map(async u => [u, await gmailFor(u)]));

// vendor -> { q: gmail query, name: output filename prefix }
const RECEIPTS = [
  { vendor: 'Carla-Furnishers-4816', q: 'subject:(Carla Furnishers) 26-00000151' },
  { vendor: 'Plasticians-Circularity-32780', q: 'from:theplasticians INV-0054 OR (Plasticians invoice)' },
  { vendor: 'RNM-RossBuilt-Atnarpa-20000', q: 'subject:(INV-0146) (RNM OR Ross)' },
  { vendor: 'Colemans-Printing-240', q: 'from:colemanprint.com.au (invoice OR completed)' },
  { vendor: 'Colyton-Hotel-436', q: '("Colyton Hotel" OR 5406236) (booking OR confirmation OR receipt OR Qantas)' },
  { vendor: 'Tullah-Lakeside-374', q: '("Tullah Lakeside" OR Tullah) (booking OR confirmation OR receipt OR invoice)' },
  { vendor: 'Audible-16', q: 'from:audible.com.au (order OR receipt) after:2025/11/01 before:2026/01/15' },
];

const got = [], bodyOnly = [];
for (const r of RECEIPTS) {
  let found = false;
  for (const [mb, gm] of clients) {
    if (found) break;
    try {
      const { data } = await gm.users.messages.list({ userId: 'me', q: r.q, maxResults: 4 });
      for (const m of data.messages || []) {
        const full = await gm.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const atts = pdfs(full.data.payload);
        if (!atts.length) continue;
        for (let i = 0; i < atts.length; i++) {
          const att = await gm.users.messages.attachments.get({ userId: 'me', messageId: m.id, id: atts[i].id });
          const fn = `${r.vendor}${atts.length > 1 ? '-' + (i + 1) : ''}.pdf`;
          writeFileSync(path.join(OUT, fn), Buffer.from(att.data.data, 'base64'));
          got.push(`${fn}  (${mb.split('@')[0]})`);
        }
        found = true; break;
      }
    } catch {}
  }
  if (!found) bodyOnly.push(r.vendor);
}

console.log(`\n📁 ${OUT}\n`);
console.log(`✅ PDFs collected (${got.length}) — drag-drop these into Dext:`);
got.forEach(g => console.log('   ' + g));
if (bodyOnly.length) {
  console.log(`\n⚠ Receipt is in the email BODY (no PDF) — forward these emails to Dext's email-in instead:`);
  bodyOnly.forEach(b => console.log('   ' + b));
}
