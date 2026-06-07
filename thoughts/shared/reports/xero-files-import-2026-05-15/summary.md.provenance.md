# Provenance: Xero Files Receipt Import

Report: thoughts/shared/reports/xero-files-import-2026-05-15/summary.md
Generated: 2026-05-15T05:37:15.959Z

## Data Sources Queried
- Xero Files API `GET /Files`.
- Xero Files API `GET /Files/{FileId}/Content` for selected candidate files.
- Supabase `v_finance_bank_line_evidence` for missing/candidate bank-line vendors.
- Supabase `finance_receipt_documents` for existing imported Xero file IDs.

## Mutations
- Uploaded selected Xero Files content to Supabase Storage bucket `receipt-attachments`.
- Upserted selected rows into `finance_receipt_documents` with source `xero_files`.
- No Xero accounting or Files Library mutation was performed.

## Verified
- Xero file content downloads returned live file bytes.
- OCR/text extraction was performed locally using `pdftotext` and/or `tesseract`.

## Inferred
- Candidate selection is based on filename tokens overlapping missing bank-line vendor tokens.
- Extracted amount/date/vendor are local parser/OCR outputs and need human review before reconciliation.

## Unknown
- Whether each imported receipt is the correct receipt for a specific bank line until the receipt evidence hub scores and a human approves it.

## Reproduce
```bash
node scripts/import-xero-files-receipts.mjs --quarters Q2,Q3 --apply
```
