---
title: "Harvest / Goods 10-Week Staffing Alignment Plan Provenance"
status: Draft
date: 2026-06-10
type: provenance
tags:
  - provenance
  - verification
  - audit
source_packet_id: na
canonical_entity: harvest-goods-10-week-staffing-alignment
---

# Harvest / Goods 10-Week Staffing Alignment Plan Provenance

## Purpose

- Output: staffing-alignment decision plan (entity routing, pay mechanics, fairness layer, systems checklist, compliance register, review rhythm, decision list)
- Intended destination: `thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md`, read by Ben + Nic ahead of the 27 Jun 2026 engagement start
- Why it was generated: ACT is bringing on Katrina (Trina) and Denis for a 10-week Witta placement in partnership with Oonchiumpa, starting 3 days before the sole-trader to A Curious Tractor Pty Ltd cutover and 1 day after the Goods on Country charity handover to The Butterfly Movement Ltd. Ben asked for one document resolving structure, pay, fairness and systems before contracts are issued.

## How this document was produced

This plan was synthesized by a Claude subagent inside a multi-agent workflow on 2026-06-10. Inputs were three parallel design layers (entity/pay, systems, people/community), an adversarial verification pass (11 verdicts with primary-source citations), a completeness critique (12 gaps), repo context summaries for the Harvest and Goods codebases, and a live money baseline pulled from the shared Supabase mirror. Where a verdict said needs-correction or refuted, the corrected version overrides the design text in the plan. The subagent wrote only the two local files; no Xero, GHL, Notion, email or other external system was touched.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Situation brief (orchestrator input) | task brief | as of 2026-06-10 | Roles, rates ($1,000/$1,500/$2,000/wk), package values (~$600/wk combined), dates, review rhythm, totals (~$36K / ~$41K) |
| Entity/pay design (workflow agent output) | design layer | 2026-06-10 | Routing matrix, cost tables, FBT/SG/labour-hire analysis, decision points |
| Systems design (workflow agent output) | design layer | 2026-06-10 | Xero/Notion/GHL build, cadence design, 18-item checklist, Ben-overseas constraint (27 Jun to 15 Aug, from Harvest repo) |
| People/community design (workflow agent output) | design layer | 2026-06-10 | $1,500 options table, fairness matrix, living agreement, partnership protocol, talking points |
| Verification verdicts (workflow agent output) | adversarial check | fetched 2026-06-10 | 11 claims checked against primary sources; corrections applied inline (see below) |
| Completeness gaps (workflow critic output) | critique | 2026-06-10 | 12 gaps converted into risk-register rows and checklist items (contracts, registrations, insurance, licensing, vehicle, cash-flow, work rights, Oonchiumpa admin, open-day collision, continuity, WHS, pay privacy) |
| Supabase mirror `tednluwflfhxyucgwigh` (project_monthly_financials, xero_transactions, xero_invoices, xero_contacts, information_schema) | runtime ledger (money baseline agent, SELECT-only) | FY26 (Jul 2025 to Jun 2026), pulled 2026-06-10 | ACT-HV / ACT-GD spend on two bases; Joey bill history; absence of Denis/Katrina/Trina/Suzie payees; absence of payroll tables |
| `config/harvest-budget.json` | repo config (via verdict) | current at 2026-06-10 | Suzie's documented $850/wk fixed contractor rate (refutes the "not documented" design claim) |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, `2026-06-01-cutover-30-day-critical-path.md`, `2026-05-26-harvest-stage-budget.md` | repo plans (via verdicts) | last_verified 2026-05-08 / 2026-06-01 / 2026-05-26 | Payroll stack unactioned; lease/subsidiary tension; Joey precedent + steward TBC note |
| `scripts/weekly-reconciliation.mjs`, `ingest-statement-lines.mjs`, `ingest-statement-lines-raw.mjs`, `tag-statement-lines.mjs` | repo code (via verdict) | current at 2026-06-10 | Money-pulse blindness: NAB-Visa-only input, quarter window, no tracking propagation |
| `thoughts/shared/reviews/ghl-system-state-of-play-2026-06-08.md` + bucket records, `wiki/concepts/ghl-audience-comms-automation.md` | repo reviews (via verdict) | 2026-06-08 | GHL tag-trigger safety: send-capable workflows all DRAFT; Supabase-sync fires on tag adds; one workflow needs a UI eyeball |
| ATO: TR 2023/4; QC 33854 (contractors SG); SG rate table; remote-area FBT location lists; payday super page | primary tax sources (via verdicts) | fetched 2026-06-10 | Employee/contractor tests; s 12(3) deeming; 12% rate; Witta non-remote; payday super from 1 Jul 2026 |
| FWO: independent contractors / whole-of-relationship test pages; payday super news | primary employment sources (via verdicts) | fetched 2026-06-10 | FW s 15AA test; payday super commencement |
| Labour Hire Licensing Act 2017 (Qld) in-force text; QLD penalty-unit value pages | primary legislation (via verdicts) | fetched 2026-06-10 | ss 7-11; $500,700 corporate maximum at $166.90/unit |
| Workers' Compensation and Rehabilitation Act 2003 (Qld) s 11 + Sch 2 | primary legislation (via verdict) | fetched 2026-06-10 | WorkCover "worker" test narrower than the SG test |
| `thoughts/shared/templates/plan-template.md`, `provenance-template.md` | templates | read 2026-06-10 | Document structure |

