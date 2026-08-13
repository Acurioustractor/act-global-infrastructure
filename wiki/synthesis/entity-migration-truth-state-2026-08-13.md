---
title: Entity migration truth-state — 44 days post-cutover, BAS 16 days overdue, D&O 120 days past deadline
summary: Sixth pass of the ACT Alignment Loop (Q3), 2026-08-13. 44 days post-cutover. Xero sync resumed — now 2,332 invoices (+39 from 2,293 at Aug 6), indicating active Xero processing. Outstanding ACCREC $422,017.84 (net +$4,250 from Aug 6). BAS Q4 FY26 now 16 days past standard due date. D&O insurance 120 days past deadline. Still 1 Xero tenant (sole trader only). Bank data ends 2026-03-31.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-08-13
---

# Entity migration truth-state — 2026-08-13

> Sixth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **44 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-08-06|2026-08-06]].

## Headline findings

1. **Xero sync resumed — now 2,332 invoices, up from 2,293 on Aug 6 (+39 in 7 days).** The previous three passes showed no Xero activity in the DB. The sync has run. This indicates active invoice processing is happening — but it is still all on a single Xero tenant (the sole trader). No Pty Xero file is visible in DB.

2. **BAS Q4 FY26 (sole-trader) standard due date was 2026-07-28 — now 16 days past.** Standard Ledger is ACT's registered tax agent and likely holds a concession date. No lodgement artefact is visible in Supabase. Confirming lodgement status or the concession deadline is the most urgent compliance action.

3. **Outstanding ACCREC: $422,017.84 across 11 invoices — net +$4,250 from Aug 6.** Mounty Aboriginal Youth ($22K) and Julalikari Council ($15K) cleared. New: Oonchiumpa Consultancy and Services INV-0344 ($41,250, 2026-08-12, null project_code).

4. **Still only 1 Xero tenant in DB** (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`, the sole trader). No Pty Xero file visible. Whether it exists but is unsynced remains unconfirmable from the DB.

5. **Bank data still ends 2026-03-31** — NAB Visa ACT #8815 only, 1,618 transactions. No Pty NAB account visible.

6. **D&O insurance is now 120 days past the ~2026-05-24 deadline.** Registered 2026-04-24; D&O was due within 30 days. No binding evidence in any pass.

7. **No new artefacts on EOFY strategic fork, Shareholders Agreement, or subscription transfers.** The same open questions from Aug 6 remain unresolved.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+44 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-08-06 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | EOFY Decision Pack raises it; 2 R&D plans but no SL ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | `bank_statement_lines` data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,332 inv after sync); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists (`new-entity-xero-launch-playbook.md`); no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 16 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 9d at Aug 6, now 16d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (490d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment (Rule 2) | 3 invoices $167.2K (ALIVE ×2) + new Oonchiumpa $41,250 = $208.45K total null project_code | ❓ UNCONFIRMED | 🆕 Oonchiumpa adds $41,250 |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → unchanged |
| R&D FY27 entity designation (AusIndustry) | Planning underway; AusIndustry not due until ~Apr 2028 | 🟡 PENDING ENTITY DECISION | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-08-13|Q1 funder synthesis — this pass]].

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-08-06.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **120 days past deadline** | ↑ was 113d at Aug 6, now 120d |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 evidence | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED | → |
| Pty minute book | 🟡 UNVERIFIED | → |

### Section 9 — Subscriptions / tooling

All SaaS transfers NOT STARTED per available evidence. Sole trader still the only visible Xero entity.

### Section 10 — Communications

| Item | Status | Change |
|---|---|---|
| Announcement email to funders/partners | 🔴 NOT CONFIRMED | → |
| Email/website footer updates | 🔴 NOT CONFIRMED | → |

### Section 11 — Standard Ledger decisions

| Decision | Status | Change |
|---|---|---|
| D11.4 (mapping export) | ✅ DONE | → |
| D11.2 (payroll), D11.3 (Dext emails), D11.5 (Knight Photography) | ❓ no new information | → |

### Section 12 — EOFY Decision Pack (2026-06-19)

| Decision | Status | Change |
|---|---|---|
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED | → |
| Final sole trader BAS | 🚨 16 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-08-06 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~8 | ~12% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | → |
| **Total** | **~65** | | → |

---

## Cutover risk map — post-cutover

### 🚨 Red (active compliance problems)

1. **BAS Q4 FY26 — 16 days past standard due date.** Confirm with Standard Ledger: lodged or concession deadline? If not lodged, this is urgent.
2. **Rotary INV-0222 ($82,500, 490 days)** — BAS write-off window nominally passed. Invoice still AUTHORISED; if written off, should be VOIDED.
3. **D&O insurance — 120 days past the ~2026-05-24 deadline.** 4+ months of potential uninsured director liability.
4. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking clean R&D claim structuring.

### 🟠 Amber (this week)

5. **Tag post-cutover invoices** — INV-0341 + INV-0342 (ALIVE $167.2K) + INV-0344 (Oonchiumpa $41,250) — $208.45K untracked.
6. **Confirm Pty Xero file open and $1 test invoice run** — sync is running but all on sole trader tenant.
7. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
8. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable within a month)

9. Subscription billing transfers.
10. GitHub org transfer.
11. Email/website footer updates.
12. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)

---

## Open questions

1. **Sole trader BAS Q4 FY26** — has Standard Ledger lodged it or is there a concession date? What is the Rotary write-off treatment and Rule 2 treatment for the $208.45K post-cutover/untagged invoices?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 120 days overdue.
4. **Pty Xero file** — open and operational? Xero sync is running (sole trader +39 invoices) but only 1 tenant visible.
5. **Oonchiumpa INV-0344** — $41,250 raised 2026-08-12. Is this sole-trader or Pty entity? Project_code = ACT-OO?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-08-13 (1 tenant, 2,332 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-08-13 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-08-13 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-08-13 (11 rows, $422,017.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 8 matching files as Aug 6 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-08-06|Q3 entity migration — 2026-08-06 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-08-13|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-13|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
