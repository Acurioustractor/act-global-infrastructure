# Provenance — EOFY 2026 Money-Movement Plan

**Report:** `2026-06-19-eofy-money-movement-plan.md`
**Generated:** 2026-06-19
**Method:** `eofy-money-movement-plan` dynamic workflow (run `wf_0324d01e-748`) — 12 agents: 5 doc-readers (ACT's locked decisions) ∥ 5 ATO web-researchers (FY26 tax mechanics) → 1 synthesizer → 1 adversarial ground-checker. 1.24M subagent tokens, 132 tool uses.

## Sources

### A. ACT internal docs (the "locked decisions" layer — what ACT has decided)
Read in full by the reader agents:
- `wiki/finance/sole-trader-pty-cutover-strategy.md`
- `wiki/decisions/2026-06-12-holdco-structure-proposal.md`
- `thoughts/shared/plans/2026-06-01-cutover-30-day-critical-path.md`
- `thoughts/shared/runbooks/eofy-2026-run-sheet.md`
- `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md`
- `wiki/finance/knight-family-act-pay-and-entity-setup.md` (+ `.provenance.md`)
- `wiki/finance/fy26-27-money-philosophy-and-plan.md`
- `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`
- `wiki/finance/rdti-claim-strategy.md` ⚠️ *stale — still labels $238,654 drawings as "salary"*
- `wiki/finance/act-money-thesis-discussion.md`
- `wiki/finance/act-money-thesis-rebuttal.md`
- `wiki/concepts/act-business-architecture.md`
- `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (Standard Ledger §11 decisions)
- Code (grep-verified): `apps/command-center/src/app/eofy/page.tsx`, `app/api/eofy/route.ts`, `app/api/eofy/command/route.ts`, `lib/eofy/{dates,types,notion-tracker}.ts`, `config/eofy-command.json`, `lib/finance/ledger.ts`

### B. ATO / AU tax sources (the "mechanics" layer — web-grounded)
The researcher agents cited (per their structured returns):
- ITAA 1997 ss 355-205 / 355-480 (R&D associate-payment timing); ITAA 1936 s318 (associates); ATO R&D Tax Incentive program pages (43.5% / <$20M / >$20K / 30 Apr registration); Part IVA-covers-R&D from 1 Jul 2021.
- ATO LCR 2016/3 + Webb Martin (Subdiv 328-G UEO); ITAA 1997 Subdiv 122-A; s328-440 (modified UEO / single family group).
- ATO Div 7A pages + FY26 benchmark rate **8.37%**; s109T interposed-entity rules.
- ATO super pages: concessional cap $30K (FY26) / $32,500 (FY27); SG 12% from 1 Jul 2025; payday super from 1 Jul 2026; Div 293 $250K; carry-forward TSB <$500K; s290-170 NAT 71121; fund-receipt timing.
- ITAA 1997 Subdiv 122/615 (Div 615 interposition, s615-65 2-month choice); A New Tax System (GST) Act s 38-325 (going concern); Duties Act 2001 (Qld) + QRO (transfer duty up to 5.75%, SBRR exemption).

## Confidence ledger
Carried through to report §9. **Verified** = queried an ATO/legislative source or grep-verified in code. **Inferred** = derived synthesis, no single confirming source. **Needs-SL** = registered tax agent makes the final call.

## What the ground-check (adversarial critic) changed
No fabricated figures found; every major dollar amount traced to an input with a source. **4 should-fixes applied** in the final doc:
1. Final-BAS date de-stamped from "(verified) 28 Jul" → "TBC with SL" (inputs conflict 28 Jul / ~25 Aug / 28 Oct).
2. ACT's 25% base-rate-entity status moved Verified → **Needs-SL** (the rate is a verified rule; ACT's *entitlement* is open).
3. Credit director-loan demoted from "cheapest, recommend first" → "available in principle, SL-gated"; salary/R&D leads the order.
4. Ben's KP-invoice row carries the inline HOLD caveat (15078–81 not on paper; `RD_BASIS_RECORDS_CURED=0`; sole-trader→sole-trader, not a valid Pty R&D lever).

**7 missing topics folded in:** QLD payroll tax (grouping), Div 293 stack on Nic, s355-480 election-recording step, Bendel/UPE flag in §4, KP GST-backdating flag, R&D refund cash-flow bridge (Radium/Fundsquire), QLD transfer-duty budget line.

## Known gaps / do-not-trust
- **No live dollar figures are ledger-queried.** Every quantum in the calendar is either a sourced doc figure or a hand-authored config "scenario" string — none are `queried` from Supabase. The plan is a *framework*, not a reconciled set of numbers.
- **Receivables figure unreconciled** (~$216K vs ~$507K) — confirm before sizing founder draws.
- **R&D basis numbers ($317,500 / $354,047) read as full-year** but Path C limits FY26 to ~10 weeks — must be cut before registration.
- Tax positions are **not lodged advice**; Standard Ledger owns the final call on all 21 open questions (§8).

## Reproducibility
Re-run: `Workflow({scriptPath: "<session>/workflows/scripts/eofy-money-movement-plan-wf_0324d01e-748.js", resumeFromRunId: "wf_0324d01e-748"})` returns cached agent results; edit the script + re-invoke to refresh against changed docs/rules.
