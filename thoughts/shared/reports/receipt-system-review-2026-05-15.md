---
title: Receipt Matching System Review
status: Draft
date: 2026-05-15
type: finance-review
tags:
  - finance
  - receipts
  - xero
  - dext
  - bas
---

# Receipt Matching System Review

## Executive Diagnosis

The core problem is not that receipts are missing.

The core problem is that we have four different states being collapsed into one confusing UI:

1. Bank line state: the NAB Visa line exists in Xero and may or may not be reconciled.
2. Evidence state: a Dext, Gmail, Xero Me, or manual receipt file exists in Supabase.
3. Xero accounting target state: Xero has a bill, spend-money transaction, expense, or bank transaction ID that can receive an attachment.
4. Attachment state: the receipt file is actually attached to the correct Xero object.

When those are not separated, the system says things like "covered", "uploaded", or "reconciled" even when the next action is still unclear. That is why it feels wrong and slow.

The simplified model should be bank-line-first:

> One bank line, one best evidence file, one Xero accounting target, one next action.

## Verified Live State

These figures came from live Supabase queries on 2026-05-15.

### Receipt Email / Evidence Import State

| Source and status | Rows | With file | With Xero target | What it means |
|---|---:|---:|---:|---|
| `dext_import / uploaded` | 1,550 | 1,549 | 1,539 | Dext export evidence has mostly been imported and linked to a Xero-ish target. |
| `gmail / uploaded` | 255 | 255 | 255 | Gmail receipts that already reached upload/target state. |
| `gmail / review` | 179 | 66 | 0 | Gmail has useful candidates but many are not yet resolved to a Xero target. |
| `gmail / matched` | 126 | 0 | 126 | Old pipeline matched metadata but lacks attachment files. This explains why the old uploader finds nothing ready. |
| `xero_me / uploaded` | 110 | 110 | 110 | Xero Me receipts exist in the mirror, but some may still be draft/expense workflow rather than bank-feed reconciled. |

### Evidence Coverage By Quarter

Source: `v_finance_bank_line_evidence`.

| Quarter | Status | Count | Value |
|---|---:|---:|---:|
| Q2 | `covered_legacy` | 488 | $256,175.22 |
| Q2 | `no_receipt_needed` | 361 | $39,795.87 |
| Q2 | `uncovered` | 15 | $17,813.23 |
| Q2 | `covered_evidence` | 3 | $4,439.82 |
| Q2 | `candidate` | 4 | $1,791.94 |
| Q2 | `high_confidence_candidate` | 1 | $348.41 |
| Q3 | `covered_legacy` | 354 | $134,759.80 |
| Q3 | `uncovered` | 35 | $24,109.26 |
| Q3 | `no_receipt_needed` | 271 | $8,761.04 |
| Q3 | `candidate` | 7 | $5,588.82 |
| Q3 | `high_confidence_candidate` | 2 | $220.62 |
| Q3 | `covered_evidence` | 1 | $99.08 |

This confirms Q2 is mostly an evidence-linking and final Xero-state problem. Q3 still has more genuine missing/unresolved evidence.

### Approved Evidence Target Problem

Source: `finance_receipt_bank_line_links`, `finance_receipt_documents`, and `bank_statement_lines`.

| Metric | Value |
|---|---:|
| Approved evidence links | 684 |
| Approved links with files | 674 |
| Approved links with a Xero target | 278 |
| Approved links with no Xero target | 406 |
| Value of approved links with no Xero target | $266,461.04 |

This is the most important blocker.

It means receipts are approved, but the system often does not know the exact Xero object to attach them to. We can see the receipt, but cannot safely upload it to Xero until we know the correct Xero transaction/bill/spend-money ID.

### Xero Attachment State

Source: `xero_transactions`.

| Type | Reconciled | Has attachment | Count | Value |
|---|---|---|---:|---:|
| Spend | false | true | 92 | $51,950.87 |
| Spend | true | false | 428 | $45,571.13 |
| Spend | true | true | 380 | $167,811.89 |

This shows Xero already has a lot of attached receipts, but many reconciled spend transactions still have no attachment in the mirror.

It also explains why the upload bridge found zero new ready uploads: the rows that had target IDs were already attached in Xero, while the rows with files mostly lacked target IDs.

## What Worked

1. Dext export import worked.

The Dext CSV and PDF/JPG export are being imported into `finance_receipt_documents`, with local files stored into the receipt attachment store.

2. Gmail import worked partially.

Gmail has produced both receipt files and metadata candidates. However, older matched Gmail rows often have no file attached, so they cannot be uploaded to Xero.

