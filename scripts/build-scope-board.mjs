#!/usr/bin/env node
/**
 * build-scope-board.mjs — the OPERATIONAL instrument: review & scope projects and people.
 *
 * The decision surface (companion to the narrative orbit-viz). For each project it answers the
 * only four questions that matter — what does it NEED, what do we HAVE, where's the GAP, what's
 * the NEXT MOVE — and surfaces empty-cell gaps (needs with no warm person). Plus a people
 * action-queue: LATENT (warm but unasked), COOLING (going quiet), OWED (community accountability).
 *
 * Joins: project-needs-catalog.json (ALL needs) + project-needs-match.csv (matched candidates+warmth)
 *        + unified-orbit-worklist.csv (warmth / last_contact / flags) + el-contributor-constellation.csv (owes).
 * Read-only. Run:  node scripts/build-scope-board.mjs   Out: thoughts/shared/project-scope-board.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadLedger, ringOf, cadenceState, queuePriority, hasRead, canon, overlayBeeperRecency } from './lib/field-warmth.mjs';

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else if(c==='"')q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);
const WARM=20; // contact-warmth ≥ WARM = warm enough to ask; 1..19 lukewarm; 0 cold name
const TODAY=new Date(); const daysSince=d=>{const t=Date.parse(d);return isNaN(t)?null:Math.round((TODAY-t)/864e5);};

// ── needs catalog + matched candidates ─────────────────────────────────────
const catalog=JSON.parse(readFileSync('thoughts/shared/project-needs-catalog.json','utf8'));
const matches=rd('thoughts/shared/project-needs-match.csv');
const byPN={}; // project -> need -> [candidates]
// contact = real two-way signal only (matcher's contact_warmth); warmth still carries tier+affinity for ranking.
// "Covered" is judged on contact — tier+affinity alone could fake warmth ≥20 with zero actual contact.
for(const m of matches){(byPN[m.project]=byPN[m.project]||{});(byPN[m.project][m.need]=byPN[m.project][m.need]||[]).push({name:m.name,warmth:+m.warmth||0,contact:+(m.contact_warmth??m.warmth)||0,why:m.why,action:m.action,in_ghl:m.in_ghl});}
const board=catalog.map(p=>({
  project:p.project,
  needs:p.needs.map(need=>{
    const cands=(byPN[p.project]?.[need]||[]).sort((a,b)=>b.contact-a.contact||b.warmth-a.warmth);
    const warm=cands.filter(c=>c.contact>=WARM);
    const status=cands.length===0?'gap':warm.length>0?'covered':'thin';
    const top=cands[0];
    const move=status==='covered'?`Ask ${warm[0].name} (contact warmth ${Math.round(warm[0].contact)})`
      :status==='thin'?`Warm up ${top.name} — or source someone warmer (all ${cands.length} candidates are cold names)`
      :`Source — no one tagged. Find/activate someone for this.`;
    return {need,status,move,n:cands.length,warm:warm.length,cands:cands.slice(0,6)};
  }),
}));

// ── people action-queue (from the orbit + constellation) ───────────────────
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
overlayBeeperRecency(orbit);                                      // warm-channel time counts — clock no longer email-blind
const isInternal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test((n||'').trim());
const sup=new Map();
for(const p of orbit){
  if(p.status==='ghost'||p.status==='community')continue;
  if(p.vendor==='yes')continue;                                   // vendors out of the rings (volume ≠ closeness)
  if(isInternal(p.name||''))continue;
  const tags=p.rel_tags||'';const bs=Number(p.beeper_score)||0;const[gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const warmth=bs+((gi&&go)?Math.min(gi,go)*2:0);
  const k=canon(p.name);if(!k)continue;
  const prev=sup.get(k);if(prev&&prev.warmth>=warmth)continue;
  sup.set(k,{name:p.name,warmth,circle:/circle:gsd-alliance/.test(tags),tier:/tier:/.test(tags),
    uncaptured:/uncaptured/i.test(p.home||'')||p.status==='UNCAPTURED',last:p.last_contact||'',
    roles:(tags.match(/role:[a-z-]+/g)||[]).map(s=>s.slice(5)).join(', ')});
}
const people=[...sup.values()];
// ── warmth v2 (locked 2026-06-07): ring = Ben's read only · cadence = rhythm per ring ──
const { reads, votes } = loadLedger();
for(const p of people){p.ring=ringOf(reads,p.name);p.cad=p.ring?cadenceState(reads,p.name,p.last):null;}
// LATENT — truly unread with real signal, 👍-voted first: the reading queue
const latent=people.filter(p=>!hasRead(reads,p.name)&&votes.get(norm(p.name))!=='down'&&p.warmth>=WARM)
  .sort((a,b)=>queuePriority(votes,b.name,b.warmth)-queuePriority(votes,a.name,a.warmth)).slice(0,12);
// COOLING — RINGED people past their ring's rhythm (or their own stated cadence)
const cooling=people.filter(p=>p.cad?.state==='overdue').sort((a,b)=>(b.cad.ratio??0)-(a.cad.ratio??0)).slice(0,12);
// OWED — community accountability (named, by owes-gap)
const owed=rd('thoughts/shared/el-contributor-constellation.csv').map(r=>({name:r.name,tx:+r.transcripts,live:+r.live,owes:+r.owes_gap,consent:+r.consent_required})).filter(r=>!isUuid(r.name)&&r.owes>0).sort((a,b)=>b.owes-a.owes).slice(0,12);
// person-page links (supporter pages for latent/cooling, owes-shaped community pages for owed)
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const p of [...latent,...cooling,...owed])p.page=existsSync(`thoughts/shared/people/${slugify(p.name)}.md`)?slugify(p.name):'';

const DATA=JSON.stringify({board,latent,cooling,owed});

const html=`<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>ACT — Scope Board</title><style>
:root{--bg:#0b0e14;--panel:#121826;--ink:#e6edf3;--mut:#8b98a9;--line:#28323f;--ok:#3ddc97;--thin:#ffb454;--gap:#ff5d5d;--warm:#5fb3ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
header{padding:16px 24px;border-bottom:1px solid var(--line)}h1{margin:0;font-size:17px}.sub{color:var(--mut);font-size:12.5px;margin-top:3px}
.sub a{color:var(--warm)}
.tabs{display:flex;gap:7px;flex-wrap:wrap;padding:12px 24px 0}
.tab{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:6px 13px;font-size:12.5px;cursor:pointer;color:var(--mut)}
.tab.on{color:#fff;border-color:var(--warm);background:#16263a}
.tab .b{font-size:11px;margin-left:6px}
main{padding:16px 24px;display:grid;grid-template-columns:1.6fr .9fr;gap:22px;align-items:start}
.needs{display:grid;gap:12px}
.card{background:var(--panel);border:1px solid var(--line);border-left-width:4px;border-radius:10px;padding:12px 14px}
.card.covered{border-left-color:var(--ok)}.card.thin{border-left-color:var(--thin)}.card.gap{border-left-color:var(--gap)}
.need{font-weight:600;font-size:14px;margin-bottom:2px}
.badge{font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;padding:2px 7px;border-radius:5px;margin-left:8px;vertical-align:middle}
.badge.covered{background:#103a2a;color:var(--ok)}.badge.thin{background:#3a2c10;color:var(--thin)}.badge.gap{background:#3a1414;color:var(--gap)}
.move{font-size:12.5px;color:#cfe0f5;margin:7px 0 9px}
.cands{display:flex;flex-direction:column;gap:3px}
.cand{display:flex;justify-content:space-between;font-size:12.5px;padding:2px 0;border-bottom:1px dashed #1c2533}
.cand.w{color:#fff}.cand.c{color:var(--mut)}
.cand .w0{font-variant-numeric:tabular-nums;color:var(--mut);font-size:11.5px}
.cand b.ask{color:var(--ok)}
.emptygap{color:var(--gap);font-size:12.5px;font-style:italic}
.queue{display:flex;flex-direction:column;gap:16px}
.qbox{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.qbox h3{margin:0 0 3px;font-size:12px;text-transform:uppercase;letter-spacing:.6px}
.qbox.lat h3{color:var(--warm)}.qbox.cool h3{color:var(--thin)}.qbox.owe h3{color:var(--gap)}
.qsub{color:var(--mut);font-size:11.5px;margin-bottom:7px}
.qrow{display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;border-bottom:1px dashed #1c2533}
.qrow .m{color:var(--mut);font-size:11px}
.pp{color:var(--warm);font-size:11px;text-decoration:none;margin-left:5px}
.summary{font-size:12px;color:var(--mut);padding:10px 24px 0}
.summary b{color:var(--ink)}
</style></head><body>
<header><h1>ACT — Project Scope Board</h1><div class=sub>Review &amp; scope: what each project <b>needs</b> → who we <b>have</b> → the <b style="color:var(--gap)">gaps</b> → the <b>next move</b>. The narrative companion is the <a href="orbit-viz.html">orbit shape →</a></div></header>
<div class=tabs id=tabs></div>
<div class=summary id=summary></div>
<main>
  <div class=needs id=needs></div>
  <div class=queue>
    <div class="qbox lat"><h3>⚡ Latent — warm but unasked</h3><div class=qsub>energy present, never converted. the highest-leverage move.</div><div id=q-lat></div></div>
    <div class="qbox cool"><h3>🌡 Cooling — going quiet</h3><div class=qsub>was warm, >120 days since contact. re-engage before it's gone.</div><div id=q-cool></div></div>
    <div class="qbox owe"><h3>🤝 Owed — community accountability</h3><div class=qsub>NOT a target list. what ACT owes back — honour it.</div><div id=q-owe></div></div>
  </div>
</main>
<script>
const D=${DATA};let cur=0;
const tabs=document.getElementById('tabs'),needs=document.getElementById('needs'),summary=document.getElementById('summary');
function statCounts(p){const c={covered:0,thin:0,gap:0};p.needs.forEach(n=>c[n.status]++);return c;}
D.board.forEach((p,i)=>{const c=statCounts(p);const t=document.createElement('div');t.className='tab'+(i===0?' on':'');
  t.innerHTML=p.project.replace(/ \\(.*/,'')+'<span class=b>'+(c.gap?'<span style="color:#ff5d5d">●'+c.gap+'</span> ':'')+(c.thin?'<span style="color:#ffb454">●'+c.thin+'</span> ':'')+'<span style="color:#3ddc97">●'+c.covered+'</span></span>';
  t.onclick=()=>{cur=i;render();};tabs.appendChild(t);});
