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
const isInternal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test(n.trim());
for(const p of orbit){
  if(p.status==='ghost'||p.status==='community')continue;
  if(p.vendor==='yes')continue;                                                  // vendors out of the rings (volume ≠ closeness)
  if(looksLikeHandle(p.name||'')||isInternal(p.name||''))continue;               // not real layer members
  const tags=p.rel_tags||'';const bs=Number(p.beeper_score)||0;const[gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const warmth=bs+((gi&&go)?Math.min(gi,go)*2:0); const k=canon(p.name); if(!k)continue;
  const prev=sup.get(k); if(prev&&prev.warmth>=warmth)continue;
  sup.set(k,{name:p.name,warmth,circle:/circle:gsd-alliance/.test(tags),tier:/tier:/.test(tags),
    uncaptured:/uncaptured/i.test(p.home||'')||p.status==='UNCAPTURED',last:p.last_contact||''});
}
// ── WARMTH V2 (locked 2026-06-07): ring = human-only · cadence = rhythm per ring ──
// Calibration killed warmth-as-closeness (Ben's rejects scored HIGHEST). Layers come
// from HIS reads; cadence alerts only for people he has ringed; votes order the queue.
import { loadLedger, ringOf, layerOf, cadenceState, queuePriority, hasRead, canon } from './lib/field-warmth.mjs';
const { reads, votes } = loadLedger();
// energy override still names the inner core (his words)
for (const [k, d] of reads) { const p = sup.get(k); if (p && d.energy != null) p.energy = d.energy; }
const people=[...sup.values()];
for (const p of people) { p.ring = ringOf(reads, p.name); p.cad = p.ring ? cadenceState(reads, p.name, p.last) : null; }

// ── Dunbar layers from BEN'S READS (machine never estimates a ring) ──────────
const ringed = people.filter(p => p.ring);
const byEnergy = (a, b) => (b.energy ?? 0) - (a.energy ?? 0);
const inner5 = ringed.filter(p => layerOf(reads, p.name) === '5').sort(byEnergy).slice(0, 5);
const l15 = ringed.filter(p => p.ring === '15' && !inner5.includes(p)).sort(byEnergy);
const l50 = ringed.filter(p => p.ring === '50'), l150 = ringed.filter(p => p.ring === '150');
const coreStale=[...inner5,...l15].filter(p=>p.cad&&(p.cad.state==='due'||p.cad.state==='overdue'));

// ── the ≤7 actions ──────────────────────────────────────────────────────────
const used=new Set();
const take=(arr,n)=>arr.filter(p=>!used.has(norm(p.name||p.need||''))).slice(0,n).map(p=>{used.add(norm(p.name||p.need||''));return p;});
// tend: RINGED people overdue vs their ring's rhythm (or their own stated cadence)
const cooling=take(ringed.filter(p=>p.cad?.state==='overdue').sort((a,b)=>(b.cad.ratio??0)-(a.cad.ratio??0)),2);
const owedAll=rd('thoughts/shared/el-contributor-constellation.csv').map(r=>({name:r.name,owes:+r.owes_gap,live:+r.live,tx:+r.transcripts,consent:+r.consent_required})).filter(r=>!isUuid(r.name)&&r.owes>0).sort((a,b)=>b.owes-a.owes);
const owed=owedAll.slice(0,2);
// gaps: thin needs (no warm candidate) from catalog+matches
const catalog=JSON.parse(readFileSync('thoughts/shared/project-needs-catalog.json','utf8'));
const matches=rd('thoughts/shared/project-needs-match.csv');
// judge "warm enough" on contact_warmth (real two-way signal) — tier+affinity alone can fake warmth ≥20
const byPN={};for(const m of matches){(byPN[m.project]=byPN[m.project]||{});(byPN[m.project][m.need]=byPN[m.project][m.need]||[]).push({name:m.name,contact:+(m.contact_warmth??m.warmth)||0});}
const thin=[];for(const p of catalog)for(const need of p.needs){const c=(byPN[p.project]?.[need]||[]).sort((a,b)=>b.contact-a.contact);if(!c.length||c[0].contact<20)thin.push({project:p.project.replace(/ \(.*/,''),need,best:c[0]?.name||null});}
const gaps=thin.slice(0,2);
// read next: the queue — 👍-voted unread people first, then strongest unread signal
// (truly unread only: any ledger read — incl. out/family — means Ben has already looked)
const latent=take(people.filter(p=>!hasRead(reads,p.name)&&votes.get(norm(p.name))!=='down'&&p.warmth>=8)
  .sort((a,b)=>queuePriority(votes,b.name,b.warmth)-queuePriority(votes,a.name,a.warmth)),2);

const pageLink=n=>existsSync(`thoughts/shared/people/${slug(n)}.md`)?` <a class=pp href="people/${slug(n)}.md">page</a>`:'';
const item=(emoji,verb,who,why,extra='')=>`<div class=act><span class=e>${emoji}</span><div><b>${verb}</b> — ${who}${extra}<div class=why>${why}</div></div></div>`;
const coolingItems=cooling.map(p=>item('🌡','Water',p.name,`ring ${p.ring} runs ~every ${p.cad.expected}d — it's been ${p.cad.days}d (${p.cad.ratio.toFixed(1)}× over) — re-reach before it's gone`,pageLink(p.name)));
const owedItems=owed.map(p=>item('🤝','Sun',p.name,`${p.owes} of their ${p.tx} transcripts not yet brought to life${p.consent?` · ${p.consent} consent conversation owed`:''} — honour one today`,pageLink(p.name)));
const gapItems=gaps.map(g=>item('🕳','Source',`${g.project}: ${g.need}`,g.best?`warmest candidate (${g.best}) is still a cold name — warm them up or find someone`:`no one tagged at all`));
const latentItems=latent.map(p=>item('⚡','Read',p.name,`${votes.get(norm(p.name))==='up'?'you pulled them closer in triage — give them a ring':'real two-way signal, no read yet — 30 seconds in the circle UI'}${p.uncaptured?' (uncaptured)':''}`,pageLink(p.name)));
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
${(()=>{try{const f=JSON.parse(readFileSync('thoughts/shared/field-freshness.json','utf8'));const d=f.stale_days;return(d==null||d>2)?`<div class=state><span class=warn>⚠ Email spine is ${d??'??'} days stale (last gmail ingest ${(f.gmail_max_created||'never').slice(0,10)}) — warmth/cooling below may be wrong. Run sync-gmail-to-supabase + check trigger errors.</span></div>`:'';}catch{return'';}})()}
<div class=state>
<b>Energy check.</b> Your inner 5: ${inner5.map(p=>p.name).join(' · ')||'—'}.
${coreStale.length?`<span class=warn>${coreStale.length} of your core are past their rhythm (${coreStale.slice(0,3).map(p=>`${p.name} ${p.cad.days}d/${p.cad.expected}d`).join(', ')}${coreStale.length>3?'…':''}) — the core is going untended.</span>`:`<span class=ok>The core is tended — everyone inside their rhythm.</span>`}
<div class=layers>Your read layers: ${inner5.length} / ${l15.length} / ${l50.length} / ${l150.length} of 5/15/50/150 · rings are yours alone — the machine only keeps time. ${people.filter(p=>!p.ring).length} unread in the field.</div>
</div>
${actions.join('')}
<div class=foot>Tend, then close the tab. Deeper looks: <a href="project-scope-board.html">scope board</a> · <a href="orbit-viz.html">the orbit</a> · person pages in <code>people/</code>. Regenerate: <code>node scripts/build-morning-read.mjs</code></div>
</div></body></html>`;

writeFileSync('thoughts/shared/the-field-morning.html',html);
console.log(`Wrote thoughts/shared/the-field-morning.html — ${actions.length} actions for ${today}`);
console.log(`  energy: inner5=[${inner5.map(p=>p.name).join(', ')}] · core stale: ${coreStale.length}`);
console.log(`  water ${cooling.length} · sun ${owed.length} · source ${gaps.length} · reach ${latent.length}`);
