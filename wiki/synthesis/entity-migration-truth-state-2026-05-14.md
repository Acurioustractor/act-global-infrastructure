---
title: Entity migration truth-state — 47 days to cutover, decision-making accelerated, execution still light
summary: Second pass of the ACT Alignment Loop (Q3), 2026-05-14. 47 days to cutover. Standard Ledger meeting on 2026-05-05 produced 5 major decisions (D11.1–D11.5). ABN, NAB, and Pty Xero still unopened. D&O insurance deadline 10 days away. Novation templates drafted. Outstanding receivables reduced by $10K.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-14
---

# Entity migration truth-state — 2026-05-14

> Second pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Sources: the 10-section + §11 decisions checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, transactions, bank lines, tenant state), `thoughts/shared/drafts/**`, and `thoughts/shared/plans/**`. Baseline: [[entity-migration-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **47 days to cutover.** The baseline was 67 days. 20 days have passed. The plan's "Week 1" actions (NAB applied, Director IDs confirmed, ABN application filed, insurance brokers researched) were due by 2026-05-01. No DB evidence any of these have completed.

2. **Standard Ledger meeting 2026-05-05 produced five major structural decisions.** Section §11 was added to the checklist post-baseline:
   - **D11.1 — Harvest is a subsidiary**, not a project line. Separate Pty Ltd, Sonas principals as minority shareholders. Harvest lease in the subsidiary's name.
   - **D11.2 — Founder payroll:** $10K/month base salary + director's loan + EOY settle into bonus/dividend/trust.
   - **D11.3 — Dext per-project email forwarding** for top 12 codes.
   - **D11.4 — Sole trader → Pty mapping spreadsheet.** Script written 2026-05-05; 2,879 lines, 246 REVIEW rows.
   - **D11.5 — Knight Photography FY26 invoicing** (Option A confirmed).
   These decisions are important and well-documented. They do not yet show DB evidence of execution.

3. **ABN, NAB, and Pty Xero remain unopened.** Only one `xero_tenant_id` in the DB (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` = Nic's sole trader, now 2,094 invoices). Only one bank account (`NAB Visa ACT #8815`). Target dates for both were "Week 1-3 of the plan" — May 2026. We are in Week 3 with no signal.

4. **D&O insurance deadline is 10 days away.** Registered 2026-04-24. Standard practice is to bind D&O within 30 days of registration → deadline ~2026-05-24. No insurance broker ACCPAY invoice in Xero. No binding evidence anywhere. This is the most time-critical item on the whole checklist.

5. **Novation letter template is now drafted.** `thoughts/shared/drafts/novation-letter-templates.md` exists (was ZERO at baseline). Two templates — grant funders and commercial counterparties — with Standard Ledger review note. The funder batch can be sent once ABN + NAB bank details are confirmed. This is real progress.

6. **Outstanding receivables dropped $10,110: from $507,350 to $497,240.** Just Reinvest ($27,500) and Homeland School ($4,950) paid. PICC INV-0317 partial payment (-$16,500). New invoices added: Sonas Properties $37,290 (Harvest early-access), John Villiers Trust $1,200, Aleisha one more weekly ($450). Centrecorp $84,700 DRAFT unchanged — still no decision at 90 days.

---

## Items × evidence × risk — updated

Days until 30 June 2026 cutover: **47 days**.

### Section 1 — Entity setup

| Item | Evidence of completion | Status | Change since baseline |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | No evidence; was "unverified" at baseline | ⚠️ UNVERIFIED | → unchanged |
| ABN application (Pty) | No second xero_tenant, no ABN in DB | 🔴 OPEN/LATE | → target was "first week of May" — MISSED |
| GST registration (Pty) | Paired with ABN | 🔴 OPEN | → |
| Standard Ledger briefed | Confirmed; 2026-05-05 meeting held | ✅ DONE | ✅ meeting notes now captured in §11 |
| Shareholders Agreement | No draft found; Rule 4 says Week 1-2 | 🔴 OPEN/LATE | → target was "Week 2 signed" — MISSED |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | Only "NAB Visa ACT #8815" in bank_statement_lines | 🔴 OPEN/LATE | → target was "apply Week 1, onboarding in Week 2-3" |
| Stripe account (Pty) | No artefact | 🔴 OPEN | → |
| Auto-debits audit + migrate | No consolidated list | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 tenant only (sole trader) | 🔴 OPEN/LATE | → target "Week 3" now |
| Pty Xero launch playbook written | `thoughts/shared/plans/new-entity-xero-launch-playbook.md` | 🟢 ARTEFACT READY | 🆕 new since baseline |
| Final sole trader BAS (Q4 FY26) | Q4 runs Apr–Jun, due 28 July | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders

#### Outstanding receivables (updated)

| Counterparty | Invoice | Amount | Status | Age | Change |
|---|---|---|---:|---|---|
| **Snow Foundation** | INV-0321 | $132,000 | AUTH | date now 2026-05-22 | ⚠️ date changed |
| **Rotary eClub** | INV-0222 | $82,500 | AUTH | **399d** | 🔴 +20d, no action |
| **Centrecorp** | INV-0314 | $84,700 | **DRAFT** | **90d** | 🔴 +20d, no action |
| **PICC** | INV-0317 | $19,800 | AUTH | 87d | 🟢 partial payment −$16,500 |
| **PICC** | INV-0324 | $77,000 | AUTH | 36d | → |
| **Sonas Properties** | INV-0328 | $37,290 | AUTH | 8d | 🆕 NEW (Harvest subsidiary) |
| **Regional Arts Australia** | INV-0301/0302 | $33,000 | AUTH | 150d | → +21d |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 29d | → |
| **Aleisha J Keating** | INV-0238..0307 | $12,150 | AUTH (×27) | 7d–315d | ⚠️ now 27 inv, oldest 315d |
| **SMART Recovery** | INV-0322 | $2,200 | AUTH | 56d | → |
| **John Villiers Trust** | INV-0327 | $1,200 | AUTH | 11d | 🆕 NEW |
| **Just Reinvest** | INV-0295 | — | PAID | — | 🟢 PAID |
| **Homeland School** | INV-0303 | — | PAID | — | 🟢 PAID |
| **TOTAL OUTSTANDING** | | **$497,240** | | | ↓ −$10,110 from baseline |

#### Planned novation work

| Item | Evidence | Status | Change |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` | 🟡 DRAFTED (pending Standard Ledger review) | 🆕 progress from 0 |
| Novation letters to funders | None sent; template awaiting Standard Ledger review + ABN + bank details | 🔴 NOT SENT | → plan target: end May |
| Enumeration of active grants | Q1 synthesis enumerated funders; §4 above covers receivables | 🟡 PARTIAL | → |

### Section 5 — Commercial contracts

| Item | Status | Change |
|---|---|---|
| Innovation Studio novation letters | 🔴 NOT STARTED | → |
| JusticeHub partnerships | 🔴 NOT STARTED | → |
| Goods on Country buyer relationships (19 active) | 🔴 NOT STARTED | → |
| Harvest lease (in Harvest subsidiary name) | 🟡 DECISION MADE (D11.1); subsidiary not yet incorporated | 🆕 decision clarified |
| Farm lease (Nic ↔ Pty) | 🔴 NOT STARTED | → |

### Section 6 — IP

| Item | Status | Change |
|---|---|---|
| IP assignment deed (Nic → Pty) | 🔴 NOT STARTED | → |
| GitHub org transfer | 🔴 NOT STARTED | → |
| Trademark registration (EL, JH, ALMA, Goods) | 🔴 NOT STARTED | → |

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease | 🔴 NOT STARTED | → |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Professional Indemnity | 1 July 2026 | 🔴 NOT STARTED | → |
| **Directors & Officers** | ~**2026-05-24** (10 days) | 🔴 URGENT — no binding evidence | → deadline approaching |
| Cyber | Year 1 recommended | ⏳ DEFERRED | → |
| Insurance broker selection | Was "Week 1" | 🔴 NOT STARTED/LATE | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED/LATE (Rule 4 said Week 1-2) | → |
| Pty minute book | 🟡 UNVERIFIED | → |
| ASIC first annual review | ⏳ NOT YET DUE (April 2027) | → |

### Section 9 — Subscriptions and tooling

| Item | Status | Change |
|---|---|---|
| Pty Xero file | 🔴 OPEN/LATE | → |
| Full subscription audit | 🟡 DATA AVAILABLE | → |
| All other SaaS transfers | 🔴 NOT STARTED | → |

### Section 10 — Communications

All items remain 🔴 NOT STARTED — correctly deferred to Week 9-10 per the plan sequence.

### Section 11 — 2026-05-05 Standard Ledger decisions (NEW)

| Decision | Artefact | Status |
|---|---|---|
| D11.1 — Harvest subsidiary structure | Draft Harvest subsidiary structure doc | 🔴 NOT STARTED |
| D11.1 — Confirm Harvest lease counterparty | Per-session confirmation needed | 🟡 DECISION MADE, NOT EXECUTED |
| D11.2 — Set up payroll on Pty Xero | Blocked on Pty Xero | ⏳ BLOCKED |
| D11.2 — Open director loan accounts | Blocked on Pty Xero | ⏳ BLOCKED |
| D11.2 — Decide FY26 founder pay catch-up | Standard Ledger consultation | 🔴 NOT STARTED |
| D11.3 — Provision Dext per-project email addresses | No artefact | 🔴 NOT STARTED |
| D11.4 — Clear untagged Xero review queue (~246 items) | No signal | 🔴 NOT STARTED |
| D11.4 — Mapping export | **[x] DONE** — `scripts/export-sole-trader-to-pty-mapping.mjs`, 2,879 lines | ✅ DONE |
| D11.5 — Knight Photography Phase 1 invoice ($100K) | Plan at `thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md` | 🔴 NOT EXECUTED |
| D11.5 — GST registration check for Knight Photography | Standard Ledger to advise | 🔴 NOT STARTED |

---

## Status summary

| Status | Count | Share | Change from baseline |
|---|---:|---:|---|
| ✅ DONE | 6 | ~10% | ↑ +1 (mapping export D11.4) |
| 🟡 IN PROGRESS / PARTIAL | 8 | ~14% | ↑ +1 (novation template drafted) |
| 🔴 NOT STARTED / OPEN / LATE | 32 | ~54% | ↑ +4 (D11 items added, some Week 1-3 targets LATE) |
| ⏳ NOT YET DUE / BLOCKED | 12 | ~20% | → |
| **Total items tracked** | **58** | | ↑ +5 (D11 items added to scope) |

---

## Cutover risk map — updated

### 🚨 Red (would materially damage 1 July launch if not done)

1. **D&O insurance binding** — deadline ~2026-05-24 (10 days). No binding. No broker selected. If missed, Pty operates as a director-unprotected company from day one. Bind this week.
2. **ABN + GST rego** — "first week of May" target missed. Every downstream item (Pty Xero, NAB verification, first Pty invoice) is blocked. Escalate to Standard Ledger today.
3. **NAB business account (Pty)** — "apply this week" from 2026-04-24 = 20 days ago. No evidence of application. Blocks Stripe, subscriptions, bank details for novation letters.
4. **Shareholders Agreement** — Rule 4 said Week 1-2 (by ~2026-05-08). MISSED. While Minderoo is in due diligence, the Pty has two equal shareholders with no SHA. Latent deadlock risk.
5. **Pty Xero file opens** — blocked on ABN. Every invoicing, payroll, and financial artefact is blocked behind this.

### 🟠 Amber (must ship by mid-May to hit 30 June cleanly)

6. **Novation letters to funders** — template drafted; waiting for Standard Ledger review + ABN + NAB bank details. Window is closing. Plan says end-May. If ABN doesn't issue this week, the letters slip to June and the funder notifications compress.
7. **Centrecorp INV-0314 DRAFT ($84,700) decision** — 90 days old. Minderoo pitch credibility. Only-Ben decision.
8. **IP assignment deed** — plan says Week 4-5 (now). No lawyer engaged.
9. **Shareholders Agreement** — already RED but also AMBER: escalate today.
10. **Harvest subsidiary structure draft** — D11.1. No artefact. Sonas already has a $37,290 invoice on the books.
11. **Knight Photography Phase 1 invoice ($100K)** — D11.5. Plan written but invoice not raised yet. R&D attribution depends on this.

### 🟡 Yellow (recoverable post-cutover but best done by 30 June)

12. Subscription audit output.
13. Customer novations (Goods on Country buyers).
14. Email/website footer updates.
15. Stripe account for Pty.
16. GitHub org transfer.

---

## Open questions — carried from baseline + new

1. **Has the NAB Pty application been submitted?** No DB signal yet.
2. **Has Standard Ledger filed the ABN application?** Target was "first week of May" — now past. No second Xero tenant, no ABN in any DB field.
3. **Are Director IDs for Ben and Nic verified?** Still unverified from baseline.
4. **Snow INV-0321 date change** — why is the invoice now dated 2026-05-22? Was the invoice reissued?
5. **Has the migration notice been given to Snow Foundation** (call Sally/Alexandra)? Should have happened within 2 weeks of baseline.
6. **Minderoo outcome** — 2026-05-15 deadline. What is the result?
7. **Rotary eClub INV-0222 — chase or write off?** 399 days, no decision.
8. **Harvest subsidiary incorporation timeline** — D11.1 decision made but no draft structure. Who is the lawyer for this?
9. **R&D records review** — plan schedules end-May. Who is the dedicated R&D consultant?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | file (last_verified 2026-05-08) |
| DB | `xero_invoices` WHERE ACCREC AND AUTHORISED/DRAFT AND amount_due>0 | 2026-05-14 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-05-14 |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-05-14 |
| DB | `xero_invoices` status/type summary | 2026-05-14 |
| DB | `xero_invoices` WHERE ACCPAY AND contact_name ILIKE '%insurance%' etc. | 2026-05-14 — no insurance/ASIC ACCPAY |
| Drafts | `thoughts/shared/drafts/` — migration keyword grep | 2026-05-14 — 1 novation draft found |
| Plans | `thoughts/shared/plans/` — migration keyword grep | 2026-05-14 |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-05-14|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
