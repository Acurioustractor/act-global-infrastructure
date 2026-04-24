---
title: Funder alignment — where wiki plans, DB reality, in-flight work, and memory diverge
summary: First pass of the ACT Alignment Loop (Q1). Cross-source reconciliation of every funder relationship, surfacing the drift between what the wiki claims, what Xero shows, and what active plans reference.
tags: [synthesis, funders, alignment-loop, entity-migration, minderoo]
status: active
date: 2026-04-24
---

# Funder alignment — 2026-04-24

> First artefact of the [[act-alignment-loop|ACT Alignment Loop]]. One synthesis, four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). The drift surfaces before the next envelope does.

## Headline findings

1. **`wiki/narrative/funders.json` last updated 2026-04-09.** It is 15 days stale against Xero and missing six funders who have together paid ACT $420,441 across 10 invoices.
2. **Three funders hold live money** — one AUTHORISED, one DRAFT, one AUTHORISED-for-12-months: Snow $132K, Centrecorp $84.7K, Rotary eClub $82.5K. Combined $299,200 sitting on a sole trader that closes in **67 days**.
3. **Snow Foundation is the biggest quiet relationship.** Xero shows $402,930 received + $132,000 AUTHORISED, 7 tranches over 14 months. Wiki tags them `stage: warm, ask: $200K`. The relationship is three years ahead of what the wiki thinks it is.
4. **Minderoo is the loudest loud relationship.** Wiki says ask $2,900,000 deadline 2026-05-15. Memory + recent drafts say $900K Goods pitch mid-May + the envelope itself. Numbers don't reconcile — which is authoritative?
5. **Centrecorp, Vincent Fairfax, Social Impact Hub, State of QLD, StreetSmart, Westpac Scholars Trust — all absent from `funders.json`**, all have paid invoices. The wiki's funder-narrative engine is writing strategy against an incomplete ledger.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert

| Funder | DB status | Total billed | Outstanding | Last comm | `funders.json` stage | Named in plans? | Drift |
|---|---|---|---|---|---|---|---|
| **The Snow Foundation** | 🟢 live | $402,930 | **$132,000** | 10 days | warm ($200K ask) | ✅ entity-migration, Goods pitch | ⚠️ wiki stage 3 tranches behind reality |
| **Centrecorp Foundation** | 🟡 draft | $208,032 | **$84,700** DRAFT | — | *not listed* | ✅ goods-ceo-letter, centrecorp-forensics | ⚠️ wiki-absent; plan names them |
| **Rotary eClub Outback Australia** | 🟡 12mo | $82,500 | **$82,500** AUTH 380d | — | *not listed* | — | ⚠️ wiki-absent; 12-month unpaid invoice |
| **Vincent Fairfax Family Foundation** | 🟢 paid | $50,000 | 0 | — | *not listed* | — | ⚠️ paid grant, wiki-absent |
| **Social Impact Hub Foundation** | 🟢 paid | $26,730 | 0 | — | *not listed* | — | ⚠️ paid grant, wiki-absent |
| **State of QLD DFSDSCS** | 🟢 paid | $22,000 | 0 | — | *not listed* | — | ⚠️ paid grant, wiki-absent |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | 0 | 22 days | active-partner ($16.5K) | ✅ CONTAINED tour | ✅ aligned |
| **StreetSmart Australia** | 🟢 paid | $9,400 | 0 | 26 / 105 days | *not listed* | ✅ (funder-notes) | ⚠️ wiki-absent |
| **Paul Ramsay Foundation** | 🟢 paid | $7,469 | 0 | 80 days | cold | ✅ multiple | ⚠️ wiki "cold" vs DB "paid 2x" |
| **Westpac Scholars Trust** | 🟢 paid | $3,080 | 0 | — | *not listed* | — | ⚠️ paid grant, wiki-absent |
| **Minderoo Foundation** | ❔ ask-pending | — | — | — | ask-pending ($2.9M due 2026-05-15) | ✅ everywhere (env + Goods pitch) | ⚠️ wiki ask ≠ plan ask |
| **QBE Catalysing Impact** | ❔ term-pending | — | — | — | term-sheet-pending | ✅ entity-migration, Goods pitch | ✅ aligned |
| **Tim Fairfax Family Foundation** | ❔ | — | — | — | warm-cold | — | neutral |
| **June Canavan Foundation** | ❔ | — | — | — | active-partner ($60K) | — | ⚠️ "active-partner" with no Xero record |
| **Atlassian Foundation** | ❔ | — | — | — | cold ($200K target) | — | neutral |
| **The Smith Family** | ❔ | — | — | — | cold | — | neutral |
| **Amnesty International Australia** | ❔ | — | — | — | cold | — | neutral |
| **NIAA** | ❔ | — | — | — | procurement-prospect | — | neutral |
| **Patagonia / Allbirds / Who Gives A Crap** | ❔ | — | — | — | cold | — | brand-aligned longshots |
| **Philanthropy Network / Kim Harland** | 🟢 GHL-only | — | — | 10 days | *not listed* | ✅ funder-notes | 🟢 emerging lead |
| **FRRR (Steph Pearson)** | 🟢 GHL-only | — | — | 23 days | *not listed* | — | 🟢 emerging lead |
| **JV Trust (Fiona Maxwell)** | 🟢 GHL-only | — | — | 25 days | *not listed* | — | 🟢 emerging lead |
| **The Bryan Foundation / Bryan Family Group** | 🟢 GHL-only | — | — | 107 days | *not listed* | — | ⚠️ 107-day silence |
| **The Funding Network** | 🟢 GHL-only | — | — | 107 days | *not listed* | — | ⚠️ 107-day silence |
| **AMP Foundation** | 🟢 GHL-only | — | — | 107 days | *not listed* | — | ⚠️ 107-day silence |
| **Queensland Gives** | 🟢 GHL-only | — | — | 107 days | *not listed* | — | ⚠️ 107-day silence |
| **Ian Potter Foundation (Alberto Furlan)** | 🟢 GHL-only | — | — | no comm | *not listed* | — | ⚠️ tagged funder, never contacted |

