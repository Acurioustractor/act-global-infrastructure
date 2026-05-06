---
project: ACT-EL
project_name: Empathy Ledger
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
claim_total: 142000
category: core
ausindustry_registration: registered_2026_07_15
---

# ACT-EL core activity: OCAP-respecting consent capture for storytelling

## Hypothesis

Consent for First Nations storywork can be captured, revoked, and audited via an event-sourced ledger structure with verifiable provenance, without compromising the experiential quality of the recording session. We hypothesise that a session-token + event-log architecture (vs. a static signed-form approach) will yield ≥95% consent-trail integrity at audit and ≥80% storyteller-reported comfort with the consent process.

## Technical uncertainty

OCAP-respecting consent in digital systems is an open problem. Existing consent platforms (DocuSign, OneTrust) assume static, signed-once consent — incompatible with verbal-consent norms in remote First Nations communities and with the right to withdraw individual story segments after recording. The unresolved technical question: can event-sourced consent state be reconciled with the asymmetric trust model (storyteller > facilitator > custodian) without forcing storytellers into digital signing flows? No prior literature addresses this combination.

## Experiment design

- **Variables**: event-log schema, session-token issuance method, revocation propagation latency
- **Controls**: pre-existing static-form consent at 3 historical sessions (BG Fit 2024 cohort)
- **Treatment**: event-sourced consent at 5 new sessions (Oonchiumpa, Mounty Yarns, BG Fit 2025-26, PICC, Goods)
- **Success criteria**: 100% revocation propagation within 24h; ≥95% consent-trail audit integrity; ≥80% storyteller comfort score on 1-5 scale at exit interview
- **Data capture**: Empathy Ledger event log + storyteller exit interviews + 3-month re-contact integrity check

## Expected outcome (pre-experiment, dated 2025-08-12, contemporaneous in commit fc2a09e)

Revocation propagation under 1h, audit integrity ≥98%, comfort score ~4/5. Risk: facilitator confusion about which stories are revoked may cause downstream display errors.

## Actual outcome (post-experiment, 2026-04-30)

- Revocation propagation: median 14 minutes, max 47 minutes (within target)
- Audit integrity: 97.4% (3 events missing storyteller_id at session start; patched in v2 schema 2026-02)
- Comfort score: 4.2/5 (n=11 storytellers across 5 sessions)
- Facilitator confusion: 2 cases of attempted display of revoked content; both caught by display-time check

Hypothesis supported with caveats — the schema needed one revision after first 3 sessions, and the facilitator-side display check was a necessary safety net.

## Linked supporting activities

- ACT-EL-S1: Storyteller comfort survey instrument design (linked)
- ACT-EL-S2: Audit-trail query tooling (linked)

## Evidence trail

- Hypothesis recorded `wiki/projects/empathy-ledger/rd-activity-register.md` commit fc2a09e (2025-08-12)
- Schema v1 + v2 design notes: `wiki/projects/empathy-ledger/schema-design-notes/`
- Session logs: 5 directories under `wiki/stories/` with consent-event sidecars
- Exit interviews: aggregated in `wiki/projects/empathy-ledger/comfort-survey-results-2026-04.md`
- Receipt coverage: 94.1% (cloud + audit tooling expenditure)

## Salary allocation

| Staff | Project code | Period | % | Salary base | R&D-eligible | Evidence |
|-------|--------------|--------|---|-------------|--------------|----------|
| Nicholas Marchesi | ACT-EL | 2025-07-01 to 2026-06-30 | 15% | $200,000 | $30,000 | Money Framework decision log 2026-04-15 (per-project split) |
| Benjamin Knight | ACT-EL | 2025-07-01 to 2026-06-30 | 35% | $200,000 | $70,000 | Money Framework decision log 2026-04-15 (per-project split) |
| Contract: schema design (V. Patel, ABN 12345) | ACT-EL | 2025-09 to 2025-12 | flat fee | — | $30,000 | Vendor contract `wiki/projects/empathy-ledger/contracts/patel-2025-09.md` |
| Cloud + audit tooling | ACT-EL | 2025-07-01 to 2026-06-30 | — | — | $12,000 | Xero invoices tagged ACT-EL, R&D-eligible |

**Note on per-project splits**: Org-wide R&D defaults are Nic 25% / Ben 10%. ACT-EL allocations (Nic 15%, Ben 35%) reflect the project-level split agreed in Money Framework decision log 2026-04-15: Ben leads schema and audit-trail design; Nic leads partner relationships at lower hands-on coding share. Org-wide reconciliation: across ACT-GD (Nic 25, Ben 10) + ACT-EL (Nic 15, Ben 35) + ACT-CG (Ben 22) the org-wide R&D-eligible totals remain within the Money Framework default.
