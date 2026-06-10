// One-off staging: bill-anchored phantom-dup worklist for issue #170 (READ-ONLY).
// Verdicts honour: keeper-receipt-before-delete (Airbnb tracer), MATCH-THEN-DEDUPE
// (AUTHORISED twin = possible real payment), paired-repeats (per-seat SaaS).
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const exec = async q => { const { data, error } = await sb.rpc('exec_sql', { query: q }); if (error) throw new Error(error.message); return data; };
const tok = s => (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2);
const overlap = (a,b) => { const A=new Set(tok(a)); return tok(b).filter(w=>A.has(w)).length; };
const money = n => '$' + Number(n).toLocaleString('en-AU',{minimumFractionDigits:2});

const j = JSON.parse(readFileSync('thoughts/shared/reports/reconcile-sidecar-q2q3-2026-06-11.json','utf8'));
const phantoms = j.buckets['LIKELY-PHANTOM-DUP'];

// one paged pull of all candidate bills in the scope window (+14d pad)
const bills = await exec(`SELECT xero_id, invoice_number, status, contact_name, date, total, amount_due, amount_paid, has_attachments
  FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED')
  AND date >= '2025-09-17' AND date <= '2026-04-14' LIMIT 1000 OFFSET 0`);
const more = await exec(`SELECT xero_id, invoice_number, status, contact_name, date, total, amount_due, amount_paid, has_attachments
  FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED')
  AND date >= '2025-09-17' AND date <= '2026-04-14' LIMIT 1000 OFFSET 1000`);
bills.push(...more);

const dd = (a,b) => Math.abs((new Date(a)-new Date(b))/86400000);
const verdicts = { 'DELETE-CANDIDATE':[], 'COPY-RECEIPT-FIRST':[], 'HOLD-MATCH-INSTEAD':[], 'HOLD-PAIRED-REPEATS':[], 'HOLD-SHARED-TWIN':[], 'HOLD-REVIEW':[] };

for (const p of phantoms) {
  const twins = bills.filter(b => Math.abs(Math.abs(b.total)-Math.abs(p.total))<0.02 && dd(b.date,p.date)<=14)
    .map(b => ({...b, ov: overlap(p.contact_name+' '+p.description, b.contact_name||''), prox: dd(b.date,p.date)}))
    .sort((a,b) => b.ov-a.ov || a.prox-b.prox);
  const best = twins[0];
  const row = { ...p, twin_bill: best ? `${best.invoice_number||best.xero_id.slice(0,8)} · ${best.contact_name} · ${best.date} · ${best.status} · keeper_receipt=${best.has_attachments}` : 'NONE', twin_id: best?.xero_id };
  // paired-repeats: same vendor+amount → n spends vs n bills in window
  const sameSpends = phantoms.filter(q => q.contact_name===p.contact_name && Math.abs(q.total-p.total)<0.02).length;
  const sameBills = twins.filter(t => t.ov>0).length;
  let v;
  if (!best) v = 'HOLD-REVIEW';
  else if (best.ov === 0) v = 'HOLD-REVIEW';                       // coincidental amount — never accept
  else if (sameSpends > 1 && sameBills >= sameSpends) v = 'HOLD-PAIRED-REPEATS'; // per-seat SaaS: n real charges, n bills
  else if (best.status === 'AUTHORISED') v = 'HOLD-MATCH-INSTEAD'; // unpaid bill: spend-money may BE the payment — match, don't delete
  else if (!best.has_attachments) v = 'COPY-RECEIPT-FIRST';        // keeper lacks receipt — copy before delete
  else v = 'DELETE-CANDIDATE';                                     // PAID twin with receipt: classic phantom
  verdicts[v].push(row);
}

// SHARED-TWIN GUARD: two+ candidate lines pointing at ONE twin bill = at most one
// can be the phantom; in the double-PAYMENT case (Telford Smith $19.8K) BOTH are real.
for (const v of ['DELETE-CANDIDATE','COPY-RECEIPT-FIRST']) {
  const byTwin = {};
  for (const r of verdicts[v]) (byTwin[r.twin_id] ||= []).push(r);
  for (const [tid, rows] of Object.entries(byTwin)) if (rows.length > 1) {
    verdicts[v] = verdicts[v].filter(r => r.twin_id !== tid);
    rows.forEach(r => r.twin_bill += '  ⚠ SHARED TWIN — both lines may be real (double-payment pattern)');
    verdicts['HOLD-SHARED-TWIN'].push(...rows);
  }
}
let md = `# Phantom-dup worklist — q2q3 (staged ${new Date().toISOString().slice(0,10)})\n\n> READ-ONLY staging for issue #170 prep. Source: reconcile-sidecar q2q3 --verify (269/269 live-checked).\n> APPLY RULE (Ben, day-shift): every delete re-verifies via single-GET at write time AND confirms the keeper carries the receipt. Log every write to reconcile-write-log.md.\n> Keeper receipt status here is from xero_invoices.has_attachments (accurate, unlike the txn flag).\n\n`;
for (const [v, rows] of Object.entries(verdicts)) {
  if (!rows.length) continue;
  const tot = rows.reduce((s,r)=>s+Math.abs(r.total),0);
  md += `## ${v} — ${rows.length} lines · ${money(tot)}\n\n`;
  for (const r of rows.sort((a,b)=>a.date.localeCompare(b.date)))
    md += `- [ ] ${r.date} · **${r.contact_name}** · ${money(r.total)} · ${r.bank_account.includes('8815')?'Visa':'Everyday'} · txn \`${r.id}\`\n      twin: ${r.twin_bill}\n`;
  md += '\n';
}
md += `---\nVerdict meanings: HOLD-SHARED-TWIN = 2+ bank lines share one twin bill — double-PAYMENT pattern (e.g. Telford Smith $19.8K, unrecovered): both lines are real money, route to recovery/SL, NEVER delete. DELETE-CANDIDATE = PAID twin bill holds the receipt, classic Dext phantom. COPY-RECEIPT-FIRST = real phantom but keeper lacks the receipt — copy it over before deleting. HOLD-MATCH-INSTEAD = twin bill is AUTHORISED/unpaid, the spend-money may BE the payment — match in UI, never delete. HOLD-PAIRED-REPEATS = n real charges with n bills (per-seat SaaS) — both legs real. HOLD-REVIEW = no name-overlapping twin — coincidental amount, leave alone.\n`;
// no-op placeholder
for (const [v, rows] of Object.entries(verdicts)) if (rows.length) console.log(`${v}: ${rows.length} lines · ${money(rows.reduce((s,r)=>s+Math.abs(r.total),0))}`);
console.log('\nwrote thoughts/shared/reports/dup-worklist-q2q3-2026-06-11.md');

writeFileSync('thoughts/shared/reports/dup-worklist-q2q3-2026-06-11.md', md);
