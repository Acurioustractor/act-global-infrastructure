# Handoff — Xero Mirror + ongoing-bookkeeping roadmap (2026-05-29 PM)

Resume point after a long, productive session. Everything below is **committed + pushed** on `wip/goods-finance-recon-2026-05-29` (latest `c7ccead`). Nothing deployed to production yet.

## TL;DR
Built `/finance/mirror` — a live Xero-mirror surface to align tagging, see every project's money in/out, and clear issues — and fixed four real data bugs along the way (which also repair the existing finance pages). Then started a 4-part ongoing-bookkeeping roadmap: #1 (AI tag suggestions) shipped. Also did Tier-3 Xero writes: voided a duplicate + recoded a bill, and built (untested) receipt-upload-to-Xero.

## Commits this session (all pushed)
| Commit | What |
|---|---|
| `ce37317` | Goods bookkeeper corrections **applied to Xero** (VOID Carla dup $11,180 · RECODE 1300 Washer $13,980 → acct 446 + ACT-GD) + AP Find&Match action sheet. Revert log `scripts/output/goods-bookkeeper-revert-1780030961185.json`. |
| `798cc2b` | **Xero Mirror surface** + project-finance data fixes (the 4 bugs below). |
| `134a8b6` | Missing-receipt flag → **bills-only** (1246 → 11). |
| `bf4a4c3` | **Close-the-loop Phase 1**: receipt upload → Xero from the mirror (untested live). |
| `34653c5` | Mirror table: **sortable columns + per-column filters**. |
| `c7ccead` | **Roadmap #1**: inline AI project suggestions on untagged rows. |
| `d398b57` | Session handoff (this doc, then extended). |
| `e7d1727` | **Roadmap #2**: daily-digest compute script + mirror recency filter. |
| `a682653` | **Roadmap #3**: anomaly/dup detector. |
| `0311737` | **#3 triage**: duplicate void worklist ($76K phantom AP). |

## The Xero Mirror (`/finance/mirror`, nav "Align · Mirror")
Composes existing APIs + trust primitives. Capabilities now:
- Trust header (FreshnessBadge + TrustMeters) · FY26 P&L project rail (in/out per project, click to filter) · flags band (Untagged · Bills-no-receipt · Duplicates) · live table (4,517 rows).
- Table: inline `RetagSelect` (project) · `ReceiptInXero` ✓ / `AttachReceiptButton` (bills) / "—" · sortable headers (all cols) · filter row (Type/Account/Project/Receipt) · search · bulk-retag · **✨ AI suggestion chip on untagged rows** (one-click tag).
- Files: `app/finance/mirror/page.tsx`, `components/finance/{MirrorProjectRail,MirrorFlags,AttachReceiptButton,SuggestProjectChip}.tsx`, `lib/finance/suggest-project.ts`. RetagSelect gained a `'spend'` kind.

## 4 data bugs fixed (verified live; also fix the existing /finance/* pages)
1. **transactions API truncated at 1000/table** (2000 total) → now paginates past the PostgREST cap → 4,517 rows. Flag counts were undercounting by >half.
2. **transactions bills `has_attachments` hardcoded false** → now selected → receipt flag honest for bills.
3. **`/api/finance/projects` used `exec_sql({sql:})`** → wrong param name returned **no rows** → received/pending/rdSpend/pipeline silently **$0 for every project**. Fixed to `{query:}` → totals.received $0 → $1.68M.
4. **received read via incomplete `invoice_project_map`** → Goods' $649K of PAID ACCREC was invisible → now reads `xero_invoices.project_code` directly → ACT-GD received = **$649,710.79** (matches the recon exactly).

