#!/usr/bin/env node
/**
 * build-contained-consent-worklist-2026-06-09.mjs  — READ ONLY (no writes)
 *
 * Consent-resolution worklist for the 269-row CONTAINED import. KEY TRUTH (verified live 2026-06-09):
 * `Newsletter Consent = Yes` ALONE is NOT real consent — a cohort of prospects (orgs/funders, all
 * dateAdded 2026-01-08) carry Yes with NO `Consent Source` + NO `Consent Timestamp` = PHANTOM consent
 * (bulk-set, never opted-in). REAL consent = Yes + a Consent Source + a Consent Timestamp.
 *
 * Method: mirror (paginated) gives dupe/identity; for each mirror-consented contact we GET live GHL to
 * read Consent Source + Timestamp and classify consent_quality REAL | PHANTOM. Not-consented -> NONE.
 *
 * Action:
 *   PHANTOM  -> REVOKE_PHANTOM (Spam-Act protective: never opted in)
 *   REAL     -> KEEP
 *   NONE + genuine-signup source -> CAPTURE_GAP (verify form)
 *   NONE + prospect              -> LEAVE (gate blocks; re-opt-in only if wanted)
 *   NONE + ambiguous/unknown     -> FORM_CHECK
 *   dupe email -> append +MERGE xN
 */
import 'dotenv/config';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const CSV='/Users/benknight/Code/JusticeHub/output/ghl-contained-adelaide-audit/contained-ghl-import.csv';
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ghl=createGHLService();
function parse(t){const rows=[];let f=[],cur='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else{if(c==='"')q=true;else if(c===','){f.push(cur);cur=''}else if(c==='\n'){f.push(cur);rows.push(f);f=[];cur=''}else if(c==='\r'){}else cur+=c}}if(cur||f.length){f.push(cur);rows.push(f)}return rows}
const SRC={'Newsletter Signup (footer)':'GENUINE','gathering-footer':'GENUINE','Harvest | Member Signup':'GENUINE','Harvest member list':'AMBIGUOUS','Website Inquiry':'AMBIGUOUS','Container Request CSV':'AMBIGUOUS','ACT Intelligence':'PROSPECT','ACT Agent':'PROSPECT','Calendar Import':'PROSPECT','':'UNKNOWN'};

const rows=parse(fs.readFileSync(CSV,'utf8')); const H=rows[0],ix=(n)=>H.indexOf(n);
const cE=ix('Email'),cN=ix('Full Name'),cS=ix('Source'),cStr=ix('Newsletter Streams');
const imp=rows.slice(1).filter(r=>r[cE]).map(r=>({email:(r[cE]||'').trim().toLowerCase(),name:r[cN],source:(r[cS]||'').trim(),streams:r[cStr]}));

let all=[],from=0; for(;;){const{data}=await sb.from('ghl_contacts').select('ghl_id,email,newsletter_consent,tags,source').range(from,from+999); all=all.concat(data||[]); if(!data||data.length<1000)break; from+=1000;}
const gone=(r)=>(r.tags||[]).some(t=>String(t).startsWith('gone-from-ghl'));
const byE=new Map(); for(const r of all){const e=(r.email||'').toLowerCase(); if(!e||gone(r))continue; if(!byE.has(e))byE.set(e,[]); byE.get(e).push(r);}

const cfs=await ghl.getCustomFields(); const id2n=new Map(cfs.map(f=>[f.id,f.name]));
const cf=(live,re)=>{const f=(live.customFields||[]).find(x=>re.test(id2n.get(x.id)||'')); return f?String(f.value):'';};
const out=[]; let i=0;
for(const c of imp){ i++;
  const m=byE.get(c.email)||[]; const live=m.filter(r=>!gone(r)); const dupe=live.length;
  const conRow=live.find(r=>r.newsletter_consent===true);
  let quality='NONE', csrc='', cts='';
  if(conRow){ try{ const lc=await ghl.getContactById(conRow.ghl_id); await new Promise(x=>setTimeout(x,1100));
      csrc=cf(lc,/consent source/i); cts=cf(lc,/consent timestamp/i);
      quality=(csrc||cts)?'REAL':'PHANTOM';
    }catch(e){ quality='ERR'; } }
  const bucket=SRC[c.source]||'UNKNOWN';
  let action;
  if(quality==='PHANTOM') action='REVOKE_PHANTOM';
  else if(quality==='REAL') action='KEEP';
  else if(dupe===0) action='NOT_IN_GHL';
  else if(bucket==='GENUINE') action='CAPTURE_GAP';
  else if(bucket==='PROSPECT') action='LEAVE';
  else action='FORM_CHECK';
  if(dupe>1 && action!=='NOT_IN_GHL') action+=` +MERGE x${dupe}`;
  out.push({...c,bucket,quality,consent_source:csrc,consent_ts:cts,dupe_count:dupe,action,ghl_ids:live.map(r=>r.ghl_id).join('|')});
  if(i%40===0) console.error(`  …${i}/${imp.length}`);
}
const esc=(s)=>`"${String(s??'').replace(/"/g,'""')}"`;
const csvOut='thoughts/shared/reviews/2026-06-09_contained-consent-resolution-worklist.csv';
fs.writeFileSync(csvOut,['email,name,source,bucket,consent_quality,consent_source,consent_timestamp,dupe_count,recommended_action,newsletter_streams,ghl_ids',
  ...out.map(o=>[o.email,o.name,o.source,o.bucket,o.quality,o.consent_source,o.consent_ts,o.dupe_count,o.action,o.streams,o.ghl_ids].map(esc).join(','))].join('\n'));
const tal=(k)=>{const m={};for(const o of out){const v=o[k]||'(blank)';m[v]=(m[v]||0)+1;}return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
console.log('\n=== CONSENT QUALITY ==='); tal('quality').forEach(([k,v])=>console.log(`  ${k.padEnd(10)} ${v}`));
console.log('\n=== ACTION (base) ===');
['REVOKE_PHANTOM','KEEP','CAPTURE_GAP','LEAVE','FORM_CHECK','NOT_IN_GHL'].forEach(a=>console.log(`  ${a.padEnd(16)} ${out.filter(o=>o.action.startsWith(a)).length}`));
console.log(`  needs MERGE: ${out.filter(o=>o.action.includes('MERGE')).length}`);
console.log(`\nPHANTOM by bucket:`); tal('bucket').forEach(([b])=>{const n=out.filter(o=>o.bucket===b&&o.quality==='PHANTOM').length; if(n)console.log(`  ${b.padEnd(12)} ${n}`);});
console.log(`\nworklist -> ${csvOut} (${out.length} rows)`);
