# Provenance: all-areas-review-2026-07-15.md

**Generated:** 2026-07-15, workflow wf_d49ddbfc-8b9 (4 agents, 77 tool calls, all read-only). Per-agent returns: session journal `subagents/workflows/wf_d49ddbfc-8b9/journal.jsonl`.

## Verified live (queried 2026-07-15, Supabase tednluwflfhxyucgwigh unless noted)

- Receivables $471,717.84 / 14 invoices: `xero_invoices` type=ACCREC status=AUTHORISED amount_due>0.
- FY27 invoiced $189,200 / 3 ACCREC (ALIVE ×2, Mounty); FY27 external cash $688.31: `xero_invoices` + `xero_transactions`.
- Goods pipelines (Buyer $2,222,171/36 open + $426,926/11 won; Supporter $4,371,849/62 + $616,462/2 won; Demand $16,371,700/158): `ghl_opportunities` (mirror reconciled to 0.00% drift same day).
- Network counts (4,976 contacts / 1,449 untagged / 74 lane:community / 239 consented): `ghl_contacts`.
- Cooling/warmth: `relationship_health` (recomputed 2026-07-15 00:51 after spine backfill).
- 14-day comms actors (1,149 msgs): `communications_history` joined via ghl_contact_id.
- Owes ledger (290 storytellers / 588 transcripts / 198 live / 354 gap / 127 consent): `thoughts/shared/el-contributor-constellation.csv`, rebuilt 2026-07-15 08:38 from EL instance.
- Ring core (5/5/27/29=66) + today's 7 actions: `thoughts/shared/the-field-morning.html`, built 2026-07-15.
- Person-page aggregates (844: 681/163): frontmatter parse of `thoughts/shared/people/*.md`.
- GrantScope: `grant_opportunities` (1,963 open, 81 ≤30d), `opportunity_decisions` (4 rows), `foundations` (11,111), `funder_context_snapshot` (457 distinct), `v_goods_foundation_targets` (2,078 / 71 with bridge).
- Scope-board NEED/GAP lines: `thoughts/shared/project-scope-board.html` built 2026-07-15.

## From documents (as-of stated)

- FY26 per-project nets: `wiki/concepts/act-business-architecture.md` (FY26 close, Xero mirror).
- project_health scores: table last calculated 2026-06-15 (30 days stale, flagged).
- QBE gate/dates, Butterfly structure, unit economics, delivered 520/41: memory files dated 2026-05-27 to 2026-06-02 (flagged in doc).
- Ben's ring calls: `field-decisions.jsonl` (latest 2026-06-06/07 — 5 weeks stale, flagged).

## Inferred (marked in doc)

- Funder identity of 14-day comms actors from email domains only.
- "Warm right now" for Goods buyers/funders from won/paid status + stage names, not comms recency.
- EL/consulting shape of the untagged ALIVE invoices.

## Known gaps carried

UUID storytellers in owes top-10; warmth-vs-temperature disagreement; beds-per-opp jsonb unextracted; Demand Register dollarization event untraced; INV-0314 draft status not re-verified against live Xero; QBE September deadline date needs precise confirmation before scheduling.
