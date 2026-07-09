---
title: Funder alignment — post-cutover, ALIVE MRFF grant landed, Snow paid, Minderoo paused
summary: Fourth pass of the ACT Alignment Loop (Q1), 9 days after the June 30 cutover. Snow Foundation $132K paid; Centrecorp DRAFT resolved; ALIVE National Centre / University of Melbourne MRFF grant has $167.2K newly invoiced post-cutover; Minderoo paused by internal restructure; Rotary eClub INV-0222 now 455 days unpaid.
tags: [synthesis, funders, alignment-loop, post-cutover]
status: active
date: 2026-07-09
---

# Funder alignment — 2026-07-09

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Sources: `xero_invoices` (DB reality), `wiki/narrative/funders.json` (strategic narrative, v2 updated 2026-07-07), `thoughts/shared/drafts + plans`. Comparison baseline: [[funder-alignment-2026-05-14|2026-05-14]] (last committed). Note: alignment-loop branches for 2026-06-11 through 2026-07-02 exist on remote but are unmerged; this pass compares against the last committed state.

## Headline findings

1. **Snow Foundation INV-0321 ($132,000) is paid.** The largest single outstanding receivable from the April baseline has cleared. Snow has now received $534,930 from ACT across 7+ tranches since inception. Relationship is warm and multi-year; the migration conversation (sole trader → Pty) should still be confirmed.

