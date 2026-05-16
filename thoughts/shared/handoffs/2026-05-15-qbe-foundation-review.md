# QBE Foundation Review — 2026-05-15

Generated from: funder-alignment diagnostics (2026-04-24, 2026-05-07), wiki/projects/goods.md, wiki/projects/community-capital.md, wiki/narrative/funders.json, thoughts/shared/plans/ (goods-ceo-6-month-plan, goods-crm-upgrade, act-entity-alignment-2026-04), thoughts/shared/drafts/ (minderoo-goods-pitch-2026-05, funder-notes/2026-05-07, notion-goods-hq-overdue-triage).

---

## What's Been Done on QBE

**Programme position:** ACT (Goods on Country) was announced in the 2026 QBE Catalysing Impact cohort on **23 March 2026**. Stage 2 grants run AU$150,000–$400,000 and are explicitly designed to draw matched investment. The 2025 cohort drew 2.7x match. ACT's ask sits at the ~$210K mark in wiki/projects/goods.md; the Minderoo pitch draft references $400K as the ceiling figure and uses it as the matched-investment anchor.

**Contract status:** The grant contract is drafted against **A Curious Tractor Pty Ltd** (ACN 697 347 676) — confirmed 2026-04-24 in act-entity-alignment-2026-04.md and the entity migration checklist. No transfer needed at cutover. This is one of the clean items in the Pty migration.

**Programme milestones logged:**
- Shortlisted (date not pinned in sources — stated as fact in multiple plans)
- Monthly program check-ins expected during program
- Outcome expected **August 2026** (indicative, not confirmed by QBE in writing)

**Overdue task (from Notion HQ triage, 2026-04-21):** "Send back all strategy stuff to QBE mentors" — status: In Progress, owner: Ben. This is unresolved as of the most recent source.

**GHL contact gap:** As of 2026-05-07 funder notes, QBE Foundation has **no contact record in GHL**. The note reads: "Status: no contact record in GHL — create a contact first." This means there is no communication history tracked, no cadence possible without fixing this first.

**funders.json entry:**
- `stage`: term-sheet-pending
- `ask_amount_aud`: null (not populated)
- `deadline`: null (not populated)
- `primary_contact`: null (not populated)
- `tone`: "investor-grade, cost-honest, no hand-waving"
- `claims_to_lead_with`: unit economics must be real, handover is the test, not charity it's enterprise
- `framing_notes`: "Investor language. Lead with the delivered cost number, the decision band, the handover binary. Do NOT pitch this as a charity case. Do NOT show up without the actual cost report — the whole point of the cost report doc is that QBE will not move without it."

**Community Capital / Phase 2 link:** wiki/projects/community-capital.md documents that the Social Impact Hub Foundation distributes from a $1M pool funded by QBE. Phase 2 "Catalysing Impact" was signed 17 March 2026 (up to $400K). This is a parallel QBE relationship through Social Impact Hub — separate from the direct Goods on Country QBE Catalysing Impact programme. Both are active QBE relationships.

---

## Most Recent Diagnostic Findings (2026-05-07)

From `funder-alignment-2026-05-07.md`:

- QBE Catalysing Impact is listed with `stage: term-sheet-pending` and drift status: **aligned** ("Prospect or pending stage; no DB activity expected yet")
- No Xero invoices, no GHL communications logged
- Referenced in 16 plan files and 6 draft files — the most plan-saturated prospect funder after Snow and AMP

From `funder-alignment-2026-04-24.md`:
- QBE was tagged `term-sheet-pending` in both cycles — no movement between April and May diagnostics
- No GHL comm record at either point

**The stage has not advanced in the automated diagnostic between 24 April and 7 May 2026.**

---

## Cadence / Alignment Gaps Surfaced

1. **No GHL contact record** — impossible to track cadence or log comms without one. The funder-cadence grader (`scripts/grade-funder-cadence.mjs`) cannot fire on QBE because there is nothing to grade.

2. **funders.json is null on three critical fields** — `ask_amount_aud`, `deadline`, `primary_contact` are all null. The automated synthesis cannot surface overdue-comm alerts or ask-tracking without these populated.

3. **"Send back strategy stuff to QBE mentors" task is overdue** (since 2026-04-21, ~24 days). This is the most concrete open action.

4. **No cost report on file** — funders.json explicitly states QBE will not move without the actual cost report. Its location and completion status are not referenced in any file read. This is the single hardest blocker per QBE's own framing.

5. **Stage mismatch risk:** funders.json says `term-sheet-pending` but no term sheet has been seen in the file inventory. If this is aspirational rather than actual, the stage should be corrected to `shortlisted` or `cohort-active`.

6. **Capital waterfall dependency not acknowledged in cadence:** goods-ceo-6-month-plan.md documents clearly that QBE outcome unlocks Snow R4 impact investment, which unlocks Minderoo, which unlocks PFI, which unlocks SEFA. If QBE engagement goes quiet, the whole downstream stack stalls. There is no fallback cadence scheduled.

