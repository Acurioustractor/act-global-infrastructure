# Standard Ledger Prep Pack — Reconciliation + Recode (Q2/Q3 FY26)

**Date:** 2026-05-29 · **Prepared by:** Ben (via Claude) · **For:** Standard Ledger
**Org:** "Nicholas Marchesi" sole-trader (NJ Marchesi T/as ACT), Xero `786af1ed-…`
**Period:** Oct 2025 – Mar 2026 (FY26 Q2 + Q3)
**Companion:** full health review + sources → `2026-05-29-xero-health-q2-q3-reconciliation.md` (+ `.provenance.md`)

> **Status:** Nothing has been written to Xero. Everything here is *prepared for your review and execution*. Ben's instruction: recode the General Expenses lump **now, in the sole-trader org** (not deferred to the Pty), to fix Q3 BAS and create the clean base needed for the retrospective "on behalf of" R&D reclass at the 30 Jun Pty cutover.

---

## A. General Expenses (429) recode — $486,200 / 182 bill lines

The single biggest data-quality issue: **$486,200 of ACCPAY bills sit in account 429 "General Expenses"** (the catch-all). It's almost entirely bills (bank spend to 429 is one $74.95 item). This blocks R&D allocation, distorts every project P&L, and is a BAS risk.

**Full line-by-line worklist (CSV, sortable, with `SL_confirm_acct` / `SL_confirm_project` columns to tick):**
`scripts/output/ge-recode-worklist.csv` — regenerate any time with `node scripts/generate-ge-recode-worklist.mjs`.

Each line carries a **suggested target account** (from `vendor_project_rules.category` + vendor heuristics, mapped to the live chart), a suggested project, an R&D flag, a confidence band, and judgement flags.

| Confidence | Lines | Amount | Meaning |
|---|---|---|---|
| **High** | 48 | $81,306 | Clear vendor-rule category → mapped account. Action fast. |
| **Medium** | 58 | $181,761 | Vendor-name heuristic. Quick sanity-check then apply. |
| **REVIEW** | 76 | $223,133 | No rule / vague category ("Operations"/"Other") — your call. |
| Judgement-flagged (subset) | — | $149,907 | Material + ambiguous, see below. |

### 🔴 A1. The #1 judgement call — The Funding Network, $144,558
Two **unpaid** ACCPAY bills, both claiming GST input credit, both with attachments, coded ACT-CE → General Expenses:
- 2025-11-27 — **$89,361** (AUTHORISED)
- 2025-12-17 — **$55,197** (AUTHORISED)

