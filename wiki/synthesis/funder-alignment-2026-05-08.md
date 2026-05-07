---
title: Funder alignment — second pass, 13 days after baseline
summary: Second pass of the ACT Alignment Loop (Q1), 13 days after the 2026-04-24 baseline. Funder-invoice receivables unchanged at $299K. 90+ day silent contact count grew from ~10 to 17. John Villiers Trust billed for the first time ($1,200). Centrecorp still a DRAFT on day 84.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-07
---

# Funder alignment — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], second pass. Same four sources as baseline: `xero_invoices` (DB reality), `ghl_contacts + communications_history` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Compare to [[funder-alignment-2026-04-24|the 2026-04-24 baseline]].

## Headline findings

1. **The three live funder invoices are unmoved.** Snow ($132K AUTHORISED, now 50 days), Centrecorp ($84.7K DRAFT, now 84 days), Rotary ($82.5K AUTHORISED, now 392 days). Combined $299,200 — the same figure as baseline. No collection on any of the three in 13 days.

2. **`wiki/narrative/funders.json` unchanged.** Version 2, still 21 funders, last updated 2026-04-24. The 7 new data-only stubs added in the baseline run haven't been enriched. Stage corrections for Snow (now `active-partner` ✅) and Paul Ramsay (now `warm` ✅) were committed at baseline and stand.

3. **The 90+ day silent contact count jumped from ~10 to 17.** The university research cluster (Sandra Phillips, Nizam Abdu, Robyn Sloggett, Emily Nicholson, Amanda Neil) all crossed 90 days simultaneously (now 93 days). Paul Ramsay Foundation crossed 90 days (94 days). Ardi Muckan (QLD Sport) crossed 90 days (97 days). The January cold-outreach batch (Matthew Cox / Bryan Foundation, Kristen Lark / TFN) is now 183-184 days silent — well past recoverable territory.

4. **John Villiers Trust now has a Xero invoice.** INV-0327 $1,200 AUTHORISED (issued 2026-05-03, ACT-CORE). JV Trust was a GHL-only lead at baseline (Fiona Maxwell, 25 days silent). They now have a small billing relationship but no `funders.json` entry — the wiki ledger is still incomplete for this contact.

5. **Sonas Properties INV-0328 $37,290 new.** AUTHORISED 2026-05-06, tagged ACT-HV. Sonas is the Harvest (Witta) property landlord — this is an unusual ACCREC relationship. Origin unclear from DB: could be a service invoice, a deposit recovery, or a recharge. Verify with Nic before treating as a grant receivable.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert, 🆕 new since baseline

