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
dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const N = parseInt(args.find(a => a.startsWith('--n'))?.split(/[= ]/)[1] || (args.includes('--n') ? args[args.indexOf('--n') + 1] : '8'));
const ONE = args.includes('--name') ? args[args.indexOf('--name') + 1] : null;
const SYNTH = args.includes('--synth');
const RESUME = args.includes('--resume');   // skip pages already synthesised → resumable across nights
const TAVILY = process.env.TAVILY_API_KEY;

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

async function webRead(name, company){
  if(!TAVILY) return null;
  try{
    const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({api_key:TAVILY,query:`${name}${company?' '+company:''} — their work, role, what they care about`,max_results:4,search_depth:'basic',include_answer:true})});
    const d=await r.json();
    return {answer:d.answer||'',results:(d.results||[]).map(x=>({title:x.title,url:x.url,snippet:(x.content||'').slice(0,280)}))};
  }catch(e){return {answer:'',results:[],error:e.message};}
}
async function qwenSynth(prompt){
  try{
    const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({model:'qwen2.5:32b',prompt,stream:false,options:{num_predict:320}})});
    const d=await r.json();return (d.response||'').trim();
  }catch(e){return `(qwen synthesis unavailable: ${e.message})`;}
}

// ── pick the people: supporter lane, with soil, warmest first ───────────────
const soil=rd('thoughts/shared/orbit-soil.csv');
let people=soil.filter(p=>p.lane!=='community'&&(p.company||p.entities));
if(ONE) people=soil.filter(p=>p.name.toLowerCase().includes(ONE.toLowerCase()));
else { const seen=new Set(); people=people.filter(p=>{const k=slug(p.name);if(seen.has(k))return false;seen.add(k);return true;})
  .sort((a,b)=>(+b.warmth||0)-(+a.warmth||0)).slice(0,N); }

mkdirSync('thoughts/shared/people',{recursive:true});
console.log(`Building ${people.length} person page(s)${SYNTH?' WITH qwen synthesis (slow)':''}${TAVILY?' + web':' (no TAVILY key → soil only)'}…\n`);

for(const p of people){
  const path=`thoughts/shared/people/${slug(p.name)}.md`;
  if(RESUME&&SYNTH&&existsSync(path)){const cur=readFileSync(path,'utf8');if(!cur.includes('qwen draft pending')&&!cur.includes('synthesis unavailable')){console.log(`  ↩ skip ${p.name} (already synthesised)`);continue;}}
  const web=await webRead(p.name,p.company);
  let synthesis='_(overnight: qwen draft pending — run with `--synth`)_';
  if(SYNTH){
    const ctx=[`Name: ${p.name}`,p.position&&`Role: ${p.position}`,p.company&&`Org: ${p.company}`,p.sector&&`Sector: ${p.sector}`,
      p.entities&&`Connected orgs: ${p.entities}`,web?.answer&&`Web summary: ${web.answer}`,
      web?.results?.length&&`Sources:\n${web.results.map(r=>'- '+r.title+': '+r.snippet).join('\n')}`].filter(Boolean).join('\n');
    synthesis=await qwenSynth(`You are helping ACT (a relational organisation) UNDERSTAND a person so it can support and honour them — NOT pitch, sell, or corner them. From the context below, write 2 short paragraphs: who they are and the work they're doing in the world, and what they seem to care about. Generous, factual, no sales framing, no "opportunity"/"leverage" language. If the context is thin, say so plainly rather than inventing.\n\nCONTEXT:\n${ctx}\n\nUNDERSTANDING:`);
  }
  const md=`---
name: ${p.name}
lane: supporter
warmth: ${p.warmth}
updated: 2026-06-03
---

# ${p.name}
${p.position?`*${p.position}${p.company?', '+p.company:''}*`:p.company||''}  ${p.sector?`· ${p.sector}`:''}

## Soil — institutional ground (CivicGraph)
- **Org:** ${p.company||'—'}${p.position?` (${p.position})`:''}
- **Connected orgs:** ${p.entities||'—'}
- **Boards / roles:** ${p.boards||'—'}
- **Government influence:** ${p.gov_influence||'—'} · **Indigenous affiliation:** ${p.indigenous||'—'}
- _Warm paths: see \`orbit-interlocks.csv\` for who else in the orbit connects to these orgs._

## Web & work — public read${web?.error?` (search error: ${web.error})`:''}
${web?.answer?web.answer+'\n':''}${(web?.results||[]).map(r=>`- [${r.title}](${r.url}) — ${r.snippet}`).join('\n')||'_(no web key / no results)_'}

## Understanding — drafted
${synthesis}

## Reflection — what *we* understand (by hand)
> The richest layer. Written by us, generously — to understand, not to pitch.
- **What they're trying to do in the world:**
- **What they care about / what energises them:**
- **Our shared history & how we know them:**
- **What they might need from us (water / sun / nutrient):**
- **What we have to offer them:**
- **Energy: do we mostly give or receive here?**
`;
  writeFileSync(`thoughts/shared/people/${slug(p.name)}.md`,md);
  console.log(`  ✓ ${p.name} (warmth ${p.warmth})${web?.results?.length?` · ${web.results.length} web sources`:''}${SYNTH?' · synthesised':''}`);
}
console.log(`\n→ thoughts/shared/people/  (${people.length} pages)`);
console.log(SYNTH?'qwen synthesis done.':'Shape built (soil+web+stub). Run with --synth to add qwen drafts (slow → background/overnight).');
