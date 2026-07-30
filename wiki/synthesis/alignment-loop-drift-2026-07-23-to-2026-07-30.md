---
title: Alignment Loop drift — 2026-07-23 to 2026-07-30
summary: 7-day drift across all three ACT Alignment Loop questions. $53,950 cleared (Homeland + Sonas 2nd invoice). BAS Q4 FY26 due 28 July — now 2 days overdue and lodgement status unknown. Xero frozen at 2,293 invoices (zero growth). Q2 completely static.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-07-30
---

# Alignment Loop drift — 2026-07-23 to 2026-07-30

> 7-day drift surface. Baseline: the three 2026-07-23 syntheses. This pass: the three 2026-07-30 syntheses. First receivable movement in two weeks; BAS deadline crossed.

---

## TL;DR — what moved since 23 July

1. **$53,950 cleared — Homeland School ($44K) and Sonas second invoice ($9.95K) both PAID. Outstanding ACCREC drops from $471,717.84 to $417,767.84 (14→12 invoices).** First receivable movement in two weeks. The rest of the receivable book (Rotary $82.5K, ALIVE $167.2K, Mounty $22K, and 8 others) is unchanged.

2. **BAS Q4 FY26 standard due date (28 July) has passed — lodgement status is unknown from the DB.** Standard Ledger is ACT's registered tax agent and may hold a concession date; confirm the applicable deadline with them directly. Rotary INV-0222 remains AUTHORISED at $82,500 — no write-off is visible in Xero/DB. If lodged and written off, the DB has not yet reflected it.

3. **Everything else is static.** Xero invoice count frozen at 2,293 (zero growth vs +46 last week). Wiki at 98 articles. Config at 74 codes (97 days without update). Pty Xero still unconfirmed. EOFY strategic fork still unresolved. ACT-PS wiki gap enters fifth pass. D&O now 106 days past deadline.

---

## Q1 — Funder drift

### Leading paragraph

The funder receivables picture finally moved in 7 days: $53,950 cleared with two PAID confirmations (Homeland School Company INV-0303 at $44,000 and Sonas Properties INV-0337 at $9,950). This is the first reduction in outstanding ACCREC since the 2026-07-09 pass when several invoices cleared. The remaining book is entirely static — no new invoices raised, no other payments received. The most urgent funder event this week is not a collection but a compliance question: the BAS deadline crossed 2 days ago and the DB does not confirm whether the Rotary write-off was executed before lodgement.

### What changed — Q1

| Metric | 2026-07-23 | 2026-07-30 | Direction |
|---|---|---|---|
| Total outstanding ACCREC | $471,717.84 | **$417,767.84** | ↓ **−$53,950** |
| Invoice count (ACCREC AUTHORISED, amount_due > 0) | 14 | **12** | ↓ −2 |
| INV-0303 Homeland School Company | AUTHORISED $44,000 | **PAID** ✅ | ↑ |
| INV-0337 Sonas Properties (2nd invoice) | AUTHORISED $9,950 | **PAID** ✅ | ↑ |
| Rotary eClub INV-0222 age | 469 days | **476 days** | ↓ +7d |
| Rotary INV-0222 DB status | AUTHORISED $82,500 | AUTHORISED $82,500 | → unresolved |
| ALIVE National Centre outstanding | $167,200 (post-cutover) | $167,200 | → |
| Mounty Aboriginal Youth INV-0334 | $22,000 (post-cutover) | $22,000 | → |
| Snow Foundation INV-0321 | PAID | PAID | → ✅ |
| Centrecorp INV-0314 | VOIDED | VOIDED | → |
| PICC invoices | VOIDED (×2) | VOIDED (×2) | → |
| `funders.json` entry count | 25 (MRFF-Palmer added 2026-07-07) | 25 | → |
| Untagged post-cutover invoices | 3 ($189,200) | 3 ($189,200) | → unresolved |
| New counterparties without funders.json stub | 5 | 5 | → |
| Jenn Brazier INV-0228 age | 388 days | **395 days** | ↓ |
| DRAFT ACCREC count (amount_due > 0) | 1 ($0) | 1 ($0) | → |

**Material changes:** Two invoices paid ($53,950). No other movement. BAS deadline crossed — write-off outcome unknown.

---

## Q2 — Project truth-state drift

### Leading paragraph

Q2 is completely static for the second consecutive pass. Zero changes in config, wiki, DB codes, Xero tagged invoice counts, codebase refs, or score distribution. Notably, Xero tagged invoice counts show zero growth this week — a sharp departure from the +46 last week. This likely reflects a quiet billing period but could also indicate new invoices being raised without project codes (as with the ALIVE/Mounty post-cutover invoices). The only action that would move Q2 is a human doing one of the five derived actions that have been flagged for multiple passes: write ACT-PS wiki article, assess 4 DB-only codes, tag 3 post-cutover invoices, bump config version, remove ghost codes.

### What changed — Q2

| Metric | 2026-07-23 | 2026-07-30 | Direction |
|---|---|---|---|
| `config/project-codes.json` version | v1.8.0 (**91 days** without update) | v1.8.0 (**97 days** without update) | ↓ staling |
| Total codes in config | 74 | 74 | → |
| Total codes in DB (`projects` table) | 78 | 78 | → |
| Codes in DB not in config | 4 (DLB, PB, QD, RS) | 4 (DLB, PB, QD, RS) | → |
| Wiki articles | 98 | 98 | → **three passes unchanged** |
| ACT-PS authoring gap | Open (79 codebase refs) | Open (79 codebase refs) | → fifth pass |
| Active/ideation projects scoring <2/4 | 0 | 0 | → ✅ |
| ACT-GD Xero invoice count | 380 | **380** | → **0 growth** |
| ACT-HV Xero invoice count | 123 | **123** | → **0 growth** |
| ACT-IN Xero invoice count | 547 | **547** | → **0 growth** |
| Total Xero invoices (all codes) | 2,293 | **2,293** | → **0 growth** |

