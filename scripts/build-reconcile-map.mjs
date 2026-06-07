#!/usr/bin/env node
/**
 * Master reconcile map for the NAB Visa card: for every Oct–Dec bank line, says EXACTLY what to do —
 * Match to an existing bill, approve-then-match a draft, kill a duplicate, Create-with-Dext-coding,
 * or Create-by-hand. Cross-references bank_statement_lines × xero_invoices (bills) × xero_transactions
 * × the Dext archive CSV. READ-ONLY (writes a sheet to scripts/output/).
 *
 * Usage: node scripts/build-reconcile-map.mjs nicholas-marchesi-2026-06-01.csv
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || 'nicholas-marchesi-2026-06-01.csv';
const WIN = 7;
const FROM = '2025-10-01', TO = '2025-12-31';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const toISO=(d)=>{const m=(d||'').match(/(\d{1,2})-(\w{3})-(\d{4})/);return m?`${m[3]}-${MON[m[2]]}-${m[1].padStart(2,'0')}`:null;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const money=(n)=>'$'+Number(n).toLocaleString('en-AU',{minimumFractionDigits:2});

// Dext lookup
const rows=parseCSV(readFileSync(CSV,'utf8'));const H=rows[0];const ix=(n)=>H.indexOf(n);
const dext=rows.slice(1).filter(r=>r[0]&&/8815|1656/.test(r[ix('Bank Account')]||'')).map(r=>({date:toISO(r[ix('Date')]),supplier:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||r[ix('Total')]||0),category:r[ix('Category')],project:[r[ix('Project')],r[ix('Project 2')]].filter(Boolean).join(' / '),image:r[ix('Image')]}));

// paginated fetch helper
async function fetchAll(query){let out=[],off=0;while(true){const{data,error}=await sb.rpc('exec_sql',{query:query+` LIMIT 1000 OFFSET ${off}`});if(error){console.error(error.message);process.exit(1);}out.push(...data);if(data.length<1000)break;off+=1000;}return out;}

const lines=(await fetchAll(`SELECT id,date,payee,particulars,ABS(amount)::numeric(12,2) amount,status FROM bank_statement_lines WHERE bank_account='NAB Visa ACT #8815' AND direction='debit' AND date BETWEEN '${FROM}' AND '${TO}' ORDER BY date,id`));
const bills=(await fetchAll(`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,status,has_attachments FROM xero_invoices WHERE type='ACCPAY' AND date BETWEEN '${FROM}'::date-10 AND '${TO}'::date+10 AND status IN ('AUTHORISED','PAID','DRAFT') ORDER BY date`));
const txns=(await fetchAll(`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,is_reconciled FROM xero_transactions WHERE bank_account='NAB Visa ACT #8815' AND type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' AND date BETWEEN '${FROM}'::date-10 AND '${TO}'::date+10 ORDER BY date`));
console.log(`bank lines ${lines.length} | bills ${bills.length} | txns ${txns.length} | dext ${dext.length}`);

const ub=new Set(),ut=new Set(),ud=new Set();
// vendor gate: normalise (drop SQ*/UBER* prefixes, card masks, numbers, PTY LTD) → require a shared 3+ char token
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*|UBER ?\*|SP ?\*|SQSP\*|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};
const pick=(arr,used,amt,date,vendor)=>{let b=-1,bg=99;for(let i=0;i<arr.length;i++){if(used.has(i))continue;const a=arr[i].amt;if(Math.abs(a-amt)<0.005&&vmatch(vendor,arr[i].contact_name)){const g=gap(arr[i].date,date);if(g<=WIN&&g<bg){b=i;bg=g;}}}return b;};

