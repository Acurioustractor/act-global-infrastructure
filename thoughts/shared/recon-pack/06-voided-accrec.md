# 06 — Voided & Deleted Sales Invoices (ACCREC)

**Recon/recode prep pack — section 06**
Org: sole-trader "Nicholas Marchesi" (tenant `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`)
Period: 2025-10-01 → 2026-03-31 (Q2+Q3 FY26)
Scope: `xero_invoices` where `type='ACCREC'` AND `status IN ('VOIDED','DELETED')` AND `date` in period.
Generated: 2026-05-29. Data source: Supabase `tednluwflfhxyucgwigh`, READ-ONLY.

---

## Headline

| Status | Count | Total |
|---|---|---|
| VOIDED | 22 | $401,200.00 |
| DELETED | 1 | $53,900.00 |
| **Total** | **23** | **$455,100.00** |

**Bottom line for SL/Ben:** None of these are lost revenue or bad debt. Every one is either (a) a recurring weekly invoice template that was voided because the customer paid against the bank line directly, not the invoice (Aleisha Keating, 14 rows), or (b) a grant/sales invoice that was re-priced, re-scoped, or consolidated and **re-issued** to the same funder (Centrecorp, Just Reinvest, PICC). Total amount is $0 paid / $0 due on all 23 — they never hit the ledger as receivables. **No recode action needed on the voided/deleted rows themselves**; the live receivables are the separate PAID/AUTHORISED invoices listed under each contact below.

The $0 amount_paid / $0 amount_due on all 23 confirms nothing was reconciled to a void/deleted invoice — there is no orphaned payment to chase.

---

## Group A — Benign (recurring-invoice churn). 14 rows, $6,300.

### Aleisha J Keating — 14 × $450 weekly, all ACT-FM (farm)

| Date | Invoice# | Amount |
|---|---|---|
| 2025-10-03 | INV-0279 | $450 |
| 2025-10-10 | INV-0280 | $450 |
| 2025-10-17 | INV-0281 | $450 |
| 2025-10-24 | INV-0284 | $450 |
| 2025-10-31 | INV-0285 | $450 |
| 2025-11-07 | INV-0287 | $450 |
| 2025-11-14 | INV-0288 | $450 |
| 2025-11-21 | INV-0290 | $450 |
| 2025-11-28 | INV-0293 | $450 |
| 2025-12-05 | INV-0294 | $450 |
| 2025-12-12 | INV-0300 | $450 |
| 2025-12-19 | INV-0305 | $450 |
| 2025-12-26 | INV-0306 | $450 |
| 2026-01-02 | INV-0307 | $450 |

**Proposed reason:** Recurring weekly invoice (repeating template, ACT-FM). The same $450 weekly pattern runs back to July 2025 as AUTHORISED (INV-0238…INV-0274). Bank shows Keating RECEIVE lines in the period at *irregular* amounts ($147.50–$900, project ACT-BV/ACT-FM), **not** flat $450 — i.e. she pays variable amounts and the deposits are reconciled directly against the bank statement, leaving the auto-generated $450 invoices to be voided as unmatched. Classic repeating-invoice-vs-direct-payment churn.
**Confidence:** High.
**Evidence:** 13 prior AUTHORISED $450 weekly invoices (Jul–Sep 2025, same `ACT-FM` code); 12 reconciled RECEIVE bank lines for Keating in/around period at non-$450 amounts.
**Action:** None. If SL wants tidy AR, suggest switching off / deleting the repeating-invoice template so Xero stops auto-raising $450 weekly.

---

## Group B — Needs awareness, but explained (grant re-issue / re-scope). 9 rows, $448,800.

### Centrecorp Foundation — 5 rows in period ($357,500 VOIDED + $53,900 DELETED = $411,400). All ACT-GD (Goods).

| Date | Invoice# | Amount | Status | Line-item gist |
|---|---|---|---|---|
| 2025-11-26 | INV-0292 | $53,900 | DELETED | "Weave Bed v2.3 — Central Australia Pilot" + workshop |
| 2026-02-13 | INV-0311 | $68,200 | VOIDED | "100 Beds — Tennant Creek" + workshop |
| 2026-02-13 | INV-0312 | $68,200 | VOIDED | (duplicate draft) |
| 2026-02-13 | INV-0313 | $68,200 | VOIDED | (duplicate draft) |
| 2026-02-13 | INV-0315 | $68,200 | VOIDED | (duplicate draft) |
| 2026-02-27 | INV-0310 | $84,700 | VOIDED | "Goods Production Plant Part 1 — 6-month trial" (mobile container plastic-processing unit rental + transport/install) |

