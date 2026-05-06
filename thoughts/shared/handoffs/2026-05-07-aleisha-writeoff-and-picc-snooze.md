# Aleisha bad-debt write-off + PICC snooze (operator handoff)

> Date: 2026-05-07
> Owner: Ben (decisions) → Standard Ledger (execution in Xero)
> Status: ready for review and execution

## TL;DR

**Aleisha J Keating**: 27 unpaid invoices totalling **$12,150** spanning 2025-07-04 to 2026-01-02. All weekly $450 invoices, no payments received, oldest 306 days overdue. Recommend writing off as bad debt in FY26 (sole trader Nic) for an income tax deduction. **No GST credit recoverable** — all invoices were GST-free (EXEMPTOUTPUT or INPUTTAXED). Estimated tax saving: ~$4,200–4,800 at Nic's marginal rate.

**PICC INV-0317** ($19,800, 68 days overdue): snoozed until 2026-05-21 per agreed payment window. Metadata note added to `xero_invoices` so any future chase logic honours it. INV-0324 ($77,000, 21 days overdue) untouched — own age clock applies.

---

## Aleisha — full invoice list

Tax type splits at INV-0279 (2025-10-03). First 13 invoices are `EXEMPTOUTPUT`, last 14 are `INPUTTAXED`. Both mean no GST was charged. Worth asking Standard Ledger why the tax code changed mid-billing — possible miscoding, possible legitimate service change.

| # | Invoice | Issue date | Days overdue | Total | Tax type |
|---|---------|------------|--------------|-------|----------|
| 1 | INV-0238 | 2025-07-04 | 306 | $450 | EXEMPTOUTPUT |
| 2 | INV-0242 | 2025-07-11 | 299 | $450 | EXEMPTOUTPUT |
| 3 | INV-0250 | 2025-07-18 | 292 | $450 | EXEMPTOUTPUT |
| 4 | INV-0254 | 2025-07-25 | 285 | $450 | EXEMPTOUTPUT |
| 5 | INV-0256 | 2025-08-01 | 278 | $450 | EXEMPTOUTPUT |
| 6 | INV-0257 | 2025-08-08 | 271 | $450 | EXEMPTOUTPUT |
| 7 | INV-0265 | 2025-08-15 | 264 | $450 | EXEMPTOUTPUT |
| 8 | INV-0266 | 2025-08-22 | 257 | $450 | EXEMPTOUTPUT |
| 9 | INV-0267 | 2025-08-29 | 250 | $450 | EXEMPTOUTPUT |
| 10 | INV-0269 | 2025-09-05 | 243 | $450 | EXEMPTOUTPUT |
| 11 | INV-0270 | 2025-09-12 | 236 | $450 | EXEMPTOUTPUT |
| 12 | INV-0271 | 2025-09-19 | 229 | $450 | EXEMPTOUTPUT |
| 13 | INV-0274 | 2025-09-26 | 222 | $450 | EXEMPTOUTPUT |
| 14 | INV-0279 | 2025-10-03 | 215 | $450 | **INPUTTAXED** ← change |
| 15 | INV-0280 | 2025-10-10 | 208 | $450 | INPUTTAXED |
| 16 | INV-0281 | 2025-10-17 | 201 | $450 | INPUTTAXED |
| 17 | INV-0284 | 2025-10-24 | 194 | $450 | INPUTTAXED |
| 18 | INV-0285 | 2025-10-31 | 187 | $450 | INPUTTAXED |
| 19 | INV-0287 | 2025-11-07 | 180 | $450 | INPUTTAXED |
| 20 | INV-0288 | 2025-11-14 | 173 | $450 | INPUTTAXED |
| 21 | INV-0290 | 2025-11-21 | 166 | $450 | INPUTTAXED |
| 22 | INV-0293 | 2025-11-28 | 159 | $450 | INPUTTAXED |
| 23 | INV-0294 | 2025-12-05 | 152 | $450 | INPUTTAXED |
| 24 | INV-0300 | 2025-12-12 | 145 | $450 | INPUTTAXED |
| 25 | INV-0305 | 2025-12-19 | 138 | $450 | INPUTTAXED |
| 26 | INV-0306 | 2025-12-26 | 131 | $450 | INPUTTAXED |
| 27 | INV-0307 | 2026-01-02 | 124 | $450 | INPUTTAXED |

