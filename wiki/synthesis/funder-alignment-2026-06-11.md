---
title: Funder alignment — third pass, receivables largely cleared, MRFF deadline 15 days
summary: Third pass of the ACT Alignment Loop (Q1), 28 days after the 2026-05-14 second pass. $333K of receivables cleared — Snow paid, Centrecorp voided, PICC voided. Total outstanding down from $497K to $164K. Rotary at 428 days. MRFF partnership window closes 2026-06-26.
tags: [synthesis, funders, alignment-loop, entity-migration, mrff]
status: active
date: 2026-06-11
---

# Funder alignment — 2026-06-11

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q1 pass. Same four sources as baseline: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Prior pass: [[funder-alignment-2026-05-14|2026-05-14]].

## Headline findings

1. **$333K of receivables cleared in 28 days.** The outstanding book dropped from $497,240 (2026-05-14) to $164,250 — the single largest single-pass clearance in the alignment loop's history. Snow Foundation INV-0321 ($132K) was paid 2026-05-22. Centrecorp INV-0314 ($84.7K, the stalled DRAFT) was voided. Both PICC invoices ($96.8K combined) were voided. This resolves the three highest-risk items from the last two passes.

2. **The Centrecorp decision was finally made: VOID.** After 90+ days as a DRAFT invoice, INV-0314 ($84,700) was voided on 2026-05-22. Three additional Centrecorp invoices (INV-0329, INV-0331 VOIDED; INV-0330 DELETED) were also cleared in the same window — all from the Feb 2026 restructuring cluster. The Goods → Minderoo pitch credibility concern is now moot.

3. **Minderoo has PAUSED.** `funders.json` records `stage: paused` and `pause_note: "Lucy paused justice conversations 2026-05-14 — Minderoo internal restructure. Re-engage Q3 FY27 or on her signal."` The $2.9M ask is off the table for this cycle. This is the largest single ask change since the baseline.

4. **MRFF (University of Melbourne / Palmer, ALIVE National Centre) has a hard window: 2026-06-26.** A new funder entry `mrff-uom-palmer` appears in `funders.json` (updated 2026-06-05): grant already awarded, ACT named as a partner, deadline to land the "Getting to Know You Year" conversation before the relay tour departs 2026-06-28. Five-year ACT envelope ~$450K–$750K. This is time-critical and not in any previous synthesis pass.

5. **Rotary eClub INV-0222 ($82,500) is now 428 days unpaid.** No change, no action. The 2026-06-30 cutover is 19 days away. This is a sole trader bad-debt decision that cannot be deferred past this week.

6. **Homeland School INV-0303 ($44,000 AUTH, 2026-05-18) is a known data artefact.** The xero-pushback session plan (2026-05-29) explicitly lists "Fixing the Homeland School INV-0303 phantom payment (Ben's manual Xero fix per task #21)" as out-of-scope. The funders.json stub (auto-generated 2026-05-16) shows `outstanding_ar_aud: 0`. The $44K appearing as AUTH may be a reconciliation ghost, not a real receivable. Do not count it as a real outstanding until confirmed.

---

## At-a-glance — every funder with live DB status

Legend: 🟢 paid / current, 🟡 outstanding, ⚪ historical-only, ❔ wiki-only (no DB presence), ⚠️ drift-alert, 🆕 new since last pass

| Funder | DB status | Outstanding | `funders.json` stage | Change since 2026-05-14 |
|---|---|---|---|---|
| **The Snow Foundation** | 🟢 PAID | **$0** (was $132K) | active-partner | 🟢 PAID 2026-05-22 |
| **Centrecorp Foundation** | 🔴 VOIDED | **$0** (was $84.7K DRAFT) | active-partner | 🟢 DECISION MADE: voided |
| **Rotary eClub Outback Australia** | 🟡 overdue | **$82,500** AUTH **428d** | ask-pending | ↓ +29d, still no action |
| **PICC** | 🔴 VOIDED | **$0** (was $96.8K) | needs-writeup | 🟢 both invoices voided |
| **Regional Arts Australia** | 🟡 auth | **$16,500** AUTH 177d | needs-writeup | 🟢 partial: one invoice paid, $16.5K remains |
| **Homeland School** | ⚠️ phantom? | **$44,000** AUTH — DATA QUERY | needs-writeup | ⚠️ new invoice but marked as phantom in xero-pushback plan |
| **Brodie Germaine Fitness** | 🟡 auth | **$15,400** AUTH 57d | needs-writeup | → no change |
| **Aleisha J Keating** | 🟡 recurring | **$5,850** AUTH (13 inv) | needs-writeup | ↓ 14 invoices cleared |
| **Sonas Properties Pty Ltd** | 🟢 PAID | **$0** (was $37.29K) | needs-writeup | 🟢 PAID |
| **John Villiers Trust** | 🟢 PAID | **$0** (was $1.2K) | lapsed | 🟢 PAID |
| **SMART Recovery** | 🟢 PAID | **$0** (was $2.2K) | needs-writeup | 🟢 PAID |
| **Minderoo Foundation** | ❔ paused | — | **paused** (was ask-pending) | 🔴 PAUSED — Lucy restructure, re-engage Q3 FY27 |
| **MRFF / UoM Palmer (ALIVE)** | ❔ warm | — | warm | 🆕 NEW — deadline 2026-06-26, 15 days |
| **QBE Catalysing Impact** | ❔ contracted | — | active-partner | → last comm 2026-05-19 |
| **Dusseldorp Forum** | 🟢 paid | $0 | active-partner | → last comm 2026-05-19 |
| **June Canavan Foundation** | ❔ | — | active-partner (unverified) | → last comm 2026-05-21 |
| **Tim Fairfax Family Foundation** | ❔ | — | warm | → last comm 2026-05-20 |
| **Paul Ramsay Foundation** | ⚪ historical | $0 | warm | → no last_comm recorded |

