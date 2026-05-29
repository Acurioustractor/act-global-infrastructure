---
title: Money state of play — Xero Mirror + ongoing bookkeeping (3/4 roadmap); $76K duplicate finding
date: 2026-05-29
status: open — /finance/mirror live (localhost, not deployed); 3 of 4 ongoing-bookkeeping items shipped; $76K phantom-AP void worklist ready for review
session: claude (Opus 4.8, 1M context) — 2026-05-29 Xero Mirror build + ongoing-bookkeeping roadmap
related_handoffs:
  - 2026-05-29-xero-mirror-and-ongoing-bookkeeping.md (FULL session record — READ THIS FIRST)
  - 2026-05-29-finance-cockpit-and-goods-recon-handoff.md (earlier: bookkeeper corrections + AP recon)
related_plans:
  - thoughts/shared/plans/2026-05-29-finance-xero-mirror-surface.md
  - thoughts/shared/plans/2026-05-29-xero-close-the-loop.md
related_financials:
  - thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md ($76K phantom AP)
---

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-05-29
**Read first:** `thoughts/shared/handoffs/2026-05-29-xero-mirror-and-ongoing-bookkeeping.md`
**Branch:** `wip/goods-finance-recon-2026-05-29` — all pushed (latest after this commit). **NOT deployed** (localhost:3002 only).
**Goal:** Make command-center the daily bookkeeping driver with AI support. Built `/finance/mirror` (live Xero mirror: inline tag-align · per-project in/out rail · untagged/receipt/dup flags · sortable+filterable table · bulk-retag · receipt-attach · AI tag suggestions), fixed 4 data bugs, started a 4-part ongoing roadmap.

**Shipped today:** the mirror surface · **4 data-bug fixes** (row truncation 2k→4.5k · `exec_sql {sql}→{query}` which had zeroed received/pending app-wide · ACCREC mapping → Goods $649K visible · receipt-flag 1246→11 bills-only) · **Xero writes** (Carla dup VOIDED + 1300 Washer recoded 429→446/ACT-GD) · receipt-upload-to-Xero (Phase 1, **untested live**) · roadmap **#1** AI tag suggestions · **#2** daily-digest script + mirror recency filter · **#3** anomaly/dup detector.

**⭐ $76K phantom AP — WORKED 2026-05-29 PM (commit `9b77f87`):** Ben approved "void all 26". **20 VOIDED in Xero = $67,970.72 cleared** (Telford $19,800, Centre Canvas $10,285, Oonchiumpa $5,940, Matnic $6.4K+$2.8K, Sophie $4,950+$1,140, Airbnb $4,621, Kirmos no-# $4,500, +the rest). **6 BLOCKED by Xero period lock (30-Sep-2025, FY26-Q1 BAS lodged) = $3,221.03** (Bunnings $1,199.80, Palm Island $514, Maleny ×2 $497.48+$423.75, Repco $384, Virgin $202) → **hand to Standard Ledger as prior-period adjustment / credit note; do NOT lift the lock.** **4 HELD as not-dups:** Kirmos INV-004 $4,500 (genuinely owed — pay it), Google $67.98 + Dialpad $56 (consecutive-month subs), Kennards $244 (separate hire). Outcome + tools recorded in `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`. Revert log: `scripts/output/void-dups-revert-1780048855209.json`.

**⭐ ROADMAP #4 SHIPPED 2026-05-29 PM (commit `832da92`) — ongoing-bookkeeping roadmap now 4/4 complete.** `scripts/close-the-books.mjs <period> [--json] [--save] [--narrate]` — period ready-to-close gate. `<period>` = `YYYY-MM` | `Q3` | `FY26-Q3` | `FY26` (AU FY Jul–Jun). Rolls up 7 lenses (recon% · receipt coverage · tagging% · cleanliness via #3 detector · P&L honest sales/spend/bills split · indicative BAS 1A/1B · R&D-eligible by category) → 🟢/🟡/🔴 verdict + prioritised action list. Reads app DB (NEXT_PUBLIC) so numbers match the mirror; deterministic core; `--narrate` = Anthropic close memo (forced — minimax default returns empty); `--save` → dated close-pack `.md` + `.provenance.md`. **First pack:** `thoughts/shared/reports/close-pack-FY26-Q3-2026-05-29.md` → 🔴 NOT READY (recon 69.5%, $51.9K in GE-429, $10.4K untagged, 6 same-day dup groups). Plan `thoughts/shared/plans/2026-05-29-close-the-books-assistant.md`. **Trap:** `lib/llm-client.mjs` is in `scripts/lib/` not root `lib/` (root lib/ = load-env only); default agent provider = minimax (verbose/empty for short memos → force anthropic).

**RESUME MENU:** (1) **6 locked-period dups → Standard Ledger** ($3,221.03 prior-period adjustment) · (2) **pay Kirmos INV-004 $4,500** (confirmed owed, not a dup) · (3) Ben's **Webflow attach test** (proves live receipt upload — filter Receipt→"Bill · no receipt"→Webflow $29→attach) · (4) wire **#2 digest** → Telegram/Notion + PM2 cron · surface **#3** in the mirror UI + **wire `close-the-books` into a monthly-close cron / command-center read panel** (the #4 fast-follows) · (5) **deploy** to command.act.place. NOTE: 4 commits now unpushed on `wip/goods-finance-recon-2026-05-29` (`9b77f87` void · `1f3bcad` ledger · `832da92` close-the-books · this).

**VOID PATTERN (proven, reusable):** `scripts/void-duplicate-bills-2026-05-29.mjs` — dry-run default, GET-fresh + abort-on-mismatch, full before-state revert log, app-DB status mirror, `--apply` gated. **Xero blocks edits to documents dated ≤ the period lock date** (currently 30-Sep-2025) — expect 400 "period lock"/"end of year lock" on locked-period voids; that's a correct guardrail, route those to the accountant.

**KEY TRAPS (don't re-hit):** `exec_sql` RPC takes `{query:}` NOT `{sql:}` · transactions API caps 1000/table → paginate · **app finance DB = `NEXT_PUBLIC_SUPABASE_URL`** (NOT `SUPABASE_SHARED_URL` — ad-hoc node probes hit the wrong DB; verify via `curl localhost:3002/api/...`) · mirror tags are **Supabase-only** (Xero push-back = Phase 2, not built) · `vendor-rules-suggest` is heuristic regex, not an LLM · dev `.next` wedges after rapid edits → `pm2 stop act-frontend && rm -rf apps/command-center/.next && pm2 restart act-frontend`.

**Open Xero items:** Joseph Kirmos INV-004 $4,500 may be genuinely owed (NOT a dup — different invoice #; Ben checking with Joey).

---
**Prior (2026-05-23) — MiniMax+Gemini bot migration:** shipped + live at `command.act.place/api/telegram/webhook` (Haiku→Gemini, Sonnet→MiniMax, fallback→Anthropic). Rollback: `vercel env rm LLM_PROVIDER production`. Pinned graders via `.env.local` `GRADE_*_MODEL`. Full detail in this file's git history + `thoughts/shared/plans/minimax-full-migration-2026-05-22.md`.
