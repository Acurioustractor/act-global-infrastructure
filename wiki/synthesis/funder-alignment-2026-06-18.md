---
title: Funder alignment — fourth pass, new June invoices, MRFF 8 days out, cutover 12 days
summary: Fourth pass of the ACT Alignment Loop (Q1). Funder receivables book shows $291,560 outstanding ACCREC — an apparent increase from the June 11 figure ($164K) driven by new June invoices to ACT-JH clients and previously-uncounted older invoices surfacing. MRFF (Palmer/UoM) deadline is 2026-06-26, 8 days away. Centrecorp had a further batch of invoices voided in May. Rotary INV-0222 is now 434+ days unresolved.
tags: [synthesis, funders, alignment-loop, entity-migration, mrff]
status: active
date: 2026-06-18
---

# Funder alignment — 2026-06-18

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]] Q1. Four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). DB queried 2026-06-18. Prior pass: [[funder-alignment-2026-06-11|2026-06-11]].

## Headline findings

1. **Outstanding ACCREC is $291,560 — up from the June 11 figure ($164,250), but the increase reflects new June invoices, not deterioration.** Four new invoices to ACT-JH / ACT-JH-adjacent clients were raised in June 17-18 (Tandanya $16.5K, Justice Reform Initiative $880, Mounty Aboriginal Youth $22K, Julalikari $15K = $54,380 new). Three older invoices (Social Impact Hub $21.8K, Berry Obsession $13K, Sonas Properties $44K) were not counted in the June 11 synthesis total. Adjusted comparison: the June 11 pass likely understated the true outstanding by ~$79K.

2. **Centrecorp had a second wave of invoice voids in May 2026.** On 2026-05-17, three further Centrecorp invoices were voided (INV-0329 $61K, INV-0331 $106K, INV-0330 DELETED). INV-0314 ($97,900 as actually voided — not the $84,700 DRAFT amount) was voided 2026-05-22. The Centrecorp relationship has produced no live invoice since INV-0291 (paid Nov 2025). No new Centrecorp ask is in flight. The `funders.json` still lists `ask_amount_aud: 84700` — this should be cleared.

3. **Rotary eClub INV-0222 ($82,500 AUTHORISED) is now 434 days old.** Four synthesis passes. Four calls to decide. The sole trader closes in 12 days. This is the most time-critical receivable action: write off or chase this week.

4. **MRFF (Palmer/UoM) deadline is 2026-06-26 — 8 days away.** `funders.json` shows this as `stage: warm, deadline: 2026-06-26`. ACT is a named partner in the awarded grant. The five-year ACT envelope (~$450K–$750K AUD) would invoice to the Pty — but the Pty has no Xero file yet. First invoice timing is a cutover-sequencing question. The relay tour through Tennant Creek is Year 1 engagement for a grant-named site — happening this week before the deadline.

5. **`wiki/narrative/funders.json` at v2, updated 2026-06-05, now has ~45 entries** (was 14 at the April baseline). Multiple auto-stubs added from Xero — most have `stage: needs-writeup`. The ledger is wide; the narrative depth is thin on ~30 entries.

6. **Snow Foundation PAID.** INV-0321 ($132,000 AUTHORISED 37 days at the April baseline) is confirmed paid 2026-05-22. Relationship clear for Pty migration notice in any new tranche conversation.

---

## At-a-glance — outstanding ACCREC as of 2026-06-18

Legend: 🔴 old/critical · 🟡 recent/watch · 🟢 new/expected · ⚠️ verify

| Counterparty | Invoice | Amount | Status | Age | Project | Signal |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback** | INV-0222 | $82,500 | AUTH | **434d** | ACT-GD | 🔴 4th pass, no decision |
| **Sonas Properties** | INV-0316 | $44,000 | AUTH | 122d | ACT-HV | 🟡 Harvest-related; verify collection timing |
| **Homeland School Company** | INV-0303 | $44,000 | AUTH | 31d | ACT-GD | 🟡 Verify — amount changed from $4.95K in baseline |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | AUTH | 212d | ACT-CP | ⚠️ 7-month-old invoice; was counted as paid at prior pass |
| **Mounty Aboriginal Youth & Community** | INV-0334 | $22,000 | AUTH | 0d | — | 🟢 New June 18 invoice; no project code assigned |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 185d | ACT-HV | 🟡 One of two RAA invoices; one paid |
| **Tandanya National Aboriginal Cultural Institute** | INV-0332 | $16,500 | AUTH | 1d | — | 🟢 New June 17 invoice; no project code |
| **Julalikari Council Aboriginal Corporation** | INV-0335 | $15,000 | AUTH | 0d | ACT-GD | 🟢 New June 18/19 invoice |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | AUTH | 64d | ACT-BG | 🟡 Unchanged 4 passes |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | AUTH | 128d | ACT-HV | ⚠️ Not in June 11 pass; verify |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 1d | — | 🟢 New June 17 invoice; no project code |
| **TOTAL** | | **$291,560** | | | | |

**Note:** 3 of the 4 newest invoices (INV-0332/0333/0334) have no `project_code`. These should be tagged before the sole trader Xero closes.

---

## Funder ledger status — key changes since April baseline

