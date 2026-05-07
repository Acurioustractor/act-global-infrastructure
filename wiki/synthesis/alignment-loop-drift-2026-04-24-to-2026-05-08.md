---
title: Alignment Loop drift — 2026-04-24 → 2026-05-08
summary: Drift summary for the ACT Alignment Loop Phase 0 second pass. 13 days, 54 days to cutover. Q3 cutover trajectory is slipping — Pty Xero and NAB not open. Q1 funder receivables unchanged at $299K. Q2 delivered two config removals. D&O insurance due in 17 days.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-07
---

# Alignment Loop drift — 2026-04-24 → 2026-05-08

> Drift summary for the second pass of the ACT Alignment Loop Phase 0. Covers the 13-day window from the baseline (commit `7d8f74d`) to this pass (2026-05-07). Three questions, one table each. Read this before the individual Q1/Q2/Q3 syntheses — the drift is the signal.

---

## TL;DR — what moved since 24 Apr

1. **Q3 cutover: nothing structural moved. Pty Xero file and NAB business account both still absent in DB — both were Week 1-3 plan targets, now overdue. D&O insurance due in 17 days with no binding evidence. The plan is compressing.**
2. **Q1 funder receivables: zero collections on the three live funder invoices — Snow, Centrecorp, Rotary still combined $299K. Centrecorp DRAFT is now 84 days old. The migration notice to Snow (flagged as "this week" in the baseline) hasn't been sent. The 90+ day silent funder contact count grew from ~10 to 17.**
3. **Q2 config: two ghost codes removed (ACT-AMT, ACT-APO) — a direct baseline action delivered. One novation-letter-templates.md draft appeared. ACT-PS wiki gap persists.**

---

## Q1 — Funder alignment drift

Material context: The Q1 frame tracks 3 live funder invoices (Snow, Centrecorp, Rotary) plus the silent contact landscape. No financial movement in 13 days.

| Metric | 2026-04-24 | 2026-05-07 | Direction |
|---|---|---|---|
| Snow INV-0321 — AUTHORISED | 37d old, $132,000 | **50d old**, $132,000 | ↑ worse |
| Centrecorp INV-0314 — DRAFT | 70d old, $84,700 | **84d old**, $84,700 | ↑ worse |
| Rotary INV-0222 — AUTHORISED | 380d old, $82,500 | **392d old**, $82,500 | ↑ worse |
| 3-funder outstanding total | **$299,200** | **$299,200** | → unchanged |
| Snow migration notice sent | ❌ | ❌ | → no action (13 days overdue) |
| Centrecorp DRAFT decision | ❌ | ❌ | → no action |
| funders.json version + count | v2, 21 funders | v2, 21 funders | → no change |
| funders.json last updated | 2026-04-24 | 2026-04-24 | → no enrichment |
| Funder contacts ≥90d silent | ~10 | **17** | ↑ 7 new crossings |
| New funder invoice in Xero | 0 | INV-0327 JVT $1,200 | 🆕 small, not in funders.json |
| Minderoo deadline | 19 days away | **8 days away** | ↑ critical |

**What changed:** Nothing moved on money. The silence deepened across 17 contacts. The university cluster (Sandra Phillips, Nizam Abdu, Robyn Sloggett, Emily Nicholson, Amanda Neil) and Paul Ramsay Foundation all crossed the 90-day threshold simultaneously. The plan action to call Snow Foundation and decide Centrecorp remains undone 13 days later.

**Call-out:** Centrecorp INV-0314 at 84 days as a DRAFT is an active liability for the Minderoo pitch — if Lucy Stronach asks about pipeline evidence, this invoice's status is a credibility hole. The decision has been deferred across at least 5 prior sessions. At 54 days to cutover, it cannot be deferred again.

---

## Q2 — Project truth-state drift

Material context: The Q2 frame tracks 74 project codes across 4 sources. Config hygiene delivered; structural score unchanged.

