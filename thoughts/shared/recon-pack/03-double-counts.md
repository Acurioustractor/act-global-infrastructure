# 03 — Bill-vs-Payment Double-Counts (Q2/Q3 FY26)

**Date:** 2026-05-29 · **For:** Standard Ledger · **Status:** READ-ONLY investigation — nothing written to Xero.
**Org:** "Nicholas Marchesi" sole-trader, Xero `786af1ed-…` · **Period:** 2025-10-01 → 2026-03-31
**Source:** Supabase `tednluwflfhxyucgwigh` (`xero_invoices`, `xero_transactions`), SELECT-only.
**Companion:** `thoughts/shared/reviews/2026-05-29-standard-ledger-recon-recode-prep-pack.md` §C (Telford Smith), §B (bill-vs-payment risk note).

---

## The systemic problem (load-bearing finding)

Across the period there are **102 cases where an ACCPAY bill and a bank SPEND (ACT accounts) represent the same vendor/amount within ~1 day** — total **$320,206**.

The reason these are double-counts (not normal settlement) is the **account coding on the bank side**: the matching bank SPENDs are coded straight to **P&L expense accounts** (446 Materials, 493 Travel, 486 Sub-contractors, 432 Hire, 412 Consulting, 433 Insurance, 448), **not** to a payables/clearing account. So the same cost lands in the P&L twice — once via the bill's expense line, once via the bank spend's expense line. The bank spend should have been *reconciled against the open bill* (settling the payable), which would have netted the payable to zero with no second expense hit.

| Category | Pairs | Amount | Verdict |
|---|---|---|---|
| Matched bill↔SPEND, **SPEND coded to a P&L expense account** | **90** | **$272,797** | 🔴 **High-confidence double-count** — expense recorded twice |
| Matched bill↔SPEND, SPEND coded to clearing/transfer (acct 400 / 750) | 12 | ~$47,409 | 🟡 Lower confidence — likely a settlement booked to a clearing/spend account; verify, may NOT be a P&L duplicate |
| Exact duplicate **bills** (same contact+total+date, n>1) | 14 vendors | $60,047 excess | 🔴 / 🟡 — see sub-table |
| Exact duplicate **bank SPENDs** (same contact+total+date, n>1, ACT accts) | 1 | $19,800 excess | 🔴 Telford Smith only |

> **Total expense at risk of being overstated in the period: ~$272,797** (the 90 expense-coded pairs). Add the duplicate-bill excess that isn't already inside that figure (mostly the AUTHORISED/owing-twice cases — see notes) for the payables overstatement.

**Method:** normalized contact name (strip non-alphanumerics, case-insensitive) = exact match · `abs(total diff) ≤ $2` · `abs(date diff) ≤ 7 days` · `total > $200` · ACT bank accounts only (`NAB Visa ACT #8815`, `NJ Marchesi T/as ACT Everyday`) · **Qantas excluded** (same-day multi-leg clusters are legitimate). "Expense account" = any account code except clearing/owner/transfer codes (800/801/810/880/610/750/710/840/820/830) and the revenue/suspense code 400. Confidence is conservative.

---

## A. 🔴 Confirmed worked example — Telford Smith Engineering (ACT-IN)

One ~$19,800 engineering job recorded **four times** = $79,200 of bookings, ~$59,400 phantom:

| Kind | Status | Date | Amount | Account : tax | Attach? |
|---|---|---|---|---|---|
| BILL | PAID | 2025-12-22 | $19,800 | 400 : INPUT | yes |
| BILL | AUTHORISED (owing) | 2025-12-22 | $19,800 | 400 : INPUT | yes |
| SPEND | AUTHORISED | 2025-12-23 | $19,800 | **446** : INPUT | yes |
| SPEND | AUTHORISED | 2025-12-23 | $19,800 | **446** : EXEMPTEXPENSES | yes |

→ One real ~$19,800 cost. The duplicate **AUTHORISED bill** is a phantom payable (−$19,800 payables when voided). The **two bank SPENDs** are a literal double-payment ($39,600 left the bank). The PAID bill + one SPEND describe the same money in/out. **Mismatched tax codes** (INPUT vs EXEMPTEXPENSES) on the two SPENDs is itself a GST error. Verify against the actual Telford Smith invoice; if a single job, void the phantom bill, recover/credit one $19,800 payment, and fix the tax code.

---

## B. Bill-vs-payment double-count candidates ≥ $1,000 (top of 90)