The Funding Network is a **fundraising platform**. A $144K *bill to ACT* claiming a GST input credit, in General Expenses, is almost certainly misclassified. Please determine which it is:
- a **donation/grant ACT committed** at a TFN live event → 417 Donations (and GST treatment likely wrong — donations are usually not GST-claimable), or
- a **cost of fundraising** / platform fee, or
- it relates to **income ACT received** via TFN (in which case it shouldn't be an expense at all).

This single item is ~30% of the lump and materially changes the P&L and the BAS. Source documents are attached in Xero.

### A2. Other material items in 429 (suggested targets)
| Vendor | Amount | Suggested | Note |
|---|---|---|---|
| Defy / Defy Manufacturing | ~$51,916 | 446 Materials & Supplies | Goods bed manufacturing — likely COGS/materials (R&D-flagged) |
| MOL Nyrt. | $30,691 | REVIEW | Odd contact name (Hungarian co.) — verify what this actually is |
| The Plasticians | $29,800 | 446 Materials & Supplies | Goods/IN plastics |
| Hatch Electrical | $24,397 | 473 Repairs & Maintenance | Farm/property (ACT-FM) — check if any is capital |
| Carla Furnishers | $22,360 | 446 / 455 Furnishings | Goods furnishings |
| Airbnb | $16,889 | 493 Travel - National | Accommodation |
| Kennards Hire | $14,086 | 432 Hire Expenses | Equipment hire (currently untagged → ACT-HV) |
| 1300 Washer | $13,980 | 446 Materials & Supplies | Goods washing machines |
| Mounty Container Supplier | $10,000 | 446 Materials & Supplies | Containers |
| Joseph Kirmos / Sophie Hickey | ~$19,400 | 486 Sub-contractors | Labour — split ACT-GD/ACT-HV |

> **Tip for bulk execution in Xero:** Find & recode by contact (Business → Bills, filter by contact) — most vendors are single-category, so a per-vendor pass clears the bulk quickly.

---

## B. Bank reconciliation worklist — ~$895K across ~418 lines

True Xero `is_reconciled` = false, AUTHORISED, ACT accounts, Q2+Q3. **Card is 70% reconciled; the operating bank is only 26%.** Breakdown by type:

| Account | Type | Lines | Amount | Nature / action |
|---|---|---|---|---|
| Everyday | SPEND-TRANSFER | 46 | **$471,479** | Transfers Everyday→card to pay it down. **Mechanical** — match to the card-side RECEIVE-TRANSFER. |
| NAB Visa | SPEND | 332 | $279,144 | Card purchases — match to bills/receipts. |
| Everyday | SPEND | 29 | $132,226 | Real bank payments (contractors/bills) — match to bills. |
| Everyday | RECEIVE-TRANSFER | 11 | $12,038 | Small transfers in — mechanical. |

So **~$483K is just internal transfers** (fast) and **~$411K is real spend** to match against bills.

> ⚠️ **Bill-vs-payment double-count risk.** $1.03M of real ACCPAY bills were entered for the period vs $584K of bank outflow, with almost no bank↔bill matching done. Some bills are likely *also* entered as separate card/bank spends (the known Harvest pattern). As you reconcile, watch for a bill **and** a bank spend for the same vendor/amount/date — match them rather than expensing twice. Telford Smith (§C) is one confirmed instance.

> **Note on imported statement lines:** the receipt pipeline imported 1,618 bank-statement lines for exactly this period — **but all are NAB Visa; the Everyday bank statement was never imported.** If you want the Everyday statement in the pipeline too, it needs loading.

---

## C. Duplicates / double-payments — verdicts

### 🔴 C1. Telford Smith Engineering — likely $19,800 double-pay (ACT-GD)
- **Two bills**, both 2025-12-22, both $19,800 (one **PAID**, one **AUTHORISED/owing $19,800**), both with attachments.
- **Two bank payments**, both 2025-12-23, both $19,800, both **unreconciled**, with **mismatched tax codes** (one INPUT, one EXEMPTEXPENSES).

→ Looks like **one $19,800 job, double-entered and double-paid** ($39,600 each side). Please verify against the actual Telford Smith invoice. If confirmed a duplicate: **void the phantom AUTHORISED bill** (−$19,800 payables) and **recover/credit one of the two payments** (~$19,800). If it's genuinely two stages of a $39,600 job, just fix the tax code on one line and reconcile both.

### C2. Qantas same-day charges — NOT duplicates (leave)
~$20K of the raw "duplicate" signal is same-day Qantas charges. These are normal (multi-leg bookings, seat/baggage add-ons). Do **not** dedup.

### C3. Minor SaaS pairs — low priority
HighLevel $139.05, Supabase $87.25, Webflow $65.62 (each ×2 same day). Verify against statements; immaterial.

---

## D. Missing receipts — material items (GST/R&D)

Card-level gaps are negligible (~$5.8K, all sub-$82.50). The items that matter:

| Date | Vendor | Amount | Project | Issue |
|---|---|---|---|---|
| 2025-11-17 | **Nicholas** | $15,000 | ACT-CORE | **R&D-flagged, no receipt** — founder payment |
| 2025-11-21 | **Nicholas** | $6,159 | ACT-CORE | **R&D-flagged, no receipt** — founder payment |
| 2025-11-16 | Carla Furnishers | $11,180 | ACT-GD | bill, no attachment |
| 2025-11-04 | Mounty Container | $11,000 | ACT-CORE | bill, no attachment |
| 2025-11-25 | Airbnb | $2,324.80 | ACT-IN | bill, no attachment |

> The **$21,159 of "Nicholas" R&D-coded transfers** are weak R&D substantiation (related-party, no contract). These should be resolved structurally via the Pty's **$120K base salary + Director's Loan** policy with contemporaneous R&D time records — not by finding a receipt. Flagging for the migration restructure.
>
> The receipt pipeline (`receipt_status` 592 rows, `dext_receipts` 383, 833 matched statement lines) has already *found* many receipts that were never pushed into Xero as attachments — so the real documentation gap is smaller than the raw "no attachment" count. Pushing pipeline receipts → Xero attachments is a separate available step (`upload-evidence-receipts-to-xero.mjs`).

---

## E. Housekeeping before the 30 Jun cutover

- **137 DRAFT ACCPAY bills ($15,993)** — approve or delete; don't carry drafts into the Pty.
- **$401,200 of VOIDED ACCREC invoices (22)** + 1 DELETED ($53,900) — please add a one-line reason each so the income story is defensible at BAS/audit.
- **$679,192 in AUTHORISED (owing) bills** vs $304K cash — confirm which are genuinely due vs related-party/non-urgent.
- **NAB Visa ledger −$173,925** — confirm the card ledger balance reconciles to the actual NAB statement.

---

## F. Standard Ledger action checklist (suggested order)

1. **Sign the Ignition BAS proposal** (6 reminders outstanding) — this is the single unblocker for everything below.
2. Get **Xero access** on this org (+ coordinate the Pty ATO Client-to-Agent linking with Nic).
3. **Reconcile the $483K of internal transfers** (mechanical) → then the $411K of real spend against bills.
4. **Resolve The Funding Network $144,558** classification (§A1).
5. **Recode the rest of General Expenses** from `ge-recode-worklist.csv` (High/Medium first).
6. **Resolve Telford Smith** duplicate (§C1).
7. **Clear 137 draft bills** + document the $401K voided invoices.
8. Confirm the **Q3 BAS** position once A–G above are clean.
9. Feed the clean expense base into the **30 Jun Pty cutover** ("on behalf of" R&D reclass, opening balances, founder salary/Director's Loan).

---

*Reproduce/refresh: `node scripts/refresh-xero-token.mjs` (verify access) · `node scripts/generate-ge-recode-worklist.mjs` (recode CSV) · `node scripts/generate-reconciliation-checklist.mjs --month N` (per-month checklist). All read-only.*
