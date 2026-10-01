#!/usr/bin/env node
/**
 * Fill the Goods Finance master's "v2 · Actuals" tab from Butterfly's Xero (Goods on Country),
 * month by month for FY27. READ-ONLY against Xero; writes only to the v2 · Actuals tab.
 *
 *   node scripts/goods-actuals-to-sheet.mjs            # dry run: prints the months and the mapping
 *   node scripts/goods-actuals-to-sheet.mjs --apply    # writes the tab
 *
 * Token: runs sync-xero-tokens.mjs first (it refreshes and writes the token to all three
 * stores), then reads with that token. The organisation is chosen per call by header, so
 * XERO_TENANT_ID (the sole trader) is never touched.
 *
 * Mapping: every Xero account maps to one Actuals line. The mapping lives on the tab
 * (columns P:Q) so a person can change it; this script reads it back on the next run and
 * only fills in accounts that are not mapped yet, by section and name rules.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const APPLY = process.argv.includes('--apply');
const BUTTERFLY = '598d8998-bbd2-4408-a31d-0bafaf567fd3';
// Goods FY27 money sits in two books during the cutover: all of Butterfly (it is Goods), and the
// sole trader's lines tagged Project Tracking = ACT-GD. ACT Pty has no project tracking yet, so it
// cannot be split and is left out (it carries ACT's other projects).
const SOURCES = [
  { entity: 'Butterfly (Goods on Country)', tenant: BUTTERFLY, abn: '22155132684', filter: '' },
  { entity: 'Sole trader, ACT-GD lines', tenant: '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0', abn: '21591780066',
    filter: '&trackingCategoryID=1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe&trackingOptionID=63aee6ea-0005-48b8-8019-5fe9666ead29' },
];
const SHEET = '1Wx0eYSSOqrtLeCWW5AhuBt5XdCVTA1EcfQqglizptL8';
const TAB = 'v2 · Actuals';
const FY_START = new Date(Date.UTC(2026, 6, 1)); // 1 Jul 2026

// Actuals line -> row on the tab (after this script inserts "Other income" at row 11).
const ROWS = {
  'Bed sales (buyers)': 7, 'Grant-funded beds': 8, 'Washer sales': 9, 'Grants and donations': 10, 'Other income': 11,
  Make: 13, Freight: 14, 'Community work': 15,
  'Staff and super': 17, Travel: 18, Rent: 19, Electricity: 20, Marketing: 21, Maintenance: 22, Accounting: 23, Other: 24,
};
const INCOME_LINES = ['Bed sales (buyers)', 'Grant-funded beds', 'Washer sales', 'Grants and donations', 'Other income'];
const COST_LINES = ['Make', 'Freight', 'Community work'];
const ORG_LINES = ['Staff and super', 'Travel', 'Rent', 'Electricity', 'Marketing', 'Maintenance', 'Accounting', 'Other'];

const fail = (m) => { console.error(`[FAIL] ${m}`); process.exit(1); };

function defaultLine(section, name) {
  const n = name.toLowerCase();
  if (section === 'income') {
    if (/grant|donation|subsid|everyday hero/.test(n)) return 'Grants and donations';
    if (/washer|laundry/.test(n)) return 'Washer sales';
    if (/bed|sales|product/.test(n)) return 'Bed sales (buyers)';
    return 'Other income';
  }
  if (section === 'cost') {
    if (/freight|cartage|postage/.test(n)) return 'Freight';
    if (/subcontract|community/.test(n)) return 'Community work';
    return 'Make';
  }
  if (/material|raw|plastic|steel|canvas|hardware/.test(n)) return 'Make';
  if (/wage|salar|super|payroll|employee|staff|sub-?contract/.test(n)) return 'Staff and super';
  if (/travel|fuel|motor|accommodation/.test(n)) return 'Travel';
  if (/rent|leasing/.test(n)) return 'Rent';
  if (/electric|power|gas/.test(n)) return 'Electricity';
  if (/advertis|marketing|website|printing/.test(n)) return 'Marketing';
  if (/repair|maint/.test(n)) return 'Maintenance';
  if (/accountan|audit|bookkeep/.test(n)) return 'Accounting';
  return 'Other';
}

// 1. Token (refresh + propagate through the existing script), then read with it.
execSync('node scripts/sync-xero-tokens.mjs', { stdio: 'ignore' });
const token = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token;
if (!token) fail('no Xero access token after sync-xero-tokens');

async function xero(path, tenant) {
  for (let a = 0; a < 3; a++) {
    const r = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': tenant, Accept: 'application/json' },
    });
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 3000 * (a + 1))); continue; }
    if (!r.ok) fail(`Xero ${path.split('?')[0]} ${r.status}`);
    return r.json();
  }
  fail('Xero rate-limited');
}

// 2. Month-by-month P&L per source, July to this month.
const months = [];
for (let d = new Date(FY_START); d <= new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
  const from = d.toISOString().slice(0, 10);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  months.push({ from, to: end });
}
const accounts = new Map(); // "entity|account" -> { entity, name, section, byMonth }
for (const src of SOURCES) {
  const org = await xero('Organisation', src.tenant);
  if (org.Organisations?.[0]?.RegistrationNumber !== src.abn) fail(`Xero organisation for ${src.entity} is not ABN ${src.abn}`);
  for (const [i, m] of months.entries()) {
    const rep = await xero(`Reports/ProfitAndLoss?fromDate=${m.from}&toDate=${m.to}${src.filter}`, src.tenant);
    for (const sec of rep.Reports?.[0]?.Rows ?? []) {
      const title = (sec.Title ?? '').toLowerCase();
      const section = /cost of sales/.test(title) ? 'cost' : /income|revenue/.test(title) ? 'income' : /expense/.test(title) ? 'expense' : null;
      if (!section) continue;
      for (const row of sec.Rows ?? []) {
        if (row.RowType !== 'Row') continue;
        const name = row.Cells?.[0]?.Value; const val = Number(row.Cells?.[1]?.Value ?? 0);
        if (!name) continue;
        const k = `${src.entity}|${name}`;
        const a = accounts.get(k) ?? { entity: src.entity, name, section, byMonth: Array(12).fill(0) };
        a.byMonth[i] += val; accounts.set(k, a);
      }
    }
    await new Promise((s) => setTimeout(s, 1200));
  }
}

// 3. Mapping: keep what is on the tab, add defaults for new accounts.
const require = createRequire(import.meta.url);
const { google } = require('googleapis');
const keyLine = readFileSync('/Users/benknight/Code/Goods Asset Register/v2/.env.local', 'utf8').split('\n').find((l) => l.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY='));
let raw = keyLine.slice(keyLine.indexOf('=') + 1).trim(); if (raw[0] === "'" || raw[0] === '"') raw = raw.slice(1, -1);
const key = JSON.parse(raw);
const BS = String.fromCharCode(92), NL = String.fromCharCode(10);
const auth = new google.auth.JWT({ email: key.client_email, key: key.private_key.split(BS + NL).join(NL).split(BS + 'n').join(NL), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
const sheets = google.sheets({ version: 'v4', auth });

const meta0 = await sheets.spreadsheets.get({ spreadsheetId: SHEET, fields: 'sheets.properties(title,sheetId,gridProperties)' });
const tab0 = meta0.data.sheets.find((x) => x.properties.title === TAB);
if (!tab0) fail(`no tab ${TAB}`);
if (APPLY && tab0.properties.gridProperties.columnCount < 18) {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests: [
    { appendDimension: { sheetId: tab0.properties.sheetId, dimension: 'COLUMNS', length: 18 - tab0.properties.gridProperties.columnCount } },
  ] } });
}
const existing = tab0.properties.gridProperties.columnCount >= 17
  ? (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${TAB}'!P6:R80` })).data.values ?? [] : [];
// Mapping rows: entity | account | line. Key by entity and account (the two books name accounts differently).
const mapping = new Map(existing.filter((r) => r[0] && r[1] && ROWS[r[2]]).map((r) => [`${r[0]}|${r[1]}`, r[2]]));
for (const [k, a] of accounts) if (!mapping.has(k) && a.byMonth.some((v) => v !== 0)) mapping.set(k, defaultLine(a.section, a.name));

// 4. Lines by month.
const lines = Object.fromEntries(Object.keys(ROWS).map((k) => [k, Array(12).fill(0)]));
const byEntity = Object.fromEntries(SOURCES.map((s) => [s.entity, { income: Array(12).fill(0), cost: Array(12).fill(0) }]));
for (const [k, a] of accounts) {
  const line = mapping.get(k); if (!line) continue;
  a.byMonth.forEach((v, i) => {
    lines[line][i] += v;
    if (INCOME_LINES.includes(line)) byEntity[a.entity].income[i] += v; else byEntity[a.entity].cost[i] += v;
  });
}
console.log(`FY27, ${months.length} months read. Accounts with activity:`);
for (const [k, a] of accounts) if (a.byMonth.some((v) => v !== 0))
  console.log(`  ${a.entity.slice(0, 12).padEnd(12)} ${a.name.slice(0, 34).padEnd(34)} -> ${mapping.get(k).padEnd(20)} ${a.byMonth.slice(0, months.length).map((v) => v.toFixed(0)).join(' | ')}`);
for (const [e, t] of Object.entries(byEntity)) console.log(`  TOTAL ${e}: income ${t.income.reduce((x, y) => x + y, 0).toFixed(2)}, costs ${t.cost.reduce((x, y) => x + y, 0).toFixed(2)}`);
if (!APPLY) { console.log('\nDry run. --apply writes v2 · Actuals.'); process.exit(0); }

// 5. Write (v2 · Actuals only).
const tabId = tab0.properties.sheetId;
const a11 = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${TAB}'!A11` })).data.values?.[0]?.[0];
if (a11 !== 'Other income') {
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET, requestBody: { requests: [
    { insertDimension: { range: { sheetId: tabId, dimension: 'ROWS', startIndex: 10, endIndex: 11 }, inheritFromBefore: true } },
  ] } });
}
const col = (i) => String.fromCharCode(66 + i); // B..M
const monthDates = Array.from({ length: 12 }, (_, i) => `=DATE(${i < 6 ? 2026 : 2027},${((6 + i) % 12) + 1},1)`);
const data = [
  { range: `'${TAB}'!B5:M5`, values: [monthDates] },
  { range: `'${TAB}'!A11`, values: [['Other income']] },
  { range: `'${TAB}'!B3`, values: [[`Connected: Butterfly Xero (all) + sole trader ACT-GD lines; ACT Pty excluded (no project tracking). Read ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Later months blank, not zero.`]] },
  { range: `'${TAB}'!P5:R5`, values: [['Entity', 'Xero account', 'Actuals line (edit to remap)']] },
  { range: `'${TAB}'!P6:R${5 + mapping.size}`, values: [...mapping].map(([k, line]) => [...k.split('|'), line]).sort((x, y) => (x[0] + x[2]).localeCompare(y[0] + y[2])) },
  { range: `'${TAB}'!A28:A${28 + SOURCES.length * 2}`, values: [['By entity (the move from sole trader to Butterfly)'], ...SOURCES.flatMap((s) => [[`${s.entity}: income`], [`${s.entity}: costs`]])] },
];
for (const [line, row] of Object.entries(ROWS)) {
  data.push({ range: `'${TAB}'!B${row}:M${row}`, values: [lines[line].map((v, i) => (i < months.length ? Math.round(v * 100) / 100 : ''))] });
  data.push({ range: `'${TAB}'!N${row}`, values: [[`=SUM(B${row}:M${row})`]] });
}
for (let i = 0; i < 12; i++) {
  const c = col(i);
  const f = (names) => names.map((n) => `${c}${ROWS[n]}`).join('+');
  data.push({ range: `'${TAB}'!${c}26`, values: [[i < months.length ? `=(${f(INCOME_LINES)})-(${f(COST_LINES)})-(${f(ORG_LINES)})` : '']] });
}
data.push({ range: `'${TAB}'!N26`, values: [['=SUM(B26:M26)']] });
SOURCES.forEach((src, j) => {
  const t = byEntity[src.entity];
  for (const [k, [, arr]] of [['income', t.income], ['cost', t.cost]].entries()) {
    const row = 29 + j * 2 + k;
    data.push({ range: `'${TAB}'!B${row}:M${row}`, values: [arr.map((v, i) => (i < months.length ? Math.round(v * 100) / 100 : ''))] });
    data.push({ range: `'${TAB}'!N${row}`, values: [[`=SUM(B${row}:M${row})`]] });
  }
});
await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: SHEET, requestBody: { valueInputOption: 'USER_ENTERED', data } });
await sheets.spreadsheets.values.update({ spreadsheetId: SHEET, range: `'${TAB}'!A2`, valueInputOption: 'USER_ENTERED',
  requestBody: { values: [['Read me: FY27 Goods actuals by month from Xero, read-only: all of Butterfly (Goods on Country) plus the sole trader lines tagged ACT-GD, while the books move across. Filled by act-global-infrastructure scripts/goods-actuals-to-sheet.mjs. Edit the mapping in P:R to move an account to another line, then rerun. Do not type figures here.']] } });
console.log(`[OK] wrote ${Object.keys(ROWS).length} lines x ${months.length} months, ${mapping.size} mapped accounts`);
