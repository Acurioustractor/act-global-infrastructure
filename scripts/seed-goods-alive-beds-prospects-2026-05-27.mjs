/**
 * Seed the "ALIVE — Beds" sales prospects (from Ben's Notion list, 2026-05-27).
 * Buyer Pipeline = real commercial intent; Demand Register = tentative/unconfirmed.
 * Idempotent (skip if opp name exists), dry-run-first. Company shells (no contact yet → enrich).
 *   node --env-file=.env.local scripts/seed-goods-alive-beds-prospects-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/seed-goods-alive-beds-prospects-2026-05-27.mjs --apply
 */
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BASE = ['goods', 'act-gd', 'project:act-gd', 'goods-src-alive-beds'];

// pipeline: 'buyer' | 'demand'
const PROSPECTS = [
  { name: 'ALIVE', pipeline: 'buyer', stage: 'In Conversation', value: 60000, tags: ['goods-role-corp', 'goods-stage-prospect'], note: 'Up to $60,000 commitment (ALIVE — Beds list).' },
  { name: 'Hewitt Agriculture', pipeline: 'buyer', stage: 'In Conversation', value: 0, tags: ['goods-role-corp', 'goods-stage-prospect'], note: 'Commercial buyer — ~10 beds for their own (agricultural) properties. Unit price TBC → value 0 for now.' },
  { name: 'Ampilatwatja Health Centre Aboriginal Corporation', pipeline: 'buyer', stage: 'Outreach Queued', value: 0, tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled', 'goods-stage-prospect'], note: 'NT ACCHO (Ampilatwatja, Utopia region).' },
  // Garma = the Garma Festival (NE Arnhem Land) — a SHOWCASE/engagement opportunity, not a buyer.
  { name: 'Garma Festival — Beds Showcase', pipeline: 'demand', stage: 'Signal', value: 0, tags: ['goods-event', 'goods-showcase', 'goods-state-nt', 'goods-stage-prospect'], note: "Exposure/engagement opportunity — showcase beds at Garma Festival, Australia's biggest Indigenous festival. High-traffic lead-gen + relationship-building, not a purchase." },
  { name: 'Centre Canvas', pipeline: 'demand', stage: 'Signal', value: 0, tags: ['goods-stage-prospect'], note: 'Tentative (Ben flagged with "?").' },
];

async function main() {
  const ghl = createGHLService();
  const bp = await ghl.getPipelineByName('Buyer Pipeline');
  const dr = await ghl.getPipelineByName('Demand Register');
  if (!bp || !dr) { console.error('✗ pipeline not found'); process.exit(1); }
  const PL = { buyer: bp, demand: dr };
  const stageId = (pl, n) => { const s = pl.stages.find((x) => norm(x.name) === norm(n)); if (!s) throw new Error(`stage "${n}" missing`); return s.id; };
  const existing = {};
  for (const k of ['buyer', 'demand']) existing[k] = new Set((await ghl.getOpportunities(PL[k].id, { limit: 100 })).map((o) => norm(o.name)));
  console.log(`Buyer:${existing.buyer.size} Demand:${existing.demand.size} | Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const res = { created: [], skipped: [], errors: [] };
  for (const p of PROSPECTS) {
    const pl = PL[p.pipeline];
    if (existing[p.pipeline].has(norm(p.name))) { console.log(`= SKIP (exists)  ${p.name}`); res.skipped.push(p.name); continue; }
    const line = `${p.name.padEnd(50)} ${p.pipeline.toUpperCase().padEnd(7)} → ${p.stage}  $${p.value.toLocaleString()}  [${p.tags.join(',')}]`;
    if (!APPLY) { console.log(`+ WOULD CREATE  ${line}`); continue; }
    try {
      const c = await ghl.createContact({ firstName: p.name, companyName: p.name, tags: [...BASE, ...p.tags] });
      const cid = c.id || c.contact?.id;
      const opp = await ghl.createOpportunity({ pipelineId: pl.id, stageId: stageId(pl, p.stage), name: p.name, monetaryValue: p.value, status: 'open', contactId: cid });
      console.log(`+ CREATED  ${line}  (opp ${opp.id})`);
      res.created.push(p.name);
    } catch (e) { console.error(`✗ ERROR ${p.name}: ${e.message}`); res.errors.push(`${p.name}: ${e.message}`); }
  }
  console.log(`\nCreated:${res.created.length} skipped:${res.skipped.length} errors:${res.errors.length}`);
  if (res.errors.length) console.log(res.errors.join('\n'));
  if (!APPLY) console.log('\n(Dry-run. Notes per prospect are in the script; contacts are shells → enrich.)');
}
main().catch((e) => { console.error(e); process.exit(1); });
