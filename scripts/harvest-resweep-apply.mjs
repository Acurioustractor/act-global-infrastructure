#!/usr/bin/env node
/**
 * Harvest (ACT-HV) forensic re-sweep — APPLY the 5 confirmed pull-backs.
 *
 * Pulls real Harvest spend that the May Xero sync scattered off ACT-HV (onto
 * ACT-CORE / NULL) back onto ACT-HV. Stamped with a manual source so the
 * auto-tagger guard protects it from being re-scrambled on the next sync.
 * Ben confirmed all 5 are Harvest costs (2026-06-26).
 *
 *   node scripts/harvest-resweep-apply.mjs            # dry-run (default)
 *   node scripts/harvest-resweep-apply.mjs --apply    # write
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const APPLY = process.argv.includes('--apply');
const SOURCE = 'manual-harvest-resweep-2026-06-26';

// id, expected vendor/amount/date for safety re-check before write
const TARGETS = [
  { id: '97b6b8cb-d557-4965-9ae2-773479848bda', vendor: "Kennedy's", total: 8594.91, date: '2026-04-27', note: 'decking (was ACT-CORE)' },
  { id: 'bef4978a-1743-46aa-adda-24085e9b5b64', vendor: "Kennedy's", total: 6787.64, date: '2026-06-12', note: 'decking (was NULL)' },
  { id: '51b2b59a-8a96-47c5-a868-8d56a4fea519', vendor: "Kennedy's", total: 4064.56, date: '2026-05-11', note: 'decking (was NULL)' },
  { id: 'a77cf9e7-2265-407c-b473-7f8fdc4e545d', vendor: 'Thais Pupio Design', total: 3000.00, date: '2026-02-02', note: 'design (was NULL)' },
  { id: 'f3d4cf9f-2c57-4d6c-9453-32462bd0af3b', vendor: 'MALENY LANDSCAPING SUPPLIES', total: 895.00, date: '2026-03-09', note: 'garden (was NULL)' },
];

async function main() {
  let changed = 0, sum = 0;
  for (const t of TARGETS) {
    const { data, error } = await sb.from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, project_code, project_code_source')
      .eq('xero_transaction_id', t.id).single();
    if (error || !data) { console.log(`!! ${t.id} not found — SKIP`); continue; }
    // safety: amount + date must still match what we confirmed
    if (Number(data.total) !== t.total || data.date !== t.date) {
      console.log(`!! ${t.id} drifted (db ${data.total}/${data.date} vs expected ${t.total}/${t.date}) — SKIP`); continue;
    }
    console.log(`${APPLY ? 'WRITE' : 'DRY '} ${t.date}  $${t.total.toFixed(2).padStart(9)}  ${data.project_code || 'NULL'} -> ACT-HV  ${t.vendor}  [${t.note}]`);
    sum += t.total; changed++;
    if (APPLY) {
      const { error: uerr } = await sb.from('xero_transactions')
        .update({ project_code: 'ACT-HV', project_code_source: SOURCE })
        .eq('xero_transaction_id', t.id);
      if (uerr) { console.log(`   ERROR: ${uerr.message}`); }
    }
  }
  console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${changed} rows, $${sum.toFixed(2)} pulled onto ACT-HV (source ${SOURCE})`);
  if (!APPLY) console.log('Re-run with --apply to write.');
}
main().catch(e => { console.error(e); process.exit(1); });
