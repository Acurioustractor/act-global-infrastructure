#!/usr/bin/env node
/**
 * Dry-run: list Xero "Project Tracking" options whose name maps to one of the
 * 33 archive-candidate codes surfaced on /finance/audit, and propose flipping
 * their status ACTIVE → ARCHIVED.
 *
 * READ-ONLY. Writes nothing to Xero. Output is a markdown table for review.
 *
 * Usage: node scripts/dryrun-archive-xero-tracking-options.mjs
 */
import './lib/load-env.mjs';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fetchTrackingCategories } from './lib/xero-tracking.mjs';

const TENANT = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const AUDIT_URL = 'http://localhost:3002/api/finance/audit?accounts=act-only&since=2025-07-01';

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

function extractCode(name) {
  const m = name.match(/ACT-[A-Z]{2,4}/);
  return m ? m[0] : null;
}

async function main() {
  if (!TENANT) { console.error('XERO_TENANT_ID required'); process.exit(1); }
  const token = loadToken();
  if (!token) { console.error('No Xero access token'); process.exit(1); }

  console.log('Fetching audit archive-candidates…');
  const auditRes = await fetch(AUDIT_URL);
  if (!auditRes.ok) throw new Error(`audit API ${auditRes.status}: ${await auditRes.text()}`);
  const audit = await auditRes.json();
  const archiveCandidates = (audit.projectReview || []).filter(r => r.recommendation === 'archive-candidate');
  const candidateCodes = new Set(archiveCandidates.map(r => r.code));
  console.log(`  → ${archiveCandidates.length} archive-candidates from audit\n`);

  console.log('Fetching Xero tracking categories…');
  const cats = await fetchTrackingCategories(token, TENANT);
  const projectCat = cats.find(c => c.Name.toLowerCase().includes('project'));
  if (!projectCat) { console.error('No "Project" tracking category in Xero'); process.exit(1); }
  console.log(`  → "${projectCat.Name}" (id ${projectCat.TrackingCategoryID}) — ${projectCat.Options?.length || 0} options\n`);

  const rows = [];
  for (const opt of projectCat.Options || []) {
    const code = extractCode(opt.Name);
    if (!code) continue;
    if (!candidateCodes.has(code)) continue;
    const meta = archiveCandidates.find(r => r.code === code);
    rows.push({
      code,
      optionName: opt.Name,
      optionId: opt.TrackingOptionID,
      currentStatus: opt.Status,
      projectsTableStatus: meta?.status || '—',
      reason: meta?.reason || '',
    });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));

  // What candidates have NO matching Xero tracking option?
  const xeroCodes = new Set(rows.map(r => r.code));
  const missingFromXero = [...candidateCodes].filter(c => !xeroCodes.has(c));

  // What's already ARCHIVED in Xero (no-op)?
  const alreadyArchived = rows.filter(r => r.currentStatus === 'ARCHIVED');
  const wouldArchive = rows.filter(r => r.currentStatus === 'ACTIVE');

  // Build markdown report
  const today = new Date().toISOString().slice(0, 10);
  const md = [
    `# Xero archive-walk proposal · ${today}`,
    '',
    `Source: \`/api/finance/audit\` (33 archive-candidates) ∩ Xero "${projectCat.Name}" tracking category.`,
    '',
    `- **${wouldArchive.length}** options would flip ACTIVE → ARCHIVED in Xero`,
    `- **${alreadyArchived.length}** already ARCHIVED in Xero (no-op)`,
    `- **${missingFromXero.length}** codes flagged archive-candidate in projects table but no matching Xero option (no-op)`,
    '',
    '## Would archive (ACTIVE → ARCHIVED)',
    '',
    '| Code | Xero option name | Option ID | projects.status |',
    '|------|------------------|-----------|-----------------|',
    ...wouldArchive.map(r => `| \`${r.code}\` | ${r.optionName} | \`${r.optionId}\` | ${r.projectsTableStatus} |`),
    '',
    '## Already ARCHIVED in Xero (no-op)',
    '',
    alreadyArchived.length === 0 ? '_(none)_' : [
      '| Code | Xero option name | projects.status |',
      '|------|------------------|-----------------|',
      ...alreadyArchived.map(r => `| \`${r.code}\` | ${r.optionName} | ${r.projectsTableStatus} |`),
    ].join('\n'),
    '',
    '## Flagged archive-candidate but absent from Xero',
    '',
    missingFromXero.length === 0 ? '_(none)_' : missingFromXero.map(c => `- \`${c}\``).join('\n'),
    '',
    '## How to push',
    '',
    'Add `--confirm` to a follow-up script (not yet written). Run in small batches (Xero `update-tracking-options` caps at 10 per call).',
    '',
  ].join('\n');

  const outPath = `thoughts/shared/handoffs/2026-05-18-xero-archive-walk-proposal.md`;
  writeFileSync(outPath, md);

  console.log('--- SUMMARY ---');
  console.log(`Would archive in Xero: ${wouldArchive.length}`);
  console.log(`Already archived in Xero: ${alreadyArchived.length}`);
  console.log(`Audit-flagged but absent from Xero: ${missingFromXero.length}`);
  console.log(`\nProposal written to ${outPath}`);

  // Also print the wouldArchive list inline
  if (wouldArchive.length > 0) {
    console.log('\nWould flip ACTIVE → ARCHIVED:');
    for (const r of wouldArchive) {
      console.log(`  ${r.code.padEnd(10)} ${r.optionName.padEnd(40)} ${r.optionId}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