---

## Money in flight — the 67-day countdown

Three invoices on the sole trader's books with outstanding balance. Each needs a disposition decision before 30 June 2026.

### 🔴 Snow Foundation INV-0321 — $132,000 AUTHORISED (2026-03-18)

- **Evidence:** Xero invoice AUTHORISED 37 days ago, not yet paid. Project ACT-GD. Snow's 7th tranche following a $402K history.
- **What to do this week:** Call Sally Grimsley-Ballard or Alexandra Lagelee Kean (last comm 10 days ago — the relationship is warm). Confirm payment timing AND flag the migration: "From 1 July 2026, future tranches invoice to A Curious Tractor Pty Ltd ACN 697 347 676."
- **Risk if silent:** payment lands in sole trader post-cutover — technically fine but messy. Next tranche may ambiguously sit with sole trader if they don't get the memo.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (2025-04-10, **380 days**)

- **Evidence:** Xero invoice sent 12 months + 20 days ago. No payment. No GHL record of communication. Project ACT-GD.
- **What to do this week:** Decision — chase or write off. If the grant was awarded and payable, this is the oldest and most at-risk receivable. If there's no evidence of award conditions being met, it's bad debt for the sole trader's FY26 return.
- **Risk if silent:** becomes a permanent black mark on the sole trader's close-out BAS. Also the Rotary contact in GHL (`Invoicing Rotary eClub Outback Australia`) is now a renamed stub — if someone at Rotary emails, the CRM has no named human to route to.

### 🔴 Centrecorp Foundation INV-0314 — $84,700 DRAFT (2026-02-13)

- **Evidence:** draft invoice 70 days old. Centrecorp's prior tranche ($85,712) paid in November 2025. Relationship is real.
- **What to do this week:** the 10-min Nic conversation (flagged in three prior memories). Options: send now → sole trader gets the money; void + re-issue from Pty July 1; close out. **This is named in the Goods → Minderoo pitch as live pipeline** — if Lucy asks, the answer needs to be concrete, not "still a draft."
- **Risk if silent:** compromises the Minderoo pitch evidence and delays $84.7K either to sole trader or Pty.

---

## Drift inventory

### Funders paid by ACT but missing from `wiki/narrative/funders.json`

These funders have Xero invoices (paid or outstanding) but are not in the wiki's strategic narrative file. They can't be targeted by `scripts/narrative-draft.mjs --funder <slug>` because they have no slug. Pitch-assembly tooling is writing from an incomplete ledger.

