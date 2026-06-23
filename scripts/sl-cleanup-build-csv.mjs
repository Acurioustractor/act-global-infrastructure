#!/usr/bin/env node
/**
 * SL clean-up CSV writer — takes the original Standard Ledger "Unreconciled Transactions"
 * sheet + the classification verdicts and writes back a CSV in the IDENTICAL format, with the
 * empty "Your Comments" column filled in. Preserves every original row, section header, amount
 * and SL comment untouched — only column 6 ("Your Comments") is populated.
 *
 * Data-row index alignment matches scripts/sl-cleanup-reconcile.mjs (Nth dated row = verdict i=N).
 *
 * Usage: node scripts/sl-cleanup-build-csv.mjs [originalCsv] [verdicts.json]
 */
import { readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const ORIG = process.argv[2] || path.join(os.homedir(), 'Downloads', 'Clean up_ ACT_Nicholas Marchesi  - Unreconciled Transactions.csv');
const VERD = process.argv[3] || path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup/verdicts.json');

function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const esc = (s)=>{ s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
const isDate = (s)=>/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(s||'').trim());

const verdicts = JSON.parse(readFileSync(VERD,'utf8'));
const vByI = new Map(verdicts.map(v=>[v.i, v]));

// flag tag for the comment column so Ben can eyeball what still needs his call
function comment(v){
  if (!v) return '';
  let c = v.your_comment || '';
  const tags = [];
  if (v.needs_ben) tags.push('NEEDS YOUR CALL');
  if (v.receipt_status === 'GAP_PLEASE_PROVIDE') tags.push('receipt to provide');
  if (v.receipt_status === 'GMAIL_CANDIDATE') tags.push('receipt likely in Gmail — confirm');
  if (v.receipt_status === 'GMAIL_FOUND') tags.push('receipt located — forwarding');
  if (v.receipt_status === 'GMAIL_LEAD') tags.push('booking confirmation found — folio to confirm');
  if (v.receipt_status === 'RECEIPT_VENDOR_MISMATCH') tags.push('no matching receipt on file');
  if (v.verified === false) tags.push('reviewer-corrected');
  return tags.length ? `[${tags.join('; ')}] ${c}` : c;
}

const grid = parseCSV(readFileSync(ORIG,'utf8'));
let dataIdx = 0;
const out = grid.map(row => {
  const r = row.slice();
  while (r.length < 7) r.push('');
  if (isDate(r[1])) {
    const v = vByI.get(dataIdx);
    r[6] = comment(v);
    dataIdx++;
  }
  return r.map(esc).join(',');
}).join('\n');

const outName = 'ACT_Nicholas Marchesi - Unreconciled Transactions - ANSWERED.csv';
const dl = path.join(os.homedir(), 'Downloads', outName);
const repo = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup', outName);
writeFileSync(dl, out);
writeFileSync(repo, out);
console.log(`Filled ${dataIdx} data rows.`);
console.log(`Wrote:\n  ${dl}\n  ${repo}`);
