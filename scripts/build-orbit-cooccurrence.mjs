#!/usr/bin/env node
/**
 * build-orbit-cooccurrence.mjs — who appears WITH whom in ACT's email corpus → warm-path edges.
 *
 * Mines the comms spine (communications_history, channel=email) for co-recipients: two external
 * people on the same email (to+cc+from, ACT internal excluded) = an edge. 6,006 of 13,634 emails
 * carry cc lists — that's the warm-path graph the orbit can't see from per-contact rows alone.
 *
 * Rules (same line as the vibe pass):
 *   - metadata only (headers) — never content;
 *   - SUPPORTER LANE ONLY — community-lane individuals are dropped from edges entirely (OCAP);
 *   - machine senders (noreply/notifications/mailers) dropped.
 *
 * Read-only. Run:  node scripts/build-orbit-cooccurrence.mjs
 * Out:  thoughts/shared/orbit-cooccurrence.csv  (a,b,emails_together,first,last,a_orbit,b_orbit)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};

// orbit roster: email → {name, community?} — community-lane individuals are excluded from edges
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
const byEmail=new Map();
for(const p of orbit){const e=(p.email||'').toLowerCase();if(!e)continue;
  const community=p.status==='community'||/lane:community/.test(p.rel_tags||'');
  const prev=byEmail.get(e);if(!prev||(!prev.name&&p.name))byEmail.set(e,{name:p.name||'',community:(prev?.community||community)});}

const INTERNAL=/@act\.place$|^ben@benjamink\.com\.au$/i;
const MACHINE=/noreply|no-reply|donotreply|notification|notifications@|mailer|@slack\.com$|@github\.com$|@google\.com$|@stripe\.com$|calendar-server|@docusign|@xero\.com$|@canva\.com$/i;
const ADDR=/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// page through the email rows (PostgREST 1000-row cap → .range pagination)
const edges=new Map(); let rows=0;
for(let from=0;;from+=1000){
  const {data,error}=await sb.from('communications_history')
    .select('occurred_at,metadata').eq('channel','email').not('metadata','is',null)
    .order('occurred_at',{ascending:true}).range(from,from+999);
  if(error){console.error(error.message);process.exit(1);}
  if(!data?.length)break;
  rows+=data.length;
  for(const r of data){
    const m=r.metadata||{};
    const found=`${m.to||''} ${m.cc||''} ${m.from||''}`.match(ADDR)||[];
    const ext=[...new Set(found.map(e=>e.toLowerCase()))]
      .filter(e=>!INTERNAL.test(e)&&!MACHINE.test(e))
      .filter(e=>!(byEmail.get(e)?.community));            // the community line: no edges mined
    if(ext.length<2||ext.length>12)continue;               // >12 = broadcast, not a relationship
    ext.sort();
    const d=(r.occurred_at||'').slice(0,10);
    for(let i=0;i<ext.length;i++)for(let j=i+1;j<ext.length;j++){
      const k=ext[i]+'|'+ext[j];
      const e=edges.get(k)||{n:0,first:d,last:d};
      e.n++;if(d&&d<e.first)e.first=d;if(d&&d>e.last)e.last=d;
      edges.set(k,e);
    }
  }
  if(data.length<1000)break;
}

const label=e=>byEmail.get(e)?.name||e;
const inOrbit=e=>byEmail.has(e)?'y':'';
const out=[...edges.entries()].map(([k,v])=>{const [a,b]=k.split('|');
  return {a:label(a),b:label(b),emails_together:v.n,first:v.first,last:v.last,a_orbit:inOrbit(a),b_orbit:inOrbit(b)};})
  .filter(r=>r.emails_together>=2)                          // singletons are noise
  .sort((x,y)=>y.emails_together-x.emails_together);

const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
const cols=['a','b','emails_together','first','last','a_orbit','b_orbit'];
writeFileSync('thoughts/shared/orbit-cooccurrence.csv',[cols.join(','),...out.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n')+'\n');

console.log(`Scanned ${rows} emails → ${edges.size} raw pairs → ${out.length} edges (≥2 emails together)`);
console.log('\nStrongest warm paths:');
for(const r of out.slice(0,15))console.log(`  ${String(r.emails_together).padStart(3)}× ${r.a} ↔ ${r.b}  (${r.first} → ${r.last})`);
console.log('\n→ thoughts/shared/orbit-cooccurrence.csv');