| Metric | 2026-04-24 | 2026-05-07 | Direction |
|---|---|---|---|
| Total codes in project-codes.json | 74 | **72** | ↓ 2 removed ✅ |
| Codes removed | — | ACT-AMT, ACT-APO | ✅ baseline action delivered |
| Ghost codes still present (1/4) | 4 (ACT-GCC, ACT-AMT, ACT-APO, ACT-EFI) | **2 (ACT-GCC, ACT-EFI)** | ↓ improved |
| wiki .md files | 88 | 90 | ↑ 2 (methodology may differ) |
| Score: 4/4 projects | 28 | 28 | → |
| Score: 3/4 projects | 16 | 16 | → |
| Score: 2/4 projects | 26 | 26 | → |
| Score: 1/4 projects | 4 | **2** | ↓ 2 removed |
| Active/ideation projects < 2/4 | 0 | 0 | ✅ acceptance criterion holds |
| ACT-PS wiki gap | 🔴 open | 🔴 open | → no article |
| canonical_slug missing | 40+ codes | 40+ codes | → no config PR |
| ACT-SM canonical_slug fix | ❌ | ❌ | → no config update |
| DISPUTED tag in xero_transactions | — | 🆕 2 rows | new data quality flag |

**What changed:** Two ghost codes removed — the only structural Q2 action from the baseline that landed. The ACT-PS authoring gap and the canonical_slug deficit remain. A `DISPUTED` project_code tag has appeared in xero_transactions — minor but worth cleaning up.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

Material context: The Q3 frame tracks the 53-item cutover checklist, DB signals (Xero tenant, bank accounts, outstanding receivables), and artefact state. Every week matters now.

| Metric | 2026-04-24 | 2026-05-07 | Direction |
|---|---|---|---|
| Days to cutover | **67** | **54** | ↓ 13 days consumed |
| xero_tenant_id count | 1 (sole trader 1,742 inv) | **1 (sole trader 1,772 inv)** | → Pty Xero NOT opened 🔴 |
| bank_account list | NAB Visa ACT #8815 only | NAB Visa ACT #8815 only | → Pty NAB NOT opened 🔴 |
| Total ACCREC outstanding | **$507,350** | **$537,240** | ↑ +$29,890 |
| AUTHORISED ACCREC total | ~$507,350 (incl drafts) | $452,540 AUTHORISED | see note¹ |
| DRAFT ACCREC meaningful count | 2 | 1 | ↓ 1 (other DRAFT may have been voided) |
| Just Reinvest INV-0295 $27,500 | AUTHORISED | **PAID ✅** | ↑ collected |
| PICC INV-0317 $36,300 | AUTHORISED | **$19,800 (partial paid $16.5K)** | ↑ partially collected |
| Sonas Properties INV-0328 | — | **🆕 $37,290 AUTHORISED** | new receivable |
| John Villiers Trust INV-0327 | — | **🆕 $1,200 AUTHORISED** | new small receivable |
| Homeland School INV-0303 | $4,950 AUTHORISED | **$40,000 AUTHORISED** | ⚠️ amount changed — verify |
| Centrecorp INV-0314 status | DRAFT | DRAFT | → no decision |
| Snow INV-0321 migration notice | ❌ | ❌ | → 13 days overdue |
| D&O insurance binding | 🟡 due ~30d (2026-05-24) | **🔴 due 17d (2026-05-24)** | ↑ escalated |
| Insurance broker selected | ❌ | ❌ | → |
| Pty ABN issued | ❌ | ❌ (no DB evidence) | → (may be in progress off-system) |
| Novation letter template | ❌ (0 drafts) | **🟡 DRAFT EXISTS** | ✅ improved |
| Novation letters sent | ❌ | ❌ | → |
| IP assignment deed | ❌ | ❌ | → |
| Shareholders Agreement | ❌ | ❌ | → |
| Director IDs confirmed | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → |
| Migration-keyword drafts in repo | **0** | **1** (novation-letter-templates.md) | ↑ first artefact |
| Checklist: ✅ DONE | 5 | 5 | → |
| Checklist: 🟡 IN-PROGRESS | 7 | **8** | ↑ 1 (novation templates) |
| Checklist: 🔴 NOT-STARTED | 28 | **27** | ↓ 1 (novation templates) |
| Checklist: ⏳ NOT-YET-DUE | 13 | 13 | → |

