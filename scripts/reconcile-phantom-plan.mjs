#!/usr/bin/env node
/**
 * Emit the machine-readable phantom + ambiguous plans (with txn + bill IDs) that
 * drive the delete wave and the FLAG_AMBIGUOUS review. Same matching + 1:1 logic as
 * reconcile-prep.mjs, but lean: single-GET only the PAID/AUTHORISED-assigned lines.
 *
 * READ-ONLY. Writes:
 *   recon-pack/phantom-plan.json    [{txnId, billId, billNum, amount, vendor, date, conf}]  (recon=false confirmed, high/medium conf, sorted $ asc)
 *   recon-pack/ambiguous-plan.json  [{txnId, billId, billNum, amount, vendor, date}]         (live AUTHORISED bill matches)
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const ACC = `'NAB Visa ACT #8815'`;
const tok = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
const nameOverlap = (a, b) => { const A = new Set(tok(a)); return tok(b).some(w => A.has(w)); };
const amtMatch = (a, b) => Math.abs(a - b) <= Math.max(5, a * 0.02);
const exactAmt = (a, b) => Math.abs(a - b) < 0.02;
const dayDiff = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

const exec = async sql => { const { data, error } = await sb.rpc('exec_sql', { query: sql }); if (error) throw new Error(error.message); return data; };
const execPaged = async (cols, from, where, order) => { const rows = []; let off = 0; for (;;) { const p = await exec(`SELECT ${cols} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT 1000 OFFSET ${off}`); rows.push(...p); if (p.length < 1000) break; off += 1000; } return rows; };

const lines = await execPaged('xero_transaction_id id, contact_name, date::text, ABS(total)::numeric(12,2) total',
  'xero_transactions', `bank_account=${ACC} AND type LIKE 'SPEND%' AND is_reconciled=false AND status IS DISTINCT FROM 'DELETED'`, 'ABS(total) DESC, xero_transaction_id');
const bills = await execPaged('xero_id, contact_name, date::text, ABS(total)::numeric(12,2) total',
  'xero_invoices', `type='ACCPAY' AND status NOT IN ('DELETED')`, 'xero_id');
console.log(`Mirror: ${lines.length} lines · ${bills.length} bills`);

// candidate pairs
for (const L of lines) L.cands = bills.filter(b => amtMatch(L.total, b.total) && dayDiff(L.date, b.date) <= 14 && (!L.contact_name || !b.contact_name || nameOverlap(L.contact_name, b.contact_name)));

// batch live-verify candidate bill status (reliable on IDs=)
const billIds = [...new Set(lines.flatMap(L => L.cands.map(c => c.xero_id)))];
const liveBill = new Map();
for (let i = 0; i < billIds.length; i += 40) { const r = await xero.get(`Invoices?IDs=${billIds.slice(i, i + 40).join(',')}`); for (const inv of (r.Invoices || [])) liveBill.set(inv.InvoiceID, { status: inv.Status, total: Math.abs(inv.Total), att: inv.HasAttachments, num: inv.InvoiceNumber }); }
console.log(`Live-verified ${liveBill.size} candidate bills`);

// 1:1 assignment, best quality first
const pairs = [];
for (const L of lines) for (const c of L.cands) { const lb = liveBill.get(c.xero_id); if (!lb || lb.status === 'VOIDED' || lb.status === 'DELETED') continue; const exact = exactAmt(L.total, lb.total), name = nameOverlap(L.contact_name, c.contact_name); pairs.push({ L, billId: c.xero_id, lb, exact, name, q: (exact ? 4 : 0) + (name ? 2 : 0) + (lb.att ? 1 : 0) }); }
pairs.sort((a, b) => b.q - a.q || b.L.total - a.L.total);
const lineTaken = new Set(), billTaken = new Set();
for (const p of pairs) { if (lineTaken.has(p.L.id) || billTaken.has(p.billId)) continue; lineTaken.add(p.L.id); billTaken.add(p.billId); p.L.assigned = p; }

const paidAssigned = lines.filter(L => L.assigned?.lb.status === 'PAID');
const authAssigned = lines.filter(L => L.assigned?.lb.status === 'AUTHORISED');

// single-GET live recon ONLY for PAID-assigned (the delete candidates)
console.log(`Live recon-checking ${paidAssigned.length} PAID-assigned lines…`);
const phantoms = [];
let n = 0;
for (const L of paidAssigned) {
  const a = L.assigned;
  const conf = a.exact && a.name && a.lb.att ? 'high' : (a.exact || (a.name && a.lb.att)) ? 'medium' : 'low';
  if (conf === 'low') continue;
  try { const t = (await xero.get(`BankTransactions/${L.id}`)).BankTransactions?.[0];
    if (t && t.IsReconciled === false && t.Status !== 'DELETED' && a.lb.att) phantoms.push({ txnId: L.id, billId: a.billId, billNum: a.lb.num || '', amount: L.total, vendor: L.contact_name, date: L.date, conf });
  } catch (e) { /* skip on error — never delete unverified */ }
  if (++n % 25 === 0) console.log(`  …${n}/${paidAssigned.length}`);
}
phantoms.sort((a, b) => a.amount - b.amount); // smallest $ first (wave order)

const ambiguous = authAssigned.map(L => ({ txnId: L.id, billId: L.assigned.billId, billNum: L.assigned.lb.num || '', amount: L.total, vendor: L.contact_name, date: L.date })).sort((a, b) => b.amount - a.amount);

writeFileSync('thoughts/shared/recon-pack/phantom-plan.json', JSON.stringify(phantoms, null, 2));
writeFileSync('thoughts/shared/recon-pack/ambiguous-plan.json', JSON.stringify(ambiguous, null, 2));
console.log(`\nphantom-plan.json: ${phantoms.length} (recon=false confirmed, conf≥medium)  ·  ambiguous-plan.json: ${ambiguous.length}`);
console.log(`Wave-of-20 (smallest $): ${phantoms.slice(0, 20).map(p => '$' + p.amount).join(', ')}`);
