#!/usr/bin/env node
/**
 * build-two-account-cash.mjs — the trustworthy two-account cash pipeline (whole-picture v1.5 phase 2).
 *
 * Replaces the money snapshot's `.cash` field (which sums ALL non-archived xero_bank_accounts and
 * renders -$152K/-$375K — see build-whole-picture.mjs header). Computes cash on hand from ONLY the
 * two ACT operating accounts (NAB Visa #8815 + NJ Marchesi T/as ACT Everyday) via the TDD-pinned
 * pure fn in lib/two-account-cash-lib.mjs (test: scripts/tests/two-account-cash.test.mjs).
 *
 * READ-ONLY: queries xero_bank_accounts, writes one JSON sidecar. No DB/Xero/GHL writes.
 *
 * TWO GATES guard the number before any surface shows it:
 *   1. displayable = complete (both accounts, numeric) AND fresh (sync age <= 26h).
 *   2. n3_decided  = the founders have declared the canonical money truth (N3). Default FALSE —
 *      set WHOLE_PICTURE_MONEY_CANON=1 only AFTER the session declares canon. Until then the
 *      surface keeps "withheld" even when displayable. `gated` = displayable && n3_decided.
 *
 * Output: thoughts/shared/data/two-account-cash-latest.json (gitignored — live, regenerable, sensitive).
 * Run:  node scripts/build-two-account-cash.mjs            (writes sidecar + prints summary)
 *       node scripts/build-two-account-cash.mjs --dry-run  (prints only, no file write)
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTwoAccountCash } from './lib/two-account-cash-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnv({ path: path.resolve(ROOT, '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const OUT = path.join(ROOT, 'thoughts/shared/data/two-account-cash-latest.json');
const money = (n) => (n == null ? 'n/a' : '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key);

  const { data, error } = await sb
    .from('xero_bank_accounts')
    .select('name, status, current_balance, balance_updated_at');
  if (error) throw error;

  const r = computeTwoAccountCash(data, { nowMs: Date.now(), staleHours: 26 });

  // N3 canon gate — orthogonal to displayable; OFF until the founders declare the money truth.
  const n3Decided = ['1', 'true', 'yes'].includes(String(process.env.WHOLE_PICTURE_MONEY_CANON || '').toLowerCase());
  const gated = r.displayable && n3Decided;
  const withholdReason = gated
    ? null
    : !r.complete ? 'incomplete - an operating account balance is missing'
      : r.stale ? `stale - oldest sync ${r.ageH == null ? '?' : r.ageH.toFixed(1)}h (>26h)`
        : !n3Decided ? 'pending N3 - founders have not declared the canonical money truth'
          : 'withheld';

  const out = {
    generated_at: new Date().toISOString(),
    source: 'xero_bank_accounts (two-account rule: #8815 + Everyday only)',
    cash: r.cash,
    asOf: r.asOfMs == null ? null : new Date(r.asOfMs).toISOString(),
    ageHours: r.ageH == null ? null : Number(r.ageH.toFixed(1)),
    stale: r.stale,
    complete: r.complete,
    displayable: r.displayable,   // fresh + complete
    n3_decided: n3Decided,        // founders declared canon?
    gated,                        // displayable && n3_decided — surfaces may show ONLY when true
    withhold_reason: withholdReason,
    included: r.included,
    excluded: r.excluded.map((e) => ({ name: e.name.trim(), reason: e.reason })),
    card_caveat: r.cardCaveat,
    note: r.note,
  };

  console.log(`two-account cash ${DRY_RUN ? '(dry-run)' : ''}`);
  console.log(`  cash: ${money(r.cash)}  (included: ${r.included.map((a) => `${a.name.trim()} ${money(a.balance)}`).join(' + ')})`);
  console.log(`  complete: ${r.complete} | fresh: ${!r.stale} (age ${r.ageH == null ? '?' : r.ageH.toFixed(1)}h) | displayable: ${r.displayable}`);
  console.log(`  N3 canon decided: ${n3Decided} -> gated (surface may show): ${gated}${gated ? '' : `  [withheld: ${withholdReason}]`}`);
  console.log(`  excluded: ${out.excluded.map((e) => e.name).join(', ')}`);

  if (DRY_RUN) {
    console.log(`  (dry-run: ${OUT} NOT written)`);
    return;
  }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`  wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error('build-two-account-cash FAILED:', e.message); process.exit(1); });
