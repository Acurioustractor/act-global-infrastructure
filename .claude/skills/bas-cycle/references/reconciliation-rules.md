# Reconciliation Rules — When a Transaction Doesn't Need a Receipt

This is the rulebook the completeness classifier uses to decide when a SPEND transaction falls into `NO_RECEIPT_NEEDED`. Update as new rules become clear.

---

## Rule 1: Bank fees (always no receipt)

**Match pattern:** `contact_name` contains any of:
- `NAB Fee`
- `NAB International Fee`
- `NAB`
- `Bank Fee`
- `Merchant Fee`
- `Dishonour Fee`
- `Service Fee`

**Reason:** Bank fees are system-generated, no separate receipt exists. The bank statement IS the receipt.

**BAS treatment:** GST-free (bank charges are input-taxed).

---

## Rule 2: Bank transfers (no receipt, needs UI reconciliation)

**Match pattern:** `type IN ('SPEND-TRANSFER', 'RECEIVE-TRANSFER')`

**Reason:** Money moving between ACT's own bank accounts. Not an expense at all.

**BAS treatment:** Excluded entirely from G1/G11.

**Action:** These need manual "Transfer money" reconciliation in Xero UI to pair SPEND-TRANSFER + RECEIVE-TRANSFER counterparts.

---

## Rule 3: Owner drawings / BASEXCLUDED line items

**Match pattern:** All `line_items[]->>tax_type = 'BASEXCLUDED'`

**Reason:** Owner equity movements, not business expenses. Nicholas Marchesi drawings to NM Personal / NM Up account are tagged this way.

**BAS treatment:** Zero GST impact, excluded from G1/G11.

---

## Rule 4: Small GST-free below threshold

**Match pattern:** `abs(total) < $82.50` AND vendor has no known ACCPAY counterpart

**Reason:** Under $82.50 including GST, a tax invoice isn't required by the ATO (only a receipt). If even the receipt is lost, a credit card statement line is acceptable evidence for the input tax credit claim, provided the nature of supply can be reasonably identified.

**BAS treatment:** Can claim GST credit with just the bank line if the vendor is clearly a GST-registered business (check ABN on file).

**Caveat:** Only applies if the total is unambiguously inclusive-of-GST. For a claim to stand in audit, you still want either a receipt, the ABN, or a pattern of purchase that matches a GST-registered supplier.

---

## Rule 5: Credit notes / refunds (match to the original charge)

**Match pattern:** `type='RECEIVE'` AND `contact_name` matches a recent `SPEND`

**Reason:** A refund reverses a prior expense. No separate receipt needed — the ORIGINAL receipt is what documented the transaction.

**Action:** Link the refund to the original charge via a note in the reference field.

---

## Rule 6: Duplicate/split purchases (one receipt, multiple bank lines)

**Scenario:** A single purchase gets split across multiple bank-fed lines (common with split-payment transactions, change, or tip additions).

**Example:** $100 meal with 10% tip = one $110 receipt, but the bank shows $100 + $10 as two lines.

**Action:** Use the same receipt for both lines in Xero — the idempotency check in `upload-receipts-to-xero.mjs` allows this via explicit filename override. Mark both lines as covered by one receipt.

---

## Rule 7: Contractor invoices (receipt IS the invoice PDF)

**Match pattern:** `type='SPEND'`, large amount (>$500), vendor is a known contractor/person

**Reason:** Contractor payments don't have a "receipt" — they have an invoice. The invoice PDF should be attached to the corresponding ACCPAY bill, and the bank SPEND reconciles against that bill.

**Action:** Check that an ACCPAY bill exists for the contractor at the right amount. If not, ask the contractor for their invoice PDF.

**BAS treatment:** GST credit claimable if contractor has ABN + is GST-registered.

---

## Rule 8: Recurring SaaS under $50/month with automatic receipts

**Match pattern:** vendor in the known-SaaS list (Stripe subscriptions, small tools), amount < $50

**Reason:** These vendors always email a receipt. If one is missing, it's a Dext filter issue, not a missing receipt. The receipt can be re-fetched from the vendor's billing portal OR from Gmail (deep search script will find it).

**Action:** Run `gmail-deep-search.mjs` first. If still missing, re-download from vendor portal.

---

## Rule 9: Known "write-off accepted" (per-quarter)

**Scenario:** Nic or the accountant has decided that certain categories of small losses are accepted as unclaimed.

**Pattern:** Lives in the retro file for each quarter. Example: "Q1 FY26 — accepted loss on <$10 Uber rides without Uber Business — 12 txns, total $87".

**Action:** Manually tag these in the completeness classifier. Add to the quarter's retro.

---

## The 7th path — genuinely missing

Anything that doesn't match rules 1-9 and isn't covered by paths 1-5 in the completeness model is **genuinely missing**. These go on the chase list:

1. Contact vendor for a duplicate receipt
2. Check vendor portal (Qantas, Uber Business, Stripe, etc.)
3. Check personal email + archives
4. If truly lost: calculate the opportunity cost (GST credit + R&D refund) vs effort to chase, and either journal-entry a small amount as loss or escalate.

---

## Updating these rules

When you discover a new edge case:
1. Add the rule here
2. Update `scripts/bas-completeness.mjs` to implement the classification
3. Re-run the classifier and verify the edge case is handled
4. Document in the next quarter's retro

Rules should never be invented during BAS prep to make the numbers look better — they should reflect the ATO's actual substantiation requirements and be defensible in audit.
