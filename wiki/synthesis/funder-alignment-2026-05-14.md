---
title: Funder alignment — second pass, ledger expanded and receivables beginning to clear
summary: Second pass of the ACT Alignment Loop (Q1), 20 days after the 2026-04-24 baseline. funders.json grew from 14 to 24 entries; $10K cleared from outstanding receivables; Centrecorp still DRAFT after 90 days; three new Xero contacts surfaced since baseline.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-14
---

# Funder alignment — 2026-05-14

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q1 pass. Same four sources as baseline: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **`wiki/narrative/funders.json` has grown from 14 to 24 entries.** Version upgraded to v2 (updated 2026-05-07). All seven Q1-recommended additions are in. Three more were added 2026-05-07: Brisbane Powerhouse Foundation ($7,150 paid historical), John Villiers Trust ($1,200 newly invoiced), and a second Rotary eClub stub (duplicate of the existing `rotary-eclub-outback` entry — should be merged). The ledger that pitch-assembly tooling reads is materially more complete.

2. **Total outstanding ACCREC dropped from $507,350 to $497,240.** Two funders paid: Just Reinvest ($27,500) and Homeland School ($4,950). PICC INV-0317 received a partial payment (down from $36,300 to $19,800). Three new invoices added: Sonas Properties Pty Ltd $37,290 (Harvest-related, ACT-HV), John Villiers Trust $1,200 (ACT-CORE), and one additional Aleisha Keating weekly retainer ($450). Net movement: ~$10K reduction.

3. **Centrecorp INV-0314 ($84,700 DRAFT) is now 90 days old.** The baseline flagged this at 70 days and called for an immediate decision. Twenty days later it is still DRAFT. No action. Named in the Goods → Minderoo pitch as live pipeline. This is the single most consequential stalled decision on the receivable book.

4. **Snow Foundation INV-0321 ($132,000) shows a future date: 2026-05-22.** The baseline recorded this invoice as dated 2026-03-18. The DB now shows 2026-05-22 — 8 days from now. Either the invoice was reissued with a new date, or the `date` field reflects a due date that has been extended. Worth confirming with Nic whether the invoice was amended and whether the migration conversation with Snow has happened.

5. **Rotary INV-0222 ($82,500) is now 399 days unpaid.** No change in status. The baseline called for a chase-or-write-off decision. Still unresolved. Approaching the point where the sole trader's FY26 close-out will carry this as bad debt if it isn't chased now.

6. **Sonas Properties Pty Ltd INV-0328 ($37,290) is new.** ACCREC invoice dated 2026-05-06, project ACT-HV. Not in baseline. Likely related to the Harvest early-access arrangement confirmed in the 2026-05-05 Standard Ledger conversation (D11.1 — Harvest as a subsidiary structure). This is a new receivable and does not have a `funders.json` entry.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert, 🆕 new since baseline

| Funder | DB status | Total billed | Outstanding | `funders.json` stage | Named in plans? | Change since baseline |
|---|---|---|---|---|---|---|
| **The Snow Foundation** | 🟡 auth | $402,930 paid + $132K out | **$132,000** AUTH (future-dated 2026-05-22) | active-partner | ✅ | ⚠️ invoice date changed; Pty migration call still needed |
| **Centrecorp Foundation** | 🟡 draft | $208,032 | **$84,700** DRAFT **90d** | active-partner | ✅ | 🔴 still DRAFT, 20 more days, no decision |
| **Rotary eClub Outback Australia** | 🟡 overdue | $82,500 | **$82,500** AUTH **399d** | ask-pending | — | 🔴 20 more days, no decision |
| **PICC** | 🟡 partial | $113,300 | **$96,800** (was $113K) | — | ✅ | 🟢 INV-0317 partial payment -$16.5K |
| **Regional Arts Australia** | 🟡 auth | $33,000 | **$33,000** AUTH 150d | — | — | → no change, 21 more days outstanding |
| **Sonas Properties Pty Ltd** | 🆕 auth | $37,290 | **$37,290** AUTH | — | ✅ (Harvest D11.1) | 🆕 new invoice, no wiki entry |
| **Brodie Germaine Fitness** | 🟡 auth | $15,400 | **$15,400** AUTH | — | — | → no change |
| **Aleisha J Keating** | 🟡 recurring | $12,150 | **$12,150** AUTH (27 inv) | — | ✅ (FM retainer) | ⚠️ 27 invoices now (was 26), oldest 315d |
| **Just Reinvest** | 🟢 paid | $27,500 | **$0** | — | ✅ | 🟢 PAID since baseline |
| **Homeland School** | 🟢 paid | $4,950 | **$0** | — | — | 🟢 PAID since baseline |
| **SMART Recovery Australia** | 🟡 auth | $2,200 | **$2,200** AUTH | — | — | → no change |
| **The John Villiers Trust** | 🆕 auth | $1,200 | **$1,200** AUTH | lapsed (stub 2026-05-07) | — | 🆕 new invoice; funders.json stub says "paid historically" — contradiction |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | $0 | active-partner | ✅ | → no change |
| **Vincent Fairfax Family Foundation** | ⚪ historical | $50,000 | $0 | lapsed (stub 2026-04-24) | — | ✅ stub added |
| **Social Impact Hub Foundation** | ⚪ historical | $26,730 | $0 | lapsed (stub 2026-04-24) | — | ✅ stub added |
| **State of QLD DFSDSCS** | ⚪ historical | $22,000 | $0 | lapsed (stub 2026-04-24) | — | ✅ stub added |
| **StreetSmart Australia** | ⚪ historical | $9,400 | $0 | active-partner (stub 2026-04-24) | — | ✅ stub added |
| **Brisbane Powerhouse Foundation** | 🆕 historical | $7,150 | $0 | lapsed (stub 2026-05-07) | — | 🆕 new stub |
| **Westpac Scholars Trust** | ⚪ historical | $3,080 | $0 | lapsed (stub 2026-04-24) | — | ✅ stub added |
| **Paul Ramsay Foundation** | ⚪ historical | $7,469 | $0 | warm (upgraded from cold) | ✅ | ✅ stage updated |
| **Minderoo Foundation** | ❔ ask-pending | — | — | ask-pending ($2.9M due 2026-05-15) | ✅ everywhere | ⚠️ deadline tomorrow — outcome unknown |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | term-sheet-pending | ✅ | → no change |
| **June Canavan Foundation** | ❔ | — | — | active-partner (unverified) | — | → unverified, unchanged |
| **Tim Fairfax Family Foundation** | ❔ | — | — | warm-cold | — | → no change |

