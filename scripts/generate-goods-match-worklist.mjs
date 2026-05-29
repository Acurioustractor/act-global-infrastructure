#!/usr/bin/env node
/**
 * Generate a Find & Match worklist for the remaining AUTHORISED ACT-GD bills.
 * READ-ONLY. For each bill, finds the best-matching bank SPEND line on ACT's
 * two business accounts (amount ±$0.01, nearest date) and emits a markdown
 * worklist with Xero deep-links for point-and-click Bank Rec → Find & Match.
 *
 * Excludes the now-VOIDED Carla duplicate and the Platypus "review?" item.
 *
 * Usage: node scripts/generate-goods-match-worklist.mjs
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPA_URL, SUPA_KEY);
const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday'];

// The AUTHORISED ACT-GD bills to match (from the 2026-05-29 recon report).
// Carla dup 42960d4f = VOIDED this session (dropped). Platypus = review-first (dropped).
const BILLS = [
  ['c3d5dd2a-98e9-4261-81aa-18e57ec86109', '1300 Washer', '2025-12-15', 13980.00, '(recoded ACT-GD this session)'],
  ['a84b74a0-9af7-4728-91dd-322f447aaa01', 'Cafe Mia', '2025-10-21', 23.30, ''],
  ['310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4', 'Carbatec Brisbane', '2026-01-05', 2338.70, 'tooling'],
  ['6bf82502-d122-45ab-8f1c-843415d36441', 'Carbatec QLD Warehouse', '2026-01-11', 1319.00, 'tooling'],
  ['6a60f4fd-c99d-4bb2-9ad2-51f372958cbc', 'Carla Furnishers', '2025-11-16', 11180.00, 'the KEEP twin'],
  ['7a06d5d6-67af-42e2-b729-8ed5e83397a6', 'Clearview Accessories', '2026-01-22', 768.83, ''],
  ['30742f52-1556-40cd-9721-991dead8df78', 'Defy', '2026-03-19', 199.43, ''],
  ['bfe8052d-e67a-47a8-903b-02e6586f9ef1', 'Defy', '2026-03-27', 18922.75, ''],
  ['5d3bbbea-4fe4-444a-a16e-eb2dc137aa4b', 'Defy', '2026-03-27', 8525.00, ''],
  ['7f55164d-7077-4788-952b-b4a61d53b6ba', 'Defy Manufacturing', '2025-11-17', 2733.72, 'INV-1503'],
  ['8bd2dd9a-a8c4-4624-a301-f2ef5b00ef81', 'Defy Manufacturing', '2025-11-19', 16500.00, 'INV-1507 KEEP'],
  ['baa3ed75-9886-484b-af47-6a89f66efa83', 'Defy Manufacturing', '2025-11-27', 1858.78, ''],
  ['2cfca6af-4bf9-4bad-a3be-703b8961ec7e', 'Defy Manufacturing', '2025-12-18', 3199.83, ''],
  ['71952972-7c3b-485d-a079-5b64b8cdef56', 'Defy Manufacturing', '2026-01-11', 876.81, ''],
  ['a34f34fb-f8be-4dde-9286-5cce6995a327', 'Defy Manufacturing', '2026-02-17', 4812.50, 'INV-1637'],
  ['652d3079-b92a-4921-a4e9-57320742b94a', 'Defy Manufacturing', '2026-02-27', 1349.19, 'INV-1657'],
  ['d4e99b7b-9420-4159-8579-09b282701f9f', 'Devils Marbles Hotel', '2025-06-25', 138.80, 'travel'],
  ['3176b138-0fee-4c10-9c9c-e9446d95c455', 'Devils Marbles Hotel', '2025-07-02', 63.75, 'travel'],
  ['317ace0c-ff30-41e1-b83b-19b2c3cb1fba', 'Devils Marbles Hotel', '2025-08-20', 138.91, 'travel'],
  ['0be890c7-aeee-4428-90fa-1553f386ffae', 'ePrint', '2026-03-12', 811.20, ''],
  ['127d1358-3b89-49c3-a560-ae3385edfdc1', 'Fast Fuel Motors', '2025-08-20', 111.90, 'fuel'],
  ['5c1d0e6b-5c87-4f76-899e-36f0b46e2277', 'Grand Hotel Townsville', '2025-08-06', 760.24, 'travel'],
  ['f348b6b3-1bdf-4621-90fd-dcfc107419d3', 'Grand Hotel Townsville', '2026-02-16', 158.84, 'travel'],
  ['bdb51be9-ca76-4810-98f1-6b33c68be266', 'Haul Global', '2025-09-09', 1241.69, 'freight'],
  ['378157ff-3ebc-4fcf-9c79-094a498fc83f', 'Joseph Kirmos', '2025-12-03', 2737.50, 'labour'],
  ['af1435ea-0b97-4887-bfb2-10f4acebf3a6', 'Joseph Kirmos', '2026-02-16', 4500.00, 'INV-004 labour'],
  ['7ba18893-c4d1-40fb-bc51-d2b3e5c6a26d', 'Memories Bistro', '2025-06-29', 52.00, 'meal'],
  ['a136299a-263f-4e4c-a0ba-b398449e1e8d', 'Memories Bistro', '2025-06-30', 101.00, 'meal'],
  ['d6d21f84-6179-4ca2-8a85-53227e759f35', 'Memories Bistro', '2025-08-19', 254.00, 'meal'],
  ['84f6b3eb-a036-462b-a258-fd925f07eb0f', 'Metal Manufactures Pty Ltd', '2025-10-06', 182.23, 'materials'],
  ['c66812a6-4119-41ca-975b-70eb3809d3fa', 'Ollie In The Alley', '2025-09-03', 4.80, 'meal'],
  ['72bee726-6f0e-4563-bbca-d8bb8f12f838', 'Palm Island Barge', '2025-08-08', 1033.78, 'freight'],
  ['270eb2ba-ec33-4167-a19e-ab7618cfd5e7', 'Palm Island Motel', '2025-08-20', 400.00, 'travel'],
  ['503b4d00-d757-4fec-a858-f66fb8c07d0e', 'Palm Island Motel', '2025-09-02', 514.00, 'travel'],
  ['0c4dad3e-f2ea-4338-a131-3355ae3afad1', 'Peak Up Transport', '2025-07-16', 6861.50, 'freight 12475'],
  ['c71af0f1-4566-4628-a35a-5eef0ec7d677', 'Peak Up Transport', '2025-07-25', 4863.82, 'freight 12519'],
];

const fmt = (n) => (Number(n) || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function main() {
  const accts = ACT_ACCOUNTS.map(a => `'${a.replace(/'/g, "''")}'`).join(',');
  const spend = await q(`
    SELECT xero_transaction_id, date, contact_name, total, bank_account, is_reconciled
    FROM xero_transactions
    WHERE type = 'SPEND' AND bank_account IN (${accts}) AND date >= '2025-06-01'
  `);
  // index by rounded amount for fast lookup
  const byAmt = new Map();
  for (const t of spend) {
    const k = Math.round(Number(t.total) * 100);
    if (!byAmt.has(k)) byAmt.set(k, []);
    byAmt.get(k).push(t);
  }

  const lines = [];
  let matched = 0, unmatched = 0;
  for (const [id, vendor, date, amt, note] of BILLS) {
    const k = Math.round(amt * 100);
    const cands = (byAmt.get(k) || []).slice().sort((a, b) => days(a.date, date) - days(b.date, date));
    const best = cands[0];
    const billLink = `https://go.xero.com/app/bills/invoice?invoiceId=${id}`;
    if (best && days(best.date, date) <= 60) {
      matched++;
      const recon = best.is_reconciled ? ' ⚠️already-reconciled' : '';
      const acct = best.bank_account.includes('Visa') ? 'NAB Visa' : 'ACT Everyday';
      lines.push(`| [${vendor}](${billLink}) | ${date} | ${fmt(amt)} | ${best.date} · ${acct}${recon} | ${days(best.date, date) === 0 ? 'exact' : days(best.date, date).toFixed(0) + 'd'} | ${note} |`);
    } else {
      unmatched++;
      lines.push(`| [${vendor}](${billLink}) | ${date} | ${fmt(amt)} | **no ±$0.01 bank line found** | — | ${note} |`);
    }
  }

  const total = BILLS.reduce((s, b) => s + b[3], 0);
  const md = `# Goods (ACT-GD) — bank Find & Match worklist

**Generated:** ${new Date().toISOString().slice(0, 10)} · **Source:** shared Xero mirror · **${BILLS.length} bills · ${fmt(total)}**

Clear these in **Xero → Business → Bank accounts → [account] → Reconcile → Find & Match**.
For each row: open the bill link to confirm, find the bank statement line by **date + amount**, Find & Match, OK.
This links the *existing* cash movement to the bill — it does **not** create a new payment (no double-pay).

> Excluded: Carla duplicate \`42960d4f\` (VOIDED this session) · Platypus Alice Springs $179.98 (flagged "personal?" — review first).
> ⚠️already-reconciled = the bank line is already reconciled to something else; check before matching.

| Bill (→ Xero) | Bill date | Amount | Candidate bank line | Δdate | Note |
|---|---|---:|---|---|---|
${lines.join('\n')}

**Matched candidate:** ${matched}/${BILLS.length} · **no candidate:** ${unmatched}
`;
  const out = 'thoughts/shared/financials/2026-05-29-goods-find-and-match-worklist.md';
  writeFileSync(out, md);
  console.log(`Matched ${matched}/${BILLS.length}, no-candidate ${unmatched}. → ${out}`);
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
