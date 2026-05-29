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

## 3. OPEN — bookkeeper Xero corrections (need Ben's authorisation; all Xero writes)

1. **Void** Carla Furnishers duplicate $11,180 (2025-11-16) — Xero `42960d4f-49e3-4f9a-a378-af8fde24704c` (no-attachment copy; keep `6a60f4fd-c99d-4bb2-9ad2-51f372958cbc`).
2. **Retag + recode** 1300 Washer $13,980 (2025-12-15) — Xero `c3d5dd2a-98e9-4261-81aa-18e57ec86109`. CONFIRMED Goods (washing machines for the Goods project) but Xero line still tracks **"ACT-FM — The Farm"** + account **429**. Retag line ACT-FM→ACT-GD and recode off 429 so Xero matches the mirror and The Farm stops carrying $13,980.
3. **Match (don't re-pay)** the ~35 remaining AUTHORISED ACT-GD bills (incl. Defy INV-1507 $16,500 — confirmed legit Goods bed+washer production) to their existing ACT-account payments to clear them. Full list with Xero IDs in the report.

> Next session: offer to draft these as a ready-to-send bookkeeper instruction (vendor · amount · Xero ID · action). The copilot at `/finance/xero-page-copilot` is now the surface to do the inline re-tags from.

## 4. OPEN — other session's uncommitted work (DO NOT touch / commit)

The working tree carries **26 uncommitted files from another session** — an `excludeRadar` / `pipeline-rollup` refactor across ~12 finance API routes (cashflow, runway, briefing, opportunities, pipeline/board, ecosystem, harvest, projects, revenue-streams) + generated outputs. Untouched this session. Ben to commit or stash before it's stomped.

## Resume checklist
- Read this handoff + `financials/2026-05-29-goods-ap-recon-dedup.md`.
- Bookkeeper Xero actions are the main open thread → draft the instruction or do the inline re-tags via the copilot.
- Decide what to do with the other session's `excludeRadar` changes.
