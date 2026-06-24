#!/usr/bin/env node
/**
 * SL clean-up — fold the evidence answers + adversarial-verify corrections + source-doc
 * verifications into verdicts.json (CSV source of truth). Base comment = the answer workflow's
 * final_comment; OV = per-line overrides for the corrected / source-verified lines.
 * Local-file edit only — no Xero writes. Idempotent-ish (overwrites the needs_ben lines).
 * Usage: node scripts/sl-cleanup-apply-decisions.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const verdicts = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));
const answers = JSON.parse(readFileSync(path.join(DIR, 'decision-answers.json'), 'utf8'));
const aByI = new Map(answers.map(r => [r.i, r.answer]));
// #39 was rate-limited in the answer pass — supply manually
aByI.set(39, { project: 'ACT-IN', account: '880 Drawings', gst: 'No GST', still_needs_ben: true,
  final_comment: "Audible audiobook subscription, $16.45 (receipt on file in benjamin@). An audiobook sub is presumptively personal -> default 880 Drawings, No GST. Recode to 485 Subscriptions only if Nic confirms it's genuine work use." });

// Per-line overrides: corrected (skeptic) + source-verified (PDF). Only fields that change.
const OV = {
  // source-verified by PDF tax invoice
  12: { project: 'ACT-GD', account: '446 (capital machinery)', gst: 'GST on Expenses — claim $2,980', receipt_status: 'GMAIL_FOUND', needs_ben: false,
    comment: "The Plasticians (Circularity Group Pty Ltd, ABN 83 672 497 497) — tax invoice INV-0054, 17 Dec 2025: Machinery (CNC, hot + cold presses, sheet storage, prep table) for the Goods plastic-recycling line. $29,800 ex-GST + $2,980 GST = $32,780, ties to this payment exactly. Code ACT-GD, account 446 (capital equipment), GST on Expenses, claim the $2,980 GST credit. NOTE for the bookkeeper: the existing Xero bill is mis-entered as $29,800 GST-inclusive (tax $2,709.09, a Dext auto-import 'NEEDS CODING') — please correct it to $32,780 total / $2,980 GST. Tax invoice on file in nicholas@." },
  47: { project: 'ACT-GD', account: '446 (capital equipment)', gst: 'GST on Expenses — claim $437.82', needs_ben: false,
    comment: "Carla Furnishers Pty Ltd (ABN 86 009 599 526) — tax invoice 26-00000151, paid 28 Jan 2026: 4× Speed Queen washing machines, net of a 4-unit return (the voided $11,180 Xero bills = the swapped-out original order). $4,816.00 inc GST $437.82. Capital equipment for Goods. Code ACT-GD, account 446, GST on Expenses, claim $437.82. Tax invoice on file in nicholas@." },
  // standing MAJOR corrections
  10: { project: 'ACT-IN', account: '880 Drawings - Nicholas Marchesi', gst: 'No GST', needs_ben: false,
    comment: "$20,000 to Nicholas Marchesi (ref ...Su...) — Nic's own superannuation contribution. A sole trader's own super is not a business expense: code 880 Drawings - Nicholas Marchesi, No GST. ('Super' is inferred from the truncated 'Su' descriptor; either way this is a personal/owner outflow = Drawings.)" },
  3: { project: 'ACT-CP', account: 'Other Revenue / Event Income', gst: 'GST on Income (~$104.55, 1/11th)', needs_ben: true,
    comment: "Humanitix ticket/event income remitted to ACT (not a grant) — code Other Revenue / Event Income, project ACT-CP. GST: ACT WAS GST-registered this period (our expense bills claim GST credits), so this income carries GST on income, roughly $104.55 (1/11th). Humanitix usually remits net of its booking fee, so confirm the gross-vs-net split from the settlement statement. Confirm the event/project if not ACT-CP." },
  4: { project: 'ACT-IN', account: 'depends on nature', gst: 'Depends on nature — NOT GST-free by default', needs_ben: true,
    comment: "+$200 from Marcus Travers ('thanks'), nothing on file. Nature sets the GST (ACT was GST-registered): ACT income/contribution -> Other Revenue + GST on income (~$18.18); reimbursement of an ACT expense -> offset that expense (inherits its GST); personal repayment to Nic -> Owner Funds Introduced (881), GST-free. Please confirm what the $200 was for." },
  // standing MINOR corrections
  22: { project: 'confirm (Drawings; ACT-FM if Farm-related)', account: '880 Drawings', gst: 'No GST', needs_ben: true,
    comment: "$665 to Beau Joseph Anderson ('Thanks'), paired with the $291 (#21). No tax invoice -> no GST. Default 880 Drawings (the only prior payment to him sat in Drawings — but that was in the excluded NM Personal account and out of period, so a weak precedent). If this was paid ACT work, recode to Contractors under the project (the only Anderson in our books with a project is a Farm/ACT-FM rental — confirm if Beau relates to the Farm). Confirm personal vs contractor + project." },
  21: { project: 'confirm (Drawings; ACT-FM if Farm-related)', account: '880 Drawings', gst: 'No GST', needs_ben: true,
    comment: "$291 to Beau Joseph Anderson, paired with the $665 (#22). No tax invoice -> no GST. Default 880 Drawings (same weak prior-Drawings precedent as #22). If ACT work, recode to Contractors under the project (Farm/ACT-FM possible). Confirm personal vs contractor + project." },
  1: { project: 'ACT-IN', account: 'Subcontractors (453) if work, else 880 Drawings', gst: 'GST Free Expenses if Subcontractors / BAS Excluded if Drawings', needs_ben: true,
    comment: "$360 to James William, nothing on file. No tax invoice -> no GST credit. If a contractor/work payment, code Subcontractors (453), ACT-IN, GST Free Expenses (G11). If personal, code 880 Drawings, BAS Excluded. Confirm who + what for." },
  31: { project: 'confirm', account: 'Suspense — confirm (do not default to Drawings)', gst: 'BAS Excluded', needs_ben: true,
    comment: "$202.16 internet-banking transfer (4 Nov), no payee on the line, nothing on file. No tax invoice -> BAS Excluded. Hold in suspense pending Nic identifying it — could be a supplier payment, inter-account transfer, or personal; don't hard-code Drawings without knowing. Confirm who/what." },
  63: { project: 'ACT-OO trip (or Drawings)', account: '880 Drawings or ACT-OO travel-medical', gst: 'GST-free (medical, Subdiv 38-B)', needs_ben: true,
    comment: "Mall Medical Centre, Alice Springs, $201.28 on 21 May — during the documented Oonchiumpa/Alice Springs field trip (calendar: 'BK and NM ASP Trip' 17-28 May with Kristy Bloomfield + Tanya Turner; a 'Doctors appointment' at 73 Hartley St Alice Springs on 20 May). Medical is GST-free regardless. The trip context is real (ACT-OO), so the only call is business-vs-private health: a work-required/travel medical codes to ACT-OO (travel-medical, GST-free); a private health visit while away codes to 880 Drawings (GST-free). Confirm which." },
  16: { project: 'ACT-IN if business, else Drawings', account: 'Travel & accommodation (GST-free) if business; else 880 Drawings', gst: 'GST-free (no tax invoice)', needs_ben: true,
    comment: "$4,000 to 'little beach shacks' on 23 Jan 2026 (the Friday before the Australia Day long weekend). No tax invoice -> GST-free. The calendar shows no ACT business event at a beach that weekend (Ben was at Sydney work meetings 21-22 Jan), so a $4k long-weekend beach-shack booking leans personal -> 880 Drawings, unless it was a team/business retreat. Confirm business vs personal." },
  60: { project: 'confirm (likely Nic, not Ben)', account: 'Travel - Overseas Meals if business; else 880 Drawings', gst: 'GST Free Expenses (overseas)', needs_ben: true,
    comment: "$345.37 at Restaurace Alma, Prague, settled 7 Apr 2026 — but the calendar shows Ben in Australia that week (7 Apr meetings: Minderoo/Lucy, Contained-Flinders; Elders meeting 10 Apr). So this Prague charge is NOT Ben's meal — likely Nic's (or another traveller's) overseas trip. Overseas -> GST-free either way. Confirm whose trip and whether it's a business travel meal (ACT-IN travel) or personal (880 Drawings)." },
  2: { project: 'ACT-IN', account: '430', gst: 'GST Free Expenses', needs_ben: true,
    comment: "$200 reimbursement to Shane Bloomfield ('Bunnings thanks') for materials. Code account 430, GST Free Expenses — a consumer Bunnings receipt in Shane's name can't support a GST credit, so there's no GST to claim (final, not pending). Project ACT-IN (general): Shane isn't tagged to BG Fit in our records, so don't assume ACT-BG. Confirm the project if it was for a specific program." },
};

const needs = new Set(verdicts.filter(v => v.needs_ben).map(v => v.i));
// ensure OV-touched + answer-touched lines are covered even if needs_ben already false
for (const v of verdicts) {
  if (!needs.has(v.i) && !OV[v.i]) continue;
  const base = aByI.get(v.i);
  if (!base && !OV[v.i]) continue;
  const ov = OV[v.i] || {};
  if (base) {
    v.project_code = ov.project || base.project || v.project_code;
    v.suggested_account = ov.account || base.account || v.suggested_account;
    v.gst_treatment = ov.gst || base.gst || v.gst_treatment;
    v.your_comment = ov.comment || base.final_comment || v.your_comment;
    v.needs_ben = ov.needs_ben !== undefined ? ov.needs_ben : (base.still_needs_ben !== undefined ? base.still_needs_ben : v.needs_ben);
  } else {
    if (ov.project) v.project_code = ov.project;
    if (ov.account) v.suggested_account = ov.account;
    if (ov.gst) v.gst_treatment = ov.gst;
    if (ov.comment) v.your_comment = ov.comment;
    if (ov.needs_ben !== undefined) v.needs_ben = ov.needs_ben;
  }
  if (ov.receipt_status) v.receipt_status = ov.receipt_status;
  v.decision_applied = true;
}

writeFileSync(path.join(DIR, 'verdicts.json'), JSON.stringify(verdicts, null, 2));
const stillBen = verdicts.filter(v => v.needs_ben).length;
console.log(`Applied decisions to ${verdicts.filter(v => v.decision_applied).length} lines. Still needs-Ben: ${stillBen}.`);
