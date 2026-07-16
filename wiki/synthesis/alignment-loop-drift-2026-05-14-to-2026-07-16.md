---
title: Alignment Loop drift — 2026-05-14 to 2026-07-16
summary: 63-day drift summary across all three ACT Alignment Loop questions. Cutover deadline passed. ABN cleared. Snow Foundation paid. Minderoo paused. Sole trader still invoicing post-July 1. EOFY Decision Pack introduces strategic fork on transfer method.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-07-16
---

# Alignment Loop drift — 2026-05-14 to 2026-07-16

> 63-day drift across three questions. Last pass was 2026-05-14 (47 days to cutover). This pass is 16 days **past** the 2026-06-30 cutover. The Pty should now be trading. The DB tells a more complicated story.

## TL;DR — what moved since 14 May

- **Snow Foundation paid ($132K cleared); Centrecorp and both PICC invoices voided ($265.5K removed from books).** Significant receivable resolution happened, mostly via voiding rather than payment.
- **ABN issued 2026-06-01 — the unblocking event.** GST registered same day. This was 5+ weeks late, compressed the entire cutover runway, and explains why the sole trader is still the only Xero entity in DB today.
- **The cutover deadline has passed but the sole trader is still invoicing.** Three invoices dated 2026-07-02 ($189.2K) on the sole trader. Cutover Rule 2 may explain it — but it needs explicit confirmation and BAS alignment with Standard Ledger this week.

---

## Q1 — Funder drift

### What changed

| Metric | 2026-05-14 | 2026-07-16 | Direction |
|---|---|---|---|
| Total $ outstanding ACCREC | $497,240 | $471,717.84 | ↓ −$25,522 |
| Snow Foundation INV-0321 | AUTH $132K (date 2026-05-22) | **PAID** | ↑ cleared |
| Centrecorp INV-0314 | DRAFT $84.7K (90d) | **VOIDED** | 🔄 decision made (not paid) |
| Rotary INV-0222 | AUTH $82.5K (399d) | AUTH $82.5K (**462d**) | ↓ +63d, no action |
| PICC total outstanding | $96.8K (2 invoices) | **VOIDED** (both) | 🔄 removed without payment |
| Aleisha Keating retainer | $12.15K (27 invoices) | Cleared | ↑ |
| SMART Recovery INV-0322 | $2.2K | Cleared | ↑ |
| John Villiers Trust INV-0327 | $1.2K AUTH | Cleared | ↑ |
| Regional Arts Australia | $33K (2 inv) | $16.5K (1 inv) | ↓ one cleared |
| New post-cutover invoices | 0 | **$189,200** (3 inv dated 2026-07-02) | 🔴 new risk |
| New counterparties without `funders.json` entry | Sonas, SIH (partial) | +5 (ALIVE, Julalikari, Tandanya, Berry Obsession, Homeland School) | ↓ ledger incomplete |
| Minderoo stage | ask-pending ($2.9M due 2026-05-15) | **paused** (Lucy internal restructure) | 🔴 ask suspended |
| `funders.json` last updated | 2026-05-07 | **2026-07-07** | ✅ active maintenance |
| Silent >90 days (funder-tagged GHL) | Multiple (107d batch) | Georgina Byron 99d (only active record) | → GHL comm data sparse |

### Material changes

**The receivable book was restructured, not cleared.** The headline drop of $25K masks a $345K in clearings offset by ~$320K in new invoices. The composition is now dominated by post-cutover sole-trader activity (ALIVE $167.2K) and long-standing outstanding items (Rotary $82.5K).

**Minderoo moving to "paused" is the most strategically significant shift.** The $2.9M ask timeline — the largest single item in the funder ledger — is suspended. Re-engagement is Q3 FY27 at earliest, per the updated `funders.json`.

**Centrecorp VOIDED (not paid) is a flag, not a victory.** The $84,700 DRAFT invoice that was stalled for 90 days was voided rather than sent. If the Centrecorp relationship remains real, a Pty invoice must be raised. If it's closed, the wiki's "active-partner" stage for Centrecorp needs updating.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-05-14 | 2026-07-16 | Direction |
|---|---|---|---|
| `config/project-codes.json` version | v1.8.0 (updated 2026-04-24) | v1.8.0 (updated 2026-04-24) | → **unchanged for 83 days** |
| Total codes in config | 74 | 74 | → |
| Total codes in DB (`projects` table) | ~80 | 81 | ↑ +1 (at least) |
| Codes in DB not in config | ~6 (e.g. ACT-GS not yet in config) | 4 (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) | → drift |
| Wiki articles | 98 | 98 | → **unchanged** |
| Active/ideation projects scoring <2/4 | 0 | 0 | → ✅ criterion holds |
| Authoring backlog (real gap) | 1 (ACT-PS) | 1 (ACT-PS) | → **three passes, still open** |
| Codes missing `canonical_slug` | 0 (fixed 2026-05-14) | 0 | → ✅ |
| ACT-GD Xero invoice count | 269 | 369 | ↑ +100 |
| ACT-HV Xero invoice count | ~110 | 110 | → stable |
| Total Xero invoices (all codes) | 2,094 | 2,247 | ↑ +153 |

### Material changes

**Q2 is the most stable quadrant — structurally sound, minor hygiene issues.** The config freeze is the clearest flag: 83 days without a version bump while the ecosystem has been actively evolving (new DB codes, EOFY period, post-cutover work). The config should reflect the current code set.