3. Xero sync is mostly working.

The mirror has invoices, transactions, payments, attachments, and Xero Me records. This is enough to reason about many rows without clicking around blindly.

4. The evidence hub worked as a candidate engine.

It found a large amount of Dext, Gmail, Xero bill, Xero transaction, Xero Me, and manual upload evidence.

5. The stricter Xero upload bridge worked correctly.

It refused to upload receipts where there was no exact Xero target, and it verified that target rows already had attachments in Xero.

6. The receipt preview UI made evidence visible.

Seeing the image/PDF beside the bank line is the right direction. The preview bugs are UI bugs, not a reason to abandon the evidence model.

## What Is Wrong

### 1. We have too many overlapping scripts

There are multiple generations of receipt scripts:

- old receipt email uploader
- evidence hub
- Dext import
- close queue
- Xero upload bridge
- reconciliation report
- Xero mirror sync

Some operate on old `receipt_emails` rows. Some operate on the newer canonical `finance_receipt_documents` model. That creates contradictory answers.

Decision: the canonical model should be `finance_receipt_documents` plus `finance_receipt_bank_line_links`. The old `receipt_emails` uploader should be treated as legacy unless it is explicitly migrated.

### 2. "Covered" does not mean "ready to reconcile"

A bank line can be covered by receipt evidence but still not be ready for Xero upload or reconciliation.

Examples:

- Receipt file exists, but no Xero transaction ID exists.
- Receipt matches the vendor/date/amount, but Xero has not created the spend-money or bill object yet.
- Xero has a suggested green match, but the contact is wrong.
- Dext has a receipt, but publishing it may create a duplicate unpaid bill.

The UI should stop using one badge for all of this.

### 3. Xero suggested matches are not trustworthy

We saw wrong matches such as a local merchant bank line being suggested against unrelated SaaS payments. Xero green does not mean correct.

Rule: never accept Xero match suggestions unless vendor, amount, date, and business meaning all make sense.

### 4. Reconciled mirror state is not enough

Some `bank_statement_lines.status = reconciled` rows did not have a reliable `xero_transaction_id` in our mirror. That means a row can look reconciled while still not being attachable by API.

This is either a bank-feed mirror limitation, a parser/import status issue, or a missing reconciliation mapping from Xero.

Decision: do not use `bank_statement_lines.status` alone as the source of truth for "we can attach a receipt".

### 5. Dext can make the ledger worse if used blindly

For old card spend, Dext publishing can create bills or expenses that are not the actual bank-feed transaction. That causes:

- duplicate spend
- phantom payables
- wrong GST timing
- more Xero reconciliation work

For legacy cleanup, Dext should be evidence-first unless publish mode is explicitly confirmed and safe.

### 6. The UI currently starts from too many places

We have:

- receipt evidence page
- projects page
- Xero UI reconciliation page
- Dext UI
- Gmail
- local Downloads
- generated CSV reports

That is why the workflow feels like spinning.

The operator should only need one queue: the next bank line.

## Why It Takes So Long

1. Xero's bank-feed reconciliation is UI-first.

The API can sync transactions, invoices, payments, and attachments. It cannot safely click through bank-feed reconciliation for us without using the UI, and using the UI changes accounting state.

2. Receipt evidence often exists before the Xero target exists.

If the bank line has not been reconciled or if the Xero Me expense is still draft, there is no final transaction to attach the receipt to.

3. Dext, Xero Me, Gmail, and Xero all represent different objects.

A receipt in Xero Me draft is not the same as a reconciled bank transaction. A Dext item is not the same as a Xero bank transaction. A Gmail attachment is not the same as an approved expense.

4. Similar vendors create false positives.

Qantas, Virgin, Uber, Bunnings, Booking.com, Squarespace, Webflow, Anthropic, OpenAI, and recurring SaaS have many similar receipts. Amount/date/vendor-only scoring creates bad candidates unless document reference and file text are checked.

5. Under-threshold logic conflicts with "maximum BAS recovery".

Under $82.50 can be sufficient from the bank line for many GST-inclusive purchases, but if the receipt exists we still want it. The system needs to separate:

- "receipt legally required"
- "receipt useful and available"
- "GST claim safe"
- "bookkeeper review needed"

6. We have not had a single source of next action.

Every row should answer one question: what is the next safest action?

## Simpler Operating Model

### The New Queue Buckets

Every bank line should be classified into exactly one next action:

1. `reconcile_now_no_receipt_needed`

Low value, transfer, fee, repayment, tax, drawing, or otherwise safe without extra receipt evidence.

2. `reconcile_now_receipt_seen`

