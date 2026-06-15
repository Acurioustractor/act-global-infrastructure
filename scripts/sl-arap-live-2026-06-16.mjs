import '../lib/load-env.mjs';
import { readFileSync } from 'fs';
const tok = JSON.parse(readFileSync('.xero-tokens.json','utf8'));
const conns = await (await fetch('https://api.xero.com/connections',{headers:{Authorization:`Bearer ${tok.access_token}`,Accept:'application/json'}})).json();
const conn = conns.find(c=>c.tenantId==='786af1ed-e3ce-42fc-9ea9-ddf3447d79d0')||conns[0];
const H={Authorization:`Bearer ${tok.access_token}`,'xero-tenant-id':conn.tenantId,Accept:'application/json'};
const TODAY = new Date('2026-06-16');
const days = d => Math.round((TODAY - new Date(d))/86400000);

async function allInvoices(where){
  let page=1, out=[];
  for(;;){
    const u=`https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent(where)}&page=${page}&pageSize=100`;
    const j= await (await fetch(u,{headers:H})).json();
    const inv=j.Invoices||[];
    out.push(...inv);
    if(inv.length<100) break;
    page++; await new Promise(r=>setTimeout(r,1100));
  }
  return out;
}
const f=n=>Number(n||0).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});

// AR
const ar = await allInvoices('Type=="ACCREC" AND Status=="AUTHORISED"');
ar.sort((a,b)=>new Date(a.DueDateString||a.DueDate)-new Date(b.DueDateString||b.DueDate));
let arTot=0;
console.log('=== LIVE ACCOUNTS RECEIVABLE (authorised, unpaid) ===');
for(const i of ar){ arTot+=i.AmountDue; const od=days(i.DueDateString||i.DueDate);
  console.log(`  ${(i.Contact?.Name||'?').slice(0,38).padEnd(38)} ${(i.InvoiceNumber||'').padEnd(9)} due ${(i.DueDateString||'').slice(0,10)} $${f(i.AmountDue).padStart(11)}  ${od>0?od+'d overdue':'(not due)'}`);
}
console.log(`  ---- ${ar.length} invoices, total AR $${f(arTot)}\n`);
await new Promise(r=>setTimeout(r,1100));

// AP authorised - aging
const ap = await allInvoices('Type=="ACCPAY" AND Status=="AUTHORISED"');
const bk={'0 not-due':0,'1-30':0,'31-60':0,'61-90':0,'90+':0}; const bkn={...bk};
let apTot=0;
for(const i of ap){ apTot+=i.AmountDue; const od=days(i.DueDateString||i.DueDate);
  const k = od<=0?'0 not-due':od<=30?'1-30':od<=60?'31-60':od<=90?'61-90':'90+';
  bk[k]+=i.AmountDue; bkn[k]++;
}
console.log('=== LIVE ACCOUNTS PAYABLE (authorised, unpaid) — aging ===');
for(const k of Object.keys(bk)) console.log(`  ${k.padEnd(10)} ${String(bkn[k]).padStart(3)} bills  $${f(bk[k]).padStart(12)}`);
console.log(`  ---- ${ap.length} bills, total AP $${f(apTot)}\n`);
await new Promise(r=>setTimeout(r,1100));

// AP drafts
const dr = await allInvoices('Type=="ACCPAY" AND Status=="DRAFT"');
const byC={}; let drTot=0;
for(const i of dr){ drTot+=i.Total; const n=i.Contact?.Name||'?'; byC[n]=(byC[n]||0)+i.Total; }
console.log('=== LIVE DRAFT BILLS (unapproved) ===');
Object.entries(byC).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([n,v])=>console.log(`  ${n.slice(0,40).padEnd(40)} $${f(v).padStart(11)}`));
console.log(`  ---- ${dr.length} draft bills, total $${f(drTot)}`);
