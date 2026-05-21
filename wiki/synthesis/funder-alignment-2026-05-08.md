---
title: Funder alignment — second pass, ledger at 40 entries, Centrecorp sent, $602K outstanding
summary: Second pass of the ACT Alignment Loop (Q1), scheduled 2026-05-08 (queries run 2026-05-21). funders.json grew from 14 to 40 entries (v2, 2026-05-16). Centrecorp INV-0314 moved from DRAFT $84,700 to AUTHORISED $97,900 plus two new Centrecorp invoices. Total funder-tier outstanding grew from $299K to $479K. Rotary still 400+ days unpaid.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-08
---

# Funder alignment — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q1 second pass. Scheduled date: 2026-05-08 (2 weeks after baseline). Queries run: 2026-05-21. Four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), `thoughts/shared/drafts + plans` (in-flight work). Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **`wiki/narrative/funders.json` has exploded from 14 to 40 entries.** Version 2, updated 2026-05-16. All seven Q1-recommended additions are in, plus ~19 additional auto-stubs from Xero contacts. The pitch-assembly ledger is materially more complete. Duplicate Rotary entry exists (`rotary-eclub-outback` vs `rotary-eclub-outback-australia-9560` vs `rotary-eclub-outback-australia-division-9560`) — three stubs covering one funder. Needs merge.

2. **Centrecorp INV-0314 is no longer DRAFT.** The 70-day-old DRAFT that dominated the baseline risk map has been sent: status is now AUTHORISED at $97,900 (amount revised up from $84,700). Additionally, two new Centrecorp invoices were raised on 2026-05-17: INV-0329 ($61,050) and INV-0331 ($106,150). Total Centrecorp outstanding: **$265,100** — the single largest outstanding relationship on the book.

3. **Snow Foundation INV-0321 ($132,000) carries a future date of 2026-05-22.** The baseline recorded this invoice as dated 2026-03-18 (AUTHORISED 37 days). The DB now shows 2026-05-22. Either the invoice was reissued/amended, or the `date` field reflects an extended due date. The relationship remains warm (last comm ~10d at baseline). The Pty migration conversation has not been confirmed as happening.

4. **Rotary eClub INV-0222 ($82,500) is now 400+ days unpaid.** Entered its second year as an outstanding AUTHORISED invoice. No GHL comm history. No chase-or-write-off decision made at baseline or since. The sole trader's FY26 close-out BAS will carry this as either a receivable or declared bad debt — that decision can't wait.

5. **Total ACCREC outstanding grew from $507,350 to $602,040.** The funder-tier (Snow + Centrecorp + Rotary) moved from $299,200 to $479,650. The broader book includes Sonas Properties $37,290 (Harvest early-access), Homeland School new $44K invoice, Brodie Germaine $15,400, Aleisha Keating recurring $5,850, Regional Arts $16,500, SMART $2,200, JVT $1,200.

6. **Minderoo pitch outcome.** The 2026-04-24 baseline noted "ask: $2.9M deadline 2026-05-15." That deadline has passed. No Xero invoice for Minderoo exists (still ❔ ask-pending in funders.json). Outcome unknown from DB evidence — Ben/Nic to confirm status.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert, 🆕 new since baseline

