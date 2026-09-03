---
title: Alignment Loop drift — 2026-08-20 to 2026-09-03
summary: Eighth pass of the ACT Alignment Loop drift summary. 14-day window. Oonchiumpa cleared; ACCREC at $286K (lowest since baseline). BAS now 37 days overdue — sole-trader tax return 58 days away. D&O at 141 days. Joy House Productions appears. ACT-PS gap is now eight consecutive passes with no action.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-09-03
---

# Alignment Loop drift — 2026-08-20 to 2026-09-03

> Eighth run of the [[act-alignment-loop|ACT Alignment Loop Phase 0]]. Covers a 14-day window from the seventh pass (2026-08-20) to today (2026-09-03). Three questions: Q1 funder alignment, Q2 project truth-state, Q3 entity migration. Companion syntheses: [[funder-alignment-2026-09-03|Q1]], [[project-truth-state-2026-09-03|Q2]], [[entity-migration-truth-state-2026-09-03|Q3]].

---

## TL;DR — what moved since 20 Aug

- **Oonchiumpa paid ($41K cleared), ACCREC at $285,998 — lowest since the April baseline.** Two new small invoices (Tandanya $5,500, Joy House Productions $931) are offset, but the trend is downward for the first time in months.
- **BAS is now 37 days past standard due date; the sole-trader tax return is 58 days away (31 Oct 2026).** D&O is 141 days past its deadline. Nothing resolved on governance, insurance, or BAS across this 14-day window.
- **Everything else is static for the 8th consecutive pass** — config still v1.8.0 (132 days), wiki still 98 articles, ACT-PS still no wiki article, D&O still unconfirmed. The loop is surfacing the same open items with no visible motion on any of them.

---

## Q1 — Funder alignment: what changed

### Material changes this pass

**Oonchiumpa INV-0344 ($41,250) paid.** This was the most recent large outstanding invoice and the one with the most uncertain entity treatment (raised post-cutover against the sole trader). Its clearance is the only material positive movement in the pass.

**Joy House Productions appears for the first time** — INV-0349 ($931, 2026-08-31). Unknown counterparty; no project_code; no wiki or GHL record. Small in dollar terms but signals new trading activity not yet captured in the config or funders ledger.

**BAS escalation: 23 → 37 days past standard due date.** Now 37 days overdue with no confirmation of lodgement or concession deadline from Standard Ledger. Each passing week without confirmation increases exposure.

### Q1 drift table

| Metric | 2026-08-20 | 2026-09-03 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $320,817.84 | **$285,998.84** | ↓ −$34,819 |
| ACCREC invoice count | 10 | **11** | ↑ +1 (−1 paid, +2 new) |
| Rotary INV-0222 age | 497d | **511d** | ↑ +14d |
| Jenn Brazier INV-0228 age | 415d | **429d** | ↑ +14d |
| ALIVE INV-0341 age | 49d | **63d** | ↑ +14d |
| Invoices with null project_code | 4 | **5** | ↑ +1 (new INV-0347 + INV-0349, −0 resolved) |
| BAS days past standard due | 23d | **37d** | ↑ +14d |
| `funders.json` entry count | 25 | **25** | → unchanged |
| Silent >90 days funder-tagged contacts | 1 (Georgina Byron 134d) | **≥1** (GHL schema mismatch; unchanged signal) | → |
| New counterparties in Xero not in funders.json | 6 | **7** (+ Joy House Productions) | ↑ |
| Xero DRAFT ACCREC count | 0 | **0** | → |

---

## Q2 — Project truth-state: what changed

### Material changes this pass

**Xero grew by 40 invoices** (2,351 → 2,391). ACT-GD adds 2, ACT-HV adds 1. ACT-OO appears in the top-30 code breakdown for the first time at 19 invoices. The Goods on Country project continues its sustained invoice growth.

**ACT-PS wiki gap is now eight consecutive passes without resolution.** This is the longest-running unresolved derived action in the loop. At ~30 minutes of work, the cost of not doing it has now exceeded the cost of doing it by a wide margin.

Nothing else changed. Config unchanged (v1.8.0, 132 days stale). Wiki unchanged (98 articles). Four DB-only codes still unresolved.

### Q2 drift table

| Metric | 2026-08-20 | 2026-09-03 | Direction |
|---|---|---|---|
| Config version | v1.8.0 | **v1.8.0** | → |
| Config staleness (days) | 119d | **132d** | ↑ +13d |
| Total Xero invoices | 2,351 | **2,391** | ↑ +40 |
| ACT-GD invoices | 399 | **401** | ↑ +2 |
| ACT-HV invoices | 126 | **127** | ↑ +1 |
| Wiki article count | 98 | **98** | → |
| ACT-PS gap (consecutive passes) | 7 | **8** | ↑ +1 |
| DB-only codes not in config | 4 | **4** | → |
| Config ghost codes | 4 | **4** | → |
| Acceptance criterion (active ≥2/4) | ✅ | **✅** | → |
| Untagged post-cutover ACCREC | $107,250 | **$110,711** | ↑ +$3,461 |
| New counterparties in Xero | 0 (this week) | **1** (Joy House) | ↑ |

