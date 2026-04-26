---
title: Funder alignment — second pass, two weeks post-baseline
summary: Second run of the ACT Alignment Loop (Q1). Drift check against the 2026-04-24 baseline. funders.json unchanged. Three funder invoices still outstanding and unmoved. Silent-90+ cohort has grown. No material funder movement in 2 days.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-08
---

# Funder alignment — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]] Q1 cycle. Baseline: [[funder-alignment-2026-04-24|2026-04-24]]. Data pulled: 2026-04-26 (2 days post-baseline — actual run date; file dated 2026-05-08 per loop schedule). Sources: `xero_invoices` (DB), `ghl_contacts` (comms state), `wiki/narrative/funders.json`, `thoughts/shared/drafts + plans`.

## Headline findings

1. **`wiki/narrative/funders.json` is unchanged from the 2026-04-24 baseline.** Still version 2, 21 funders, last updated 2026-04-24. None of the 7 backlog entries added since the baseline were updated. The 7 funders absent from the wiki but present in Xero (Centrecorp, Rotary, VFFF, Social Impact Hub, State QLD, StreetSmart, Westpac) are still stubs only — the narrative for each is incomplete for pitch use.
2. **Three live funder invoices are unchanged.** Snow INV-0321 ($132K AUTHORISED, now 39d vs 37d at baseline), Centrecorp INV-0314 ($84,700 DRAFT, now 72d vs 70d), Rotary INV-0222 ($82,500 AUTHORISED, now 382d vs 380d). No payment received on any of these. No decision made on Centrecorp. No decision made on Rotary (chase-or-write-off). **These three actions remain outstanding.**
3. **Total outstanding ACCREC is $507,700** — up $350 from baseline ($507,350). One additional Aleisha Keating weekly invoice cycled in. Not material.
4. **The silent-90+ cohort has grown.** Fourteen funder-tagged GHL contacts now show >120 days since last comm via `ghl_contacts.last_contact_date`. Paul Ramsay Foundation (now 128d, was ~80d at baseline) has crossed the 90-day threshold and joins the silent-critical list. No funder re-engagement is recorded.
5. **No new funder has appeared in Xero** since baseline. The receivable book composition is identical.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert, → no change

| Funder | DB status | Total billed | Outstanding | Last comm (days) | `funders.json` stage | Named in plans? | Drift vs baseline |
|---|---|---|---|---|---|---|---|
| **The Snow Foundation** | 🟢 live | $402,930 | **$132,000** | ~39d (unchanged) | active-partner | ✅ | → unchanged |
| **Centrecorp Foundation** | 🟡 draft | $208,032 | **$84,700** DRAFT | — | active-partner | ✅ | → INV-0314 still DRAFT (72d, +2d) |
| **Rotary eClub Outback Australia** | 🟡 12mo+ | $82,500 | **$82,500** AUTH 382d | — | ask-pending | — | → INV-0222 still unpaid (+2d) |
| **Vincent Fairfax Family Foundation** | 🟢 paid | $50,000 | 0 | — | lapsed (stub) | — | → stub unchanged |
| **Social Impact Hub Foundation** | 🟢 paid | $26,730 | 0 | — | lapsed (stub) | — | → stub unchanged |
| **State of QLD DFSDSCS** | 🟢 paid | $22,000 | 0 | — | lapsed (stub) | — | → stub unchanged |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | 0 | ~201d (Teya Dusseldorp) | active-partner | ✅ CONTAINED tour | ⚠️ comm gap much larger than baseline's 22d |
| **StreetSmart Australia** | 🟢 paid | $9,400 | 0 | 236d (Alan) / 256d (Isabella) | active-partner (stub) | ✅ | ⚠️ silence extended |
| **Paul Ramsay Foundation** | 🟢 paid | $7,469 | 0 | 128d | warm | ✅ multiple | ⚠️ crossed 90-day threshold since baseline |
| **Westpac Scholars Trust** | 🟢 paid | $3,080 | 0 | — | lapsed (stub) | — | → stub unchanged |
| **Minderoo Foundation** | ❔ ask-pending | — | — | — | ask-pending ($2.9M due 2026-05-15) | ✅ everywhere | → unchanged; **deadline 2026-05-15 now 19 days away** |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | — | term-sheet-pending | ✅ entity-migration | → unchanged |
| **Tim Fairfax Family Foundation** | ❔ | — | — | — | warm-cold | — | → neutral |
| **June Canavan Foundation** | ❔ | — | — | — | active-partner (UNVERIFIED) | — | → still unverified |
| **Atlassian Foundation** | ❔ | — | — | — | cold | — | → neutral |
| **The Smith Family** | ❔ | — | — | — | cold | — | → neutral |
| **Amnesty International Australia** | ❔ | — | — | — | cold | — | → neutral |
| **NIAA** | ❔ | — | — | — | procurement-prospect | — | → neutral |
| **Patagonia / Allbirds / Who Gives A Crap** | ❔ | — | — | — | cold | — | → cold |
| **yj_grants** | 🟢 GHL-only | — | — | 124d | *not listed* | — | ⚠️ new to silent list |
| **Georgina Byron** | 🟢 GHL-only | — | — | 131d | *not listed* | — | ⚠️ new to silent list |
| **AMP Foundation** | 🟢 GHL-only | — | — | 129d | *not listed* | — | ⚠️ extended from 107d baseline |