| Funder | DB status | Total billed | Outstanding | `funders.json` stage | Named in plans? | Change since baseline |
|---|---|---|---|---|---|---|
| **Centrecorp Foundation** | 🟡 auth | $208,032 + $265K new | **$265,100** (3 inv) | active-partner | ✅ entity-migration, Goods pitch | ✅ INV-0314 sent; 2 new invoices |
| **The Snow Foundation** | 🟡 auth | $402,930 paid | **$132,000** (future-dated 2026-05-22) | active-partner | ✅ migration plan | ⚠️ date changed; Pty call still needed |
| **Rotary eClub Outback Australia** | 🟡 overdue | $82,500 | **$82,500** AUTH **400+ days** | ask-pending / stubs ×3 | — | 🔴 20+ days; no decision; approaching FY26 write-off date |
| **Sonas Properties Pty Ltd** | 🆕 auth | $37,290 | **$37,290** AUTH | needs-writeup | ✅ Harvest D11.1 | 🆕 new; Harvest early-access |
| **Homeland School Company** | 🟡 auth | $40,000 | **$44,000** AUTH | needs-writeup | — | ⚠️ new invoice; larger amount |
| **Regional Arts Australia** | 🟡 auth | $16,500 paid | **$16,500** AUTH (156d) | needs-writeup | — | 🟡 INV-0301 paid; INV-0302 still out |
| **Brodie Germaine Fitness** | 🟡 auth | $0 paid | **$15,400** AUTH | needs-writeup | — | → no change |
| **Aleisha J Keating** | 🟡 recurring | $0 paid | **$5,850** AUTH (13 inv) | needs-writeup | ✅ FM retainer | 🟡 down from $11,700/26 inv |
| **SMART Recovery Australia** | 🟡 auth | $156,500 paid | **$2,200** AUTH | needs-writeup | — | → no change |
| **The John Villiers Trust** | 🆕 auth | $1,200 | **$1,200** AUTH | lapsed (stub) | — | 🆕 new invoice; funders.json stub says "paid historically" contradiction |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | $0 | active-partner | ✅ CONTAINED | → unchanged |
| **Vincent Fairfax Family Foundation** | ⚪ historical | $50,000 | $0 | lapsed (stub) | — | ✅ stub added since baseline |
| **Social Impact Hub Foundation** | ⚪ historical | $26,730 | $0 | lapsed (stub) | — | ✅ stub added |
| **State of QLD DFSDSCS** | ⚪ historical | $22,000 | $0 | lapsed (stub) | — | ✅ stub added |
| **StreetSmart Australia** | ⚪ historical | $9,400 | $0 | active-partner (stub) | — | ✅ stub added |
| **Brisbane Powerhouse Foundation** | ⚪ historical | $7,150 | $0 | lapsed (stub) | — | 🆕 new stub (2026-05-07) |
| **Paul Ramsay Foundation** | ⚪ historical | $7,469 | $0 | warm (upgraded) | ✅ multiple | ✅ stage upgraded from cold |
| **Westpac Scholars Trust** | ⚪ historical | $3,080 | $0 | lapsed (stub) | — | ✅ stub added |
| **Minderoo Foundation** | ❔ ask-pending | — | — | ask-pending ($2.9M, deadline 2026-05-15 **PASSED**) | ✅ everywhere | ⚠️ deadline passed; outcome unknown |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | term-sheet-pending | ✅ entity-migration | ✅ contracted to Pty (no sole-trader risk) |
| **June Canavan Foundation** | ❔ | — | — | active-partner (unverified) | — | → unverified, unchanged |
| **Tim Fairfax Family Foundation** | ❔ | — | — | warm-cold | — | → unchanged |
| **Philanthropy Network / Kim Harland** | 🟢 GHL-only | — | — | *not listed* | ✅ funder-notes | → recent contact |
| **FRRR (Steph Pearson)** | 🟢 GHL-only | — | — | *not listed* | — | → recent contact |

---

## Money in flight — the funder countdown

Three funder-tier receivables remain on the sole trader. Each needs a disposition decision before 30 June 2026.

### 🔴 Centrecorp Foundation — $265,100 across 3 invoices

- **INV-0314** ($97,900 AUTH, 2026-05-22): the stalled DRAFT is now sent. Outstanding.
- **INV-0329** ($61,050 AUTH, 2026-05-17): new invoice.
- **INV-0331** ($106,150 AUTH, 2026-05-17): new invoice.
- **Action:** Three invoices, all within weeks of the cutover. Confirm payment timeline with Centrecorp contact. Issue novation notice (template drafted — needs Standard Ledger review + Pty bank details to send).

### 🟡 Snow Foundation INV-0321 — $132,000 AUTH (future-dated 2026-05-22)

- **Evidence:** Invoice date in DB is 2026-05-22 — either reissued or due date extended. Relationship is warm. $402,930 paid across 7 prior tranches.
- **Action this week:** Call Sally/Alexandra. Confirm payment timing. Flag the Pty migration: "from 1 July, new tranches invoice to A Curious Tractor Pty Ltd ACN 697 347 676."

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTH (400+ days)

- **Evidence:** Invoice sent April 2025. No payment. No GHL comm record. Entering FY26 close-out territory.
- **Action this week:** Decision — chase or write off. If written off, it's a bad debt claim on the sole trader FY26 return. If chased, need a named human at Rotary (current GHL stub is an invoicing placeholder).

---

## funders.json drift

At baseline: 14 entries. Now: **40 entries** (v2, updated 2026-05-16).

### Added since baseline (confirmed)

7 Xero-reality funders added 2026-04-24: Centrecorp, Rotary, Vincent Fairfax, Social Impact Hub, State of QLD, StreetSmart, Westpac Scholars.

