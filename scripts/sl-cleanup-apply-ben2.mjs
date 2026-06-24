#!/usr/bin/env node
/**
 * SL clean-up — apply Ben's round-2 answers + round-2 research (2026-06-25):
 * EL code (ACT-EL), #5 Ross Built = RNM Carpentry INV-0146 (Atnarpa/ACT-OO), #14 confirmed,
 * #61 business art trip, #16 business story project, #11 Thriday fee-vs-BAS open.
 * Run AFTER apply-ben.mjs. Local-file edit only. Usage: node scripts/sl-cleanup-apply-ben2.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const V = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));

const BEN2 = {
  63: { project: 'ACT-EL', account: 'Travel - Medical (work travel)', gst: 'GST-free (medical, Subdiv 38-B)', needs_ben: false, df: false,
    comment: "Business travel-medical for the Empathy Ledger project (ACT-EL), on the Alice Springs/Oonchiumpa field trip (21 May). Medical services are GST-free. Project = ACT-EL (confirmed the code exists). Not Drawings — a work expense." },
  16: { project: 'ACT-EL (story project — confirm)', account: 'Travel & Accommodation', gst: 'GST-free (no tax invoice)', needs_ben: false, df: false,
    comment: "$4,000 to 'little beach shacks' (23 Jan 2026) — confirmed by Ben as a BUSINESS stay for a story project (likely Empathy Ledger, ACT-EL). Code Travel & Accommodation. Direct transfer to the host, no tax invoice on file -> GST-free. Confirm the specific story project/code if not ACT-EL." },
  61: { project: 'art project (confirm — e.g. ACT-CF)', account: 'Travel & Accommodation (Melbourne hotel)', gst: 'GST on Expenses (need hotel tax invoice)', needs_ben: false, df: false,
    comment: "Melbourne hotel — confirmed by Ben as a BUSINESS trip for an art project (booking forwarded by Nathan Toleman / Mulberry Group, 24 Apr; charge 30 Apr). Code Travel & Accommodation under the relevant art project (e.g. The Confessional / ACT-CF — confirm which). Claim GST (~$135.93) once the hotel tax invoice is on file." },
  14: { project: 'ACT-IN', account: '880 Drawings (transfer to Nic)', gst: 'BAS Excluded', needs_ben: false, df: true,
    comment: "Transfer back to Nic ('for Alona' — confirmed fine by Ben). An owner/personal transfer, not a business supply: code 880 Drawings, BAS Excluded, no GST." },
  5: { project: 'ACT-OO', account: 'Building / Construction WIP (capital)', gst: 'GST on Expenses — tax invoice on file (claim per INV-0146)', needs_ben: false, df: false,
    comment: "Oonchiumpa / Atnarpa station build (ACT-OO). The $20,000 to 'Ross Built Construct' is a PART-PAYMENT of RNM Carpentry tax invoice INV-0146 — 'Ross Built Constructions' is RNM Carpentry's bank account (ABN 33 669 520 405). Invoice total $26,845.65, ref 'Atnarpa homestead renovation', 11 Nov 2025, on file in nicholas@/benjamin@. Capital build -> Building/Construction WIP, ACT-OO. GST: book the full bill (GST $2,176.77 on the labour/hotel lines; the travel-allowance lines are GST-free) and reconcile this $20,000 as a part-payment against it — don't compute GST off the $20,000." },
  11: { needs_ben: true, project: 'ACT-IN', account: 'Accounting fees OR BAS/GST payment — confirm', gst: 'depends — GST claimable if a service fee; BAS Excluded if a GST payment',
    comment: "Thriday $3,000 (4 Dec 2025). Thriday is our BAS/accounting service (Sally Hurst). I found the Sep-2025 BAS-lodgment threads in nicholas@ but NO $3,000 Thriday tax invoice. CONFIRM: is this (a) a Thriday SERVICE fee -> Accounting fees, ACT-IN, GST claimable (~$272.73) once they send the tax invoice; or (b) a BAS/GST PAYMENT to the ATO routed via Thriday -> BAS Excluded, no GST credit? Treatment differs. Also still check it isn't duplicated on the NAB Visa #8815." },
};

let n = 0;
for (const v of V) {
  const b = BEN2[v.i]; if (!b) continue;
  if (b.project) v.project_code = b.project;
  if (b.account) v.suggested_account = b.account;
  if (b.gst) v.gst_treatment = b.gst;
  if (b.comment) v.your_comment = b.comment;
  if (b.needs_ben !== undefined) v.needs_ben = b.needs_ben;
  if (b.df !== undefined) v.drawings_flag = b.df;
  v.ben_confirmed = true; n++;
}
writeFileSync(path.join(DIR, 'verdicts.json'), JSON.stringify(V, null, 2));
console.log(`Round-2 applied to ${n} lines. Still needs-Ben: ${V.filter(v => v.needs_ben).length}.`);
