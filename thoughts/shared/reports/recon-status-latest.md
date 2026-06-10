# Recon Status — mirrored Xero state

Generated: 2026-06-10T19:23:25.972Z
Accounts (two-account rule): NAB Visa ACT #8815 · NJ Marchesi T/as ACT Everyday

> CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth.

## 1. Reconcile state (AUTHORISED, per account x FY26 quarter)
| bank_account | quarter | unreconciled_n | unreconciled_total | reconciled_n | reconciled_total |
|---|---|---|---|---|---|
| NAB Visa ACT #8815 | Q1 | 0 | $0 | 420 | $278,627 |
| NAB Visa ACT #8815 | Q2 | 125 | $138,519 | 494 | $428,449 |
| NAB Visa ACT #8815 | Q3 | 69 | $41,076 | 412 | $244,176 |
| NAB Visa ACT #8815 | Q4 | 50 | $28,430 | 273 | $173,330 |
| NJ Marchesi T/as ACT Everyday | Q1 | 0 | $0 | 84 | $506,076 |
| NJ Marchesi T/as ACT Everyday | Q2 | 47 | $372,517 | 32 | $276,858 |
| NJ Marchesi T/as ACT Everyday | Q3 | 39 | $243,227 | 0 | $0 |
| NJ Marchesi T/as ACT Everyday | Q4 | 22 | $129,623 | 0 | $0 |

_CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth._

## 2. Untagged genuine SPEND (type='SPEND', project_code null/empty)
| quarter | n | total |
|---|---|---|
| Q2 | 57 | $35,265 |
| Q3 | 4 | $1,497 |
| Q4 | 8 | $2,692 |

## 3. Receipts
### SPEND by has_attachments, per quarter
| quarter | has_attachments | n | total |
|---|---|---|---|
| Q1 | false | 258 | $169,830 |
| Q1 | true | 149 | $90,128 |
| Q2 | false | 253 | $96,898 |
| Q2 | true | 340 | $337,139 |
| Q3 | false | 201 | $6,857 |
| Q3 | true | 268 | $120,112 |
| Q4 | false | 186 | $27,010 |
| Q4 | true | 128 | $81,434 |

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
| Q4 | 1 | 2 | $2,142 |

## 5. Match targets (AUTHORISED ACCPAY bills awaiting payment)
| n | total | with_receipt |
|---|---|---|
| 312 | $503,126 | 305 |

## 6. Freshness (per account)
| bank_account | max_date | max_updated | rows_24h | rows_7d | state | hours_since |
|---|---|---|---|---|---|---|
| NJ Marchesi T/as ACT Everyday | 2026-06-05 | 2026-06-09T02:00:08.819042+00:00 | 0 | 46 | STALE | 41.4 |
| NAB Visa ACT #8815 | 2026-06-08 | 2026-06-10T02:38:51.224588+00:00 | 3 | 640 | fresh | 16.7 |

**⚠️ STALE: NJ Marchesi T/as ACT Everyday — newest updated row is 41.4h old (>26h threshold). Mirror may be behind Xero.**