Added 2026-05-07: Brisbane Powerhouse Foundation, John Villiers Trust, plus duplicate Rotary stub.

Added 2026-05-16 (batch auto-stub): PICC, SMART Recovery, Sonas Properties, Ingkerreke Services, Rotary Division 9560 (3rd Rotary stub), Regional Arts Australia, Homeland School, Just Reinvest, Green Fox Training, State of QLD (duplicate), Our Community Shed, Julalikari Council, Red Dust Role Models, Brodie Germaine Fitness, Berry Obsession, Aleisha Keating, QIC Limited, Blue Gum Station, Jenn Brazier, Bigmeats QLD, Mala'la Health Service.

### Authoring backlog

Three classes of debt:
1. **Three Rotary stubs** — should be merged into one entry.
2. **~20 auto-stubs** marked `stage: needs-writeup` — data-only, not yet pitch-ready.
3. **Minderoo outcome** — deadline passed; update stage from `ask-pending` to actual outcome.

### Stage drift (required corrections)

| Funder | Old stage | Suggested stage | Reason |
|---|---|---|---|
| Rotary eClub Outback | ask-pending | pending-decision | 400+ days; not a fresh ask |
| Snow Foundation | active-partner | active-partner | ✅ correct |
| June Canavan Foundation | active-partner | unverified | No Xero invoice; relationship status unclear |
| Minderoo Foundation | ask-pending | ask-pending / update post-outcome | Deadline 2026-05-15 passed |

---

## Silence map — funder contacts >90 days

GHL `last_contact_date` on contacts tagged `funder`: the column exists. Query returned schema error on first attempt — communications_history column type mismatch. The following reflects what was visible from the 2026-04-24 baseline data (days elapsed since then: 27 days).

Contacts that were ≥63 days silent at baseline are now ≥90 days:
- **Paul Ramsay Foundation** (hello@) — was 80d, now ~107d silent.
- **Shannon Lemanski** — was 107d, now ~134d.
- **Bryan Foundation, Funding Network, AMP, Queensland Gives** — all were 107d, now ~134d.
- **StreetSmart Isabella + Alan, Jacqueline Fearnley** — were 105d, now ~132d.

The four 107-day contacts from the January cold-outreach batch are now at 134 days with no response. Re-engage or close.

---

## Alignment-loop acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every funder with live outstanding named | ✅ | Snow, Centrecorp ×3, Rotary, Sonas, Homeland, Regional Arts, Brodie, Aleisha, SMART, JVT |
| Every funder in active plans with no DB presence flagged | ✅ | Minderoo (outcome unknown), June Canavan (unverified), QBE (contracted to Pty) |
| Every funder silent >90 days flagged | ✅ | ~8 contacts ≥90d silent (PRF, January batch) |

---

## Open actions (updated from baseline)

Ordered by 30 June cutover risk.

1. **Confirm Minderoo outcome** with Ben/Nic. Deadline was 2026-05-15. Update funders.json stage.
2. **Call Snow Foundation.** Confirm INV-0321 payment + Pty migration notice. Warm relationship.
3. **Decide Rotary eClub INV-0222.** Chase (find named Rotary human) or write off (FY26 bad debt).
4. **Centrecorp INV-0329 + 0331** — confirm payment terms and whether novation notice needed.
5. **Merge three Rotary stubs** in funders.json (`rotary-eclub-outback`, `rotary-eclub-outback-australia-9560`, `rotary-eclub-outback-australia-division-9560`).
6. **Re-engage or close** the 4 silent 134-day contacts (Bryan, TFN, AMP, Queensland Gives).

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, status IN (AUTHORISED,DRAFT), amount_due > 0 | 24 AUTH + 2 DRAFT | 2026-05-21 |
| `ghl_contacts` | tags && ARRAY['funder'] — distinct tags | `funder`, `goods-funder`, `goods-gmail-funder` | 2026-05-21 |
| `ghl_contacts` | last_contact_date on funder-tagged contacts | schema query only (comms_history type mismatch) | 2026-05-21 |
| `wiki/narrative/funders.json` | all entries | 40 | file updated 2026-05-16 |
| `thoughts/shared/{plans,drafts}/` | funder name grep | ~30 files | 2026-05-21 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[entity-migration-truth-state-2026-05-08|Q3 entity migration — 2026-05-08 pass]]
- [[funder-alignment-2026-04-24|Q1 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
