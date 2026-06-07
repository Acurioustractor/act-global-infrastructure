#!/usr/bin/env node
/**
 * field-capture.mjs — The Field's live-capture loop: jot a fragment, it lands on the person's page.
 *
 *   node scripts/field-capture.mjs "saw Kristy Bloomfield at Witta market — keen to bring the girls"
 *   node scripts/field-capture.mjs --process     # re-attempt every still-raw capture
 *   node scripts/field-capture.mjs --list        # show raw (unfiled) captures
 *
 * Flow: every capture is appended to thoughts/shared/field-captures.jsonl (nothing is ever lost),
 * then filed as a dated bullet under `## Field notes` on thoughts/shared/people/<slug>.md.
 * Person resolution: deterministic name-match against existing person pages first; if ambiguous,
 * qwen (local ollama) picks from the candidates; if still unsure the capture stays raw — a human
 * files it later. Local-only: no GHL, no DB, no web. Page builders preserve the `## Field notes`
 * + `## Reflection` tail on every rebuild.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';

const LEDGER='thoughts/shared/field-captures.jsonl';
const PEOPLE='thoughts/shared/people';
const args=process.argv.slice(2);
const LIST=args.includes('--list'), PROCESS=args.includes('--process');
const TEXT=args.filter(a=>!a.startsWith('--')).join(' ').trim();

const readLedger=()=>existsSync(LEDGER)?readFileSync(LEDGER,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const writeLedger=es=>writeFileSync(LEDGER,es.map(e=>JSON.stringify(e)).join('\n')+'\n');

const slugs=readdirSync(PEOPLE).filter(f=>f.endsWith('.md')).map(f=>f.slice(0,-3));
const words=s=>s.toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/[\s-]+/).filter(w=>w.length>=3);

function resolve(text){
  const t=new Set(words(text));
  const scored=slugs.map(s=>{const w=words(s);const hit=w.filter(x=>t.has(x)).length;return {s,w:w.length,hit};})
    .filter(x=>x.hit>0);
  const full=scored.filter(x=>x.hit===x.w&&x.w>=2);            // every name word present
  if(full.length===1)return {slug:full[0].s};
  const cands=scored.sort((a,b)=>b.hit-a.hit||a.w-b.w).slice(0,8).map(x=>x.s);
  return {slug:null,cands};
}
async function qwenPick(text,cands){
  try{
    const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({model:'qwen2.5:32b',stream:false,options:{num_predict:24},
        prompt:`A field note mentions a person. Which of these page slugs is it about?\nNote: "${text}"\nSlugs:\n${cands.map(c=>'- '+c).join('\n')}\nAnswer with EXACTLY one slug from the list, or the word unsure.`})});
    const a=((await r.json()).response||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'');
    return cands.includes(a)?a:null;
  }catch{return null;}                                          // ollama down → stay raw
}
function file(slug,e){
  const path=`${PEOPLE}/${slug}.md`;
  let cur=readFileSync(path,'utf8');
  const bullet=`- **${new Date(e.ts).toLocaleDateString('en-CA')}** — ${e.text}`;   // local date, not UTC slice
  if(/## Field notes/.test(cur)) cur=cur.replace(/(## Field notes[^\n]*\n)/,`$1\n${bullet}\n`.replace(/\n\n$/,'\n'));
  else if(/## Reflection/.test(cur)) cur=cur.replace(/(## Reflection)/,`## Field notes — live captures\n\n${bullet}\n\n$1`);
  else cur=cur.trimEnd()+`\n\n## Field notes — live captures\n\n${bullet}\n`;
  writeFileSync(path,cur);
}

const ledger=readLedger();
if(LIST){
  const raw=ledger.filter(e=>e.status==='raw');
  for(const e of raw)console.log(`  · ${e.ts.slice(0,16)} "${e.text}"${e.cands?` — candidates: ${e.cands.join(', ')}`:''}`);
  console.log(raw.length?`${raw.length} raw capture(s) — file by re-running with the full name in the text, or edit the page by hand`:'no raw captures — the field is clear');
  process.exit(0);
}
if(TEXT)ledger.push({ts:new Date().toISOString(),text:TEXT,status:'raw'});
else if(!PROCESS){console.error('Usage: field-capture.mjs "note about a person" | --process | --list');process.exit(1);}

for(const e of ledger){
  if(e.status!=='raw')continue;
  const r=resolve(e.text);
  let slug=r.slug;
  if(!slug&&r.cands?.length){slug=await qwenPick(e.text,r.cands);if(!slug)e.cands=r.cands;}
  if(slug){file(slug,e);e.status='filed';e.person=slug;delete e.cands;console.log(`  ✓ filed → ${slug}.md`);}
  else console.log(`  ? unresolved — kept raw${r.cands?.length?` (candidates: ${r.cands.slice(0,4).join(', ')})`:''}`);
}
writeLedger(ledger);
const raw=ledger.filter(e=>e.status==='raw').length;
console.log(`ledger: ${ledger.length} capture(s), ${raw} raw → ${LEDGER}`);
