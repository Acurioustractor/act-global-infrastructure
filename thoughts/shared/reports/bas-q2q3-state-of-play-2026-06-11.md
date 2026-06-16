# BAS Q2 + Q3 FY26 — state of play (2026-06-11)

> Prepared for review by your accountant (Standard Ledger) — not tax advice. Entity: Nicholas Marchesi T/as A Curious Tractor, ABN 21 591 780 066. GST basis: CASH, quarterly. Provenance sidecar: `bas-q2q3-state-of-play-2026-06-11.provenance.md`.

## Where both quarters stand

| Quarter | Period | Was due | Draft net GST | Confidence |
|---|---|---|---|---|
| Q2 FY26 | 1 Oct – 31 Dec 2025 | 28 Feb 2026 (overdue) | **$8,689.19 payable** | 78% MEDIUM |
| Q3 FY26 | 1 Jan – 31 Mar 2026 | 28 Apr 2026 (overdue) | **$5,942.81 payable** | 76% MEDIUM |
| Combined | | | **$14,632.00 → ~$15,350 payable** | |

Draft figures from `prepare-bas.mjs` worksheets generated 2026-06-01 (pre dup-correction). The 2026-06-02 session then deleted 27 GST-bearing duplicate phantoms, removing ~$719 of over-claimed 1B input credits → combined net payable ≈ **$15,350**. The lodgement-grade number comes from re-running `node scripts/prepare-bas.mjs Q2|Q3 --save` after the reconcile sprint clears the backlog (1B will move again as CREATE lines are coded).

| Label | Q2 | Q3 |
|---|---|---|
| G1 Total sales (inc GST) | $349,268.50 | $170,022.48 |
| G11 Non-capital purchases | $421,318.51 | $162,967.27 |
| 1A GST on sales | $31,566.00 | $15,514.27 |
| 1B GST on purchases | $22,876.81¹ | $9,571.46¹ |

¹ Pre-correction; reduce by $222.94 (Q2) / $517.75 (Q3) planned, ~$719 actually applied per write-log.

## Reconciliation backlog (the blocker to lodgement)

**Updated to cron 2026-06-13 07:27 AEST** (`recon-status-latest.md`), AUTHORISED lines. The Friday sprint ran — **Q4 is now effectively done and Q3 is part-cleared, but Q2 hasn't moved at all and Q3 still has 78 lines open.** Both Q2 *and* Q3 must reach zero for this lodgement; Q4 (current quarter, not due until 28 Jul) is ahead of schedule but is **not part of this BAS.**

| Account | Q2 unrec. | Q3 unrec. | Q2+Q3 value |
|---|---|---|---|
| NAB Visa ACT #8815 | 124 | 48 | $167,905 |
| NJ Marchesi T/as ACT Everyday | 47 | 30 | $542,089 |
| **Total** | **171** | **78** | **$709,994** |

Progress since the 10 Jun snapshot: **Q3 cleared 29 lines / $85K** (now 78 lines / $199,048 open) and **Q4 cleared 69 lines / $158K** (now effectively done — Visa 4/$598, Everyday 0). **Q2 has not moved at all** (both accounts identical to pre-sprint) — 171 lines / $510,946 open, with **Everyday Q2 at $372,517 the bulk** (transfer-heavy — the fast block). So the remaining BAS job is **Q2 ($510,946) + Q3 ($199,048) = $709,994 / 249 lines**, not Q2 alone. Caveat: mirror `is_reconciled` drifts; Xero's own lines-remaining counter is live truth mid-session.

Match targets also grew slightly: 322 AUTHORISED bills awaiting payment / $508,124 (315 receipted) — the MATCH-BILL pool the Q2 lines reconcile against.

