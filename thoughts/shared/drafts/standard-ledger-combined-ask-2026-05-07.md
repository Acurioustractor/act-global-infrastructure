# Standard Ledger combined ask - Aleisha write-off + R&D decision-log sign-off

> Date drafted: 2026-05-07 (tightened pass: 2026-05-07)
> To send to: Standard Ledger (primary contact - confirm name before sending)
> Round-trip closes: Aleisha bad-debt $12,150 (~$4–4.5K tax saving) + R&D pack rule 1.5 (personnel basis Unverified blocker)
> Format: single email, two asks, four attachments listed at end

---

## Subject

FY26 sign-off: Aleisha bad-debt write-off ($12,150) + R&D decision log

## Body

Hi [name],

Two things to land before lodgement, packaged together so we can resolve in one round.

### 1. Aleisha J Keating bad-debt write-off - FY26

Want to write off Aleisha's outstanding ledger as bad debt in FY26: 27 weekly $450 invoices from 2025-07-04 to 2026-01-02, total **$12,150**, all on Nic's sole trader (ABN 21 591 780 066). Last invoice 124 days ago, $0 received across the lot.

Three questions before I action it:

1. **Account code.** Which expense account should the write-off post against? Bad Debts 6800, or another?
2. **Tax-type discrepancy.** First 13 invoices are coded `EXEMPTOUTPUT`; the next 14 are `INPUTTAXED`. Both are GST-free, so write-off is income-tax-deduction only with no BAS impact. Worth amending the codes before write-off, or leave as-is?
3. **Method.** Xero UI per-invoice (27 clicks), or one API run via a script I've already built and dry-run-tested? Script takes ~60 seconds end-to-end once you confirm the account code.

Estimated FY26 income tax deduction: $12,150. Saving at Nic's marginal rate: ~$4,000–$4,500. Once actioned I'll post a contact-level file note in Xero on Aleisha's record with date and irrecoverability reason.

Full invoice list and tax-type breakdown attached.

### 2. Money Framework decision log - FY26 R&D personnel basis

The FY25-26 R&D Tax Incentive evidence pack is assembling toward Jul 2026 lodgement (Path C, claimed via A Curious Tractor Pty Ltd ACN 697 347 676). The pack has four core activity registers (ACT-CG, ACT-EL, ACT-GD, ACT-JH) totalling $354,047 in claim. The pack scores WARN/62 on the rubric. The single biggest substance gap on the personnel side is rule 1.5: **salary allocation marked Unverified pending your sign-off**.

I'd like you to countersign the decision log so the R&D figures move from `Unverified` to `Verified-by-accountant`. The log is attached. Five decisions, all needing your eye:

| # | Decision | What I'm asking you to confirm |
|---|----------|--------------------------------|
| 1 | Founder R&D totals: Ben 95% × $250K Knight Photography invoicing = $237,500; Nic 40% × $200K retrospective director-salary characterisation = $80,000 | Personnel basis OK in principle? Especially Ben's basis as Knight Photography invoicing rather than direct salary, given the cutover to ACT Pty Ltd is 30 Jun 2026 and FY26 is sole-trader. |
| 2 | Ben's FY26 project-mix (60/10/10/10/5/5 across ACT-IN, ACT-EL, ACT-JH, ACT-GD, ACT-DO, ACT-CORE) | Allocation method defensible to AusIndustry/ATO without time-tracking? I have commit-log + calendar evidence as backup. |
| 3 | Nic's FY26 R&D split (25% ACT-GD, 15% ACT-EL, 0% ACT-JH, 60% operational/non-R&D) | Same - defensible without time-tracking? |
| 4 | Per-project register reconciliation - ACT-CG sits inside the ACT-IN bucket per Decision 4 Option A; register figure $61,500 represents the entity-resolution core activity within ACT-IN | OK to keep ACT-CG as a subset of ACT-IN with the noted indirect linkage, or split it out? |
| 5 | Aggregated turnover under $20M → 43.5% refundable offset rate | Confirmed by your read of FY26 trading. |

If you sign off as written, the pack moves to `Verified-by-accountant` on rule 1.5. If you push back on any decision, the registers update and we re-grade. Either way, this is the gate before I keep building.

The log is light reading - about 5 minutes. Sign-off can be a one-line reply naming each decision and "OK / amend / reject," or marked-up edits to the file directly.

### Round-trip impact

- Aleisha: ~$4,000–4,500 income tax saving in FY26
- Decision log: closes R&D pack rule 1.5; ~$130–154K refund (four-register range) becomes claimable on FY26 R&DTI lodgement, window Jul 2026 to 30 Apr 2027

Cheers,
Ben

---

## Attachments to include when sending

- `thoughts/shared/handoffs/2026-05-07-aleisha-writeoff-and-picc-snooze.md` - full Aleisha invoice list + tax-type breakdown
- `thoughts/shared/rd-pack-fy26/money-framework-decision-log-2026-04-15.md` - the decision log
- `thoughts/shared/rd-pack-fy26/README.md` - pack executive summary (so they have context)
- `thoughts/shared/rd-pack-fy26/grades/2026-05-07-warn-62-post-recon.json` - current rubric grade (so they can see where their sign-off sits)

## Followup once signed

- Update `decision_log` frontmatter `status: Draft` → `status: Signed_off_by_standard_ledger`
- Update each register's `salary_basis_status` to `verified-by-accountant`
- Update each provenance sidecar dollar-figure rows from `Unverified` to `Verified`
- Re-grade the pack - expected to move from WARN/62 toward WARN/75+ depending on which other warnings have closed by then
- For Aleisha: run write-off via API once account code confirmed:
  `node scripts/write-off-aleisha-invoices.mjs --apply --account-code <code> --confirm`
  (script is built and dry-run-tested; triple-trigger required for the write; ~60s total to action)
