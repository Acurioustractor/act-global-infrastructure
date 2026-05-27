/**
 * Push the 9 anchor councils/ACCHOs (backfilled into GrantScope's goods_procurement_entities
 * by grantscope/scripts/backfill-goods-anchor-councils-acchos-2026-05-27.mjs) into the GHL
 * Goods — Demand Register as company-shell signal records. Company shells (no human yet);
 * real contacts come via the warm-intro worksheet. Idempotent (skip if opp name exists),
 * dry-run-first.
 *   node --env-file=.env.local scripts/push-goods-anchors-to-demand-register-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/push-goods-anchors-to-demand-register-2026-05-27.mjs --apply
 */
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const BASE = ['goods', 'act-gd', 'project:act-gd', 'goods-stage-prospect'];

const ANCHORS = [
  { name: 'MacDonnell Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Roper Gulf Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Victoria Daly Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'West Daly Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Barkly Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'East Arnhem Regional Council', tags: ['goods-role-council', 'goods-state-nt'] },
  { name: 'Central Australian Aboriginal Congress', tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Laynhapuy Homelands Aboriginal Corporation', tags: ['goods-role-corp', 'goods-state-nt', 'goods-communitycontrolled'] },
  { name: 'Katherine West Health Board Aboriginal Corporation', tags: ['goods-role-health', 'goods-state-nt', 'goods-communitycontrolled'] },
];

async function main() {
  const ghl = createGHLService();
  const dr = await ghl.getPipelineByName('Demand Register');
  if (!dr) { console.error('✗ Demand Register pipeline not found'); process.exit(1); }
  const signal = dr.stages.find((s) => norm(s.name) === 'signal');
  if (!signal) { console.error('✗ Signal stage not found'); process.exit(1); }
  const existing = new Set((await ghl.getOpportunities(dr.id, { limit: 100 })).map((o) => norm(o.name)));
  console.log(`Demand Register (${dr.id}) existing: ${existing.size} | Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  const res = { created: [], skipped: [], errors: [] };

  for (const a of ANCHORS) {
    if (existing.has(norm(a.name))) { console.log(`= SKIP (exists)  ${a.name}`); res.skipped.push(a.name); continue; }
    if (!APPLY) { console.log(`+ WOULD CREATE  ${a.name}  → Signal  [${a.tags.join(',')}]`); continue; }
    try {
      const c = await ghl.createContact({ firstName: a.name, companyName: a.name, tags: [...BASE, ...a.tags] });
      const cid = c.id || c.contact?.id;
      if (!cid) throw new Error('no contact id');
      const opp = await ghl.createOpportunity({ pipelineId: dr.id, stageId: signal.id, name: a.name, monetaryValue: 0, status: 'open', contactId: cid });
      console.log(`+ CREATED  ${a.name}  (contact ${cid}, opp ${opp.id})`); res.created.push(a.name);
    } catch (e) { console.error(`✗ ERROR ${a.name}: ${e.message}`); res.errors.push(`${a.name}: ${e.message}`); }
  }
  console.log(`\nCreated: ${res.created.length} | skipped: ${res.skipped.length} | errors: ${res.errors.length}`);
  if (res.errors.length) console.log(res.errors.join('\n'));
  if (!APPLY) console.log('\n(Dry-run. Re-run with --apply.)');
}
main().catch((e) => { console.error(e); process.exit(1); });