---

## Money in flight — the 47-day countdown

Three funder invoices remain open on the sole trader.

### 🔴 Centrecorp Foundation INV-0314 — $84,700 DRAFT (90 days since 2026-02-13)

- **Status:** still DRAFT. Baseline called for an immediate decision. No action in 20 days.
- **Risk escalation:** the Minderoo pitch (deadline 2026-05-15) names this as live pipeline. If Lucy Stronach's team asks about it during due diligence, the answer needs to be "sent and payment in progress", not "still a draft".
- **Decision options remain unchanged:** send now → sole trader receives $84,700; void + reissue from Pty after 1 July; or close out. This is an only-Ben/Nic decision.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (399 days since 2025-04-10)

- **Status:** unchanged. 399 days. No GHL communication history exists. No action taken.
- **Risk:** 47 days until cutover. If not chased, this becomes a sole trader bad debt on the FY26 close-out BAS. A 400+ day unpaid AUTHORISED invoice is auditor-unfriendly.
- **Action:** decide this week — chase or write off as bad debt.

### 🟡 Snow Foundation INV-0321 — $132,000 AUTHORISED (date shows 2026-05-22)

- **Status:** still AUTHORISED, $132,000 outstanding. Invoice date changed from 2026-03-18 to 2026-05-22. Possible the invoice was amended or extended.
- **Migration note:** the Pty migration conversation with Snow should have happened by now (the checklist "call this week" action was from 2026-04-24). Confirm with Nic whether the migration notice has been given to Sally/Alexandra.

---

## New data surfaces — funders not in baseline

### 🆕 Sonas Properties Pty Ltd — $37,290 AUTHORISED (2026-05-06)

Not a traditional funder — the Harvest landlord. The 2026-05-05 Standard Ledger conversation confirmed that The Harvest will be a separate Pty Ltd subsidiary with Sonas's principals as minority shareholders. This ACCREC invoice likely reflects an early-access or deposit arrangement under the Harvest relationship. Needs a category in `funders.json` or a note in the wiki, and a disposition decision as part of the Harvest subsidiary incorporation.

### 🆕 Brisbane Powerhouse Foundation — $7,150 paid historical

Added to `funders.json` 2026-05-07 as a data-only stub. No current Xero activity, no GHL comm. Historical relationship only.

### ⚠️ Rotary eClub duplicate

`funders.json` now has two Rotary entries: `rotary-eclub-outback` (stage: ask-pending, added 2026-04-24) and `rotary-eclub-outback-australia-9560` (stage: active-partner, stub added 2026-05-07). These are the same entity. The second stub should be merged into the first and the duplicate removed. `narrative-draft.mjs --funder rotary-eclub-outback-australia-9560` would produce misleading output.

### ⚠️ John Villiers Trust — DB contradiction

`funders.json` says "Xero shows $1,200 paid historically" (stub dated 2026-05-07). But Xero shows INV-0327 as AUTHORISED ACCREC $1,200 dated 2026-05-03 — not paid. The stub was written inaccurately. Amount is small but the discrepancy should be corrected.

---

## Minderoo deadline — tomorrow (2026-05-15)

`funders.json` records the Minderoo ask deadline as 2026-05-15 ($2.9M via Lucy Stronach). As of this synthesis (2026-05-14), the outcome of that submission is unknown. Minderoo is the largest single ask in the funder ledger. If accepted, it would contract directly to the Pty (per the migration checklist). If rejected or deferred, the receivable book and migration cash-flow plan need updating. **Flag for next week's synthesis pass.**

---

## Actions — priority order

1. **Decide Centrecorp INV-0314** — 90 days DRAFT, Minderoo pitch credibility at stake. 10-minute Nic conversation. Today.
2. **Decide Rotary INV-0222** — 399 days unpaid. Chase or write off. Week of 2026-05-14.
3. **Confirm Snow INV-0321 date change** — was 2026-03-18, now shows 2026-05-22. Confirm if amended and whether migration notice was given.
4. **Merge Rotary duplicate in `funders.json`** — remove `rotary-eclub-outback-australia-9560`, consolidate into `rotary-eclub-outback`.
5. **Correct John Villiers Trust stub** — says "paid historically", actual DB shows AUTHORISED outstanding.
6. **Add Sonas Properties** — either as a `funders.json` entry (counterparty, not a funder) or reference in the Harvest subsidiary plan.
7. **Check Minderoo outcome** — 2026-05-15 deadline passes tomorrow; next synthesis should record result.

---

## Sources queried

| Source | Query / file | Rows / notes | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 38 rows | 2026-05-14 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-05-14 |
| `wiki/narrative/funders.json` | all entries | 24 entries, v2, updated 2026-05-07 | 2026-05-14 |
| `thoughts/shared/drafts/` | migration-keyword grep | 1 novation draft | 2026-05-14 |
| `ghl_contacts` + `communications_history` | funder-tagged, days_silent | query schema error — GHL comms not updated this pass | — |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