**Total: $12,150** unpaid across 27 invoices. Weekly $450 cadence stopped 2026-01-02 — worth checking whether Aleisha's service ended or whether payment was simply abandoned.

## Tax mechanics — sole trader Nic

- **Bad debt deduction**: $12,150 reduces FY26 taxable income (filed as part of Nic's FY26 personal tax return, the final ABN-21 return before the 30 June 2026 cutover).
- **Tax saving estimate**:
  - At 32.5% marginal: ~$3,949
  - At 37% marginal: ~$4,496
  - At 45% marginal: ~$5,468
- **GST**: zero credit recoverable. Both EXEMPTOUTPUT and INPUTTAXED invoices originally had no GST applied, so there's nothing to claim back on a future BAS.
- **ATO requirement**: debt must be **genuinely irrecoverable** before write-off, not just old. File-note each invoice (or the contact record) with the reason and date. A single contact-level note covering all 27 is acceptable.

## Action plan for Standard Ledger

1. **Email Standard Ledger** with this handoff attached. Draft below.
2. Confirm the **bad debt expense account code** to post against (likely 6800 or similar — Standard Ledger to confirm).
3. Confirm whether they prefer to write off via Xero UI (per-invoice, 27 clicks) or via API (one batch script, ~30 lines — I have it ready in `scripts/lib/managed-agent-client.mjs` boilerplate; not yet wired).
4. Also ask: was the EXEMPTOUTPUT → INPUTTAXED change deliberate? If miscoded, decide whether to amend before writing off or accept the codes as-is.
5. Once Standard Ledger confirms the account code + method, run the writeoff. If via Xero UI, allow ~30 minutes. If via API, ~5 minutes.
6. Add a contact-level file note in Xero on Aleisha's record: "Bad debt written off in FY26 — all 27 invoices INV-0238 to INV-0307. Genuine irrecoverability confirmed [date], [reason]. No GST credit applicable."

## Email draft to Standard Ledger

> Subject: FY26 bad-debt write-off — Aleisha J Keating, 27 invoices, $12,150
>
> Hi [name],
>
> Wanting to write off Aleisha J Keating's outstanding ledger as bad debt in FY26 — 27 weekly $450 invoices from 2025-07-04 to 2026-01-02, totalling $12,150. All on Nic's sole trader (ABN 21 591 780 066). Last invoice was 124 days ago and no payments received across the lot.
>
> Three questions before I action it:
>
> 1. Which expense account should I post the write-off against? Bad Debts 6800, or another?
> 2. Tax type on the first 13 invoices is EXEMPTOUTPUT; the next 14 are INPUTTAXED. Both are GST-free, so write-off is income-tax-deduction only with no BAS impact — happy to confirm. Was the change deliberate at the time, or worth amending the codes before write-off?
> 3. Preference — Xero UI per-invoice (27 clicks) or one API batch via my scripts? I have the API path ready and can do it in 5 minutes once you sign off the account code.
>
> The estimated FY26 income tax deduction is $12,150 (~$4,000–4,500 saving at marginal). I'll add a file note on the contact recording the write-off date and the irrecoverability reason once we've actioned it.
>
> Cheers,
> Ben

## PICC INV-0317 snooze — already done

Updated `xero_invoices.metadata` for INV-0317 (Palm Island Community Company Limited):

```json
{
  "do_not_chase_until": "2026-05-21",
  "snooze_reason": "agreed_payment_window",
  "snooze_set_by": "ben",
  "snooze_set_at": "2026-05-07T00:00:00Z"
}
```

Any future chase autopilot should read `metadata->>'do_not_chase_until'` before queuing a chase. Today no chase script exists (the `collections-autopilot` PM2 cron entry is a phantom — `scripts/chase-overdue-invoices.mjs` doesn't exist on disk), so the field is purely defensive.

INV-0324 ($77,000, 21 days overdue) is **not** snoozed. Its own clock applies. If the user wants it deferred too, separate flag needed.

## Open follow-ups

- Phantom cron entry `collections-autopilot` in `ecosystem.config.cjs` references missing script. Decide: build the chase autopilot, or remove the cron entry.
- Standard Ledger sign-off on the write-off (this is the gating action).
- Aleisha's underlying service relationship — was this coaching, a contract, mentoring? If still active, halt billing before writing off the historical balance.
