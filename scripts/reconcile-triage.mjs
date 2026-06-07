#!/usr/bin/env node
/**
 * READ-ONLY reconcile triage: groups the card lines (from the Dext export) into
 * vendor BATCHES, tiered easy→hard, with the Reconcile-tab SEARCH QUERY + suggested
 * coding + a receipt-NEEDED flag (GST claim ≥ $82.50 needs a tax invoice; below = none).
 * Goal: stop going line-by-line — search one vendor, code the whole batch.
 *
 * Usage: node scripts/reconcile-triage.mjs   (reads Q2+Q3 Dext CSVs)
 */
import { readFileSync } from 'fs';
const CSVS = [
  'thoughts/shared/recon-pack/dext/q2-dext-2026-06-01.csv',
  'thoughts/shared/recon-pack/dext/q3-dext-2026-06-01.csv',
];
const RECEIPT_THRESHOLD = 82.50; // ATO: tax invoice required for GST claims ≥ $82.50

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const norm=(s)=>(s||'').toUpperCase().replace(/SQ ?\*?|SQSP ?\*?|UBER ?\*?|SP ?\*?|SMP ?\*?|ZLR ?\*?|X{4,}\d*|PTY LTD| LTD| INC|\d{3,}|[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();

// vendor → batch key (group lookalikes)
function vendorKey(s){
  const n=norm(s);
  const map=[['WOOLWORTHS','Woolworths'],['COLES','Coles'],['ALDI','Aldi'],['BUNNINGS','Bunnings'],['UBER','Uber'],['CABCHARGE','Cabcharge'],['CABFARE','CabFare'],['AUDIBLE','Audible'],['AMZNPRIME','Amazon Prime'],['AMAZON PRIME','Amazon Prime'],['DOCPLAY','DocPlay'],['GARMIN','Garmin'],['XERO','Xero'],['OPENAI','OpenAI'],['ANTHROPIC','Anthropic'],['SQUARESPACE','Squarespace'],['LINKEDIN','LinkedIn'],['SUPABASE','Supabase'],['CODEGUIDE','Codeguide'],['LINKTREE','Linktree'],['MIGHTY','Mighty Networks'],['NEWS PTY','News Pty'],['BELONG','Belong'],['GOOGLE','Google'],['CORP','X Corp'],['QANTAS','Qantas'],['VIRGIN','Virgin'],['AVIS','Avis'],['BUDGET','Budget'],['BARGAIN CAR','Bargain Car Rentals'],['KENNARDS','Kennards'],['HATCH','Hatch Electrical'],['INTERNET','Internet Transfer'],['TFR FEE','NAB Bank Fee'],['CASH ADV','NAB Bank Fee'],['GOPAYID','GoPayID'],['GOJEK','Gojek'],['DUYU','Duyu Coffee'],['ROASTERY','The Roastery'],['MALENY LANDSCAPING','Maleny Landscaping'],['MALENY HARDWARE','Maleny Hardware'],['BOOKING','Booking.com'],['AIRBNB','Airbnb'],['LIBERTY','Liberty Fuel'],['BP ','BP Fuel'],['AGL','AGL']];
  for(const [m,label] of map) if(n.includes(m)) return label;
  return (n.split(' ').slice(0,2).join(' ')||'?'); // fallback: first 2 words
}

// tier the batch
const SUB=new Set(['Xero','OpenAI','Anthropic','Squarespace','LinkedIn','Supabase','Codeguide','Linktree','Mighty Networks','News Pty','Belong','Google','X Corp']);
const PERSONAL=new Set(['Audible','Amazon Prime','DocPlay','Garmin','GoPayID','Gojek']);
const TAXI=new Set(['Uber','Cabcharge','CabFare']);
const FIXED=new Set(['Internet Transfer','NAB Bank Fee']);
const KNOWN_TRAVEL=new Set(['Qantas','Virgin','Avis','Budget','Bargain Car Rentals']);
const KNOWN_SUPPLY=new Set(['Bunnings','Kennards','Hatch Electrical','Maleny Landscaping','Maleny Hardware']);
function tier(label,hasProject,cat){
  const C=(cat||'').toUpperCase();
  if(/TRANSFER|BANK FEE|INTEREST/.test(C)||FIXED.has(label)) return ['1·EASY','transfer/fee — no GST, no receipt'];
  if(/DRAWING/.test(C)||PERSONAL.has(label)) return ['1·EASY','880 Drawings · BAS Excluded (personal)'];
  if(/SUBSCRIPTION|SOFTWARE/.test(C)||SUB.has(label)) return ['1·EASY','485 Subscriptions · GST(AU)/GST-Free(overseas)'];
  if(/TAXI|PARKING|TOLL/.test(C)||TAXI.has(label)) return ['2·MED','452 Taxis · GST · confirm project'];
  if(/TRAVEL|ACCOMMODAT|FLIGHT|FUEL|MOTOR VEH/.test(C)||KNOWN_TRAVEL.has(label)) return ['2·MED','493 Travel/Fuel · GST · confirm project'];
  if(/MATERIAL|BUILDING|HIRE|EQUIPMENT|SITE|FREIGHT|SUB-CONTRACT|CONSULTING/.test(C)||KNOWN_SUPPLY.has(label)) return ['2·MED','Materials/Site/Services · GST · confirm project'];
  if(/MEAL|FOOD|LIGHT MEAL|ENTERTAIN/.test(C)) return ['3·HARD','meals — confirm project + personal/business'];
  return ['3·HARD', hasProject?'confirm coding by hand':'NO project — decide by hand'];
}

const rows=[];
for(const f of CSVS){ const R=parseCSV(readFileSync(f,'utf8')); const H=R[0]; const ix=n=>H.indexOf(n);
  for(const r of R.slice(1)){ if(!r[0]) continue;
    rows.push({sup:r[ix('Supplier')],total:parseFloat(r[ix('Total (AUD)')]||0),tax:parseFloat(r[ix('Tax (AUD)')]||0),cat:r[ix('Category')],proj:[r[ix('Project')],r[ix('Project 2')]].filter(Boolean).join('/'),img:(r[ix('Image')]||'').trim()}); }
}

const groups={};
for(const r of rows){ const k=vendorKey(r.sup); (groups[k]=groups[k]||[]).push(r); }

const out=Object.entries(groups).map(([label,rs])=>{
  const total=rs.reduce((s,r)=>s+r.total,0);
  const gst=rs.some(r=>r.tax>0.005);
  const hasProject=rs.some(r=>r.proj);
  const catCount={}; rs.forEach(r=>{if(r.cat)catCount[r.cat]=(catCount[r.cat]||0)+1;});
  const cat=Object.entries(catCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  const [t,advice]=tier(label,hasProject,cat);
  const needRcpt=rs.filter(r=>r.tax>0.005 && r.total>=RECEIPT_THRESHOLD && !r.img).length;
  const proj=[...new Set(rs.map(r=>r.proj).filter(Boolean))].slice(0,2).join(', ');
  return {label,t,n:rs.length,total,advice,needRcpt,proj:proj||'—'};
}).sort((a,b)=> a.t.localeCompare(b.t) || b.n-a.n);

let lastT=''; let totLines=0, totNeed=0;
for(const g of out){
  if(g.t!==lastT){ console.log(`\n========== TIER ${g.t} ==========`); lastT=g.t; }
  console.log(`  search "${g.label}"`.padEnd(34)+` ${String(g.n).padStart(3)} lines  $${g.total.toFixed(2).padStart(10)}  → ${g.advice}${g.proj!=='—'?` [Dext proj: ${g.proj}]`:''}${g.needRcpt?`  ⚠️${g.needRcpt} need receipt`:''}`);
  totLines+=g.n; totNeed+=g.needRcpt;
}
console.log(`\n========== ${totLines} card lines · ${out.length} vendor-batches · ${totNeed} lines need a receipt (GST ≥ $${RECEIPT_THRESHOLD}, no Dext image) ==========`);
