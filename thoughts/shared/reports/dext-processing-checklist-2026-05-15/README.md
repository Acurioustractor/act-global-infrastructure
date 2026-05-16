# Dext Processing Checklist - 2026-05-15

Purpose: one open-on-screen list for deciding what to process now, what to review first, and what not to touch in bulk.

Source files:
- `thoughts/shared/reports/receipt-close-queue-2026-05-15/strict-dext-backed-unreconciled.csv`
- `thoughts/shared/reports/xero-reconciliation-review-2026-05-15/ready-evidence-queue.csv`
- `thoughts/shared/reports/dext-routing-pack-2026-05-15/dext-supplier-routing.csv`

## Rule

Dext is receipt/OCR evidence. Xero is accounting state. Do not bulk publish historical Dext items unless the bank line, receipt, and Xero target are clear.

## A. Safe First Batch

These are the safest rows to work through first because they are small, Dext-backed, and currently have no known Xero target conflict in the strict close queue.

Action: visually confirm the receipt image in Dext/Supabase, then reconcile/create in Xero UI if the bank line exactly matches. Do not bulk publish.

- [ ] Q2 - 2025-12-23 - Bank St + Co - `$67.70` - Dext vendor `BANK ST AND CO` - receipt date `2025-12-22`
- [ ] Q2 - 2025-12-04 - Liberty Idalia - `$61.42` - Dext vendor `Liberty Idalia` - receipt date `2025-12-03`
- [ ] Q2 - 2025-12-02 - Good Morning Coffee - `$55.96` - Dext vendor `Hermit Park - Good Morning Coffee` - receipt date `2025-12-01`
- [ ] Q2 - 2025-12-17 - Duyu Coffee Roasters - `$22.26` - Dext vendor `DuYu Coffee` - receipt date `2025-12-16`
- [ ] Q3 - 2026-03-25 - Jasna Chalet Resort - `$22.28` - Dext vendor `JASNA CHALET RESORT` - receipt date `2026-03-24`

## B. Review First, Then Process One By One

These have Dext receipts, but are too large, project-specific, or ambiguous for batch processing.

Action: confirm project, business purpose, GST/tax treatment, and Xero state before doing anything.

- [ ] Q2 - 2025-12-01 - Kennards Hire - `$3,745.00` - Dext vendor `Kennards Hire` - no Xero target
- [ ] Q2 - 2025-12-24 - Defy Design - `$3,598.09` - Dext vendor `Defy` - no Xero target
- [ ] Q3 - 2026-01-21 - Sunshine Coast Regional - `$1,738.03` - Dext vendor `Sunshine Coast Council` - no Xero target
- [ ] Q3 - 2026-01-13 - Hydraulink Brisbane - `$883.07` - Dext vendor `Hydraulink Brisbane North` - no Xero target
- [ ] Q3 - 2026-01-08 - Maleny Hardware - `$507.51` - Dext vendor `Maleny Hardware And Rural Supplies` - no Xero target
- [ ] Q3 - 2026-02-03 - Ti Tree Roadhouse - `$133.02` - Dext vendor `Ti Tree Roadhouse` - no Xero target
- [ ] Q3 - 2026-01-22 - Maltek - `$119.00` - Dext vendor `The Trustee For Maltek Trust` - no Xero target

## C. Do Not Batch - Amount Mismatch

These already point at a Xero invoice/payment signal, but the bank-line amount does not match the payment amount. Bulk processing would likely create a wrong reconciliation or duplicate.

Action: open Xero and inspect the bill/payment. Do not publish from Dext until the mismatch is explained.

- [ ] Q2 - 2025-12-12 - Bunnings - bank `$548.81`, Xero payment `$44.96` - Dext vendor `Bunnings Warehouse`
- [ ] Q2 - 2025-12-03 - Good Morning Coffee - bank `$138.20`, Xero payment `$48.17` - Dext vendor `Hermit Park - Good Morning Coffee`
- [ ] Q2 - 2025-11-11 - BP Alice Springs - bank `$110.94`, Xero payment `$165.02` - Dext vendor `BP`

## D. Do Not Batch - Invoice Exists But No Reconciled Payment

These likely have bills or invoices in Xero already. Publishing from Dext again could create phantom payables.

Action: use Xero Find & Match or inspect the existing bill first. Only attach evidence or reconcile against the existing bill if correct.

- [ ] Q2 - 2025-12-24 - Telford Smith Engine - `$19,800.00` - Dext vendor `Telford Smith Engineering`
- [ ] Q2 - 2025-12-01 - Airbnb - `$4,621.18` - Dext vendor `Airbnb`
- [ ] Q2 - 2025-12-15 - Budget Rent A Car - `$177.36` - Dext vendor `Budget`
- [ ] Q3 - 2026-03-27 - Maleny Hardware - `$113.40` - Dext vendor `MALENY HARDWARE & RU`

## E. Do Not Batch - Duplicate Xero Target

These map to the same Xero bank transaction target. That means the match is not unique.

Action: inspect in Xero UI and pick the correct line manually. Do not publish or auto-match these.

- [ ] Q2 - 2025-12-04 - Bunnings Garbutt - `$2,885.90` - Dext vendor `Bunnings Warehouse`
- [ ] Q2 - 2025-12-03 - Bunnings Burdell - `$632.52` - Dext vendor `Bunnings Warehouse`
- [ ] Q2 - 2025-12-04 - Bunnings Garbutt - `$131.58` - Dext vendor `Bunnings Warehouse`

## F. Future Auto-Publish Candidates Only

These are not a historical cleanup batch. They are candidates for future Dext supplier rules after three clean test publishes each.

Action: start with auto-publish off, test three receipts, sync Xero, then enable only if no duplicate/phantom bill appears.

- [ ] OpenAI - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Anthropic / Claude.AI - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Supabase - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Webflow - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Vercel - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Railway Corporation - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Bitwarden - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] HighLevel - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Dext Software - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Notion Labs - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Firecrawl - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Cognition AI - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] X Global LLC - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Google / Google Australia - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] RealtimeBoard - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`
- [ ] Shipstation - `485 - Subscriptions` - `ACT-IN` - `R&D supporting`

## G. Never Auto-Publish

- [ ] Unknown supplier
- [ ] Blank supplier
- [ ] Zero total
- [ ] Refund-only or negative amount
- [ ] Foreign currency unless exactly matched
- [ ] Personal/reimbursement
- [ ] Duplicate image or duplicate Dext receipt ID
- [ ] Already reconciled in Xero
- [ ] Large asset or capital item
- [ ] Insurance or rates needing GST/stamp-duty split
- [ ] Anything over `$500` unless it is proven recurring SaaS

## Verification Status

verified: The strict 22-row queue was read from `strict-dext-backed-unreconciled.csv`.

verified: The safe first batch is the subset of strict rows with Dext evidence, no known Xero target, and low amount/low accounting risk.

inferred: Safety classification is based on mirror data and queue categories, not live Xero UI clicks.

unverified: No live Dext publish, Xero reconcile, or Xero attachment upload has been performed from this checklist.
