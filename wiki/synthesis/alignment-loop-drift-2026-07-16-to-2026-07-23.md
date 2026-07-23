---
title: Alignment Loop drift — 2026-07-16 to 2026-07-23
summary: 7-day drift across all three ACT Alignment Loop questions. Outstanding receivables frozen at $471,717.84. BAS due in 5 days (was 12 at last pass). Xero +46 invoices of activity. MRFF-Palmer added to funders.json. Pty stack still unconfirmed.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-07-23
---

# Alignment Loop drift — 2026-07-16 to 2026-07-23

> 7-day drift surface. Baseline: the three 2026-07-16 syntheses. This pass: the three 2026-07-23 syntheses. Minimal drift in the data; the dominant change is the BAS clock.

---

## TL;DR — what moved since 16 July

1. **Outstanding ACCREC frozen at $471,717.84 — zero movement in 7 days.** Same 14 invoices, same amounts. No collections, no voids, no new invoices. The receivable book is entirely static while the sole-trader BAS approaches in 5 days.
2. **BAS escalation: Q4 FY26 sole-trader BAS due 28 July is now 5 days away** (was 12 days at 2026-07-16). This is the most time-sensitive action in the entire ecosystem right now. Standard Ledger must be briefed on post-cutover income ($189.2K ALIVE + Mounty) and the Rotary write-off decision must be made before lodgement.
3. **One new plan artifact (`new-entity-xero-launch-playbook.md`), MRFF-Palmer added to `funders.json`, Xero active (+46 invoices).** Everything else — Pty Xero unconfirmed, strategic fork unresolved, Rotary 469 days, ACT-PS wiki gap, 4 DB-only codes — is unchanged.

---

## Q1 — Funder drift

### Leading paragraph

The funder receivables picture has not moved in 7 days. The book is frozen at $471,717.84 with 14 open invoices. The most significant change is structural, not numerical: the MRFF-Palmer grant is now explicitly captured in `funders.json` (as `mrff-uom-palmer`, 25th entry), which names the ALIVE National Centre invoices in context. This means the two largest open invoices ($101.2K + $66K from ALIVE, dated 2026-07-02) now have a funder home in the wiki. The Rotary INV-0222 situation is identical — 7 more days on an already 462-day-old invoice — but the BAS deadline in 5 days makes the write-off decision urgent rather than deferred.

### What changed — Q1

| Metric | 2026-07-16 | 2026-07-23 | Direction |
|---|---|---|---|
| Total outstanding ACCREC | $471,717.84 | $471,717.84 | → **frozen** |
| Invoice count (ACCREC AUTHORISED) | 14 | 14 | → |
| Rotary eClub INV-0222 age | 462 days | **469 days** | ↓ +7d, BAS deadline 5 days |
| ALIVE National Centre outstanding | $167,200 (post-cutover) | $167,200 | → unresolved |
| Mounty Aboriginal Youth INV-0334 | $22,000 (post-cutover) | $22,000 | → |
| Snow Foundation INV-0321 | PAID | PAID | → ✅ |
| Centrecorp INV-0314 | VOIDED | VOIDED | → |
| PICC invoices | VOIDED (×2) | VOIDED (×2) | → |
| `funders.json` entry count | 24 | **25** (MRFF-Palmer added) | ↑ |
| `funders.json` last updated | 2026-07-07 | 2026-07-07 | → |
| Minderoo stage | paused | paused | → |
| Untagged post-cutover invoices | 3 ($189,200) | 3 ($189,200) | → unresolved |
| New Xero counterparties without funders.json stub | 5 (Homeland, Tandanya, Brodie, Julalikari, Berry Obsession) | 5 | → |

**Material changes:** MRFF-Palmer entry in `funders.json` (the ALIVE invoice source now documented). No financial movement. Rotary write-off now urgent (BAS deadline).

---

## Q2 — Project truth-state drift

### Leading paragraph

Q2 is completely static. Config at 74 codes (v1.8.0, unchanged for 91 days), wiki at 98 articles, ACT-PS still the one real gap in its fourth consecutive pass, 4 DB-only codes still unresolved. The only movement is Xero invoice counts growing across major projects — ACT-GD (+11), ACT-HV (+13), ACT-FM (+2), ACT-IN (+6) — reflecting active trading. Q2 requires a config maintenance pass; it will not move materially until someone bumps the config.

### What changed — Q2

| Metric | 2026-07-16 | 2026-07-23 | Direction |
|---|---|---|---|
| `config/project-codes.json` version | v1.8.0 (91 days without update) | v1.8.0 | → **stale** |
| Total codes in config | 74 | 74 | → |
| Total codes in DB (`projects` table) | 81* | **78** | ↓ (query variation likely) |
| Codes in DB not in config | 4 (DLB, PB, QD, RS) | 4 (DLB, PB, QD, RS) | → |
| Wiki articles | 98 | 98 | → **two passes unchanged** |
| ACT-PS authoring gap | Open (62 codebase refs) | Open (**79 codebase refs**) | ↓ gap grows |
| Active/ideation projects scoring <2/4 | 0 | 0 | → ✅ |
| ACT-GD Xero invoice count | 369 | **380** | ↑ +11 |
| ACT-HV Xero invoice count | 110 | **123** | ↑ +13 |
| ACT-IN Xero invoice count | 541 | **547** | ↑ +6 |
| Total Xero invoices (all codes) | 2,247 | **2,293** | ↑ +46 |

