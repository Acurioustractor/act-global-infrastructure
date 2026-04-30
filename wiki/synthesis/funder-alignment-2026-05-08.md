---
title: Funder alignment — second pass, 6 days after baseline
summary: Second pass of the ACT Alignment Loop (Q1). Same four-source cross-reference as the 2026-04-24 baseline. Key finding: zero invoice status changes in 6 days — Snow still unpaid, Centrecorp still unsent, Rotary still unresolved. funders.json is now v2 (21 funders). The Snow call still hasn't happened.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-05-08
---

# Funder alignment — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], Pass 2. Queries ran 2026-04-30 (6 days after the 2026-04-24 baseline); file is dated 2026-05-08 per the scheduled second-pass cadence. Four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), `thoughts/shared/drafts + plans` (in-flight work).

## Headline findings

1. **Zero invoice status changes since 2026-04-24.** Snow Foundation INV-0321 is still AUTHORISED and now 43 days old. Centrecorp INV-0314 is still a DRAFT and now 76 days old. Rotary eClub INV-0222 is still AUTHORISED and now 386 days old. The three decisions flagged in the baseline have not been made.
2. **Total outstanding up by $350 — one additional Aleisha weekly.** $507,700 vs $507,350 baseline. Aleisha's recurring retainer added one more unpaid weekly invoice (INV-0307 paid, new week queued). The change is noise, not signal.
3. **`wiki/narrative/funders.json` updated to v2 on 2026-04-24.** The 7 absent funders flagged in the Q1 baseline were added as stub entries on the same day. The wiki ledger now has 21 funders, up from 14. Stage accuracy still needs Nic-verified review for several stubs.
4. **Snow contact silence grew from 10 to 17 days.** Alexandra Lagelee Kean's last communication was 2026-04-13. The "call Snow to confirm payment + Pty migration notice" action has not been taken.
5. **Paul Ramsay Foundation crossed 87 days silent.** Was 80 days at baseline. Approaching the 90-day threshold that flags a relationship at risk.
6. **Two missing project_codes fixed post-baseline.** PICC INV-0324 ($77K) now correctly tagged `ACT-PI`. Brodie Germaine Fitness INV-0325 ($15.4K) now correctly tagged `ACT-BG`. These data-quality gaps from the baseline are closed.

---

## At-a-glance — funders with DB or comms presence

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert

| Funder | DB status | Total billed | Outstanding | Last comm | `funders.json` stage | Named in plans? | Drift |
|---|---|---|---|---|---|---|---|
| **The Snow Foundation** | 🟢 live | $402,930+ | **$132,000** AUTHORISED 43d | 17 days | active-partner (v2) | ✅ entity-migration, Goods pitch | ⚠️ call still not made (was 10d silent at baseline) |
| **Centrecorp Foundation** | 🟡 draft | $208,032 | **$84,700** DRAFT 76d | — | active-partner (v2) | ✅ goods-ceo-letter | ⚠️ draft still unsent; Nic decision outstanding |
| **Rotary eClub Outback Australia** | 🟡 12mo+ | $82,500 | **$82,500** AUTH 386d | — | ask-pending (v2) | — | ⚠️ chase-or-write-off still undecided |
| **Vincent Fairfax Family Foundation** | 🟢 paid | $50,000 | 0 | — | lapsed (v2) | — | → stub added 2026-04-24, no new activity |
| **Social Impact Hub Foundation** | 🟢 paid | $26,730 | 0 | — | lapsed (v2) | — | → stub added |
| **State of QLD DFSDSCS** | 🟢 paid | $22,000 | 0 | — | lapsed (v2) | — | → stub added |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | 0 | 29 days | active-partner | ✅ CONTAINED tour | ⚠️ silence +7d |
| **StreetSmart Australia** | 🟢 paid | $9,400 | 0 | — | active-partner (v2) | ✅ funder-notes | → stub added; narrative TBD |
| **Paul Ramsay Foundation** | 🟢 paid | $7,469 | 0 | 87 days | warm | ✅ multiple | ⚠️ 87d silent (approaching 90d threshold) |
| **Westpac Scholars Trust** | 🟢 paid | $3,080 | 0 | — | lapsed (v2) | — | → stub added |
| **Minderoo Foundation** | ❔ ask-pending | — | — | — | ask-pending ($2.9M due 2026-05-15) | ✅ everywhere | ⚠️ deadline 15 days away |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | — | term-sheet-pending | ✅ entity-migration | ✅ aligned |
| **Tim Fairfax Family Foundation** | ❔ | — | — | — | warm-cold | — | neutral |
| **June Canavan Foundation** | ❔ | — | — | — | active-partner ($60K) | — | ⚠️ still no Xero invoice (unverified stage) |
| **Atlassian Foundation** | ❔ | — | — | — | cold ($200K target) | — | neutral |
| **The Smith Family** | ❔ | — | — | — | cold | — | neutral |
| **Amnesty International Australia** | ❔ | — | — | — | cold | — | neutral |
| **NIAA** | ❔ | — | — | — | procurement-prospect | — | neutral |
| **Patagonia / Allbirds / Who Gives A Crap** | ❔ | — | — | — | cold | — | brand-aligned longshots |
| **Georgina Byron** | 🟢 GHL-only | — | — | 36 days | *not listed* | — | 🟢 new lead surfaced |
| **Adam Robinson** | 🟢 GHL-only | — | — | 33 days | *not listed* | — | 🟢 new lead surfaced |
| **YJ Grants** | 🟢 GHL-only | — | — | 48 days | *not listed* | — | 🟢 new lead surfaced |
| **AMP Foundation Tomorrow Makers** | 🟢 GHL-only | — | — | 133 days | *not listed* | — | ⚠️ 133d silent |
| **Queensland Gives** | 🟢 GHL-only | — | — | 139 days | *not listed* | — | ⚠️ 139d silent |
| **Matthew Cox (Bryan Foundation)** | 🟢 GHL-only | — | — | 176 days | *not listed* | — | ⚠️ 176d silent |
| **Kristen Lark (TFN)** | 🟢 GHL-only | — | — | 177 days | *not listed* | — | ⚠️ 177d silent |

