#!/usr/bin/env node
/**
 * Plan-only: lists duplicate bills surfaced by /api/finance/audit that COULD
 * be voided in Xero. This script DOES NOT call the Xero API — it only prints
 * the plan. Voiding is intentionally manual: open each bill in Xero, eyeball
 * the receipt + reconciliation state, then void via the Xero UI.
 *
 * Why no --confirm? Voiding a PAID bill breaks bank reconciliation. Voiding
 * an AUTHORISED bill is reversible only by recreating it. A receipt that
 * looks like a duplicate to a regex may be a legitimate same-vendor-same-day
 * purchase. Humans-in-Xero-UI is the safe path.
 *
 * Usage:
 *   node scripts/void-duplicate-bills.mjs                            # all groups
 *   node scripts/void-duplicate-bills.mjs --tier=definite            # definite only
 *   node scripts/void-duplicate-bills.mjs --tier=probable-paid-auth  # PAID+AUTH probables
 *   node scripts/void-duplicate-bills.mjs --tier=probable-both-auth  # both-AUTH probables
 */
import './lib/load-env.mjs';

const AUDIT_URL = 'http://localhost:3002/api/finance/audit?accounts=act-only&since=2025-07-01';

const args = process.argv.slice(2);
const TIER = (args.find(a => a.startsWith('--tier='))?.split('=')[1] || 'all').toLowerCase();

function pickVoidTarget(group) {
  // Always prefer voiding an AUTHORISED copy (safe: no money moved).
  const auth = group.rows.filter(r => r.status === 'AUTHORISED');
  const paid = group.rows.filter(r => r.status === 'PAID');

  if (paid.length === group.rows.length) {
    return { skip: true, reason: 'All copies PAID — manual verification needed' };
  }
  if (auth.length === 0) {
    return { skip: true, reason: 'No AUTHORISED copy to void safely' };
  }
  // Void all but one AUTHORISED. Keep paid + first auth, void the extras.
  if (auth.length === 1 && paid.length > 0) {
    // PAID + AUTH: void the AUTH (it's the duplicate)
    return { skip: false, voidIds: [auth[0].xeroId], reason: '1 PAID kept · void 1 AUTH copy' };
  }
  if (auth.length > 1 && paid.length === 0) {
    // Both/all AUTH: void all but the first (oldest by id ordering)
    return { skip: false, voidIds: auth.slice(1).map(r => r.xeroId), reason: `keep 1 AUTH · void ${auth.length - 1}` };
  }
  // Mixed multi-row case: void all AUTH (since one PAID stays as the kept copy)
  return { skip: false, voidIds: auth.map(r => r.xeroId), reason: `keep ${paid.length} PAID · void ${auth.length} AUTH` };
}

function tierMatches(group) {
  if (TIER === 'all') return true;
  if (TIER === 'definite') return group.confidence === 'definite';
  if (TIER === 'probable') return group.confidence === 'probable';
  if (TIER === 'probable-paid-auth') {
    return group.confidence === 'probable' && group.reason.toLowerCase().includes('paid +');
  }
  if (TIER === 'probable-both-auth') {
    return group.confidence === 'probable' && group.reason.toLowerCase().includes('both authorised');
  }
  return true;
}

async function main() {
  console.log(`Mode: PLAN-ONLY (no Xero writes) · Tier: ${TIER}\n`);

  console.log('Fetching audit duplicates…');
  const r = await fetch(AUDIT_URL);
  if (!r.ok) throw new Error(`audit API ${r.status}`);
  const audit = await r.json();
  const groups = [
    ...(audit.definiteDuplicates || []),
    ...(audit.probableDuplicates || []),
  ].filter(tierMatches);

  console.log(`Got ${groups.length} groups in scope.\n`);

  const plan = [];
  let skipped = 0;
  for (const g of groups) {
    const t = pickVoidTarget(g);
    if (t.skip) { skipped += 1; continue; }
    for (const xeroId of t.voidIds) {
      plan.push({
        xeroId,
        vendor: g.vendor,
        amount: g.amount,
        date: g.date,
        confidence: g.confidence,
        reason: t.reason,
        group: g,
      });
    }
  }

  console.log('--- PLAN (open each in Xero UI to void manually) ---');
  for (const p of plan) {
    const xeroLink = `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${p.xeroId}`;
    console.log(`  ${p.confidence.padEnd(8)} ${p.vendor.padEnd(36)} $${p.amount.toFixed(2).padStart(10)}  ${p.date}  →  ${xeroLink}`);
  }
  console.log(`\nTotal: ${plan.length} candidates · ${skipped} groups skipped (both-PAID, needs manual)`);
  console.log(`\nThis script does not write to Xero. Open each link, verify with the receipt + reconciliation, then void via Xero UI (Bill Options → Void).`);
}

main().catch(e => { console.error(e); process.exit(1); });
