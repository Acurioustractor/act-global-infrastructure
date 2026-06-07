#!/usr/bin/env node
/**
 * apply-field-decisions.mjs — gated applier for workbench verdicts (Tier-2, day-shift).
 *
 * Reads thoughts/shared/field-decisions.jsonl (latest verdict per person wins), and applies the
 * tag diffs to LIVE GHL the proven way: resolve by email at apply time (never pasted IDs), per-tag
 * add/remove across ALL the person's dupes, every change logged with undo. needs-work / not-real
 * verdicts are ledger-only (no GHL write). Marks ledger entries applied.
 *
 *   node scripts/apply-field-decisions.mjs prep    # show pending batch (read-only)
 *   node scripts/apply-field-decisions.mjs apply   # execute (run only on Ben's explicit go)
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
dotenv.config({ path: '.env.local' });

const LEDGER='thoughts/shared/field-decisions.jsonl';
const LOG='thoughts/shared/field-decisions-applied.md';
const mode=process.argv[2]||'prep';
if(!existsSync(LEDGER)){console.log('No decisions yet — run the workbench first.');process.exit(0);}
const lines=readFileSync(LEDGER,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const latest=new Map();           // latest verdict per person wins
for(const d of lines) latest.set((d.email||d.name).toLowerCase(), d);
const pending=[...latest.values()].filter(d=>!d.applied&&(d.adds?.length||d.removes?.length));
const ledgerOnly=[...latest.values()].filter(d=>!d.applied&&!d.adds?.length&&!d.removes?.length);

console.log(`${pending.length} people with pending GHL tag changes · ${ledgerOnly.length} ledger-only verdicts (confirm/needs-work/not-real)\n`);
for(const d of pending) console.log(`  ${d.name} <${d.email||'no email — will match by name'}>  +[${(d.adds||[]).join(' ')}] −[${(d.removes||[]).join(' ')}]`);
if(mode!=='apply'){console.log('\nDry run. Execute with:  node scripts/apply-field-decisions.mjs apply  (gated — Ben\'s explicit go)');process.exit(0);}

const { createGHLService } = await import('./lib/ghl-api-service.mjs');
const ghl=createGHLService();
const tagsOf=c=>(c.tags||[]).slice().sort();
appendFileSync(LOG,`\n## Field decisions applied — ${new Date().toISOString()} (${pending.length} people)\n`);
const appliedKeys=new Set();
for(const d of pending){
  const q=d.email||d.name;
  const matches=(await ghl.searchContacts(q)).filter(x=>d.email?(x.email||'').toLowerCase()===d.email:( `${x.firstName||''} ${x.lastName||''}`.trim().toLowerCase()===d.name.toLowerCase()));
  if(!matches.length){console.log(`  SKIP ${d.name} — no live GHL match`);appendFileSync(LOG,`- SKIP ${d.name}: no live match\n`);continue;}
  for(const c of matches){
    const before=tagsOf(c);
    const rm=(d.removes||[]).filter(t=>before.includes(t));
    const ad=(d.adds||[]).filter(t=>!before.includes(t));
    for(const t of rm)await ghl.removeTagFromContact(c.id,t);
    for(const t of ad)await ghl.addTagToContact(c.id,t);
    console.log(`  ✓ ${d.name} ${c.id}: +[${ad.join(' ')}] −[${rm.join(' ')}]`);
    appendFileSync(LOG,`- ${d.name} ${c.id}: added [${ad.join(' ')}], removed [${rm.join(' ')}] · UNDO: invert · before=[${before.join(' ')}]\n`);
  }
  appliedKeys.add((d.email||d.name).toLowerCase());
}
// mark applied in the ledger
writeFileSync(LEDGER,lines.map(d=>{const k=(d.email||d.name).toLowerCase();
  return JSON.stringify(appliedKeys.has(k)?{...d,applied:true}:d);}).join('\n')+'\n');
console.log(`\n✓ ${appliedKeys.size} people applied to live GHL · logged → ${LOG}`);
