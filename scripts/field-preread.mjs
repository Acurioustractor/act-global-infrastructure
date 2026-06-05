#!/usr/bin/env node
/**
 * field-preread.mjs — machine pre-reads for the circle session: recognition beats recall.
 *
 * For every signal-bearing person Ben has NOT yet hand-read, bundle everything the system
 * knows (signals, soil, co-occurrence partners, recent email subjects from the local spine)
 * and have LOCAL qwen draft a ring (5/15/50/150/out) + one-line reasoning. Ben then reviews
 * as yes/no/adjust instead of recalling from scratch.
 *
 * LOCAL ONLY — qwen via ollama. Relationship data never leaves the machine (the ethic
 * governs the method). Community lane excluded entirely.
 *
 *   node scripts/field-preread.mjs --n 30
 * Out: thoughts/shared/field-prereads.jsonl (+ console table)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const N = parseInt((process.argv.find(a => a.startsWith('--n=')) || '').slice(4) || process.argv[process.argv.indexOf('--n') + 1] || '30', 10) || 30;

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const handle=n=>/@/.test(n)||/^\+?\d[\d \-()]{6,}$/.test((n||'').trim());
const internal=n=>/^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor)$/i.test((n||'').trim());

// dealt = anyone already in the decisions ledger
const dealt=new Set();
if(existsSync('thoughts/shared/field-decisions.jsonl'))
  for(const l of readFileSync('thoughts/shared/field-decisions.jsonl','utf8').split('\n').filter(Boolean)){try{dealt.add(norm(JSON.parse(l).name));}catch{}}

const soil=new Map();for(const s of rd('thoughts/shared/orbit-soil.csv'))if(!soil.has(norm(s.name)))soil.set(norm(s.name),s);
const cooc=rd('thoughts/shared/orbit-cooccurrence.csv');

const sup=new Map();
for(const p of rd('thoughts/shared/unified-orbit-worklist.csv')){
  if(p.status==='ghost'||p.status==='community')continue;
  if(handle(p.name||'')||internal(p.name||''))continue;
  const bs=Number(p.beeper_score)||0;const[gi,go]=(p.gmail_in_out||'').split('/').map(Number);
  const w=bs+((gi&&go)?Math.min(gi,go)*2:0);const k=norm(p.name);if(!k||dealt.has(k))continue;
  const prev=sup.get(k);if(prev&&prev.w>=w)continue;
  sup.set(k,{name:p.name,email:(p.email||'').toLowerCase(),w,bp:p.beeper_pattern||'',g:p.gmail_in_out||'',last:p.last_contact||'',tags:p.rel_tags||''});
}
const queue=[...sup.values()].sort((a,b)=>b.w-a.w).slice(0,N);
console.log(`Pre-reading ${queue.length} undealt signal-bearing people (local qwen)…\n`);

async function qwen(prompt){
  const r=await fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({model:'qwen2.5:32b',prompt,stream:false,options:{num_predict:120}})});
  return ((await r.json()).response||'').trim();
}
async function subjects(email){
  if(!email)return [];
  const {data}=await sb.from('communications_history').select('occurred_at,subject').eq('contact_email',email).order('occurred_at',{ascending:false}).limit(8);
  return (data||[]).map(r=>(r.occurred_at||'').slice(0,10)+' '+(r.subject||'').slice(0,70));
}

const out=[];
for(const p of queue){
  const s=soil.get(norm(p.name));
  const edges=cooc.filter(r=>norm(r.a)===norm(p.name)||norm(r.b)===norm(p.name)).sort((a,b)=>+b.emails_together-+a.emails_together).slice(0,4).map(r=>norm(r.a)===norm(p.name)?r.b:r.a);
  const subj=await subjects(p.email);
  const ctx=[`Name: ${p.name}`,s?.company&&`Org: ${s.company}${s.position?' ('+s.position+')':''}`,
    `Signals: beeper=${p.bp||'none'} · gmail in/out=${p.g||'none'} · last contact=${p.last||'unknown'} · tags=${p.tags||'none'}`,
    edges.length&&`Appears on emails with: ${edges.join(', ')}`,
    subj.length&&`Recent email subjects:\n${subj.map(x=>'- '+x).join('\n')}`].filter(Boolean).join('\n');
  const ans=await qwen(`You are pre-reading a relationship for Ben (founder of A Curious Tractor, a regenerative-impact org in Australia) so he can confirm or correct your guess. From the signals, guess where this person sits in Ben's relationship circles.\n\n${ctx}\n\nAnswer in EXACTLY this format (no extra text):\nRING: 5|15|50|150|out\nGUESS: <one line — who they likely are to Ben and why>\nCONFIDENCE: low|medium|high`);
  const ring=(ans.match(/RING:\s*(\S+)/)||[])[1]||'?';
  const guess=(ans.match(/GUESS:\s*(.+)/)||[])[1]||ans.slice(0,100);
  const conf=(ans.match(/CONFIDENCE:\s*(\w+)/)||[])[1]||'?';
  out.push({ts:new Date().toISOString(),name:p.name,machine_w:Math.round(p.w),ring_guess:ring,guess,confidence:conf,org:s?.company||'',status:'unreviewed'});
  console.log(`  ${p.name} → ring ${ring} (${conf}) — ${guess.slice(0,90)}`);
}
writeFileSync('thoughts/shared/field-prereads.jsonl',out.map(e=>JSON.stringify(e)).join('\n')+'\n');
console.log(`\n→ thoughts/shared/field-prereads.jsonl (${out.length} pre-reads, status=unreviewed)`);
console.log('Review: confirm/correct in a circle session — confirmed reads move to field-decisions.jsonl.');
