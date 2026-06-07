# For Standard Ledger — 6 duplicate bills in the locked period (FY26-Q1)

**Prepared:** 2026-05-29 · **From:** ACT (Ben) · **Status:** DRAFT — review then forward to Standard Ledger. Not yet sent.

## Context
On 2026-05-29 we cleared a batch of duplicate **AUTHORISED** bills that were shadowing already-PAID bills (phantom accounts payable). **20 were voided directly in Xero ($67,970.72).** Six more could **not** be voided because they are dated **on or before the period lock date (30-Sep-2025)** — Xero correctly refused with *"document cannot be edited… before the period lock date / end of year lock date."* These six sit in **FY26-Q1 (Jul–Sep 2025)**, which has a lodged BAS, so we have left them untouched for you to handle as a prior-period correction. **Total: $3,221.03.**

## The 6 duplicates (all AUTHORISED, never paid — no cash moved)
Each is an AUTHORISED bill that duplicates a separate PAID bill for the same vendor + exact amount. Void the AUTHORISED one; keep the PAID twin.

| Vendor | Amount | AUTHORISED bill (void this) | Date | PAID twin (keep) | Why it's a duplicate |
|---|---:|---|---|---|---|
| Bunnings Warehouse | $1,199.80 | [W266674593](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=f17812a9-4e07-4492-b587-7e9ad11bdd99) | 2025-07-08 | 8161/99809868 (2025-07-09) | exact-cent match, consecutive days (coded to acct 447 vs 446) |
| Palm Island Motel | $514.00 | [6D1D49DE4A**/RC**](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=503b4d00-d757-4fec-a858-f66fb8c07d0e) | 2025-09-02 | 6D1D49DE4A (2025-07-13) | same booking ref + "/RC" suffix (re-charge shadow) |
| Maleny Hardware | $497.48 | [RB18256538250](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=adc8c86f-9baf-4a53-a597-3c11df96a66b) | 2025-09-30 | 170210 (2025-10-04) | `RB…` = Dext/ReceiptBank auto-import shadowing the real invoice # |
| Maleny Hardware | $423.75 | [RB17644337340](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=db9b2797-54a8-4511-8ef5-3f69c3a88622) | 2025-07-31 | 157327 (2025-08-01) | same Dext-shadow pattern, next day, exact cents |
| Repco | $384.00 | [4120364586](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=4912fa8d-2030-4153-a80c-db48ce4b30b1) | 2025-09-13 | 412364586 (2025-09-13) | same day, ref differs by one digit (typo) |
| Virgin Australia | $202.00 | [7952110113630](https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=27c08325-0ec5-4d53-87f0-71095969fa63) | 2025-05-12 | GTNPUV (2025-05-12) | same day/amount; PAID twin carries the real desc ("Flight change B Knight MEL–BNE"), this is a blank shadow |

## What we need from you
These are **balance-sheet phantom AP** (overstated payables). Because they're **AUTHORISED and unpaid**:
- **If ACT's BAS is lodged on a CASH basis** (our BAS prep is cash-basis), these unpaid bills **did not affect the lodged FY26-Q1 BAS** — so voiding them has **no GST/BAS impact**, only a balance-sheet AP correction. In that case it's a simple lock-date adjustment + void, your call on process.
- **If lodged on an ACCRUALS basis**, each duplicate would have **overstated the GST credit (1B)** in the lodged quarter, so the correction needs to flow through a **credit note / prior-period adjustment on the next BAS**.

**Please advise the cleanest mechanism for your process** — we have deliberately **not** lifted the period lock ourselves (it protects a lodged period). Happy to action whatever you recommend on our side.

## Provenance
- Detection: `scripts/detect-finance-anomalies.mjs` → worklist `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`
- Live-Xero verification + side-by-side twin compare: `scripts/verify-void-worklist.mjs`, `scripts/compare-void-twins.mjs`
- The 20 voided + full before-state revert log: `scripts/output/void-dups-revert-1780048855209.json`
