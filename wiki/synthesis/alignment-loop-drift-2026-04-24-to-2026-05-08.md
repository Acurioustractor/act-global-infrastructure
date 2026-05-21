---
title: Alignment Loop drift — 2026-04-24 → 2026-05-08
summary: Drift summary for the ACT Alignment Loop Phase 0 second pass. Queries run 2026-05-21. Q3 MATERIAL CHANGES — Centrecorp decision made after 90d DRAFT, D&O overdue, total outstanding grew $95K to $602K. Q1 — funders.json tripled to 40 entries; Minderoo deadline passed, outcome unknown. Q2 — two projects promoted to 4/4; ACT-PS gap persists.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-08
---

# Alignment Loop drift — 2026-04-24 → 2026-05-08

> Phase 0 second pass of the [[act-alignment-loop|ACT Alignment Loop]]. Pass date: 2026-05-08 (2 weeks after baseline). Queries run: 2026-05-21. Compares the state at [[funder-alignment-2026-04-24|Q1]], [[project-truth-state-2026-04-24|Q2]], and [[entity-migration-truth-state-2026-04-24|Q3]] baseline against the second pass.

---

## TL;DR — what moved since 24 Apr

- **Centrecorp finally moved:** INV-0314 was DRAFT for 90+ days. It is now AUTHORISED at $97,900 (revised up from $84,700) and two new Centrecorp invoices were raised ($167K more). This was the single most consequential stalled action from the baseline — it's now unblocked.
- **D&O insurance is overdue:** Pty registered 2026-04-24. 30-day standard practice → deadline 2026-05-24. No binding evidence in Xero or drafts. Three days from query date (2026-05-21). Bind today.
- **ABN, NAB, Pty Xero still unopened — plan's Weeks 1-3 targets all missed.** The cutover is in 40 days (from query date). Without ABN/Xero, ACT cannot issue a single Pty invoice on 1 July. This is the gating constraint for the entire migration.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-04-24 | 2026-05-08 pass | Direction |
|---|---|---|---|
| Days until cutover | 67 | 53 (scheduled) / 40 (actual) | ↓ |
| xero_tenant_id count | 1 (1,742 invoices) | 1 (2,216 invoices) | → sole trader only |
| Bank account list | NAB Visa ACT #8815 only | NAB Visa ACT #8815 only | → no Pty NAB |
| Total ACCREC outstanding | $507,350 | $602,040 | ↑ +$94,690 |
| DRAFT ACCREC count | 2 (Centrecorp + 1) | 2 ($0 each — Centrecorp now AUTH) | → |
| ACCREC AUTHORISED count | 22 | 24 | ↑ |
| Migration artefacts in drafts/ | 0 | 2 (novation templates + Xero playbook) | ↑ real progress |
| ABN application | 🔴 OPEN | 🔴 OPEN/LATE (target "Week 1" missed) | → MISSED |
| NAB business account | 🔴 OPEN | 🔴 OPEN/LATE | → MISSED |
| Pty Xero file | 🔴 OPEN | 🔴 OPEN/LATE | → MISSED |
| D&O insurance | 🟡 DUE IN ~30 DAYS | 🔴 **OVERDUE** (~2026-05-24) | ↑ escalated |
| Centrecorp INV-0314 | DRAFT $84,700 (70d) | AUTH $97,900 (future-dated 2026-05-22) | ✅ **DECISION MADE** |
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED/LATE (Rule 4: Week 1-2) | → MISSED |
| Novation letter template | 🔴 NOT STARTED | 🟡 DRAFTED (needs S/L review) | ↑ |
| Status count: DONE | 5 | 6 | ↑ |
| Status count: IN PROGRESS | 7 | 9 | ↑ |
| Status count: NOT STARTED | 28 | 28 | → |
| Status count: NOT YET DUE | 13 | 12 | ↓ (D&O escalated) |
| Standard Ledger decisions | 0 §11 entries | 5 (D11.1–D11.5) | ↑ |

### Material calls

**🔴 MUST ACT NOW — D&O insurance (overdue ~2026-05-24):** The Pty has been registered for 27 days. D&O binds Directors Ben and Nic personally. No insurance broker ACCPAY invoice visible anywhere. If this isn't bound by 2026-05-24, the company is trading without D&O coverage. Engage a broker today.

**✅ GOOD NEWS — Centrecorp INV-0314 sent:** Baseline identified this as the most consequential stalled receivable. It moved. $97,900 is now in the AR book as AUTHORISED. Plus two new Centrecorp invoices raise total Centrecorp outstanding to $265,100 — a sign of an active billing relationship.

**🔴 CRITICAL PATH SLIPPING — ABN/NAB/Xero:** All three "Week 1" targets missed. Without ABN, the Pty can't open a Xero file. Without a Xero file, ACT can't invoice from 1 July. The cutover has a hard deadline (30 June) and a Standard Ledger dependency. Any further slip in ABN compresses the margin for everything downstream.

