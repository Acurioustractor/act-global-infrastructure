# Recon Status — mirrored Xero state

Generated: 2026-06-15T21:25:02.964Z
Accounts (two-account rule): NAB Visa ACT #8815 · NJ Marchesi T/as ACT Everyday

> CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth.

## 1. Reconcile state (AUTHORISED, per account x FY26 quarter)
unavailable: permission denied for function exec_sql

_CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth._

## 2. Untagged genuine SPEND (type='SPEND', project_code null/empty)
unavailable: permission denied for function exec_sql

## 3. Receipts
### SPEND by has_attachments, per quarter
unavailable: permission denied for function exec_sql

_CAVEAT: xero_transactions.has_attachments drifts — refresh path is receipt_emails.status='uploaded'._

### receipt_emails by status
unavailable: permission denied for function exec_sql

### receipt document tables
- finance_receipt_documents: unavailable: table absent
- finance_receipt_bank_line_links: unavailable: table absent

## 4. Duplicate radar ((date,total,bank_account) groups >1, AUTHORISED SPEND)
unavailable: permission denied for function exec_sql

## 5. Match targets (AUTHORISED ACCPAY bills awaiting payment)
unavailable: permission denied for function exec_sql

## 6. Freshness (per account)
unavailable: permission denied for function exec_sql