## Close-the-loop plan (`thoughts/shared/plans/2026-05-29-xero-close-the-loop.md`)
- **Phase 1 (built, `bf4a4c3`, NOT live-tested):** `POST /api/finance/xero-pushback/attach` + Attach button on the 11 receiptless bills → PUT `Invoices/{id}/Attachments`. Route confirmed reachable + sees `XERO_TENANT_ID`; token→PUT path unproven (didn't pollute a real bill with a test file).
  - **⏳ GATING TEST:** Ben drops a real receipt on one of the 11 bills (mirror → "Bills · no receipt" filter) → confirm it lands in Xero. Fails gracefully ("retry") if misconfigured.
- **Phase 2 (planned):** tag push-back queue `/finance/xero-pushback` — push Supabase tags → Xero tracking (the ~1,200 `manual*` rows). Uses the proven recode write path (today's void/recode). Supersedes `2026-05-18-xero-pushback-dedicated-session.md`.

## Ongoing-bookkeeping roadmap (Ben picked all 4)
- ✅ **#1 AI tagging in the mirror** (`c7ccead`). Heuristic (location/vendor rules in `lib/finance/suggest-project.ts`), explainable, free. **Fast-follow:** LLM pass for the low-confidence/default tail (MiniMax via `/api/finance/ask`).
- ✅ **#2 daily delta + digest** — COMPUTE done (`e7d1727`): `scripts/finance-daily-digest.mjs` (new-7d / untagged / bills-no-receipt / dups / recon%, reads `NEXT_PUBLIC` DB) + mirror "All/7/30/90d" period filter. **GATED REMAINDER:** wire the digest → Telegram + Notion + a daily PM2 cron (Tier-3 external send). Model on existing briefing infra.
- ✅ **#3 anomaly/dup watch** — DONE (`a682653`+`0311737`): `scripts/detect-finance-anomalies.mjs` (void-candidates / same-day dups / GE-429 / vendor-variants; `--json`, `--worklist`). **Found 30 void-candidates = $76,060 phantom AP.** Worklist: `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`. **GATED REMAINDER:** surface in the mirror UI + actually VOID the confirmed dups (Tier-3).
- ⬜ **#4 close-the-books assistant** — AI monthly-close + BAS + R&D evidence packs from tagged data w/ provenance; feeds Pty cutover + Standard Ledger handoff. R&D pack tooling exists (`scripts/grade-pack.mjs`, `thoughts/shared/rd-pack-fy26/`).

## ⭐ Biggest actionable finding: $76K phantom AP (duplicate void worklist)
`scripts/detect-finance-anomalies.mjs` surfaced **30 AUTHORISED bills duplicating a PAID bill** → `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`. Tiers: 🔴 2 exact-invoice-# (HighLevel, Booking.com) · 🟠 19 no-# shadows ($67.7K incl **Telford Smith $19,800** known double-pay, Centre Canvas $10,285, Oonchiumpa $5,940, Matnic $6.4K+$2.8K, Kirmos no# $4,500, Clearview $768.83) · 🟡 9 needs-review (different #s — incl **Kirmos INV-004 $4,500 which may be genuinely owed, NOT a dup**). **These inflate the recon's "AP gap" — voiding the confirmed ones (Tier-3, review first) cleans up the books before the Pty cutover.**

## Key traps / learnings (don't re-hit)
- **`exec_sql` RPC takes `{query:}` NOT `{sql:}`** — `{sql:}` executes but returns a status object, not rows (silent $0s). The transactions route + dropdowns use `{query:}`.
- **transactions API caps 1000/table** unless you paginate (`.range` alone doesn't beat PostgREST max-rows); fixed in that route, but any new bulk read needs the loop.
- **`vendor-rules-suggest` is heuristic regex, not an LLM** (the grep false-matches `openai`/`anthropic` as vendor keywords in its regex).
- **My node client (SUPABASE_SHARED_URL) hit a different DB/PostgREST than the running app** this session (project_monthly_financials returned 0 via node but $350K via the app). **Verify finance data via the running app (`curl localhost:3002/api/...`), not ad-hoc node probes.**
- **Tags written in the mirror are Supabase-only** — they do NOT reach Xero (that's Phase 2). The accountant/SL working in Xero won't see them until push-back.
- Dev `.next` HMR wedges after rapid multi-file edits (blank page, `_next/static` 404 storm) → `pm2 stop act-frontend && rm -rf apps/command-center/.next && pm2 restart act-frontend`. `act-frontend` runs `npm run dev`.

## Open / Ben's calls (resume menu)
- **VOID the confirmed duplicates** from the $76K worklist (Tier-3 — review 🟡 tier first; 🔴/🟠 are high-confidence). Biggest $ payoff. Use the `apply-goods-bookkeeper-corrections.mjs` void pattern.
- **Phase-1 attach gating test** — Ben has Webflow PDFs; filter Receipt→"Bill · no receipt" → Webflow $29 → attach. (Steps in chat.) Proves the live receipt upload.
- **#4 close-the-books assistant** — last roadmap item.
- **Wire #2 digest send + cron** (Telegram/Notion + PM2, Tier-3) — makes the digest a daily habit.
- **Surface #3 anomalies in the mirror UI** (extend audit → Duplicates flag, or a "void candidates" panel).
- Joseph Kirmos INV-004 $4,500 — possibly genuinely owed, NOT a dup (Ben checking with Joey).
- Deploy to `command.act.place` (still localhost-only).