Not consulted in this pass: live Xero (mirror only), GHL live workflows (state-of-play doc only), Notion, Gmail/act.place mailboxes (a verdict's attempt timed out at the Supabase pooler), the QLD labour-hire register (timed out).

## Verification Status

- `Verified:` payday super enacted, commencing 1 Jul 2026, SG due in fund within 7 business days of payday; SBSCH retiring 1 Jul 2026; SG rate 12% from 1 Jul 2025; Witta non-remote for FBT (ATO list, via adjacent Maleny on both lists + the 100-km limb); SGAA s 12(3) deeming mechanism; QLD labour-hire ss 7(2)(b)/(d) (drafting and supervision non-determinative), s 11(2) register defence, $500,700 corporate maximum; WCRA s 11 worker test; ACT Pty payroll stack unactioned (checklist + no payroll tables in mirror); FY26 mirror figures (ACT-HV bank spend $95,159.48; ACT-GD $302,689.33; PMF expenses HV $55,466.12 / GD $220,195.65; Joey's six bills totalling $25,237.50 incl. one voided $4,500; INV-004 showing unpaid; no Xero payees for the four names); Suzie's budgeted $850/wk in config/harvest-budget.json; GHL send-safety of identity tags per the 2026-06-08 state-of-play; the weekly cron's NAB-Visa-only input (code).
- `Inferred:` Denis's likely employee characterisation under FW s 15AA and TR 2023/4 (strong, but evaluative; Standard Ledger to confirm in writing); Joey's live bill total $20,737.50 and the back-SG range $2,490 to $3,029 (computed from mirror rows); FBT illustration $2,700 to $2,900 on Denis's housing (computed at 47% grossed-up); the Oonchiumpa fee ranges $12,300 to $12,900 and $18,500 to $19,300 ex-GST (computed: wages + 12% SG + 10-15% loading); all-in package totals ~$41,000 to $41,900 and ~$47,200 to $48,300 (computed); the PMF-vs-bank-spend divergence causes; mirror absence of payroll implying Xero Payroll unused.
- `Unverified:` the sent proposal text (no local copy exists; quotes in earlier drafts were reconstructions); Katrina's actual proposed hours (~19h assumed) and whether $1,500 is to-her or invoice-inclusive; Oonchiumpa's GST registration and labour-hire-register status; Denis's ABN status; the Hospitality award fit and weekend-penalty arithmetic vs flat $2,000/wk; the s 15AB contractor high-income threshold figure; WorkCover premium estimate ($300 to $600) and org loading (10 to 15%), both design parameters; whether Suzie's budgeted payments have commenced; whether INV-004 is genuinely unpaid in live Xero; the 13-week cash position's capacity for ~$3,500 to $4,800/wk of new outflow; public-liability cover status under the new entity.

## Human Decisions / Gates

- Editorial review: pending (Ben + Nic)
- Cultural review: pending. The Oonchiumpa lane, talking points and benefit-share wording are drafted FOR a conversation with Kristy Bloomfield and Tanya Turner; per the community-lane rule, final benefit-share specifics are co-authored with them, not set by this document.
- Consent review: not-required for this internal plan. Flag carried inside the plan: any future public use of Katrina's name, image or story goes through consent-check first.
- Release approval: pending. Every external action in the plan (Xero, GHL, Notion, email, contracts, registrations) is day-shift human work; nothing has been executed.

## Known Gaps And Assumptions

- The plan recommends Denis as an employee on an Inferred (though strongly supported) characterisation; if Standard Ledger disagrees, §4 and checklist item 8 change materially.
- Joey's back-SG range depends on the voided-duplicate question, the GST treatment of his bills, and a facts test (delegation right, results vs labour) that no one has run.
- The fairness matrix uses budgeted figures for Suzie and mirror figures for Joey; neither was re-confirmed against live Xero in this pass (the mirror can lie on payment status).
- The money baseline shows two divergent FY26 spend bases (~$40K to $80K apart per project); the plan names the basis per figure but does not reconcile them (D14).
- The review-rhythm wording attributed to "the proposal" is a reconstruction; fetch the sent text before quoting it to Denis, Katrina, Kristy or Tanya.
- Geographic distances (Witta to Brisbane/Caloundra) are inference; the decisive FBT evidence is the ATO list's classification of adjacent Maleny.
- The engagement dates assume a Sat 27 Jun start and a ~Fri 4 Sep close; review dates (17 Jul, 7 Aug, 28 Aug, 4 Sep) are computed from that and should move if the start shifts to 1 Jul (D4).

## Reproduction Steps

1. Re-pull the money baseline (SELECT-only, shared mirror): FY26 sums from `project_monthly_financials` by project_code; two-account SPEND sums from `xero_transactions` (bank_account in NAB Visa ACT #8815 + NJ Marchesi T/as ACT Everyday) for ACT-HV / ACT-GD; Joey rows from `xero_invoices` (`contact_name ILIKE '%kirmos%'`); payee-absence checks for Denis/Katrina/Trina/Suzie across contacts, transactions, invoices; `information_schema.tables` for `%payroll%`.
2. Re-check the legal anchors at their cited URLs (ATO QC 33854, SG rate table, remote-area FBT lists, payday super; FWO contractor pages; QLD Labour Hire Licensing Act in-force text; WCRA 2003 s 11) and the repo anchors (`act-entity-migration-checklist-2026-06-30.md` §7, `config/harvest-budget.json` staff_rates, `scripts/weekly-reconciliation.mjs` + ingest scripts, `ghl-system-state-of-play-2026-06-08.md`).
3. Rebuild the computed figures: SG = wages x 12%; Oonchiumpa fee = wages + 12% SG + 10-15% loading; back-SG = 12% x (live Joey bill total); package totals = cash lanes + ~$6,000 in-kind (brief).
4. Verify the output: every dollar figure in the plan names a source inline; every tax/legal statement carries a Verified/Inferred/Unverified label traceable to §11 of the plan and this sidecar.

## Linked Artifacts

- Source packet: workflow inputs (not persisted as files; summarised in "How this document was produced")
- Output artifact: `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md`
- Validation log: §11 (verification log) of the output artifact
