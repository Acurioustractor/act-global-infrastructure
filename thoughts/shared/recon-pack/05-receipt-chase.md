# 05 — Material Missing-Receipt Chase

**Scope:** 5 material line items flagged in the Standard Ledger recon/recode prep pack.
**Period:** 2025-10-01 .. 2026-03-31 (Q2+Q3 FY26). Xero org = sole-trader "Nicholas Marchesi" (tenant `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`).
**Method:** Cross-checked `xero_transactions` / `xero_invoices` against the receipt pipeline (`finance_receipt_documents`, `dext_receipts`, `receipt_status`, `receipt_matches`), then read-only Gmail searches for vendor invoices near each date.
**Confidence key:** Verified = queried the source directly · Inferred = derived · Unverified = taken on faith.
**Author:** recon-pack agent · 2026-05-29 · READ-ONLY (no DB/Xero/email writes).

---

## Summary table

| # | Item | Date | Amount | Project | Found? | Source of receipt | Recommended action |
|---|------|------|--------|---------|--------|-------------------|--------------------|
| 1 | Nicholas (R&D) | 2025-11-17 | $15,000 | ACT-CORE | **No receipt — none expected** | n/a (owner drawing, acct 880) | Pty salary / Director's-Loan structure, not a receipt |
| 2 | Nicholas (R&D) | 2025-11-21 | $6,159 | ACT-CORE | **No receipt — none expected** | n/a (owner drawing, acct 880) | Pty salary / Director's-Loan structure, not a receipt |
| 3 | Carla Furnishers | 2025-11-16 | $11,180 | ACT-GD | **FOUND** | Dext + Gmail, linked in Xero | Confirm attached on bank txn; resolve possible duplicate bill |
| 4 | Mounty Container Supplier | 2025-11-04 | $11,000 | ACT-CORE | **Genuinely MISSING** | none anywhere | Request invoice from Nic / vendor |
| 5 | Airbnb | 2025-11-25/26 | $2,324.80 | ACT-PI* | **FOUND** | Dext + Gmail, linked in Xero | None — receipt captured (confirm code RCHXXK2NSN) |

\* Brief listed Airbnb as ACT-IN dated 2025-11-25; the live bank txn is **ACT-PI**, dated **2025-11-26** (the Dext receipt itself is dated 2025-11-25/26). Flag the project-code discrepancy to SL.

---

## Item 1 — Nicholas $15,000 (2025-11-17, ACT-CORE, R&D-eligible)

- **Xero record (Verified):** `xero_transactions` id `9ab7b320-b0d6-4785-9406-24e04e55444a` — SPEND, AUTHORISED, "Nicholas", $15,000, bank **NJ Marchesi T/as ACT Everyday**, `rd_eligible=true`, `has_attachments=false`. Single line item posts to **account code 880** with a **blank description**.
  - Note: there is a *paired* `RECEIVE` of $15,000 same day (id `267e7a60…`, "Nicholas Marchesi") into the same account — i.e. money moved in then out. The R&D-eligible side is the SPEND.
- **Account 880 = equity/owner's-drawings**, not an expense account. This is a founder related-party transfer, not a vendor purchase.
- **Pipeline status (Verified):** `receipt_status` row marks this **`missing`**; `receipt_matches` marks it **`no_receipt_needed`** (the two pipelines disagree on labelling, but both agree no vendor receipt exists).
- **Gmail (Verified):** no vendor invoice — none can exist for an owner drawing.
- **Found?** No receipt, and none should be expected.
- **Recommended action:** Do **not** chase a receipt. This needs the **Pty salary / Director's-Loan structure** (per the 5 May Remco action items — $120K base + Director's Loan policy, retrospective reclassification of past txns as "on behalf of" the Pty). Substantiation for R&D is the founder-time methodology + Pty payroll record, not a tax invoice. **SL/Ben decision needed:** confirm whether $15K is treated as salary, loan repayment, or R&D contractor time, and document the basis contemporaneously.

## Item 2 — Nicholas $6,159 (2025-11-21, ACT-CORE, R&D-eligible)