`to_expense = yes` → SPEND hits a real expense account → high-confidence duplicate. `no` → SPEND hits clearing/400/750 → verify, may be a settlement.

| Vendor | Amount | Bill date / status | Pay date | SPEND acct | Conf. | Note |
|---|---|---|---|---|---|---|
| RNM Carpentry | $26,845.65 | 2025-11-11 AUTH | 2025-11-11 | 486 Sub-con | 🔴 High | Same-day. Bill still AUTHORISED + a card spend already out. ACT-OO. |
| Hatch Electrical | $19,947.13 | 2025-11-10 AUTH | 2025-11-11 | 486 Sub-con | 🔴 High | ACT-FM. Coded sub-con on bank, bill open. |
| Telford Smith | $19,800 ×2 | 2025-12-22 (PAID + AUTH) | 2025-12-23 | 446 Materials | 🔴 High | §A — quadruple-counted, 2 spends. |
| Oonchiumpa Consultancy | $19,305 | 2025-10-09 AUTH | 2025-10-09 | 486 Sub-con | 🔴 High | Same-day. ACT-OO. |
| 1300 Washer | $13,980 | 2025-12-15 AUTH | 2025-12-16 | 446 Materials | 🔴 High | Goods washing machines. Bill open + card spend. |
| Bionic Self Storage | $12,375 | 2025-12-28 PAID | 2025-12-29 | 750 (clearing) | 🟡 Verify | SPEND→750, likely a settlement not a 2nd expense. |
| Carla Furnishers | $11,180 | 2025-11-16 AUTH | 2025-11-17 | 446 Materials | 🔴 High | **Also a duplicate bill** (2× AUTH) — see C. Triple exposure. ACT-GD. |
| Sunshine Glamping Co | $9,250 | 2025-10-18 AUTH | 2025-10-19 | 432 Hire | 🔴 High | ACT-FM. |
| Defy | $8,686.98 | 2026-03-31 PAID | 2026-03-31 | 400 (suspense) | 🟡 Verify | SPEND→400; likely settlement. |
| RNM Carpentry | $6,865.65 | 2025-11-26 PAID | 2025-11-26 | 486 Sub-con | 🔴 High | ACT-OO. |
| Kennards Hire | $6,616 | 2025-12-07 AUTH | 2025-12-08 | 432 Hire | 🔴 High | Untagged. |
| Container Options | $5,802.50 | 2025-12-04 AUTH | 2025-12-05 | 750 (clearing) | 🟡 Verify | ACT-MY. |
| AAMI | $5,483.95 | 2025-12-26 AUTH | 2025-12-27 | 433 Insurance | 🔴 High | ACT-IN. |
| Centre Canvas & Upholstery | $4,715 | 2026-01-29 PAID | 2026-01-30 | 446 Materials | 🔴 High | ACT-IN. (Separate $10,285 dup bill — see C.) |
| Airbnb | $4,621.18 | 2025-11-27 PAID + 11-26 AUTH | 2025-11-27 | 493 Travel | 🔴 High | Two bills + spend. ACT-IN. |
| Carbatec Brisbane | $4,575.65 | 2026-01-05 PAID | 2026-01-06 | 446 Materials | 🔴 High | ACT-GD. |
| Total Tools East Brisbane | $4,546.55 | 2026-01-04 PAID | 2026-01-05 | 446 Materials | 🔴 High | Untagged. |
| RW Pacific Traders | $4,200 | 2026-01-05 PAID | 2026-01-06 | 446 Materials | 🔴 High | ACT-GD. |
| Kennards Hire | $3,745 | 2025-11-27 PAID | 2025-11-28 | 432 Hire | 🔴 High | Untagged. |
| Hatch Electrical | $3,677.34 | 2025-12-10 AUTH | 2025-12-11 | 486 Sub-con | 🔴 High | ACT-FM. |
| Defy | $3,598.09 | 2025-12-22 PAID | 2025-12-23 | 400 (suspense) | 🟡 Verify | ACT-GD. |
| Allclass | $3,536.35 | 2025-11-25 PAID | 2025-11-26 | 448 | 🔴 High | ACT-IN. |
| Defy | $3,260.63 | 2025-12-18 PAID | 2025-12-19 | 400 (suspense) | 🟡 Verify | ACT-GD. |
| Defy Manufacturing | $3,199.83 | 2025-12-18 AUTH | 2025-12-19 | 412 Consulting | 🔴 High | ACT-GD (note: bank coded 412, odd for a manufacturer). |
| Joseph Kirmos | $2,737.50 | 2025-12-03 AUTH | 2025-12-04 | 486 Sub-con | 🔴 High | Labour, ACT-GD. |
| Smartwood | $2,710.34 / $2,665.03 | 2026-01-06 PAID/AUTH | 2026-01-07 | 750 (clearing) | 🟡 Verify | ACT-HV. |
| Airbnb | $2,475.91 | 2025-11-10 PAID | 2025-11-11 | 493 Travel | 🔴 High | ACT-IN. |
| Carbatec Brisbane | $2,338.70 | 2026-01-05 AUTH | 2026-01-06 | 446 Materials | 🔴 High | ACT-GD. |
| Airbnb | $2,324.80 ×2 | 2025-11-25 AUTH | 2025-11-26 | 493 Travel | 🔴 High | **Also duplicate bill** (2× AUTH). ACT-IN. |
| Maleny Landscaping Supplies | $1,995 | 2026-03-16 PAID | 2026-03-16 | 446 Materials | 🔴 High | Same-day. |
| The Sand Yard | $1,968 | 2025-12-08 AUTH | 2025-12-09 | 446 Materials | 🔴 High | ACT-MY. |
| Allclass | $1,948.90 | 2025-11-25 AUTH | 2025-11-26 | 448 | 🔴 High | 2 matching spends. ACT-IN. |
| Defy | $1,894.10 | 2025-11-28 PAID | 2025-11-29 | 400 (suspense) | 🟡 Verify | ACT-GD. |
| Defy Manufacturing | $1,858.78 | 2025-11-27 AUTH | 2025-11-28 | 400 (suspense) | 🟡 Verify | ACT-GD. |

