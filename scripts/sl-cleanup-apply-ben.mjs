#!/usr/bin/env node
/**
 * SL clean-up — apply Ben's confirmed answers (2026-06-25 walk-through) over the verdicts.
 * Run AFTER sl-cleanup-apply-decisions.mjs. Local-file edit only, no Xero writes.
 * Usage: node scripts/sl-cleanup-apply-ben.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const V = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));

// Ben's confirmed calls. needs_ben=true only where genuinely still open.
const BEN = {
  13: { project: 'ACT-GD', account: 'Grants Received', gst: 'GST Free Income', needs_ben: false, df: false,
    comment: "Grant — second & final distribution from The Funding Network. Code Grants Received, GST-free income. Project: Goods (ACT-GD), per Ben." },
  3: { project: 'ACT-FM', account: 'Other Revenue / Event Income', gst: 'GST on Income (~$104.55, 1/11th)', needs_ben: false, df: false,
    comment: "Event/ticket income via Humanitix for a dad.lab event on the Farm (ACT-FM) — Other Revenue, not a grant. ACT was GST-registered this period, so GST on income ~$104.55 (and Humanitix remits net of its fee — confirm gross-vs-net from the settlement). [Ben flagged: workshop the income-side treatment for dad.lab more broadly.]" },
  2: { project: 'ACT-GD', account: '430', gst: 'GST Free Expenses', needs_ben: false, df: false,
    comment: "Reimbursement to Shane Bloomfield (from Oonchiumpa) for a Bunnings purchase for the Goods project (ACT-GD), account 430. GST-free — a consumer Bunnings receipt in Shane's name can't support a GST credit." },
  63: { project: 'Empathy Ledger (confirm code; trip = Oonchiumpa)', account: 'Travel - Medical (work travel)', gst: 'GST-free (medical, Subdiv 38-B)', needs_ben: true, df: false,
    comment: "Business travel-medical for the Empathy Ledger project, incurred on the Alice Springs / Oonchiumpa field trip (21 May). Medical is GST-free. Project = Empathy Ledger per Ben — NOTE: there's no standalone EL project code in our list, so the bookkeeper should confirm/create one (the physical trip was Oonchiumpa/ACT-OO). Not Drawings — it's a work expense." },
  60: { project: 'ACT-CF', account: 'Travel - Overseas (Meals)', gst: 'GST Free Expenses (overseas)', needs_ben: false, df: false,
    comment: "Business overseas-travel meal on Nic's trip delivering an art project at a European conference — code under The Confessional (ACT-CF) [or Gold.Phone if you prefer a dedicated code]. Overseas supplier -> GST-free. Not personal." },
  39: { project: 'ACT-IN', account: '485 Subscriptions (research)', gst: 'GST on Expenses', needs_ben: false, df: false,
    comment: "Audible subscription used as a research/office expense (per Ben) — code 485 Subscriptions, ACT-IN, GST on Expenses. Receipt on file in benjamin@ ($16.45 inc GST $1.50). Not Drawings." },
  0: { project: 'ACT-CF', account: 'Subcontractors / Honorarium', gst: 'GST Free Expenses', needs_ben: false, df: false,
    comment: "Honorarium/contributor payment to Christopher Dods for The Confessional (ACT-CF) — confirmed an ACT project payment by Ben. P2P transfer, no tax invoice -> GST-free." },
  22: { project: 'ACT-HV', account: 'Subcontractors / Labour', gst: 'GST Free Expenses', needs_ben: false, df: false,
    comment: "Labour for the Harvest build (ACT-HV) — paid to Beau Joseph Anderson, paired with the $291 (#21). P2P transfer, no tax invoice -> GST-free. Not Drawings (it's ACT work)." },
  21: { project: 'ACT-HV', account: 'Subcontractors / Labour', gst: 'GST Free Expenses', needs_ben: false, df: false,
    comment: "Labour for the Harvest build (ACT-HV) — paid to Beau Joseph Anderson, paired with the $665 (#22). P2P transfer, no tax invoice -> GST-free." },
  1: { project: 'ACT-HV', account: 'Subcontractors / Labour', gst: 'GST Free Expenses', needs_ben: false, df: false,
    comment: "Labour for the Harvest build (ACT-HV) — paid to James William. P2P transfer, no tax invoice -> GST-free. Not Drawings." },
  14: { project: 'ACT-IN', account: '880 Drawings (transfer to Nic)', gst: 'BAS Excluded', needs_ben: true, df: true,
    comment: "Transfer back to Nic ('for Alona' / a loan, per Ben) — an owner/personal transfer, not a business supply, so BAS Excluded, no GST. Code 880 Drawings (or a loan-to-owner account if it's repaying a loan Nic made). CONFIRM: is 'Alona' a person Nic paid for, or a loan repayment? That sets Drawings vs loan." },
  31: { project: 'ACT-HV', account: 'Harvest materials/expenses (cash spend)', gst: 'BAS Excluded (no receipt)', needs_ben: false, df: false,
    comment: "Cash drawn and spent on the Harvest (ACT-HV), per Ben. No receipt on the transfer itself -> BAS Excluded / no GST; the underlying Harvest purchase would carry GST only if a receipt is produced. Not Drawings." },
  62: { project: 'ACT-HV', account: 'Harvest materials/expenses (cash spend)', gst: 'BAS Excluded (no receipt)', needs_ben: false, df: false,
    comment: "Cash spent on the Harvest (ACT-HV), per Ben. No receipt -> BAS Excluded / no GST. Not Drawings." },
  30: { project: 'ACT-HV', account: 'Harvest materials/expenses (cash spend)', gst: 'BAS Excluded (no receipt)', needs_ben: false, df: false,
    comment: "Cash spent on the Harvest (ACT-HV), per Ben. No receipt -> BAS Excluded / no GST. Not Drawings." },
  7: { project: 'ACT-FM', account: 'Rent Received (residential)', gst: 'GST-free (input-taxed — residential rent)', needs_ben: false, df: false,
    comment: "Rent received for the house on the Farm (ACT-FM), per Ben — NOT a deposit refund. Residential rent is input-taxed, so no GST on the income. The 'Security minus Card' note = rent net of a card/admin fee. Code Rent Received, ACT-FM, no GST." },
  4: { project: 'ACT-FM', account: 'Other Revenue (dad.lab)', gst: 'GST on Income (~$18.18, 1/11th)', needs_ben: false, df: false,
    comment: "Payment for dad.lab (per Ben) — ACT income for the dad.lab program on the Farm (ACT-FM). ACT was GST-registered, so GST on income ~$18.18. Other Revenue, not a personal gift. [Part of the dad.lab income-handling to workshop with #3.]" },
  5: { project: 'ACT-OO', account: 'Building / Construction WIP (capital)', gst: 'GST-free until tax invoice (then claim ~$1,818)', needs_ben: true, df: false,
    comment: "Construction payment for the Oonchiumpa station build (ACT-OO), per Ben — capital, code Building/Construction WIP. No tax invoice on file yet, so GST-free for now; once the builder's tax invoice is produced, reverse to claim ~$1,818 GST. Ben to dig out the Ross Built tax invoice." },
  11: { project: 'ACT-IN', account: 'Accounting fees', gst: 'GST-free until tax invoice (then ~$272.73)', needs_ben: true, df: false,
    comment: "Thriday accounting service (per Ben) — code Accounting fees, ACT-IN. No tax invoice on file -> GST-free for now; claim ~$272.73 once Thriday's tax invoice is obtained. FLAG: check this $3,000 isn't also recorded on the NAB Visa #8815 (possible duplicate)." },
  61: { project: 'ACT-IN (confirm)', account: 'Travel & Accommodation (Melbourne hotel)', gst: 'GST on Expenses (need hotel tax invoice)', needs_ben: true, df: false,
    comment: "Identified: a Melbourne hotel booking (a booking was forwarded by Nathan Toleman / Mulberry Group on 24 Apr, charge 30 Apr) — i.e. accommodation for a Melbourne trip, not a person named Hannah. Code Travel & Accommodation. CONFIRM: was the Melbourne trip business (which project?) and obtain the hotel tax invoice to claim the ~$135.93 GST." },
  // 16 + 56 stay genuinely unknown — Ben to recall
  16: { needs_ben: true,
    comment: "$4,000 to 'little beach shacks' on 23 Jan 2026 (Fri before the Australia Day long weekend). No tax invoice and no email trail found (direct bank transfer to the host) -> GST-free. NEEDS BEN: where is 'little beach shacks' and what was the stay for — a business trip/retreat (code Travel & accommodation + project) or personal (880 Drawings)?" },
  56: { needs_ben: true,
    comment: "$4,497 to SP Retro Outdoor Co (Baulkham Hills NSW) on 2 Mar 2026, an outdoor-furniture retailer. No tax invoice and no order email found in our mailboxes. NEEDS BEN: what was bought, which project, and the tax invoice (likely capital equipment; GST claimable only once the invoice is on file)." },
};

let n = 0;
for (const v of V) {
  const b = BEN[v.i];
  if (!b) continue;
  if (b.project) v.project_code = b.project;
  if (b.account) v.suggested_account = b.account;
  if (b.gst) v.gst_treatment = b.gst;
  if (b.comment) v.your_comment = b.comment;
  if (b.needs_ben !== undefined) v.needs_ben = b.needs_ben;
  if (b.df !== undefined) v.drawings_flag = b.df;
  v.ben_confirmed = true;
  n++;
}
writeFileSync(path.join(DIR, 'verdicts.json'), JSON.stringify(V, null, 2));
console.log(`Applied Ben's answers to ${n} lines. Still needs-Ben: ${V.filter(v => v.needs_ben).length}.`);