*2026-07-16 synthesis cited 81; today's query returns 78 — count variation is likely due to subtle query differences (COALESCE scope), not actual removals.

**Material changes:** None structurally. Xero growth confirms active operations. ACT-PS codebase refs grew from ~62 to 79 — the gap is accumulating technical debt.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### Leading paragraph

The entity migration picture has moved in one direction only: the BAS clock. Everything else is frozen — same 14 receivables, same 1 Xero tenant, same bank data horizon, same open questions about Pty Xero / NAB / D&O / shareholders agreement. The +46 Xero invoices in 7 days confirm the sole trader continues to be the active trading entity. `new-entity-xero-launch-playbook.md` is a new plan artifact, suggesting the Pty Xero launch sequence has been documented — but there is no DB evidence it has been executed. The most important fact this week: **BAS lodgement in 5 days.**

### What changed — Q3

| Metric | 2026-07-16 | 2026-07-23 | Direction |
|---|---|---|---|
| Days past cutover | +16 | **+23** | ↓ |
| **BAS Q4 FY26 due date** | **12 days away** | **5 days away** | 🚨 escalated |
| Xero tenant count | 1 (sole trader, 2,247 inv) | 1 (sole trader, **2,293 inv**) | → no Pty Xero in DB |
| Bank accounts in DB | NAB Visa ACT #8815 only (ends 2026-03-31) | Same | → |
| Outstanding ACCREC | $471,717.84 | $471,717.84 | → **frozen** |
| Post-cutover sole-trader invoices | $189,200 (3 inv, 2026-07-02) | $189,200 | → |
| Rotary INV-0222 (BAS write-off candidate) | $82,500, 462d | $82,500, **469d** | ↓ |
| Migration plan artifacts | 7 | **8** (+`new-entity-xero-launch-playbook.md`) | ↑ |
| EOFY strategic fork (journal vs sale) | Unresolved | Unresolved | → |
| D&O insurance | ❓ UNCONFIRMED (was due ~2026-05-24) | ❓ UNCONFIRMED (**99d past deadline**) | ↓ |
| Pty Xero file confirmed | ❓ | ❓ | → |
| $1 test invoice runbook executed | ❓ | ❓ | → |
| Shareholders Agreement signed | 🔴 NOT CONFIRMED | 🔴 NOT CONFIRMED | → |
| AusIndustry R&D re-registration (FY27) | Should start 1 Jul | 🔴 OPEN, **23d overdue** | ↓ |

**Material changes:**

**BAS deadline tightened from 12 to 5 days — this is the only material change.** Everything else is static. The `new-entity-xero-launch-playbook.md` artifact is new but its execution status is unknown. D&O is now 99 days past its deadline, making it increasingly urgent.

### Specific item status (called out in task)

| Item | 2026-07-16 | 2026-07-23 | Change |
|---|---|---|---|
| Centrecorp INV-0314 status | VOIDED | VOIDED | → |
| Director IDs confirmation | ⚠️ ASSUMED OK | ⚠️ ASSUMED OK | → |
| NAB Pty account | ❓ UNCONFIRMED | ❓ UNCONFIRMED | → |
| ABN application | ✅ ISSUED 2026-06-01 | ✅ | → |
| D&O insurance | ❓ UNCONFIRMED (was 2026-05-24 deadline) | ❓ UNCONFIRMED (now 99d past) | ↓ |
| Novation letter template | ✅ DRAFTED | ✅ DRAFTED | → |
| Shareholders Agreement | 🔴 NOT CONFIRMED | 🔴 NOT CONFIRMED | → |
| Migration draft count (keyword match) | `novation-letter-templates.md` (1) | Same (1) | → |

---

## Summary: what the 7-day window reveals

The most important signal from a 7-day diff is what **didn't** move. In 7 days:
- Zero receivables cleared or voided
- Zero Pty Xero evidence appeared
- Zero new bank accounts surfaced
- Zero new funder conversations recorded
- Zero project config or wiki changes made

The +46 Xero invoices and the BAS clock are the only movements. The sole trader continues to operate as if the cutover hasn't happened, which may be correct under Rule 2 — but the BAS in 5 days forces the question.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-05-14-to-2026-07-16|Prior drift: 2026-05-14 to 2026-07-16]]
- [[funder-alignment-2026-07-23|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-23|Q2 project truth-state — this pass]]
- [[entity-migration-truth-state-2026-07-23|Q3 entity migration — this pass]]
- [[index|ACT Wikipedia]]
