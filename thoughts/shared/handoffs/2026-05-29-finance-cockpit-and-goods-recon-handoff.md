# Handoff — Finance cockpit consolidation + Goods AP recon (2026-05-29)

Resume point for the bookkeeper / Xero corrections and the Goods model support.

## 1. SHIPPED — Finance cockpit consolidation P1–P4 (merged + live)

PR **#124 merged to main** (`9616c2d`); deployed to command.act.place. Plan: `thoughts/shared/plans/2026-05-29-finance-cockpit-consolidation.md`.

- **P1** `/api/finance/sync-freshness` + `<FreshnessBadge>` (finance layout header, every surface) + `<ReceiptInXero>`.
- **P2** `/api/finance/trust-meters` + `<TrustMeters>` strip on `/finance/overview` (reconciliation 65.6% · receipts 77.6% · tagging 96% · GE-429 $285,769/95 bills). `/finance/command` + `/finance/money-alignment` → redirect stubs (APIs stay live).
- **P3** copilot (`/finance/xero-page-copilot`) made read-write: `<RetagSelect>` inline re-tag + `<ReceiptInXero>` on bill candidates + find-missing-receipt CTA + OPERATE tab-bar.
- **P4** finance sidebar collapsed to State · Operate · Drill · Reports.

**One pending:** visual/browser pass on the new client UI (TrustMeters strip + copilot inline re-tag). CI build (incl. Vercel) is green, so it compiles/SSRs — just hasn't been eyeballed. Shared browser was in use.

## 2. SHIPPED — Goods (ACT-GD) AP recon + expense de-dup (verified)

Full report + provenance: `thoughts/shared/financials/2026-05-29-goods-ap-recon-dedup.md` (+ `.provenance.md`). All figures queried directly from the shared Xero mirror (Supabase `tednluwflfhxyucgwigh`, synced 02:33 2026-05-29).

**Model inputs (locked, feed to the Goods finance model v0.2):**
- Revenue **≈ $649,711 received** + **$82,500 real AR** (Rotary — verified genuinely owed, no matching receipt).
- Expense **≈ $614K** P&L (de-duped; Defy INV-1507 $16,500 + 1300 Washer $13,980 both kept in Goods). Cash-out basis ≈ $566K.
- AP genuinely owed **≈ $0** — the $124,878 AUTHORISED is a Xero payment-matching gap (bills paid from ACT's own accounts, never applied). **No working-capital squeeze, no director loan** — all spend came from NAB Visa ACT + ACT Everyday, $0 from NM Personal.

## 3. Xero corrections — DONE (2026-05-29 PM, Ben-authorised) + AP deep-dive

**Two writes applied + verified live** (codebase OAuth path; Xero MCP still broken). Scripts: `scripts/apply-goods-bookkeeper-corrections.mjs` (dry-run default, `--apply`, revert log) + `scripts/verify-goods-bookkeeper-targets.mjs` (read-only probe). Revert log: `scripts/output/goods-bookkeeper-revert-1780030961185.json`.

1. ✅ **VOIDED** Carla duplicate $11,180 — Xero `42960d4f…` (was AUTHORISED/$0-paid/no-attachment Dext junk; keeper `6a60f4fd…` untouched). Confirmed VOIDED via live GET.
2. ✅ **RECODED** 1300 Washer $13,980 — Xero `c3d5dd2a…`: line acct **429→446**, Project Tracking **ACT-FM→ACT-GD** (Business Divisions + INPUT tax preserved). The Farm no longer carries it. Confirmed via live GET.
3. **Match (don't re-pay) — NOT done via API by design** (double-pay risk; `match-bank-txns-to-bills.mjs` is dry-run-only on purpose). Instead produced a 3-bucket **Find & Match action sheet**: `thoughts/shared/financials/2026-05-29-goods-find-and-match-worklist.md` (generator `scripts/generate-goods-match-worklist.mjs`).

**AP deep-dive (resolves the recon's "AP owed ≈ $0"):**
- **Bucket A (11 bills · ~$65K)** — clean Xero UI Find & Match (bank line exists, unreconciled). Bookkeeper job.
- **Bucket B (~18 bills · ~$16K)** — pre-Nov-2025, paid via NM Personal/old accounts; no ACT-account line to match. Leave/void.
- **Bucket C** — Defy **covered** (25 PAID + matching SPEND; 3 small unmatched sit against ample unassigned Defy cash). Real exposure is tiny: see open items.
- **Method note:** "bills − SPEND balance" OVERSTATES AP (most bill payments live outside `xero_transactions` — Kirmos has $13,500 PAID with only $2,737.50 of bank SPEND). Use bill-level `amount_due`/`status`, not the subtraction.

**Open items (next session / bookkeeper / Ben):**
- ⚠️ **Joseph Kirmos INV-004 $4,500 (Feb 16) — possibly genuinely owed** (AUTHORISED while Mar/May INV-005/006/007 all PAID; no tracking, no payment). **Ben to check with Joey** whether he was paid off-table. If yes → match/mark paid; if no → real payable.
- **Two more duplicates flagged, HELD (not voided — Ben's call deferred):** Kirmos (no#) $4,500 (2026-03-29, dup of PAID INV-006) + Clearview (no#) $768.83 (2026-01-05, dup of PAID SO-297222). Same Carla signature. Re-run `apply-goods-bookkeeper-corrections.mjs` pattern if confirmed.
- **Clearview INV-301697 $768.83 (Jan 22)** — possible genuine 2nd order or 3rd dup; bookkeeper to confirm.
- Bookkeeper to clear the 11 Bucket-A Find & Match in Xero UI.

## 4. ⚠️ Cross-session: the `excludeRadar` refactor was reverted (not by this session)

Earlier this session the working tree carried an uncommitted `excludeRadar` / `pipeline-rollup` refactor across ~12 finance API routes (cashflow, runway, briefing, opportunities, pipeline/board, ecosystem, harvest, projects, revenue-streams). **By session close those code changes were gone** — not committed (no commit exists for them on any branch), not stashed (`git stash list` empty), reverted by a concurrent process. **This session did not touch them** (only the 3 docs in §commit were staged; git can't discard unstaged edits via add/commit/switch/push).

If that refactor was wanted: check the other active session's context/worktree — it may still hold it; otherwise it needs re-doing. Remaining modified files are now only ~14 generated outputs / cron-noise (reports, cross-codebase-feed, financials/ACT-GD.md + INDEX.md, wiki/log.md, etc.).

## Resume checklist
- Read this handoff + `financials/2026-05-29-goods-ap-recon-dedup.md`.
- Bookkeeper Xero actions are the main open thread → draft the instruction or do the inline re-tags via the copilot.
- Decide what to do with the other session's `excludeRadar` changes.