**Proposed reason:** Iterative grant-invoice drafting and re-pricing with the funder.
- **INV-0292 ($53,900 DELETED)** — dated the *same day* as PAID **INV-0291 ($85,712, "Utopia Homelands")**. The $53,900 was a "Central Australia Pilot" draft using the now-discontinued Weave Bed v2.3 line; deleted when the deal landed as the $85,712 Utopia invoice. Superseded draft.
- **4 × $68,200 (2026-02-13)** — four identical "100 Beds to Tennant Creek" drafts raised the same day = duplicate drafts created during invoice prep; only one was meant to issue.
- **$84,700 (INV-0310)** — re-scope from beds to the "Production Plant Part 1" container-rental model after Centrecorp's board pushed back (see Gmail evidence). Itself later re-issued (out-of-period: VOIDED INV-0314 $97,900 on 2026-05-22, VOIDED INV-0329 $61,050 / INV-0331 $106,150 / DELETED INV-0330 $33,000 on 2026-05-17 — the production-plant deal is still being re-priced as of late May 2026 and has **not yet landed as a PAID invoice**).

**Confidence:** High (duplicates + re-scope); the *final* landed amount is the open question.
**Evidence:**
- Line items (account 260 = sales/revenue) show the bed→production-plant narrative.
- Gmail thread "Tennant Creek Bed Funding" (Feb 2026, Randle & Jodie @ centrecorp.com.au ↔ nicholas@act.place): Randle 2026-02-05 — board "not… keen on funding the V.1 Goods beds again"; 2026-02-05 — board "very hesitant to fund what has already occurred [the 200 already-delivered beds]." This is exactly why the bed invoices were voided and re-pitched as a forward-looking production-plant rental.
- Centrecorp PAID history: INV-0259 $37,620 (Aug 2025), INV-0291 $85,712 (Nov 2025) — both ACT-GD, both reconciled. So Centrecorp *does* pay; these voids are negotiation drafts, not write-offs.

### Just Reinvest — 2 rows, $17,600 VOIDED. ACT-JH (JusticeHub).

| Date | Invoice# | Amount | Status | Line-item gist |
|---|---|---|---|---|
| 2025-12-11 | INV-0296 | $9,900 | VOIDED | "Phase #2 — operational planning, safety, youth engagement, procurement" |
| 2025-12-11 | INV-0297 | $7,700 | VOIDED | "Phase #3 — …same scope, next phase" |

**Proposed reason:** Phased invoices ($9,900 + $7,700 = $17,600) voided and **consolidated/re-issued** into the single PAID **INV-0295 $27,500** (2026-03-01), which carries a full line-item breakdown (project coordination, travel, flights, hardware, equipment hire, container fit-out). Re-issue/consolidation.
**Confidence:** High.
**Evidence:** INV-0295 is PAID $27,500 (amount_paid $27,500, ACT-JH); the voided phase invoices precede it and sum to less than the consolidated total (scope expanded). Same contact, same project.

### Palm Island Community Company (PICC) — 1 row, $19,800 VOIDED. ACT-PI.

| Date | Invoice# | Amount | Status |
|---|---|---|---|
| 2026-02-16 | INV-0317 | $19,800 | VOIDED |

**Proposed reason:** Re-issue / re-scope. PICC is a strong repeat payer — five PAID invoices in the prior 12 months totalling **$436,700** (INV-0231 $71,500, INV-0262 $68,200, INV-0263 $50,600, INV-0264 $81,400, INV-0286 $165,000). A small $19,800 invoice voided against that backdrop is almost certainly a corrected/re-issued line, not a cancelled deal. (Note: a later out-of-period PICC invoice INV-0324 $77,000 on 2026-04-08 is also VOIDED — same re-issue pattern continues.)
**Confidence:** Medium (no line-item or email pulled for INV-0317 specifically; inferred from PICC's strong paid history and the absence of any unmatched receivable).
**Evidence:** PICC paid-invoice history above, all ACT-PI, all reconciled. $0 paid/$0 due on INV-0317.

---

## Reconciliation cross-check summary

| Contact | Voided/deleted in period | Matching PAID/re-issued invoice | Verdict |
|---|---|---|---|
| Aleisha Keating | 14 × $450 = $6,300 | n/a — paid via bank against statement, not invoice | Benign churn |
| Centrecorp | $53,900 DEL + $357,500 VOID | INV-0291 $85,712 PAID (supersedes $53,900); $84,700 still being re-issued, not yet landed | Re-issue/re-scope |
| Just Reinvest | $9,900 + $7,700 VOID | INV-0295 $27,500 PAID (consolidates both) | Re-issue/consolidation |
| PICC | $19,800 VOID | $436,700 paid history; small corrected line | Re-issue (inferred) |

---

## Questions only Ben / SL can answer

1. **Centrecorp production-plant deal ($84,700 → re-priced to $97,900 / $61,050 / $106,150 across Feb–May 2026, none yet PAID):** Is this deal still live and expected to land, and at what final figure? It is the single largest unresolved revenue line touching this void list. If it lands, which invoice number is the live one so the rest stay voided cleanly?
2. **Aleisha Keating repeating template:** Should the weekly $450 ACT-FM repeating invoice be switched off in Xero (she clearly pays variable amounts via bank), to stop the ongoing void churn?
3. **PICC INV-0317 ($19,800):** Confirm this was a corrected/re-issued line and not a genuinely cancelled scope item — no line-item detail or email was located to nail it (Medium confidence only).
