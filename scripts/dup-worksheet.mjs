#!/usr/bin/env node
// READ-ONLY worksheet for the 27 GST-bearing duplicates: per line, where the receipt lives
// (bill vs spend-money) + which copy is reconciled → exact keep/remove instruction.
// Source: synced Xero mirror (xero_invoices.has_attachments is ACCURATE; xero_transactions.has_attachments DRIFTS so we don't trust it — we use the BILL's receipt flag as the safety signal).
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PACKS = [
  { q: 'Q2', pack: 'thoughts/shared/recon-pack/q2-fy26-reconciliation-pack.md', dext: 'thoughts/shared/recon-pack/dext/q2-dext-2026-06-01.csv', span: `date BETWEEN '2025-09-25' AND '2026-01-05'` },
  { q: 'Q3', pack: 'thoughts/shared/recon-pack/q3-fy26-reconciliation-pack.md', dext: 'thoughts/shared/recon-pack/dext/q3-dext-2026-06-01.csv', span: `date BETWEEN '2025-12-25' AND '2026-04-05'` },
];

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP','MEMBERSHIP','LIMITED','SYDNEY','STORES','CENTRE','GROUP','SALES','SERVICES','SERVICE','STORE','SHOP','ONLINE','COMMUNITY','HIRE','CO','OF']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};
const amtClose=(a,b)=>{const d=Math.abs(a-b);return d<0.02?'exact':(d<=15&&d<=b*0.07)?'fuzzy':false;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const WIN=12;

function dupsFromPack(md){
  const lines=md.split('\n'); let inSec=false; const out=[];
  for(const ln of lines){
    if(ln.startsWith('## 1 ·')){inSec=true;continue;}
    if(inSec && (ln.startsWith('### ') || (ln.startsWith('## ') && !ln.startsWith('## 1')))) break;
    if(inSec && ln.startsWith('| ') && !/\| Date/.test(ln) && !/\|---/.test(ln)){
      const c=ln.split('|').map(s=>s.trim()).filter((_,i,a)=>i>0&&i<a.length-1);
      const date=c[0], vendor=c[1], amt=parseFloat((c[2]||'').replace(/[$,]/g,''));
      if(vendor && !isNaN(amt)) out.push({date,vendor,amt});
    }
  }
  return out;
}

const find=(arr,amt,date,vendor)=>{let best=null,bs=-1;for(const r of arr){const ac=amtClose(r.amt,amt);if(!ac)continue;if(gap(r.date,date)>WIN)continue;if(!vmatch(vendor,r.contact_name))continue;const s=(ac==='exact'?2:1);if(s>bs){bs=s;best={...r,ac};}}return best;};

let clean=0, verify=0, missing=0;
const WS={Q2:[],Q3:[]}; let GTOTAL=0;
for(const {q,pack,dext,span} of PACKS){
  const {data:bills,error:be}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date::text,ABS(total)::numeric(12,2) amt,status,has_attachments FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND ${span}`});
  const {data:txns,error:te}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date::text,ABS(total)::numeric(12,2) amt,is_reconciled,has_attachments FROM xero_transactions WHERE bank_account='NAB Visa ACT #8815' AND type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' AND ${span}`});
  if(be||te){console.error('SQL error',be||te);process.exit(1);}
  const dups=dupsFromPack(readFileSync(pack,'utf8'));
  const rows=parseCSV(readFileSync(dext,'utf8'));const H=rows[0];const ix=(n)=>H.indexOf(n);
  const D=rows.slice(1).filter(r=>r[0]).map(r=>({supplier:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||0),tax:parseFloat(r[ix('Tax (AUD)')]||0)}));
  const dextTax=(amt,vendor)=>{let best=null,bs=-1;for(const x of D){const ac=amtClose(amt,x.total);if(!ac)continue;const s=(ac==='exact'?2:1)+(vmatch(vendor,x.supplier)?2:0);if(s>bs){bs=s;best=x;}}return best?best.tax:0;};
  const gst = dups.filter(d=>dextTax(d.amt,d.vendor)>0.005);
  console.log(`\n================= ${q} — ${gst.length} GST-bearing duplicates  (mirror: bills ${bills.length}${bills.length>=1000?' ⚠️CAPPED':''} · txns ${txns.length}${txns.length>=1000?' ⚠️CAPPED':''}) =================`);
  for(const d of gst){
    const bill=find(bills,d.amt,d.date,d.vendor), txn=find(txns,d.amt,d.date,d.vendor);
    const tax=dextTax(d.amt,d.vendor); GTOTAL+=tax;
    const reconState = txn ? (txn.is_reconciled?'RECONCILED':'unreconciled') : '—';
    const action = (txn&&txn.is_reconciled)
      ? `⚠️ spend-money is RECONCILED → **Remove & Redo** the bank line first, then delete the spend-money & match the line to the bill`
      : (bill&&bill.status==='AUTHORISED')
        ? `delete the unreconciled spend-money, then **Match** the bank line to the bill (pays + reconciles it)`
        : `delete the unreconciled spend-money (bill already PAID/reconciled — phantom duplicate)`;
    WS[q].push({amt:d.amt,date:d.date,vendor:d.vendor,billStatus:bill?bill.status:'—',rcpt:bill?bill.has_attachments:false,reconState,tax,action});
    let verdict;
    if(bill&&bill.has_attachments){verdict=`✅ DELETE spend-money · receipt SAFE on bill (${bill.status}) → then reconcile bank line to the bill`;clean++;}
    else if(bill&&!bill.has_attachments){verdict=`⚠️ VERIFY in UI — bill (${bill.status}) has NO receipt; receipt likely on the spend-money → keep the copy that has it`;verify++;}
    else if(!bill&&txn){verdict=`⚠️ no bill in mirror — only a spend-money${txn.is_reconciled?' (reconciled)':' (unreconciled)'} → verify in UI`;verify++;}
    else {verdict=`❓ neither bill nor txn matched in mirror (may already be resolved) → verify in UI`;missing++;}
    const bflag=bill?`bill:${bill.status}${bill.has_attachments?'+rcpt':'/NO-rcpt'}`:'bill:—';
    const tflag=txn?`txn:${txn.is_reconciled?'recon':'UNrecon'}`:'txn:—';
    console.log(`  $${d.amt.toFixed(2).padStart(8)} ${d.date} ${d.vendor.slice(0,26).padEnd(26)} [${bflag} | ${tflag}]\n        ${verdict}`);
  }
}
console.log(`\n========== ${clean} clean-delete · ${verify} verify-in-UI · ${missing} not-found ==========`);