---

## Q1 — Funder drift

### What changed

| Metric | 2026-04-24 | 2026-05-08 pass | Direction |
|---|---|---|---|
| `funders.json` entries | 14 | 40 (v2, updated 2026-05-16) | ↑ 3× growth |
| `funders.json` version | 1.x | 2 | ↑ |
| Total ACCREC outstanding | $507,350 | $602,040 | ↑ |
| Funder-tier outstanding (Snow+Centrecorp+Rotary) | $299,200 | $479,650 | ↑ |
| Snow INV-0321 status | AUTH $132K (37d, 2026-03-18) | AUTH $132K (future-dated 2026-05-22) | ⚠️ date changed |
| Centrecorp INV-0314 status | DRAFT $84,700 (70d) | AUTH $97,900 | ✅ sent |
| Centrecorp new invoices | 0 | INV-0329 $61,050 + INV-0331 $106,150 | ↑ $167,200 new |
| Rotary INV-0222 status | AUTH $82,500 (380d) | AUTH $82,500 (400+ days) | 🔴 → no action |
| Regional Arts $33K | AUTH 2 invoices | AUTH $16,500 (1 invoice, other paid) | ↓ partial collection |
| Just Reinvest $27,500 | AUTH (54d) | PAID | ✅ collected |
| Homeland School $4,950 | AUTH (65d) | AUTH **$44,000** (new/revised invoice) | ⚠️ amount changed |
| New receivables since baseline | — | Sonas $37,290, JVT $1,200, 2× Centrecorp | ↑ |
| Funder contacts >90d silent | ~10 | ~17 (Jan batch now 134d) | ↑ |
| Minderoo pitch deadline | 2026-05-15 (upcoming) | **PASSED** | ⚠️ outcome unknown |
| Rotary stubs in funders.json | 1 | 3 (duplicate entries) | ↑ data debt |

### Material calls

**⚠️ Minderoo outcome unknown:** The $2.9M ask deadline was 2026-05-15. It has passed. The funders.json still shows `stage: ask-pending`. Either the pitch landed and a decision is pending, or it didn't and the stage needs updating. This should be the first call Ben makes after reading this drift summary.

**✅ funders.json is now a real ledger:** Growing from 14 to 40 entries in 2 weeks makes the pitch-assembly tooling dramatically more useful. The 7 baseline-recommended additions are all in.

**🔴 Rotary INV-0222 is 400 days old and entering FY26 close-out territory.** No decision was made in the 27 days since baseline. Bad debt provision or active chase — either way, this must be resolved before the June 30 cutover.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-04-24 | 2026-05-08 pass | Direction |
|---|---|---|---|
| Project codes in config | 74 | 75 | ↑ +1 |
| Wiki articles (non-provenance) | 88 | 90+ | ↑ |
| Score 4/4 | 28 | 30 | ↑ +2 (ACT-CT, ACT-BV) |
| Score 3/4 | 16 | 14 | ↓ -2 |
| Score 2/4 | 26 | 26 | → |
| Score 1/4 | 4 | 4 | → |
| Score 0/4 | 0 | 0 | → |
| Active/ideation projects <2/4 | 0 | 0 | → acceptance criterion met |
| Authoring backlog (real gaps) | 1 (ACT-PS) | 1 (ACT-PS) | → unchanged |
| Codes missing canonical_slug | 40+ | 40+ | → not actioned |
| DB-only codes not in config | 0 | 4 (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) | ↑ new |
| Config ghost codes actioned | — | 0 (ACT-AMT, ACT-APO removal pending) | → baseline recommendation not actioned |

### Material calls

**✅ ACT-CT and ACT-BV both acquired Xero tracking** — two projects that existed only as wiki claims are now financially tracked. Good operational hygiene.

**→ ACT-PS wiki gap persists** — 78 code refs, 11 invoices, no dedicated article. Low effort to fix; still not done.

**→ canonical_slug gap still open** — 40+ codes missing. This is the Phase-1 automation blocker. One config PR would unblock the scripted version of this synthesis.

---

## Synthesis metadata

| Field | Value |
|---|---|
| Baseline date | 2026-04-24 |
| Pass date (scheduled) | 2026-05-08 |
| Queries run | 2026-05-21 |
| Supabase project | `tednluwflfhxyucgwigh` |
| Days elapsed (baseline → scheduled pass) | 14 |
| Days elapsed (baseline → actual queries) | 27 |
| Cutover days remaining (scheduled pass) | 53 |
| Cutover days remaining (actual) | 40 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[funder-alignment-2026-05-08|Q1 — 2026-05-08 pass]]
- [[project-truth-state-2026-05-08|Q2 — 2026-05-08 pass]]
- [[entity-migration-truth-state-2026-05-08|Q3 — 2026-05-08 pass]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-14|Next drift summary — 2026-05-14]]
- [[index|ACT Wikipedia]]
