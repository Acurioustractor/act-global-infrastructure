---
title: Funder alignment — 2026-07-02, post-cutover, receivables up, MRFF relationship live
summary: Third pass of the ACT Alignment Loop (Q1), 49 days after the 2026-05-14 pass. funders.json has grown from 24 to 49 entries. $345K cleared from the book; $451K new invoices raised; net outstanding up to $602,985.84. MRFF/UoM invoiced today ($167.2K). Rotary INV-0222 is now 448 days unpaid.
tags: [synthesis, funders, alignment-loop, entity-migration, mrff]
status: active
date: 2026-07-02
---

# Funder alignment — 2026-07-02

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q1 pass. Four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Previous pass: [[funder-alignment-2026-05-14|2026-05-14]].

## Headline findings

1. **`wiki/narrative/funders.json` has grown from 24 entries (May 14) to 49 entries.** Version 2 last updated 2026-06-05. The ledger is substantially more complete than the baseline. MRFF/UoM (Prof Victoria Palmer, ALIVE National Centre) was added as a `warm` prospect with a 2026-06-26 deadline and a five-year ACT envelope of $450K–$750K. Three Rotary eClub entries remain (one `rotary-eclub-outback`, one `rotary-eclub-outback-australia-9560`, one `rotary-eclub-outback-australia-division-9560`) — these are the same entity and should be merged.

2. **Major clearances since May 14: ~$345K off the book.** Snow Foundation INV-0321 ($132,000) paid. Centrecorp INV-0314 ($84,700 DRAFT) resolved — no longer outstanding. PICC INV-0317 + INV-0324 ($96,800 combined) both paid. SMART Recovery ($2,200) paid. Aleisha Keating retainer ($12,150) cleared. Regional Arts Australia partial payment ($16,500 of $33K).

3. **Net outstanding rose to $602,985.84** (up from $497,240 at May 14). $451K in new invoices offset the clearances. Three largest new receivables: ALIVE/UoM MRFF $167,200 (two invoices dated TODAY, July 2 — the Year 1 MRFF engagement); Sonas Properties $167,838 across three Harvest-related invoices; Homeland School Company $44,000 (new larger invoice on ACT-GD, different from the $4,950 that was paid).

4. **MRFF/UoM is the most significant new relationship.** Two invoices dated 2026-07-02 (INV-0341 $66,000 + INV-0342 $101,200) from ALIVE National Centre for Mental Health Research Translation — University of Melbourne. These represent Year 1 of the MRFF GNT2051566 grant (2026–2031), with ACT named as a partner AI for Tennant Creek + Palm Island. The five-year ACT envelope (~$450K–$750K) is the largest non-Minderoo pipeline on the ledger.

5. **Minderoo confirmed paused.** Lucy Stronach paused justice conversations 2026-05-14 due to Minderoo internal restructure. Re-engage Q3 FY27 or on Lucy's signal. The `funders.json` stage is now `paused` (was `ask-pending` at baseline).

6. **Rotary INV-0222 ($82,500) is now 448 days unpaid** — the oldest and most delinquent receivable on the book. No action taken since the 2026-04-24 baseline first flagged it. This is now approaching the point of statutory write-off.

7. **Two invoices in the sole trader file dated July 2, 2026** (the ALIVE/UoM pair). The cutover was June 30. These are still in the sole trader's Xero tenant — see Q3 entity migration synthesis for the full cutover signal.

---

## At-a-glance — outstanding receivables as at 2026-07-02

| Counterparty | Invoice | Amount | Status | Age | Project | Change since May 14 |
|---|---|---:|---|---:|---|---|
| **ALIVE National Centre (UoM / MRFF)** | INV-0341 | $66,000 | AUTH | 0d | — | 🆕 NEW (Jul 2, MRFF Year 1) |
| **ALIVE National Centre (UoM / MRFF)** | INV-0342 | $101,200 | AUTH | 0d | — | 🆕 NEW (Jul 2, MRFF Year 1) |
| **Sonas Properties Pty Ltd** | INV-0337 | $59,950 | AUTH | 7d | — | 🆕 NEW (Harvest subsidiary) |
| **Sonas Properties Pty Ltd** | INV-0336 | $63,888 | AUTH | 7d | — | 🆕 NEW (Harvest subsidiary) |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | AUTH | 136d | ACT-HV | 🆕 surfaced (predates May 14 but not listed) |
| **Homeland School Company** | INV-0303 | $44,000 | AUTH | 45d | ACT-GD | 🆕 NEW (new larger invoice; prior $4,950 was paid) |
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTH | **448d** | ACT-GD | 🔴 +49d, no action |
| **Dusseldorp Forum** | INV-0338 | $16,500 | AUTH | 7d | — | 🆕 NEW (Jun 25) |
| **Tandanya National Aboriginal Cultural Institute** | INV-0332 | $16,500 | AUTH | 15d | — | 🆕 NEW |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | AUTH | — | ACT-CP | 🆕 surfaced |
| **Mounty Aboriginal Youth & Community Services** | INV-0334 | $22,000 | AUTH | 0d | — | 🆕 NEW (Jul 2) |
| **Julalikari Council Aboriginal Corporation** | INV-0335 | $15,000 | AUTH | 13d | ACT-GD | 🆕 NEW |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | AUTH | 78d | ACT-BG | → no change |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 198d | ACT-HV | 🟡 partial: $16.5K of $33K paid |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | AUTH | 142d | ACT-HV | 🆕 surfaced |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 15d | — | 🆕 NEW |
| **Jenn Brazier** | INV-0228 | $3,887.84 | AUTH | 366d | ACT-GP | → persists (Gold Phone) |
| **TOTAL OUTSTANDING** | | **$602,985.84** | | | | ↑ +$105,745.84 vs May 14 |

