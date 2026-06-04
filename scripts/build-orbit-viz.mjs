#!/usr/bin/env node
/**
 * build-orbit-viz.mjs — render the energy-orbit model as a self-contained, interactive HTML.
 *
 * Reads the three worklists and emits ONE file you open in a browser (no server, works offline):
 *   the SUPPORTER orbit (warmth rings + GSD-alliance core) | the COMMUNITY constellation (owes-ledger)
 * divided by the line that is never crossed into a funnel. Hover for detail; filter by project
 * (Stage F) to see who to reach for each project's needs.
 *
 * Read-only. Run:  node scripts/build-orbit-viz.mjs
 * Out:  thoughts/shared/orbit-viz.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);

// ── supporters (the orbit) ─────────────────────────────────────────────────
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
const supSeen=new Map();
let cold=0;
const looksLikeHandle=n=>/@/.test(n)||/^\+?\d[\d \-()]{6,}$/.test((n||'').trim()); // unresolved Beeper identities
const isInternal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi|a curious tractor)$/i.test((n||'').trim());
for(const p of orbit){
  if(p.status==='ghost'||p.status==='community')continue;            // ghosts + community handled elsewhere
  if(looksLikeHandle(p.name)||isInternal(p.name))continue;           // not real layer members
  const tags=(p.rel_tags||'');
  const bs=Number(p.beeper_score)||0;
  const [gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const twoWay=(gi&&go)?Math.min(gi,go):0;
  const warmth=bs+twoWay*2;
  const circle=/circle:gsd-alliance/.test(tags)||/gsd-alliance/.test(p.CIRCLE||'');
  const uncaptured=/uncaptured/i.test(p.home||'')||p.status==='UNCAPTURED';
  if(warmth<=0&&!circle&&!uncaptured){cold++;continue;}              // cold majority → counted, not drawn
  const k=norm(p.name); if(!k)continue;
  const prev=supSeen.get(k);
  if(!prev||prev.warmth<warmth) supSeen.set(k,{name:p.name,warmth,circle,uncaptured,pattern:p.beeper_pattern||'',gmail:p.gmail_in_out||'',roles:(tags.match(/role:[a-z-]+/g)||[]).map(s=>s.slice(5)).join(', ')});
}
// manual energy from the workbench ledger overrides computed warmth — the human's read wins
if(existsSync('thoughts/shared/field-decisions.jsonl'))
  for(const l of readFileSync('thoughts/shared/field-decisions.jsonl','utf8').split('\n').filter(Boolean)){
    try{const d=JSON.parse(l);if(d.energy!=null){const p=supSeen.get(norm(d.name));if(p)p.warmth=d.energy;}}catch{}
  }
let supporters=[...supSeen.values()].sort((a,b)=>b.warmth-a.warmth);
// Dunbar layers by warmth RANK — where energy IS going (5/15/50/150); past 150 → periphery.
// Finite energy budget: the inner layers are small by design ("more isn't better").
// circle (GSD-alliance) members are hand-curated — always drawn, even past rank 150
// (the warmth<=0 keep above is pointless if the rank cut then drops them — e.g. Ben Croft, warmth 2).
supporters.forEach((s,i)=>{s.layer=i<5?'5':i<15?'15':i<50?'50':i<150?'150':(s.circle?'150':null);});
cold+=supporters.filter(s=>!s.layer).length;
supporters=supporters.filter(s=>s.layer);

// ── community (the constellation) ──────────────────────────────────────────
const con=rd('thoughts/shared/el-contributor-constellation.csv')
  .map(r=>({name:r.name,tx:+r.transcripts,live:+r.live,owes:+r.owes_gap,consent:+r.consent_required,pct:+r.honoured_pct}))
  .filter(r=>r.tx>0);
const namedCon=con.filter(r=>!isUuid(r.name)).sort((a,b)=>b.tx-a.tx);
const unnamedCon=con.length-namedCon.length;

// ── stage F (project → who to reach) ───────────────────────────────────────
const sf=rd('thoughts/shared/project-needs-match.csv');
const projects={};
for(const r of sf){(projects[r.project]=projects[r.project]||new Set()).add(norm(r.name));}
const projData=Object.fromEntries(Object.entries(projects).map(([k,v])=>[k,[...v]]));

// ── totals for the headline ────────────────────────────────────────────────
const stats={
  people:orbit.length, drawn:supporters.length, cold,
  core:supporters.filter(s=>s.warmth>=60).length,
  alliance:supporters.filter(s=>s.circle).length,
  uncaptured:supporters.filter(s=>s.uncaptured).length,
  storytellers:con.length, namedStory:namedCon.length,
  tx:con.reduce((a,r)=>a+r.tx,0), live:con.reduce((a,r)=>a+r.live,0),
  owed:con.reduce((a,r)=>a+r.owes,0), consent:con.reduce((a,r)=>a+r.consent,0),
};

// ── warm-path edges (email co-occurrence) — only pairs where BOTH are drawn ──
let edges=[];
if(existsSync('thoughts/shared/orbit-cooccurrence.csv')){
  const drawnKeys=new Set(supporters.map(s=>norm(s.name)));
  edges=rd('thoughts/shared/orbit-cooccurrence.csv')
    .map(e=>({a:norm(e.a),b:norm(e.b),n:+e.emails_together||0}))
    .filter(e=>e.n>=2&&drawnKeys.has(e.a)&&drawnKeys.has(e.b));
}

const DATA=JSON.stringify({supporters,community:namedCon,unnamedCon,projects:projData,stats,edges});

const html=`<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>ACT — The Energy Orbit</title><style>
:root{--bg:#0b0e14;--ink:#e6edf3;--mut:#8b98a9;--core:#ffd24a;--warm:#5fb3ff;--light:#2b5378;--owe:#ff5d5d;--hon:#3ddc97;--line:#3a4658}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
header{padding:18px 24px;border-bottom:1px solid var(--line)}h1{margin:0;font-size:18px;letter-spacing:.3px}
.sub{color:var(--mut);font-size:12.5px;margin-top:3px}
.wrap{display:flex;gap:0;height:calc(100vh - 132px)}
#stage{flex:1;min-width:0}svg{width:100%;height:100%;display:block}
aside{width:330px;border-left:1px solid var(--line);padding:16px 18px;overflow:auto}
.kpi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}
.kpi div{background:#121826;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.kpi b{font-size:18px;display:block}.kpi span{color:var(--mut);font-size:11px}
h3{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut);margin:16px 0 6px}
.ins{font-size:13px;margin:0 0 9px;padding-left:10px;border-left:2px solid var(--line)}
select{width:100%;background:#121826;color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:7px}
.lg{display:flex;align-items:center;gap:7px;font-size:12px;margin:3px 0;color:var(--mut)}
.dot{width:10px;height:10px;border-radius:50%;flex:none}
#tip{position:fixed;pointer-events:none;background:#0d1320;border:1px solid var(--line);border-radius:8px;padding:7px 10px;font-size:12px;opacity:0;transition:opacity .1s;max-width:240px;z-index:9}
#tip b{color:#fff}.muted{color:var(--mut)}
footer{padding:9px 24px;border-top:1px solid var(--line);color:var(--mut);font-size:11.5px}
circle.node{cursor:pointer;transition:opacity .15s}.dim{opacity:.12}
line.edge{stroke:#5fb3ff;pointer-events:none;transition:opacity .15s}
line.edge.hot{stroke:#ffd24a;opacity:.9!important}
</style></head><body>
<header><h1>ACT — The Energy Orbit</h1><div class=sub>The relationship-first model, made visible. <b style="color:var(--warm)">Supporter orbit</b> (Dunbar energy layers 5/15/50/150 — where energy is going) — never crosses — the <b style="color:var(--core)">community constellation</b> (sovereign contributors, measured by what ACT owes back). Hover any point. Filter by a project to see who to reach.</div></header>
<div class=wrap>
  <div id=stage><svg id=svg viewBox="0 0 1000 720" preserveAspectRatio=xMidYMid meet></svg></div>
  <aside>
    <h3>The shape</h3>
    <div class=kpi>
      <div><b id=k1></b><span>warm supporters drawn</span></div>
      <div><b id=k2></b><span>cold / uncaptured</span></div>
      <div><b id=k3></b><span>storytellers</span></div>
      <div><b id=k4 style="color:var(--owe)"></b><span>transcripts owed</span></div>
    </div>
    <h3>Reach for a project (Stage F)</h3>
    <select id=proj><option value="">— all —</option></select>
    <h3>Legend</h3>
    <div class=lg><span class=dot style="background:#ffd24a"></span> inner 5 — the core (white ring = GSD alliance)</div>
    <div class=lg><span class=dot style="background:#5fb3ff"></span> 15 — close circle</div>
    <div class=lg><span class=dot style="background:#3a7fbf"></span> 50 — friends of the field</div>
    <div class=lg><span class=dot style="background:#2b5378"></span> 150 — the wider field</div>
    <div class=lg><span class=dot style="background:var(--core);box-shadow:0 0 0 3px var(--owe)"></span> storyteller — red ring = owed</div>
    <div class=lg><span style="display:inline-block;width:14px;height:2px;background:#5fb3ff;opacity:.55;flex:none"></span> thread — on the same emails (hover a person to light their paths)</div>
    <h3>What it says</h3>
    <p class=ins>The rings are <b>Dunbar's layers</b> (5/15/50/150) — a finite energy budget; more isn't better. They show where energy <b>is</b> going; the morning question is whether that's where it <b>should</b> go.</p>
    <p class=ins>The warm core is small and <b>funder-skewed</b>; the doers are buried. Belonging-before-money exists to fix exactly this.</p>
    <p class=ins>Only <b id=pct></b> of the community's love is live. ACT owes <b id=cons></b> consent conversations.</p>
    <p class=ins>The line down the middle is the whole point: community is <b>never</b> laddered or dripped — it's owed back.</p>
    <h3>How to use it</h3>
    <p class=ins>Pick a project → the supporters who fit its needs light up. Start with the warmest. The constellation is your accountability list, not a target list.</p>
  </aside>
</div>
<footer>Read-only snapshot · regenerate with <code>node scripts/build-orbit-viz.mjs</code> · community lane is never energy-scored (OCAP)</footer>
<div id=tip></div>
<script>
const D=${DATA};
const svg=document.getElementById('svg'),NS='http://www.w3.org/2000/svg',tip=document.getElementById('tip');
const cx=330,cy=370; // supporter orbit centre (left)
const bands={'5':70,'15':135,'50':210,'150':292};                  // Dunbar layers: 5 / 15 / 50 / 150
const col={'5':'#ffd24a','15':'#5fb3ff','50':'#3a7fbf','150':'#2b5378'};
function el(t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
// rings + centre (labelled with the Dunbar layer size)
for(const b of ['150','50','15','5']){svg.appendChild(el('circle',{cx,cy,r:bands[b],fill:'none',stroke:'#1c2535','stroke-width':1}));
  const t=el('text',{x:cx,y:cy-bands[b]-4,fill:'#3d4c61','text-anchor':'middle','font-size':9});t.textContent=b;svg.appendChild(t);}
svg.appendChild(el('circle',{cx,cy,r:30,fill:'#161d2b',stroke:'#2b3a52','stroke-width':1.5}));
const c0=el('text',{x:cx,y:cy-2,fill:'#cfe0f5','text-anchor':'middle','font-size':12,'font-weight':700});c0.textContent='ACT';svg.appendChild(c0);
const c1=el('text',{x:cx,y:cy+12,fill:'#6b7a8d','text-anchor':'middle','font-size':9});c1.textContent='Harvest = centre';svg.appendChild(c1);
// the line
svg.appendChild(el('line',{x1:672,y1:40,x2:672,y2:680,stroke:'#3a4658','stroke-dasharray':'4 6','stroke-width':1}));
const lt=el('text',{x:678,y:56,fill:'#6b7a8d','font-size':10});lt.textContent='the line — never crossed into a funnel';svg.appendChild(lt);
const edgeLayer=el('g',{});svg.appendChild(edgeLayer);   // warm-path threads sit UNDER the dots
// supporters on rings (group by band, spread on an arc that avoids the community side)
const byBand={'5':[],'15':[],'50':[],'150':[]};D.supporters.forEach(s=>byBand[s.layer]&&byBand[s.layer].push(s));
const supNodes=[];
for(const b of ['5','15','50','150']){const arr=byBand[b],n=arr.length;arr.forEach((s,i)=>{
  const ang=Math.PI*0.62 + (Math.PI*1.76)*(n<=1?0.5:i/(n-1)); // sweep on the left ~3/4
  const r=bands[b]-(b==='5'?18:24)+((i%3)*12);
  const x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r;
  const node=el('circle',{cx:x,cy:y,r:s.circle?6.5:4.4,fill:col[b],stroke:s.circle?'#fff':'none','stroke-width':s.circle?1.6:0,class:'node'});
  node._d=s;node._key=norm(s.name);svg.appendChild(node);supNodes.push(node);
});}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\\s+/g,' ').trim();}
// warm-path threads (email co-occurrence) — faint until you hover a person
const pos={};supNodes.forEach(n=>pos[n._key]={x:+n.getAttribute('cx'),y:+n.getAttribute('cy')});
const edgeLines=[];
(D.edges||[]).forEach(eg=>{const a=pos[eg.a],b=pos[eg.b];if(!a||!b)return;
  const l=el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge','stroke-width':Math.min(2,0.6+eg.n*0.04)});
  l.style.opacity=Math.min(.3,.05+eg.n*.01);l._a=eg.a;l._b=eg.b;edgeLayer.appendChild(l);edgeLines.push(l);});
// cold cloud label
const cc=el('text',{x:cx,y:cy+bands['150']+34,fill:'#46566b','text-anchor':'middle','font-size':11});cc.textContent='+ '+D.stats.cold+' cold / uncaptured (the periphery)';svg.appendChild(cc);
// community constellation (right), packed in a soft cluster, size by transcripts
const ccx=836,ccy=380,comNodes=[];
D.community.forEach((s,i)=>{
  const ang=i*2.399963, rr=18+Math.sqrt(i)*20;       // sunflower spread
  const x=ccx+Math.cos(ang)*rr*1.05, y=ccy+Math.sin(ang)*rr*0.92;
  const rad=4+Math.min(10,s.tx*0.8);
  const g=el('g',{});
  if(s.owes>0)g.appendChild(el('circle',{cx:x,cy:y,r:rad+2.5,fill:'none',stroke:'#ff5d5d','stroke-width':1.4,opacity:.8}));
  const node=el('circle',{cx:x,cy:y,r:rad,fill:'#ffd24a',opacity:.92,class:'node'});
  node._c=s;g.appendChild(node);svg.appendChild(g);comNodes.push(node);
});
const clab=el('text',{x:ccx,y:96,fill:'#9aa7b8','text-anchor':'middle','font-size':12,'font-weight':600});clab.textContent='THE CONSTELLATION';svg.appendChild(clab);
const clab2=el('text',{x:ccx,y:112,fill:'#6b7a8d','text-anchor':'middle','font-size':10});clab2.textContent=D.stats.namedStory+' named storytellers · +'+D.unnamedCon+' unnamed';svg.appendChild(clab2);
const olab=el('text',{x:330,y:96,fill:'#9aa7b8','text-anchor':'middle','font-size':12,'font-weight':600});olab.textContent='THE ORBIT';svg.appendChild(olab);
// tooltip
function show(html,e){tip.innerHTML=html;tip.style.opacity=1;tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';}
function hide(){tip.style.opacity=0;}
supNodes.forEach(n=>{n.onmousemove=e=>show('<b>'+n._d.name+'</b><br>warmth '+Math.round(n._d.warmth)+(n._d.circle?' · <span style="color:#ffd24a">GSD alliance</span>':'')+(n._d.uncaptured?' · <span style="color:#5fb3ff">uncaptured ally</span>':'')+(n._d.roles?'<br><span class=muted>'+n._d.roles+'</span>':'')+(n._d.gmail?'<br><span class=muted>gmail '+n._d.gmail+(n._d.pattern?' · '+n._d.pattern:'')+'</span>':''),e);n.onmouseleave=hide;});
comNodes.forEach(n=>{n.onmousemove=e=>show('<b>'+n._c.name+'</b><br>'+n._c.tx+' transcripts · '+n._c.live+' live · <span style="color:#ff5d5d">'+n._c.owes+' owed</span>'+(n._c.consent?'<br><span class=muted>'+n._c.consent+' consent conversations owed</span>':''),e);n.onmouseleave=hide;});
// hovering a person lights up their warm paths
supNodes.forEach(n=>{const m=n.onmousemove,lv=n.onmouseleave;
  n.onmousemove=e=>{m(e);edgeLines.forEach(l=>l.classList.toggle('hot',l._a===n._key||l._b===n._key));};
  n.onmouseleave=()=>{lv();edgeLines.forEach(l=>l.classList.remove('hot'));};});
// kpis
k1.textContent=D.stats.drawn;k2.textContent=D.stats.cold;k3.textContent=D.stats.storytellers;k4.textContent=D.stats.owed;
pct.textContent=Math.round(D.stats.live/D.stats.tx*100)+'%';cons.textContent=D.stats.consent;
// project filter
const sel=document.getElementById('proj');Object.keys(D.projects).forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p;sel.appendChild(o);});
sel.onchange=()=>{const set=sel.value?new Set(D.projects[sel.value]):null;supNodes.forEach(n=>n.classList.toggle('dim',!!set&&!set.has(n._key)));};
</script></body></html>`;

writeFileSync('thoughts/shared/orbit-viz.html', html);
console.log(`Wrote thoughts/shared/orbit-viz.html`);
console.log(`  orbit: ${stats.drawn} warm supporters drawn (${stats.alliance} GSD-alliance, ${stats.uncaptured} uncaptured) · ${stats.cold} cold/uncaptured periphery`);
console.log(`  constellation: ${stats.namedStory} named storytellers (+${unnamedCon} unnamed) · ${stats.tx} transcripts · ${stats.live} live · ${stats.owed} owed · ${stats.consent} consent owed`);
console.log(`  projects (Stage F filter): ${Object.keys(projData).join(' · ')}`);
console.log(`  warm-path threads drawn: ${edges.length} (both ends in the drawn orbit; source orbit-cooccurrence.csv)`);
console.log(`\nOpen it:  open thoughts/shared/orbit-viz.html`);
