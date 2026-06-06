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
import { loadLedger, layerOf, hasRead, cadenceState, canon } from './lib/field-warmth.mjs';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const slug=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);

// ── supporters ──────────────────────────────────────────────────────────────
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
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
  s.read=((reads.get(norm(s.name))||{}).relation||'').slice(0,90);
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

const DATA=JSON.stringify({supporters,community:namedCon,unnamedCon,projects:projData,stats,edges});

const html=`<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>ACT — The Field</title><style>
:root{--bg:#0b0e14;--ink:#e6edf3;--mut:#8b98a9;--gold:#ffd24a;--over:#ff5d5d;--due:#ffb84a;--ok:#3ddc97;--line:#2a3648}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
header{padding:14px 24px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;gap:14px}
h1{margin:0;font-size:17px}.sub{color:var(--mut);font-size:12px}
.wrap{display:flex;height:calc(100vh - 56px)}
#stage{flex:1;min-width:0;position:relative}svg{width:100%;height:100%;display:block}
aside{width:320px;border-left:1px solid var(--line);padding:14px 16px;overflow:auto}
.kpi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 6px}
.kpi div{background:#121826;border:1px solid var(--line);border-radius:8px;padding:7px 10px}
.kpi b{font-size:17px;display:block}.kpi span{color:var(--mut);font-size:10.5px}
h3{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);margin:14px 0 6px}
select,button.tg{width:100%;background:#121826;color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:6px;font-size:13px;cursor:pointer}
.lg{display:flex;align-items:center;gap:7px;font-size:12px;margin:3px 0;color:var(--mut)}
.dot{width:10px;height:10px;border-radius:50%;flex:none}
#tip{position:fixed;pointer-events:none;background:#0d1320;border:1px solid var(--line);border-radius:8px;padding:8px 11px;font-size:12px;opacity:0;transition:opacity .1s;max-width:260px;z-index:9}
#tip b{color:#fff}.muted{color:var(--mut)}
.chip{position:absolute;left:24px;bottom:18px;background:#121826;border:1px solid var(--line);border-radius:10px;padding:9px 13px;font-size:12.5px;color:var(--mut)}
.chip a{color:#5fb3ff;text-decoration:none;font-weight:600}
circle.node,text.nlabel{cursor:pointer}
.dim{opacity:.1}
line.edge{stroke:#5fb3ff;pointer-events:none}
text.nlabel{fill:#cdd9e5}
</style></head><body>
<header><h1>The Field</h1><div class=sub><b style="color:var(--over)">red = past your rhythm — tend first</b> · amber = coming due · green = tended · click anyone for their page · community on the right is OWED, never targeted</div></header>
<div class=wrap>
  <div id=stage><svg id=svg viewBox="0 0 1000 720" preserveAspectRatio=xMidYMid meet></svg>
    <div class=chip id=chip></div>
  </div>
  <aside>
    <h3>Tend</h3>
    <div class=kpi>
      <div><b id=k1 style="color:var(--over)"></b><span>past rhythm — tend first</span></div>
      <div><b id=k2 style="color:var(--due)"></b><span>coming due</span></div>
      <div><b id=k3></b><span>in your rings (your reads)</span></div>
      <div><b id=k4 style="color:var(--over)"></b><span>transcripts owed</span></div>
    </div>
    <h3>Reach for a project</h3>
    <select id=proj><option value="">— all —</option></select>
    <h3>Threads</h3>
    <button class=tg id=tgEdges>show email threads</button>
    <h3>Legend</h3>
    <div class=lg><span class=dot style="background:var(--over)"></span> past your rhythm (tend!)</div>
    <div class=lg><span class=dot style="background:var(--due)"></span> coming due</div>
    <div class=lg><span class=dot style="background:var(--ok)"></span> inside rhythm</div>
    <div class=lg><span class=dot style="background:#5b6b80"></span> no contact date yet</div>
    <div class=lg><span class=dot style="background:var(--gold);box-shadow:0 0 0 2px #fff"></span> your inner core</div>
    <div class=lg><span class=dot style="background:var(--gold);box-shadow:0 0 0 3px var(--over)"></span> storyteller — red ring = owed</div>
    <h3>What it says</h3>
    <p style="font-size:13px;border-left:2px solid var(--line);padding-left:10px" id=says></p>
    <p style="font-size:13px;border-left:2px solid var(--line);padding-left:10px">Rings hold ONLY people you've read — the machine never guesses closeness. Everyone else is a number until you read them.</p>
  </aside>
</div>
<div id=tip></div>
<script>
const D=${DATA};
const svg=document.getElementById('svg'),NS='http://www.w3.org/2000/svg',tip=document.getElementById('tip');
const cx=330,cy=368;
const bands={'5':74,'15':140,'50':215,'150':295};
const CAD={overdue:'#ff5d5d',due:'#ffb84a',ok:'#3ddc97',unknown:'#5b6b80'};
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\\s+/g,' ').trim();}
for(const b of ['150','50','15','5']){svg.appendChild(el('circle',{cx,cy,r:bands[b],fill:'none',stroke:'#1c2535','stroke-width':1}));
  const t=el('text',{x:cx,y:cy-bands[b]+12,fill:'#3d4c61','text-anchor':'middle','font-size':9});t.textContent=b;svg.appendChild(t);}
svg.appendChild(el('circle',{cx,cy,r:26,fill:'#161d2b',stroke:'#2b3a52','stroke-width':1.5}));
const c0=el('text',{x:cx,y:cy+4,fill:'#cfe0f5','text-anchor':'middle','font-size':12,'font-weight':700});c0.textContent='you';svg.appendChild(c0);
svg.appendChild(el('line',{x1:672,y1:40,x2:672,y2:680,stroke:'#3a4658','stroke-dasharray':'4 6','stroke-width':1}));
const edgeLayer=el('g',{});svg.appendChild(edgeLayer);
const byBand={'5':[],'15':[],'50':[],'150':[]};D.supporters.forEach(s=>byBand[s.layer]&&byBand[s.layer].push(s));
const supNodes=[];
for(const b of ['5','15','50','150']){const arr=byBand[b],n=arr.length;arr.forEach((s,i)=>{
  const ang=Math.PI*0.55 + (Math.PI*1.9)*(n<=1?0.5:i/n);
  const x=cx+Math.cos(ang)*bands[b], y=cy+Math.sin(ang)*bands[b];
  const cadCol=CAD[(s.cad&&s.cad.state)||'unknown'];
  const inner=b==='5';
  const node=el('circle',{cx:x,cy:y,r:inner?7:5,fill:inner?'#ffd24a':cadCol,stroke:inner?'#fff':cadCol,'stroke-width':inner?1.8:0,class:'node'});
  if(inner&&s.cad&&s.cad.state!=='ok'){node.setAttribute('stroke',CAD[s.cad.state]);node.setAttribute('stroke-width',2.4);}
  node._d=s;node._key=norm(s.name);
  const lab=el('text',{x:x+(Math.cos(ang)>=0?9:-9),y:y+4,'text-anchor':Math.cos(ang)>=0?'start':'end','font-size':inner?12:(b==='15'?11:9),'font-weight':inner?700:(b==='15'?600:400),class:'nlabel'});
  lab.textContent=s.name.length>22?s.name.slice(0,21)+'…':s.name;
  if(!inner)lab.setAttribute('fill',s.cad&&s.cad.state==='overdue'?'#ff8a8a':'#cdd9e5');
  lab._d=s;lab._key=node._key;
  svg.appendChild(node);svg.appendChild(lab);supNodes.push(node,lab);
});}
const ccx=842,ccy=350,comNodes=[];
D.community.forEach((s,i)=>{
  const named=i<12;
  const ang=i*2.399963, rr=named?(26+i*16):(26+12*16+Math.sqrt(i-11)*16);
  const x=ccx+Math.cos(ang)*rr*0.95, y=ccy+Math.sin(ang)*rr*0.88;
  const rad=named?(5+Math.min(8,s.tx*0.6)):3;
  const g=el('g',{});
  if(s.owes>0)g.appendChild(el('circle',{cx:x,cy:y,r:rad+2.2,fill:'none',stroke:'#ff5d5d','stroke-width':1.3,opacity:.85}));
  const node=el('circle',{cx:x,cy:y,r:rad,fill:'#ffd24a',opacity:named?.95:.55,class:'node'});
  node._c=s;g.appendChild(node);
  if(named){const lab=el('text',{x:x+(Math.cos(ang)>=0?rad+4:-rad-4),y:y+4,'text-anchor':Math.cos(ang)>=0?'start':'end','font-size':10,fill:'#e8d9a8',class:'nlabel'});
    lab.textContent=(s.name.length>20?s.name.slice(0,19)+'…':s.name)+' · '+s.owes;lab._c=s;g.appendChild(lab);comNodes.push(lab);}
  svg.appendChild(g);comNodes.push(node);
});
const clab=el('text',{x:ccx,y:84,fill:'#9aa7b8','text-anchor':'middle','font-size':12,'font-weight':600});clab.textContent='OWED — the constellation';svg.appendChild(clab);
const clab2=el('text',{x:ccx,y:100,fill:'#6b7a8d','text-anchor':'middle','font-size':10});clab2.textContent='name · stories owed — '+D.stats.namedStory+' storytellers, '+D.stats.owed+' owed total';svg.appendChild(clab2);
const olab=el('text',{x:330,y:84,fill:'#9aa7b8','text-anchor':'middle','font-size':12,'font-weight':600});olab.textContent='YOUR RINGS — '+D.stats.drawn+' people you’ve read';svg.appendChild(olab);
chip.innerHTML='<b style="color:#e6edf3">'+D.stats.unreadSignal+'</b> people with real signal you haven’t read · <a href="/field/triage">open triage →</a><br><span>'+D.stats.quiet+' quiet (newsletter-only) behind them</span>';
const pos={};supNodes.forEach(n=>{if(n.tagName==='circle')pos[n._key]={x:+n.getAttribute('cx'),y:+n.getAttribute('cy')}});
let edgesOn=false;const edgeLines=[];
function buildEdges(){(D.edges||[]).forEach(eg=>{const a=pos[eg.a],b=pos[eg.b];if(!a||!b)return;
  const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge','stroke-width':Math.min(2,0.6+eg.n*0.04)});
  l.style.opacity=Math.min(.35,.08+eg.n*.012);edgeLayer.appendChild(l);edgeLines.push(l);});}
tgEdges.onclick=()=>{edgesOn=!edgesOn;if(edgesOn&&!edgeLines.length)buildEdges();edgeLines.forEach(l=>l.style.display=edgesOn?'':'none');tgEdges.textContent=edgesOn?'hide email threads':'show email threads';};
function show(html,e){tip.innerHTML=html;tip.style.opacity=1;tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';}
function hide(){tip.style.opacity=0;}
supNodes.forEach(n=>{
  n.onmousemove=e=>{const s=n._d;show('<b>'+s.name+'</b>'+(s.read?'<br><span style="color:#3ddc97">“'+s.read+'”</span>':'')+(s.cad?'<br>'+(s.cad.days!=null?s.cad.days+'d since contact · rhythm '+s.cad.expected+'d':'no contact date'):'')+(s.roles?'<br><span class=muted>'+s.roles+'</span>':'')+'<br><span class=muted>click → their page</span>',e);};
  n.onmouseleave=hide;
  n.onclick=()=>window.open('people/'+n._d.slug+'.md','_blank');
});
comNodes.forEach(n=>{
  n.onmousemove=e=>{const s=n._c;show('<b>'+s.name+'</b><br>'+s.tx+' transcripts · '+s.live+' live · <span style="color:#ff5d5d">'+s.owes+' owed</span>'+(s.consent?'<br><span class=muted>'+s.consent+' consent conversations owed</span>':'')+'<br><span class=muted>click → their page</span>',e);};
  n.onmouseleave=hide;
  n.onclick=()=>window.open('people/'+n._c.slug+'.md','_blank');
});
k1.textContent=D.stats.overdue;k2.textContent=D.stats.due;k3.textContent=D.stats.drawn;k4.textContent=D.stats.owed;
says.innerHTML='<b style="color:#ff5d5d">'+D.stats.overdue+' of your '+D.stats.drawn+'</b> are past the rhythm their ring implies — those are today’s calls. '+D.stats.due+' more coming due. The constellation holds <b>'+D.stats.owed+'</b> stories not yet brought to life.';
const sel=document.getElementById('proj');Object.keys(D.projects).forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;sel.appendChild(o);});
sel.onchange=()=>{const set=sel.value?new Set(D.projects[sel.value]):null;supNodes.forEach(n=>n.classList.toggle('dim',!!set&&!set.has(n._key)));};
</script></body></html>`;

writeFileSync('thoughts/shared/orbit-viz.html', html);
console.log(`Wrote thoughts/shared/orbit-viz.html`);
console.log(`  rings: ${stats.drawn} read people (${stats.overdue} past rhythm · ${stats.due} due) · unread-with-signal: ${stats.unreadSignal} (chip → triage) · quiet: ${stats.quiet}`);
console.log(`  constellation: ${stats.namedStory} storytellers · ${stats.owed} owed (top 12 named)`);
