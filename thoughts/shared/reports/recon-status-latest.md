# Recon Status — mirrored Xero state

Generated: 2026-06-10T20:08:01.743Z
Accounts (two-account rule): NAB Visa ACT #8815 · NJ Marchesi T/as ACT Everyday

> CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth.

## 1. Reconcile state (AUTHORISED, per account x FY26 quarter)
| bank_account | quarter | unreconciled_n | unreconciled_total | reconciled_n | reconciled_total |
|---|---|---|---|---|---|
| NAB Visa ACT #8815 | Q1 | 0 | $0 | 420 | $278,627 |
| NAB Visa ACT #8815 | Q2 | 124 | $138,429 | 532 | $476,238 |
| NAB Visa ACT #8815 | Q3 | 68 | $41,069 | 521 | $274,878 |
| NAB Visa ACT #8815 | Q4 | 51 | $28,531 | 320 | $181,319 |
| NJ Marchesi T/as ACT Everyday | Q1 | 0 | $0 | 84 | $506,076 |
| NJ Marchesi T/as ACT Everyday | Q2 | 47 | $372,517 | 33 | $316,858 |
| NJ Marchesi T/as ACT Everyday | Q3 | 39 | $243,227 | 0 | $0 |
| NJ Marchesi T/as ACT Everyday | Q4 | 22 | $129,623 | 0 | $0 |

_CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth._

## 2. Untagged genuine SPEND (type='SPEND', project_code null/empty)
| quarter | n | total |
|---|---|---|
| Q2 | 74 | $37,828 |
| Q3 | 78 | $15,845 |
| Q4 | 30 | $6,098 |

## 3. Receipts
### SPEND by has_attachments, per quarter
| quarter | has_attachments | n | total |
|---|---|---|---|
| Q1 | false | 258 | $169,830 |
| Q1 | true | 149 | $90,128 |
| Q2 | false | 287 | $104,363 |
| Q2 | true | 340 | $337,139 |
| Q3 | false | 298 | $32,458 |
| Q3 | true | 268 | $120,112 |
| Q4 | false | 230 | $32,516 |
| Q4 | true | 129 | $81,535 |

_CAVEAT: xero_transactions.has_attachments drifts — refresh path is receipt_emails.status='uploaded'._

### receipt_emails by status
| status | n |
|---|---|
| uploaded | 1920 |
| review | 261 |
| matched | 140 |
| captured | 109 |
| junk | 75 |
| failed | 11 |
| skipped | 8 |

### receipt document tables
- finance_receipt_documents: 7172
- finance_receipt_bank_line_links: 4292

## 4. Duplicate radar ((date,total,bank_account) groups >1, AUTHORISED SPEND)
| quarter | dup_groups | txns_covered | total |
|---|---|---|---|
| Q1 | 9 | 19 | $6,275 |
| Q2 | 24 | 58 | $59,981 |
| Q3 | 10 | 24 | $12,760 |
| Q4 | 2 | 4 | $2,154 |

## 5. Match targets (AUTHORISED ACCPAY bills awaiting payment)
| n | total | with_receipt |
|---|---|---|
| 311 | $503,119 | 304 |

## 6. Freshness (per account)
| bank_account | max_date | max_updated | rows_24h | rows_7d | state | hours_since |
|---|---|---|---|---|---|---|
| NJ Marchesi T/as ACT Everyday | 2026-06-05 | 2026-06-10T20:01:14.054168+00:00 | 1 | 47 | fresh | 0.1 |
| NAB Visa ACT #8815 | 2026-06-10 | 2026-06-10T20:01:24.703892+00:00 | 229 | 834 | fresh | 0.1 |
