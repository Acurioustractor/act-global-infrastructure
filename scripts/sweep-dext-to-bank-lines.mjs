#!/usr/bin/env node
/**
 * Sweep a Dext receipt-archive CSV against the NAB Visa bank statement lines, recovering the
 * coding (Category=account, Project) + receipt image that Dext holds but Xero doesn't.
 * Matches by amount-exact + date window. READ-ONLY (writes a coding sheet to scripts/output/).
 *
 * Usage: node scripts/sweep-dext-to-bank-lines.mjs nicholas-marchesi-2026-06-01.csv
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CSV = process.argv[2] || 'nicholas-marchesi-2026-06-01.csv';
const DATE_WINDOW = 10; // days (card POSTING date can lag the receipt date)

function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (inQ) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else { if (c === '"') inQ = true; else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') {} else field += c; } }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const M = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
const toISO = (d) => { const m = (d||'').match(/(\d{1,2})-(\w{3})-(\d{4})/); return m ? `${m[3]}-${M[m[2]]}-${m[1].padStart(2,'0')}` : null; };
const dayGap = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// --- parse Dext archive (card #8815 only) ---
const rows = parseCSV(readFileSync(CSV, 'utf8'));
const H = rows[0]; const ix = (n) => H.indexOf(n);
const dext = rows.slice(1).filter(r => r[0] && /8815|1656/.test(r[ix('Bank Account')] || '')).map(r => ({
  id: r[ix('Receipt ID')], date: toISO(r[ix('Date')]), supplier: r[ix('Supplier')],
  category: r[ix('Category')], project: [r[ix('Project')], r[ix('Project 2')]].filter(Boolean).join(' / '),
  total: parseFloat(r[ix('Total (AUD)')] || r[ix('Total')] || 0), image: r[ix('Image')],
  note: r[ix('Note')] || r[ix('Description')] || '',
}));

// --- pull NAB Visa bank lines (paginated + guard) ---
const PAGE = 1000; let lines = [], off = 0;
while (true) {
  const { data, error } = await sb.rpc('exec_sql', { query: `
    SELECT id, date, payee, particulars, amount, direction, status, project_code, xero_transaction_id
    FROM bank_statement_lines WHERE bank_account = 'NAB Visa ACT #8815'
      AND date BETWEEN '2025-09-25' AND '2026-01-10'
    ORDER BY date, id LIMIT ${PAGE} OFFSET ${off}` });
  if (error) { console.error(error.message); process.exit(1); }
  lines.push(...data); if (data.length < PAGE) break; off += PAGE;
}
const debit = lines.filter(l => l.direction === 'debit');
console.log(`Dext card receipts: ${dext.length} | NAB Visa bank lines: ${lines.length} (debits ${debit.length})`);

// --- match: each bank line → best Dext receipt (amount-exact, nearest date in window) ---
const used = new Set();
const matched = [], unmatchedLines = [];
for (const l of debit) {
  const cands = dext.filter(d => !used.has(d.id) && Math.abs(d.total - Number(l.amount)) < 0.005 && d.date && dayGap(d.date, l.date) <= DATE_WINDOW)
    .sort((a, b) => dayGap(a.date, l.date) - dayGap(b.date, l.date));
  if (cands.length) { used.add(cands[0].id); matched.push({ line: l, dext: cands[0] }); }
  else unmatchedLines.push(l);
}
const orphanDext = dext.filter(d => !used.has(d.id));

console.log(`\nMATCHED bank line ↔ Dext receipt: ${matched.length}`);
console.log(`Bank debits with NO Dext receipt: ${unmatchedLines.length}`);
console.log(`Dext receipts not matched to a line (already reconciled / dup / off-window): ${orphanDext.length}`);
const unrecMatched = matched.filter(m => m.line.status !== 'reconciled');
console.log(`  → of matched, still unreconciled in our mirror: ${unrecMatched.length}`);

// --- write coding sheet ---
const money = (n) => '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2 });
let md = `# Dext → bank-line coding sheet — NAB Visa #8815\n**Source:** ${CSV} (${dext.length} card receipts) · **Generated:** ${new Date().toISOString().slice(0,16).replace('T',' ')}\n\n`;
md += `Matched ${matched.length} bank lines to a Dext receipt that carries coding + an image. Apply the Category (account) + Project in Xero and attach the image. Lines with NO Dext receipt need coding from scratch.\n\n`;
md += `## ✅ Matched — apply this coding + attach image (${matched.length})\n`;
md += `| Date | Bank line | $ | → Account (Dext) | Project (Dext) | Receipt image |\n|---|---|---|---|---|---|\n`;
for (const { line, dext: d } of matched.sort((a,b)=>a.line.date<b.line.date?-1:1)) {
  md += `| ${line.date} | ${(line.payee||line.particulars||'').slice(0,28)} | ${money(line.amount)} | ${d.category||'—'} | ${d.project||'—'} | [img](${d.image}) |\n`;
}
md += `\n## ❌ Bank debits with NO Dext receipt (${unmatchedLines.length}) — code from scratch\n`;
md += `| Date | Bank line | $ |\n|---|---|---|\n`;
for (const l of unmatchedLines.sort((a,b)=>a.date<b.date?-1:1)) md += `| ${l.date} | ${(l.payee||l.particulars||'').slice(0,40)} | ${money(l.amount)} |\n`;

const fn = `scripts/output/dext-coding-sheet-8815-${new Date().toISOString().slice(0,10)}.md`;
writeFileSync(fn, md);
console.log(`\nWrote ${fn}`);
