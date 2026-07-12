#!/usr/bin/env node
/**
 * SL clean-up — final two lines (2026-06-25): #11 Thriday worked out as a transfer into the
 * ACT/Nic Thriday bank account (not a fee, not the BAS payment — Sep BAS was $13,219); #56 SP
 * Retro confirmed by Ben as the Harvest. Run AFTER apply-ben2.mjs. Usage: node scripts/sl-cleanup-apply-ben3.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const V = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));

const BEN3 = {
  11: { project: 'ACT-IN', account: 'Transfer / clearing (to the Thriday bank account)', gst: 'BAS Excluded (no GST — own-money transfer, not an expense)', needs_ben: false, df: false,
    comment: "Worked out from the evidence: this $3,000 'Transfer Debit to Thriday' (4 Dec 2025) is a transfer of funds INTO the ACT/Nic Thriday bank account, NOT a service fee or a tax payment. Why: (1) Thriday is a bank — there are 'your Thriday bank accounts' notifications and a later Tyro migration in the mailboxes; (2) the Sep-2025 BAS payable was $13,219 (per Thriday's lodgment email), so the $3,000 isn't the BAS payment; (3) no $3,000 Thriday service invoice exists. So it's an inter-account / own-money movement (likely setting aside toward the looming $13,219 BAS). Code as a Transfer/clearing, BAS Excluded, no GST, no expense — reconcile it against the Thriday bank account. (If that Thriday account turns out to be Nic's personal rather than ACT's, it's 880 Drawings instead — but either way it's BAS-excluded, no GST.)" },
  56: { project: 'ACT-HV', account: 'Plant & Equipment / outdoor (capital)', gst: 'GST-free until tax invoice (then ~$408.82)', needs_ben: false, df: false,
    comment: "$4,497 to SP Retro Outdoor Co (Baulkham Hills NSW) on 2 Mar 2026 — confirmed by Ben as for the Harvest (ACT-HV). Outdoor furniture/equipment, capital in nature -> code Plant & Equipment (or outdoor/garden assets) under ACT-HV. No tax invoice on file (no email trail found) -> GST-free for now; once the SP Retro tax invoice is produced, code GST on Expenses and claim ~$408.82. Ben to provide the invoice." },
};

let n = 0;
for (const v of V) {
  const b = BEN3[v.i]; if (!b) continue;
  v.project_code = b.project; v.suggested_account = b.account; v.gst_treatment = b.gst;
  v.your_comment = b.comment; v.needs_ben = b.needs_ben; v.drawings_flag = b.df; v.ben_confirmed = true; n++;
}
writeFileSync(path.join(DIR, 'verdicts.json'), JSON.stringify(V, null, 2));
console.log(`Final 2 applied to ${n} lines. Still needs-Ben: ${V.filter(v => v.needs_ben).length}.`);