2. **ALIVE National Centre / University of Melbourne is a material new relationship.** MRFF grant GNT2051566 is awarded (Mental Health and Climate Change 2026–2031). ACT is named Partner AI for Tennant Creek and Palm Island. Two post-cutover invoices (INV-0341 $66,000 and INV-0342 $101,200, both dated 2026-07-02, ACT's first invoices after the cutover target date) total **$167,200** and are outstanding. Neither has a project_code assigned. This is the biggest new funder relationship since Centrecorp.

3. **Minderoo paused — internal restructure.** Lucy Stronach paused justice conversations on 2026-05-14 (the day of the last synthesis). `funders.json` now records `stage: paused` and a note to re-engage Q3 FY27 or on her signal. The $2.9M ask is tabled but not lost. No Xero invoice evidence.

4. **Centrecorp INV-0314 ($84,700 DRAFT) resolved.** The draft that sat on the books for 90+ days (flagged in every prior synthesis) no longer appears in the AUTHORISED/DRAFT outstanding list. Either sent and paid, or voided. Either way the decision that had been stalled since February 2026 has been taken.

5. **Rotary eClub INV-0222 ($82,500) is now 455 days unpaid.** Every pass has flagged this. It is now approaching 15 months. If not chased by the end of July, it will be a near-certain bad debt write-off on the sole trader's FY26 close-out BAS. The June 30 cutover has passed — this is now a sole trader run-off receivable, not a migration decision.

6. **`funders.json` restructured 2026-07-07.** Twelve delivery partners (previously mixed into the funders file) were moved to a new `partners.json`. Three Rotary stubs consolidated into one canonical entry. MRFF/Palmer entry added (new). Minderoo stage updated to `paused`. File now has 25 entries, cleaner as a pitch-assembly ledger.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only, ⚠️ drift-alert, 🆕 new since 2026-05-14

| Funder | DB status | Total billed | Outstanding | `funders.json` stage | Change since 2026-05-14 |
|---|---|---|---|---|---|
| **ALIVE NMH / UoM (MRFF)** | 🆕 post-cutover | $167,200 invoiced | **$167,200** (2 invoices, 7d) | warm (stub 2026-07-07) | 🆕 AWARDED MRFF grant; first 2 invoices Jul 2 |
| **The Snow Foundation** | 🟢 paid | ~$534,930 total | **$0** | active-partner | 🟢 INV-0321 $132K PAID |
| **Rotary eClub Outback Australia** | 🟡 overdue | $82,500 | **$82,500** AUTH **455d** | active-partner | 🔴 45 more days, no decision |
| **Sonas Properties Pty Ltd** | 🟡 auth | $95,290+ | **$53,950** (2 invoices) | — (Harvest landlord) | ⚠️ second Sonas invoice INV-0337 $9,950 added (Jun 25) |
| **Homeland School Company** | 🟡 auth | — | **$44,000** AUTH 52d ACT-GD | — | 🆕 new $44K invoice (May 18) — different from the $4,950 paid in May |
| **Social Impact Hub Foundation** | 🟡 auth | $26,730 paid + $21,780 out | **$21,780** AUTH 233d | active-partner stub | ⚠️ outstanding since Nov 2025, wiki stub unverified |
| **Mounty Aboriginal Youth** | 🆕 post-cutover | $22,000 | **$22,000** (7d) | — | 🆕 post-cutover invoice Jul 2, no project_code |
| **Centrecorp Foundation** | 🟢 resolved | $208,032 + | **$0** | active-partner | 🟢 INV-0314 $84.7K DRAFT resolved |
| **Tandanya National Aboriginal Cultural Institute** | 🆕 auth | $16,500 | **$16,500** (22d) | — | 🆕 new invoice Jun 17, no project_code |
| **Regional Arts Australia** | 🟡 auth | $33,000+ | **$16,500** AUTH 205d | — | ⚠️ partial payment (was $33K), still outstanding |
| **Julalikari Council Aboriginal Corporation** | 🆕 auth | $15,000 | **$15,000** (20d, ACT-GD) | — | 🆕 new invoice Jun 19 |
| **Brodie Germaine Fitness Aboriginal Corp** | 🟡 auth | $15,400 | **$15,400** AUTH 85d | — | → no change |
| **Berry Obsession PTY LTD** | 🟡 auth | $13,000 | **$13,000** AUTH 149d ACT-HV | — | → no change |
| **Jenn Brazier** | 🟡 overdue | ~$3,888 | **$3,887.84** AUTH **373d** | — | ⚠️ 373 days unpaid from Jul 2025 — run-off or bad debt |
| **Minderoo Foundation** | ❔ paused | — | — | paused | 🔴 PAUSED — internal restructure, re-engage Q3 FY27 |
| **Dusseldorp Forum** | 🟢 paid | $16,500 | $0 | active-partner | → no change |
| **Paul Ramsay Foundation** | ⚪ historical | $7,469 | $0 | active-partner | → last comm 2025-07-05 (1 year ago) — going cold |
| **Tim Fairfax Family Foundation** | ❔ | — | — | warm | last comm 2026-05-20 |
| **QBE Catalysing Impact** | ❔ active | — | — | active-partner | last comm 2026-05-19 |
| **June Canavan Foundation** | ❔ | — | — | active-partner (unverified) | last comm 2026-05-21 |
| **PICC** | 🟢 paid | $113,300+ | **$0** | — | 🟢 both INV-0317 + INV-0324 now paid/cleared |

---

## Money in flight — 9 days post-cutover

Total outstanding ACCREC: **$471,717.84** across 14 invoices. Context: this total is **lower than the April 2026 baseline ($507,350)** despite new invoices being added, because Snow ($132K) and Centrecorp ($84.7K) — the two largest — have been resolved.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (455 days since 2025-04-10)

- **Status:** unchanged across every synthesis pass since April. Now 455 days.
- **Disposition:** the sole trader closed June 30 (de facto under Rule 2, still trading but as run-off). This invoice is now a pure sole trader run-off receivable. Chase or write off as bad debt on the FY26 BAS. There is no Pty migration path for this — it stays with Nic's sole trader.
- **Action:** final decision before the Q4 FY26 BAS lodgement (due 28 July 2026 — 19 days away).

### 🔴 Jenn Brazier INV-0228 — $3,887.84 AUTHORISED (373 days since 2025-07-01)

- **Status:** not flagged in prior syntheses but 373 days old. Project ACT-GP (Gold Phone). Likely a run-off item.
- **Action:** chase or write off.

### 🟡 ALIVE / University of Melbourne INV-0341 + INV-0342 — $167,200 (7 days since 2026-07-02)

- **Status:** two invoices dated 2026-07-02, first from the MRFF partnership. Both invoiced by the sole trader post-cutover (Rule 2 applies — Pty Xero not yet open). No project_code assigned. Total $167,200.
- **Action:** assign project_code to both. Once Pty Xero opens, the MRFF invoicing should shift to the Pty. Contact: Prof Victoria Palmer.

### 🟡 Sonas Properties INV-0316 + INV-0337 — $53,950 (2 invoices)

- **Status:** $44,000 (Feb 2026, ACT-HV) and $9,950 (Jun 25, no project_code). Harvest-related receivables.
- **Action:** INV-0337 needs project_code (ACT-HV). Both are within the Harvest subsidiary question (see Q3).

### ⚠️ Social Impact Hub Foundation INV-0289 — $21,780 AUTHORISED (233 days since 2025-11-18)

- **Status:** not flagged in prior syntheses. No project_code. 233 days old. Social Impact Hub Foundation is listed in funders.json as a DATA-ONLY STUB.
- **Action:** identify what this invoice is for (project code), chase or write off.

### ⚠️ Regional Arts Australia — $16,500 (partial, 205 days)

- Baseline was $33,000 AUTHORISED (2 invoices). Now $16,500 — partial payment received. Still outstanding.

---

## New funder relationships — not in April baseline

### 🆕 MRFF / ALIVE / University of Melbourne (mrff-uom-palmer)

The single most material new funder relationship since the April baseline. Grant awarded for Mental Health and Climate Change 2026–2031. ACT is named Partner AI for Tennant Creek and Palm Island. Milestone delivery Mar 2027–Sep 2028. Year 1 ("Getting to Know You") is now underway. Two invoices (INV-0341 $66K, INV-0342 $101.2K) issued July 2 against the sole trader — the first invoices past the cutover target date.

Five-year ACT envelope target ~$450K–$750K AUD. This relationship likely becomes ACT's largest single grant over the grant period.

### 🆕 Tandanya, Julalikari Council, Mounty Aboriginal Youth

Three new ACT-GD/null invoices in June–July. These appear to be Goods on Country community delivery payments. All lack project_codes. Combined: $53,500.

---

## funders.json state — 2026-07-07

| Change | Detail |
|---|---|
| 12 delivery partners moved to `partners.json` | Cleaner funder ledger; `narrative-draft.mjs` scopes appropriately |
| Rotary 3 stubs → 1 canonical entry | `rotary-eclub-outback-australia-9560` now canonical; merges ask-pending, active-partner, needs-writeup stubs |
| Minderoo stage: `ask-pending` → `paused` | Lucy paused 2026-05-14; re-engage Q3 FY27 |
| MRFF/Palmer entry added | AWARDED grant, ACT as named partner; deadline target 2026-06-26 for Palmer conversation (relay tour through Tennant Creek) |
| Snow framing_notes still says "$132K outstanding" | Stale — should be updated to reflect payment |

---

## Open actions

1. **Decide Rotary INV-0222** — 455 days, FY26 BAS due 28 July (19 days). Chase or write off.
2. **Assign project_codes** to INV-0341, INV-0342 (ALIVE), INV-0334 (Mounty), INV-0332 (Tandanya), INV-0337 (Sonas).
3. **Chase Social Impact Hub INV-0289** — 233 days, no project_code; identify what it is.
4. **Update Snow framing_notes** in `funders.json` — payment received, not outstanding.
5. **Confirm MRFF/Palmer invoicing entity** — invoices are from sole trader; once Pty Xero opens, all future MRFF invoicing should use the Pty entity.
6. **Confirm migration notice to Snow Foundation** — was the Pty transition conversation with Sally/Alexandra confirmed?
7. **Decide Jenn Brazier INV-0228** — 373 days, $3.9K, ACT-GP.
8. **Paul Ramsay Foundation** — last comm 2025-07-05 (1 year ago). Re-engagement warranted.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 14 rows | 2026-07-09 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-07-09 |
| `wiki/narrative/funders.json` | all entries | 25 entries, v2, updated 2026-07-07 | 2026-07-09 |
| `thoughts/shared/drafts/` | migration-keyword grep | 1 novation draft (unchanged) | 2026-07-09 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 funder-alignment — 2026-05-14 prior pass]]
- [[alignment-loop-drift-2026-05-14-to-2026-07-09|Drift summary — 2026-05-14 to 2026-07-09]]
- [[index|ACT Wikipedia]]
