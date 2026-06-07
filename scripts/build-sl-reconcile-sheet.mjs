#!/usr/bin/env node
/**
 * Full per-line reconciliation sheet for the NAB Visa (Oct–Dec) — for Standard Ledger to execute in
 * bulk, or Ben to work through. For EVERY card line, says: MATCH this bill (+surcharge adjustment) /
 * DUPLICATE (delete the dup) / CREATE with coding (learned from your Dext archive). READ-ONLY.
 *
 * Matching: fuzzy amount (catches card surcharges) + vendor-token gate + date window, against fresh
 * Xero bills + transactions + the Dext archive. Surcharge = bank charge − receipt amount.
 *
 * Usage: node scripts/build-sl-reconcile-sheet.mjs nicholas-marchesi-2026-06-01.csv
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || 'nicholas-marchesi-2026-06-01.csv';
const WIN = 12, FROM = '2025-10-01', TO = '2025-12-31';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const toISO=(d)=>{const m=(d||'').match(/(\d{1,2})-(\w{3})-(\d{4})/);return m?`${m[3]}-${MON[m[2]]}-${m[1].padStart(2,'0')}`:null;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const money=(n)=>'$'+Number(n).toLocaleString('en-AU',{minimumFractionDigits:2});
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP','MEMBERSHIP','LIMITED','SYDNEY','STORES','CENTRE','GROUP','SALES','SERVICES','SERVICE','STORE','SHOP','ONLINE','COMMUNITY','HIRE','CO','OF','GEORGE','WEST','EAST','NORTH','SOUTH']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=4&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};
const amtClose=(a,b)=>{const d=Math.abs(a-b);return d<0.005?'exact':(d<=15&&d<=b*0.06)?'fuzzy':false;};

const rows=parseCSV(readFileSync(CSV,'utf8'));const H=rows[0];const ix=(n)=>H.indexOf(n);
const dext=rows.slice(1).filter(r=>r[0]).map(r=>({date:toISO(r[ix('Date')]),supplier:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||r[ix('Total')]||0),category:r[ix('Category')],project:[r[ix('Project')],r[ix('Project 2')]].filter(Boolean).join(' / '),image:r[ix('Image')]}));
const vendorMap={};for(const d of dext){const k=norm(d.supplier);if(!k)continue;(vendorMap[k]=vendorMap[k]||{cat:{},proj:{}});if(d.category)vendorMap[k].cat[d.category]=(vendorMap[k].cat[d.category]||0)+1;if(d.project)vendorMap[k].proj[d.project]=(vendorMap[k].proj[d.project]||0)+1;}
const top=(o)=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
const learned=(v)=>{for(const k of Object.keys(vendorMap))if(vmatch(v,k))return{cat:top(vendorMap[k].cat),proj:top(vendorMap[k].proj)};return null;};

async function fetchAll(query){let out=[],off=0;while(true){const{data,error}=await sb.rpc('exec_sql',{query:query+` LIMIT 1000 OFFSET ${off}`});if(error){console.error(error.message);process.exit(1);}out.push(...data);if(data.length<1000)break;off+=1000;}return out;}
const lines=await fetchAll(`SELECT date,payee,particulars,ABS(amount)::numeric(12,2) amount FROM bank_statement_lines WHERE bank_account='NAB Visa ACT #8815' AND direction='debit' AND date BETWEEN '${FROM}' AND '${TO}' ORDER BY date`);
const bills=await fetchAll(`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,status,has_attachments FROM xero_invoices WHERE type='ACCPAY' AND status IN ('AUTHORISED','PAID','DRAFT') AND date BETWEEN '${FROM}'::date-10 AND '${TO}'::date+10`);
const txns=await fetchAll(`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,is_reconciled FROM xero_transactions WHERE bank_account='NAB Visa ACT #8815' AND type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' AND date BETWEEN '${FROM}'::date-10 AND '${TO}'::date+10`);

const find=(arr,amt,date,v)=>arr.map(r=>({r,c:amtClose(r.amt,amt)})).filter(x=>x.c&&gap(x.r.date,date)<=WIN&&vmatch(v,x.r.contact_name)).sort((a,b)=>(a.c==='exact'?0:1)-(b.c==='exact'?0:1)||gap(a.r.date,date)-gap(b.r.date,date))[0]?.r;
const sur=(bank,row)=>{const d=+(bank-row).toFixed(2);return Math.abs(d)<0.005?'':` +${money(d)} surcharge`;};

const B={dup:[],match:[],approve:[],createDext:[],create:[]};
for(const l of lines){
  const v=`${l.payee||''} ${l.particulars||''}`,amt=Number(l.amount);
  const bill=find(bills,amt,l.date,v),txn=find(txns,amt,l.date,v),dx=find(dext.map(d=>({...d,amt:d.total,contact_name:d.supplier})),amt,l.date,v),lc=learned(v);
  if(bill&&txn)B.dup.push({l,bill,note:sur(amt,bill.amt)});
  else if(bill&&bill.status==='DRAFT')B.approve.push({l,bill,note:sur(amt,bill.amt)});
  else if(bill)B.match.push({l,bill,note:sur(amt,bill.amt)});
  else if(txn&&!txn.is_reconciled)B.match.push({l,bill:{contact_name:txn.contact_name,status:'TXN'},note:sur(amt,txn.amt)});
  else if(dx)B.createDext.push({l,dx,note:sur(amt,dx.total)});
  else B.create.push({l,lc});
}
const sum=(a)=>a.reduce((t,x)=>t+Number(x.l.amount),0);
console.log(`lines ${lines.length} | DUP ${B.dup.length} | MATCH ${B.match.length} | APPROVE-draft ${B.approve.length} | CREATE+Dext ${B.createDext.length} | CREATE ${B.create.length}`);

let md=`# NAB Visa #8815 — full reconciliation sheet (Oct–Dec 2025)\n**Generated:** ${new Date().toISOString().slice(0,16).replace('T',' ')} · ${lines.length} card lines · source: bank_statement_lines × Xero bills/txns × Dext archive.\n\n`;
md+=`> ⚠️ Directional, not gospel: bank mirror may be stale + vendor names are fuzzy across 3 systems. Eyeball the vendor before ticking. Surcharge = bank charge − receipt; add it via Xero **Adjustments → Bank Fees**.\n\n`;
md+=`| Action | Lines | $ |\n|---|---|---|\n| ♻️ DUPLICATE (match bill, delete dup txn) | ${B.dup.length} | ${money(sum(B.dup))} |\n| 🔗 MATCH to existing bill/txn | ${B.match.length} | ${money(sum(B.match))} |\n| ✍️ APPROVE draft bill then match | ${B.approve.length} | ${money(sum(B.approve))} |\n| 🆕 CREATE w/ Dext coding+receipt | ${B.createDext.length} | ${money(sum(B.createDext))} |\n| ✏️ CREATE + code (no receipt) | ${B.create.length} | ${money(sum(B.create))} |\n\n`;
const row=(x)=>`- [ ] ${x.l.date} · ${money(x.l.amount)} · ${(x.l.payee||x.l.particulars||'').slice(0,30)}`;
md+=`## ♻️ DUPLICATES — match the bill, DELETE the duplicate card txn (${B.dup.length})\n`;B.dup.sort((a,b)=>b.l.amount-a.l.amount).forEach(x=>md+=row(x)+` → bill "${x.bill.contact_name}" (${x.bill.status})${x.note}\n`);
md+=`\n## 🔗 MATCH — search the bill by name, tick it, add any surcharge (${B.match.length})\n`;B.match.sort((a,b)=>a.l.date<b.l.date?-1:1).forEach(x=>md+=row(x)+` → "${x.bill.contact_name}" (${x.bill.status})${x.note}\n`);
md+=`\n## ✍️ APPROVE draft bill first, then match (${B.approve.length})\n`;B.approve.forEach(x=>md+=row(x)+` → draft bill "${x.bill.contact_name}"${x.note}\n`);
md+=`\n## 🆕 CREATE with Dext coding + attach receipt (${B.createDext.length})\n`;B.createDext.sort((a,b)=>a.l.date<b.l.date?-1:1).forEach(x=>md+=row(x)+` → ${x.dx.category} · ${x.dx.project||'no project'}${x.note} · receipt ${x.dx.image}\n`);
md+=`\n## ✏️ CREATE + code by hand — no bill/receipt (${B.create.length})\n`;B.create.sort((a,b)=>a.l.date<b.l.date?-1:1).forEach(x=>md+=row(x)+(x.lc?` → ${x.lc.cat||'?'}${x.lc.proj?' · '+x.lc.proj:''} (from your Dext vendor history)`:` → code by hand`)+`\n`);
const fn=`scripts/output/nab-visa-FULL-reconcile-sheet-${new Date().toISOString().slice(0,10)}.md`;
writeFileSync(fn,md);console.log(`Wrote ${fn}`);
