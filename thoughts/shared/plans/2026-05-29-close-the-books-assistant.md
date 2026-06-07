# Plan — Roadmap #4: Close-the-Books Assistant

## Context
The ongoing-bookkeeping roadmap has shipped #1 (AI tag suggestions), #2 (`finance-daily-digest.mjs`), and #3 (`detect-finance-anomalies.mjs`). #4 is the periodic counterpart: a **close-the-books assistant** that answers one question for a chosen period — *"is this period ready to close?"* — and produces the artifact ACT hands to Standard Ledger and uses for the 30-Jun Pty cutover.

Research (capability map, this session) confirmed #4 is an **orchestration layer, not greenfield**: BAS math (`prepare-bas.mjs`), R&D eligibility (`tag-rd-eligibility.mjs` writes `rd_eligible`/`rd_category`), anomaly detection (`detect-finance-anomalies.mjs`), and digest compute (`finance-daily-digest.mjs`) already exist. What's missing is a **single period-scoped roll-up across all lenses + a ready-to-close gate + a provenance sidecar**, reading the **app DB (`NEXT_PUBLIC_SUPABASE_URL`)** so the numbers match `/finance/mirror` and the digest. No existing script produces a unified pass/warn/block verdict for a period.

**v1 scope (confirmed with Ben):** script + dated artifact only. Telegram push / command-center read surface are deferred (gated). **AI layer:** deterministic core (numbers + gate are 100% computed, provenance-backed); optional `--narrate` adds an LLM plain-English close memo on top, off by default.

## Deliverable
`scripts/close-the-books.mjs <period> [--json] [--save] [--narrate]`

- `<period>` — `YYYY-MM` (month, e.g. `2026-04`) · `Q3` or `FY26-Q3` (AU FY quarter) · `FY26` (full FY). **AU FY = Jul–Jun**; Q1 Jul–Sep, Q2 Oct–Dec, Q3 Jan–Mar, Q4 Apr–Jun.
- `--json` machine output · `--save` writes report + provenance · `--narrate` appends LLM memo.
- Console + DRY by default (no writes, no external sends). Mirrors `finance-daily-digest.mjs` exactly: `import '../lib/load-env.mjs'`, `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`, PostgREST builder (not `exec_sql`), `.range()` pagination past the 1000-row cap, `fmt()` en-AU dollars, `main().catch(e => …process.exit(1))`.

## The seven lenses (all period-scoped, ACT two-account filter)
ACT scope constant: `bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')`; exclude NM Personal + Maximiser. Exclude `status IN ('VOIDED','DELETED')` everywhere.

