#!/usr/bin/env node
/**
 * Co-pilot line lookup: for each card bank line you give it, says exactly what to do in Xero —
 * Match an existing bill, kill a duplicate, or Create with the right coding (learned from how you
 * coded that vendor in Dext). Reliable because each line is known (vendor+amount+date), matched
 * against FRESH Xero data (not the stale bank-line mirror). READ-ONLY.
 *
 * Lines: edit LINES below, or pass a file of "amount|date|vendor" rows as argv[3].
 * Usage: node scripts/reconcile-line-lookup.mjs nicholas-marchesi-2026-06-01.csv [lines.txt]
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || 'nicholas-marchesi-2026-06-01.csv';
const WIN = 12;

// Page 1 of the NAB Visa reconcile screen (Oct 2025): [amount, 'YYYY-MM-DD', 'vendor as shown']
const LINES = [
  [86.19,'2025-10-06','SQ NEST IN WITTA'],[424.91,'2025-10-07','CENTRE TRAILER SALES CICCONE'],
  [275.44,'2025-10-07','AGL SALES'],[94.00,'2025-10-07','RICEBOI MOOLOOLABA'],
  [112.16,'2025-10-08','SUSHI GOSU'],[56.70,'2025-10-08','WOOLWORTHS MALENY'],
  [296.50,'2025-10-08','COLES ALICE SPRINGS'],[7.11,'2025-10-08','SUSHI GOSU'],
  [175.67,'2025-10-10','AHERRENGE COMMUNITY'],[19.11,'2025-10-10','CABFARE'],
  [181.39,'2025-10-10','AHERRENGE COMMUNITY'],[88.34,'2025-10-13','DUYU COFFEE ROASTERS'],
  [31.75,'2025-10-13','BOJANGLES ALICE'],[75.00,'2025-10-13','XERO AU'],
  [12.18,'2025-10-13','ZLR UNCLE DON WEST END'],[25.71,'2025-10-13','UBER BUSINESS HELP'],
  [156.20,'2025-10-14','DAYUSE PARIS'],[1820.69,'2025-10-14','HATCH ELECTRICAL ZILLMERE'],
  [239.00,'2025-10-14','BOOKING.COM AMSTERDAM'],[323.30,'2025-10-14','BEARPEP LARRAKEYAH'],
  [64.99,'2025-10-14','BEARPEP LARRAKEYAH'],[239.00,'2025-10-15','NOVOTEL SYDNEY'],
  [194.75,'2025-10-15','BOOKING.COM SYDNEY'],[9.99,'2025-10-16','AMZNPRIME MEMBERSHIP'],
  [204.62,'2025-10-16','BARLMARRK SUPERMARKET'],[24.00,'2025-10-20','NEWS PTY LIMITED'],
  [1032.90,'2025-10-20','AVIS AUSTRALIA'],[759.45,'2025-10-20','VIRGIN AUSTRALIA'],
  [49.68,'2025-10-20','TEITZELS IGA'],[73.10,'2025-10-21','WOOLWORTHS GEORGE'],
  [167.75,'2025-10-21','BIG W GEORGE'],[89.69,'2025-10-21','ECOFLO'],
  [11.80,'2025-10-22','SQUARESPACE'],[23.58,'2025-10-22','CAFE MIA EDGECLIFF'],
  [37.46,'2025-10-27','CABCHARGE 13CABS'],[16.45,'2025-10-27','AUDIBLE'],
  [3.96,'2025-10-27','BUTCHERS BUFFET'],[314.20,'2025-10-28','JMC NO2'],
  [534.19,'2025-10-28','DINKUM DUNNIES CABOOLTURE'],[37.93,'2025-10-29','GONE BONKERS'],
  [33.63,'2025-10-29','OPENAI CHATGPT'],[28.10,'2025-10-29','GUZMAN Y GOMEZ'],
  [352.22,'2025-10-30','VALLEY SLICE'],[12.60,'2025-10-30','C ADV INTERNET TFR FEE'],
  [33.00,'2025-10-30','GARMIN'],[100.00,'2025-10-31','LIBERTY MALENY'],
  [245.28,'2025-10-31','ALDI CALOUNDRA'],[12.07,'2025-10-31','SOURCE BULK FOODS MALENY'],
  [483.33,'2025-10-31','WOOLWORTHS MALENY'],
];

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const toISO=(d)=>{const m=(d||'').match(/(\d{1,2})-(\w{3})-(\d{4})/);return m?`${m[3]}-${MON[m[2]]}-${m[1].padStart(2,'0')}`:null;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP','MEMBERSHIP','LIMITED','SYDNEY','STORES']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};

// --- Dext archive: exact rows + vendor→coding learned map ---
const rows=parseCSV(readFileSync(CSV,'utf8'));const H=rows[0];const ix=(n)=>H.indexOf(n);
const dext=rows.slice(1).filter(r=>r[0]).map(r=>({date:toISO(r[ix('Date')]),supplier:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||r[ix('Total')]||0),category:r[ix('Category')],project:[r[ix('Project')],r[ix('Project 2')]].filter(Boolean).join(' / '),image:r[ix('Image')]}));
const vendorMap={}; // supplier → {cat counts, proj counts}
for(const d of dext){const k=norm(d.supplier);if(!k)continue;(vendorMap[k]=vendorMap[k]||{cat:{},proj:{}});if(d.category)vendorMap[k].cat[d.category]=(vendorMap[k].cat[d.category]||0)+1;if(d.project)vendorMap[k].proj[d.project]=(vendorMap[k].proj[d.project]||0)+1;}
const top=(o)=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
const learnedCoding=(vendor)=>{for(const k of Object.keys(vendorMap))if(vmatch(vendor,k))return{cat:top(vendorMap[k].cat),proj:top(vendorMap[k].proj)};return null;};
// last-resort heuristic for vendors never seen in Dext: keyword → account; location → project hint
const guess=(v)=>{const u=v.toUpperCase();
  const acct=/UBER|CAB|TAXI/.test(u)?'452 - Taxis':/HOTEL|NOVOTEL|BOOKING|DAYUSE|AIRBNB|QANTAS|VIRGIN|AVIS/.test(u)?'493 - Travel':/XERO|SQUARESPACE|OPENAI|GARMIN|ADOBE|FIGMA/.test(u)?'485 - Subscriptions':/AMZNPRIME|AUDIBLE|PRIME/.test(u)?'880 - Drawings (personal?)':/ECOFLO|HARDWARE|STRATCO|BUNNINGS/.test(u)?'446 - Materials & Supplies':/NEWS PTY/.test(u)?'485 - Subscriptions':/WOOLW|COLES|ALDI|IGA|SUPERMARKET|FOODS|BUTCHER|GUZMAN|CAFE|SUSHI|RICEBOI|BONKERS|BUFFET/.test(u)?'421 - Light meals':'? - code by hand';
  const proj=/ALICE|AMPIL|LARRAKEYAH|MANINGRIDA|BARLMARRK|AHERRENGE|TENNANT/.test(u)?'NT trip → ACT-GD/OO?':/MALENY|WITTA|CALOUNDRA|MOOLOOLABA|CONONDALE/.test(u)?'ACT-FM (Farm)?':/SURRY|SYDNEY|GEORGE|EDGECLIFF|MASCOT/.test(u)?'Sydney → ?':'';
  return acct+(proj?' · '+proj:'');};

// --- fresh Xero data for the period ---
const span=`date BETWEEN '2025-09-25' AND '2025-12-20'`;
const {data:bills}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,status,has_attachments FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND ${span}`});
const {data:txns}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date,ABS(total)::numeric(12,2) amt,is_reconciled FROM xero_transactions WHERE bank_account='NAB Visa ACT #8815' AND type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' AND ${span}`});

const findIn=(arr,amt,date,vendor)=>arr.filter(r=>Math.abs(r.amt-amt)<0.005&&gap(r.date,date)<=WIN&&vmatch(vendor,r.contact_name)).sort((a,b)=>gap(a.date,date)-gap(b.date,date))[0];
const findDext=(amt,date,vendor)=>dext.filter(d=>Math.abs(d.total-amt)<0.005&&d.date&&gap(d.date,date)<=WIN&&vmatch(vendor,d.supplier)).sort((a,b)=>gap(a.date,date)-gap(b.date,date))[0];

console.log(`Lines: ${LINES.length} | bills ${bills.length} | txns ${txns.length} | dext ${dext.length}\n`);
let nMatch=0,nDup=0,nCreate=0;
for(const [amt,date,vendor] of LINES){
  const bill=findIn(bills,amt,date,vendor), txn=findIn(txns,amt,date,vendor), dx=findDext(amt,date,vendor), learned=learnedCoding(vendor);
  let action;
  if(bill&&txn){action=`♻️ DUPLICATE → match the BILL (${bill.status}, ${bill.contact_name}), DELETE the card txn`;nDup++;}
  else if(bill&&bill.status==='DRAFT'){action=`✍️ APPROVE draft bill (${bill.contact_name}), then MATCH`;nMatch++;}
  else if(bill){action=`🔗 MATCH to bill (${bill.status}, ${bill.contact_name}${bill.has_attachments?', has receipt':''})`;nMatch++;}
  else if(txn&&!txn.is_reconciled){action=`🔗 MATCH to existing txn (${txn.contact_name})`;nMatch++;}
  else if(dx){action=`🆕 CREATE → ${dx.category} · ${dx.project||'no project'} · [receipt] ${dx.image}`;nCreate++;}
  else if(learned){action=`✏️ CREATE → ${learned.cat||'?'}${learned.proj?' · '+learned.proj:''}  (learned from your Dext coding of this vendor)`;nCreate++;}
  else {action=`✏️ CREATE → ${guess(vendor)}  (heuristic — confirm)`;nCreate++;}
  console.log(`$${String(amt).padStart(8)} ${date} ${vendor.slice(0,30).padEnd(30)} ${action}`);
}
console.log(`\nMatch ${nMatch} · Duplicate ${nDup} · Create ${nCreate}`);
