#!/usr/bin/env node
/**
 * READ-ONLY: find Dext transactions NOT yet in Xero (the publish backlog).
 * Cross-references the Dext archive against Xero bills + bank transactions.
 * CONSERVATIVE by design — any plausible Xero match (incl. exact-amount-in-window even if the
 * vendor name differs) EXCLUDES the line, so the list won't tempt a re-publish that duplicates
 * something already in Xero. Bias = under-list, never over-list (avoids re-creating phantoms).
 *
 * Output = the Dext lines to review + bulk-publish in Dext (they'll arrive coded + with receipts).
 * Usage: node scripts/dext-publish-backlog.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CSVS=['thoughts/shared/recon-pack/dext/q2-dext-2026-06-01.csv','thoughts/shared/recon-pack/dext/q3-dext-2026-06-01.csv'];
const SPANS=[`date BETWEEN '2025-09-01' AND '2026-01-15'`,`date BETWEEN '2025-12-15' AND '2026-04-30'`];

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|SMP ?\*?|ZLR ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['THE','AND','PAYMENT','PURCHASE','CARD','AUSTRALIA','PTY','COM','AUS','BUSINESS','HELP','MEMBERSHIP','LIMITED','SYDNEY','STORES','CENTRE','GROUP','SALES','SERVICES','SERVICE','STORE','SHOP','ONLINE','COMMUNITY','HIRE','CO','OF']);
const toks=(s)=>new Set(norm(s).split(' ').filter(w=>w.length>=3&&!STOP.has(w)));
const vmatch=(a,b)=>{const ta=toks(a),tb=toks(b);if(!ta.size||!tb.size)return false;for(const t of ta)if(tb.has(t))return true;return false;};
const amtClose=(a,b)=>{const d=Math.abs(a-b);return d<0.02?'exact':(d<=15&&d<=b*0.07)?'fuzzy':false;};
const gap=(a,b)=>Math.abs((new Date(a)-new Date(b))/86400000);
const WIN=14;

// --- Xero pool: bills (ACCPAY) + bank txns, both spans, any live status ---
let bills=[], txns=[];
for(const span of SPANS){
  const {data:b}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date::text,ABS(total)::numeric(12,2) amt FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND ${span}`});
  const {data:t}=await sb.rpc('exec_sql',{query:`SELECT contact_name,date::text,ABS(total)::numeric(12,2) amt FROM xero_transactions WHERE type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' AND ${span}`});
  bills=bills.concat(b||[]); txns=txns.concat(t||[]);
}
const pool=bills.concat(txns);
console.log(`Xero pool: ${bills.length} bills + ${txns.length} spend-txns = ${pool.length} records to match against\n`);

// --- Dext lines ---
const dext=[];
for(const f of CSVS){ const R=parseCSV(readFileSync(f,'utf8')); const H=R[0]; const ix=n=>H.indexOf(n);
  for(const r of R.slice(1)){ if(!r[0]) continue;
    dext.push({sup:r[ix('Supplier')],date:r[ix('Date')]?.match(/\d{1,2}-\w{3}-\d{4}/)?(()=>{const m=r[ix('Date')].match(/(\d{1,2})-(\w{3})-(\d{4})/);const M={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return `${m[3]}-${M[m[2]]}-${m[1].padStart(2,'0')}`;})():null,
      total:parseFloat(r[ix('Total (AUD)')]||0),proj:[r[ix('Project')],r[ix('Project 2')]].filter(Boolean).join('/'),img:(r[ix('Image')]||'').trim()}); }
}

// --- match: in Xero if any pool record is amount-close + within window + (vendor-match OR exact-amount) ---
const inXero=(d)=>{ for(const p of pool){ const ac=amtClose(d.total,p.amt); if(!ac)continue; if(d.date&&gap(d.date,p.date)>WIN)continue; if(vmatch(d.sup,p.contact_name)||ac==='exact') return true; } return false; };

const backlog=dext.filter(d=>!inXero(d));
// group by vendor
const norm2=(s)=>{const n=norm(s);const t=n.split(' ').filter(w=>!STOP.has(w));return t.slice(0,2).join(' ')||n||'?';};
const G={};
for(const d of backlog){ const k=norm2(d.sup); (G[k]=G[k]||[]).push(d); }
const groups=Object.entries(G).map(([v,rs])=>({v,n:rs.length,total:rs.reduce((s,r)=>s+r.total,0),proj:rs.some(r=>r.proj),rcpt:rs.every(r=>r.img)})).sort((a,b)=>b.n-a.n);

console.log(`========== DEXT PUBLISH BACKLOG: ${backlog.length} of ${dext.length} Dext lines not found in Xero · $${backlog.reduce((s,d)=>s+d.total,0).toFixed(2)} ==========`);
console.log(`(conservative — exact-amount-in-window counts as "in Xero" even if names differ, so this UNDER-lists. Spot-check in Dext before publishing.)\n`);
for(const g of groups.slice(0,60)){
  console.log(`  ${g.v.slice(0,30).padEnd(30)} ${String(g.n).padStart(3)} lines  $${g.total.toFixed(2).padStart(10)}  ${g.proj?'·coded':'·NO-proj'} ${g.rcpt?'·rcpt✓':'·rcpt?'}`);
}
const noProj=backlog.filter(d=>!d.proj).length;
console.log(`\n  ${groups.length} vendors in backlog · ${backlog.length-noProj} already project-coded in Dext · ${noProj} need a project too`);
