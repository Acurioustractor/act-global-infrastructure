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

**⭐ BIGGEST FINDING — $76,060 phantom AP:** 30 AUTHORISED bills duplicate a PAID bill (Telford Smith $19,800 known double-pay, Centre Canvas $10,285, Oonchiumpa $5,940, Matnic $6.4K+$2.8K, Kirmos no# $4,500, Clearview $768.83…). Reviewable, Xero-linked, confidence-tiered worklist: `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`. **Void the confirmed ones (Tier-3 — review 🟡 tier first).**

**RESUME MENU:** (1) **Void the $76K dups** — biggest payoff, use the `apply-goods-bookkeeper-corrections.mjs` pattern · (2) Ben's **Webflow attach test** (proves live receipt upload — filter Receipt→"Bill · no receipt"→Webflow $29→attach) · (3) build **#4 close-the-books assistant** (BAS/R&D/monthly-close packs) · (4) wire **#2 digest** → Telegram/Notion + PM2 cron · surface **#3** in the mirror UI · **deploy** to command.act.place.

**KEY TRAPS (don't re-hit):** `exec_sql` RPC takes `{query:}` NOT `{sql:}` · transactions API caps 1000/table → paginate · **app finance DB = `NEXT_PUBLIC_SUPABASE_URL`** (NOT `SUPABASE_SHARED_URL` — ad-hoc node probes hit the wrong DB; verify via `curl localhost:3002/api/...`) · mirror tags are **Supabase-only** (Xero push-back = Phase 2, not built) · `vendor-rules-suggest` is heuristic regex, not an LLM · dev `.next` wedges after rapid edits → `pm2 stop act-frontend && rm -rf apps/command-center/.next && pm2 restart act-frontend`.

**Open Xero items:** Joseph Kirmos INV-004 $4,500 may be genuinely owed (NOT a dup — different invoice #; Ben checking with Joey).

---
**Prior (2026-05-23) — MiniMax+Gemini bot migration:** shipped + live at `command.act.place/api/telegram/webhook` (Haiku→Gemini, Sonnet→MiniMax, fallback→Anthropic). Rollback: `vercel env rm LLM_PROVIDER production`. Pinned graders via `.env.local` `GRADE_*_MODEL`. Full detail in this file's git history + `thoughts/shared/plans/minimax-full-migration-2026-05-22.md`.