- **Xero record (Verified):** `xero_transactions` id `a7b7c3c2-7a63-4276-b78b-bc4cf724c3fd` — SPEND, AUTHORISED, "Nicholas", $6,159, bank **NJ Marchesi T/as ACT Everyday**, `rd_eligible=true`, `has_attachments=false`. Single line item to **account code 880**, blank description. Same owner-drawing pattern as Item 1.
- **Pipeline status (Verified):** `receipt_status` = **`missing`**; `receipt_matches` = **`no_receipt_needed`**.
  - **Cross-reference worth noting:** a Dext receipt `Nicholas Marchesi - 2025-11-25 - INV-0248.pdf` (`finance_receipt_documents` id `0ff4c0ec…`, also `d7f92533…` status `matched`) is *linked to this transaction id*. It is dated 2025-11-25 with **no amount** populated and an unrelated value ($1,974.50 appears on the same INV-0248 elsewhere). This is a **mis-match in the pipeline**, not a real receipt for the $6,159 drawing — do not rely on it.
- **Gmail (Verified):** no vendor invoice — none can exist for an owner drawing.
- **Found?** No receipt, and none should be expected.
- **Recommended action:** Same as Item 1 — **Pty salary / Director's-Loan structure**, not a receipt. **SL/Ben decision needed:** classification + contemporaneous R&D basis. Also flag the spurious INV-0248 Dext link so it isn't used as "evidence".

## Item 3 — Carla Furnishers $11,180 (2025-11-16, ACT-GD)

- **Xero records (Verified):**
  - Bank txn `xero_transactions` id `1ee019e6-2d9e-41dd-a7f2-6a4325c4da46` — SPEND, $11,180, NAB Visa ACT #8815, **`has_attachments=true`**, ACT-GD.
  - **Two ACCPAY bills** same date/amount: `6a331d95…`? no — Carla bills are `6a60f4fd…` family: `6a…`(has_attachments=true) and `17c2ceb2…`(has_attachments=false). **Possible duplicate bill** (one of the pair is a likely double-entry).
- **Pipeline status (Verified — receipt EXISTS):**
  - `dext_receipts` / `finance_receipt_documents`: invoice **#25-00004816**, $11,180, filename `Carla Furnishers - 2025-11-17 - 25-00004816.pdf`.
  - Gmail message id **`dext-18710404390`** ("Receipt from Carla Furnishers"), attachment `dext-import/18710404390.pdf`; status **`uploaded_to_xero`** / **`linked_in_xero`** → Xero invoice `6a60f4fd-c99d-4bb2-9ad2-51f372958cbc`.
  - Also a `xero_files` copy `Carla-Furnishers-receipt.pdf` (file id `3b64610d-70d6-4429-a945-b6d092227790`, status `needs_review`).
- **Gmail (Verified):** receipt arrived via Dext (`dext-18710404390`); no separate direct-from-vendor thread needed.
- **Found?** **YES.** Receipt = invoice 25-00004816, link `dext-import/18710404390.pdf` (Xero invoice `6a60f4fd…`).
- **Recommended action:** No chase needed. **Reconciliation note for SL:** (a) confirm the receipt is attached to the **bank SPEND** row, not only the bill; (b) **resolve the duplicate** — there are 2 ACCPAY bills + 1 bank spend all at $11,180; only one expense belongs in ACT-GD. Likely the bill should net against the bank payment.

## Item 4 — Mounty Container Supplier $11,000 (2025-11-04, ACT-CORE)

- **Xero record (Verified):** `xero_invoices` id `6a331d95-982a-4bec-ad18-4f0cded5356a` — type **ACCPAY (bill)**, AUTHORISED, "Mounty Container Supplier", $11,000, dated 2025-11-04, **`invoice_number = null`**, **`has_attachments=false`**, **`amount_due = $11,000` / `amount_paid = $0`** → still **UNPAID**, project ACT-CORE.
- **Pipeline status (Verified — NOT FOUND):** No matching row in `finance_receipt_documents`, `dext_receipts`, `receipt_status`, or `receipt_matches` for this vendor/date/amount.
  - The only $11,000 receipt in the pipeline is **PORTABL INV00320** dated **2025-08-02** (`finance_receipt_documents` id `caa96636…`) — a **different vendor and date**; do not conflate.
  - A `receipt_matches` row of $11,000 dated 2025-05-21 is also unrelated (different date, `no_receipt_needed`).