---

## Cleared since May 14 — what came in

| Counterparty | Amount | Status | Notes |
|---|---:|---|---|
| **Snow Foundation INV-0321** | $132,000 | PAID ✅ | Cleared; migration notice presumably given |
| **Centrecorp INV-0314** | $84,700 | RESOLVED ✅ | No longer outstanding; DRAFT appears zeroed/voided |
| **PICC INV-0317 + INV-0324** | $96,800 | PAID ✅ | Both invoices cleared |
| **SMART Recovery INV-0322** | $2,200 | PAID ✅ | |
| **Aleisha J Keating (recurring)** | $12,150 | CLEARED | All 27 recurring invoices resolved |
| **Regional Arts Australia INV-0301** | $16,500 | PAID (partial) | INV-0302 still outstanding |
| **John Villiers Trust INV-0327** | $1,200 | PAID ✅ | |
| **Sonas Properties INV-0328** | $37,290 | PAID ✅ | Harvest early-access deposit |
| **TOTAL CLEARED** | ~$382,840 | | |

---

## Strategic ledger state

### Active funders with live DB relationship

| Funder | Stage | Outstanding | Last comm | Signal |
|---|---|---|---|---|
| ALIVE National Centre / MRFF | warm / Year 1 | $167,200 (today's invoices) | Palmer Palmer conversation pending Jun 26 | 🟢 Grant active, invoiced |
| Snow Foundation | active-partner | $0 (paid) | 2026-05-20 | 🟢 Cleared; track next tranche |
| Dusseldorp Forum | active-partner | $16,500 | 2026-05-19 | 🟢 Recent comm; invoice Jun 25 |
| QBE Catalysing Impact | active-partner | — | 2026-05-19 | 🟢 Contracted to Pty |
| Tim Fairfax Family Foundation | warm | — | 2026-05-20 | 🟢 Recent comm |
| June Canavan Foundation | active-partner (unverified) | — | 2026-05-21 | 🟡 Comm active, still no Xero record |

### Outstanding risk items

| Risk | Invoice | Amount | Days | Action needed |
|---|---|---|---:|---|
| 🔴 Rotary INV-0222 | AUTH | $82,500 | 448 | Chase or write off — NOW. Three loop passes without action. |
| 🟠 Regional Arts INV-0302 | AUTH | $16,500 | 198d | Chase; long-outstanding |
| 🟠 Jenn Brazier INV-0228 | AUTH | $3,887.84 | 366d | Chase (Gold Phone project) |
| 🟡 Homeland School INV-0303 | AUTH | $44,000 | 45d | Monitor — larger than prior invoice |
| 🆕 ALIVE/UoM MRFF | AUTH | $167,200 | 0d | Monitor — newly invoiced today |

### Minderoo — paused

Lucy Stronach paused justice conversations 2026-05-14 due to internal Minderoo restructure. `funders.json` stage: `paused`. Re-engage signal: Q3 FY27 or Lucy's direct outreach. The $2.9M ask and May 15 deadline are now moot. MRFF/UoM is the active large-pipeline replacement.

---

## `funders.json` ledger status

| Metric | 2026-04-24 | 2026-05-14 | 2026-07-02 | Change |
|---|---:|---:|---:|---|
| Total entries | 14 | 24 | 49 | ↑ +25 since May 14 |
| Version | v1 | v2 (May 7) | v2 (Jun 5) | → |
| `needs-writeup` stubs | 0 | 7 | ~27 | Many auto-stubs still need hand-written briefs |
| Duplicate Rotary entries | 0 | 2 | 3 | ⚠️ merge needed |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ All 17 AUTHORISED ACCREC invoices enumerated above |
| Every funder in active plans with no DB presence flagged | ✅ June Canavan still unverified (no Xero record) |
| Every funder silent >90 days flagged | ✅ Rotary (no comm record), Jenn Brazier 366d |

---

## Open actions

1. **Rotary INV-0222 ($82,500)** — 448 days. This is bad debt territory. Decide chase-or-write-off NOW. Three loop passes have flagged this with no action.
2. **Merge three Rotary entries in `funders.json`** — `rotary-eclub-outback`, `rotary-eclub-outback-australia-9560`, `rotary-eclub-outback-australia-division-9560` are the same entity.
3. **MRFF/UoM — confirm Palmer conversation pre-relay** (relay departed Jun 27; Tennant Creek is Year 1 MRFF site). Two invoices dated today ($167.2K) — confirm payment timing and project-code assignment.
4. **Homeland School INV-0303 ($44,000)** — new larger invoice on ACT-GD. Confirm scope vs prior $4,950 relationship.
5. **Write up ~27 `needs-writeup` stubs** in `funders.json` to enable pitch-assembly tooling to use them.
6. **Confirm Dusseldorp migration notice** — INV-0338 dated Jun 25 raises the question of whether this was invoiced from the sole trader or Pty (per Q3 synthesis: still in sole trader tenant).
7. **Regional Arts Australia INV-0302 ($16,500, 198 days)** — chase.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 17 | 2026-07-02 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-07-02 |
| `wiki/narrative/funders.json` | all entries | 49 | 2026-06-05 (file) |
| `ghl_contacts` | tags ILIKE '%funder%' distinct tags | 7 tag variants | 2026-07-02 |
| `thoughts/shared/plans/` | migration-keyword listing | see Q3 synthesis | 2026-07-02 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 — 2026-05-14 previous pass]]
- [[funder-alignment-2026-04-24|Q1 — 2026-04-24 baseline]]
- [[entity-migration-truth-state-2026-07-02|Q3 entity migration — this pass]]
- [[index|ACT Wikipedia]]
