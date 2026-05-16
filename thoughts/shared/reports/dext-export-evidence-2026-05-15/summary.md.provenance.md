# Provenance - Dext Export Evidence Import
Report: thoughts/shared/reports/dext-export-evidence-2026-05-15/summary.md
Generated: 2026-05-15T07:48:56.732Z
Command: node scripts/import-dext-export-evidence.mjs /Users/benknight/Code/act-global-infrastructure/Dext/nicholas-marchesi-2026-05-15.csv --files-dir /Users/benknight/Code/act-global-infrastructure/Dext/nicholas-marchesi-2026-05-15 --apply
## Queried Sources
- Local Dext CSV export
- Local Dext PDF/JPG export directory
- Supabase Storage bucket receipt-attachments
- public.finance_receipt_documents
## Verified
- CSV parse count, valid row count, local file matching count.
- Supabase upload/upsert counts from script execution.
## Unknown / Not Checked
- Xero UI reconciliation status.
- Whether each Dext item is still unpublished inside Dext.
- BAS lodgement figures.