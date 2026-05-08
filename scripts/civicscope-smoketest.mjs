#!/usr/bin/env node
/**
 * Civicscope/grantscope smoke test.
 *
 * Hits a representative set of routes that exercise the heaviest DB-touching
 * code paths. Use after any DB migration to confirm the site still serves
 * data correctly.
 *
 * Routes hit:
 *  - /                         (home)
 *  - /architecture             (static)
 *  - /reports/power-concentration   (mv_entity_power_index + mv_revolving_door)
 *  - /api/data/health          (mv_gs_donor_contractors aggregate)
 *  - /api/data/power-index?limit=3  (live mv_entity_power_index read)
 *  - /api/ops/health           (auth-gated; expect 401 without key)
 *
 * Usage:
 *   node scripts/civicscope-smoketest.mjs
 *   BASE_URL=https://grantscope.vercel.app node scripts/civicscope-smoketest.mjs
 */

const BASE = process.env.BASE_URL || 'https://civicgraph.app';

const routes = [
  { path: '/',                                expect: 200, label: 'homepage' },
  { path: '/architecture',                    expect: 200, label: 'architecture' },
  { path: '/reports/power-concentration',     expect: 200, label: 'mv_entity_power_index + mv_revolving_door' },
  { path: '/api/data/health',                 expect: 200, label: 'mv_gs_donor_contractors aggregate' },
  { path: '/api/data/power-index?limit=3',    expect: 200, label: 'mv_entity_power_index live read' },
  { path: '/api/ops/health',                  expect: 401, label: 'auth-gated (expect 401)' },
];

let passed = 0;
let failed = 0;

for (const r of routes) {
  const url = `${BASE}${r.path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'civicscope-smoketest/1' } });
    const ms = Date.now() - t0;
    const ok = res.status === r.expect;
    const sym = ok ? '✓' : '✗';
    console.log(`  ${sym}  ${res.status}  ${ms.toString().padStart(5)}ms  ${r.path.padEnd(50)}  ${r.label}`);
    if (ok) passed++; else { failed++; console.log(`     expected ${r.expect}, got ${res.status}`); }
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`  ✗  ERR  ${ms}ms  ${r.path}  ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed}/${routes.length} passed${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
