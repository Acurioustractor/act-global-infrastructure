import { readFileSync, writeFileSync } from 'fs';
import os from 'os'; import path from 'path';
const ORIG = process.argv[2] || path.join(os.homedir(),'Downloads','Clean up_ ACT_Nicholas Marchesi  - Unreconciled Transactions.csv');
const DIR = path.join(process.cwd(),'thoughts/shared/handoffs/sl-cleanup');
function parseCSV(t){const R=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){r.push(f);f='';}else if(c==='\n'){r.push(f);R.push(r);r=[];f='';}else if(c==='\r'){}else f+=c;}}if(f.length||r.length){r.push(f);R.push(r);}return R;}
const isDate=s=>/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(s||'').trim());
const V=JSON.parse(readFileSync(path.join(DIR,'verdicts.json'),'utf8'));
const flag=v=>{const t=[];if(v.needs_ben)t.push('NEEDS YOUR CALL');if(v.receipt_status==='GAP_PLEASE_PROVIDE')t.push('receipt to provide');if(v.receipt_status==='GMAIL_CANDIDATE')t.push('receipt likely in Gmail — confirm');if(v.receipt_status==='GMAIL_FOUND')t.push('receipt located — forwarding');if(v.receipt_status==='GMAIL_LEAD')t.push('booking confirmation found — folio to confirm');if(v.receipt_status==='RECEIPT_VENDOR_MISMATCH')t.push('no matching receipt on file');if(v.verified===false)t.push('reviewer-corrected');return t.length?`[${t.join('; ')}] `:'';};
const vByI=new Map(V.map(v=>[v.i,v]));
const grid=parseCSV(readFileSync(ORIG,'utf8'));
let di=0; const col=[];
for(const row of grid){ if(isDate((row[1]||'').trim())){ const v=vByI.get(di); col.push((flag(v)+(v?.your_comment||'')).replace(/\r?\n/g,' ')); di++; } else col.push(''); }
writeFileSync(path.join(DIR,'your-comments-column.txt'), col.join('\n'));
console.log(`Wrote ${col.length}-row column (${di} answers) → ${DIR}/your-comments-column.txt`);
console.log('Paste it into the FIRST cell of the "Your Comments" column (top row of the sheet); it fills down row-for-row.');