**Everything is staged for the Friday sprint (12 Jun, issue #170)** — sidecar sheet `reconcile-sidecar-q2q3-2026-06-11.html` live-verified 269/269 single-GETs (only 2 mirror-stale). Action buckets:

| Bucket | Lines | Meaning |
|---|---|---|
| CREATE-IN-UI | 210 | Reconcile-tab Create, coding proposed per line (incl. transfer legs) |
| LIKELY-PHANTOM-DUP | 37 | Per `dup-worklist-q2q3-2026-06-11.md`: 18 DELETE-CANDIDATE $17.2K · 4 HOLD-SHARED-TWIN $39.8K · 15 HOLD-REVIEW $2.5K |
| MATCH-BILL | 20 | ~$85K — match to AUTHORISED bills, vendor+date must align |
| MIRROR-STALE | 2 | Re-check live |
| NEEDS-RECEIPT | **0** | No unreconciled line is blocked on a receipt |

⚠ Standing guards: **Telford Smith 2×$19,800 = real double-payment, never delete** (recovery/SL pile). Xero's green Match suggests on AMOUNT not DATE — per-line judgment, never bulk "Reconcile all". Every delete re-verifies via single-GET at write time + keeper must carry the receipt; log to `reconcile-write-log.md`.

**Block order (from the shipped plan):** ① deletes via `reconcile-delete-one.mjs` (Visa-gated — widen account gate ~2 min before Everyday candidates) → ② transfers → ③ MATCH-BILL → ④ CREATE-IN-UI (Visa Q2 first, cash-coding + sheet lints) → ⑤ punch list → SL → ⑥ `npm run recon:check` until Q2/Q3 = zero, then log in `reconcile-weekly-log.md`.

## Receipts — verdict: matching gap, not receipt gap

- Bills are **~99% receipted** (1,994/2,015 ACCPAY). Of 311 AUTHORISED bills awaiting payment ($503K), 304 carry receipts. Receipt pipeline: 1,920 uploaded · 7,172 documents · 4,292 bank-line links.
- The worksheets' "missing receipts" counts (151 Q2 / 181 Q3) are dominated by non-GST noise (NAB fees ×143, founder drawings $21.4K GST-free, sub-$82.50 lines needing only a record). **Tax-type GST actually at risk: ~$169 (Q2) + ~$178 (Q3) ≈ $347.**
- The material above-threshold chase list is short and already mapped (`recon-pack/receipt-chase-results-2026-06-02.md`): 3× Supabase **found in Gmail** (message links ready — attach is your click) · Anthropic Feb+Mar $573.52 + Descript $447.62 = **vendor-portal downloads** · Bunnings $571.10 in-store (PowerPass) · Virgin $385.79 portal/match · Qantas = **match, not hunt** (tax invoices already on bills).
- R&D angle: worksheets flag ~$16.1K of 43.5% refund at risk on R&D-tagged lines (mostly ACT-IN at 58–70% coverage) — chase those first. Caveat: the 2026-06-01 review re-baselined FY26 R&D-eligible spend to ~$55K after excluding founder drawings; treat the worksheets' R&D section as pre-that-finding.

## Connect-and-reconcile rails (verified this session)

| Rail | Status | Use for |
|---|---|---|
| Xero MCP connector (Cowork) | ✅ Live — org "Nicholas Marchesi", AUD, FY confirmed Jul 2025–Jun 2026 | Read-only reporting cross-checks (P&L/balance sheet/cash/receivables). No transaction, bill, attachment or BAS access — cannot stage or reconcile. |
| Supabase MCP (this Cowork session) | ⚠️ Wrong project — points at `uaxhjzqrdotoahjnxmbj` (no `xero_*` tables) | Finance mirror lives in `tednluwflfhxyucgwigh`. Re-point the connector if mirror queries from Cowork are wanted; otherwise use the repo rails. |
| Repo rails (Ben's machine) | ✅ Healthy per 2026-06-10 ledger — tokens fresh, mirrors current, crons clean | `npm run recon:status` · `recon:sidecar` · `recon:check` · `node scripts/prepare-bas.mjs Q2|Q3 --save` |
| Cowork sandbox → mirror | ❌ No network egress | Never run mirror scripts from Cowork sessions (this session's attempt blanked `recon-status-latest.{md,json}`; .md restored byte-true, .json regenerates at the 7:25am cron). |
| The reconcile click | Xero UI only, forever (capability matrix `xero-api-capability-2026`) | Sidecar sheet open beside Xero's Reconcile tab; API preps everything except the click. |

Xero MCP P&L cross-check — live pull 2026-06-13 (Xero report refreshed 2026-06-12T22:36Z). Directional only: P&L income ≠ G1 taxable sales, and P&L is GST-exclusive while G11 is GST-inclusive.

| Basis | Q2 income | Q2 expenses | Q3 income | Q3 expenses |
|---|---|---|---|---|
| CASH (matches the GST basis) | $462,011 | $417,668 | $248,863 | $235,452 |
| ACCRUAL (incl. unpaid bills) | $334,100 | $706,889 | $226,129 | $342,176 |

Q2 reads clean: cash-basis expenses $417,668 ≈ worksheet G11 $421,319 — expected, since Q2 was untouched by the sprint and is fully coded. Q3 cash-basis expenses $235,452 now *exceed* the 1-Jun worksheet G11 $162,967, because Q3 coding advanced in the sprint — re-running `prepare-bas.mjs Q3` will lift G11/1B (more purchase credit) before the net is final, so the $5,943 Q3 draft is more likely to fall than rise. ⚠ An earlier draft of this line cited "cash-basis expenses $604,713 / $305,765" — those were **not** cash-basis (live cash Q2 expense is $417,668); they're superseded by the figures above.

## The path to lodged

1. **Reconcile Q2 + finish Q3** — the 12 Jun sprint finished Q4 and part-cleared Q3, but **Q2 (171 lines / $510,946) is untouched and Q3 still has 78 lines / $199,048 open**. Both must reach zero for this lodgement. Same block order; **Everyday Q2's transfer legs ($372,517) are the fast win**. Work until `recon:check` reads Q2 = 0 *and* Q3 = 0.
2. Re-run `prepare-bas.mjs Q2 --save` + `Q3 --save` → lodgement-grade G1/1A/1B.
3. Attach the short receipt list (3 Gmail links + 2 portal pulls) — Tier-3 clicks, yours or SL's.
4. Send the SL email (draft ready: `recon-pack/08-standard-ledger-email-draft.md` + `SL-handoff-*`; the unsent email currently blocks golden totals, issue #163) — SL lodges via Xero Tax → ATO.
5. Both quarters are overdue — ask SL to pair lodgement with penalty-remission/deferral request (first-miss remission is commonly granted on self-report; accountant's call).

## Known count gap (flagged, not hidden)

Backlog 278 lines (192 Visa + 86 Everyday) vs sidecar 269 — 9 lines unaccounted in the bucket split (likely scope filter on the sidecar run). Doesn't change the work; reconcile-to-zero is the finish line either way.