Receipt preview is correct, amount/date/vendor make sense, and the Xero action is create or match.

3. `find_receipt`

No evidence file exists, or the current candidate is wrong.

4. `reject_bad_candidate`

There is a candidate, but the receipt is clearly for the wrong date, wrong vendor, wrong trip, wrong amount, or wrong person.

5. `xero_target_missing`

Receipt is approved, but there is no Xero transaction ID yet. Reconcile/create in Xero first, then sync, then attach.

6. `upload_attachment`

Receipt is approved and the exact Xero target exists, but Xero has no attachment.

7. `bookkeeper_review`

Unclear tax treatment, personal/business split, R&D treatment, related party, assets, loan, transfer ambiguity, duplicate bill, or BAS-sensitive item.

### The One-Page Human Workflow

For each Xero page:

1. Paste the visible Xero rows into the agent.
2. Agent checks Supabase evidence and returns a table with one action per row.
3. Ben only clicks rows marked safe.
4. Agent records rejected candidates so they stop coming back.
5. After a batch, sync Xero, then upload attachments only where target IDs exist.

No Gmail search unless the queue says `find_receipt`.

No Dext publish unless the queue says `safe_dext_publish` and we have confirmed Dext publish mode.

No Xero green match unless the row says `match_verified`.

### What The UI Should Become

The finance UI should be a bank-line workbench:

| Column | Meaning |
|---|---|
| Bank line | date, vendor, amount, card/account |
| Xero state | unreconciled, reconciled, target known, target missing |
| Evidence state | no evidence, candidate, approved file, attached in Xero |
| Best file | preview image/PDF, open large, OCR text if available |
| Next action | one of the seven buckets above |
| Accounting coding | account, tax rate, project, R&D tag |
| Human controls | approve, reject, upload, mark no receipt, bookkeeper review |

This means the operator does not need to understand the pipeline. They only need to trust the next-action badge.

## Immediate Fix List

### Fix 1: Stop trusting old "matched" rows without files

Rows in `receipt_emails` with `status = matched` but no file are not upload-ready. They should either be migrated to real `finance_receipt_documents` with files or hidden from the upload queue.

### Fix 2: Add rejection memory

When Ben says "this Qantas receipt is wrong" or "this Virgin receipt is wrong for Avis", the link should be marked rejected and excluded from future best-candidate scoring.

### Fix 3: Build a deterministic Xero target linker

Create a dry-run script that tries to fill missing Xero target IDs only when deterministic:

- exact amount
- same or close date
- same normalized vendor/contact
- unique candidate
- no duplicate target use
- not deleted
- not a different merchant

Anything else stays `xero_target_missing`.

### Fix 4: Replace broad candidate scoring with action scoring

Candidate score is not enough. The UI should show action confidence:

- safe to click OK
- safe to create BAS excluded
- needs receipt
- receipt approved, reconcile first
- upload attachment now
- bookkeeper decision

### Fix 5: Make Dext legacy cleanup evidence-first

For the current sole trader cleanup, Dext should not auto-create bills unless a row is explicitly approved. Old Dext exports should be used to prove receipt coverage and attach evidence, not to create duplicate accounting objects.

### Fix 6: Keep Xero Me separate from Xero reconciled state

A Xero Me receipt in draft is captured evidence. It is not reconciled accounting state until approved and matched to the bank line.

### Fix 7: Add a weekly capture loop

Weekly process:

1. Import Dext export.
2. Sweep Gmail receipt searches for known suppliers.
3. Pull Xero Me drafts.
4. Run evidence hub.
5. Review only `find_receipt`, `reject_bad_candidate`, and `bookkeeper_review`.
6. Reconcile safe bank-line queue in Xero.
7. Sync Xero and upload attachments.

## What To Do Next

The next engineering task should not be "find more receipts".

The next engineering task should be:

1. Build the bank-line action queue.
2. Add reject-link memory.
3. Build deterministic Xero target linking as dry-run first.
4. Show one row-level instruction for the Xero page paste workflow.

After that, the Xero process becomes:

> Paste page -> receive safe rows and hold rows -> click safe rows -> sync -> attach -> repeat.

## Grill-Me Decision

Question 1:

Should the system be bank-line-first or receipt-first?

Recommended answer:

Bank-line-first.

Reason:

The bank line is the accounting event that must be reconciled in Xero. Receipts are evidence. Dext, Gmail, Xero Me, and local uploads are sources of evidence, not the source of accounting truth. If we stay receipt-first, we keep creating duplicate bills, wrong matches, and phantom payables. If we go bank-line-first, every receipt has a job: prove and attach to the exact bank line or be rejected.

