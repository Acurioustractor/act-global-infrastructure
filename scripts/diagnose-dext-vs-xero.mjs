#!/usr/bin/env node
/**
 * Diagnostic: which Dext receipts made it into Xero vs not? Compares the Dext archive CSV against
 * xero_transactions (NAB Visa) by amount-exact + date window, classifies each Dext receipt, and
 * buckets the gap by week + supplier to reveal what broke. READ-ONLY.
 *
 * Usage: node scripts/diagnose-dext-vs-xero.mjs nicholas-marchesi-2026-06-01.csv
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || 'nicholas-marchesi-2026-06-01.csv';
const WIN = 4; // date window days

function parseCSV(text){const rows=[];let row=[],f='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||row.length){row.push(f);rows.push(row);}return rows;}
const MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const toISO=(d)=>{const m=(d||'').match(/(\d{1,2})-(\w{3})-(\d{4})/);return m?`${m[3]}-${MON[m[2]]}-${m[1].padStart(2,'0')}`:null;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const week=(d)=>{const dt=new Date(d);const on=new Date(dt);on.setDate(dt.getDate()-((dt.getDay()+6)%7));return on.toISOString().slice(0,10);};

// Dext card receipts
const rows=parseCSV(readFileSync(CSV,'utf8'));const H=rows[0];const ix=(n)=>H.indexOf(n);
const dext=rows.slice(1).filter(r=>r[0]&&/8815|1656/.test(r[ix('Bank Account')]||'')).map(r=>({
  date:toISO(r[ix('Date')]),supplier:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||r[ix('Total')]||0),
}));
const dMin=dext.map(d=>d.date).filter(Boolean).sort()[0], dMax=dext.map(d=>d.date).filter(Boolean).sort().slice(-1)[0];

// Xero card transactions over the Dext span
const {data:xt}=await sb.rpc('exec_sql',{query:`
  SELECT date, contact_name, ABS(total)::numeric(12,2) amt, is_reconciled
  FROM xero_transactions
  WHERE bank_account='NAB Visa ACT #8815' AND status IS DISTINCT FROM 'DELETED' AND type LIKE 'SPEND%'
    AND date BETWEEN '${dMin}'::date - 7 AND '${dMax}'::date + 7`});
console.log(`Dext card receipts: ${dext.length} (${dMin}→${dMax}) | Xero card SPEND in span: ${xt.length}`);

// classify each Dext receipt against Xero
const usedX=new Set();
let inRecon=0,inUnrec=0,notIn=[];
for(const d of dext){
  if(!d.date){notIn.push(d);continue;}
  let best=-1,bestGap=99;
  for(let i=0;i<xt.length;i++){if(usedX.has(i))continue;const x=xt[i];
    if(Math.abs(x.amt-d.total)<0.005){const g=gap(x.date,d.date);if(g<=WIN&&g<bestGap){best=i;bestGap=g;}}}
  if(best>=0){usedX.add(best);xt[best].is_reconciled?inRecon++:inUnrec++;}
  else notIn.push(d);
}
console.log(`\n=== Dext receipt → Xero status ===`);
console.log(`  ✅ in Xero, reconciled:      ${inRecon}`);
console.log(`  🟡 in Xero, NOT reconciled:  ${inUnrec}`);
console.log(`  ❌ NOT in Xero at all:        ${notIn.length}  ← the gap`);

// pattern: gap by week
console.log(`\n=== "NOT in Xero" by week (what broke + when) ===`);
const byWk={};for(const d of notIn){const w=d.date?week(d.date):'(no date)';(byWk[w]=byWk[w]||{n:0,amt:0}).n++;byWk[w].amt+=d.total;}
for(const [w,v] of Object.entries(byWk).sort()) console.log(`  wk ${w}: ${String(v.n).padStart(3)} receipts  $${v.amt.toFixed(0)}`);

// pattern: gap by supplier (top)
console.log(`\n=== "NOT in Xero" top suppliers ===`);
const bySup={};for(const d of notIn){bySup[d.supplier]=(bySup[d.supplier]||0)+1;}
Object.entries(bySup).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([s,n])=>console.log(`  ${String(n).padStart(3)}  ${s}`));

// reverse: Xero card txns with NO Dext receipt
const xNoDext=xt.filter((_,i)=>!usedX.has(i));
console.log(`\n=== Reverse: Xero card SPEND with NO Dext receipt: ${xNoDext.length} (${xNoDext.filter(x=>!x.is_reconciled).length} of them unreconciled) ===`);