---

## Concrete Next Moves (Priority Order)

1. **Create a QBE contact record in GHL** (this week). Name the actual program contact from the cohort onboarding. Without this, zero cadence is possible and the funder-alignment script will never surface a comm-overdue alert. Owner: Ben. Time: 10 minutes.

2. **Send the overdue strategy material to QBE mentors** (this week). Notion HQ task "Send back all strategy stuff to QBE mentors" has been In Progress since 2026-04-21. Close it or reassign it. Owner: Ben. Time: 30–60 minutes.

3. **Locate or write the cost report** (this week, high urgency). funders.json states QBE will not move without the actual cost report showing delivered unit economics. If this document does not exist, it must be written before any further program engagement. Search `thoughts/shared/` and Notion Goods HQ for any draft. If absent: write it (delivered cost per unit, production cost band, decision band, handover binary — per framing_notes).

4. **Populate the three null fields in funders.json** (this week). Set `ask_amount_aud` (confirm whether it's $210K or $400K ceiling), `deadline` (August 2026 outcome date), and `primary_contact` (name + role from QBE program). This makes the automated alignment loop useful for QBE from next run.

5. **Correct the stage in funders.json if warranted** (this week). If no term sheet has been issued, change from `term-sheet-pending` to `cohort-active` or `shortlisted`. Accuracy matters here because downstream funder-matching scripts use this field.

6. **Schedule a monthly program check-in with QBE** (before end of May). The goods-crm-upgrade plan documents the expected rhythm: monthly velocity reports showing pipeline stage movement. If QBE expects these and we are not sending them, the shortlist outcome is at risk. The CRM pipeline upgrade (goods-crm-upgrade.md) was explicitly designed to produce this evidence — even partial pipeline discipline now is better than scrambling in August.

7. **Confirm the QBE/Snow/Minderoo stack sequencing with Nic** (before end of May). The capital waterfall is QBE → Snow R4 → Minderoo → PFI → SEFA → IBA. The Minderoo pitch draft is currently blocked on Nic confirming the QBE matched-side structure ($400K Stage 2 or a separate bilateral). One call closes this and unblocks the Minderoo pitch.

8. **Log first GHL communication to QBE contact** (after step 1). Once the contact exists, log the strategy send (step 2) against it. This starts the comm-history clock and the cadence grader can track it from here.

---

## Related Funders with Similar Shape

These funders share the QBE pattern: cohort/programme mechanism, catalytic or matched-grant design, enterprise/investor framing rather than charity framing, and a strong preference for operational evidence over narrative.

| Funder | Current Stage | Why Similar | Gap |
|---|---|---|---|
| **Snow Foundation** | active-partner, $132K live invoice | Impact investment track unlocks on QBE positive outcome; 7-tranche history proves the relationship | Awaiting QBE outcome before R4 impact investment pitch |
| **Minderoo Foundation** | ask-pending | Positioned as matched-side to QBE; Strategic Impact Fund funds for-profit vehicles | Blocked on QBE stack confirmation with Nic + Standard Ledger |
| **FRRR** | GHL-only, 36 days comm | Programme-style funder; has Goods history (listed in $445K philanthropic total); active GHL relationship | No funders.json entry; no ask in flight |
| **Paul Ramsay Foundation** | warm, 93 days silent (overdue) | Systems-change procurement frame; 2 paid invoices; escalation flag from funder notes | 174-day silence as of 2026-05-07; phone-before-email flag raised |
| **QLD Partnering for Impact (PFI)** | EOI submitted Mar 2026 | Repayable investment ($640K of $3.2M); sits downstream of Minderoo in the waterfall | No cadence tracking; no funders.json entry visible |

---

## Sources

- `wiki/synthesis/funder-alignment-2026-05-07.md` (auto-generated 2026-05-07)
- `wiki/synthesis/funder-alignment-2026-04-24.md` (manual baseline 2026-04-24)
- `wiki/narrative/funders.json` (entry: qbe-catalysing-impact, as of file read 2026-05-15)
- `wiki/projects/goods.md` (QBE references, capital stack table)
- `wiki/projects/community-capital.md` (Phase 2 QBE/Social Impact Hub relationship)
- `thoughts/shared/plans/goods-ceo-6-month-plan.md` (capital waterfall, QBE as keystone)
- `thoughts/shared/plans/goods-crm-upgrade.md` (QBE-specific operating rhythm)
- `thoughts/shared/plans/act-entity-alignment-2026-04.md` (Pty contract confirmation)
- `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (no transfer needed)
- `thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md` (QBE as matched-side anchor)
- `thoughts/shared/drafts/funder-notes/2026-05-07.md` (no GHL contact record)
- `thoughts/shared/drafts/notion-goods-hq-overdue-triage.md` (overdue strategy send)
