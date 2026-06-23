#!/usr/bin/env node
/**
 * SL clean-up reconciler — answers a Standard Ledger "Unreconciled Transactions" clean-up
 * sheet. Parses the two-section SL CSV (NJ Marchesi T/as ACT Everyday + NAB Visa ACT #8815),
 * then for EACH line finds what we already know: the source bank line + its current coding, a
 * matching Xero txn/bill (with attachment + account + GST), and any receipt document on file.
 *
 * READ-ONLY. Emits grounded JSON for downstream classification + a console summary.
 *
 * Usage:
 *   node scripts/sl-cleanup-reconcile.mjs "/path/to/SL clean-up.csv"
 *   (default path = the Downloads file)
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || path.join(os.homedir(), 'Downloads', 'Clean up_ ACT_Nicholas Marchesi  - Unreconciled Transactions.csv');
const WIN = 9;        // date window (days) for txn/bill match
const RWIN = 16;      // wider window for receipt-document match

// ---- CSV parse (RFC-ish, handles quoted commas) ----
function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const num = (s)=>{const n=parseFloat(String(s||'').replace(/[, ]/g,''));return Number.isFinite(n)?n:null;};
const toISO = (d)=>{const m=String(d||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:null;}; // MM/DD/YYYY
const ACCOUNTS = { 'NJ Marchesi T/as ACT Everyday': true, 'NAB Visa ACT #8815': true };

const grid = parseCSV(readFileSync(CSV,'utf8'));
let account = null;
const lines = [];
for (const row of grid) {
  const joined = row.map(c=>c.trim());
  const acctCell = joined.find(c=>ACCOUNTS[c]);
  if (acctCell) { account = acctCell; continue; }
  const date = toISO(joined[1]);
  if (!date) continue;                       // header / blank
  let particulars = joined[2] || '';
  let spent = num(joined[3]);
  let received = num(joined[4]);
  // malformed row guard: particulars duplicated into the Spent column
  if (joined[3] === particulars) { spent = null; received = num(joined[4]); }
  const slComment = (joined[5] || '').replace(/^SL:\s*/,'').trim();
  const direction = received != null ? 'received' : 'spent';
  const amount = received != null ? received : spent;
  if (amount == null) continue;
  lines.push({ account, date, particulars, direction, amount, slComment });
}

