# Tomorrow Close Workflow

Generated: 2026-05-15

Use this with:

- `queue.csv`
- `queue.json`
- `/finance/xero-page-copilot`
- Xero NAB Visa ACT #8815 Reconcile page

## Objective

Close as many Q2/Q3 bank-feed lines as safely possible without creating duplicate Dext bills, accepting wrong Xero matches, or losing receipt evidence.

## Hard Rules

1. Do not accept Xero green matches unless vendor, amount, date, and business meaning all line up.
2. Do not create duplicate spend when a Xero bill exists. Use Find & Match.
3. Do not publish old Dext items blindly.
4. Receipt evidence is not the same as Xero reconciliation.
5. After any Xero batch, rerun Xero sync before trying to attach receipts.

## Preflight

Run:

```bash
node scripts/sync-xero-to-supabase.mjs
node scripts/receipt-evidence-hub.mjs --quarters Q2,Q3 --apply
node scripts/build-bank-line-action-queue.mjs --quarters Q2,Q3
```

Then open:

```text
http://localhost:3002/finance/xero-page-copilot
```

## Page-At-A-Time Loop

1. Open Xero NAB Visa ACT #8815 Reconcile page.
2. Copy the visible page rows.
3. Paste into `/finance/xero-page-copilot`.
4. Process only low-risk rows first.
5. For every red/high-risk row, do not click OK. Add it to exceptions.
6. For every medium receipt row, open receipt evidence and approve/reject before acting.
7. After finishing the page, rerun Xero sync.
8. Run the attachment upload dry-run/check.
9. Repeat on the next Xero page.

## Action Meanings

| Action | Ben does | Codex does |
|---|---|---|
| `transfer` | Use Xero Transfer. | Verify after sync. |
| `create_low_value` | Click OK/Create only if account/tax/project are correct. | Track as no-receipt-needed/low-value. |
| `find_match_bill` | Use Find & Match, not Create. | Verify bill/attachment after sync. |
| `review_receipt_candidate` | Open receipt, approve or reject. | Remove rejected candidates from future best matches. |
| `xero_target_missing` | Reconcile/create in Xero if unreconciled. | After sync, attach approved receipt. |
| `upload_attachment` | No Xero UI action needed. | Run upload bridge. |
| `find_receipt` | Search/upload receipt or decide BAS excluded. | Search Gmail/Dext/manual sources. |
| `income_review` | Review refund/income treatment. | Include in bookkeeper pack if uncertain. |

## Starting Counts From Current Queue

| Bucket | Count | Value |
|---|---:|---:|
| `transfer` | 63 | $544,335.08 |
| `review_receipt_candidate` | 773 | $303,849.45 |
| `xero_target_missing` | 112 | $60,966.05 |
| `find_receipt` | 50 | $41,922.49 |
| `find_match_bill` | 54 | $33,843.81 |
| `income_review` | 28 | $12,261.79 |
| `create_low_value` | 161 | $11,252.56 |
| `attached_in_xero` | 52 | $9,208.58 |
| `already_done` | 324 | $5,980.96 |
| `upload_attachment` | 1 | $23.06 |

## Best Work Order

1. `transfer`: clear card repayments/internal transfers first.
2. `create_low_value`: clear simple under-threshold rows.
3. `find_match_bill`: use Find & Match for exact bill candidates.
4. `xero_target_missing`: reconcile/create rows that already have approved receipts.
5. `upload_attachment`: run after sync.
6. `review_receipt_candidate`: approve/reject evidence in batches.
7. `find_receipt`: leave as named chase list or BAS-excluded decision.

## Stop Conditions

Stop and ask Standard Ledger or hold for review if:

- vendor mismatch
- amount mismatch not explained by FX/card fee
- multiple matching bills
- personal/business split unclear
- R&D treatment unclear
- asset/capital treatment likely
- Dext-created bill looks duplicate
- Xero page and ACT mirror disagree

## Verification After Each Batch

Run:

```bash
node scripts/sync-xero-to-supabase.mjs
node scripts/build-bank-line-action-queue.mjs --quarters Q2,Q3
node scripts/upload-evidence-receipts-to-xero.mjs --quarters Q2,Q3 --check-xero
```

Only run `--apply` for attachment upload after reviewing the dry-run/check output.

## What Goes To Standard Ledger

- remaining `find_receipt` rows
- unresolved `income_review` rows
- Dext duplicate/phantom payable risks
- BAS-excluded decisions over threshold
- personal/drawings rows
- R&D support/review rows
- project tags with weak/default allocation

