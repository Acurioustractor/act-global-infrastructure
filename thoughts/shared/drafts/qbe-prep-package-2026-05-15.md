---
title: QBE Foundation — ready-to-send prep package
date: 2026-05-15
status: draft, awaiting Ben review before sending anything outbound
audience: internal (Ben + Nic)
context: Concrete next moves from thoughts/shared/handoffs/2026-05-15-qbe-foundation-review.md
---

# QBE Foundation — prep package

QBE Catalysing Impact is the keystone for Q3. Outcome announced August 2026. Capital waterfall: QBE → Snow R4 → Minderoo → PFI / SEFA / IBA.

This document is the ready-to-send prep across the four concrete moves from the QBE review. Nothing has been sent yet — Ben approves each before it goes out.

---

## Move 1 — Create QBE contact record in GHL (10 min, Ben)

QBE has zero contact records in GHL. The funder-cadence grader cannot fire on this account.

**Action:** Add the QBE Catalysing Impact program contact in GHL with:

| Field | Value |
|---|---|
| First name | (the program lead from cohort onboarding) |
| Last name | |
| Email | |
| Company | QBE Foundation |
| Tags | `goods, goods-funder, goods-tier-champion, qbe, act-gd` |
| Custom field: project_code | ACT-GD |
| Custom field: cohort | Catalysing Impact 2026 |

Once added, the storyteller-grade script picks it up automatically on next run.

---

## Move 2 — Send overdue strategy material to QBE mentors (Ben, this week)

The Notion HQ task "Send back all strategy stuff to QBE mentors" has been In Progress since 2026-04-21. 24 days overdue.

**What to send (draft template below):**

```
Subject: Goods on Country — strategy materials for the cohort review

Hi [name],

Following on from our cohort onboarding, here is the package on Goods on Country.

Three things to anchor on:

1. The delivered cost report — we are running it on the last 50 beds. First number lands [DATE].
   Decision band: ≥25% scale aggressively · 15–24% workable · 5–14% red flag · <5% stop.
   We won't pitch at scale without that month's actual on the page.

2. The community partner stack — Oonchiumpa Consultancy (Mparntwe), PICC (Palm Island),
   Centrecorp Foundation (Tennant Creek). The Mparntwe production plant is the central
   investment thesis: closes unit economics to ~$350 at 5,000+ units/year.

3. The capital waterfall — QBE Catalysing Impact unlocks Snow R4 impact-investment,
   which unlocks Minderoo, which unlocks PFI / SEFA / IBA. We have framed Goods as
   enterprise, not charity, for this reason.

Attached:
  - Goods on Country one-page brief (2026-05-15)
  - Cost report — current state (template plus available Xero inputs)
  - Mparntwe partnership memo

Happy to walk any of this with you on a call. The August outcome moves several
downstream conversations, so we want to make sure your read is shaped by the
actual numbers, not the target ones.

Ben Knight
benjamin@act.place · 0411 549 411
```

**Attachments to gather first** (these are not yet assembled):
- The Goods one-pager (✓ ready: `thoughts/shared/drafts/goods-one-pager-2026-05-15.md` — synced to Notion)
- Cost report current state (template + Xero data — see Move 3)
- Mparntwe partnership memo (not drafted — TODO)

---

## Move 3 — Locate or write the cost report (highest urgency)

**Template:** `/Users/benknight/Code/JusticeHub/output/goods-on-country/actual-delivered-cost-report.md`

**Status:** Template exists with `$_____` placeholders. No actual numbers filled in. QBE will not move without this per funders.json `framing_notes`: "Do NOT show up without the actual cost report — the whole point of the cost report doc is that QBE will not move without it."

**Xero ACT-GD spend snapshot (2026-05-15, from xero_invoices):**

| Vendor | Bills | Total | Likely role |
|---|---:|---:|---|
| Defy + Defy Manufacturing | 12 | $88,863 | Manufacturing partner — frames, finishing |
| Oonchiumpa Consultancy | 3 | $27,945 | Cultural / community partner (not BOM) |
| Carla Furnishers | 1 | $11,180 | Canvas? confirm |
| Joseph Kirmos | 2 | $7,238 | (confirm) |
| RW Pacific Traders | 1 | $4,200 | HDPE feedstock? confirm |
| Adriana Beach | 1 | $2,000 | (confirm) |
| ePrint | 2 | $1,743 | Print / packaging |
| Loadshift Sydney | 1 | $1,244 | Freight |
| Reddy Express | 4 | $430 | Logistics |
| Metal Manufactures | 1 | $182 | Galvanised pole? confirm |

**Total ACT-GD-coded Xero spend visible: ~$95K.** This is a fragment of total production cost. Real cost-per-bed needs:
- Production batch records (units produced per period, not in Xero)
- Direct labor cost allocation
- Production overhead allocation
- True freight per-destination

**The cost report cannot be filled in autonomously. It needs Ben + Nic to:**
1. Pin the reporting period (e.g., last 50 beds, which were produced when?)
2. Reconcile Xero ACT-GD spend against units produced in that period
3. Allocate Oonchiumpa consulting time and other non-BOM expenses
4. Calculate freight per-destination weighted average
5. Compute the actual headline number and the decision band

**Recommended next step:** A one-hour working session with Ben + Nic + the supply chain owner to fill the template against last quarter's production. Once done, the QBE deck and the Minderoo pitch both unlock.

---

## Move 4 — Populate the three null fields in funders.json (this PR, Ben confirms values)

Current state:
```json
"qbe-catalysing-impact": {
  "stage": "term-sheet-pending",
  "ask_amount_aud": null,
  "deadline": null,
  "primary_contact": null,
  ...
}
```

**Proposed values (Ben to confirm):**

| Field | Proposed | Source |
|---|---|---|
| `ask_amount_aud` | `400000` | Catalysing Impact Stage 2 ceiling per goods.md and wiki/projects/community-capital.md (Stage 2 signed 2026-03-17 up to $400K). Use $400K as anchor for matched-investment framing. |
| `deadline` | `2026-08-31` | August 2026 outcome per QBE programme cadence. Confirm with QBE program manager. |
| `primary_contact` | Pull from GHL once Move 1 done | Cohort onboarding contact |
| `stage` | `cohort-active` | Currently says `term-sheet-pending` but no term sheet has been seen in file inventory — correct to actual state. |

I will not edit funders.json until Ben confirms these values.

---

## Move 5 — Schedule monthly QBE check-in (before end of May)

Per `goods-crm-upgrade.md`: QBE expects monthly velocity reports showing pipeline stage movement. We are not currently sending these.

**Recommended cadence template (one page per month):**
- Beds delivered this month (count + destinations)
- Communities engaged this month
- Cost per bed (from the cost report, when ready)
- Pipeline movement (which funders advanced a stage)
- Risks / blockers requiring program-team input

**Owner:** Nic. **First report due:** end of May 2026. **Format:** PDF, attached to email.

---

## Tier-2 risk note

Moves 1, 2, 5 are outbound communications — Tier 2 (visible to QBE, reversible). Move 4 is a local edit (Tier 1). Move 3 is internal preparation (Tier 1).

Nothing in this package is sent until Ben confirms each. The drafts are scaffolds, not finals.
