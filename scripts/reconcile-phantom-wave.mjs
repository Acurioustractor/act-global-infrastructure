#!/usr/bin/env node
/**
 * Run a wave of DELETE_PHANTOM deletes from phantom-plan.json. Each line goes through
 * the EXACT gated tool (reconcile-delete-one.mjs --apply) so every delete gets the
 * identical live gates (recon=false, keeper bill PAID+receipt, amount tol) + audit log.
 *
 * Dry-run (lists the wave) unless --apply.
 *   node scripts/reconcile-phantom-wave.mjs --n 20            # preview
 *   node scripts/reconcile-phantom-wave.mjs --n 20 --apply    # execute
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const N = args.includes('--n') ? parseInt(args[args.indexOf('--n') + 1]) : 20;
const APPLY = args.includes('--apply');
const plan = JSON.parse(readFileSync('thoughts/shared/recon-pack/phantom-plan.json', 'utf8'));
const wave = plan.slice(0, N);

console.log(`Wave: ${wave.length} of ${plan.length} phantoms (smallest $ first)${APPLY ? '  —  APPLYING' : '  —  DRY-RUN (add --apply)'}\n`);
let ok = 0, aborted = 0, failed = 0;
for (const [i, p] of wave.entries()) {
  const tag = `[${i + 1}/${wave.length}] ${p.date} ${p.vendor} $${p.amount}`;
  if (!APPLY) { console.log(`  ${tag} → del ${p.txnId} keep ${p.billId}`); continue; }
  try {
    const out = execSync(`node scripts/reconcile-delete-one.mjs --id ${p.txnId} --bill ${p.billId} --apply 2>&1`, { encoding: 'utf8' });
    if (out.includes('✅ DONE')) { ok++; console.log(`  ✅ ${tag}`); }
    else { aborted++; console.log(`  🛑 ${tag} — ${(out.match(/ABORT.*/) || ['gate failed'])[0]}`); }
  } catch (e) {
    const so = (e.stdout || e.message || '').toString();
    if (so.includes('ABORT (no write)')) { aborted++; console.log(`  🛑 ${tag} — ${(so.match(/ABORT \(no write\):.*/) || ['safe abort'])[0]}`); }
    else { failed++; console.log(`  ❌ ${tag} — ${so.split('\n').filter(Boolean).pop()}`); }
  }
}
if (APPLY) console.log(`\nWave done: ${ok} deleted · ${aborted} aborted (safe) · ${failed} failed`);
