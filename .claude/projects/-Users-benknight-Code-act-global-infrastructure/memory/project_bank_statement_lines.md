---
name: Bank Statement Lines System
description: Xero API cannot expose raw bank feed statement lines — only reconciled transactions. bank_statement_lines table in Supabase is the source of truth for ALL card charges.
type: project
---

Xero API blind spot discovered 2026-04-13: the BankTransactions endpoint only returns items that have been created/reconciled as transactions. Raw bank feed statement lines (unmatched charges sitting in the reconciliation queue) are invisible to the API. This means the entire BAS completeness pipeline, receipt matching, and financial reporting was running against a subset of actual spend.

**Why:** The NAB Visa card charges flow into Xero via bank feed, but ~35% of charges were never reconciled into transactions. The API showed $50k of spend when the card actually had $70k+ in a single quarter.

**How to apply:**
- `bank_statement_lines` table in Supabase (shared instance) is now the source of truth for card charges
- Q2 FY26 (Oct-Dec 2025): 914 lines ingested, 327 unreconciled ($320k debits)
- Scripts: `ingest-statement-lines.mjs` (manual JSON), `ingest-statement-lines-raw.mjs` (parses Xero UI paste)
- Data files: `data/statement-lines-oct-nov-2025.txt`
- BAS completeness should check statement lines, not xero_transactions
- Card ends in 1656, Xero account is "NAB Visa ACT #8815"
- All Mounty Yarns supplier charges (Kennards, Sand Yard, Container Options, Bunnings Minchinbury, Edmonds) were in the unreconciled pool
- Hatch Electrical charges ($27k Nov 24, $20k Nov 12, $3.7k Dec 12, $1.8k Oct 14) are Townsville PICC project, not Mounty
- Loadshift $1,243.59 on Oct 21 is container delivery for Mounty
