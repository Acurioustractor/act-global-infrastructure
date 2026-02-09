# Grant Acquittal Report Template

> **Usage:** Copy this template for each grant acquittal. Fill in details from Xero + GHL.
> **Last Updated:** January 2026

---

## Grant Details

| Field | Value |
|-------|-------|
| **Grant Name** | <!-- e.g., First Nations Project Fund --> |
| **Funder** | <!-- e.g., Australia Council for the Arts --> |
| **Project Code** | <!-- e.g., ACT-PI --> |
| **Agreement Reference** | <!-- TODO --> |
| **Grant Amount** | $<!-- TODO --> |
| **Funding Period** | <!-- Start date --> to <!-- End date --> |
| **Acquittal Due** | <!-- Date --> |
| **Report Prepared By** | <!-- Name --> |
| **Date Prepared** | <!-- Date --> |

---

## Executive Summary

<!-- 2-3 paragraphs summarizing:
- What the grant funded
- Key outcomes achieved
- How funds were spent
-->

---

## Financial Summary

### Income

| Source | Amount | Notes |
|--------|--------|-------|
| Grant funds received | $<!-- TODO --> | <!-- Date received --> |
| Co-contribution (cash) | $<!-- TODO --> | <!-- If applicable --> |
| Co-contribution (in-kind) | $<!-- TODO --> | <!-- If applicable --> |
| Other income | $<!-- TODO --> | <!-- If applicable --> |
| **Total Income** | **$<!-- TODO -->** | |

### Expenditure by Category

| Category | Budget | Actual | Variance | Notes |
|----------|--------|--------|----------|-------|
| Personnel / Wages | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Artist / Facilitator Fees | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Travel & Accommodation | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Materials & Supplies | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Venue / Hire | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Technology / Software | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Marketing / Promotion | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Administration | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| Other | $<!-- TODO --> | $<!-- TODO --> | $<!-- TODO --> | |
| **Total Expenditure** | **$<!-- TODO -->** | **$<!-- TODO -->** | **$<!-- TODO -->** | |

### Variance Explanation

<!-- Explain any significant variances (typically > 10% of line item) -->

### Unspent Funds

| Amount Unspent | Reason | Proposed Action |
|---------------|--------|-----------------|
| $<!-- TODO --> | <!-- TODO --> | <!-- Return / Carry forward / Reallocate --> |

---

## Project Outcomes

### Deliverables

| Deliverable | Status | Evidence |
|------------|--------|----------|
| <!-- e.g., 10 community workshops --> | <!-- Complete / Partial / Not started --> | <!-- Attendance records, photos --> |
| <!-- e.g., Exhibition of 20 artworks --> | <!-- TODO --> | <!-- TODO --> |
| <!-- e.g., Digital storytelling platform --> | <!-- TODO --> | <!-- TODO --> |

### Impact Metrics

| Metric | Target | Actual | Source |
|--------|--------|--------|--------|
| Participants | <!-- TODO --> | <!-- TODO --> | <!-- Attendance records --> |
| Stories collected | <!-- TODO --> | <!-- TODO --> | <!-- Empathy Ledger --> |
| Community events | <!-- TODO --> | <!-- TODO --> | <!-- Calendar records --> |
| Artworks created | <!-- TODO --> | <!-- TODO --> | <!-- Portfolio --> |
| Employment created | <!-- TODO --> | <!-- TODO --> | <!-- Payroll records --> |

### ALMA Impact Score (if applicable)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Agency | <!-- /10 --> | <!-- TODO --> |
| Legacy | <!-- /10 --> | <!-- TODO --> |
| Momentum | <!-- /10 --> | <!-- TODO --> |
| Accountability | <!-- /10 --> | <!-- TODO --> |
| **Overall** | **<!-- /10 -->** | |

---

## Qualitative Outcomes

### Participant Feedback

<!-- Include 2-3 quotes or summary of feedback -->

### Community Impact

<!-- Describe broader community impact beyond direct participants -->

### Lessons Learned

<!-- What worked well, what would you change -->

---

## Attachments Checklist

- [ ] Certified financial statement (if required by funder)
- [ ] Bank statements for funding period
- [ ] Receipts/invoices for all expenditure (in Dext/Xero)
- [ ] Participant attendance records
- [ ] Photos/documentation of activities
- [ ] Media coverage (if any)
- [ ] Letters of support / testimonials
- [ ] ALMA impact assessment (if applicable)

---

## Declaration

I certify that the information in this acquittal report is true and correct, and that the grant funds were used in accordance with the grant agreement.

**Name:** <!-- TODO -->
**Position:** <!-- TODO -->
**Date:** <!-- TODO -->
**Signature:** _______________

---

## How to Generate This Report

### From ACT Systems

```bash
# Pull financial data for project code
node scripts/unified-search.mjs --project ACT-XX --from YYYY-MM-DD --to YYYY-MM-DD

# Export Xero transactions by tracking category
# (Use Xero Reports → Tracking Summary for the project)

# Pull grant pipeline status from GHL
# (Check GHL → Opportunities → filter by grant name)
```

### From Empathy Ledger (impact data)

```bash
# Story count and participant data
# Query Supabase: SELECT count(*) FROM stories WHERE project_code = 'ACT-XX'
```
