#!/usr/bin/env node
/**
 * build-morning-read.mjs — The Field's morning read: ONE screen, ≤7 actions, nothing else.
 *
 * Grounded in Action-Centric Dashboard Design (every item answers "what do I do today?")
 * and Dunbar's energy-allocation layers (5/15/50/150 — finite energy, the core is small by
 * design). It surfaces:
 *   🌡 cooling → water (was warm, going quiet — re-reach, oldest first)
 *   🤝 owed    → sun   (honour a storyteller — the constellation's accountability)
 *   🕳 gaps    → source (project needs with no warm person)
 *   ⚡ latent  → reach  (warm but never asked — the gold)
 * plus the ENERGY CHECK: is the inner 5/15 being tended, or is energy scattering outward?
 *
 * Read-only. Run each morning (or cron it):  node scripts/build-morning-read.mjs
 * Out: thoughts/shared/the-field-morning.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);
const NOW=new Date(); const daysSince=d=>{const t=Date.parse(d);return isNaN(t)?null:Math.round((NOW-t)/864e5);};
const today=NOW.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});

// ── people (supporter lane, deduped, warmth) ────────────────────────────────
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
const sup=new Map();
const looksLikeHandle=n=>/@/.test(n)||/^\+?\d[\d \-()]{6,}$/.test(n.trim());      // unresolved Beeper email/phone identities
const isInternal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi|a curious tractor)$/i.test(n.trim());
for(const p of orbit){
  if(p.status==='ghost'||p.status==='community')continue;
  if(looksLikeHandle(p.name||'')||isInternal(p.name||''))continue;               // not real layer members
  const tags=p.rel_tags||'';const bs=Number(p.beeper_score)||0;const[gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const warmth=bs+((gi&&go)?Math.min(gi,go)*2:0); const k=norm(p.name); if(!k)continue;
  const prev=sup.get(k); if(prev&&prev.warmth>=warmth)continue;
  sup.set(k,{name:p.name,warmth,circle:/circle:gsd-alliance/.test(tags),tier:/tier:/.test(tags),
    uncaptured:/uncaptured/i.test(p.home||'')||p.status==='UNCAPTURED',last:p.last_contact||''});
}
// manual energy from the workbench ledger overrides computed warmth — the human's read wins
if(existsSync('thoughts/shared/field-decisions.jsonl'))
  for(const l of readFileSync('thoughts/shared/field-decisions.jsonl','utf8').split('\n').filter(Boolean)){
    try{const d=JSON.parse(l);if(d.energy!=null){const p=sup.get(norm(d.name));if(p)p.warmth=d.energy;}}catch{}
  }
const people=[...sup.values()].sort((a,b)=>b.warmth-a.warmth);

// ── Dunbar layers by where energy IS going (warmth rank) ────────────────────
const warm=people.filter(p=>p.warmth>0);
const inner5=warm.slice(0,5), l15=warm.slice(5,15), l50=warm.slice(15,50), l150=warm.slice(50,150);
const coreStale=[...inner5,...l15].filter(p=>{const d=daysSince(p.last);return d!=null&&d>30;});

// ── the ≤7 actions ──────────────────────────────────────────────────────────
const used=new Set();
const take=(arr,n)=>arr.filter(p=>!used.has(norm(p.name||p.need||''))).slice(0,n).map(p=>{used.add(norm(p.name||p.need||''));return p;});
const cooling=take(people.filter(p=>p.warmth>=20&&daysSince(p.last)>120).sort((a,b)=>daysSince(b.last)-daysSince(a.last)),2);
const owedAll=rd('thoughts/shared/el-contributor-constellation.csv').map(r=>({name:r.name,owes:+r.owes_gap,live:+r.live,tx:+r.transcripts,consent:+r.consent_required})).filter(r=>!isUuid(r.name)&&r.owes>0).sort((a,b)=>b.owes-a.owes);
const owed=owedAll.slice(0,2);
// gaps: thin needs (no warm candidate) from catalog+matches
const catalog=JSON.parse(readFileSync('thoughts/shared/project-needs-catalog.json','utf8'));
const matches=rd('thoughts/shared/project-needs-match.csv');
// judge "warm enough" on contact_warmth (real two-way signal) — tier+affinity alone can fake warmth ≥20
const byPN={};for(const m of matches){(byPN[m.project]=byPN[m.project]||{});(byPN[m.project][m.need]=byPN[m.project][m.need]||[]).push({name:m.name,contact:+(m.contact_warmth??m.warmth)||0});}
const thin=[];for(const p of catalog)for(const need of p.needs){const c=(byPN[p.project]?.[need]||[]).sort((a,b)=>b.contact-a.contact);if(!c.length||c[0].contact<20)thin.push({project:p.project.replace(/ \(.*/,''),need,best:c[0]?.name||null});}
const gaps=thin.slice(0,2);
const latent=take(people.filter(p=>p.warmth>=20&&!p.circle&&(p.uncaptured||!p.tier)).sort((a,b)=>b.warmth-a.warmth),2);

