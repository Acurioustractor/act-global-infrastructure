#!/usr/bin/env node
/**
 * ghl-smartlist-live-gapcheck.mjs — READ-ONLY. Compute every Smart-List count LIVE from
 * GoHighLevel via POST /contacts/search (filters DSL), apply the consent gate client-side
 * from each live contact's customFields, and diff against the mirror targets. No writes.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { createGHLService } = await import('./lib/ghl-api-service.mjs');

const CONSENT_ID = 'aVnqmajnysMtGYhLD0oA';
const SOURCE_ID  = 'HdnMUyXkZRPZG7l7cygG';
const STREAMS = [
  { key:'ACT',        tag:'comms:act-newsletter',        mirror:55 },
  { key:'Goods',      tag:'comms:goods-newsletter',      mirror:46 },
  { key:'Harvest',    tag:'comms:harvest-newsletter',    mirror:62 },
  { key:'JusticeHub', tag:'comms:justicehub-newsletter', mirror:0  },
];
const ghl = createGHLService();

function cf(c){ const r=c.customFields||c.customField||[]; return (Array.isArray(r)?r:Object.values(r)).map(f=>({id:f.id,value:f.value??f.fieldValue})); }
const tagsOf = c => (c.tags||[]).map(t=>String(t).toLowerCase());
const consentYes = c => cf(c).some(f=>f.id===CONSENT_ID && String(f.value)==='Yes');
const sourceOk  = c => cf(c).some(f=>f.id===SOURCE_ID && f.value!=null && String(f.value).trim()!=='');
const isCommunity = c => tagsOf(c).includes('lane:community');

async function searchPage(tag, searchAfter){
  const body = { locationId: ghl.locationId, pageLimit:100, filters:[{ field:'tags', operator:'contains', value:tag }] };
  if (searchAfter) body.searchAfter = searchAfter;
  return ghl.request('/contacts/search', { method:'POST', body: JSON.stringify(body) });
}
async function allByTag(tag){
  const first = await searchPage(tag, null);
  const total = first.total ?? (first.contacts||[]).length;
  let all = [...(first.contacts||[])];
  let cursor = all.length ? all[all.length-1].searchAfter : null;
  let guard = 0;
  while (all.length < total && cursor && guard++ < 60){
    const r = await searchPage(tag, cursor);
    const cs = r.contacts || [];
    if (!cs.length) break;
    all.push(...cs);
    cursor = cs[cs.length-1].searchAfter;
  }
  return { all, total };
}

// shape guard — make sure live search returns customFields (else gate would undercount)
const probe = await allByTag(STREAMS[0].tag);
const cfSeen = probe.all.some(c => cf(c).length>0);
console.log(`shape guard: ${STREAMS[0].tag} pulled ${probe.all.length}/${probe.total}; customFields present on a contact = ${cfSeen}`);
if (!cfSeen) { console.log('⚠ live search did not return customFields — gate counts would be wrong; aborting count.'); process.exit(1); }

const rows = [];
const cache = { [STREAMS[0].tag]: probe };
for (const s of STREAMS){
  const { all, total } = cache[s.tag] || await allByTag(s.tag);
  let yes=0, src=0, sendable=0, communityInStream=0;
  for (const c of all){
    const cy=consentYes(c), so=sourceOk(c), com=isCommunity(c);
    if (cy) yes++;
    if (cy&&so) src++;
    if (cy&&so&&!com) sendable++;
    if (com) communityInStream++;
  }
  rows.push({ key:s.key, holders:all.length, yes, src, sendable, communityInStream, mirror:s.mirror });
}

const community = await allByTag('lane:community');
const funders = await searchPage('role:funder', null);

console.log('\n── LIVE GHL vs MIRROR ──');
console.log('list        holders  +consent  +source  SENDABLE  mirror  match   commInStream');
for (const r of rows){
  const m = Math.abs(r.sendable - r.mirror) <= 2 ? 'OK' : '*** DIFF';
  console.log(r.key.padEnd(11), String(r.holders).padStart(6), String(r.yes).padStart(9),
    String(r.src).padStart(8), String(r.sendable).padStart(8), String(r.mirror).padStart(7),
    '  '+m.padEnd(7), String(r.communityInStream).padStart(6));
}
console.log(`\nCommunity-line (lane:community) LIVE = ${community.total}  (mirror 74)`);
console.log(`Funders (role:funder) LIVE total     = ${funders.total}  (mirror 97)`);
