# 02 — The Funding Network $144,558 (judgement item)

**Status:** VERDICT REACHED (high confidence). Gmail + grant letters + TFN public model all agree.
**Prepared:** 2026-05-29 · read-only investigation · no Xero/Notion/GHL writes, no emails sent.
**Builds on:** `thoughts/shared/reviews/2026-05-29-standard-ledger-recon-recode-prep-pack.md`

---

## TL;DR verdict

The two AUTHORISED "bills" from The Funding Network are **NOT expenses**. They are **grant INCOME that ACT received** — two tranches of the funds raised for A Curious Tractor at TFN's *Healthy People Healthy Planet* live crowdfunding event on **2 September 2025**.

They have been entered into Xero **backwards**: recorded as `ACCPAY` (a bill ACT owes) coded to expense account `429 General Expenses` with `INPUT` tax (GST claimed). Both the direction (expense vs income) and the GST treatment are wrong.

| Bill (as entered) | Date | Total | Truth |
|---|---|---:|---|
| TFN ACCPAY (no inv #) | 2025-11-27 | $89,361.00 | **First** grant distribution — money IN |
| TFN ACCPAY (no inv #) | 2025-12-17 | $55,197.00 | **Second & final** grant distribution — money IN |
| **Total** | | **$144,558.00** | Grant income, GST-free |

These are **(c) income ACT received via TFN — not an expense.** (Option (c) in the brief.)

---

## The decisive evidence

### 1. The grant-distribution emails (read-only Gmail, `nicholas@`/`benjamin@`)

**27 Nov 2025 — "TFN GRANT DISTRIBUTION"** (from `madeline.alderuccio@thefundingnetwork.com.au`, thread `19ac786b42dde41e`):
> "We are delighted to attach a letter confirming **your grant distribution** from the TFN Healthy People Healthy Planet event held September 2nd 2025. Please note you will receive a second [distribution]…"

**18 Dec 2025 — "TFN FINAL GRANT DISTRIBUTION"** (thread `19b2f713e7c3c8f7`), full body quoted:
> "We are pleased to make a **second and final grant distribution** from the TFN Healthy People Healthy Planet event 2 September 2025. **The funds will reach your account today or tomorrow.**"
> Attachment: **"TFN Second Grant Letter - A Curious Tractor.pdf"**

Nic's reply (18 Dec): *"Wow so quick! Thank you so much for your incredible support…"* — i.e. ACT is the recipient/grantee thanking the funder, not a customer paying a bill.

**30 Oct 2025 — "TFN Grant Update"** (thread `19a33095419bf055`):
> "Total amount raised: **$163,303.62** (pending the additional $30K from the June Canavan [match]…)"

The two distributions ($89,361 + $55,197 = $144,558) are the realised tranches of that ~$163K raised at the September event (the gap to $163,303 is consistent with TFN withholding their portion / a still-pending corporate match — see §"Loose ends").

### 2. The earlier two TFN bills corroborate (and are correctly handled, mostly)

Two **PAID** TFN bills exist from **2025-09-03**, coded `417 Donations`, tax_type `EXEMPTEXPENSES` (GST-free):
- R-8469621 — $6,000.00
- R-8469458 — $500.00

These pre-date the distributions and look like ACT's own **participation/pledge into the event** (or an event/registration cost) — correctly GST-free, correctly to Donations. **Confirm with Ben** what the $6,500 was, but their GST-free treatment is the right shape for anything TFN-related; the Nov/Dec entries should *never* have carried INPUT GST when the September ones (same counterparty) didn't.

### 3. How TFN actually works (public model — confirms flow-through)

The Funding Network is itself the **DGR / registered charity (PBI)**. At a live event, donors pledge (≥$100), corporates often **match**, TFN **collects the pledges**, issues the **donors** their tax receipts, then **distributes the pooled funds as a grant** to the beneficiary org over the following months. The beneficiary receives **grant income**; it does not pay TFN and does not issue a tax invoice. ([TFN FAQs](https://www.thefundingnetwork.com.au/who-we-are/faqs/), [TFN home](https://www.thefundingnetwork.com.au/), [TFN ACNC profile](https://www.acnc.gov.au/charity/charities/dc11ddf9-39af-e811-a961-000d3ad24182/profile))

This matches the email language exactly ("grant distribution… funds will reach your account") and rules out the two wrong readings: it is **not** a fundraising-platform fee ACT pays, and it is **not** a deductible donation ACT made.

---

## Recommended treatment

**Primary recommendation — reverse the direction. These are income, not expenses.**

1. **Void / delete the two ACCPAY bills** ($89,361 and $55,197) — they overstate ACT's expenses and accounts payable by **$144,558** and wrongly claim **input GST** on a non-expense.
2. **Recognise $144,558 as grant income**, GST-free:
   - Account: a grant/donation **income** code (e.g. the same income account used for the other PAID grants — `260` is the ACCREC line account seen on Snow Foundation / Centrecorp / PICC grant invoices). SL to confirm the correct grant-income GL.
   - GST: **GST-free / BAS-excluded.** A genuine grant/donation with no supply back to the funder is **not** subject to GST and carries **no input credit**. (The September TFN bills already used `EXEMPTEXPENSES` — the income side should be the GST-free income equivalent.)
   - Tracking: A Curious Tractor (already on the bills); project `ACT-CE` is fine, or retag to the project the event funded — **confirm which project the Healthy People Healthy Planet pitch was for** (likely June's Patch / a food-systems project, given the "Healthy People Healthy Planet" theme and the Anne Gripper / June's Patch threads in the same period).
3. **Match to the actual bank deposits.** The $144,558 should reconcile against two real deposits hitting ACT's bank ~end-Nov and ~mid/late-Dec 2025. **These deposits are not currently in the synced data** (see §Loose ends) — find which account they landed in.

### GST impact of getting this wrong (why it matters for the recode)

As currently entered, the two bills **claim $13,141.64 of input GST credits** ($144,558 ÷ 11) that ACT is **not entitled to** — there was no acquisition, it's income. If these bills were included in a lodged BAS, that is an **over-claimed GST credit that must be corrected.** Reversing them removes the false credit. This is the single biggest GST exposure in the General-Expenses recode.

---

## Scenario ranking (per fallback) — for completeness

| # | Scenario | Likelihood | GST implication |
|---|---|---|---|
| **1** | **Grant income received via TFN, entered backwards as bills** | **~95% — confirmed by grant letters + "funds will reach your account"** | Reverse bills; recognise $144,558 GST-free income; **claw back $13,141.64 falsely-claimed input GST** |
| 2 | TFN platform/fundraising fee ACT pays | <5% | Would stay an expense but should be GST-checked; ruled out — TFN distributes *to* ACT, ACT pays nothing |
| 3 | Donation ACT made (→417) | negligible | Ruled out — ACT is the grantee, not the donor |

---

## Loose ends / what only Ben or SL can answer

1. **Where did the two deposits land?** No `RECEIVE` bank transaction ≥$40K exists in the synced ACT accounts (NAB Visa #8815, NJ Marchesi T/as ACT Everyday) for 2025-11-20→2026-01-10, and no TFN income invoice exists. The grant cash may have hit **NM Personal** or **ACT Maximiser** (both excluded from ACT totals) or an account/window not synced. **Ben/SL: confirm the receiving account and that the $89,361 + $55,197 actually arrived** — needed to reconcile the income against real cash.
2. **Which project did the event fund?** Event = "Healthy People Healthy Planet" (2 Sept 2025). Co-pitchers in the threads were Farm My School and Corena Fund; ACT's slice should be tagged to the right project (June's Patch / food-systems likely) rather than the generic `ACT-CE`.
3. **What were the September $6,000 + $500 TFN bills (R-8469621 / R-8469458)?** Currently `417 Donations`, GST-free, PAID. Confirm these were ACT's event participation/pledge cost (their GST-free treatment looks right; just verify the nature).
4. **GST/BAS already lodged?** If the Q2 (Oct–Dec 2025) BAS already went in with these two bills, the **$13,141.64 input-credit reversal needs to flow into a BAS correction.** SL to handle.
5. **Sole-trader vs Pty timing.** Grant arrived into Nic's sole-trader Xero tenant pre-1-Jul cutover — confirm it stays in the sole-trader books for FY26 and isn't caught by the "on behalf of Pty" retrospective reclassification.

---

### Provenance

- **Verified (queried directly):** the four TFN `xero_invoices` rows incl. full line_items, tax_type, account_code, status (Supabase `tednluwflfhxyucgwigh`, SELECT-only). Absence of matching bank `RECEIVE` ≥$40K and absence of TFN `ACCREC` income invoice (Supabase).
- **Verified (read directly):** Gmail grant-distribution threads `19ac786b42dde41e` (27 Nov), `19b2f713e7c3c8f7` (18 Dec, full body), `19a33095419bf055` ("$163,303.62 raised"). Read-only.
- **Verified (web):** TFN flow-through / DGR model — TFN FAQs, TFN home, TFN ACNC profile.
- **Inferred (not yet confirmed):** which bank account received the cash; which project the event funded; whether the Q2 BAS already claimed the input GST. All flagged for Ben/SL.
