#!/usr/bin/env node
/**
 * build-orbit-viz.mjs — The Field's orbit, drawn to be USED (rebuilt 2026-06-07).
 *
 * Ben on v1: "feels broke and dumb". It was an anonymous hairball — 175 unnamed dots,
 * decorative threads, no answer to the only question a map owes: WHO NEEDS ME TODAY?
 * v2 principles:
 *   - every drawn person is NAMED, coloured by cadence state (red = past your rhythm)
 *   - only Ben's ringed people sit on rings (warmth v2); unread = ONE chip → triage
 *   - click any person → their page (served at people/<slug>.md by command-center)
 *   - threads off by default (toggle) — they were the hairball
 *   - constellation: top-owed storytellers NAMED; the rest counted, never ranked
 *
 * Read-only. Run:  node scripts/build-orbit-viz.mjs   ·  Out: thoughts/shared/orbit-viz.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadLedger, layerOf, hasRead, cadenceState, canon, overlayBeeperRecency } from './lib/field-warmth.mjs';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const slug=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);

// ── supporters ──────────────────────────────────────────────────────────────
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
overlayBeeperRecency(orbit);                                      // warm-channel time counts — clock no longer email-blind
const supSeen=new Map();
let quiet=0, unreadSignal=0;
const looksLikeHandle=n=>/@/.test(n)||/^\+?\d[\d \-()]{6,}$/.test((n||'').trim());
const isInternal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test((n||'').trim());
for(const p of orbit){
  if(p.status==='ghost'||p.status==='community')continue;
  if(p.vendor==='yes')continue;
  if(looksLikeHandle(p.name)||isInternal(p.name))continue;
  const tags=(p.rel_tags||'');
  const bs=Number(p.beeper_score)||0;
  const [gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const warmth=bs+((gi&&go)?Math.min(gi,go):0)*2;
  const k=canon(p.name); if(!k)continue;
  const prev=supSeen.get(k);
  if(!prev||prev.warmth<warmth) supSeen.set(k,{name:p.name,warmth,
    circle:/circle:gsd-alliance/.test(tags)||/gsd-alliance/.test(p.CIRCLE||''),
    uncaptured:/uncaptured/i.test(p.home||'')||p.status==='UNCAPTURED',
    pattern:p.beeper_pattern||'',gmail:p.gmail_in_out||'',last:p.last_contact||'',
    roles:(tags.match(/role:[a-z-]+/g)||[]).map(s=>s.slice(5)).join(', ')});
}
// warmth v2: rings from Ben's reads only; everyone else is a count, not a dot
const { reads } = loadLedger();
for (const [k, d] of reads) { const p = supSeen.get(k); if (p && d.energy != null) p.warmth = d.energy; }
let supporters=[...supSeen.values()];
for(const s of supporters){
  s.layer=layerOf(reads,s.name)||(s.circle?'150':null);
  s.slug=slug(s.name);
  const cad=s.layer?cadenceState(reads,s.name,s.last):null;
  s.cad=cad?{state:cad.state,days:cad.days,expected:cad.expected}:null;
  s.read=((reads.get(canon(s.name))||{}).relation||'').slice(0,90); // canon, not norm — alias variants (ben croft) lose their quote otherwise
}
for(const s of supporters){ if(!s.layer){ if(!hasRead(reads,s.name)&&s.warmth>0)unreadSignal++; else quiet++; } }
supporters=supporters.filter(s=>s.layer).sort((a,b)=>(b.warmth)-(a.warmth));

// ── community (the constellation) ───────────────────────────────────────────
const con=rd('thoughts/shared/el-contributor-constellation.csv')
  .map(r=>({name:r.name,tx:+r.transcripts,live:+r.live,owes:+r.owes_gap,consent:+r.consent_required,slug:slug(r.name)}))
  .filter(r=>r.tx>0);
const namedCon=con.filter(r=>!isUuid(r.name)).sort((a,b)=>b.owes-a.owes||b.tx-a.tx);
const unnamedCon=con.length-namedCon.length;

// ── stage F (project → who to reach) ────────────────────────────────────────
const sf=rd('thoughts/shared/project-needs-match.csv');
const projects={};
for(const r of sf){(projects[r.project]=projects[r.project]||new Set()).add(norm(r.name));}
const projData=Object.fromEntries(Object.entries(projects).map(([k,v])=>[k,[...v]]));

const stats={
  drawn:supporters.length, unreadSignal, quiet,
  overdue:supporters.filter(s=>s.cad&&s.cad.state==='overdue').length,
  due:supporters.filter(s=>s.cad&&s.cad.state==='due').length,
  alliance:supporters.filter(s=>s.circle).length,
  storytellers:con.length, namedStory:namedCon.length,
  tx:con.reduce((a,r)=>a+r.tx,0), live:con.reduce((a,r)=>a+r.live,0),
  owed:con.reduce((a,r)=>a+r.owes,0), consent:con.reduce((a,r)=>a+r.consent,0),
};

let edges=[];
if(existsSync('thoughts/shared/orbit-cooccurrence.csv')){
  const drawnKeys=new Set(supporters.map(s=>norm(s.name)));
  edges=rd('thoughts/shared/orbit-cooccurrence.csv')
    .map(e=>({a:norm(e.a),b:norm(e.b),n:+e.emails_together||0}))
    .filter(e=>e.n>=2&&drawnKeys.has(e.a)&&drawnKeys.has(e.b));
}


// ── render: the TENDING BOARD (2026-06-07 — the radial map was unreadable; a board you scan) ──
const cadRank={overdue:0,due:1,unknown:2,ok:3};
const board=[...supporters].sort((a,b)=>{
  const ra=cadRank[(a.cad&&a.cad.state)||'unknown'],rb=cadRank[(b.cad&&b.cad.state)||'unknown'];
  if(ra!==rb)return ra-rb;
  const xa=a.cad&&a.cad.days!=null?a.cad.days/a.cad.expected:0,xb=b.cad&&b.cad.days!=null?b.cad.days/b.cad.expected:0;
  return xb-xa;
});
const CADC={overdue:'#ff5d5d',due:'#ffb84a',ok:'#3ddc97',unknown:'#5b6b80'};
const CADLBL={overdue:'PAST RHYTHM — tend first',due:'COMING DUE',unknown:'NO CONTACT DATE YET',ok:'TENDED — inside rhythm'};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function row(s){
  const st=(s.cad&&s.cad.state)||'unknown';
  const days=s.cad&&s.cad.days!=null?`${s.cad.days}d <span class=m>/ ${s.cad.expected}d</span>`:'<span class=m>no date</span>';
  const core=s.layer==='5';
  return `<a class="row ${st}${core?' core':''}" data-k="${esc(norm(s.name))}" href="people/${esc(s.slug)}.md" target=_blank>
    <span class=dot style="background:${CADC[st]}"></span>
    <span class=nm>${core?'⭐ ':''}${esc(s.name)}</span>
    <span class=ring>ring ${esc(s.layer)}</span>
    <span class=days>${days}</span>
    <span class=quote>${s.read?'“'+esc(s.read)+'”'
      :`<span class=addnote data-href="/field/circle?focus=${esc(encodeURIComponent(s.name))}">✎ add read note</span>`}</span>
  </a>`;
}
const sections=['overdue','due','unknown','ok'].map(st=>{
  const rowsHtml=board.filter(s=>((s.cad&&s.cad.state)||'unknown')===st).map(row).join('');
  const count=board.filter(s=>((s.cad&&s.cad.state)||'unknown')===st).length;
  return count?`<h2 style="color:${CADC[st]}">${CADLBL[st]} <span class=m>(${count})</span></h2>${rowsHtml}`:'';
}).join('');
const owedRows=namedCon.slice(0,20).map(s=>`<a class="row owed" href="people/${esc(s.slug)}.md" target=_blank>
    <span class=dot style="background:#ffd24a;box-shadow:0 0 0 2.5px ${s.owes>0?'#ff5d5d':'transparent'}"></span>
    <span class=nm>${esc(s.name)}</span>
    <span class=ring>${s.tx} given</span>
    <span class=days style="color:#ff5d5d">${s.owes} owed</span>
    <span class=quote class=m>${s.live} brought to life${s.consent?` · <span style="color:#ffb84a">${s.consent} consent conversation owed</span>`:''}</span>
  </a>`).join('');

const html=`<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>The Field — tending board</title><style>
:root{--bg:#0b0e14;--ink:#e6edf3;--mut:#71808f;--line:#222d3d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.top{position:sticky;top:0;background:rgba(11,14,20,.96);backdrop-filter:blur(4px);border-bottom:1px solid var(--line);padding:13px 26px;display:flex;align-items:center;gap:14px;z-index:5}
h1{margin:0;font-size:16px}.sub{color:var(--mut);font-size:12.5px}
.kpis{margin-left:auto;display:flex;gap:14px;font-size:13px}
.kpis b{font-size:16px}
select{background:#121826;color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:6px 8px;font-size:13px}
main{max-width:1060px;margin:0 auto;padding:10px 26px 60px}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.8px;margin:26px 0 6px}
.m{color:var(--mut);font-weight:400}
.row{display:flex;align-items:baseline;gap:12px;padding:7px 12px;border-radius:9px;text-decoration:none;color:var(--ink);border:1px solid transparent}
.row:hover{background:#121a28;border-color:var(--line)}
.row.hide{display:none}
.dot{width:11px;height:11px;border-radius:50%;flex:none;align-self:center}
.nm{font-weight:600;min-width:215px}
.row.core .nm{font-size:16px}
.ring{color:var(--mut);font-size:12px;min-width:58px}
.days{min-width:96px;font-variant-numeric:tabular-nums;font-size:13.5px}
.quote{color:#9fd8b8;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.row.ok .quote,.row.unknown .quote{color:#7d8b9b}
.addnote{color:#5fb3ff;border-bottom:1px dashed #2e4a66;cursor:pointer}
.addnote:hover{color:#9fd0ff;border-bottom-color:#5fb3ff}
.chip{margin:30px 0 0;background:#121826;border:1px solid var(--line);border-radius:10px;padding:11px 15px;font-size:13.5px;color:var(--mut)}
.chip a{color:#5fb3ff;font-weight:600;text-decoration:none}
.split{border-top:1px dashed #3a4658;margin:34px 0 6px;padding-top:18px}
.split p{color:var(--mut);font-size:12.5px;margin:4px 0 12px}
</style></head><body>
<div class=top>
  <div><h1>The Field — tending board</h1><div class=sub>your reads, ordered by who needs you · click a row for their page · ✎ adds a read note</div></div>
  <select id=proj><option value="">every project</option></select>
  <div class=kpis>
    <span style="color:#ff5d5d"><b>${stats.overdue}</b> tend</span>
    <span style="color:#ffb84a"><b>${stats.due}</b> due</span>
    <span><b>${stats.drawn}</b> read</span>
    <span style="color:#ff5d5d"><b>${stats.owed}</b> owed</span>
  </div>
</div>
<main>
${sections}
<div class=chip><b style="color:#e6edf3">${stats.unreadSignal}</b> people with real signal you haven't read · <a href="/field/triage">open triage →</a> &nbsp;·&nbsp; ${stats.quiet} quiet (newsletter-only) behind them</div>
<div class=split>
  <h2 style="color:#ffd24a">OWED — the constellation <span class=m>(${stats.namedStory} storytellers · ${stats.owed} stories not yet brought to life)</span></h2>
  <p>Never a target list. This is what ACT owes back — sovereignty first, consent before anything moves.</p>
  ${owedRows}
  <p class=m style="margin-top:8px">+ ${Math.max(0,namedCon.length-20)} more storytellers in the owes-ledger · ${stats.consent} consent conversations owed in total</p>
</div>
</main>
<script>
const PROJ=${JSON.stringify(projData)};
const sel=document.getElementById('proj');
Object.keys(PROJ).forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;sel.appendChild(o);});
sel.onchange=()=>{const set=sel.value?new Set(PROJ[sel.value]):null;
  document.querySelectorAll('.row[data-k]').forEach(r=>r.classList.toggle('hide',!!set&&!set.has(r.dataset.k)));};
// "no read note" → circle UI focus mode (notes accumulate as you tend). Nested in the
// row anchor, so stop the row's page-navigation and open the note flow instead.
document.querySelectorAll('.addnote').forEach(el=>el.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();window.open(el.dataset.href,'_blank');}));
</script></body></html>`;

writeFileSync('thoughts/shared/orbit-viz.html', html);
console.log(`Wrote thoughts/shared/orbit-viz.html (tending board)`);
console.log(`  board: ${stats.drawn} read (${stats.overdue} tend-first · ${stats.due} due) · ${stats.unreadSignal} unread chip · owed top-20 named of ${stats.namedStory}`);