1. **Reconciliation** — `xero_transactions.is_reconciled` % over period (ACT accounts).
2. **Receipt coverage** — bills (`xero_invoices` ACCPAY) + spends (`xero_transactions` SPEND) in period lacking `has_attachments`; coverage % by $ + count + $ of the gap + top offenders.
3. **Tagging** — % of period SPEND $ with a `project_code`; untagged count + $ (project_code as-is — honours the manual-tag guard).
4. **Cleanliness (anomalies)** — `execSync('node scripts/detect-finance-anomalies.mjs --json')`, extract JSON payload from stdout, filter to the period: near-certain void/dup candidates + GE-429 (acct 429) bills. These are the hard blockers.
5. **P&L roll-up** — income (`xero_invoices` ACCREC) − expense (`xero_transactions` SPEND ACT + `xero_invoices` ACCPAY) in period, grouped by `project_code`; net.
6. **BAS slice** (quarter/FY only) — **indicative** GST from `line_items[].tax_type` (reusing `prepare-bas.mjs`'s classification: `OUTPUT`→1A GST-on-sales, `INPUT`/`CAPEXINPUT`→1B GST-credits, GST = `line_amount/11`); net GST. Labelled *"indicative — run `prepare-bas.mjs Q<n> --save` for the lodgement-grade worksheet"* (cash-vs-accruals will differ).
7. **R&D slice** — `xero_transactions` in period where `rd_eligible=true`: $ by `rd_category` (core/supporting/review) + receipt coverage on those. If `rd_eligible` is all-null, print *"run `tag-rd-eligibility.mjs --apply` first"*. Point to `thoughts/shared/rd-pack-fy26/` registers for the full evidence (bills aren't persisted with rd flags).

## The ready-to-close gate
Per-lens 🟢/🟡/🔴 against thresholds (constants at top of file, easy to tune):
- **Recon** 🟢 ≥98% · 🟡 90–98% · 🔴 <90%
- **Receipts** 🟢 ≥95% by $ · 🟡 80–95% · 🔴 <80% or any single unreceipted item >$1,000
- **Tagging** 🟢 ≥98% by $ · 🟡 90–98% · 🔴 <90%
- **Cleanliness** 🟢 0 in-period anomalies · 🔴 any near-certain dup/void or GE-429 in period · 🟡 vendor-variants only

**Overall verdict = worst lens:** 🟢 READY TO CLOSE · 🟡 CLOSE WITH NOTES · 🔴 NOT READY. Output ends with a **prioritized "to close this period, do:" action list** (specific counts/$/top offenders + the exact follow-up command, e.g. "void N dups → `void-duplicate-bills` pattern", "chase $X receipts → `bas-gap-sweep Q3`").

## Output
- **Human:** `📕 Close pack — FY26-Q3 (Jan–Mar 2026)` + freshness line (Xero-as-of from `.xero-sync-state.json` if present) → 7 lens blocks → gate verdict + action list.
- **`--json`:** `{period, window, lenses:{recon,receipts,tagging,cleanliness,pnl,bas,rd}, gate:{verdict, blockers[]}}`.
- **`--save`:** `thoughts/shared/reports/close-pack-<period>-<YYYY-MM-DD>.md` + `.provenance.md` sidecar from `thoughts/shared/templates/provenance-template.md` (sources = tables + scripts called; verified vs inferred; gaps; reproducibility = the exact command). Required per CLAUDE.md provenance rule for financial reports.
- **`--narrate`:** after compute, `lib/llm-client.mjs#trackedAgentCompletionWithFallback` turns the JSON into a 1-paragraph plain-English close memo for Ben/SL; appended + labelled *"AI memo (generated)"*. Numbers stay the source of truth.

## Files
1. **`scripts/close-the-books.mjs`** — NEW, the whole assistant (~300 lines). Inline AU-FY period parser (extraction to a shared `lib/au-fy-period.mjs` noted as a future cleanup — BAS scripts could reuse it, but out of v1 scope).
2. **First execution step:** copy this plan to `thoughts/shared/plans/2026-05-29-close-the-books-assistant.md` (CLAUDE.md plan-artifact rule).
3. Generated at runtime (not code): the close-pack report + provenance.
4. Optional: add `Bash(node scripts/close-the-books.mjs:*)` to `.claude/settings.local.json` so it runs prompt-free (same as `apply-ge-recode-to-xero.mjs` got).

**No edits to existing scripts** — the detector is reused via execSync (its `--json` already exists), nothing else is touched.

## Reuse (don't rebuild — cite)
- `scripts/detect-finance-anomalies.mjs --json` → cleanliness lens.
- `scripts/finance-daily-digest.mjs` → DB-client pattern + recon/untagged/receipt computations.
- `scripts/prepare-bas.mjs` → GST tax_type classification reference; the lodgement worksheet to point at.
- `scripts/tag-rd-eligibility.mjs` → reads its `rd_eligible`/`rd_category`.
- `thoughts/shared/templates/provenance-template.md` → the sidecar.
- Two-account rule + manual-tag guard (memory: load every session).

## Verification (end-to-end, before commit)
1. `node scripts/close-the-books.mjs FY26-Q3` → eyeball 7 lenses + gate (Q3 = Jan–Mar 2026, has data; the void sweep should now show cleaner).
2. `node scripts/close-the-books.mjs FY26-Q3 --json | head` → valid JSON, expected shape.
3. `node scripts/close-the-books.mjs 2026-04` → monthly close path works.
4. **Cross-check (the trust test):** recon% + untagged $ ≈ `finance-daily-digest.mjs` for the overlap; in-period anomaly count == `detect-finance-anomalies.mjs` filtered to period; BAS 1A/1B in the ballpark of `prepare-bas.mjs Q3` (note cash-vs-accruals divergence, don't expect exact). Verify a known figure against `/finance/mirror` via `curl localhost:3002/api/...` (memory trap: app DB = NEXT_PUBLIC, not SHARED).
5. `node scripts/close-the-books.mjs FY26-Q3 --save` → both files exist; provenance lists sources + the reproducer command.
6. `--narrate` once → memo reads sensibly, numbers match the deterministic block.
7. Commit on `wip/goods-finance-recon-2026-05-29` with `Plan: 2026-05-29-close-the-books-assistant`. Push only on Ben's go (Tier 2).

## Out of scope (v1)
Telegram push · command-center `/finance` panel · a `period_close_status` DB table (persisted close state) · grading the close pack with `grade-pack.mjs` (rubric authoring). All noted as fast-follows.
