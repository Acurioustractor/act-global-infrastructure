/**
 * Sync Goods impact rollups (beds/washers delivered, last delivery) from Supabase
 * goods_asset_lifecycle → GHL contact custom fields. Read-only on Supabase; writes ONLY the
 * 3 rollup custom fields on matched GHL contacts (merge by field id — does not touch tags or
 * other fields). Dry-run-first; matches are shown for human verification before --apply.
 *
 *   node --env-file=.env.local scripts/sync-goods-impact-to-ghl-2026-05-27.mjs          # dry-run (shows matches)
 *   node --env-file=.env.local scripts/sync-goods-impact-to-ghl-2026-05-27.mjs --apply
 *
 * Impact is COMMUNITY-keyed (beds go to communities; orgs serve communities), so rollups land on
 * the community record (the GHL contact whose name/company contains the community name). Dates in
 * goods_asset_lifecycle are partly junk (2000/2001 defaults) → last_delivery only set when >= 2024.
 */
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const FIELD = { beds: 'wRiK8nW7Rv8vL0twp9lF', washers: 'RcAAxZFPlVmGjKKGWy7I', lastDelivery: '8z8xIptjdN6bqcwaVOSt' };
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const ghl = createGHLService();
  // 1. aggregate impact per community
  const { data: rows, error } = await supabase.rpc('exec_sql', { query: `
    SELECT community_name,
      count(*) FILTER (WHERE product_type ILIKE '%bed%') AS beds,
      count(*) FILTER (WHERE product_type ILIKE '%wash%') AS washers,
      max(deployed_at) FILTER (WHERE deployed_at >= '2024-01-01') AS last_delivery
    FROM goods_asset_lifecycle
    WHERE community_name IS NOT NULL AND community_name <> ''
    GROUP BY community_name HAVING count(*) > 1 ORDER BY beds DESC` });
  if (error) throw new Error(`aggregate: ${error.message}`);
  console.log(`Communities with impact: ${rows.length} | Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const res = { written: [], ambiguous: [], nomatch: [], errors: [] };
  for (const r of rows) {
    const beds = Number(r.beds) || 0, washers = Number(r.washers) || 0;
    // 2. find GHL contact(s) for this community
    const matches = (await ghl.searchContacts(r.community_name))
      .filter((c) => `${c.contactName || c.name || ''} ${c.companyName || ''}`.toLowerCase().includes(r.community_name.toLowerCase()));
    const label = `${r.community_name.padEnd(20)} beds:${beds} washers:${washers}${r.last_delivery ? ' last:' + String(r.last_delivery).slice(0, 10) : ''}`;
    if (matches.length === 0) { console.log(`✗ NO MATCH   ${label}`); res.nomatch.push(r.community_name); continue; }
    if (matches.length > 1) { console.log(`? AMBIGUOUS  ${label}  → ${matches.length}: ${matches.map((m) => m.contactName || m.name).slice(0, 4).join(' | ')}`); res.ambiguous.push(r.community_name); continue; }
    const c = matches[0];
    console.log(`${APPLY ? '→ WRITE' : '+ WOULD WRITE'}  ${label}  → ${c.contactName || c.name} (${c.id})`);
    if (!APPLY) continue;
    try {
      const cf = [{ id: FIELD.beds, value: beds }, { id: FIELD.washers, value: washers }];
      if (r.last_delivery) cf.push({ id: FIELD.lastDelivery, value: new Date(r.last_delivery).getTime() });
      await ghl.updateContact(c.id, { customFields: cf });
      res.written.push(r.community_name);
    } catch (e) { console.error(`✗ ERROR ${r.community_name}: ${e.message}`); res.errors.push(`${r.community_name}: ${e.message}`); }
  }
  console.log(`\n── Summary ──\nwritten:${res.written.length} ambiguous:${res.ambiguous.length} no-match:${res.nomatch.length} errors:${res.errors.length}`);
  if (res.ambiguous.length) console.log(`Ambiguous (need a curated target): ${res.ambiguous.join(', ')}`);
  if (res.nomatch.length) console.log(`No GHL record: ${res.nomatch.join(', ')}`);
  if (!APPLY) console.log('\n(Dry-run. Verify matches, then re-run with --apply.)');
}
main().catch((e) => { console.error(e); process.exit(1); });
