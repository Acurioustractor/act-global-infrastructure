#!/usr/bin/env node
/**
 * Migrate contacts from current Xero tenant → new tenant.
 *
 * Two-phase:
 *   Phase 1 (export): reads SOURCE_TENANT_ID, pulls contacts, writes config/xero-contacts-export.json
 *   Phase 2 (import): reads the JSON, targets XERO_TENANT_ID (the NEW one), creates contacts
 *
 * Safety:
 *   - Dry-run by default
 *   - --limit N to batch
 *   - --filter <string> to only migrate matching names (e.g. --filter "PICC" or "Foundation")
 *   - Skips contacts that already exist (matched by Name)
 *
 * Usage:
 *   # Phase 1: export from source (current tenant)
 *   node scripts/migrate-xero-contacts.mjs --phase export
 *
 *   # Phase 2: import into target (new tenant) — set XERO_TENANT_ID to NEW tenant
 *   XERO_TENANT_ID=<new-tenant> node scripts/migrate-xero-contacts.mjs --phase import --limit 20
 *   XERO_TENANT_ID=<new-tenant> node scripts/migrate-xero-contacts.mjs --phase import --confirm
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const EXPORT_FILE = join(process.cwd(), 'config', 'xero-contacts-export.json');

const args = process.argv.slice(2);
const phaseIdx = args.indexOf('--phase');
const PHASE = phaseIdx !== -1 ? args[phaseIdx + 1] : null;
const CONFIRM = args.includes('--confirm');
const limIdx = args.indexOf('--limit');
const LIMIT = limIdx !== -1 ? parseInt(args[limIdx + 1], 10) : 500;
const filterIdx = args.indexOf('--filter');
const FILTER = filterIdx !== -1 ? args[filterIdx + 1].toLowerCase() : null;

const DELAY_MS = 1100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function exportContacts() {
  console.log(`Export contacts from tenant ${XERO_TENANT_ID}\n`);
  // Paginate — Xero returns 100/page
  const all = [];
  for (let page = 1; page <= 30; page++) {
    const res = await xero('GET', `Contacts?page=${page}&includeArchived=false`);
    const rows = res.Contacts || [];
    if (rows.length === 0) break;
    all.push(...rows);
    console.log(`  page ${page}: +${rows.length} (total ${all.length})`);
    if (rows.length < 100) break;
    await sleep(DELAY_MS);
  }
  // Strip sensitive / non-migratable fields
  const clean = all.map((c) => ({
    Name: c.Name,
    FirstName: c.FirstName,
    LastName: c.LastName,
    EmailAddress: c.EmailAddress,
    ContactStatus: c.ContactStatus,
    IsSupplier: c.IsSupplier,
    IsCustomer: c.IsCustomer,
    Addresses: (c.Addresses || []).filter((a) => a.AddressType === 'POBOX' || a.AddressType === 'STREET'),
    Phones: c.Phones,
    TaxNumber: c.TaxNumber,
    AccountNumber: c.AccountNumber,
    Website: c.Website,
    BankAccountDetails: undefined, // explicitly strip bank details
  }));
  writeFileSync(EXPORT_FILE, JSON.stringify({ exported_at: new Date().toISOString(), contacts: clean }, null, 2));
  console.log(`\n✓ Exported ${clean.length} contacts → ${EXPORT_FILE}`);
}

async function importContacts() {
  console.log(`Import contacts into tenant ${XERO_TENANT_ID}${CONFIRM ? ' (APPLYING)' : ' (DRY RUN)'}\n`);
  if (!existsSync(EXPORT_FILE)) { console.error(`Missing ${EXPORT_FILE}. Run --phase export first.`); process.exit(1); }

  const data = JSON.parse(readFileSync(EXPORT_FILE, 'utf8'));
  let contacts = data.contacts.filter((c) => c.ContactStatus === 'ACTIVE');
  if (FILTER) contacts = contacts.filter((c) => (c.Name || '').toLowerCase().includes(FILTER));
  console.log(`Source: ${contacts.length} active contacts${FILTER ? ` (filter: ${FILTER})` : ''}`);

  // Load existing contacts in target tenant
  console.log(`Checking existing contacts in target...`);
  const existing = new Set();
  for (let page = 1; page <= 30; page++) {
    const res = await xero('GET', `Contacts?page=${page}&includeArchived=false`);
    const rows = res.Contacts || [];
    rows.forEach((c) => c.Name && existing.add(c.Name.toLowerCase()));
    if (rows.length < 100) break;
    await sleep(DELAY_MS);
  }
  console.log(`  ${existing.size} already in target\n`);

  const toCreate = contacts.filter((c) => c.Name && !existing.has(c.Name.toLowerCase())).slice(0, LIMIT);
  console.log(`${toCreate.length} to create\n`);

  let created = 0, failed = 0;
  for (const c of toCreate) {
    if (!CONFIRM) {
      console.log(`  would create: ${c.Name}`);
      created++;
      continue;
    }
    try {
      await xero('POST', 'Contacts', { Contacts: [c] });
      console.log(`  ✓ ${c.Name}`);
      created++;
    } catch (e) {
      console.log(`  ✗ ${c.Name} — ${e.message.slice(0, 120)}`);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n${CONFIRM ? 'Created' : 'Would create'}: ${created} | Failed: ${failed}`);
}

async function main() {
  if (!XERO_TENANT_ID) { console.error('XERO_TENANT_ID env var required'); process.exit(1); }
  if (PHASE === 'export') await exportContacts();
  else if (PHASE === 'import') await importContacts();
  else { console.error('Use --phase export OR --phase import'); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