---

## Money in flight — 65-day countdown (as of 2026-04-26)

Three invoices on the sole trader's books with outstanding funder balance. No movement since baseline.

### 🔴 Snow Foundation INV-0321 — $132,000 AUTHORISED (2026-03-18, now 39d)

- **Status vs baseline:** Invoice still AUTHORISED. No payment received. No GHL comm update in 2 days.
- **Action remains:** Call Sally Grimsley-Ballard or Alexandra Lagelee Kean. Confirm payment timing + Pty migration notice.
- **Urgency rising:** D&O insurance due ~2026-05-24. NAB account not yet open. Each week without Snow paying means one less week before cutover complications.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (2025-04-10, now **382d**)

- **Status vs baseline:** Still unpaid. No decision. No comm. Now over 12.5 months since invoice date.
- **Action remains:** Chase-or-write-off decision (only-Ben). Every passing day makes the bad-debt case stronger but also makes recovery harder.

### 🔴 Centrecorp Foundation INV-0314 — $84,700 DRAFT (2026-02-13, now 72d)

- **Status vs baseline:** Still DRAFT. Minderoo deadline is 2026-05-15 (19 days away). The pitch cites Centrecorp as live pipeline — a DRAFT invoice undermines that framing.
- **Action remains:** Send / void / reissue-from-Pty. 10-minute decision with Nic (flagged in 5+ sessions).

---

## Minderoo — critical deadline approaching

The Minderoo Foundation pitch deadline is **2026-05-15**, nineteen days from the data pull. `funders.json` lists a $2.9M ask. Goods CEO letter drafts show a different framing. The number reconciliation flagged in the baseline has not been resolved. No new entry has appeared in `thoughts/shared/drafts/` specifically for the envelope.

Baseline action (verify Minderoo ask figure) is still open.

---

## Communication-overdue list

Based on `ghl_contacts.last_contact_date` for funder-tagged contacts (note: baseline used `communications_history` JOIN — these figures reflect a different data path and may show larger gaps).

| Days | Funder / contact | Notes |
|---|---|---|
| 124 | yj_grants | Not in funders.json |
| 128 | Paul Ramsay Foundation (general@) | ⚠️ crossed 90-day threshold since baseline |
| 129 | AMP Foundation Tomorrow Makers | Was 107d at baseline |
| 131 | Georgina Byron | — |
| 134 | Anne Gripper | Was ~62d at baseline |
| 135 | Queensland Gives | Was 107d at baseline |
| 173 | Kristen Lark (The Funding Network) | Was 107d at baseline |
| 183+ | Robyn Sloggett | Extended |
| 200 | Shannon Lemanski | Extended |
| 201 | Teya Dusseldorp (Dusseldorp Forum) | ⚠️ Baseline showed 22d from a different data source — this warrants investigation |
| 236+ | StreetSmart (Alan / Isabella) | Extended |
| 277+ | Jioji Ravulo | Extended |

The entire cohort that was silent at baseline has extended by ~2 days. No re-engagement is recorded. Paul Ramsay Foundation has now crossed 90 days silent.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ Snow, Centrecorp, Rotary — all three unchanged |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (ask-pending, deadline 19 days), QBE, June Canavan |
| Every funder silent >90 days flagged | ✅ Paul Ramsay (newly crossed), AMP, Funding Network, Bryan, Queensland Gives, 10+ others |
| funders.json backlog enumerated | ✅ 7 stubs identified; none updated since baseline |

---

## Open actions — unchanged from baseline plus new urgency

Ordered by 30 June cutover risk.

1. **🔴 Centrecorp INV-0314 — decide with Nic.** Minderoo deadline 2026-05-15 is 19 days away. DRAFT status risks pitch credibility.
2. **🔴 Call Snow Foundation.** Confirm INV-0321 payment + Pty migration notice. Warm relationship — no reason to delay.
3. **🔴 Decide Rotary eClub INV-0222.** 382 days. Chase or write off as sole trader FY26 bad debt.
4. **🟡 Verify Minderoo ask figure.** $2.9M (funders.json) vs $900K (Goods CEO letter) — canonicalise before the envelope goes.
5. **🟡 Update funders.json.** 7 stub entries need narrative review before pitch tooling can use them.
6. **🟡 Re-engage Paul Ramsay Foundation.** 128d silent, crossed the 90-day threshold.
7. **🟡 Verify June Canavan Foundation stage.** Still "active-partner" with no Xero invoice — confirm with Nic.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 39 | 2026-04-26 |
| `ghl_contacts` | `funder` ∈ tags, last_contact_date IS NOT NULL | 20 | 2026-04-26 |
| `wiki/narrative/funders.json` | all entries | 21 (v2, unchanged) | 2026-04-24 (file unchanged) |
| `thoughts/shared/drafts/` | directory listing | no new funder-specific entries | 2026-04-26 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 baseline — 2026-04-24]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — this pass vs baseline]]
- [[index|ACT Wikipedia]]
