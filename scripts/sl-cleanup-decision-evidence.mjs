#!/usr/bin/env node
/**
 * SL clean-up — decision evidence gatherer. For each NEEDS-YOUR-CALL line (verdicts.json
 * needs_ben=true), pull everything we already know about the payee/vendor from our knowledge:
 *   1. Xero history  — ALL prior txns to/from this payee (how were they coded: project + account)
 *   2. GHL identity  — name/company match → tags (role:/project:), company
 *   3. People page   — thoughts/shared/people/<name>.md synthesis snippet
 *   4. Gmail nature  — raw Gmail across the 4 ACT mailboxes by name (NOT receipt-filtered — the
 *                      surrounding story: what was the transfer/payment for), subject + snippet
 * READ-ONLY. Writes thoughts/shared/handoffs/sl-cleanup/decision-evidence.json for the answer
 * workflow to reason over. Skips Gmail gracefully if the service-account secret is unavailable.
 *
 * Usage: node scripts/sl-cleanup-decision-evidence.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const PEOPLE = path.join(process.cwd(), 'thoughts/shared/people');
const q = async (s) => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.error('SQLERR', error.message); return []; } return data; };
const esc = (s) => String(s || '').replace(/'/g, "''");

const verdicts = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));
const digest = JSON.parse(readFileSync(path.join(DIR, 'digest.json'), 'utf8'));
const dByI = new Map(digest.map(d => [d.i, d]));
const needs = verdicts.filter(v => v.needs_ben).sort((a, b) => Math.abs((dByI.get(b.i)?.amt) || 0) - Math.abs((dByI.get(a.i)?.amt) || 0));

// ---- payee/vendor name extraction from SL particulars ----
const STOP = new Set(['THE', 'AND', 'PURCHASE', 'CARD', 'CREDIT', 'DEBIT', 'TRANSFER', 'MONEY', 'INTERBANK', 'THANKS', 'PAYMENT', 'PTY', 'LTD', 'COM', 'AUSTRALIA', 'ACT', 'CURIOUS', 'TRACTOR', 'MR', 'MRS', 'MS', 'INTERNET', 'BANKING', 'MELBOURNE', 'NEW', 'MINUS', 'SECURITY', 'CAR', 'UP', 'TO', 'OF', 'FOR']);
function nameTokens(particulars) {
  let s = String(particulars || '').split('|')[0];
  s = s.replace(/\b[A-Z]{0,4}\d{5,}\w*/g, ' ')        // glued ref numbers (ConstructP7797..., PtA5648...)
       .replace(/\b\d{4,}\w*/g, ' ')
       .replace(/([a-z])([A-Z])/g, '$1 $2')           // split camel-ish bank artifacts (ANDSecurity, COMarcus)
       .replace(/[^A-Za-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').map(w => w.trim()).filter(w => w.length >= 3 && !STOP.has(w.toUpperCase()));
}

// ---- secrets / Gmail (same path as sl-cleanup-gmail-hunt.mjs) ----
let secretCache = null;
function loadSecrets() { if (secretCache) return secretCache; secretCache = {};
  try { const t = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const x of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${t}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) secretCache[x.key] = x.value;
  } catch {} return secretCache; }