const pageLink=n=>existsSync(`thoughts/shared/people/${slug(n)}.md`)?` <a class=pp href="people/${slug(n)}.md">page</a>`:'';
const item=(emoji,verb,who,why,extra='')=>`<div class=act><span class=e>${emoji}</span><div><b>${verb}</b> — ${who}${extra}<div class=why>${why}</div></div></div>`;
const coolingItems=cooling.map(p=>item('🌡','Water',p.name,`was warm (${Math.round(p.warmth)}), ${daysSince(p.last)} days quiet — re-reach before it's gone`,pageLink(p.name)));
const owedItems=owed.map(p=>item('🤝','Sun',p.name,`${p.owes} of their ${p.tx} transcripts not yet brought to life${p.consent?` · ${p.consent} consent conversation owed`:''} — honour one today`,pageLink(p.name)));
const gapItems=gaps.map(g=>item('🕳','Source',`${g.project}: ${g.need}`,g.best?`warmest candidate (${g.best}) is still a cold name — warm them up or find someone`:`no one tagged at all`));
const latentItems=latent.map(p=>item('⚡','Reach',p.name,`warm (${Math.round(p.warmth)}) but never formalised — the energy is already there${p.uncaptured?' (uncaptured)':''}`,pageLink(p.name)));
// interleave: every category's first item is guaranteed; the 7-cap then cuts at most one
// second-round item, and WHICH one rotates by day — no category is structurally starved.
const cats=[coolingItems,owedItems,gapItems,latentItems];
const rot=NOW.getDate()%4;
const round2=cats.slice(rot).concat(cats.slice(0,rot)).map(c=>c[1]);
const actions=[...cats.map(c=>c[0]),...round2].filter(Boolean).slice(0,7);

const html=`<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>The Field — morning read</title><style>
body{margin:0;background:#0b0e14;color:#e6edf3;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center}
.wrap{max-width:680px;width:100%;padding:40px 26px 60px}
h1{font-size:21px;margin:0}.date{color:#8b98a9;font-size:13px;margin:2px 0 4px}
.state{color:#aab8c8;font-size:13.5px;margin:10px 0 26px;padding:10px 14px;background:#121826;border:1px solid #28323f;border-radius:9px}
.state b{color:#fff}.state .warn{color:#ffb454}.state .ok{color:#3ddc97}
.act{display:flex;gap:13px;padding:13px 2px;border-bottom:1px solid #1b2430}
.act .e{font-size:19px;line-height:1.4}
.act b{font-size:14.5px}.why{color:#8b98a9;font-size:13px;margin-top:1px}
.pp{color:#5fb3ff;font-size:11.5px;text-decoration:none;margin-left:6px}
.foot{color:#46566b;font-size:12px;margin-top:28px}
.foot a{color:#5fb3ff;text-decoration:none}
.layers{color:#6b7a8d;font-size:12px;margin-top:6px}
</style></head><body><div class=wrap>
<h1>The Field — morning read</h1><div class=date>${today}</div>
<div class=state>
<b>Energy check.</b> Your inner 5: ${inner5.map(p=>p.name).join(' · ')||'—'}.
${coreStale.length?`<span class=warn>${coreStale.length} of your inner 15 are >30 days quiet (${coreStale.slice(0,3).map(p=>p.name).join(', ')}${coreStale.length>3?'…':''}) — the core is going untended.</span>`:`<span class=ok>The core is tended.</span>`}
<div class=layers>Layers by where energy is going: 5 / ${l15.length} / ${l50.length} / ${l150.length} · finite budget — more isn't better; protect the inner layers, leave the field to refill.</div>
</div>
${actions.join('')}
<div class=foot>Tend, then close the tab. Deeper looks: <a href="project-scope-board.html">scope board</a> · <a href="orbit-viz.html">the orbit</a> · person pages in <code>people/</code>. Regenerate: <code>node scripts/build-morning-read.mjs</code></div>
</div></body></html>`;

writeFileSync('thoughts/shared/the-field-morning.html',html);
console.log(`Wrote thoughts/shared/the-field-morning.html — ${actions.length} actions for ${today}`);
console.log(`  energy: inner5=[${inner5.map(p=>p.name).join(', ')}] · core stale: ${coreStale.length}`);
console.log(`  water ${cooling.length} · sun ${owed.length} · source ${gaps.length} · reach ${latent.length}`);
