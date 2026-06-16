# Provenance — bas-q2q3-state-of-play-2026-06-11.md

**Generated:** 2026-06-11, Cowork session (Claude). **Purpose:** consolidated Q2+Q3 FY26 BAS reconciliation state + connector verification, requested by Ben ahead of the 12 Jun reconcile sprint.

## Sources

| Claim | Source | Verified how |
|---|---|---|
| Draft BAS figures (G1/G11/1A/1B, net $8,689.19 / $5,942.81, confidence 78%/76%) | `thoughts/shared/reports/bas-worksheet-q{2,3}-fy26-2026-06-01.md` (prepare-bas.mjs, generated 2026-06-01T11:48) | Read this session. Cross-check: Q2+Q3 nets sum to $14,632.00 — exactly the pre-correction figure in the money-state-of-play ledger. |
| ~$15,350 post-correction combined payable | Ledger entry 2026-06-02 (`handoffs/money-state-of-play/current.md`): 27 GST-bearing dup phantoms deleted, ~$719 1B over-claim removed | Inferred: $14,632 + $719 = $15,351 ≈ $15,350. Worksheet's planned figure was $740.69; actual applied per write-log was ~$719. NOT re-computed against live data this session — re-run prepare-bas for lodgement. |
| Unreconciled backlog 192 Visa / 86 Everyday, $179,498 / $615,744 | `reports/recon-status-latest.md` (cron 2026-06-10T21:25Z = 07:25 AEST 11 Jun) | Read this session; per-quarter rows sum to the ledger's sprint-prep totals exactly (124+68=192, 47+39=86). Mirror `is_reconciled` drifts vs Xero — single-GET is truth (caveat carried). |
| Sidecar buckets (CREATE 210 · DUP 37 · MATCH-BILL 20 · STALE 2 · NEEDS-RECEIPT 0) | `reports/reconcile-sidecar-q2q3-2026-06-11.html` (live-verified 269/269 single-GETs per ledger 2026-06-11) | Grepped bucket headers from the HTML this session. Dup split (18+4+15=37) ties to `dup-worklist-q2q3-2026-06-11.md`, read in full. |
| Receipt verdict (~99% bills receipted; GST at risk ≈ $347; chase map) | `recon-pack/receipt-chase-results-2026-06-02.md` + worksheets §4–5 + recon-status §3 | Read this session. has_attachments flag drifts (caveat carried); bill-level coverage is the accurate measure. |
| Xero MCP live + cash P&L cross-check | Xero MCP tools called this session (get_organisation_financial_year, get_profit_and_loss CASH Q2+Q3) | Direct tool output. Org "Nicholas Marchesi", last_refreshed 2026-06-11T04:05Z. P&L income ≠ G1 (different measures) — directional only. |
| Supabase MCP wrong-project finding | `mcp__supabase__get_project_url` → `uaxhjzqrdotoahjnxmbj`; information_schema query returned zero xero/receipt/recon/bas tables | Direct tool output this session. Finance mirror ref `tednluwflfhxyucgwigh` per ledger + prepare-bas.mjs:18 fallback. |
| Friday block order, guards (Telford Smith, match-on-amount trap), open items (#163 SL email, #159, #169) | Ledger 2026-06-11 EVE entry + `plans/2026-06-10-bas-reconciliation-automation-engine.md` | Ledger read in full; plan grepped (S3/S4 sections). Issue #170 not opened directly. |

## Verified vs inferred

- **Verified (file/tool evidence this session):** backlog counts, bucket counts, dup worklist contents, draft BAS worksheet figures, connector capabilities, FY dates, receipt-chase map.
- **Inferred (documented but not recomputed):** the ~$15,350 post-correction net; the "~46 transfer legs ≈ $471K" (ledger figure, no TRANSFER bucket found in sidecar HTML — likely inside CREATE-IN-UI); R&D-at-risk figures (worksheet predates the founder-drawings re-baseline of 2026-06-01 PM-8).
- **Known gap:** 278 backlog lines vs 269 sidecar lines — 9-line delta unexplained; flagged in the report.

## Incidents this session

- Ran `npm run recon:status` in the Cowork sandbox → no network egress to the mirror → script overwrote `recon-status-latest.{md,json}` with an all-unavailable stub. **`.md` restored byte-true** from the pre-run read in this session's context. **`.json` not restorable here** — regenerates at the next 7:25am cron or any local `npm run recon:status`. Rule going forward: mirror scripts run only on Ben's machine.

## Update 2026-06-13 (Cowork session, Claude) — picked up to support next steps

- **Backlog re-based to the 13 Jun cron** (`recon-status-latest.md`, generated 2026-06-12T21:27Z = 07:27 AEST 13 Jun, committed-as-modified in the working tree). Verified the per-quarter rows against the prior 10 Jun snapshot via `git diff`: Q2 **identical** on both accounts (124/$138,429 Visa, 47/$372,517 Everyday — untouched); Q3 cleared 29 lines/$85,248 (now 78/$199,048); Q4 cleared 69 lines/$157,556 (now 4/$598 Visa, 0 Everyday). Corrected the report prose, which had read "Q3 cleared / Q2 is the whole job" — the remaining BAS job is **Q2 ($510,946) + Q3 ($199,048) = $709,994 / 249 lines.**
- **Xero MCP P&L re-pulled live** (CASH and ACCRUAL, Q2 and Q3; Xero report last_refreshed 2026-06-12T22:36Z). Corrected the cross-check line: the earlier "cash-basis expenses $604,713 / $305,765" were **not** cash-basis. Live cash: Q2 $462,011 / $417,668; Q3 $248,863 / $235,452. Live accrual: Q2 $334,100 / $706,889; Q3 $226,129 / $342,176. Income figures from the prior line ($460,614 / $245,893) were cash and tie to the live pull within ~$1–3K of drift. New cross-check: Q2 cash expense $417,668 ≈ worksheet G11 $421,319 (clean — Q2 fully coded); Q3 cash expense $235,452 > 1-Jun G11 $162,967 (Q3 coding advanced post-sprint → re-run prepare-bas before finalising Q3).
- **No mirror scripts run this session** (Cowork has no egress — see incident above). All recon figures read from the cron file; all Xero figures from the read-only MCP. Nothing written to Xero or the mirror.

## Reproducibility

After the sprint: `npm run recon:check` (sync + status), then `node scripts/prepare-bas.mjs Q2 --save && node scripts/prepare-bas.mjs Q3 --save` on Ben's machine regenerates every number in this report from live state.