**ACT-PS wiki gap has persisted through all three passes.** It is now more urgent, not less — the project has accumulated more Xero invoices and codebase references. If any external audience reads the wiki expecting to find all active studio projects, this is the gap.

**The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) are a new config-reality gap.** These appeared in the `projects` table but have no config entry. They are invisible to tooling that reads config as the source of truth.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-05-14 | 2026-07-16 | Direction |
|---|---|---|---|
| Days until cutover | 47 | **−16 (PAST)** | ↓ cutover deadline has passed |
| ABN (Pty) | 🔴 OPEN/LATE | ✅ **ISSUED 2026-06-01** | ↑ cleared |
| GST registration (Pty) | 🔴 OPEN | ✅ **REGISTERED 2026-06-01** | ↑ cleared |
| Xero tenant count | 1 (sole trader, 2,094 inv) | 1 (sole trader, **2,247 inv**) | → **no Pty Xero in DB** |
| Bank accounts | NAB Visa ACT #8815 only (data to 2026-03-31) | NAB Visa ACT #8815 only (data still ends 2026-03-31) | ❓ cannot confirm Pty NAB |
| $ outstanding ACCREC (all counterparties) | $497,240 | $471,717.84 | ↓ −$25,522 |
| DRAFT ACCREC (live $$) | $0 (2 drafts at $0) | $0 (2 drafts at $0) | → |
| Post-cutover sole-trader invoices | 0 | **$189,200** (3 inv) | 🔴 new |
| D&O insurance | 🔴 URGENT (10d to deadline) | ❓ UNCONFIRMED (was in progress June 1) | → may have resolved |
| Novation letter template | ✅ drafted (not yet sent) | ✅ drafted | → |
| Funder novation letters sent | 🔴 NOT SENT | ❓ UNCONFIRMED | → |
| IP assignment deed | 🔴 NOT STARTED | 🔴 NOT CONFIRMED | → |
| Shareholders Agreement | 🔴 NOT STARTED/LATE | 🔴 NOT CONFIRMED | → |
| Migration-related plan artifacts | 1 (novation template) | **7** | ↑ active planning |
| Strategic fork (journal vs sale) | Not surfaced | 🔴 **RAISED by EOFY Decision Pack** | 🆕 new risk |

### Material changes

**The ABN unblocking (2026-06-01) is the standout positive.** Everything downstream — Pty Xero, NAB, payroll, novation letters, the $1 test invoice — was gated on this. The 5-week delay compressed the cutover runway to 29 days and likely explains the current state.

**The sole trader continuing to invoice post-30-June is the most important fact to resolve this week.** The $189.2K on the books (ALIVE + Mounty) may be legitimate under Rule 2, but the FY26 BAS (due 28 July — 12 days from this synthesis) must account for these. If Standard Ledger hasn't been briefed on post-cutover sole-trader income, that brief must happen immediately.

**The EOFY Decision Pack (2026-06-19) surfaces a potential structural problem with the planned migration method.** The 9-agent research concluded that the "journal-entry / sole-trader operated on behalf of the Pty" model likely fails under Subdiv 328-G and 122-A (two-family cap table). The alternative — a market-value sale with a vendor-finance loan — would change the accounting, tax, and R&D basis of the entire entity migration. This cannot be resolved here; it requires Standard Ledger confirmation and potentially a private ATO ruling.

### Specific item transitions called out in the prompt

| Item | 2026-05-14 status | 2026-07-16 status |
|---|---|---|
| Centrecorp INV-0314 | DRAFT 90d, decision urgently needed | **VOIDED** — decision made; no payment |
| Director IDs confirmation | ⚠️ UNVERIFIED | ⚠️ ASSUMED OK (ABN issued without block) |
| NAB Pty account | 🔴 OPEN/LATE | ❓ UNCONFIRMED (data ends 2026-03-31) |
| ABN application | 🔴 OPEN/LATE (target week of May 1 missed) | ✅ ISSUED 2026-06-01 |
| D&O insurance (due ~2026-05-24) | 🔴 URGENT, 10d | ❓ UNCONFIRMED (was in progress June 1) |
| Novation letter template | ✅ DRAFTED | ✅ DRAFTED (not confirmed sent) |
| Shareholders Agreement | 🔴 NOT STARTED/LATE | 🔴 NOT CONFIRMED |
| IP assignment deed | 🔴 NOT STARTED | 🔴 NOT CONFIRMED |
| Migration-keyword drafts | 1 | 7 (active planning through June) |

---

## Cross-question summary

| | Q1 Funders | Q2 Projects | Q3 Migration |
|---|---|---|---|
| **Net direction** | Mixed — clearings and new exposure | Stable, minor hygiene | 🔴 Critical — post-cutover sole trader, strategic fork |
| **Most urgent action** | Resolve Rule 2 + Rotary write-off for BAS | Write ACT-PS article | BAS (28 July) + SL brief on post-June income |
| **Biggest positive** | Snow PAID $132K | All active projects ≥2/4 continues | ABN issued (the gate cleared) |
| **Biggest new risk** | $189.2K post-cutover sole trader | 4 DB codes not in config | Strategic transfer-method fork (journal vs sale) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-14|Prior drift summary — 2026-04-24 to 2026-05-14]]
- [[funder-alignment-2026-07-16|Q1 funder synthesis — 2026-07-16]]
- [[project-truth-state-2026-07-16|Q2 project synthesis — 2026-07-16]]
- [[entity-migration-truth-state-2026-07-16|Q3 entity synthesis — 2026-07-16]]