---

## Money in flight — the 19-day countdown

Three lines with real stakes before 30 June 2026.

### 🔴 Rotary eClub Outback Australia INV-0222 — $82,500 AUTHORISED (428 days since 2025-04-10)

- **Status:** unchanged across three synthesis passes. The alignment loop has flagged this invoice every time since 2026-04-24 (baseline). 428 days unpaid. No GHL communication history. No action.
- **Risk:** the 2026-06-30 cutover is 19 days away. Sole trader ABN closes at EOD 30 June. If not chased this week, this becomes a bad debt on the sole trader's FY26 tax return. Bad-debt write-off is a tax outcome, not a catastrophe, but the decision to chase or write off needs to happen before the cutover — not after.
- **Action this week:** only-Ben decision. Chase (email or call Pene Curtis / Greg Marlow) or void and write off. Rule 3 in the migration checklist is explicit: this is a recovery problem, not a novation one.

### ⚠️ Homeland School INV-0303 — $44,000 AUTH (2026-05-18) — VERIFY BEFORE ACTING

- **Status:** appears as AUTHORISED in Xero. BUT the xero-pushback plan (2026-05-29) lists fixing this as a "phantom payment" Ben task. `funders.json` stub (auto-generated before the invoice) shows `outstanding_ar_aud: 0`.
- **Risk:** if this is a real outstanding invoice, it's 24 days old and needs attention before cutover. If it's a reconciliation ghost, it needs to be cleared from Xero to prevent it appearing in the FY26 close-out numbers.
- **Action:** Ben to confirm in Xero UI — is this a real unpaid invoice or a duplicate/phantom? Fix before 30 June.

### 🟡 Regional Arts Australia INV-0302 — $16,500 AUTH (177 days since 2025-12-16)

- **Status:** reduced from $33K (one of two invoices was paid). $16.5K remains outstanding for 177 days.
- **Risk:** no urgency on migration (small amount), but at 177 days this is overdue for a chase. The sole trader closes 30 June — any remaining receivables need a disposition decision.
- **Action:** chase for payment or flag for write-off.

---

## New in this pass — MRFF pipeline

`funders.json` (updated 2026-06-05) includes `mrff-uom-palmer` as a warm funder with a hard window:
- Grant MRFF GNT2051566 via University of Melbourne has been awarded (Mental Health and Climate Change 2026-2031)
- ACT is named in the funded grant text as a partner for Tennant Creek + Palm Island sites
- Pitch decisions #3 (editor role) and #4 (storyteller payment rate) must settle before requesting the Palmer conversation
- **Deadline: 2026-06-26 (15 days)** — before relay tour departure 2026-06-28
- Five-year ACT envelope: ~$450K–$750K AUD
- This is the highest-value NEW funder relationship since the Q1 baseline

The relay tour through Tennant Creek IS Year 1 engagement for a grant-named site — the relationship is being activated through fieldwork rather than a formal pitch, which changes the dynamic entirely. Not a cold ask; the tour is the deliverable.

---

## Actions — priority order

1. **Decide Rotary INV-0222 this week** — 428 days, sole trader closing 30 June. Chase Pene Curtis / Greg Marlow, or void + write off on FY26 BAS. Cannot defer past this week.
2. **Confirm Homeland School INV-0303** — is it a real $44K receivable or a phantom? Ben to verify in Xero UI.
3. **MRFF / Palmer conversation** — settle pitch decisions #3 + #4 with Nic before requesting the UoM conversation. Deadline 2026-06-26.
4. **Novation letters** — Rotary notwithstanding, Snow and QBE are now resolved. Remaining funders: Regional Arts, Paul Ramsay, Dusseldorp, any Commonwealth/state grants.
5. **Aleisha retainer decision** — 13 outstanding weekly invoices ($5,850), oldest July 2025. Does the retainer continue under the Pty from 1 July? Decide and action before cutover.

---

## Sources queried

| Source | Query / file | Rows / notes | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 17 rows | 2026-06-11 |
| `xero_invoices` | contact_name search for Snow, Centrecorp, Rotary, PICC | 30 rows | 2026-06-11 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-06-11 |
| `wiki/narrative/funders.json` | all entries | v2, updated 2026-06-05 | 2026-06-11 |
| `ghl_contacts` | funder-tagged, last_contact_date | 1 result (limited GHL data in this instance) | 2026-06-11 |
| `thoughts/shared/drafts/` | keyword grep | 1 novation draft, no new funder drafts | 2026-06-11 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 funder-alignment — 2026-05-14 prior pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