¹ Note: baseline $507,350 was the combined total (AUTHORISED + DRAFT + all receivables). This pass: $452,540 AUTHORISED + $84,700 DRAFT = $537,240.

**What changed:**
- ✅ Just Reinvest $27.5K paid, PICC partial $16.5K paid — $44K collected.
- ✅ One novation template drafted — first artefact exists.
- 🔴 Pty Xero not opened. Pty NAB not opened. ABN not confirmed. All were Week 1-3 targets.
- 🔴 D&O insurance is 17 days from deadline — the hardest deadline in the next 4 weeks.
- ⚠️ Total outstanding grew despite collections (+$29,890) because of Sonas Properties ($37,290), Homeland School anomaly ($35K uplift), and new small invoices.

**Call-out — the plan is compressing:** Week 1-3 items (NAB application, ABN, Director ID confirmation, Pty Xero file, D&O insurance broker selection) were all supposed to be done or in flight. None are DB-visible. If the ABN is in progress with Standard Ledger, the Pty Xero file, NAB account, and Stripe need to queue up immediately behind it — there is no slack left in the banking and invoicing critical path. The Weeks 5-6 artefacts (novation letters sent, IP assignment deed, Shareholders Agreement) are now effectively Weeks 3-4 artefacts. Without ABN → Pty Xero → NAB → Stripe, the entity cannot invoice from 1 July.

---

## Per-item status transitions

Items that moved status since 2026-04-24:

| Item | Was | Now | Evidence |
|---|---|---|---|
| ACT-AMT removed from config | 1/4 ghost | **removed** | project-codes.json 74 → 72 |
| ACT-APO removed from config | 1/4 ghost | **removed** | project-codes.json 74 → 72 |
| Novation letter template | 🔴 NOT STARTED | **🟡 DRAFT** | novation-letter-templates.md |
| Just Reinvest INV-0295 | 🟡 outstanding | **✅ PAID** | not in AUTHORISED list |
| PICC INV-0317 | 🟡 $36,300 | **🟡 $19,800 (partial)** | $16.5K paid |
| D&O insurance | 🟡 ~30d | **🔴 17d — critical** | approaching deadline |

Items that were supposed to move but didn't:

| Item | Plan target | Expected by | Still | Gap |
|---|---|---|---|---|
| NAB Pty account application | Week 1 | 2026-05-01 | 🔴 OPEN | ~6 days overdue |
| ABN issued (Standard Ledger) | Week 1-2 | 2026-05-08 | 🔴 no DB evidence | at or near deadline |
| Pty Xero file opened | Week 3 | 2026-05-15 | 🔴 not open | at risk |
| Insurance broker selected | Week 1 | 2026-05-01 | 🔴 OPEN | 6 days overdue |
| Snow migration call | "This week" from 2026-04-24 | 2026-04-30 | ❌ not done | 7 days overdue |
| Centrecorp DRAFT decision | "This week" from 2026-04-24 | 2026-04-30 | ❌ not done | 7 days overdue |

---

## Sources queried

All queries against `tednluwflfhxyucgwigh.supabase.co` (confirmed via `get_project_url`).

| Source | Query | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED+DRAFT amount_due>0; GROUP BY xero_tenant_id; status+type summary | 2026-05-07 |
| `bank_statement_lines` | GROUP BY bank_account | 2026-05-07 |
| `ghl_contacts` + `communications_history` | funder-tagged contacts, last comm via `occurred_at` | 2026-05-07 |
| `xero_transactions` | GROUP BY project_code | 2026-05-07 |
| `wiki/narrative/funders.json` | full file | 2026-05-07 (unchanged since 2026-04-24) |
| `config/project-codes.json` | code count and ghost-code check | 2026-05-07 |
| `thoughts/shared/drafts/` | migration keyword grep | 2026-05-07 |
| `wiki/projects/**` | filesystem walk + .md count | 2026-05-07 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-08|Q1 funder-alignment — 2026-05-08 second pass]]
- [[project-truth-state-2026-05-08|Q2 project truth-state — 2026-05-08 second pass]]
- [[entity-migration-truth-state-2026-05-08|Q3 entity migration — 2026-05-08 second pass]]
- [[funder-alignment-2026-04-24|Q1 baseline — 2026-04-24]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
