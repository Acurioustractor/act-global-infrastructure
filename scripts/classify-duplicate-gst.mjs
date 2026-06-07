#!/usr/bin/env node
// READ-ONLY: classify recon-pack §1 duplicates by GST treatment, using Dext Tax(AUD).
// Tells us which duplicates actually move 1B (GST-bearing) vs GST-free (no BAS impact).
import { readFileSync } from 'fs';

const PACKS = [
  { q: 'Q2', pack: 'thoughts/shared/recon-pack/q2-fy26-reconciliation-pack.md', dext: 'thoughts/shared/recon-pack/dext/q2-dext-2026-06-01.csv' },
  { q: 'Q3', pack: 'thoughts/shared/recon-pack/q3-fy26-reconciliation-pack.md', dext: 'thoughts/shared/recon-pack/dext/q3-dext-2026-06-01.csv' },
];

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP','MEMBERSHIP','LIMITED','SYDNEY','STORES','CENTRE','GROUP','SALES','SERVICES','SERVICE','STORE','SHOP','ONLINE','COMMUNITY','HIRE','CO','OF']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};
const amtClose=(a,b)=>{const d=Math.abs(a-b);return d<0.02?'exact':(d<=15&&d<=b*0.07)?'fuzzy':false;};

// extract §1 duplicate rows from a pack (between "## 1 ·" and "### ⚠️ DO NOT")
function dupsFromPack(md){
  const lines=md.split('\n'); let inSec=false; const out=[];
  for(const ln of lines){
    if(ln.startsWith('## 1 ·')){inSec=true;continue;}
    if(inSec && (ln.startsWith('### ') || (ln.startsWith('## ') && !ln.startsWith('## 1')))) break;
    if(inSec && ln.startsWith('| ') && !/\| Date/.test(ln) && !/\|---/.test(ln)){
      const cells=ln.split('|').map(s=>s.trim()).filter((_,i,a)=>i>0&&i<a.length-1);
      // cols: Date, Vendor, Bank amt, Bill/surcharge
      const date=cells[0], vendor=cells[1], amt=parseFloat((cells[2]||'').replace(/[$,]/g,''));
      if(vendor && !isNaN(amt)) out.push({date,vendor,amt,note:cells[3]||''});
    }
  }
  return out;
}

let grand={gst:0,free:0,nomatch:0,gstAmt:0};
for(const {q,pack,dext} of PACKS){
  const dups=dupsFromPack(readFileSync(pack,'utf8'));
  const rows=parseCSV(readFileSync(dext,'utf8'));
  const H=rows[0]; const ix=(n)=>H.indexOf(n);
  const D=rows.slice(1).filter(r=>r[0]).map(r=>({
    supplier:r[ix('Supplier')], total:parseFloat(r[ix('Total (AUD)')]||r[ix('Total')]||0),
    tax:parseFloat(r[ix('Tax (AUD)')]||0), cat:r[ix('Category')], status:r[ix('Status')],
  }));
  console.log(`\n========== ${q} — ${dups.length} duplicates ==========`);
  let gstCount=0, freeCount=0, noMatch=0, gstSum=0;
  const gstLines=[];
  for(const d of dups){
    // best Dext match: vendor token + amount close (handles surcharge where bank>bill)
    let best=null, bestScore=-1;
    for(const x of D){
      const ac=amtClose(d.amt,x.total); if(!ac) continue;
      const vm=vmatch(d.vendor,x.supplier);
      const score=(ac==='exact'?2:1)+(vm?2:0);
      if(score>bestScore){bestScore=score;best={...x,ac,vm};}
    }
    if(!best){noMatch++;console.log(`  ?? NOMATCH  $${d.amt.toFixed(2).padStart(9)}  ${d.vendor}`);continue;}
    const gstBearing=best.tax>0.005;
    if(gstBearing){gstCount++;gstSum+=best.tax;gstLines.push({d,best});}
    else freeCount++;
    const flag=gstBearing?`🟡 GST $${best.tax.toFixed(2)}`:'   gst-free';
    console.log(`  ${flag.padEnd(14)} $${d.amt.toFixed(2).padStart(9)}  ${d.vendor.slice(0,28).padEnd(28)} → ${(best.supplier||'').slice(0,24).padEnd(24)} [${best.status||'?'}|${(best.cat||'').slice(0,18)}]${best.ac==='fuzzy'?' ~fuzzy':''}`);
  }
  console.log(`  ---- ${q}: ${gstCount} GST-bearing (1B impact $${gstSum.toFixed(2)}) · ${freeCount} gst-free · ${noMatch} no-match`);
  grand.gst+=gstCount;grand.free+=freeCount;grand.nomatch+=noMatch;grand.gstAmt+=gstSum;
}
console.log(`\n========== TOTAL: ${grand.gst} GST-bearing duplicates · max 1B impact $${grand.gstAmt.toFixed(2)} · ${grand.free} gst-free · ${grand.nomatch} no-match ==========`);