| Funder | DB status | Total billed | Outstanding | Last comm (days) | `funders.json` stage | Drift |
|---|---|---|---|---|---|---|
| **The Snow Foundation** | 🟡 authorised | $402,930 hist + $132K out | **$132,000** AUTHORISED 50d | 24d (Alexandra) | active-partner | ⚠️ still unpaid 50d; migration notice not yet sent |
| **Centrecorp Foundation** | 🟡 draft | $208,032 hist | **$84,700** DRAFT 84d | no comm | active-partner | ⚠️ still DRAFT — 84 days, blocks Minderoo pitch credibility |
| **Rotary eClub Outback Australia** | 🟡 12mo+ | $82,500 | **$82,500** AUTH 392d | no comm | ask-pending | ⚠️ 392 days, no movement, no decision |
| **John Villiers Trust** | 🆕 small inv | $1,200 | **$1,200** AUTHORISED 4d | — | *not listed* | 🆕 first Xero invoice; no funders.json entry |
| **Sonas Properties** | 🆕 ACCREC | — | **$37,290** AUTHORISED 1d | — | *not listed* | 🆕 unusual ACCREC to a landlord — verify provenance |
| **Vincent Fairfax Family Foundation** | 🟢 paid | $50,000 | 0 | — | lapsed (stub) | ✅ stub added 2026-04-24 |
| **Social Impact Hub Foundation** | 🟢 paid | $26,730 | 0 | — | lapsed (stub) | ✅ stub added 2026-04-24 |
| **State of QLD DFSDSCS** | 🟢 paid | $22,000 | 0 | — | lapsed (stub) | ✅ stub added 2026-04-24 |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | 0 | 36d (Teya) | active-partner | ✅ aligned |
| **StreetSmart Australia** | 🟢 paid | $9,400 | 0 | 247d (Alan White) | active-partner (stub) | ⚠️ silence deepened to 247d |
| **Paul Ramsay Foundation** | 🟢 paid | $7,469 | 0 | 94d (general@) | warm | ⚠️ crossed 90-day silence threshold |
| **Westpac Scholars Trust** | 🟢 paid | $3,080 | 0 | — | lapsed (stub) | ✅ no change |
| **Minderoo Foundation** | ❔ ask-pending | — | — | — | ask-pending ($2.9M) | ⚠️ deadline was 2026-05-15 — 8 days from now |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | — | term-sheet-pending | ✅ aligned |
| **Tim Fairfax Family Foundation** | ❔ | — | — | — | warm-cold | neutral |
| **June Canavan Foundation** | ❔ | — | — | — | active-partner ($60K) | ⚠️ still unverified — no Xero invoice |
| **Atlassian Foundation** | ❔ | — | — | — | cold ($200K) | neutral |
| **The Smith Family** | ❔ | — | — | — | cold | neutral |
| **Amnesty International Australia** | ❔ | — | — | — | cold | neutral |
| **NIAA** | ❔ | — | — | — | procurement-prospect | neutral |
| **Patagonia / Allbirds / Who Gives A Crap** | ❔ | — | — | — | cold | neutral |
| **FRRR (Steph Pearson)** | 🟢 GHL-only | — | — | — | *not listed* | 🟢 lead |
| **Matthew Cox / Bryan Foundation** | 🟢 GHL-only | — | — | 183d | *not listed* | ⚠️ 183d — effectively lapsed |
| **Kristen Lark / TFN** | 🟢 GHL-only | — | — | 184d | *not listed* | ⚠️ 184d — effectively lapsed |
| **AMP Foundation** | 🟢 GHL-only | — | — | 140d | *not listed* | ⚠️ 140d |
| **Queensland Gives** | 🟢 GHL-only | — | — | 146d | *not listed* | ⚠️ 146d |

---

## Money in flight — the 54-day countdown

Three funder invoices outstanding. Status identical to baseline — zero movement.

### 🔴 Snow Foundation INV-0321 — $132,000 AUTHORISED (50 days old)

- **Status unchanged from baseline.** Was 37 days old on 2026-04-24, now 50 days old. Still unpaid.
- Alexandra Lagelee Kean last comm 24 days ago (2026-04-13) — relationship still warm.
- **Migration notice not yet sent.** This call (confirm payment + Pty transition notice) was flagged as "this week" in the baseline. It is now overdue by 13 days.
- **Required action (only-Ben):** Call Sally or Alexandra this week. Confirm INV-0321 payment timing. Notify: from 1 July 2026, future tranches invoice to A Curious Tractor Pty Ltd ACN 697 347 676.

### 🔴 Centrecorp Foundation INV-0314 — $84,700 DRAFT (84 days old)

- **Status unchanged from baseline.** Still a DRAFT. No decision on send / void / reissue-from-Pty.
- **Blocking the Minderoo pitch.** The Goods → Minderoo pipeline lists Centrecorp as live pipeline. At 84 days as a DRAFT, this is a credibility liability.
- **Required action (only-Ben):** The 10-minute Nic conversation. Send now (sole trader gets the money), void + reissue from Pty after 1 July, or close. Decision is now overdue by 13+ days.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (392 days old)

- **Status unchanged from baseline.** Now 392 days old. No action, no communication, no decision.
- **Required action (only-Ben):** Chase or write off. This is now at the 13-month mark with no response. If the grant conditions weren't met, it's bad debt on the sole trader's FY26 close-out BAS. 30 June is 54 days away.

---

## Communication-overdue list — 2026-05-07