const buckets={match:[],approve:[],dup:[],createDext:[],createManual:[],done:[]};
for(const l of lines){
  const vend=`${l.payee||''} ${l.particulars||''}`;
  const bi=pick(bills,ub,Number(l.amount),l.date,vend);
  const ti=pick(txns,ut,Number(l.amount),l.date,vend);
  const di=(()=>{let b=-1,bg=99;for(let i=0;i<dext.length;i++){if(ud.has(i))continue;if(Math.abs(dext[i].total-Number(l.amount))<0.005&&dext[i].date&&vmatch(vend,dext[i].supplier)){const g=gap(dext[i].date,l.date);if(g<=WIN&&g<bg){b=i;bg=g;}}}return b;})();
  const bill=bi>=0?bills[bi]:null, txn=ti>=0?txns[ti]:null, dx=di>=0?dext[di]:null;
  if(bi>=0)ub.add(bi); if(ti>=0)ut.add(ti); if(di>=0)ud.add(di);
  const row={l,bill,txn,dx};
  if(bill&&txn) buckets.dup.push(row);
  else if(bill&&bill.status==='PAID') buckets.done.push(row);
  else if(bill&&bill.status==='AUTHORISED') buckets.match.push(row);
  else if(bill&&bill.status==='DRAFT') buckets.approve.push(row);
  else if(txn&&txn.is_reconciled) buckets.done.push(row);
  else if(txn) buckets.match.push(row);
  else if(dx) buckets.createDext.push(row);
  else buckets.createManual.push(row);
}
const sum=(a)=>a.reduce((t,r)=>t+Number(r.l.amount),0);
console.log(`\nMATCH-to-existing ${buckets.match.length} | APPROVE-draft ${buckets.approve.length} | DUPLICATE ${buckets.dup.length} | CREATE+Dext ${buckets.createDext.length} | CREATE-manual ${buckets.createManual.length} | likely-done ${buckets.done.length}`);

const ln=(r,extra)=>`- [ ] ${r.l.date} · **${money(r.l.amount)}** · ${(r.l.payee||r.l.particulars||'').slice(0,30)}${extra||''}`;
let md=`# NAB Visa reconcile map — what to do per line (Oct–Dec)\n**Generated:** ${new Date().toISOString().slice(0,16).replace('T',' ')} · bank lines ${lines.length}\n\n`;
md+=`| Action | Lines | $ |\n|---|---|---|\n`;
md+=`| 🔗 MATCH to existing bill/txn | ${buckets.match.length} | ${money(sum(buckets.match))} |\n`;
md+=`| ✍️ APPROVE draft bill, then match | ${buckets.approve.length} | ${money(sum(buckets.approve))} |\n`;
md+=`| ♻️ DUPLICATE — match bill, delete txn | ${buckets.dup.length} | ${money(sum(buckets.dup))} |\n`;
md+=`| 🆕 CREATE with Dext coding (+image) | ${buckets.createDext.length} | ${money(sum(buckets.createDext))} |\n`;
md+=`| ✏️ CREATE by hand (no receipt) | ${buckets.createManual.length} | ${money(sum(buckets.createManual))} |\n`;
md+=`| ✅ likely already done | ${buckets.done.length} | ${money(sum(buckets.done))} |\n\n`;

md+=`## 🔗 MATCH to existing (${buckets.match.length}) — Find & Match → tick it\n`;
buckets.match.forEach(r=>md+=ln(r,` → ${r.bill?`BILL ${r.bill.status} (${r.bill.contact_name})`:`TXN (${r.txn.contact_name})`}\n`));
md+=`\n## ✍️ APPROVE draft bill first (${buckets.approve.length})\n`;
buckets.approve.forEach(r=>md+=ln(r,` → DRAFT bill (${r.bill.contact_name}) — approve, then match\n`));
md+=`\n## ♻️ DUPLICATE — match the BILL, delete the card txn (${buckets.dup.length})\n`;
buckets.dup.forEach(r=>md+=ln(r,` → BILL ${r.bill.status} (${r.bill.contact_name}) + duplicate TXN ${r.txn.is_reconciled?'RECONCILED':'unrec'}\n`));
md+=`\n## 🆕 CREATE with Dext coding + attach image (${buckets.createDext.length})\n`;
buckets.createDext.forEach(r=>md+=ln(r,` → ${r.dx.category||'?'} · ${r.dx.project||'no project'} · [img](${r.dx.image})\n`));
md+=`\n## ✏️ CREATE by hand — no bill/txn/receipt (${buckets.createManual.length})\n`;
buckets.createManual.forEach(r=>md+=ln(r,'\n'));

const fn=`scripts/output/nab-visa-reconcile-map-${new Date().toISOString().slice(0,10)}.md`;
writeFileSync(fn,md);console.log(`\nWrote ${fn}`);
