#!/usr/bin/env node
/**
 * SL clean-up — merge the evidence answers + adversarial-verify corrections into DECISIONS-FINAL.md.
 * READ-ONLY (writes a markdown artifact only). Usage: node scripts/sl-cleanup-finalize.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const A = JSON.parse(readFileSync(path.join(DIR, 'decision-answers.json'), 'utf8'));
const Vd = JSON.parse(readFileSync(path.join(DIR, 'decision-verdicts.json'), 'utf8'));

const aByI = new Map(A.map(r => [r.i, r.answer]));
aByI.set(39, { project: 'ACT-IN', account: '880 Drawings', gst: 'No GST', final_comment: 'Audible $16.45, receipt on file; presumptively personal -> 880 Drawings unless work use.', still_needs_ben: true, ben_question: 'Office expense or Drawings?' });
const vByI = new Map(Vd.map(r => [r.i, r.verify]));
const rByI = new Map(A.map(r => [r.i, r]));
rByI.set(39, { i: 39, amt: 16.45, dir: 'spent', particulars: 'Audible Limited AU MELBOURNE' });

const order = [12, 47, 15, 13, 3, 9, 10, 2, 11, 5, 0, 22, 21, 63, 56, 16, 61, 14, 7, 1, 60, 4, 31, 62, 30, 39];

let md = '# SL clean-up — FINAL answers (evidence + adversarial verify, 2026-06-25)\n\n';
md += '_26 needs-Ben lines: answered from our records, then an adversarial skeptic pass (agents queried the live Xero mirror). 16 survived clean, 5 minor, 5 MAJOR corrections applied below. READ-ONLY drafts for Ben to confirm._\n\n';
md += '## Cross-cutting finding — ACT IS GST-registered\n';
md += 'The skeptic confirmed it: ACT expense bills are INPUT-coded **with GST credits actually claimed** ($104.55 on the Humanitix bill, etc.). So the sole trader **was GST-registered** this period. Consequence: **event/ticket income carries GST on income (1/11th)** — NOT GST-free. Affects #3 Humanitix, and #4/#7 if they resolve to revenue. Grants (#13 TFN) stay GST-free (a grant is not a taxable supply).\n\n';

for (const i of order) {
  const a = aByI.get(i) || {}, v = vByI.get(i) || {}, r = rByI.get(i) || {};
  const m = v.agree ? 'survived' : (v.severity === 'major' ? 'MAJOR correction' : 'minor correction');
  md += `### #${i}  ${r.dir === 'spent' ? '-' : '+'}$${Math.abs(r.amt || 0)}  ${(r.particulars || '').split('|')[0].trim()}  — ${m}\n`;
  md += `- **Answer:** ${a.project} | ${a.account} | ${a.gst}\n`;
  if (!v.agree && v.correction) md += `- **CORRECTED (${v.severity}):** ${v.correction}\n`;
  if (a.still_needs_ben && a.ben_question) md += `- ASK: ${a.ben_question}\n`;
  md += '\n';
}
writeFileSync(path.join(DIR, 'DECISIONS-FINAL.md'), md);
console.log(`wrote DECISIONS-FINAL.md (${md.length} bytes)`);
