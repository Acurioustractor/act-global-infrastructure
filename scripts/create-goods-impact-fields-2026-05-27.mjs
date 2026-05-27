/**
 * Create the minimal org/impact custom fields per thoughts/shared/plans/2026-05-27-ghl-field-strategy.md.
 * Idempotent: skips a field whose name already exists. Dry-run-first.
 *   node --env-file=.env.local scripts/create-goods-impact-fields-2026-05-27.mjs          # dry-run
 *   node --env-file=.env.local scripts/create-goods-impact-fields-2026-05-27.mjs --apply
 *
 * ABN = org join key (Xero/GrantScope/ACNC). Beds/Washers/Last-delivery = read-only rollups,
 * written by sync-goods-impact-to-ghl-*.mjs from goods_asset_lifecycle. Never hand-typed.
 */
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const FIELDS = [
  { name: 'ABN', dataType: 'TEXT', placeholder: 'Australian Business Number (org join key)' },
  { name: 'Beds delivered', dataType: 'NUMERICAL', placeholder: 'rollup from goods_asset_lifecycle — do not edit' },
  { name: 'Washers delivered', dataType: 'NUMERICAL', placeholder: 'rollup from goods_asset_lifecycle — do not edit' },
  { name: 'Last delivery date', dataType: 'DATE', placeholder: 'rollup from goods_asset_lifecycle — do not edit' },
];

async function main() {
  const ghl = createGHLService();
  const existing = await ghl.getCustomFields();
  const byName = new Map(existing.map((f) => [f.name.toLowerCase(), f]));
  console.log(`Existing custom fields: ${existing.length} | Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  const created = [];
  for (const f of FIELDS) {
    const hit = byName.get(f.name.toLowerCase());
    if (hit) { console.log(`= SKIP (exists)  ${f.name}  (${hit.id})`); continue; }
    if (!APPLY) { console.log(`+ WOULD CREATE  ${f.name}  [${f.dataType}]`); continue; }
    try {
      const cf = await ghl.createCustomField({ name: f.name, dataType: f.dataType, model: 'contact', placeholder: f.placeholder });
      const id = cf.id || cf.customField?.id;
      console.log(`+ CREATED  ${f.name}  [${f.dataType}]  → ${id}  key:${cf.fieldKey || cf.customField?.fieldKey || '?'}`);
      created.push({ name: f.name, id });
    } catch (e) { console.error(`✗ ERROR ${f.name}: ${e.message}`); }
  }
  if (APPLY && created.length) console.log(`\nField IDs (for the sync script):\n${created.map((c) => `  ${c.name} = ${c.id}`).join('\n')}`);
  if (!APPLY) console.log('\n(Dry-run. Re-run with --apply.)');
}
main().catch((e) => { console.error(e); process.exit(1); });
