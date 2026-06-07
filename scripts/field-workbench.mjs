#!/usr/bin/env node
/**
 * field-workbench.mjs — The Field's curation workbench: work the layers, move people, edit verdicts.
 *
 * GHL TAGS ARE THE SOURCE OF TRUTH. Every verdict computes an exact GHL tag diff (project:act-* ·
 * lane:community · tier:* · circle:gsd-alliance · role:* · org:*) and appends to the local ledger
 * (field-decisions.jsonl) — nothing touches GHL from here. Apply: node scripts/apply-field-decisions.mjs
 *
 * Lane-1 workflow (the inner ~150, by hand): the LEFT SIDEBAR shows the live Dunbar layers
 * (5/15/50/150) by EFFECTIVE energy (your saved read wins over computed warmth). Click any name to
 * open their card; re-opening a decided person pre-loads your saved verdict (latest wins on apply).
 * Move someone = change their energy; the layers re-rank live. Search jumps anywhere.
 *
 * Run:  node scripts/field-workbench.mjs   →  http://localhost:4646
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';

const PORT = 4646;
const LEDGER = 'thoughts/shared/field-decisions.jsonl';
const PROJECTS = [['act-gd','Goods'],['act-hv','Harvest'],['act-jh','JusticeHub'],['act-cn','CivicGraph'],['act-in','Studio'],
  ['act-el','Empathy Ledger'],['act-fm','Farm'],['act-pi','PICC'],['act-oo','Oonchiumpa'],['act-bg','BG Fit'],['act-ce','CFE']];
const TIERS = ['curious','connected','member','active','steward'];

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const handle=n=>/@/.test(n)||/^\+?\d[\d \-()]{6,}$/.test((n||'').trim());
const internal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi|a curious tractor)$/i.test((n||'').trim());

const soil=new Map(); for(const s of rd('thoughts/shared/orbit-soil.csv')) if(!soil.has(norm(s.name))) soil.set(norm(s.name),s);

// latest saved verdict per person (re-opening pre-loads it; re-saving supersedes — latest wins)
const decisions={};
if(existsSync(LEDGER)) for(const l of readFileSync(LEDGER,'utf8').split('\n').filter(Boolean)){
  try{const d=JSON.parse(l);decisions[norm(d.name)]=d;}catch{}}

const seen=new Map();
for(const p of rd('thoughts/shared/unified-orbit-worklist.csv')){
  if(p.status==='ghost'||handle(p.name)||internal(p.name))continue;
  const tags=(p.rel_tags||'').split(/\s+/).filter(Boolean);
  const bs=Number(p.beeper_score)||0;const[gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const warmth=bs+((gi&&go)?Math.min(gi,go)*2:0);
  const k=norm(p.name);if(!k)continue;
  const prev=seen.get(k);
  if(prev){prev.tags=[...new Set([...prev.tags,...tags])];prev.warmth=Math.max(prev.warmth,warmth);prev.email=prev.email||p.email;prev.gmail=prev.gmail||p.gmail_in_out;prev.gtotal=prev.gtotal||p.gmail_total;prev.last=prev.last||p.last_contact;prev.dupes++;continue;}
  seen.set(k,{name:p.name,email:(p.email||'').toLowerCase(),lane:p.status==='community'?'community':'supporter',warmth,tags,dupes:1,gmail:p.gmail_in_out||'',gtotal:p.gmail_total||'',last:p.last_contact||''});
}
let queue=[...seen.values()].map(p=>{
  const proj=p.tags.filter(t=>t.startsWith('project:'));
  const legacyProj=p.tags.filter(t=>/^(act-(gd|hv|jh|cn|in|el|fm|pi|oo|bg|ce)|goods|justicehub|harvest|empathy ledger)$/i.test(t));
  const s=soil.get(norm(p.name));
  const dom=(p.email.split('@')[1]||'').toLowerCase();
  const generic=/^(gmail|googlemail|hotmail|outlook|live|icloud|me|mac|yahoo|bigpond|optusnet|protonmail|empathy-ledger)\./.test(dom)||!dom;
  const orgHint=s?.company||(generic?'':dom.split('.')[0]);
  return {...p,key:norm(p.name),proj,legacyProj,company:s?.company||'',position:s?.position||'',orgHint,
    crossover:new Set(proj.map(x=>x.slice(8))).size>=2, page:existsSync(`thoughts/shared/people/${slug(p.name)}.md`)?slug(p.name):null};
}).filter(p=>p.warmth>0||p.proj.length||p.legacyProj.length||p.tags.some(t=>/^(role:|tier:|circle:)/.test(t)));
queue.sort((a,b)=>(b.crossover-a.crossover)||(b.warmth-a.warmth));
console.log(`Workbench: ${queue.length} people queued (${queue.filter(p=>p.crossover).length} crossover, ${Object.keys(decisions).length} decided) → http://localhost:${PORT}`);

const DATA=JSON.stringify({queue,PROJECTS,TIERS,decisions}).replace(/</g,'\\u003c');
const HTML=`<!doctype html><html><head><meta charset=utf-8><title>The Field — workbench</title><style>
body{margin:0;background:#0b0e14;color:#e6edf3;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.app{display:flex;height:100vh}
aside{width:285px;border-right:1px solid #28323f;overflow-y:auto;padding:16px 14px;flex-shrink:0}
aside h2{font-size:13px;margin:0 0 8px}
aside input{width:100%;background:#121826;border:1px solid #2a3648;border-radius:7px;padding:7px 10px;color:#e6edf3;font-size:13px;box-sizing:border-box;margin-bottom:12px}
.lay{font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;color:#6b7a8d;margin:13px 0 4px;display:flex;justify-content:space-between}
.pr{display:flex;justify-content:space-between;padding:3px 7px;border-radius:6px;font-size:12.5px;cursor:pointer;color:#aab8c8}
.pr:hover{background:#121826}.pr.cur{background:#16263a;color:#fff}
.pr .e{color:#ffd24a;font-variant-numeric:tabular-nums;font-size:11.5px}
.pr .dn{color:#3ddc97;margin-right:4px}
main{flex:1;overflow-y:auto;padding:22px 26px}
.prog{color:#8b98a9;font-size:12.5px;margin-bottom:14px}
.card{background:#121826;border:1px solid #28323f;border-radius:12px;padding:18px 20px;max-width:860px}
.nm{font-size:20px;font-weight:700}.meta{color:#8b98a9;font-size:12.5px;margin:2px 0 10px}
.meta a{color:#5fb3ff;text-decoration:none}
.tags{font-size:11.5px;color:#6b7a8d;margin:8px 0 14px;line-height:1.9}.tags b{color:#9aa7b8}
.tag{background:#1a2230;border:1px solid #2a3648;border-radius:5px;padding:1px 7px;margin-right:4px;white-space:nowrap}
.tag.p{border-color:#5fb3ff;color:#cfe4ff}.tag.x{border-color:#3a2c10;color:#ffb454}
.sec{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7a8d;margin:13px 0 6px}
.btns{display:flex;flex-wrap:wrap;gap:6px}
.b{background:#1a2230;border:1px solid #2a3648;border-radius:7px;padding:5px 11px;font-size:12.5px;color:#aab8c8;cursor:pointer;user-select:none}
.b.on{background:#16263a;border-color:#5fb3ff;color:#fff}
.b.lane.on{border-color:#ffd24a}.b.circ.on{border-color:#ffd24a;color:#ffd24a}
input[type=text]{background:#0d1320;border:1px solid #2a3648;border-radius:7px;padding:7px 10px;color:#e6edf3;font-size:13px;box-sizing:border-box}
.diff{font-size:12px;margin:12px 0;padding:9px 12px;background:#0d1320;border-radius:8px;border:1px solid #1c2533;color:#8b98a9;min-height:18px}
.diff .a{color:#3ddc97}.diff .r{color:#ff5d5d}
.acts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.A{border-radius:8px;padding:9px 15px;font-size:13.5px;cursor:pointer;border:1px solid #2a3648;background:#1a2230;color:#e6edf3}
.A.save{background:#103a2a;border-color:#3ddc97}.A.skip{color:#8b98a9}.A.flag{border-color:#ffb454}.A.no{border-color:#ff5d5d}
.saved{color:#3ddc97;font-size:12px;margin-left:8px}
kbd{background:#1a2230;border:1px solid #2a3648;border-radius:4px;padding:0 5px;font-size:11px;color:#8b98a9}
.hint{color:#46566b;font-size:11.5px;margin-top:14px;max-width:860px}
</style></head><body><div class=app>
<aside>
  <h2>The layers — by your read</h2>
  <input type=text id=q placeholder="search anyone…" oninput="renderSide(this.value)">
  <div id=side></div>
</aside>
<main>
  <div class=prog id=prog></div>
  <div class=card id=card></div>
  <div class=hint>Click a name to open · re-opening a decided person pre-loads your verdict; re-saving supersedes it (latest wins). Move someone = change their energy; the layers re-rank live. <kbd>s</kbd> save · <kbd>c</kbd> confirm · <kbd>→</kbd> next. Apply to GHL: <code>node scripts/apply-field-decisions.mjs prep</code></div>
</main>
</div><script>
const D=${DATA};
const ROLES=['storyteller','traditional-owner','elder','partner','funder','supplier','buyer','advisory','researcher'];
let i=D.queue.findIndex(p=>!D.decisions[p.key]); if(i<0)i=0;
let sel={};
const $=id=>document.getElementById(id);
function cur(){return D.queue[i];}
function effTags(p){const d=D.decisions[p.key];if(!d)return p.tags;
  let t=p.tags.filter(x=>!(d.removes||[]).includes(x));for(const a of (d.adds||[]))if(!t.includes(a))t.push(a);return t;}
function effEnergy(p){const d=D.decisions[p.key];return (d&&d.energy!=null)?d.energy:p.warmth;}
function effLane(p){const d=D.decisions[p.key];return d?.lane||p.lane;}
function reset(p){const t=effTags(p);const d=D.decisions[p.key];
  sel={proj:new Set(t.filter(x=>x.startsWith('project:')).map(x=>x.slice(8))),
    lane:effLane(p),
    tier:(t.find(x=>x.startsWith('tier:'))||'').slice(5)||null,
    circle:t.includes('circle:gsd-alliance'),fam:t.includes('role:family'),fri:t.includes('role:friend'),
    roles:new Set(t.filter(x=>x.startsWith('role:')).map(x=>x.slice(5)).filter(r=>ROLES.includes(r))),
    org:(t.find(x=>x.startsWith('org:'))||'').slice(4),
    energy:Math.round(effEnergy(p)),energyTouched:!!(d&&d.energy!=null),note:d?.note||''};}
function diff(p){const base=p.tags;const adds=[],rems=[];
  const curP=new Set(base.filter(x=>x.startsWith('project:')).map(x=>x.slice(8)));
  for(const c of sel.proj)if(!curP.has(c))adds.push('project:'+c);
  for(const c of curP)if(!sel.proj.has(c))rems.push('project:'+c);
  const hasLane=base.includes('lane:community');
  if(sel.lane==='community'&&!hasLane)adds.push('lane:community');
  if(sel.lane!=='community'&&hasLane)rems.push('lane:community');
  const curT=(base.find(x=>x.startsWith('tier:'))||'').slice(5);
  if(sel.lane==='community'){if(curT)rems.push('tier:'+curT);}
  else if(sel.tier&&sel.tier!==curT){if(curT)rems.push('tier:'+curT);adds.push('tier:'+sel.tier);}
  else if(!sel.tier&&curT){rems.push('tier:'+curT);}
  const hasC=base.includes('circle:gsd-alliance');
  if(sel.circle&&!hasC)adds.push('circle:gsd-alliance'); if(!sel.circle&&hasC)rems.push('circle:gsd-alliance');
  const hasF=base.includes('role:family'),hasFr=base.includes('role:friend');
  if(sel.fam&&!hasF)adds.push('role:family'); if(!sel.fam&&hasF)rems.push('role:family');
  if(sel.fri&&!hasFr)adds.push('role:friend'); if(!sel.fri&&hasFr)rems.push('role:friend');
  for(const r of ROLES){const has=base.includes('role:'+r),want=sel.roles.has(r);
    if(want&&!has)adds.push('role:'+r); if(!want&&has)rems.push('role:'+r);}
  const curOrg=(base.find(x=>x.startsWith('org:'))||'').slice(4);
  const wantOrg=(sel.org||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if(wantOrg&&wantOrg!==curOrg){adds.push('org:'+wantOrg);if(curOrg)rems.push('org:'+curOrg);}
  if(!wantOrg&&curOrg)rems.push('org:'+curOrg);
  return {adds,rems};
}
function layers(){const sup=D.queue.filter(p=>effLane(p)!=='community').map(p=>({p,e:effEnergy(p)})).sort((a,b)=>b.e-a.e);
  return {'inner 5':sup.slice(0,5),'15':sup.slice(5,15),'50':sup.slice(15,50),'150':sup.slice(50,150)};}
function row(x){const p=x.p,d=D.decisions[p.key];
  return '<div class="pr'+(D.queue[i]===p?' cur':'')+'" onclick="go(\\''+p.key+'\\')">'
    +'<span>'+(d?'<span class=dn>✓</span>':'')+p.name+'</span><span class=e>'+Math.round(x.e)+'</span></div>';}
function renderSide(q){const el=$('side');
  if(q&&q.trim()){const t=q.trim().toLowerCase();
    el.innerHTML='<div class=lay><span>search</span></div>'+D.queue.filter(p=>p.name.toLowerCase().includes(t)).slice(0,30).map(p=>row({p,e:effEnergy(p)})).join('');return;}
  const L=layers();el.innerHTML=Object.entries(L).map(([k,arr])=>'<div class=lay><span>'+k+'</span><span>'+arr.filter(x=>D.decisions[x.p.key]).length+'/'+arr.length+' ✓</span></div>'+arr.map(row).join('')).join('');
}
function go(key){const idx=D.queue.findIndex(p=>p.key===key);if(idx>=0){i=idx;reset(cur());render();}}
function render(){
  const p=cur(); if(!p){$('card').innerHTML='<b>Done.</b>';return;}
  const d=diff(p); const dec=D.decisions[p.key];
  const undone=D.queue.filter(x=>!D.decisions[x.key]).length;
  $('prog').textContent=undone+' of '+D.queue.length+' still to judge'+(p.crossover?' · ⚠ project-crossover':'')+(p.dupes>1?' · '+p.dupes+' GHL dupes':'');
  $('card').innerHTML=
    '<div class=nm>'+p.name+(dec?'<span class=saved>✓ saved '+(dec.ts||'').slice(0,10)+' — editing supersedes</span>':'')+'</div>'
    +'<div class=meta>warmth '+Math.round(p.warmth)+(dec&&dec.energy!=null?' · <b style="color:#ffd24a">your read '+dec.energy+'</b>':'')+' · '+(p.position?p.position+', ':'')+(p.company||(p.orgHint?p.orgHint+' <span style="color:#46566b">(from email domain)</span>':'—'))
    +(p.gmail?' · <b style="color:#9aa7b8">email '+p.gmail+'</b> ('+(p.gtotal||'?')+' total)':'')+(p.last?' · last '+p.last:'')
    +(p.page?' · <a href="#" onclick="return false" title="thoughts/shared/people/'+p.page+'.md">person page ↗</a>':'')+'</div>'
    +'<div class=tags><b>now:</b> '+(effTags(p).filter(t=>/^(project:|lane:|tier:|circle:|role:|org:)/.test(t)).map(t=>'<span class="tag p">'+t+'</span>').join('')||'—')
    +(p.legacyProj.length?'<br><b>legacy:</b> '+p.legacyProj.map(t=>'<span class="tag x">'+t+'</span>').join(''):'')+'</div>'
    +'<div class=sec>projects (first = where they belong)</div><div class=btns>'+D.PROJECTS.map(([c,l])=>'<div class="b '+(sel.proj.has(c)?'on':'')+'" onclick="tg(\\''+c+'\\')">'+l+'</div>').join('')+'</div>'
    +'<div class=sec>lane & ring</div><div class=btns>'
      +'<div class="b lane '+(sel.lane==='supporter'?'on':'')+'" onclick="lane(\\'supporter\\')">supporter</div>'
      +'<div class="b lane '+(sel.lane==='community'?'on':'')+'" onclick="lane(\\'community\\')">community (no tier, no drips)</div>'
      +'<div class="b circ '+(sel.circle?'on':'')+'" onclick="circ()">★ GSD alliance</div>'
      +'<div class="b circ '+(sel.fam?'on':'')+'" onclick="fam()">♥ family</div>'
      +'<div class="b circ '+(sel.fri?'on':'')+'" onclick="fri()">♥ friend</div>'
      +(sel.lane==='community'?'':D.TIERS.map(t=>'<div class="b '+(sel.tier===t?'on':'')+'" onclick="tier(\\''+t+'\\')">'+t+'</div>').join(''))+'</div>'
    +'<div class=sec>roles — the work relationships (toggle off what\\'s wrong)</div><div class=btns>'+ROLES.map(r=>'<div class="b '+(sel.roles.has(r)?'on':'')+'" onclick="rl(\\''+r+'\\')">'+r+'</div>').join('')+'</div>'
    +(sel.lane==='community'
      ? '<div class=sec>energy</div><div style="color:#6b7a8d;font-size:12px;margin-bottom:4px">community is never energy-scored — measured by what we owe back, not their use to us</div>'
      : '<div class=sec>energy — your read (computed '+Math.round(p.warmth)+') · moves them between layers</div>'
        +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px"><input type=range min=0 max=100 value="'+sel.energy+'" style="flex:1;accent-color:#ffd24a" oninput="enLive(this)"><b id=ev style="min-width:28px;color:#ffd24a">'+sel.energy+'</b></div>')
    +'<div class=diff>'+(d.adds.length||d.rems.length? d.adds.map(t=>'<span class=a>+'+t+'</span>').join(' ')+' '+d.rems.map(t=>'<span class=r>−'+t+'</span>').join(' ') : 'no tag changes — confirm as-is')+'</div>'
    +'<div class=sec>org — who they\\'re with (writes org: tag)</div>'
    +'<div style="display:flex;gap:8px;align-items:center"><input type=text style="flex:1" value="'+(sel.org||'').replace(/"/g,'&quot;')+'" placeholder="organisation" oninput="sel.org=this.value" onchange="render()">'
    +(p.orgHint&&sel.org!==p.orgHint?'<div class=b onclick="useHint()">⊕ '+p.orgHint+'</div>':'')+'</div>'
    +'<div class=sec>note (what needs work / why)</div><input type=text id=note style="width:100%" value="'+(sel.note||'').replace(/"/g,'&quot;')+'" placeholder="optional — becomes the teaching example" oninput="sel.note=this.value">'
    +'<div class=acts>'
      +'<button class="A save" onclick="save(\\'save\\')">💾 Save (s)</button>'
      +'<button class=A onclick="save(\\'confirm\\')">✓ Confirm as-is (c)</button>'
      +'<button class="A flag" onclick="save(\\'needs-work\\')">✎ Needs work</button>'
      +'<button class="A no" onclick="save(\\'not-real\\')">✕ Not a real relationship</button>'
      +'<button class="A skip" onclick="next()">skip →</button></div>';
  renderSide($('q').value);
}
function tg(c){sel.proj.has(c)?sel.proj.delete(c):sel.proj.add(c);render();}
function lane(l){sel.lane=l;if(l==='community')sel.tier=null;render();}
function tier(t){sel.tier=sel.tier===t?null:t;render();}
function circ(){sel.circle=!sel.circle;render();}
function fam(){sel.fam=!sel.fam;render();}
function fri(){sel.fri=!sel.fri;render();}
function rl(r){sel.roles.has(r)?sel.roles.delete(r):sel.roles.add(r);render();}
function enLive(el){sel.energy=+el.value;sel.energyTouched=true;document.getElementById('ev').textContent=el.value;}
function useHint(){sel.org=cur().orgHint;render();}
function next(){let n=i;for(let k=1;k<=D.queue.length;k++){const j=(i+k)%D.queue.length;if(!D.decisions[D.queue[j].key]){n=j;break;}}i=n;reset(cur());render();}
async function save(verdict){
  const p=cur();const d=verdict==='save'?diff(p):{adds:[],rems:[]};
  const body={name:p.name,email:p.email,verdict,adds:d.adds,removes:d.rems,note:sel.note||'',
    lane:sel.lane,projects:[...sel.proj],warmth:Math.round(p.warmth),
    energy:(sel.lane!=='community'&&sel.energyTouched)?sel.energy:null,ts:new Date().toISOString()};
  await fetch('/decide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  D.decisions[p.key]=body;
  next();
}
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='s')save('save');if(e.key==='c')save('confirm');if(e.key==='ArrowRight')next();});
reset(cur());render();
</script></body></html>`;

createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/decide'){
    let b='';req.on('data',c=>b+=c);req.on('end',()=>{
      try{const d=JSON.parse(b);d.ts=d.ts||new Date().toISOString();d.applied=false;
        appendFileSync(LEDGER,JSON.stringify(d)+'\n');
        console.log(`  ${d.verdict.padEnd(10)} ${d.name}  +[${(d.adds||[]).join(' ')}] −[${(d.removes||[]).join(' ')}]${d.energy!=null?' · energy '+d.energy:''}${d.note?' · '+d.note:''}`);
        res.writeHead(200);res.end('ok');}catch(e){res.writeHead(400);res.end(e.message);}
    });return;
  }
  res.writeHead(200,{'content-type':'text/html'});res.end(HTML);
}).listen(PORT,()=>console.log(`The Field workbench → http://localhost:${PORT}`));
