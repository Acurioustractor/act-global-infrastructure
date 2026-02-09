# ACT Financial Controls

> **Status:** TEMPLATE - Ben to review and confirm
> **Last Updated:** January 2026

---

## Budget Approval Process

### Spending Authority

| Level | Amount | Approver | Documentation Required |
|-------|--------|----------|----------------------|
| Petty cash | < $100 | Any authorized person | Receipt only |
| Routine | $100 - $500 | Founder | Receipt + project code |
| Significant | $500 - $5,000 | Founder | Quote + written approval |
| Major | $5,000 - $20,000 | Founder + <!-- advisor --> | 2 quotes + written approval |
| Capital | > $20,000 | <!-- Board resolution --> | Business case + 3 quotes |

### Procurement Process

1. **Under $500:** Direct purchase, tag with project code in Dext
2. **$500 - $5,000:** Get quote, Founder approves via email/message, retain quote
3. **Over $5,000:** Minimum 2 competitive quotes, written approval, retain all quotes
4. **Over $20,000:** Formal tender or business case required

### Payment Methods

| Method | Use Case | Controls |
|--------|----------|----------|
| Business debit card | Day-to-day purchases | Single cardholder (Ben) |
| Bank transfer | Invoices, rent, large payments | Founder authorizes |
| Direct debit | Subscriptions, rent | Pre-approved recurring only |
| PayPal/Stripe | Online services | Linked to business account |

---

## Receipt & Expense Management

### Current Workflow

```
Purchase made
  → Receipt to Dext (scan/email/upload)
  → Dext OCR + categorize
  → Auto-publish to Xero (trusted suppliers)
  → OR manual review (new/large amounts)
  → Xero reconciliation (JAX auto-match or manual)
  → Project code tagged
```

### Rules

- **Every expense must have a receipt** (ATO requirement for claims > $82.50)
- **Every expense must have a project code** (ACT-XX format)
- **Dext supplier rules** auto-categorize trusted vendors
- **Weekly receipt review** (Monday) catches anything missed

### Receipt Retention

| Document | Retention Period | Storage |
|----------|-----------------|---------|
| Tax invoices/receipts | 5 years | Dext + Xero |
| Bank statements | 5 years | NAB + Xero |
| Grant agreements | 7 years after completion | <!-- TODO: digital location --> |
| Contracts/leases | 7 years after expiry | <!-- TODO: digital location --> |
| BAS lodgements | 5 years | Xero + ATO portal |

---

## Grant Financial Management

### Segregation

- Each grant tracked via **project code** (ACT-XX) in all systems
- Xero tracking categories align with project codes
- GHL pipeline tracks grant lifecycle (Research → Received → Acquitted)

### Grant Expenditure Rules

1. Expenses must align with grant agreement terms
2. All grant-funded expenses tagged with grant project code
3. Receipts retained for 7 years post-acquittal
4. No cross-subsidization between grants without written approval
5. Underspend reported to funder before reallocation

### Grant Reporting

- **Interim reports:** As per grant agreement schedule
- **Acquittal reports:** Within timeframe specified in agreement
- **Template:** See `docs/finance/grant-acquittal-template.md`

---

## Bank Account Reconciliation

| Task | Frequency | Responsible | Tool |
|------|-----------|-------------|------|
| Bank feed sync | Daily (auto) | Xero | NAB direct feed |
| Transaction matching | Weekly | Founder | Xero JAX + manual |
| Full reconciliation | Monthly | Founder / Bookkeeper | Xero |
| Receipt gap check | Weekly | Automated | `receipt-reconciliation-agent.mjs` |

---

## Payroll (if applicable)

| Requirement | Status | Notes |
|------------|--------|-------|
| Single Touch Payroll (STP) | <!-- TODO: N/A or Active --> | Required for all employers |
| Super Guarantee (11.5%) | <!-- TODO --> | Due 28th of month after quarter |
| Workers Comp | <!-- TODO --> | Required if employing |
| Fair Work compliance | <!-- TODO --> | Awards, rates, conditions |

---

## Fraud Prevention

| Control | Implementation |
|---------|---------------|
| Separation of duties | <!-- TODO: limited with small team --> |
| Bank account access | Founder only (confirm) |
| Xero access | <!-- Who has access? --> |
| Dext access | <!-- Who has access? --> |
| Regular review | Monthly bank reconciliation |
| Unexpected transactions | Flagged by receipt agent |

---

## Action Items

- [ ] Confirm spending thresholds are appropriate
- [ ] Document who has access to bank accounts
- [ ] Document who has access to Xero/Dext/GHL
- [ ] Confirm receipt retention policy
- [ ] Set up grant-specific tracking categories in Xero
- [ ] Review payroll obligations (if employing)