function render(){
  [...tabs.children].forEach((t,i)=>t.classList.toggle('on',i===cur));
  const p=D.board[cur],c=statCounts(p);
  summary.innerHTML='<b>'+p.project+'</b> — '+p.needs.length+' needs: <b style="color:#3ddc97">'+c.covered+' covered</b>, <b style="color:#ffb454">'+c.thin+' thin</b>, <b style="color:#ff5d5d">'+c.gap+' gap</b>.';
  needs.innerHTML='';
  for(const n of p.needs){
    const card=document.createElement('div');card.className='card '+n.status;
    let cands='';
    if(n.status==='gap')cands='<div class=emptygap>— no one tagged for this need —</div>';
    else cands='<div class=cands>'+n.cands.map((x,j)=>{const w=x.contact>=${WARM};return '<div class="cand '+(w?'w':'c')+'">'+(j===0&&w?'<b class=ask>→ ':'<span>')+x.name+(j===0&&w?'</b>':'</span>')+'<span class=w0>'+(x.contact>0?'contact '+Math.round(x.contact):'cold')+(x.warmth>x.contact?' (+tier)':'')+(x.in_ghl==='y'?'':' · not in GHL')+'</span></div>';}).join('')+(n.n>6?'<div class=cand style="color:#46566b">+'+(n.n-6)+' more</div>':'')+'</div>';
    card.innerHTML='<div class=need>'+n.need+'<span class="badge '+n.status+'">'+n.status+'</span></div><div class=move>→ '+n.move+'</div>'+cands;
    needs.appendChild(card);
  }
}
function fill(id,arr,fn){document.getElementById(id).innerHTML=arr.map(fn).join('')||'<div class=qrow style="color:#46566b">none</div>';}
const pp=p=>p.page?' <a class=pp href="people/'+p.page+'.md">page</a>':'';
fill('q-lat',D.latent,p=>'<div class=qrow><span>'+p.name+pp(p)+(p.uncaptured?' <span class=m>(uncaptured)</span>':'')+'</span><span class=w0 style="color:#5fb3ff">'+Math.round(p.warmth)+'</span></div>');
fill('q-cool',D.cooling,p=>'<div class=qrow><span>'+p.name+pp(p)+' <span class=m>ring '+p.ring+'</span></span><span class=m>'+p.cad.days+'d / '+p.cad.expected+'d</span></div>');
fill('q-owe',D.owed,p=>'<div class=qrow><span>'+p.name+pp(p)+'</span><span class=m>'+p.owes+' owed · '+p.live+'/'+p.tx+' live'+(p.consent?' · '+p.consent+' consent':'')+'</span></div>');
render();
</script></body></html>`;

writeFileSync('thoughts/shared/project-scope-board.html', html);
console.log('Wrote thoughts/shared/project-scope-board.html\n');
for(const p of board){const c={covered:0,thin:0,gap:0};p.needs.forEach(n=>c[n.status]++);
  console.log(`■ ${p.project}\n   ${c.covered} covered · ${c.thin} thin · ${c.gap} gap`);
  for(const n of p.needs)console.log(`     [${n.status.toUpperCase().padEnd(7)}] ${n.need}  → ${n.move}`);}
console.log(`\nAction queue: ${latent.length} latent · ${cooling.length} cooling · ${owed.length} owed`);
console.log('Open:  open thoughts/shared/project-scope-board.html');
