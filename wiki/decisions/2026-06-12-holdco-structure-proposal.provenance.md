---
title: Holdco structure proposal provenance
status: Filed
date: 2026-06-12
type: provenance
tags:
  - provenance
  - verification
  - entity-structure
source_packet_id: 2026-06-12-standard-ledger-structure-call
canonical_entity: a-curious-tractor-pty-ltd
---

# Holdco Structure Proposal Provenance

## Purpose

- Output: decision brief (`2026-06-12-holdco-structure-proposal.md`) + HTML decision pack (`thoughts/shared/briefs/entity-structure-decision-pack-2026-06.html`) + migration checklist §12 addendum + pending-decision pointer in `act-core-facts.md`
- Intended destination: wiki/decisions (durable evidence), thoughts/shared/briefs (disposable scaffolding for the Ben + Nick conversation)
- Why it was generated: Ben supplied the Standard Ledger strategy call summary and transcript and asked for the repo to be aligned with it, with diagrams and tables to support the next-phase structure decision

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `thoughts/shared/meetings/2026-06-12-standard-ledger-structure-call.md` | meeting record (verbatim, supplied by Ben) | call circa early June 2026, filed 2026-06-12 | the proposal, founder pay figures, action items |
| `wiki/decisions/act-core-facts.md` | canonical note | as at 2026-06-12 (file dated 2026-04-25, entity rows updated to 2026-06-02) | entity identifiers, cutover rules, receivables, current structure diagram |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | plan | last_verified 2026-05-08 | D11.1, D11.2, D11.4, D11.5 prior decisions; novation sequencing |
| `wiki/decisions/2026-05-harvest-subsidiary-structure.md` | decision page | 2026-05-05 | Harvest subsidiary terms incl. landlord minority share |
| `thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md` | plan | 2026-05-05 | $100K transfer facts, invoice phases, PSI reasoning |
| `wiki/finance/knight-family-act-pay-and-entity-setup.md` | working synthesis | 2026-05-31 | founder pay stack context |

## Verification Status

- `Verified:` entity names, ACN/ABN identifiers, DGR/PBI status and dates, cutover rules, receivables list, Harvest decision terms, Knight Photography transfer evidence (all from canon and prior verified docs)
- `Inferred:` the mapping of call statements to prior decisions (D11.1/D11.2/D11.5); the reading that "night photography" means Knight Photography; the reading that the September $100K equals the 6 Oct 2025 transfers; Butterfly as a company limited by guarantee (consistent with "Ltd" + ACNC + PBI, not yet checked against the constitution)
- `Unverified:` exact call date; justice and storytelling revenue ("several hundred thousand" each, advisor-level talk); whether the FY26 draw target is $200K each or $300K combined including the $100K (transcript is ambiguous); the new Snow tranche amount; Nick's invoicing vehicle and its GST/PSI position; all tax mechanics as stated by the advisor (Div 7A, PAYG instalment opt-out) pending written confirmation from Standard Ledger

## Human Decisions / Gates

- Editorial review: pending (Ben)
- Cultural review: not-required (internal structure doc; Butterfly governance questions routed to the lawyer and the incoming Indigenous-led board, not decided here)
- Consent review: not-required
- Release approval: internal only; canon deliberately NOT updated until decisions 1 to 4 land

## Known Gaps And Assumptions

- The call proposes; it does not decide. Treating any of it as decided before the Nick conversation and lawyer answers would overwrite canon with a brainstorm.
- The call's "wholly owned" framing for Harvest conflicts with the standing landlord-minority decision; the standing decision is assumed to hold.
- Trust rule changes "since budget" were flagged by the advisor; no detail captured, no action taken, parked with Standard Ledger.
- 18 days to cutover with banking unresolved means Rule 2 (honest delay) may govern regardless of the structure choice.

## Reproduction Steps

1. Read the meeting record at `thoughts/shared/meetings/2026-06-12-standard-ledger-structure-call.md`
2. Diff its claims against `act-core-facts.md`, migration checklist §D11, the Harvest decision page, and the Knight Photography plan
3. Regenerate the brief: confirmed items map to their existing pages; unmatched items become the open decisions
4. Verify: zero em dashes and no AI-tell vocabulary in authored text; entity identifiers match canon exactly

## Linked Artifacts

- Source packet: `thoughts/shared/meetings/2026-06-12-standard-ledger-structure-call.md`
- Output artifact: `wiki/decisions/2026-06-12-holdco-structure-proposal.md`
- Visual pack: `thoughts/shared/briefs/entity-structure-decision-pack-2026-06.html`
