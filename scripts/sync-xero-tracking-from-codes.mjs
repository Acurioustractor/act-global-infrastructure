#!/usr/bin/env node
/**
 * Make Xero's "Project Tracking" options match config/project-codes.json, the one source of project codes
 * (Ben, 2026-09-26). Works on whichever tenant XERO_TENANT_ID names: the sole trader now, the Pty after
 * the move.
 *
 * Writes only one kind of change: ADD an option "ACT-XX — Name" for an active project that has none.
 * It never removes or archives: Xero only lets you delete never-used options, and archiving is a decision
 * per option, so options whose project is archived are LISTED for Ben, not touched.
 *
 *   node scripts/sync-xero-tracking-from-codes.mjs            # plan only (reads Xero, writes nothing)
 *   node scripts/sync-xero-tracking-from-codes.mjs --confirm  # add the missing options
 */
import './lib/load-env.mjs';
import { readFileSync, existsSync } from 'fs';
import { fetchTrackingCategories } from './lib/xero-tracking.mjs';

const XERO_API = 'https://api.xero.com/api.xro/2.0';
const TENANT = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const CONFIRM = process.argv.includes('--confirm');

export const optionName = (code, p) => `${code} — ${p.name}`;
export const codeOf = (name) => (name.match(/^(ACT-[A-Z0-9]{2,4})\b/) || [])[1] ?? null;

/** Pure: which options to add, and which existing ones belong to a project no longer active. */
export function plan(projects, options) {
  const have = new Map(options.filter((o) => o.Status === 'ACTIVE').map((o) => [codeOf(o.Name), o]));
  const legacyTo = new Map();
  for (const [code, p] of Object.entries(projects)) for (const l of p.legacy_codes ?? []) legacyTo.set(l, code);
  const add = Object.entries(projects)
    .filter(([code, p]) => p.status === 'active' && !have.has(code) && !(p.legacy_codes ?? []).some((l) => have.has(l)))
    .map(([code, p]) => ({ code, name: optionName(code, p) }));
  const review = [...have.entries()].filter(([code]) => code)
    .map(([code, o]) => ({ code, name: o.Name, status: projects[code]?.status ?? (legacyTo.has(code) ? `legacy of ${legacyTo.get(code)}` : 'not in the file') }))
    .filter((r) => r.status !== 'active');
  return { add, review };
}

async function main() {
  if (!TENANT) { console.error('XERO_TENANT_ID required'); process.exit(1); }
  if (!existsSync(TOKEN_FILE)) { console.error(`No ${TOKEN_FILE}: refresh the Xero token first`); process.exit(1); }
  const token = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  const projects = JSON.parse(readFileSync('config/project-codes.json', 'utf8')).projects;
  const cats = await fetchTrackingCategories(token, TENANT);
  const cat = cats.find((c) => c.Name === 'Project Tracking');
  if (!cat) throw new Error('No "Project Tracking" category in this tenant');
  const { add, review } = plan(projects, cat.Options ?? []);
  console.log(`Tenant ${TENANT}: ${add.length} option(s) to add, ${review.length} to review.`);
  for (const a of add) console.log(`  + ${a.name}`);
  for (const r of review) console.log(`  ? ${r.name}  (project ${r.status})`);
  if (!CONFIRM) { console.log('\nPlan only. Re-run with --confirm to add the missing options.'); return; }
  for (let i = 0; i < add.length; i += 10) {
    const res = await fetch(`${XERO_API}/TrackingCategories/${cat.TrackingCategoryID}/Options`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Options: add.slice(i, i + 10).map((a) => ({ Name: a.name })) }),
    });
    if (!res.ok) throw new Error(`Xero add options ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  console.log(`Added ${add.length} option(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