| Funder | April baseline | June 18 | Change |
|---|---|---|---|
| **Snow Foundation** | $132K AUTH 37d | PAID 2026-05-22 ✅ | 🟢 |
| **Centrecorp Foundation** | $84.7K DRAFT 70d | INV-0314 VOIDED 2026-05-22; no new invoice | 🟡 Resolved but no replacement ask |
| **Rotary eClub** | AUTH 380d | AUTH 434d | 🔴 +54 days, no action |
| **Minderoo Foundation** | ask-pending $2.9M | `paused` — Minderoo restructure (2026-05-14) | ⚠️ Re-engage Q3 FY27 |
| **MRFF (Palmer/UoM)** | not in ledger | `warm`, deadline 2026-06-26, grant AWARDED | 🆕 8 days to window |
| **QBE Catalysing Impact** | term-sheet-pending | `active-partner`, last comm 2026-05-19 | 🟢 |
| **Dusseldorp Forum** | active-partner | `active-partner`, last comm 2026-05-19 | → |
| **Tim Fairfax Family Foundation** | warm-cold | `warm`, last comm 2026-05-20 | ↑ |
| **Snow Foundation (stage)** | wiki: `warm, ask $200K` | wiki: `active-partner` | ✅ Fixed |
| **Paul Ramsay Foundation (stage)** | wiki: `cold` | wiki: `warm` | ✅ Fixed |
| **`funders.json` count** | 14 entries | ~45 entries | ↑ |

---

## Money in flight — 12-day countdown

**Outstanding receivable disposition before 30 June 2026:**

### 🔴 Rotary eClub INV-0222 — $82,500 AUTH (434 days)
This is a chase-or-write-off decision, not a novation question (Rule 3 from the checklist). The sole trader closes in 12 days. If not resolved, this becomes an open receivable on a closed entity requiring an amended BAS and bad-debt claim with no resolution record. Call or write off **this week**.

### 🟡 Social Impact Hub INV-0289 — $21,780 AUTH (212 days)
7 months old. Was treated as "paid" in prior passes — verify in Xero whether this is genuinely outstanding or a data issue. If real, chase immediately.

### 🟡 Sonas Properties INV-0316 — $44,000 AUTH (122 days)
Harvest-related invoice. 4 months old. Standard Ledger context needed — is this intentionally deferred or genuinely outstanding?

### 🟡 Homeland School INV-0303 — $44,000 AUTH (31 days)
The baseline amount was $4,950. This is now showing $44,000. Verify: different invoice, repriced, or data issue?

### 🟢 June invoices (new) — $54,380 total
Tandanya ($16.5K), Mounty Aboriginal Youth ($22K), Justice Reform ($880), Julalikari ($15K) — all fresh within 48 hours. Each needs a project code before Xero closes. Each will likely collect post-cutover to sole trader (pre-cutover invoice rule).

---

## Centrecorp — relationship status

The Centrecorp invoice history is unusual:
- INV-0310/0311/0312/0313/0315: all voided 2026-02-13 (all $68,200 each)
- INV-0314: DRAFT, then voided 2026-05-22 (as $97,900)
- INV-0329 $61,050 + INV-0331 $106,150: voided 2026-05-17
- INV-0330 $33,000: DELETED 2026-05-17

**Interpretation:** Multiple invoice drafts created and voided. No new authorized invoice since INV-0291 (paid Nov 2025, $85,712). The relationship is real ($208K+ received historically) but no current tranche is on track. The `funders.json` entry has `ask_amount_aud: 84700` — this should be cleared and updated. The framing_notes still reference the DRAFT as open. **Update needed.**

---

## MRFF — emerging time-critical opportunity

The Mental Health and Climate Change grant (MRFF GNT2051566, via UoM/Palmer) was awarded and Year 1 is running now. ACT is named as a partner. Key facts:
- Grant deadline for Palmer conversation: 2026-06-26 (8 days)
- Relay tour through Tennant Creek = Year 1 site engagement for named partner
- Five-year ACT envelope estimate: $450K–$750K, community payment floor baked in
- First invoice must go to Pty — sequencing requirement for Xero to be live
- Decision #3 (editor role) and #4 (storyteller payment rate — community-set with floor) to be settled before the Palmer conversation

---

## Open actions — 12-day priority order

1. **Rotary eClub INV-0222 — write off or chase this week.** Last decision point before sole trader close.
2. **Verify Social Impact Hub INV-0289 ($21,780 212d)** — real outstanding or data artefact?
3. **Verify Homeland School INV-0303 ($44K vs $4.95K at baseline)** — is this a different invoice?
4. **Tag new June invoices** (INV-0332/0333/0334/0335 have no project code) before Xero closes.
5. **Palmer conversation before 2026-06-26** — MRFF Year 1 engagement (relay tour is the live moment).
6. **Update Centrecorp funders.json entry** — clear stale ask_amount_aud and framing note referencing voided draft.
7. **Snow Foundation migration notice** — already paid; now send the "future tranches to Pty from 1 July" message.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 11 | 2026-06-18 |
| `xero_invoices` | Centrecorp history | 12 | 2026-06-18 |
| `wiki/narrative/funders.json` | full parse | ~45 entries | file 2026-06-05 |
| `ghl_contacts` | funder tags (LATERAL unnest) | 7 distinct tags | 2026-06-18 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[entity-migration-truth-state-2026-06-18|Q3 entity migration — same pass]]
- [[funder-alignment-2026-06-11|Q1 prior pass — 2026-06-11]]
- [[index|Synthesis index]]
