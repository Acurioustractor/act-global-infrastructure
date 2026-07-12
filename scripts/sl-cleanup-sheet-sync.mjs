#!/usr/bin/env node
/**
 * SL clean-up → Google Sheet sync. Writes each answered "Your Comments" into the linked SL
 * sheet, matching every row by DATE + AMOUNT (content match, NOT blind position — so a shifted
 * row can't scramble the answers). Reads verdicts.json + digest.json for the answers.
 *
 * Modes:
 *   node scripts/sl-cleanup-sheet-sync.mjs --probe     # just dump tabs + structure (read-only)
 *   node scripts/sl-cleanup-sheet-sync.mjs             # DRY RUN — print the planned writes
 *   node scripts/sl-cleanup-sheet-sync.mjs --apply     # write "Your Comments" into the sheet
 *
 * Sheet id + impersonated user overridable via SL_SHEET_ID / SL_SHEET_USER env.
 */
import './lib/load-env.mjs';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const SHEET_ID = process.env.SL_SHEET_ID || '1zpv4Qg8nKGEaWJ7rzmiTDQnPlV0_0HUWHtVEpFb_bFA';
const APPLY = process.argv.includes('--apply');
const PROBE = process.argv.includes('--probe');
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');

let secretCache = null;
function loadSecrets() {
  if (secretCache) return secretCache;
  secretCache = {};
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    for (const s of JSON.parse(execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' }))) secretCache[s.key] = s.value;
  } catch {}
  return secretCache;
}
const getSecret = (n) => loadSecrets()[n] || process.env[n];

async function getSheets(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not available');
  const c = JSON.parse(keyJson);
  const auth = new google.auth.JWT({ email: c.client_email, key: c.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets'], subject: userEmail });
  await auth.authorize();
  return { sheets: google.sheets({ version: 'v4', auth }), serviceEmail: c.client_email };
}

const candidateUsers = [process.env.SL_SHEET_USER, 'benjamin@act.place', 'nicholas@act.place', 'hi@act.place', 'accounts@act.place'].filter(Boolean);

async function connect() {
  let lastErr;
  for (const u of candidateUsers) {
    try {
      const { sheets, serviceEmail } = await getSheets(u);
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
      console.log(`✓ Access as ${u}`);
      return { sheets, meta: meta.data, user: u, serviceEmail };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`No access to sheet ${SHEET_ID} as any of [${candidateUsers.join(', ')}].\n  Last error: ${lastErr?.message}\n  → Share the sheet with the service account (printed below) or a delegated user, then retry.`);
}

const norm = (s) => String(s ?? '').replace(/[, $]/g, '').trim();
const numEq = (a, b) => Math.abs(parseFloat(norm(a)) - parseFloat(norm(b))) < 0.005;
const dnorm = (s) => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return null; let y = m[3]; if (y.length === 2) y = '20' + y; return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`; };

async function main() {
  const { sheets, meta, serviceEmail } = await connect();
  console.log(`Spreadsheet: "${meta.properties.title}"`);
  console.log('Tabs:', meta.sheets.map(s => `${s.properties.title} (gid ${s.properties.sheetId}, ${s.properties.gridProperties.rowCount}r×${s.properties.gridProperties.columnCount}c)`).join(' | '));
  console.log('Service account:', serviceEmail);

  // pick the tab that holds the data (first whose grid has our two account headers)
  let target = null, grid = null;
  for (const s of meta.sheets) {
    const t = s.properties.title;
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${t}'!A1:Z200` });
    const rows = r.data.values || [];
    const flat = rows.flat().join(' ');
    if (/NAB Visa ACT #8815|ACT Everyday|Your Comments/.test(flat)) { target = t; grid = rows; break; }
  }
  if (!target) { console.log('\n⚠ Could not find the unreconciled-transactions tab automatically.'); return; }
  console.log(`\nData tab: "${target}" (${grid.length} rows read)`);

  // locate the header row → Date col + Your Comments col
  let dateCol = -1, ycCol = -1, headerRow = -1;
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i].map(c => String(c).trim().toLowerCase());
    const d = row.indexOf('date'), y = row.findIndex(c => c.includes('your comment'));
    if (d !== -1 && y !== -1) { dateCol = d; ycCol = y; headerRow = i; break; }
  }
  console.log(`Header at row ${headerRow + 1}: Date=col ${dateCol}, "Your Comments"=col ${ycCol}`);
  if (PROBE) { console.log('\n(probe only — no answers matched/written)'); return; }

  // build answers
  const V = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));
  const D = JSON.parse(readFileSync(path.join(DIR, 'digest.json'), 'utf8'));
  const dByI = new Map(D.map(d => [d.i, d]));
  const flag = (v) => { const t = []; if (v.needs_ben) t.push('NEEDS YOUR CALL'); if (v.receipt_status === 'GAP_PLEASE_PROVIDE') t.push('receipt to provide'); if (v.receipt_status === 'GMAIL_CANDIDATE') t.push('receipt likely in Gmail — confirm'); if (v.receipt_status === 'RECEIPT_VENDOR_MISMATCH') t.push('no matching receipt on file'); if (v.verified === false) t.push('reviewer-corrected'); return t.length ? `[${t.join('; ')}] ` : ''; };
  const answers = V.map(v => { const d = dByI.get(v.i); return { date: d.date, amt: d.amt, particulars: d.particulars, comment: flag(v) + (v.your_comment || '') }; });
  const used = new Set();

  // map each sheet data row → answer by date+amount
  const colLetter = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const updates = []; const unmatched = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const row = grid[i]; const cell = row[dateCol];
    const iso = dnorm(cell); if (!iso) continue;
    const amtCell = row[dateCol + 1] || row[dateCol + 2]; // Spent or Received next to Date
    const cand = answers.findIndex((a, ai) => !used.has(ai) && a.date === iso && (numEq(a.amt, row[dateCol + 1]) || numEq(a.amt, row[dateCol + 2])));
    if (cand === -1) { unmatched.push({ row: i + 1, date: cell, spent: row[dateCol + 1], rec: row[dateCol + 2] }); continue; }
    used.add(cand);
    updates.push({ range: `'${target}'!${colLetter(ycCol)}${i + 1}`, values: [[answers[cand].comment]] });
  }
  console.log(`\nMatched ${updates.length}/${answers.length} answers to sheet rows. Unmatched sheet rows: ${unmatched.length}`);
  if (unmatched.length) console.log('  unmatched:', unmatched.slice(0, 8).map(u => `r${u.row} ${u.date} ${u.spent || u.rec}`).join(' | '));
  console.log('\nSample planned writes:');
  for (const u of updates.slice(0, 4)) console.log(`  ${u.range} ← ${u.values[0][0].slice(0, 90)}`);

  if (!APPLY) { console.log('\n(DRY RUN — re-run with --apply to write into the sheet)'); return; }
  await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { valueInputOption: 'RAW', data: updates } });
  console.log(`\n✅ Wrote ${updates.length} "Your Comments" cells into "${target}".`);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
