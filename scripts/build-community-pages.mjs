#!/usr/bin/env node
/**
 * build-community-pages.mjs — owes-shaped person pages for the COMMUNITY lane.
 *
 * The community counterpart to build-person-pages.mjs, and deliberately a SEPARATE script:
 * the structural separation IS the ethic. Community people (storytellers, elders) are never
 * web-profiled, energy-scored, or AI-synthesised from public sources (OCAP). Their page is
 * built from what they GAVE and what ACT OWES BACK — the owes-ledger — plus a by-hand
 * reflection. Nothing else. No Tavily, no qwen, no warmth, no email history.
 *
 * Inputs (read-only):
 *   thoughts/shared/el-contributor-constellation.csv   — the owes-ledger (transcripts = the gift)
 *   thoughts/shared/unified-orbit-worklist.csv         — role:/place: tags only (ACT-written, not derived)
 *
 *   node scripts/build-community-pages.mjs --name "Kristy Bloomfield"
 *   node scripts/build-community-pages.mjs --names kristy-bloomfield,shaun-fisher
 *   node scripts/build-community-pages.mjs --all          # every named storyteller with a gift recorded
 * Out: thoughts/shared/people/<slug>.md  (lane: community)
 *
 * Hand-written `## Reflection` sections survive every rebuild (same rule as supporter pages).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const argval = f => {
  const eq = args.find(a => a.startsWith(f + '=')); if (eq) return eq.slice(f.length + 1);
  const i = args.indexOf(f); const v = i >= 0 ? args[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : undefined;
};
const ONE = argval('--name') ?? null;
const NAMES = (argval('--names') || '').split(',').map(s => s.trim()).filter(Boolean);
const ALL = args.includes('--all');
if (!ONE && !NAMES.length && !ALL) { console.error('Usage: build-community-pages.mjs --name "X" | --names slug,slug | --all'); process.exit(1); }

function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const rd=p=>{const R=parseCSV(readFileSync(p,'utf8'));const h=R[0];return R.slice(1).filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}/.test(s)||/^[a-z]{2}\d{6}-0000/.test(s);

const con=rd('thoughts/shared/el-contributor-constellation.csv').filter(r=>r.name&&!isUuid(r.name));
let people=con;
if(ONE) people=con.filter(r=>r.name.toLowerCase().includes(ONE.toLowerCase()));
else if(NAMES.length) people=con.filter(r=>NAMES.includes(slug(r.name)));
if(!people.length){console.error('No matching named storytellers in the constellation.');process.exit(1);}

// role:/place: tags only — ACT-written markers (elder, storyteller, place), never warmth or comms
const orbit=rd('thoughts/shared/unified-orbit-worklist.csv');
const tagsByKey=new Map();
for(const p of orbit){const k=slug(p.name||'');if(!k)continue;
  const t=((p.rel_tags||'').match(/(role|place):[a-z-]+/g)||[]);
  if(t.length)tagsByKey.set(k,[...new Set([...(tagsByKey.get(k)||[]),...t])]);}

const REFLECTION_STUB=`## Reflection — relationship held by hand
> Written by us. This page exists to honour an obligation, not to profile a person.
- **Who holds this relationship:**
- **How we know each other / shared history:**
- **Cultural protocols & consent context to respect:**
- **What we have promised:**
- **What honouring the next transcript looks like:**
`;

mkdirSync('thoughts/shared/people',{recursive:true});
for(const p of people){
  const path=`thoughts/shared/people/${slug(p.name)}.md`;
  let reflection=REFLECTION_STUB;
  if(existsSync(path)){const m=readFileSync(path,'utf8').match(/## Reflection[^\n]*\n[\s\S]*$/);if(m&&/^- \*\*[^\n]*:\*\* *\S/m.test(m[0]))reflection=m[0].trimEnd()+'\n';}
  const tags=tagsByKey.get(slug(p.name))||[];
  const tx=+p.transcripts||0, live=+p.live||0, draft=+p.in_draft||0, raw=+p.raw_unactioned||0,
    consent=+p.consent_required||0, withdrawn=+p.withdrawn||0, owes=+p.owes_gap||0, pct=+p.honoured_pct||0;
  const md=`---
name: ${p.name}
lane: community
storyteller_id: ${p.storyteller_id||''}
updated: ${new Date().toLocaleDateString('en-CA')}
---

# ${p.name}
${tags.length?`*${tags.join(' · ')}*`:''}

> Community lane. Never energy-scored, laddered, dripped, or web-profiled (OCAP).
> This page is an accountability record: what they gave, and what ACT owes back.

## The gift — what they've shared (Empathy Ledger)
- **Transcripts given:** ${tx}
- **Brought to life (published story):** ${live}${draft?` · in draft: ${draft}`:''}
- **Raw / not yet actioned:** ${raw}
- **Withdrawn:** ${withdrawn}
- **Honoured:** ${pct}%

## What ACT owes back
- **${owes} transcript${owes===1?'':'s'} not yet brought to life** — the love is sitting raw.
${consent?`- **${consent} consent conversation${consent===1?'':'s'} owed** before anything moves.\n`:''}- Outward use of ANY of this → \`consent-check\` first. The owes-ledger is the source: \`el-contributor-constellation.csv\`.

${reflection}`;
  writeFileSync(path,md);
  console.log(`  ✓ ${p.name} — ${tx} given · ${live} live · ${owes} owed${consent?` · ${consent} consent`:''}`);
}
console.log(`\n→ ${people.length} community page(s) in thoughts/shared/people/ (owes-shaped, no web)`);