1. **Centrecorp Foundation** — $208,032 billed, $84,700 outstanding
2. **Rotary eClub Outback Australia** — $82,500 outstanding
3. **Vincent Fairfax Family Foundation** — $50,000 paid
4. **Social Impact Hub Foundation** — $26,730 paid
5. **State of Queensland DFSDSCS** — $22,000 paid
6. **StreetSmart Australia** — $9,400 paid
7. **Westpac Scholars Trust** — $3,080 paid

**Authoring backlog:** 7 new entries to add to `funders.json` with at minimum name, stage, most-recent-ask, claims_to_lead_with.

### Funders in wiki whose stage is wrong

1. **Snow Foundation** — wiki says `stage: warm, ask: $200,000`. Reality: $402,930 paid + $132K outstanding across 7 tranches, last comm 10 days ago. Suggested update: `stage: active-partner`, no single ask (multi-tranche).
2. **Paul Ramsay Foundation** — wiki says `stage: cold`. Reality: 2 paid invoices (small, but real), active contact William Frazer tagged `partner + justicehub`. Suggested update: `stage: warm-partner`.
3. **June Canavan Foundation** — wiki says `stage: active-partner, ask: $60,000`. Reality: no Xero invoice. Either the partnership hasn't yet produced paper, or the wiki overstates the relationship. Worth confirming with Nic.

### Funders in GHL but nowhere else

14 contacts tagged `funder` (or with `-funder` prefix tags) have no Xero invoice and no wiki narrative entry. Most are leads from outreach. Four are silence-critical:

- **The Bryan Foundation (Matthew Cox)** — 107 days since last contact
- **The Funding Network (Kristen Lark)** — 107 days
- **AMP Foundation Tomorrow Makers** — 107 days
- **Queensland Gives** — 107 days

These all went silent on the same day (2026-01-07). Looks like a bulk outreach that went unreplied. Decision: follow up or drop.

---

## Communication-overdue list

GHL `communications_history` against funder-tagged contacts. Anyone >60 days silent:

| Days | Funder / contact | Signal |
|---|---|---|
| 62 | Anne Gripper | One-off? |
| 78 | Sandra Phillips, Robyn Sloggett, Nizam Abdu, Emily Nicholson, Amanda Neil (UniMelb + UTas cluster) | University research-collab cluster silent ~2.5 months |
| 80 | Paul Ramsay Foundation (hello@) | Silent since early Feb |
| 83 | Ardi Muckan (QLD Sport) | Government |
| 105 | Jioji Ravulo, Michelle Scott, StreetSmart Isabella + Alan, Jacqueline Fearnley | January batch |
| 107 | Bryan Foundation, Funding Network, AMP, Queensland Gives, Shannon Lemanski | Early-Jan cold-outreach batch |

---

## Alignment-loop acceptance criteria — how this artefact scores

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount is named | ✅ Snow, Centrecorp, Rotary |
| Every funder in active plans with no DB presence is flagged | ✅ Minderoo (ask-pending), June Canavan, Tim Fairfax, 9 cold prospects |
| Every funder silent >90 days is flagged | ✅ 10+ contacts across the 105-107 day batch |

---

## Open actions (bubbled up from this pass)

Ordered by 30 June cutover risk.

1. **Call Snow Foundation within 2 weeks.** Confirm INV-0321 payment + notify of Pty transition. (migration checklist §2)
2. **Decide INV-0314 Centrecorp with Nic.** 10 minutes. (memory item, 4+ sessions)
3. **Decide Rotary eClub INV-0222 with Nic.** Chase or write off. (new surface from this pass)
4. **Update `wiki/narrative/funders.json`** — add 7 absent funders, fix Snow + Paul Ramsay stages, validate June Canavan.
5. **Decide on the 4 silent 107-day contacts** (Bryan, TFN, AMP, Queensland Gives). Re-engage or drop.
6. **Verify Minderoo ask figure.** Wiki says $2.9M. Goods pitch says $900K. Envelope is a different thing again. Canonicalise one number per ask.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, status != VOIDED/DELETED, income_type='grant' OR NULL+funder-like name | 24 | 2026-04-24 |
| `ghl_contacts` | `funder` ∈ tags OR any `%funder%` tag | ~41 | 2026-04-24 |
| `communications_history` | joined against funder-tagged ghl_ids | 28 with comm history | 2026-04-24 |
| `wiki/narrative/funders.json` | parsed all 14 entries | 14 | file-updated 2026-04-09 |
| `thoughts/shared/{plans,drafts}/**` | grep for funder names | ~30 files | 2026-04-24 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[index|ACT Wikipedia]]
