---
title: Entity migration truth-state — 19 days to cutover, Pty Xero not yet live, D&O overdue
summary: Third pass of the ACT Alignment Loop (Q3), 2026-06-11. 19 days to cutover. ABN issued (confirmed from test-invoice runbook). Pty Xero not yet open as of 2026-06-01. D&O insurance 18 days past its 30-day deadline. Receivables cleared $333K. Novation letters not sent. Critical path compressing.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-06-11
---

# Entity migration truth-state — 2026-06-11

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Sources: the 10-section + §11 decisions checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, transactions, bank lines, tenant state), `thoughts/shared/drafts/**`, and `thoughts/shared/plans/**`. Prior pass: [[entity-migration-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **19 days to cutover.** The baseline was 67 days. 48 days have passed since the first synthesis. The plan's "Week 5-6" actions (novation letters to all funders, IP assignment deed) were due by approximately 2026-05-22. None of these are evidenced as complete.

2. **ABN likely issued.** The `2026-06-01-pty-test-invoice-runbook.md` document includes `ABN 36 697 347 676` in the invoice template — a specific nine-digit number that would only be written once the ABN was granted. This is the first positive evidence that the Pty ABN has been received. However, the runbook's status is "ready to run ONCE Pty Xero + NAB are live" with all prerequisites unchecked as of 2026-06-01.

3. **Pty Xero file not yet open.** Only one `xero_tenant_id` in the DB: `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` (sole trader, now 2,227 invoices). The test-invoice runbook (2026-06-01) explicitly lists "Pty Xero file open, chart of accounts + tracking categories ported" as an unchecked prerequisite. 10 days ago, the Pty Xero was not live. With 19 days to cutover, this is the single most critical open item.

4. **D&O insurance is 18 days past the standard 30-day deadline.** Registered 2026-04-24. Standard practice = bind within 30 days = deadline 2026-05-24. Today is 2026-06-11. No ACCPAY from any insurance broker exists in Xero (zero results for any insurer name search). This has been flagged as the most time-critical governance risk in every prior pass. The window has now expired. Directors are either insured off-books (no Xero evidence) or uninsured.

5. **Novation letters not sent.** The novation template from `thoughts/shared/drafts/novation-letter-templates.md` was drafted at the 2026-05-14 pass and has not been superceded by a sent-batch artefact. Novation letters depend on ABN + bank details — if the ABN is now confirmed and the NAB account is live, the blocking condition may be met. If Pty Xero is opening this week, letters can go out before 30 June. Time is very tight.

6. **Significant Xero data work has happened since the last pass.** Between 2026-05-17 and 2026-06-01, five new plans were created for Xero cleanup: `xero-pushback-dedicated-session.md` (2026-05-18), `xero-close-the-loop.md` (2026-05-29), `xero-source-of-truth-goods-ledger.md` (2026-05-30), and a Pty test-invoice runbook (2026-06-01). The apply-goods-bookkeeper-corrections script was used successfully to void/recode Xero entries. This is real progress on data quality — necessary for the Standard Ledger mapping review — but it does not substitute for the Pty Xero file being open.

7. **Outstanding receivables dropped $333K.** Total ACCREC outstanding: $164,250 (from $497,240 at baseline). Snow paid $132K. Centrecorp voided $84.7K (decision finally made). PICC voided $96.8K. Sonas paid $37.3K. Aleisha reduced by $6.3K. SMART + John Villiers paid. This is the most positive financial signal in the entire alignment loop.

---

## Items × evidence × risk — updated

Days until 30 June 2026 cutover: **19 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-05-14 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Still unverified in any artefact | ⚠️ UNVERIFIED | → unchanged |
| ABN application (Pty) | `2026-06-01-pty-test-invoice-runbook.md` quotes "ABN 36 697 347 676" in template | 🟡 LIKELY ISSUED — unconfirmed in DB | 🆕 evidence surfaced |
| GST registration (Pty) | Paired with ABN | 🟡 LIKELY ISSUED | 🆕 |
| Standard Ledger briefed | 2026-05-05 meeting documented; ongoing engagement | ✅ DONE | → |
| Shareholders Agreement | No draft found in drafts/ or plans/ | 🔴 NOT STARTED/LATE | → unchanged |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | bank_statement_lines data only to 2026-03-31; no Pty account visible but gap may be data lag | 🔴/🟡 UNKNOWN (data stale) | → cannot confirm |
| Stripe account (Pty) | No artefact | 🔴 OPEN | → |
| Auto-debits audit + migrate | No consolidated list | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 tenant only (sole trader, 2,227 invoices); runbook prereqs unchecked 2026-06-01 | 🔴 OPEN/CRITICAL | → still not open |
| Pty Xero launch playbook | `new-entity-xero-launch-playbook.md` exists | ✅ ARTEFACT READY | → |
| Pty test-invoice runbook | `2026-06-01-pty-test-invoice-runbook.md` — awaiting Pty Xero + NAB | 🟡 READY TO EXECUTE | 🆕 new since last pass |
| Xero data quality (tag push-back) | `2026-05-29-xero-close-the-loop.md`, pushback sessions planned | 🟡 IN PROGRESS | 🆕 active work |
| Final sole trader BAS (Q4 FY26) | Q4 runs Apr–Jun, due 28 July | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders

#### Outstanding receivables (updated)

| Counterparty | Invoice | Amount | Status | Age | Change |
|---|---|---:|---|---:|---|
| **Rotary eClub** | INV-0222 | $82,500 | AUTH | **428d** | 🔴 +29d, no action, cutover 19d |
| **Homeland School** | INV-0303 | $44,000† | AUTH | 24d | ⚠️ possibly phantom — verify |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 177d | 🟢 partial payment, one invoice remains |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 57d | → no change |
| **Aleisha J Keating** | INV-0238..0274 | $5,850 | AUTH (×13) | varies | 🟢 14 invoices paid since last pass |
| **Snow Foundation** | INV-0321 | — | PAID | — | 🟢 PAID 2026-05-22 |
| **Centrecorp Foundation** | INV-0314 | — | VOIDED | — | 🟢 DECISION MADE: voided 2026-05-22 |
| **PICC** | INV-0317+0324 | — | VOIDED | — | 🟢 VOIDED |
| **Sonas Properties** | INV-0328 | — | PAID | — | 🟢 PAID |
| **TOTAL OUTSTANDING** | | **$164,250†** | | | ↓ −$333K from last pass |

†Homeland School $44K may be a phantom — confirm before reporting true outstanding.

#### Novation work

| Item | Evidence | Status | Change |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` | 🟡 DRAFTED (still pending send) | → unchanged — blocking on Pty bank details |
| Novation letters to funders | None sent; blocking on ABN + NAB bank details | 🔴 NOT SENT | → |
| Funders to novate | Snow (PAID — notify only), QBE (Pty), Paul Ramsay, Dusseldorp, etc. | 🟡 PARTIALLY RESOLVED | 🟢 Snow paid simplifies novation |

### Section 5 — Commercial contracts

All items remain 🔴 NOT STARTED. 19 days.

| Item | Status |
|---|---|
| Innovation Studio novation letters | 🔴 NOT STARTED |
| JusticeHub partnerships | 🔴 NOT STARTED |
| Goods on Country buyer relationships | 🔴 NOT STARTED |
| Harvest lease (Harvest subsidiary name) | 🟡 DECISION MADE (D11.1); subsidiary not yet incorporated |
| Farm lease (Nic ↔ Pty) | 🔴 NOT STARTED |

### Section 6 — IP

All items remain 🔴 NOT STARTED.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| **Directors & Officers** | **~2026-05-24** | 🔴 **DEADLINE PASSED — 18 DAYS AGO** | ↓ no binding evidence in Xero |
| Public Liability $20M | Before Harvest lease | 🔴 NOT STARTED | → |
| Professional Indemnity | 1 July 2026 | 🔴 NOT STARTED | → |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Insurance broker selection | Was "Week 1" | 🔴 NOT STARTED | → |

**⚠️ D&O note:** The absence of an ACCPAY insurance invoice doesn't definitively prove no policy exists (could be billed on annual cycle not yet in Xero, or arranged by Standard Ledger off-books). But it is the absence of evidence after 48 days. Ben needs to confirm whether a D&O policy has been bound or not. If yes, get the policy number. If not, bind immediately.

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED/LATE (was due Week 1-2) | → unchanged |
| Pty minute book | 🟡 UNVERIFIED | → |
| ASIC first annual review | ⏳ NOT YET DUE (April 2027) | → |

### Section 9 — Subscriptions and tooling

| Item | Status | Change |
|---|---|---|
| Pty Xero file | 🔴 OPEN/CRITICAL | → |
| Full subscription audit | 🟡 DATA AVAILABLE | → |
| All SaaS transfers | 🔴 NOT STARTED | → |

### Section 10 — Communications

All items correctly deferred to Week 9-10. With cutover 19 days away, these are now 1-2 weeks out.

### Section 11 — 2026-05-05 Standard Ledger decisions

| Decision | Status | Change |
|---|---|---|
| D11.1 — Harvest subsidiary structure draft | 🟡 NEW PLANS: 2026-05-17 farm-harvest-goods-charity-alignment.md, 2026-05-26-harvest-stage-budget.md | 🆕 active planning |
| D11.1 — Harvest lease counterparty confirm | 🟡 BEING WORKED | → |
| D11.2 — Payroll setup on Pty Xero | ⏳ BLOCKED on Pty Xero | → |
| D11.2 — Director's loan accounts | ⏳ BLOCKED on Pty Xero | → |
| D11.2 — FY26 founder pay catch-up | 🔴 NOT STARTED | → |
| D11.3 — Dext per-project emails | 🔴 NOT STARTED | → |
| D11.4 — Clear untagged Xero queue (~246 items) | 🟡 IN PROGRESS (xero-pushback sessions) | 🆕 active work |
| D11.4 — Mapping export | ✅ DONE (D11.4 script run 2026-05-05) | → |
| D11.5 — Knight Photography Phase 1 invoice | 🔴 NOT EXECUTED | → |
| D11.5 — GST registration check for KP | 🔴 NOT STARTED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-05-14 |
|---|---:|---:|---|
| ✅ DONE | 6 | ~10% | → (no new items confirmed complete) |
| 🟡 IN PROGRESS / PARTIAL | 10 | ~17% | ↑ +2 (ABN likely issued; Harvest planning active) |
| 🔴 NOT STARTED / OPEN / LATE | 30 | ~52% | ↓ −2 (moved to IN PROGRESS) |
| ⏳ NOT YET DUE / BLOCKED | 12 | ~21% | → |
| **Total items tracked** | **~58** | | → |

---

## Cutover risk map — updated (19 days)

### 🚨 Red (would materially damage 1 July launch if not done TODAY)

1. **Pty Xero file opens** — 19 days to cutover. Every invoicing, payroll, bank-details-for-novation-letters, and subscriber-transfer item is blocked. This is THE blocking item. If it doesn't open this week, Rule 2 (cutover fallback) applies.
2. **Confirm D&O insurance status** — 18 days past standard deadline. Confirm with Ben whether it's been bound. If not, BizCover/BizSafe can issue D&O same-day online for a small tech company.
3. **Novation letters to funders** — can go out the moment ABN + NAB bank details are confirmed. Template is ready. If Pty Xero opens this week, letters can go to Snow (notification only), QBE (Pty already contracted), Paul Ramsay, Dusseldorp, any Commonwealth/state grants. Target: before 30 June.
4. **Rotary INV-0222 ($82,500 AUTH, 428 days)** — chase or write-off decision this week. Cannot go into the sole trader's FY26 close as unresolved.

### 🟠 Amber (must ship before 30 June)

5. **NAB Pty account** — if not yet live, apply immediately. BankStatementLines data is stale (to March); can't confirm from DB. Ben to check directly.
6. **Shareholders Agreement** — Rule 4 said Week 1-2 (overdue since 2026-05-08). Still no draft. With Minderoo paused this is less urgent than it was, but still a governance gap.
7. **IP assignment deed** — Week 4-5 per plan; now overdue.
8. **Harvest subsidiary incorporation + lease** — D11.1 decision made; active planning happening (2026-05-17 and 2026-05-26 plans). Needs to crystallise before cutover.
9. **Aleisha Keating retainer decision** — 13 weekly invoices outstanding. Does the retainer continue under the Pty from 1 July?
10. **Homeland School INV-0303 phantom** — verify + fix in Xero UI.

### 🟡 Yellow (recoverable post-cutover but best done by 30 June)

11. Email/website footer updates.
12. Announcement email.
13. Subscription billing transfers.
14. Stripe account for Pty.
15. GitHub org transfer.

### ⏳ Correctly post-cutover

- Sole trader ABN cancellation.
- FY26 R&D claim (lodge with sole trader tax return).
- FY27 R&D AusIndustry re-registration (post-1-July).
- ASIC annual review (2027).

---

## Open questions — carried forward

1. **Is the Pty ABN confirmed and the Pty Xero file opening this week?** The test-invoice runbook existence is evidence; the runbook's unchecked prerequisites (as of 2026-06-01) are the concern.
2. **Has the D&O policy been bound?** Deadline was 2026-05-24. If yes, confirm policy number. If no, bind today.
3. **Has the NAB Pty account been opened?** Bank data stale to March; can't confirm from DB.
4. **Shareholders Agreement** — has any lawyer been engaged?
5. **Rotary INV-0222 decision** — chase (contact: Pene Curtis, Greg Marlow) or write off?
6. **Homeland School INV-0303** — real invoice or phantom? Ben to verify.
7. **MRFF / Palmer conversation** — before 2026-06-26. Has pitch decisions #3 + #4 been settled with Nic?
8. **Knight Photography Phase 1 invoice ($100K)** — still unexecuted. Standard Ledger session planned but no evidence of execution.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | last_verified 2026-05-08 |
| DB | `xero_invoices` WHERE ACCREC AND AUTHORISED/DRAFT AND amount_due>0 | 2026-06-11 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-06-11 (1 tenant, 2,227 invoices) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-06-11 (data to 2026-03-31 only) |
| DB | Insurance broker ACCPAY search | 2026-06-11 — zero results |
| Drafts | `thoughts/shared/drafts/` listing | 2026-06-11 — no new migration drafts |
| Plans | `thoughts/shared/plans/` — new plan files | 2026-06-11 — 5 new relevant plans |
| Plan | `thoughts/shared/plans/2026-06-01-pty-test-invoice-runbook.md` | 2026-06-01 — ABN evidence |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-05-14|Q3 entity migration — 2026-05-14 prior pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[funder-alignment-2026-06-11|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-06-11|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