- **Gmail (Verified):** searches for "Mounty"/"container supplier"/invoice surface only **"Mounty Yarns"** program/partnership threads (Dusseldorp / Just Reinvest / JusticeHub at Mt Druitt) — **no vendor invoice** for a container purchase. No supplier-invoice email exists.
- **Found?** **No — genuinely MISSING.** Hand-entered bill, no invoice number, no document, never paid.
- **Recommended action:** **Request the invoice from Nic / the vendor.** Open questions for Ben/SL:
  1. Is "Mounty Container Supplier" a real shipping-container vendor, or a placeholder/mis-named accrual related to the Mounty Yarns program? (The Gmail trail suggests Mounty = a JusticeHub program, which casts doubt on this being a genuine container-purchase bill.)
  2. Since `amount_due = $11,000` (unpaid), should this bill be **voided/deleted** rather than receipt-chased, if no goods were actually purchased? Verify before recoding.

## Item 5 — Airbnb $2,324.80 (2025-11-25/26, ACT-PI)

- **Xero record (Verified):** `xero_transactions` id `8998c6d0-39d0-4dc9-9013-4218deab7ee7` — SPEND, $2,324.80, NAB Visa ACT #8815, **`has_attachments=true`**, project **ACT-PI**, dated **2025-11-26**. (Brief said ACT-IN / 2025-11-25 — flag the code/date drift.)
- **Pipeline status (Verified — receipt EXISTS):**
  - Dext receipt **confirmation code RCHXXK2NSN**, $2,324.80, filename `Airbnb - 2025-11-26 - RCHXXK2NSN.pdf` (also `Airbnb-receipt.pdf`).
  - Gmail message id **`dext-18815550870`** ("Receipt from Airbnb"), attachment `dext-import/18815550870.pdf`; status **`uploaded_to_xero`** / **`linked_in_xero`** → Xero invoice `b0d2a0ed-519a-418e-bc2b-42110970cab3`.
  - Plus a `xero_files` copy `Airbnb-receipt.pdf` (status `needs_review`).
- **Gmail (Verified):** Airbnb receipts route through Dext (`dext-18815550870`); direct from-Airbnb search for the window returned nothing, consistent with Dext capture.
- **Found?** **YES.** Receipt = Airbnb confirmation RCHXXK2NSN, link `dext-import/18815550870.pdf` (Xero invoice `b0d2a0ed…`).
- **Recommended action:** No chase needed. **Note for SL:** there is a cluster of similar Airbnb charges in late Nov (151.11, 2,324.80, 4,621.18, 369.82) — each has its own Dext receipt; ensure the $2,324.80 bank SPEND is matched to the correct one (RCHXXK2NSN) and the ACT-PI vs ACT-IN coding is intentional.

---

## Net result

- **2 of 5 are founder related-party drawings** (Nicholas $15,000 + $6,159 = **$21,159**) posting to **equity account 880** — these need the **Pty salary / Director's-Loan structure + R&D founder-time substantiation**, not a receipt chase. Both flagged `missing` in the pipeline, which over-counts the "missing receipt" total.
- **2 of 5 are FOUND** (Carla Furnishers $11,180; Airbnb $2,324.80 = **$13,504.80**) — receipts are in Dext + Gmail and linked in Xero; only reconciliation hygiene remains (Carla duplicate bill; Airbnb correct-match + project code).
- **1 of 5 is genuinely MISSING** (Mounty Container Supplier **$11,000**, unpaid bill, no invoice number, no document, no email) — **request from Nic/vendor, and first confirm it's a real purchase** rather than a mis-named Mounty-Yarns-program accrual.

### Questions only Ben / Standard Ledger can answer
1. **Nicholas $15K + $6,159:** treat as salary, Director's-Loan repayment, or R&D contractor time? What is the contemporaneous R&D basis to substantiate the 43.5% claim on founder drawings?
2. **Mounty Container Supplier $11,000:** real container vendor or placeholder/mis-named Mounty-Yarns accrual? If no goods purchased, void the unpaid bill rather than chase a receipt.
3. **Carla Furnishers:** which of the 2 ACCPAY bills + 1 bank spend is the real expense (duplicate to remove)?
4. **Airbnb:** confirm ACT-PI is the intended project (brief said ACT-IN) and the $2,324.80 row matches confirmation RCHXXK2NSN.
