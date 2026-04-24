#!/usr/bin/env node
/**
 * Seed tracking categories + options into a new Xero tenant.
 *
 * Reads `config/xero-chart.json` (exported from the current tenant) and
 * recreates the 2 tracking categories (Business Divisions, Project Tracking)
 * with all their options in the target tenant.
 *
 * IMPORTANT: the target tenant must be selected via XERO_TENANT_ID env var.
 * For safety, requires --confirm flag to actually write.
 *
 * Usage:
 *   XERO_TENANT_ID=<new-tenant-id> node scripts/seed-xero-tracking.mjs            # Dry run
 *   XERO_TENANT_ID=<new-tenant-id> node scripts/seed-xero-tracking.mjs --confirm  # Apply
 */
import '../lib/load-env.mjs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const INPUT = join(process.cwd(), 'config', 'xero-chart.json');

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

async function xero(method, path, body) {
  const token = loadToken();
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function main() {
  console.log(`Seed tracking categories → tenant ${XERO_TENANT_ID}${CONFIRM ? ' (APPLYING)' : ' (DRY RUN)'}\n`);

  if (!XERO_TENANT_ID) { console.error('XERO_TENANT_ID env var required'); process.exit(1); }
  if (!existsSync(INPUT)) { console.error(`Missing ${INPUT}. Run scripts/export-xero-chart.mjs first.`); process.exit(1); }

  const chart = JSON.parse(readFileSync(INPUT, 'utf8'));
  const source = chart.tracking_categories || [];
  if (source.length === 0) { console.error('No tracking categories in source chart.'); process.exit(1); }

  console.log(`Source: ${source.length} tracking categor${source.length === 1 ? 'y' : 'ies'}`);
  for (const tc of source) {
    console.log(`  • ${tc.Name} — ${tc.Options.length} options`);
  }
  console.log('');

  // Fetch existing tracking categories in target
  const existing = await xero('GET', 'TrackingCategories');
  const existingMap = new Map((existing.TrackingCategories || []).map((t) => [t.Name, t]));

  for (const srcTc of source) {
    console.log(`→ ${srcTc.Name}`);
    let targetTc = existingMap.get(srcTc.Name);

    if (!targetTc) {
      if (CONFIRM) {
        const res = await xero('PUT', 'TrackingCategories', {
          TrackingCategories: [{ Name: srcTc.Name }],
        });
        targetTc = res.TrackingCategories?.[0];
        console.log(`  ✓ Created category (${targetTc.TrackingCategoryID})`);
      } else {
        console.log(`  would create category`);
        continue;
      }
    } else {
      console.log(`  exists (${targetTc.TrackingCategoryID})`);
    }

    // Get current options for target
    const existingOpts = new Set((targetTc.Options || []).map((o) => o.Name));
    const toAdd = srcTc.Options
      .filter((o) => o.Status === 'ACTIVE')
      .filter((o) => !existingOpts.has(o.Name));

    if (toAdd.length === 0) {
      console.log(`  all options already present`);
      continue;
    }

    console.log(`  ${toAdd.length} option(s) to add:`);
    for (const o of toAdd) console.log(`    • ${o.Name}`);

    if (!CONFIRM) continue;

    // Bulk add: Xero allows multiple options in one PUT
    const body = { Options: toAdd.map((o) => ({ Name: o.Name })) };
    const res = await xero('PUT', `TrackingCategories/${targetTc.TrackingCategoryID}/Options`, body);
    console.log(`  ✓ Added ${res.Options?.length || 0} option(s)`);
  }

  if (!CONFIRM) {
    console.log('\n(dry run — re-run with --confirm to apply)');
  } else {
    console.log('\n✓ Tracking categories seeded');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