> A further ~57 expense-coded pairs sit between $200 and $1,000 (Defy, Airbnb, Allclass, Kennards, Carbatec, Bunnings, AGL, MALENY LANDSCAPING, Liberty Maleny, The Sand Yard, etc.). Same pattern: bill + same-amount card/bank spend 0–1 days later, coded to an expense account. They roll into the $272,797 total. Full per-line list reproducible from the query in §Reproduce.

**Pattern read:** The **Defy / Defy Manufacturing** matches almost all hit acct 400 (suspense/revenue) on the bank side, so they are most likely *payments settling the bills* booked to the wrong account, NOT P&L double-counts — treat Defy as 🟡 verify, lower risk. The **labour/sub-contractor and travel/materials** matches (RNM, Hatch, Oonchiumpa, Telford, Airbnb, Kennards, Carbatec, Allclass) hitting 486/493/446/432/433/448 are the genuine 🔴 double-counts.

---

## C. Exact duplicate BILLS (same contact + total + date, n>1)

These are two identical bills entered for one cost. Where both are AUTHORISED, payables are overstated; where one is PAID + one AUTHORISED, there's a phantom open payable (and often a matching duplicate payment — cross-check §B).

| Vendor | Amount | Date | n | Statuses | Project(s) | Excess | Note |
|---|---|---|---|---|---|---|---|
| Telford Smith Engineering | $19,800 | 2025-12-22 | 2 | AUTH + PAID | ACT-IN | $19,800 | §A — phantom payable. |
| Carla Furnishers | $11,180 | 2025-11-16 | 2 | AUTH + AUTH | ACT-GD | $11,180 | Both open + a card spend exists (§B). |
| Centre Canvas & Upholstery | $10,285 | 2026-03-31 | 2 | AUTH + PAID | ACT-IN | $10,285 | Period-end (31 Mar) — check it's not a deliberate accrual + payment. |
| Sophie Deirdre Hickey | $4,950 | 2026-03-20 | 2 | AUTH + PAID | (none) + ACT-HV | $4,950 | Labour. One untagged, one ACT-HV — likely same invoice entered twice. |
| Joseph Kirmos | $4,500 | 2026-03-29 | 2 | AUTH + PAID | (none) + ACT-HV | $4,500 | Labour, same pattern as Sophie. |
| Airbnb | $2,324.80 | 2025-11-25 | 2 | AUTH + AUTH | ACT-IN | $2,324.80 | Both open + matching card spend (§B). |
| Nicholas Marchesi | $1,974.50 | 2025-11-24 | 2 | AUTH + AUTH | ACT-IN | $1,974.50 | Related-party — verify intent. |
| Allclass | $1,587.45 | 2025-11-25 | 2 | AUTH + AUTH | ACT-IN | $1,587.45 | |
| Maleny Landscaping Supplies | $1,305 | 2026-03-17 | 2 | PAID + PAID | (none) | $1,305 | Both PAID — likely a true double-payment. |
| Sophie Deirdre Hickey | $1,140 | 2026-03-17 | 2 | AUTH + PAID | (none) + ACT-HV | $1,140 | |
| Cognition AI | $286.04 | 2026-03-04 | 2 | AUTH + AUTH | ACT-DO | $286.04 | SaaS — verify vs statement. |
| Cognition AI | $284.82 | 2026-02-04 | 2 | AUTH + AUTH | ACT-DO | $284.82 | SaaS. |
| Easel Software | $216.00 | 2026-01-26 | 2 | DRAFT + DRAFT | ACT-DO | $216.00 | Both DRAFT — delete one before approving. |
| Maleny Landscaping Supplies | $212.50 | 2026-03-06 | 2 | AUTH + AUTH | ACT-HV | $212.50 | |

