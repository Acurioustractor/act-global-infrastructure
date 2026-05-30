# Plan — Xero as the topmost source of truth for project/funder classification (Goods first)

**Created:** 2026-05-30
**Owner:** Ben
**Status:** Phase 0 COMPLETE (2026-05-30) — awaiting approval for Phase 1 (first Xero write)
**Branch (to create):** `wip/xero-source-of-truth-2026-05-30` off `main`

## Goal

Make **Xero `Project Tracking`** the single source of truth for which project/funder
each dollar belongs to, and make every downstream system (Supabase mirror, GHL,
the Goods dashboard) **derive** from it instead of holding parallel, drift-prone
copies. Prove it on **Goods (`ACT-GD`)** first, then generalise.

Principle (Ben's call, 2026-05-30): *truth at the topmost level in Xero; everything
reads from it.* Not a Supabase map that can itself drift.

## Why this never stuck (verified, not guessed — 2026-05-30 probe)

Probe: `scripts/probe-goods-funder-truth.mjs` (read-only, DB `tednluwflfhxyucgwigh` = command-center finance DB, same as `/finance/mirror`). 125 ACCREC income invoices.

- **Xero `Project Tracking` is the real top-level dimension and already exists** —
  options are the `ACT-XX — Name` project codes. But it's **only 45% populated**
  on income (56/125) and **dirty**: `Goods.` (4) vs `ACT-GD — Goods` (3) vs generic
  `A Curious Tractor` (22) vs `Rental – 601 Maleny` (27).
- **Supabase `project_code` is 99% populated** (124/125) and clean — so it is the
  *de-facto* truth today, but it's maintained by taggers/heuristics, which is the
  drift surface.
- **The Xero-derived Goods ledger is already correct:** `project_code='ACT-GD'` →
  $649,711 cash received, $380,600 due, and it already **excludes** the phantoms.
- **Root cause of the felt drift:** the GHL Goods Supporter Journey was populated
  once by `seed-goods-supporter-journey.mjs` with **typed-in numbers** and never
  reads the Xero ledger. No code path writes Xero→GHL corrections. The loop was
  never closed. (NB: the `agent-xero-ghl-reconciler.mjs` the earlier analysis
  cited **does not exist** by that name — verify reconciler reality in Phase 0.)

## Decision log (locked)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Full scope** — make Xero the source (standardize → backfill → flip derivation → ledger view → close GHL loop) | Ben, 2026-05-30. Most durable. |
| D2 | **PICC = `ACT-PI`**, NOT Goods | Ben confirmed PICC is its own project. Phase 0 correction: the real chart code is **`ACT-PI — PICC`**; `ACT-ER — PICC Elders Room` is a stale/orphan option string, not a real code. $436,700 stays out of Goods ledger either way. |
| D3 | **TFN $130K / FRRR $50K / AMP $21,900 = phantom, excluded** | Not received ACCREC income in Xero. TFN is an ACCPAY bill; FRRR absent (0 records); AMP a $156 bill. Data-confirmed. |
| D4 | All Xero + GHL writes **dry-run-first**, `--apply`-gated, with revert log | Matches the proven void-worklist pattern (2026-05-29). |
| D5 | **Locked-period invoices (date ≤ 30-Sep-2025) are NOT edited** | FY26-Q1 BAS lodged. Route reclassifications to Standard Ledger as prior-period adjustments. |

## Phase 0 results (2026-05-30) — `scripts/audit-xero-tracking.mjs` → `thoughts/shared/financials/2026-05-30-xero-tracking-audit.md`

- **Income `Project Tracking` coverage is 12% (15/125), not 45%** — the first probe conflated
  `Business Divisions` tags. The topmost source is near-empty on income; `project_code` (99%) holds the truth.
- Classification: MATCH 3 · **MISSING 109** · WRONG 11 · NEITHER 2.
- **Backfill worklist: 49 unlocked ($611,958) re-taggable · 71 locked ($996,586) → Standard Ledger.**
  71% of income is locked → drives the D6 hybrid decision below.
- **Chart export is stale** — 4 orphan options on invoices not in `config/xero-chart.json`:
  `Goods.`→`ACT-GD — Goods`, `ACT-ER — PICC Elders Room`→`ACT-PI — PICC`, `Mounty`→`ACT-MY — Mounty Yarns`,
  `The Harvest`→`ACT-HV — The Harvest Witta`. **Phase 1 must re-export live Xero first.**
- ACCPAY (expense) coverage is 40% across 2,102 bills — better than income; generalise after Goods.
- Goods: 29 invoices, 25 MISSING + 4 WRONG (0 correct), 13 locked → 16 unlocked to tag `ACT-GD — Goods`.

| # | Decision | Rationale |
|---|---|---|
| D6 | **Hybrid derivation, not hard flip** — Xero tracking authoritative where present, else keep `project_code` | 71% of income is locked & can't carry Xero tracking; a hard flip would erase historical classification. |

## Open questions (resolve during build)

- **Q1** Regional Arts $33K, Dusseldorp $16.5K, Paul Ramsay $7,469 — real ACCREC cash,
  currently untagged-to-project. Goods or their own codes (e.g. `ACT-RA` Regional Arts)?
- **Q2** Does a scheduled Xero↔GHL reconciler actually run? (cited file absent — confirm in Phase 0.)
- **Q3** What to do with the `Rental – 601 Maleny` (27) and generic `A Curious Tractor` (22)
  options — keep as real categories or fold into project codes?

## Phases (execute one at a time; commit at each boundary; `npx tsc --noEmit` between code phases)

### Phase 0 — Audit & canonical option set  · Tier 1 (read-only)
- Export current Xero chart (`scripts/export-xero-chart.mjs`) → enumerate all
  `Project Tracking` options + usage counts + which invoices/periods.
- Define the **canonical option list** (one clean `ACT-XX — Name` per active code).
- Produce a **dirty→canonical mapping** + a **re-tag worklist** split by
  locked vs unlocked period.
- Confirm reconciler reality (Q2). Output: `thoughts/shared/financials/2026-05-30-xero-tracking-audit.md`.
- **Verify:** worklist totals reconcile to the 125 ACCREC + $649K Goods.

### Phase 1 — Standardize Xero `Project Tracking` options · ~~Tier 3~~ → **NO-OP (verified 2026-05-30)**
- **Live Xero already has 33 clean `ACT-XX — Name` options, zero archived, zero orphans.**
  The `Goods.` / `ACT-ER — PICC Elders Room` / `Mounty` / `The Harvest` "dirty options" from
  Phase 0 are **stale strings in the Supabase mirror's cached line_items**, not live Xero options.
  Nothing to standardise in Xero. PICC = `ACT-PI` confirmed live.

### Phase 1′ — Re-sync the mirror to current Xero truth · Tier 2 (Supabase write) — **DONE 2026-05-30**
- Ran `sync-xero-to-supabase.mjs invoices --days=90` → 258 invoices refreshed, 0 errors, Goods held $649,711.
- **KEY FINDING: a re-sync CANNOT clear phantom voided receivables** — Xero's `where=Date>=` query
  **excludes VOIDED/DELETED invoices by design**, so the sync never re-fetches them to zero their `amount_due`.
- **Fix applied (deterministic):** zeroed `amount_due` on the 5 ACCREC VOIDED/DELETED rows still carrying it
  ($375,100 phantom: Centrecorp $298,100 + Palm Island/PICC $77,000). Revert log
  `scripts/output/void-amountdue-revert-2026-05-30.json`. Verified: Centrecorp due $298,100→$0,
  Goods due $380,600→$82,500 (Rotary's real pledge), live surface corrected (data-layer, no redeploy).
- ⚠️ **DURABLE FOLLOW-UP (recurrence risk):** the mirror's `amount_due` isn't auto-zeroed when an invoice
  is voided (Xero won't re-sync it). Either (a) `v_funder_next_move` + outstanding queries should
  `WHERE status NOT IN ('VOIDED','DELETED')`, or (b) the void scripts must zero `amount_due` in the mirror.
  Pick one before the next void batch or this phantom returns.
- Also corrects an earlier report: **PICC real outstanding ≈ $0** (the "$77K due" was a voided invoice).

### Phase 2 — Backfill `Project Tracking` onto unlocked income · Tier 3 Xero write — **UNLOCKED DONE 2026-05-30**
- Tools: dry-run `scripts/backfill-xero-tracking.mjs` · apply `scripts/apply-xero-tracking-backfill.mjs`
  (GET-fresh per invoice · modify Tracking only · post-write Total/AmountDue verify · revert log).
- **✅ All unlocked income tagged in live Xero — 17 invoices across 5 programs, every total intact:**
  ACT-GD 5 ($249,711) · ACT-HV 6 · ACT-JH 3 (incl Homeland INV-0303 AUTHORISED) · ACT-SM 2 · ACT-PI 1.
  Independently re-verified INV-0282, INV-0321 (Snow), INV-0286 (PICC). Revert log:
  `scripts/output/xero-tracking-backfill-revert-2026-05-30.json`.
- **Still TODO:** Locked 54 invoices · $1.08M → **Standard Ledger handoff doc** (Tier 1, not yet generated).
- Mirror lags Xero until next sync (expected); Phase 3 derivation will pick up the new tags.

### Phase 3 — Flip the mirror derivation · Tier 1–2 code
- `scripts/sync-xero-to-supabase.mjs`: derive `project_code` **from**
  `line_items[].tracking[]` where `Name === 'Project Tracking'` (parse `ACT-XX` prefix).
  **Xero-where-present, else keep existing `project_code`** — NOT a hard flip. This is
  load-bearing: 71% of income is locked (can't carry Xero tracking), so a hard flip would
  drop Goods from $649K to the ~15 tagged invoices. Xero is authoritative when set;
  Supabase `project_code` fills the locked/historical gap.
- Keep the **manual-source guard** (never overwrite `project_code_source LIKE 'manual%'`).
- **Verify:** re-sync → Goods ledger unchanged at $649,711 (no regression).

### Phase 4 — Goods funder ledger as a derived view · Tier 1 (+ Tier 3 if DB view migration)
- Build `v_goods_funder_ledger` (or script-materialised): ACCREC where derived
  `project_code='ACT-GD'`, grouped by contact → cash_received, due, status, last_payment.
- **Retire** `seed-goods-supporter-journey.mjs` (archive, don't delete).
- **Verify:** ledger total == $649,711; funder rows match probe output.

### Phase 4.5 — SHIPPED 2026-05-30 (PR #127, merged `a66c78e`) — funders surface drift overlay · Tier 1
- `/finance/funders` extended: project filter (ACT-GD lens) + "GHL vs Xero" column
  (🟢 MATCH / 🟡 DRIFT / ⚪ PROSPECT + pipeline tooltip) + phantom-paid banner.
  API joins `ghl_opportunities`; `summary.ghl` rollup. Read-only diff = the live dry-run for Phase 5.

### Phase 5 — Reconciliation cockpit: resolve drift across all areas, anchored to Xero · Tier 3 GHL write (dry-run → approve → `--apply`)
- **Reshape from batch script → interactive resolve flow on `/finance/funders`.** Per-row
  **Reconcile** button → dry-run diff panel → approve → write. One verb per verdict:
  DRIFT→dedupe to pipeline-of-record (value=Xero cash, withdraw dup); PHANTOM→withdraw/convert-to-pledge;
  PLEDGE→reclassify to open stage; XERO_ONLY→create opp. Anchor rule: **resolution always makes
  other systems agree with Xero, never the reverse.**
- Propagation: one resolve writes GHL (`ghl-api-service.mjs` + `ghl_sync_log` `supabase_to_ghl`),
  dashboard auto-updates (same ledger), Notion syncs (`sync-funder-reporting-to-notion.mjs`).
- Second direction ("reconcile *for* Xero"): rows also flag funders whose Xero invoices lack
  `ACT-GD` Project Tracking → resolve back-tags Xero (ties to Phases 1–2).
- Add a "funder reconciliation %" lens to the close-the-books gate.
- **Live-GHL finding (2026-05-30, `scripts/goods-funder-ledger-diff.mjs` vs `ghl_opportunities`):**
  GHL "paid" = $1,273,103 vs Xero cash $649,711 — ~2× inflated. Causes: (a) **same funder
  duplicated across pipelines** (Supporter Journey + Buyer Pipeline, sometimes The Shop) —
  Centrecorp/Our Community Shed/Julalikari/Red Dust each ~2× their Xero cash; (b) **phantoms
  persist** — TFN $130K, FRRR $50K, AMP $21,900 still marked paid, $0 in Xero. 4 funders clean.
- So the write-back is not just "unfreeze hardcoded" — it must **(1) dedupe each funder to one
  pipeline-of-record, (2) zero/withdraw the phantoms, (3) set monetaryValue from the Xero ledger.**
- Point GHL at the ledger; **show the dry-run diff before any write** (the go/no-go).
- Goods dashboard (`goodsoncountry.com/admin`) reads the ledger view.
- Close the write-back loop (new `scripts/reconcile-goods-ghl.mjs` using
  `scripts/lib/ghl-api-service.mjs` + `ghl_sync_log` direction `supabase_to_ghl`).
- **Verify:** GHL Goods paid total == ledger == dashboard == Xero ACCREC `ACT-GD` cash ($649,711).

### Phase 6 — Provenance + close
- `<ledger>.provenance.md` sidecar (sources, verified vs inferred, reproducibility).
- Update `current.md` ledger + memory.

## Files in scope
- Read/derive: `scripts/probe-goods-funder-truth.mjs`, `config/xero-chart.json`, `scripts/lib/finance/xero-client.mjs`
- Xero writes: `export-xero-chart.mjs`, `archive-xero-tracking-options.mjs`, `dryrun-archive-xero-tracking-options.mjs`, new backfill script
- Mirror: `scripts/sync-xero-to-supabase.mjs`
- Ledger: new view/script; archive `seed-goods-supporter-journey.mjs`
- GHL: `scripts/lib/ghl-api-service.mjs`, new `reconcile-goods-ghl.mjs`
- Dashboard: Goods `/admin` data source

## Rollback
- Xero: every write has a before-state revert log (void-worklist pattern).
- Supabase: manual-source guard prevents tag loss; derivation change is reversible via git.
- GHL: dry-run diff first; `ghl_sync_log` records every push.

## Guardrails (from this session's lessons)
- Small turns, no marathon tool chains. Commit at each phase boundary.
- If the `400 thinking blocks cannot be modified` error returns → `/clear`, don't retry.
- No Xero/GHL `--apply` without the explicit go in Ben's message for that phase.