const getSecret = (n) => loadSecrets()[n] || process.env[n];
function delegatedUsers() { const m = getSecret('GOOGLE_DELEGATED_USERS'); if (m) return m.split(',').map(e => e.trim()).filter(Boolean); const s = getSecret('GOOGLE_DELEGATED_USER'); return s ? [s.trim()] : []; }
async function gmailFor(u) { const c = JSON.parse(getSecret('GOOGLE_SERVICE_ACCOUNT_KEY')); const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/gmail.readonly'], subject: u }); await auth.authorize(); return google.gmail({ version: 'v1', auth }); }

let gmailClients = [];
try { gmailClients = await Promise.all(delegatedUsers().map(async u => [u, await gmailFor(u)])); console.log(`Gmail: ${gmailClients.map(c => c[0]).join(', ')}`); }
catch (e) { console.log(`⚠ Gmail unavailable (${e.message}) — name/Xero/GHL evidence only.`); }

const firstAccount = (li) => { try { const a = typeof li === 'string' ? JSON.parse(li) : li; const f = Array.isArray(a) ? a[0] : null; return f ? { acct: f.AccountCode || f.account_code, tax: f.TaxType || f.tax_type, desc: (f.Description || f.description || '').slice(0, 50) } : {}; } catch { return {}; } };

async function xeroHistory(tokens) {
  if (!tokens.length) return [];
  const conds = tokens.slice(0, 2).map(t => `contact_name ILIKE '%${esc(t)}%'`).join(' AND ');
  const rows = await q(`SELECT contact_name,type,total,date,project_code,project_code_source,line_items FROM xero_transactions WHERE ${conds} AND status IS DISTINCT FROM 'DELETED' ORDER BY date DESC LIMIT 12`);
  return rows.map(r => ({ contact: r.contact_name, type: r.type, total: r.total, date: r.date, project: r.project_code, proj_src: r.project_code_source, ...firstAccount(r.line_items) }));
}
async function xeroInvoices(tokens) {
  if (!tokens.length) return [];
  const conds = tokens.slice(0, 2).map(t => `contact_name ILIKE '%${esc(t)}%'`).join(' AND ');
  const rows = await q(`SELECT invoice_number,contact_name,type,total,date,status,project_code,line_items FROM xero_invoices WHERE ${conds} ORDER BY date DESC LIMIT 10`);
  return rows.map(r => ({ number: r.invoice_number, contact: r.contact_name, type: r.type, total: r.total, date: r.date, status: r.status, project: r.project_code, ...firstAccount(r.line_items) }));
}
async function ghlIdentity(tokens) {
  if (!tokens.length) return [];
  const conds = tokens.slice(0, 2).map(t => `(full_name ILIKE '%${esc(t)}%' OR company_name ILIKE '%${esc(t)}%')`).join(' AND ');
  const rows = await q(`SELECT full_name,company_name,email,tags FROM ghl_contacts WHERE ${conds} LIMIT 6`);
  return rows.map(r => ({ name: r.full_name, company: r.company_name, email: r.email, tags: (r.tags || []).filter(t => /^(role|project|interest|lane|tier|circle|comms):/.test(t)) }));
}
function peoplePage(tokens) {
  if (!existsSync(PEOPLE) || tokens.length < 1) return null;
  const slug = tokens.slice(0, 2).join('-').toLowerCase();
  const files = readdirSync(PEOPLE).filter(f => f.endsWith('.md'));
  const hit = files.find(f => f === `${slug}.md`) || files.find(f => tokens.slice(0, 2).every(t => f.toLowerCase().includes(t.toLowerCase())));
  if (!hit) return null;
  const txt = readFileSync(path.join(PEOPLE, hit), 'utf8').replace(/\s+/g, ' ').trim();
  return { file: hit, snippet: txt.slice(0, 600) };
}
async function gmailNature(tokens, dateISO) {
  if (!gmailClients.length || tokens.length < 1) return [];
  const phrase = tokens.slice(0, 3).join(' ');
  const d = new Date(dateISO); const after = new Date(d - 75 * 86400000).toISOString().slice(0, 10).replace(/-/g, '/'); const before = new Date(+d + 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '/');
  const query = `"${phrase}" after:${after} before:${before}`;
  const hits = [];
  for (const [mailbox, client] of gmailClients) {
    try {
      const { data: list } = await client.users.messages.list({ userId: 'me', q: query, maxResults: 3 });
      for (const m of list.messages || []) {
        const full = await client.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
        const h = full.data.payload?.headers || []; const gh = n => h.find(x => x.name === n)?.value || '';
        hits.push({ mailbox: mailbox.split('@')[0], from: gh('From'), subject: gh('Subject'), date: gh('Date'), snippet: (full.data.snippet || '').slice(0, 180) });
        await new Promise(r => setTimeout(r, 80));
      }
    } catch {}
    await new Promise(r => setTimeout(r, 80));
  }
  return hits;
}

// Per-line search-token overrides where the SL particulars hide the real entity name
// (ref-codes glued on, trading name differs from bank descriptor). Verified against Xero 2026-06-25.
const OVERRIDE = {
  13: ['funding', 'network'],   // "TFN Distribution" = The Funding Network (Xero: ACT-CE, grant)
  3:  ['humanitix'],            // ref-code prefix hid the vendor (Xero: ACT-CP)
  15: ['bionic'],              // Bionic Group / Bionic Self Storage
  12: ['plasticians'],         // "Circularity Group" trades as The Plasticians (Xero: $29,800 ACT-GD)
  0:  ['christopher', 'dods'], // The Confessional honorarium (ACT-CF)
  9:  ['tarik', 'dallinger'],
  1:  ['james', 'william'],
  4:  ['marcus', 'travers'],
  7:  ['suzanne', 'margaret'],
};

const out = [];
for (const v of needs) {
  const d = dByI.get(v.i);
  const tokens = OVERRIDE[v.i] || nameTokens(d.particulars);
  const [xh, xi, ghl, gm] = await Promise.all([xeroHistory(tokens), xeroInvoices(tokens), ghlIdentity(tokens), gmailNature(tokens, d.date)]);
  const pp = peoplePage(tokens);
  out.push({
    i: v.i, date: d.date, dir: d.dir, amount: d.amt, particulars: d.particulars, sl_question: d.sl,
    search_tokens: tokens,
    current_verdict: { nature: v.nature, project: v.project_code, account: v.suggested_account, gst: v.gst_treatment, receipt_status: v.receipt_status, your_comment: v.your_comment },
    evidence: { xero_history: xh, xero_invoices: xi, ghl_identity: ghl, people_page: pp, gmail_nature: gm },
  });
  const e = [];
  if (xh.length) e.push(`${xh.length} xero-txn`); if (xi.length) e.push(`${xi.length} xero-inv`); if (ghl.length) e.push(`${ghl.length} ghl`); if (pp) e.push('people'); if (gm.length) e.push(`${gm.length} gmail`);
  console.log(`#${v.i} ${(d.dir === 'spent' ? '-' : '+')}$${Math.abs(d.amt)} ${tokens.join(' ').slice(0, 28).padEnd(29)} → ${e.join(', ') || 'no evidence'}`);
}
writeFileSync(path.join(DIR, 'decision-evidence.json'), JSON.stringify(out, null, 2));
console.log(`\n${out.length} lines → ${DIR}/decision-evidence.json`);