**Duplicate-bill excess total: $60,046.61** (the value of one copy of each pair).

---

## D. Exact duplicate bank SPENDs (same contact + total + date, n>1, ACT accounts)

Only **one** vendor produces an exact same-day duplicate bank spend after excluding Qantas:

| Vendor | Amount | Date | Account | n | Excess |
|---|---|---|---|---|---|
| Telford Smith Engineering | $19,800 | 2025-12-23 | NJ Marchesi T/as ACT Everyday | 2 | $19,800 |

This is the second leg of the §A quadruple-count — a literal **double bank payment** of $19,800. (Note: SaaS micro-pairs like HighLevel / Supabase / Webflow from the prep pack §C3 fall below the $200 floor and are immaterial; not double-counts of bills.)

---

## E. Total at risk — summary

| Bucket | Amount | Confidence |
|---|---|---|
| Bill↔SPEND pairs with SPEND coded to a **P&L expense account** (90 pairs) | **$272,797** | 🔴 High — expense overstated, likely twice |
| Bill↔SPEND pairs with SPEND coded to clearing/suspense (400/750) (12 pairs, mostly Defy/Bionic/Smartwood) | ~$47,409 | 🟡 Verify — likely settlements, not P&L duplicates |
| Duplicate bills (excess copy) | $60,047 | 🔴/🟡 — payables/expense overstated |
| Duplicate bank spends (Telford only) | $19,800 | 🔴 Confirmed double-payment |
| **Headline expense-overstatement at risk** | **~$272,797** | conservative; Telford + dup-bill amounts partially overlap this figure |

The single biggest correction lever: **reconcile each matched bank SPEND *against* its open bill instead of expensing it** — that removes the second expense hit and clears the payable in one move, for ~$272,797 of the P&L.

---

## F. Question only Ben / SL can answer

1. **The Defy / Defy Manufacturing cluster** (~$22K across ~7 matches) — the bank spends hit acct **400** (suspense/revenue), not an expense account. Are these the *payments settling* the Defy bills (book to a clearing account, no P&L duplicate) or genuinely double-expensed? Defy's coding is inconsistent (one match even hit 412 Consulting for a manufacturer). SL needs to confirm Defy's intended treatment before netting.
2. **Telford Smith** — is it truly one ~$19,800 job (then void 1 bill + recover 1 payment) or two stages of a $39,600 job? Source invoice is attached in Xero.
3. **Centre Canvas $10,285 dup bill dated 31 Mar** — deliberate period-end accrual + its payment, or a genuine duplicate?
4. **Sophie Hickey / Joseph Kirmos labour dups** (one untagged + one ACT-HV each) — same invoice entered twice, or two separate engagements that happen to match amount+date?

---

*Reproduce (all read-only, Supabase `tednluwflfhxyucgwigh`):*
- *Bill↔SPEND match + expense-flag totals: the `bills`/`spends`/`matched` CTE in this session's queries (`abs(total diff)≤2`, `abs(date diff)≤7`, expense-account flag excludes 800/801/810/880/610/750/710/840/820/830/400).*
- *Duplicate bills / spends: `GROUP BY normalized_contact,total,date HAVING count(*)>1` on `xero_invoices` (ACCPAY) / `xero_transactions` (SPEND, ACT accts), Qantas excluded.*
- *Telford detail: filter both tables `lower(contact_name) LIKE '%telford%'`.*
