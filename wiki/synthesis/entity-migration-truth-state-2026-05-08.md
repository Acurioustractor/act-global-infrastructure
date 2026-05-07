---
title: Entity migration truth-state — 54 days to cutover, no Pty infrastructure yet
summary: Third artefact of the ACT Alignment Loop (Q3), second pass. 54 days to cutover. Pty Xero file and NAB business account still unopened — both were Week 1-3 targets, now overdue. D&O insurance due in 17 days with no binding evidence. One win: novation-letter-templates.md now exists. Total outstanding rose to $537,240 (+$29,890).
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-07
---

# Entity migration truth-state — 2026-05-08

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], second pass. Same four sources as baseline: the 10-section cutover checklist, Supabase (Xero invoices, tenant state, bank lines), `thoughts/shared/drafts/**`, and the entity migration plan. Compare to [[entity-migration-truth-state-2026-04-24|the 2026-04-24 baseline]].

## Headline findings

1. **Pty infrastructure is not materialising in the data.** At 54 days to cutover, Supabase still shows 1 Xero tenant (sole trader only) and 1 bank account (NAB Visa ACT #8815 only). The Pty Xero file was supposed to open in Week 3 (by early May). The Pty NAB business account was supposed to be applied for in Week 1 (by late April). Neither has produced DB-visible evidence. These are now the two hardest blockers on the critical path.

2. **D&O insurance due 17 days from now.** The 30-day post-registration window for Directors and Officers insurance closes ~2026-05-24. At baseline this was 30 days away (🟡). No binding evidence found in Xero (no insurance-broker ACCPAY invoices). This must close before 17 days from now or the Pty directors trade uninsured.

3. **Total outstanding on sole trader's books rose to $537,240** — up $29,890 from baseline ($507,350). Collections since baseline: Just Reinvest $27,500 paid ✅, PICC INV-0317 partial ($16,500 paid, still $19,800 outstanding). New invoices raised: Sonas Properties INV-0328 $37,290, John Villiers Trust INV-0327 $1,200. Anomaly: Homeland School INV-0303 shows $40,000 outstanding vs $4,950 at baseline — verify with Nic whether the invoice was re-issued at a higher amount or if the DB reflects a new invoice.

4. **One novation artefact now exists.** `thoughts/shared/drafts/novation-letter-templates.md` was created (dated 2026-04-24, drafted by the ACT Alignment Loop). The baseline had zero novation drafts. The templates cover both grant-funder and commercial-counterparty scenarios with Standard Ledger review caveat. This changes the novation preparation from 🔴 NOT STARTED → 🟡 DRAFT EXISTS.

5. **ABN and GST registration: no DB evidence.** Standard Ledger target was first week of May. No ABN visible in Xero tenant record, no new Pty Xero file. Either the ABN process is in progress but hasn't yet cascaded to Xero, or it's slipping. Cannot confirm from DB alone — Ben/Nic to verify directly with Standard Ledger.

---

## Items × evidence × risk — changes from baseline

Days until 30 June 2026 cutover: **54 days** (was 67).

### Section 1 — Entity setup

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| Pty registered at ASIC (ACN 697 347 676) | ✅ DONE | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ DONE | ✅ DONE | → |
| Shareholders (Knight FT 50 / Marchesi FT 50) | ✅ DONE | ✅ DONE | → |
| Director IDs confirmed | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → |
| ABN application (Pty) — Standard Ledger | 🔴 OPEN | 🔴 OPEN (no DB evidence) | → |
| GST registration (Pty) | 🔴 OPEN | 🔴 OPEN | → |
| Standard Ledger briefed | ✅ DONE | ✅ DONE | → |

### Section 2 — Banking

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| NAB business account (Pty) — OPEN | 🔴 OPEN | 🔴 OPEN (still 1 BSL account) | → |
| Stripe account (Pty) | 🔴 NOT YET DUE | 🔴 NOT YET DUE | → |
| PayID / Osko on Pty NAB | ⏳ BLOCKED ON NAB | ⏳ BLOCKED ON NAB | → |
| Auto-debits audit + migrate | 🟡 OPEN | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| Pty Xero file opens | 🔴 OPEN | 🔴 OPEN (still 1 tenant, 1,772 invoices) | → |
| Final sole trader BAS | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| R&D FY26 claim | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| Snow INV-0321 ($132K) — call + migration notice | 🔴 NOT STARTED | 🔴 NOT STARTED | → **13 days overdue** |
| Centrecorp INV-0314 ($84.7K) — DRAFT decision | 🔴 NOT STARTED | 🔴 NOT STARTED | → **84-day DRAFT now** |
| Rotary INV-0222 ($82.5K) — chase or write off | 🔴 NOT STARTED | 🔴 NOT STARTED | → **392 days** |
| Novation letter template | 🔴 NOT STARTED | **🟡 DRAFT EXISTS** | ✅ **improved** |
| Novation letters to funders (send) | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Grant enumeration for sole trader | 🟡 IN PROGRESS | 🟡 IN PROGRESS | → |

New receivables requiring migration decisions:

| Counterparty | Invoice | Amount | Status | Project | Note |
|---|---:|---:|---|---|---|
| **Snow Foundation** | INV-0321 | $132,000 | AUTHORISED | ACT-GD | 50d old; migration notice overdue |
| **Rotary eClub** | INV-0222 | $82,500 | AUTHORISED | ACT-GD | 392d old; chase or write off |
| **PICC** | INV-0317 | $19,800 | AUTHORISED | ACT-PI | Partial paid ($16.5K); $19.8K outstanding |
| **PICC** | INV-0324 | $77,000 | AUTHORISED | ACT-PI | 29d old; confirm payment timing |
| **Regional Arts Australia** | INV-0301/0302 | $33,000 | AUTHORISED | ACT-HV | 141d old |
| **Homeland School Company** | INV-0303 | $40,000 | AUTHORISED | ACT-JH | ⚠️ was $4,950 at baseline; verify re-issue |
| **Sonas Properties Pty Ltd** | INV-0328 | $37,290 | AUTHORISED | ACT-HV | 🆕 New — verify provenance |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTHORISED | ACT-BG | 22d; monitor |
| **Aleisha J Keating** | INV-0238..0307 | $12,150 | AUTHORISED (×27) | ACT-FM | Retainer decisions needed pre-cutover |
| **SMART Recovery Australia** | INV-0322 | $2,200 | AUTHORISED | ACT-SM | Chase |
| **John Villiers Trust** | INV-0327 | $1,200 | AUTHORISED | ACT-CORE | 🆕 New — small grant/service invoice |
| **Centrecorp Foundation** | INV-0314 | $84,700 | **DRAFT** | ACT-GD | 84d DRAFT; decision overdue |
| **TOTAL OUTSTANDING** | | **$537,240** | | | ↑ $29,890 vs baseline |

**Paid since baseline:** Just Reinvest INV-0295 $27,500 ✅ · PICC INV-0317 partial $16,500 ✅

### Section 7 — Insurance

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| D&O insurance | 🟡 DUE ~30 DAYS (by 2026-05-24) | 🔴 DUE **17 DAYS** | ↑ **escalated** |
| Insurance broker selection | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Public Liability $20M | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Professional Indemnity | 🔴 NOT STARTED | 🔴 NOT STARTED | → |

### Section 8 — Governance

| Item | Status baseline | Status now | Change |
|---|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Pty minute book | 🟡 UNVERIFIED | 🟡 UNVERIFIED | → |

---

## Status summary — full checklist

| Status | Baseline (2026-04-24) | This pass (2026-05-07) | Change |
|---|---:|---:|---|
| ✅ DONE | 5 | 5 | → |
| 🟡 IN PROGRESS / PARTIAL | 7 | **8** | ↑ 1 (novation templates) |
| 🔴 NOT STARTED / OPEN | 28 | **27** | ↓ 1 (novation templates) |
| ⏳ NOT YET DUE / BLOCKED | 13 | 13 | → |
| **Total** | **53** | **53** | |

The 5% done rate is unchanged. The D&O insurance has escalated from 🟡 to effectively 🔴 (17 days, no binding). If counted as 🔴, NOT STARTED rises back to 28 and IN PROGRESS stays at 7. Either way, the picture is: one artefact win (novation template), everything structural still open.

---

## Cutover risk map — updated

### 🚨 Red (now critical — were amber/open at baseline)

1. **D&O insurance binding** — due **2026-05-24, 17 days away**. No binding evidence. If no broker was selected (baseline action not visible in DB), select today and accept same-day bind.
2. **Pty ABN + GST rego** — target was first week of May, now overdue by 7 days. No Pty Xero file means no invoicing from 1 July.
3. **Pty Xero file opens** — blocked on ABN. Now 54 days out with zero Pty file evidence.
4. **Pty NAB business account** — apply was "this week" from 2026-04-24. Still no Pty account in DB. Stripe + subscriptions blocked.
5. **Director IDs confirmed** — unverified 2 weeks running. Blocks ABN if missing.
6. **Centrecorp INV-0314** — 84-day DRAFT. Blocks Minderoo pitch. Only-Ben decision.

### 🟠 Amber (must ship by mid-May)

7. **Novation letters sent to all current funders** — template exists ✅; send is still scheduled Weeks 5-6 (now Weeks 3-4 in the compressed timeline). Snow call overdue.
8. **IP assignment deed + Shareholders Agreement** — no draft, plan week 4-5. Standard Ledger lawyer needed.
9. **Homeland School INV-0303 anomaly** — amount jumped $4,950 → $40,000, verify with Nic.
10. **Harvest lease (Sonas Properties)** — lease_start 2026-07-01. No signed lease in Pty name.

### 🟡 Yellow (recoverable if addressed by end of May)

11. Email/website footer updates.
12. Announcement email draft.
13. Subscription billing audit (38 vendor patterns in DB, no consolidated output yet).
14. GitHub org transfer.

---

## Open questions — unchanged from baseline

1. Are Director IDs for Ben and Nic already registered (from A Kind Tractor Ltd setup)?
2. Has NAB application been submitted? (no DB evidence but may be in-process)
3. Has Standard Ledger confirmed ABN date? (target was first week of May)
4. Aleisha Keating retainer — continues under Pty? (27 invoices outstanding, oldest 307 days)
5. Regional Arts Australia $33K at 141 days — chase status?
6. Homeland School INV-0303 — why did the amount change from $4,950 to $40,000?

---

## Sources queried

| Source | Query | As-of |
|---|---|---|
| `xero_invoices` | xero_tenant_id GROUP BY; ACCREC outstanding; status/type summary | 2026-05-07 |
| `bank_statement_lines` | GROUP BY bank_account | 2026-05-07 |
| `thoughts/shared/drafts/` | migration keyword grep | 2026-05-07 |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | full read | 2026-05-07 |

**Caveats:**
1. ABN, Director IDs, NAB, and insurance are not DB-visible until they produce transactions. Absence of evidence ≠ evidence of absence — verify directly with Ben/Nic.
2. Novation drafts may exist in Google Drive / email not visible in the repo.
3. Pty Xero file will appear in DB only after Standard Ledger connects it to the Supabase sync.

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-05-08|Q1 funder-alignment — 2026-05-08 second pass]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — 2026-04-24 → 2026-05-08]]
- [[index|ACT Wikipedia]]