---

## Money in flight — 61-day countdown

Three invoices remain on the sole trader's books with outstanding balance. The 30 June cutover is now 61 days away (as of 2026-04-30).

### 🔴 Snow Foundation INV-0321 — $132,000 AUTHORISED (2026-03-18, 43 days)

- **Status:** Unchanged since baseline. AUTHORISED, not paid.
- **Baseline action:** "Call Sally or Alexandra within 2 weeks to confirm payment + notify Pty migration."
- **Status of action:** NOT TAKEN. Alexandra Lagelee Kean's last comm was 2026-04-13 (17 days ago). The relationship is still warm but the window is contracting. The Minderoo pitch (due 2026-05-15) makes this conversation more urgent — Snow is named in the Goods pitch as live active-partner validation.
- **Risk:** Payment lands in sole trader post-cutover if Pty migration notice isn't sent. Next tranche mis-attributed if relationship isn't briefed.

### 🔴 Centrecorp Foundation INV-0314 — $84,700 DRAFT (2026-02-13, 76 days)

- **Status:** Unchanged since baseline. Still a DRAFT, never sent.
- **Baseline action:** "Decide with Nic: send now / void / reissue from Pty July 1."
- **Status of action:** NOT TAKEN. Named in the Goods → Minderoo pitch as live pipeline. The pitch deadline is 2026-05-15 — 15 days. If Lucy asks about Centrecorp's status, the answer is still "a draft invoice, 76 days old."
- **Risk:** Compromises Minderoo pitch evidence. $84.7K stranded until decision is made.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (2025-04-10, 386 days)

- **Status:** Unchanged. AUTHORISED, 386 days unpaid, no comm history.
- **Baseline action:** "Chase or write off. Only-Ben decision."
- **Status of action:** NOT TAKEN. No communications history visible in GHL. Cutover in 61 days makes this increasingly a bad-debt decision rather than a chase.
- **Risk:** Sole trader closes out FY26 with this as an unresolved receivable. Either a bad-debt write-off on the sole trader's return (deductible but messy) or a pre-cutover recovery sprint.

---

## Communication-overdue list

GHL `communications_history` against funder-tagged contacts. As of 2026-04-30:

| Days silent | Funder / contact | Signal |
|---|---|---|
| 17 | Alexandra Lagelee Kean (Snow Foundation) | Key relationship — call overdue per baseline action |
| 29 | Teya Dusseldorp | Active partner; recent enough |
| 48 | YJ Grants | Surfaced since baseline; worth understanding |
| 69 | Anne Gripper | Borderline |
| 86–87 | Sandra Phillips, Robyn Sloggett, Nizam Abdu, Emily Nicholson, Amanda Neil, Paul Ramsay Foundation | University/research cluster + PRF — PRF approaching 90d |
| 90 | Ardi Muckan (QLD Sport) | Government |
| 133 | AMP Foundation Tomorrow Makers | Early-Dec batch — well past 90d threshold |
| 139 | Queensland Gives | Same batch |
| 176–177 | Matthew Cox (Bryan Foundation), Kristen Lark (TFN) | November batch — 5+ months silent |
| 204+ | Shannon Lemanski, Jacqueline Fearnley, StreetSmart cluster, Jioji Ravulo, Michelle Scott | September–October cold-contact batch — functionally lapsed |

---

## Open actions (ranked by 30 June cutover risk)

1. **Call Snow Foundation — INV-0321 payment + Pty migration notice.** Overdue since baseline. Window: before Minderoo pitch 2026-05-15.
2. **Decide Centrecorp INV-0314 with Nic.** Before Minderoo pitch 2026-05-15.
3. **Decide Rotary eClub INV-0222 chase-or-write-off.** Before June 30 close.
4. **Verify funders.json v2 stubs with Nic.** Snow stage confirmed. JCF (June Canavan Foundation) still "active-partner" with no Xero invoice — unverified.
5. **Re-engage Paul Ramsay Foundation.** 87 days silent, approaching 90d threshold. William Frazer is tagged `partner + justicehub` in GHL.
6. **Minderoo deadline 2026-05-15.** No Xero invoice yet — this is the largest single ask ($2.9M / $900K year-1). Named in plans everywhere. Ensure pitch reflects current Centrecorp / Snow positioning.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount is named | ✅ Snow, Centrecorp, Rotary |
| Every funder in active plans with no DB presence is flagged | ✅ Minderoo, JCF, Tim Fairfax |
| Every funder silent >90 days is flagged | ✅ AMP (133d), Queensland Gives (139d), Bryan (176d), TFN (177d), others |

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, status IN (AUTHORISED, DRAFT), amount_due > 0 | 39 | 2026-04-30 |
| `ghl_contacts` | `funder` ∈ tags | ~27 with comm history | 2026-04-30 |
| `communications_history` | joined against funder-tagged ghl_ids via ghl_id | 23 with comm history | 2026-04-30 |
| `wiki/narrative/funders.json` | v2, 21 entries | 21 | 2026-04-24 (updated) |
| `thoughts/shared/{plans,drafts}/**` | grep for funder names | current working tree | 2026-04-30 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — what changed between passes]]
- [[index|ACT Wikipedia]]
