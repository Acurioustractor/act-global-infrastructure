#!/usr/bin/env node
/**
 * build-person-pages.mjs — assemble a living "person page" per orbit human for The Field.
 *
 * NOT a sales record. A page that reads like what a good friend holds in their head: who they
 * are, the work they're doing in the world, what they seem to care about — assembled to UNDERSTAND
 * and TEND, never to pitch or corner. Four layers:
 *   1. SOIL      — CivicGraph (orgs/boards/interlocks) from thoughts/shared/orbit-soil.csv  [auto]
 *   2. WEB & WORK— a public-web read (Tavily) of their work + writing                        [auto]
 *   3. SYNTHESIS — qwen drafts a respectful understanding (slow → run with --synth, overnight) [local]
 *   4. REFLECTION— the human texture, added by hand (we write this)                          [stub]
 *
 * Community lane is EXCLUDED — storytellers/elders are honoured via the owes-ledger, never web-profiled.
 * Read-only except writing local markdown. Stays local (qwen); the ethic governs the method.
 *
 *   node scripts/build-person-pages.mjs --n 8            # top 8 warm supporters: soil + web + stub
 *   node scripts/build-person-pages.mjs --n 8 --synth    # + qwen synthesis (slow; background/overnight)
 *   node scripts/build-person-pages.mjs --name "Scott McDougall" --synth
 * Out: thoughts/shared/people/<slug>.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
// exact-flag parse: supports `--flag value` and `--flag=value`; `--n` no longer swallows `--name`
const argval = f => {
  const eq = args.find(a => a.startsWith(f + '=')); if (eq) return eq.slice(f.length + 1);
  const i = args.indexOf(f); const v = i >= 0 ? args[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : undefined;
};
const nRaw = argval('--n');
const N = nRaw === undefined ? 8 : parseInt(nRaw, 10);
if (!Number.isFinite(N) || N < 1) { console.error(`--n needs a positive number, got "${nRaw}" — refusing to silently build 0 pages.`); process.exit(1); }
const ONE = argval('--name') ?? null;
if (!ONE && args.some(a => a === '--name' || a.startsWith('--name='))) { console.error('--name needs a value.'); process.exit(1); }
const SYNTH = args.includes('--synth');
const RESUME = args.includes('--resume');   // skip pages already synthesised → resumable across nights
const TAVILY = process.env.TAVILY_API_KEY;

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();

// ── Ben's circle reads (field-decisions.jsonl) — the HIGHEST-trust layer ────
// His own words beat soil, web, and qwen. Latest read per person wins. Found 2026-06-06:
// sam davies' page synthesised FOUR wrong Sam Davieses off anchorless web search while the
// ledger said "core partner — makes our beds, $121K critical path". Never again unread.
const ledger=new Map();
if(existsSync('thoughts/shared/field-decisions.jsonl'))
  for(const l of readFileSync('thoughts/shared/field-decisions.jsonl','utf8').split('\n').filter(Boolean)){
    try{const d=JSON.parse(l);if(d.name&&(d.relation||d.ring||d.energy!=null))ledger.set(norm(d.name),d);}catch{}
  }

async function webRead(name, company){
  if(!TAVILY) return null;
  try{
    const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({api_key:TAVILY,query:`${name}${company?' '+company:''} — their work, role, what they care about`,max_results:4,search_depth:'basic',include_answer:true})});
    const d=await r.json();
    return {answer:d.answer||'',results:(d.results||[]).map(x=>({title:x.title,url:x.url,snippet:(x.content||'').slice(0,280)}))};
  }catch(e){return {answer:'',results:[],error:e.message};}
}
// ── shared history from the comms spine (join key = ghl_contact_id, NOT email) ──
const ghlIds=new Map();
{let from=0;for(;;){const{data}=await sb.from('ghl_contacts').select('ghl_id,email').range(from,from+999);if(!data?.length)break;
  for(const c of data){const e=(c.email||'').toLowerCase();if(e){if(!ghlIds.has(e))ghlIds.set(e,[]);ghlIds.get(e).push(c.ghl_id);}}
  if(data.length<1000)break;from+=1000;}}
async function sharedHistory(email){
  const ids=ghlIds.get((email||'').toLowerCase())||[]; if(!ids.length)return null;
  const{data,count}=await sb.from('communications_history').select('occurred_at,direction,channel,subject',{count:'exact'}).in('ghl_contact_id',ids).order('occurred_at',{ascending:false}).limit(30);
  if(!data?.length)return null;
  const{data:f}=await sb.from('communications_history').select('occurred_at').in('ghl_contact_id',ids).order('occurred_at',{ascending:true}).limit(1);
  return {count,first:(f?.[0]?.occurred_at||'').slice(0,10),last:(data[0].occurred_at||'').slice(0,10),
    recent:data.map(r=>({d:(r.occurred_at||'').slice(0,10),dir:r.direction,s:(r.subject||'').replace(/\s+/g,' ').slice(0,90)}))};
}
async function qwenSynth(prompt){
  try{
    const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({model:'qwen2.5:32b',prompt,stream:false,options:{num_predict:320}})});
    const d=await r.json();return (d.response||'').trim();
  }catch(e){return `(qwen synthesis unavailable: ${e.message})`;}
}

// ── pick the people: supporter lane, warmest first (soil optional — a warm person
//    CivicGraph couldn't resolve still gets a page; their soil rows just show '—') ──
const soil=rd('thoughts/shared/orbit-soil.csv');
const isInternalP=p=>/^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test((p.name||'').trim());
// the community line holds PER PERSON, not per row — one community-lane row anywhere marks the
// person community, even if a duplicate row carries another lane (Kristy Bloomfield had 4
// community rows + 1 'ghost' row; the ghost row leaked her into the committed pages).
const communityKeys=new Set(soil.filter(p=>p.lane==='community').map(p=>slug(p.name)));
const isCommunityP=p=>p.lane==='community'||communityKeys.has(slug(p.name||''));
let people=soil.filter(p=>!isCommunityP(p)&&!isInternalP(p));
if(ONE){ people=soil.filter(p=>p.name.toLowerCase().includes(ONE.toLowerCase()));
  // the community line holds on EVERY path — storytellers/elders are never web-profiled (OCAP)
  const blocked=people.filter(isCommunityP);
  if(blocked.length)console.log(`✋ ${[...new Set(blocked.map(p=>p.name))].join(', ')} — community lane, never web-profiled (OCAP). Honour via the owes-ledger.`);
  people=people.filter(p=>!isCommunityP(p));
  if(!people.length&&!blocked.length){ // not in soil — fall back to the orbit worklist (page still gets web + history)
    const o=rd('thoughts/shared/unified-orbit-worklist.csv').find(p=>(p.name||'').toLowerCase().includes(ONE.toLowerCase())&&p.email);
    if(o&&(o.status==='community'||communityKeys.has(slug(o.name||'')))){console.log(`✋ ${o.name} — community lane, never web-profiled (OCAP). Honour via the owes-ledger.`);}
    else if(o){const bs=Number(o.beeper_score)||0;const[gi,go]=(o.gmail_in_out||'').split('/').map(Number);
      people=[{name:o.name,email:(o.email||'').toLowerCase(),lane:'supporter',warmth:String(bs+((gi&&go)?Math.min(gi,go)*2:0)),company:'',position:'',sector:'',gov_influence:'',indigenous:'',entities:'',n_entities:'0',boards:''}];}
  }
}
else { const seen=new Set(); people=people.filter(p=>{const k=slug(p.name);if(seen.has(k))return false;seen.add(k);return true;})
  .sort((a,b)=>(+b.warmth||0)-(+a.warmth||0)).slice(0,N); }

mkdirSync('thoughts/shared/people',{recursive:true});
console.log(`Building ${people.length} person page(s)${SYNTH?' WITH qwen synthesis (slow)':''}${TAVILY?' + web':' (no TAVILY key → soil only)'}…\n`);

const REFLECTION_STUB=`## Reflection — what *we* understand (by hand)
> The richest layer. Written by us, generously — to understand, not to pitch.
- **What they're trying to do in the world:**
- **What they care about / what energises them:**
- **Our shared history & how we know them:**
- **What they might need from us (water / sun / nutrient):**
- **What we have to offer them:**
- **Energy: do we mostly give or receive here?**
`;

for(const p of people){
  const path=`thoughts/shared/people/${slug(p.name)}.md`;
  if(RESUME&&SYNTH&&existsSync(path)){const cur=readFileSync(path,'utf8');if(!cur.includes('qwen draft pending')&&!cur.includes('synthesis unavailable')&&cur.includes('## Shared history')){console.log(`  ↩ skip ${p.name} (already synthesised + history)`);continue;}}
  // the human tail — Field notes (live captures) + by-hand Reflection — survives EVERY rebuild
  let reflection=REFLECTION_STUB;
  if(existsSync(path)){const m=readFileSync(path,'utf8').match(/## Field notes[\s\S]*$|## Reflection[\s\S]*$/);if(m)reflection=m[0].trimEnd()+'\n';}
  const read=ledger.get(norm(p.name));                 // Ben's circle read, if he has one
  const anchorOrg=p.company||read?.org||'';            // org anchor for web disambiguation
  const web=await webRead(p.name,anchorOrg);
  const hist=await sharedHistory(p.email);
  // common name + no org anchor → web identity is a guess, say so on the page
  const webUnanchored=!anchorOrg&&(web?.results?.length||0)>0;
  let synthesis='_(overnight: qwen draft pending — run with `--synth`)_';
  if(SYNTH){
    const ctx=[read&&`BEN'S OWN READ (ground truth — trust this over EVERYTHING else): "${read.relation||''}"${read.ring?` · ring ${read.ring}`:''}${read.org?` · org: ${read.org}`:''}${read.tend_intent?` · intent: ${read.tend_intent}`:''}`,
      `Name: ${p.name}`,p.position&&`Role: ${p.position}`,p.company&&`Org: ${p.company}`,p.sector&&`Sector: ${p.sector}`,
      p.entities&&`Connected orgs: ${p.entities}`,web?.answer&&`Web summary: ${web.answer}`,
      web?.results?.length&&`Sources${webUnanchored?' (UNANCHORED name search — may be a different person entirely)':''}:\n${web.results.map(r=>'- '+r.title+': '+r.snippet).join('\n')}`,
      hist&&`Our email record: ${hist.count} emails, ${hist.first} → ${hist.last}. Recent subjects:\n${hist.recent.slice(0,15).map(r=>'- '+r.d+' '+(r.dir==='inbound'?'from them':'from us')+': '+r.s).join('\n')}`].filter(Boolean).join('\n');
    synthesis=await qwenSynth(`You are helping ACT (a relational organisation) UNDERSTAND a person so it can support and honour them — NOT pitch, sell, or corner them. From the context below, write 2 short paragraphs: who they are and the work they're doing in the world, and what they seem to care about.${hist?' Then a third short paragraph: the arc of OUR shared work with them, drawn only from the email subjects provided (what we have actually been doing together, in plain terms).':''} Generous, factual, no sales framing, no "opportunity"/"leverage" language. If the context is thin, say so plainly rather than inventing. IDENTITY RULE: if any web source describes a person inconsistent with Ben's own read or with our email record (different org, different country, different line of work), it is a DIFFERENT person who shares the name — ignore those sources completely and say the public-web identity is unverified.\n\nCONTEXT:\n${ctx}\n\nUNDERSTANDING:`);
  }
  const md=`---
name: ${p.name}
lane: supporter
warmth: ${p.warmth}${read?.energy!=null?`
energy: ${read.energy}`:''}${read?.ring?`
ring: ${read.ring}`:''}
updated: ${new Date().toLocaleDateString('en-CA')}
---

# ${p.name}
${p.position?`*${p.position}${p.company?', '+p.company:''}*`:p.company||read?.org||''}  ${p.sector?`· ${p.sector}`:''}
${read?`
## Ben's read — ground truth (circle session ${read.ts||''})
> **"${read.relation||'—'}"**${read.ring?` · ring **${read.ring}**`:''}${read.energy!=null?` · energy **${read.energy}**`:''}${read.give_receive?` · ${read.give_receive}`:''}${read.cadence?` · cadence: ${read.cadence}`:''}
${read.tend_intent?`> Intent: ${read.tend_intent}`:''}${read.algo_note?`
> _Machine note: ${read.algo_note}_`:''}
`:''}
## Soil — institutional ground (CivicGraph)
- **Org:** ${p.company||'—'}${p.position?` (${p.position})`:''}
- **Connected orgs:** ${p.entities||'—'}
- **Boards / roles:** ${p.boards||'—'}
- **Government influence:** ${p.gov_influence||'—'} · **Indigenous affiliation:** ${p.indigenous||'—'}
- _Warm paths: see \`orbit-interlocks.csv\` for who else in the orbit connects to these orgs._

## Web & work — public read${web?.error?` (search error: ${web.error})`:''}${webUnanchored?' — ⚠ UNANCHORED (common-name search, no org — may be a different person)':''}
${web?.answer?web.answer+'\n':''}${(web?.results||[]).map(r=>`- [${r.title}](${r.url}) — ${r.snippet}`).join('\n')||'_(no web key / no results)_'}

## Shared history — from the spine
${hist?`**${hist.count} emails** · first ${hist.first} · last ${hist.last}

${hist.recent.slice(0,10).map(r=>`- ${r.d} ${r.dir==='inbound'?'←':'→'} ${r.s}`).join('\n')}`:'_(no linked email record)_'}

## Understanding — drafted
${synthesis}

${reflection}`;
  writeFileSync(path,md);
  console.log(`  ✓ ${p.name} (warmth ${p.warmth})${web?.results?.length?` · ${web.results.length} web sources`:''}${SYNTH?' · synthesised':''}`);
}
console.log(`\n→ thoughts/shared/people/  (${people.length} pages)`);
console.log(SYNTH?'qwen synthesis done.':'Shape built (soil+web+stub). Run with --synth to add qwen drafts (slow → background/overnight).');