| Days | Contact / org | Signal |
|---|---|---|
| 24 | Alexandra Lagelee Kean (Snow Foundation) | Warm — but Snow INV-0321 still outstanding |
| 29 | Georgina Byron | Funder-tagged contact — verify role |
| 36 | Teya Dusseldorp (Dusseldorp Forum) | Active partner — 36d is fine |
| 40 | Adam Robinson | Funder-tagged — verify relationship |
| 55 | YJ Grants | Grant programme contact |
| 76 | Anne Gripper | One-off contact |
| 93 | Sandra Phillips, Nizam Abdu, Robyn Sloggett, Emily Nicholson, Amanda Neil | University cluster — crossed 90d |
| 94 | Paul Ramsay Foundation (general@) | **Crossed 90d** — re-engage or acknowledge lapsed |
| 97 | Ardi Muckan (QLD Sport) | **Crossed 90d** — government contact |
| 140 | AMP Foundation Tomorrow Makers | Jan cold-outreach batch — likely lapsed |
| 146 | Queensland Gives | Jan cold-outreach batch — likely lapsed |
| 183 | Matthew Cox (Bryan Foundation) | Jan cold-outreach batch — lapsed |
| 184 | Kristen Lark (The Funding Network) | Jan cold-outreach batch — lapsed |
| 211 | Shannon Lemanski | Lapsed |
| 213 | Jacqueline Fearnley | Lapsed |
| 247 | Alan White (StreetSmart) | Lapsed |
| 252 | Michelle Scott | Lapsed |
| 267 | Isabella Stanley (StreetSmart) | Lapsed |
| 288 | Jioji Ravulo | Lapsed |

**90+ day count: 17** (was ~10 at baseline). Growth driven by the university cluster and Paul Ramsay crossing the threshold.

---

## Drift — what changed since 2026-04-24

| Metric | 2026-04-24 | 2026-05-07 | Direction |
|---|---|---|---|
| Snow INV-0321 age | 37d AUTHORISED | 50d AUTHORISED | ↑ worse |
| Centrecorp INV-0314 age | 70d DRAFT | 84d DRAFT | ↑ worse |
| Rotary INV-0222 age | 380d AUTHORISED | 392d AUTHORISED | ↑ worse |
| Total 3-funder outstanding | $299,200 | $299,200 | → unchanged |
| Snow migration notice sent | ❌ | ❌ | → no action |
| Centrecorp DRAFT decision | ❌ | ❌ | → no action |
| funders.json version | v2, 21 funders | v2, 21 funders | → no change |
| 90+ day silent contacts | ~10 | 17 | ↑ 7 new crossings |
| New funder invoices | 0 | JVT $1.2K, Sonas $37.3K | ↑ 2 new ACCREC |
| Minderoo deadline | 19 days away | 8 days away | ↑ critical |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ Snow, Centrecorp, Rotary, JVT, Sonas |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (8 days to deadline), June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ 17 contacts listed |

---

## Open actions — ordered by urgency

1. **Call Snow Foundation this week.** INV-0321 $132K still outstanding 50d. Confirm payment + Pty migration notice. Overdue by 13 days from baseline target. (only-Ben)
2. **Decide Centrecorp INV-0314 with Nic.** 84-day DRAFT. 10-minute call. Blocking Minderoo pitch credibility. (only-Ben)
3. **Decide Rotary INV-0222.** 392 days. Chase or write off before 30 June. (only-Ben)
4. **Verify Sonas Properties INV-0328.** $37,290 ACCREC to the Harvest landlord — confirm what ACT is billing Sonas for. (Nic)
5. **Minderoo deadline 2026-05-15.** 8 days. Confirm submission status. (Ben)
6. **Re-engage or formally drop** the university cluster (93d), Paul Ramsay (94d), Ardi Muckan (97d).
7. **Write off** the 140-183d cold-outreach batch (AMP, Qld Gives, Bryan Foundation, TFN) unless there's a specific re-engagement rationale.
8. **Add John Villiers Trust to `funders.json`** — they now have a billing relationship ($1,200, ACT-CORE).

---

## Sources queried

| Source | Query / file | Rows / items | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 40 | 2026-05-07 |
| `ghl_contacts` + `communications_history` | funder-tagged contacts with comm history | 23 | 2026-05-07 |
| `wiki/narrative/funders.json` | full file | 21 funders | 2026-04-24 (unchanged) |
| `thoughts/shared/drafts/` | migration-keyword grep | novation-letter-templates.md | 2026-05-07 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — 2026-04-24 → 2026-05-08]]
- [[index|ACT Wikipedia]]
