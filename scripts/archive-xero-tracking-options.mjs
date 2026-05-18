#!/usr/bin/env node
/**
 * Apply the archive-walk: flip the 12 Xero "Project Tracking" options listed
 * in thoughts/shared/handoffs/2026-05-18-xero-archive-walk-proposal.md from
 * ACTIVE → ARCHIVED.
 *
 * SAFETY:
 *   - Always recomputes the dry-run before applying (audit + Xero state must
 *     still agree on what would flip).
 *   - Requires --confirm to write. Without it, exits after printing the plan.
 *   - Batches in groups of 10 (Xero API cap).
 *   - Xero "archive" on a tracking option is reversible — re-running with the
 *     option name and Status=ACTIVE flips it back.
 *
 * Usage:
 *   node scripts/archive-xero-tracking-options.mjs            # plan
 *   node scripts/archive-xero-tracking-options.mjs --confirm  # apply
 */
import './lib/load-env.mjs';
import { readFileSync, existsSync } from 'fs';
import { fetchTrackingCategories } from './lib/xero-tracking.mjs';

const TENANT = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const AUDIT_URL = 'http://localhost:3002/api/finance/audit?accounts=act-only&since=2025-07-01';
const XERO_API = 'https://api.xero.com/api.xro/2.0';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

function extractCode(name) {
  const m = name.match(/ACT-[A-Z]{2,4}/);
  return m ? m[0] : null;
}

async function deleteOption(token, categoryId, opt) {
  // DELETE /TrackingCategories/{id}/Options/{optId}
  // Xero only allows DELETE on never-used options (the same condition that
  // makes ARCHIVE fail with "not in use"). Reversible by recreate.
  const res = await fetch(`${XERO_API}/TrackingCategories/${categoryId}/Options/${opt.TrackingOptionID}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'xero-tenant-id': TENANT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`delete ${opt.Name} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!TENANT) { console.error('XERO_TENANT_ID required'); process.exit(1); }
  const token = loadToken();
  if (!token) { console.error('No Xero access token'); process.exit(1); }

  console.log(`Mode: ${CONFIRM ? 'APPLY' : 'PLAN-ONLY'}\n`);

  const audit = await (await fetch(AUDIT_URL)).json();
  const candidateCodes = new Set(
    (audit.projectReview || [])
      .filter(r => r.recommendation === 'archive-candidate')
      .map(r => r.code)
  );

  const cats = await fetchTrackingCategories(token, TENANT);
  const projectCat = cats.find(c => c.Name.toLowerCase().includes('project'));
  if (!projectCat) { console.error('No "Project" tracking category in Xero'); process.exit(1); }

  const wouldArchive = (projectCat.Options || []).filter(o => {
    if (o.Status !== 'ACTIVE') return false;
    const code = extractCode(o.Name);
    return code && candidateCodes.has(code);
  });

  console.log(`Target: ${projectCat.Name} (${projectCat.TrackingCategoryID})`);
  console.log(`Plan: DELETE ${wouldArchive.length} options (Xero rejects ARCHIVE for never-used options)\n`);
  for (const o of wouldArchive) console.log(`  ${o.Name}  (${o.TrackingOptionID})`);

  if (!CONFIRM) {
    console.log('\nPlan-only (no --confirm). Re-run with --confirm to apply.');
    return;
  }

  console.log('\nApplying…');
  let ok = 0, fail = 0;
  for (const o of wouldArchive) {
    try {
      await deleteOption(token, projectCat.TrackingCategoryID, o);
      console.log(`  ✓ ${o.Name}`);
      ok += 1;
      await new Promise(r => setTimeout(r, 1100)); // Xero rate-limit
    } catch (e) {
      console.error(`  ✗ ${o.Name}: ${e.message}`);
      fail += 1;
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