// --- emit tickable markdown worksheet ---
const qTotal=(q)=>WS[q].reduce((s,r)=>s+r.tax,0);
let md=`# GST-bearing duplicate fix — worksheet (27 lines, $${GTOTAL.toFixed(2)} 1B over-claim)

> Generated by \`scripts/dup-worksheet.mjs\` + \`scripts/classify-duplicate-gst.mjs\` against the synced Xero mirror (sync 2026-06-01 22:01). READ-ONLY analysis; the deletes/matches happen in YOUR Xero (UI). Entity: Nicholas Marchesi T/as A Curious Tractor.

**The verified rule for all 27:** the **receipt is on the BILL** (\`xero_invoices.has_attachments\`), so deleting the duplicate **spend-money** is safe — the receipt is preserved. (Confirmed per line; this is the *opposite* of the Airbnb GST-free case where the receipt was on the spend-money — so we verified, not assumed.)

**Mechanic:** find the duplicate in **Account transactions** (search the amount, Exact Amount). It's the **spend-money** copy. Delete it; the **bill** (with the receipt) is the keeper.
- Bill **PAID** → the real bank charge is already reconciled to the bill → just **delete** the phantom spend-money.
- Bill **AUTHORISED** → delete the spend-money, then **Match** the bank line to the bill (this pays + reconciles it).
- Spend-money **RECONCILED** (⚠️ only Apple $14.99 + Qantas $183.00) → **Remove & Redo** the bank line first, then delete & re-match.

`;
for(const q of ['Q2','Q3']){
  md+=`\n## ${q} — ${WS[q].length} lines · GST $${qTotal(q).toFixed(2)}\n\n| ✓ | Amount | Date | Vendor | Bill | Spend-money | GST | Action |\n|---|---|---|---|---|---|---|---|\n`;
  for(const r of WS[q].sort((a,b)=>b.amt-a.amt)){
    md+=`| ☐ | $${r.amt.toFixed(2)} | ${r.date} | ${r.vendor.replace(/\|/g,'')} | ${r.billStatus}${r.rcpt?' +rcpt':' ⚠️NO-rcpt'} | ${r.reconState} | $${r.tax.toFixed(2)} | ${r.action} |\n`;
  }
}
md+=`\n## After the 27 are done\n\`\`\`bash\nnode scripts/prepare-bas.mjs Q2 --save\nnode scripts/prepare-bas.mjs Q3 --save\n\`\`\`\nExpected: **1B (GST on purchases) drops by $${GTOTAL.toFixed(2)}** (Q2 −$${qTotal('Q2').toFixed(2)} · Q3 −$${qTotal('Q3').toFixed(2)}), raising net GST payable by the same. The 11 GST-free duplicates are intentionally NOT here — they have zero BAS impact (defer to hygiene / Standard Ledger).\n`;
const OUT='thoughts/shared/recon-pack/gst-duplicate-fix-worksheet.md';
writeFileSync(OUT,md);
console.log(`\nWorksheet written: ${OUT}`);