// ---- matching helpers ----
const q = async (sql)=>{const{data,error}=await sb.rpc('exec_sql',{query:sql});if(error){console.error('SQL ERR:',error.message,'\n',sql.slice(0,160));return[];}return data;};
const norm = (s)=>(s||'').toUpperCase().replace(/PTY LTD| LTD| INC|X{4,}\d*|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP = new Set(['THE','AND','PURCHASE','CARD','CREDIT','DEBIT','TRANSFER','MONEY','INTERBANK','THANKS','PAYMENT','PTY','COM','AUSTRALIA','ACT','CURIOUS','TRACTOR','MR','MRS','MS']);
const toks = (s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch = (a,b)=>{const A=toks(a),B=toks(b);for(const t of A)if(B.has(t))return true;return false;};
const liInfo = (li)=>{ try{ const a=typeof li==='string'?JSON.parse(li):li; const f=Array.isArray(a)?a[0]:null; if(!f)return {}; return { acct:f.AccountCode||f.account_code, tax:f.TaxType||f.tax_type, desc:f.Description||f.description }; }catch{ return {}; } };

async function ground(l){
  const lo = `'${l.date}'::date - ${WIN}`, hi = `'${l.date}'::date + ${WIN}`;
  const rlo = `'${l.date}'::date - ${RWIN}`, rhi = `'${l.date}'::date + ${RWIN}`;
  const amt = l.amount;
  const txnType = l.direction === 'spent' ? "type IN ('SPEND','SPEND-TRANSFER')" : "type IN ('RECEIVE','RECEIVE-TRANSFER')";
  const invType = l.direction === 'spent' ? "'ACCPAY'" : "'ACCREC'";

  const [bankLine] = await q(`SELECT date,payee,particulars,project_code,direction,matched_xero_transaction_id,matched_receipt_email_id,receipt_match_status FROM bank_statement_lines WHERE bank_account='${l.account.replace(/'/g,"''")}' AND ABS(amount)=${amt} AND date BETWEEN ${lo} AND ${hi} ORDER BY ABS(date - '${l.date}'::date) LIMIT 1`);

  const txns = await q(`SELECT xero_transaction_id,contact_name,date,total,status,is_reconciled,has_attachments,project_code,project_code_source,line_items FROM xero_transactions WHERE bank_account='${l.account.replace(/'/g,"''")}' AND ${txnType} AND status IS DISTINCT FROM 'DELETED' AND ABS(total)=${amt} AND date BETWEEN ${lo} AND ${hi}`);
  const txn = txns.find(t=>vmatch(l.particulars, t.contact_name)) || txns[0] || null;

  const bills = await q(`SELECT invoice_number,contact_name,date,total,status,has_attachments,reference,project_code,line_items FROM xero_invoices WHERE type=${invType} AND status IN ('AUTHORISED','PAID','DRAFT') AND ABS(total)=${amt} AND date BETWEEN '${l.date}'::date-12 AND '${l.date}'::date+12`);
  const bill = bills.find(b=>vmatch(l.particulars, b.contact_name)) || bills[0] || null;

  const recs = await q(`SELECT vendor_name,document_date,amount_total,source,mailbox,from_email,subject,attachment_filename,project_code,status FROM finance_receipt_documents WHERE amount_total=${amt} AND document_date BETWEEN ${rlo} AND ${rhi} ORDER BY ABS(document_date::date - '${l.date}'::date) LIMIT 3`);
  const rec = recs.find(r=>vmatch(l.particulars, r.vendor_name)) || recs[0] || null;

  const hasReceipt = !!(txn?.has_attachments || bill?.has_attachments || rec);
  return {
    ...l,
    bank_line: bankLine ? { project_code: bankLine.project_code, matched_txn: bankLine.matched_xero_transaction_id, matched_receipt: bankLine.matched_receipt_email_id, receipt_status: bankLine.receipt_match_status } : null,
    xero_txn: txn ? { contact: txn.contact_name, status: txn.status, is_reconciled: txn.is_reconciled, has_attachments: txn.has_attachments, project_code: txn.project_code, ...liInfo(txn.line_items) } : null,
    xero_bill: bill ? { number: bill.invoice_number, contact: bill.contact_name, status: bill.status, has_attachments: bill.has_attachments, project_code: bill.project_code, ...liInfo(bill.line_items) } : null,
    receipt_doc: rec ? { vendor: rec.vendor_name, source: rec.source, mailbox: rec.mailbox, from: rec.from_email, subject: rec.subject, file: rec.attachment_filename, date: rec.document_date } : null,
    has_receipt: hasReceipt,
  };
}

const grounded = [];
for (const l of lines) grounded.push(await ground(l));

// ---- summary ----
const withR = grounded.filter(g=>g.has_receipt).length;
const inXero = grounded.filter(g=>g.xero_txn||g.xero_bill).length;
console.log(`\nParsed ${lines.length} lines | in Xero mirror: ${inXero} | already have a receipt: ${withR} | receipt GAP: ${grounded.length-withR}\n`);
for (const g of grounded) {
  const tag = g.has_receipt ? '✅R' : '❌ ';
  const cw = (g.xero_txn?.project_code || g.xero_bill?.project_code || g.bank_line?.project_code || '—');
  const acct = g.xero_txn?.acct || g.xero_bill?.acct || '';
  const src = g.receipt_doc ? `rec:${g.receipt_doc.source}` : g.xero_bill?.has_attachments ? 'bill-att' : g.xero_txn?.has_attachments ? 'txn-att' : '';
  console.log(`${tag} ${g.date} ${(g.direction==='spent'?'-':'+')}$${String(g.amount).padStart(9)} ${(g.particulars.slice(0,42)).padEnd(43)} proj:${String(cw).padEnd(10)} acct:${String(acct).padEnd(5)} ${src}`);
}

// ---- write grounded JSON ----
const outDir = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'grounded.json');
writeFileSync(outPath, JSON.stringify({ generated_at_note: 'run date stamped by caller', source_csv: CSV, count: grounded.length, lines: grounded }, null, 2));
console.log(`\nGrounded dataset → ${outPath}`);