**Material changes:** None. The zero Xero growth is notable as a data point (no invoice activity visible vs +46 last week) but is not a structural problem.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### Leading paragraph

The dominant event this week is the BAS deadline crossing. Everything else is frozen: same single Xero tenant at 2,293 invoices, same bank data ending 2026-03-31, same open questions about Pty Xero / D&O / shareholders agreement. Two receivables paid ($53,950) are the only positive data point. The EOFY fork remains the single most consequential unresolved question — until Standard Ledger rules on journal-entry vs market-value sale, no cross-entity journals can be booked. The 30-day post-cutover milestone arrives today with multiple critical items still showing ❓ UNCONFIRMED.

### What changed — Q3

| Metric | 2026-07-23 | 2026-07-30 | Direction |
|---|---|---|---|
| Days past cutover | +23 | **+30** | ↓ |
| **BAS Q4 FY26 status** | **Due in 5 days** | **Standard 28 Jul date passed — agent concession may apply** | 🚨 confirm with SL |
| Rotary INV-0222 write-off outcome | Decision should precede BAS | INV-0222 still AUTHORISED in DB | ❓ outcome unknown |
| Xero tenant count | 1 (sole trader, 2,293 inv) | 1 (sole trader, **2,293 inv**) | → no Pty Xero in DB |
| Xero invoice growth (7d) | +46 | **+0** | ↓ |
| Bank accounts in DB | NAB Visa ACT #8815 only (ends 2026-03-31) | Same | → |
| Outstanding ACCREC | $471,717.84 | **$417,767.84** | ↓ **−$53,950** |
| Post-cutover sole-trader invoices | $189,200 (3 inv) | $189,200 | → |
| Rotary INV-0222 (BAS write-off candidate) | $82,500, 469d | $82,500, **476d** | ↓ |
| Migration plan artifacts | 8+ files | 8+ files | → |
| EOFY strategic fork (journal vs sale) | Unresolved | Unresolved | → |
| D&O insurance | ❓ UNCONFIRMED (**99d past deadline**) | ❓ UNCONFIRMED (**106d past deadline**) | ↓ |
| Pty Xero file confirmed | ❓ | ❓ | → |
| $1 test invoice runbook executed | ❓ | ❓ | → |
| Shareholders Agreement signed | 🔴 NOT CONFIRMED | 🔴 NOT CONFIRMED | → |
| AusIndustry R&D FY27 entity designation | Internal milestone 1 Jul | Internal milestone 30d past; ATO filing not due until ~Apr 2028 | → clarified |

**Material changes:**

**BAS standard deadline crossed — this is the only material status change.** Standard Ledger as registered agent may hold a concession date — confirm lodgement status directly. $53,950 cleared is a positive data point but not an entity migration event (both invoices were on the sole-trader legacy book). D&O is now 106 days past its nominal binding deadline. AusIndustry R&D entity designation is an internal milestone; no ATO filing is due until ~April 2028.

### Specific items (Q3 watch list)

| Item | 2026-07-23 | 2026-07-30 | Change |
|---|---|---|---|
| BAS Q4 FY26 status | Due in 5 days | **Standard 28 Jul date passed — agent concession may apply** | 🚨 confirm with SL |
| Rotary INV-0222 write-off | Decision required before BAS | Still AUTHORISED in DB | ❓ |
| Director IDs confirmation | ⚠️ ASSUMED OK | ⚠️ ASSUMED OK | → |
| NAB Pty account | ❓ UNCONFIRMED | ❓ UNCONFIRMED | → |
| ABN application | ✅ ISSUED 2026-06-01 | ✅ | → |
| D&O insurance | ❓ UNCONFIRMED (99d past) | ❓ UNCONFIRMED (**106d past**) | ↓ |
| Novation letter template | ✅ DRAFTED | ✅ DRAFTED | → |
| Shareholders Agreement | 🔴 NOT CONFIRMED | 🔴 NOT CONFIRMED | → |
| Migration draft count | 1 (`novation-letter-templates.md`) | 1 | → |
| R&D FY27 entity designation | Internal milestone 1 Jul | 30d past internal milestone; ATO filing ~Apr 2028 | → clarified |
| EOFY fork (journal vs sale) | 🔴 UNRESOLVED | 🔴 UNRESOLVED | → |

---

## Summary: what the 7-day window reveals

Two payments confirmed is the week's signal. Everything else — the BAS standard deadline crossed, the Pty Xero unknown, D&O aging, R&D entity decision pending — continued without visible resolution. The zero Xero growth is unusual and worth monitoring; it either reflects a genuinely quiet week or invoices being raised without DB visibility.

The single most important unknown: **has the Q4 FY26 BAS been lodged?** That question cannot be answered from DB data and must be confirmed directly with Standard Ledger.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-07-16-to-2026-07-23|Prior drift: 2026-07-16 to 2026-07-23]]
- [[funder-alignment-2026-07-30|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-30|Q2 project truth-state — this pass]]
- [[entity-migration-truth-state-2026-07-30|Q3 entity migration — this pass]]
- [[index|ACT Wikipedia]]
