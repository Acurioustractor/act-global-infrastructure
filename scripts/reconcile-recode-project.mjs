#!/usr/bin/env node
/**
 * Recode the Project Tracking on a NAB Visa spend-money (the survivor we keep).
 * Preserves the Business Division tracking + account code; only swaps the project.
 * Tier-3 Xero write — gated + verified + logged. Dry-run unless --apply.
 *
 *   node scripts/reconcile-recode-project.mjs --id <txnId> --project ACT-OO
 *   node scripts/reconcile-recode-project.mjs --id <txnId> --project ACT-OO --apply
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { appendFileSync } from 'fs';

const args = process.argv.slice(2);
const val = f => args.includes(f) ? args[args.indexOf(f) + 1] : null;
const ID = val('--id'), PROJ = (val('--project') || '').toUpperCase(), APPLY = args.includes('--apply');
if (!ID || !PROJ) { console.error('--id and --project (e.g. ACT-OO) required'); process.exit(1); }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const abort = m => { console.error(`🛑 ABORT: ${m}`); process.exit(2); };

// resolve project code -> {categoryId, optionId}
const tc = await xero.get('TrackingCategories');
const projCat = (tc.TrackingCategories || []).find(c => c.Name === 'Project Tracking');
if (!projCat) abort('Project Tracking category not found');
const opt = (projCat.Options || []).find(o => o.Status === 'ACTIVE' && o.Name.toUpperCase().startsWith(PROJ));
if (!opt) abort(`project ${PROJ} not found among options`);

const t = (await xero.get(`BankTransactions/${ID}`)).BankTransactions?.[0];
if (!t) abort('txn not found');
if (!t.Type?.startsWith('SPEND') || t.BankAccount?.Name !== 'NAB Visa ACT #8815') abort('not a NAB Visa SPEND');
if (t.Status === 'DELETED') abort('txn DELETED');
const lines = t.LineItems || [];
if (!lines.length) abort('no line items');
const curProj = (lines[0].Tracking || []).find(x => x.TrackingCategoryID === projCat.TrackingCategoryID)?.Option || '(none)';
console.log(`${t.Contact?.Name} $${t.Total} ${t.DateString?.slice(0,10)}: project ${curProj} → ${opt.Name}`);

// build new tracking per line: keep all non-project tracking, set project to target
for (const li of lines) {
  const keep = (li.Tracking || []).filter(x => x.TrackingCategoryID !== projCat.TrackingCategoryID);
  li.Tracking = [...keep, { TrackingCategoryID: projCat.TrackingCategoryID, TrackingOptionID: opt.TrackingOptionID }];
}
if (!APPLY) { console.log('  DRY-RUN — add --apply'); process.exit(0); }

await xero.post(`BankTransactions/${ID}`, { BankTransactions: [{ BankTransactionID: ID, LineItems: lines }] });
const after = (await xero.get(`BankTransactions/${ID}`)).BankTransactions?.[0];
const newProj = (after?.LineItems?.[0]?.Tracking || []).find(x => x.TrackingCategoryID === projCat.TrackingCategoryID)?.Option;
if (newProj !== opt.Name) abort(`recode did not stick (now ${newProj})`);
appendFileSync('thoughts/shared/recon-pack/reconcile-write-log.md',
  `| ${new Date().toISOString()} | RECODE_PROJECT | ${t.DateString?.slice(0,10)} | ${t.Contact?.Name} | $${t.Total} | spend-money ${ID} | ${curProj} → ${opt.Name} | OK |\n`);
console.log(`  ✅ recoded to ${opt.Name}`);