---

## Q3 — Entity migration: what changed (MOST IMPORTANT)

### Material changes this pass

**EOFY strategic fork and Rotary write-off now gate the sole-trader tax return (58 days away).** The 30 June cutover deadline is past; the new deadline forcing resolution is 31 October 2026 (sole-trader tax return). Three items must be decided before filing: (1) Rotary INV-0222 write-off treatment, (2) EOFY strategic fork (journal-entry vs market-value sale for asset transfer), (3) R&D FY26 claim structuring with Standard Ledger.

**D&O insurance: 141 days past deadline.** No binding evidence across eight passes. This is the most persistent unresolved compliance item in the loop — it has appeared in every Q3 pass since April 24 with no resolution signal.

**BAS escalation: 37 days past standard due date.** Up from 23 days at Aug 20. No lodgement evidence.

**Oonchiumpa INV-0344 cleared** — the largest recent change to the receivables book. Two small new invoices (Tandanya, Joy House) partially replace it.

### Q3 drift table

| Metric | 2026-08-20 | 2026-09-03 | Direction |
|---|---|---|---|
| Days past cutover (30 Jun) | +51d | **+65d** | ↑ |
| Days to sole-trader tax return (31 Oct) | — | **58d** | 🆕 critical new constraint |
| xero_tenant_id count | 1 | **1** | → (no Pty Xero visible) |
| Total Xero invoices | 2,351 | **2,391** | ↑ +40 |
| Bank accounts | NAB Visa ACT #8815 only | **NAB Visa ACT #8815 only** | → |
| Bank data end date | 2026-03-31 | **2026-03-31** | → (22 weeks frozen) |
| ACCREC outstanding $ | $320,817.84 | **$285,998.84** | ↓ −$34,819 |
| ACCREC invoice count | 10 | **11** | ↑ +1 |
| DRAFT ACCREC count | 0 | **0** | → |
| BAS days past standard due | 23d | **37d** | ↑ +14d |
| D&O days past deadline | 127d | **141d** | ↑ +14d |
| Migration artefacts (plans) | 5 files | **5 files** | → |
| Migration artefacts (drafts) | 1 file (novation) | **1 file (novation)** | → |
| EOFY strategic fork resolved | ❌ | **❌** | → |
| Shareholders Agreement confirmed | ❌ | **❌** | → |
| Pty Xero file confirmed open | ❌ | **❌** | → |
| Pty NAB account confirmed | ❌ | **❌** | → |

### Specific item transitions this pass

| Item | 2026-08-20 | 2026-09-03 | Change? |
|---|---|---|---|
| BAS Q4 FY26 lodgement | 🚨 23d past due | **🚨 37d past due** | ↑ worse |
| Rotary INV-0222 write-off | ❓ unresolved | **❓ unresolved — now gating tax return** | ↑ escalated |
| D&O insurance binding | ❓ 127d past deadline | **❓ 141d past deadline** | ↑ worse |
| EOFY strategic fork | 🔴 not resolved | **🔴 not resolved — now gating tax return** | ↑ escalated |
| Novation letter template | ✅ drafted | **✅ drafted** | → |
| Funder batch novation letters | 🔴 not confirmed | **🔴 not confirmed** | → |
| Shareholders Agreement | 🔴 not confirmed | **🔴 not confirmed** | → |
| Oonchiumpa INV-0344 ($41,250) | 🟡 outstanding 21d | **✅ PAID** | ↓ resolved |
| Joy House Productions INV-0349 | — | **🆕 $931, new counterparty, no project_code** | 🆕 |

---

## Persistent open items (no motion across 8 passes)

These items have been flagged in every single pass since the April 24 baseline and show zero resolution signal:

| Item | First flagged | Latest state | Risk |
|---|---|---|---|
| ACT-PS wiki article | Pass 1 (Apr 24) | 🔴 8th consecutive pass | Strategic hygiene |
| config/project-codes.json version bump | Pass 1 (Apr 24) | 🔴 132 days stale | System drift |
| D&O insurance binding | Pass 1 (Apr 24) | ❓ 141 days past deadline | Active compliance |
| Shareholders Agreement | Pass 1 (Apr 24) | 🔴 not confirmed | Governance risk |
| Pty Xero file confirmation | Pass 5+ | ❓ unconfirmed | Operational |
| Funder batch novation letters | Pass 1 (Apr 24) | 🔴 not confirmed | Funder comms |
| funders.json entries for 6 counterparties | Pass 5+ | ❌ still missing | Ledger completeness |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[funder-alignment-2026-09-03|Q1 funder alignment — 2026-09-03]]
- [[project-truth-state-2026-09-03|Q2 project truth-state — 2026-09-03]]
- [[entity-migration-truth-state-2026-09-03|Q3 entity migration — 2026-09-03]]
- [[alignment-loop-drift-2026-08-13-to-2026-08-20|Previous drift — 2026-08-13 to 2026-08-20]]
- [[index|ACT Wikipedia]]
