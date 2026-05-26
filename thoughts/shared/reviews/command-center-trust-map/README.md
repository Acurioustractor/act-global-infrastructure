# Command Center — Data Trust Map & Remediation Plan
**Date:** 2026-05-26 · **Author:** Ben + Claude · **Status:** audit complete, remediation pending approval
**Scope:** every page (~65) and API route (~230) in `apps/command-center`, plus the data lineage behind each.
**Method:** mechanical schema diff (168 referenced tables vs live DB `tednluwflfhxyucgwigh`) + freshness map + 5 parallel per-cluster lineage audits.

> Sections: [`_schema-truth.md`](./_schema-truth.md) (ground truth) · [`D-exec-spine.md`](./D-exec-spine.md) · [`A-finance-money.md`](./A-finance-money.md) · [`B-finance-operate.md`](./B-finance-operate.md) · [`C-relationships.md`](./C-relationships.md) · [`E-knowledge-misc.md`](./E-knowledge-misc.md)

---

## The one-paragraph verdict
The command center is a **rich, mostly-working operational tool wrapped in a broken executive layer.** The day-to-day operate surfaces people actually use — transaction tagging, vendors, receipts, supporters, people, funders, the knowledge graph, chat — are real, fresh, and safe. But **the flagship `/company` page and most of the "tell me how ACT is doing" widgets are wrong**, because the code drifted away from the database: ~1 in 4 referenced tables no longer exists, finance is computed ~9 different (disagreeing) ways, a sign bug fakes revenue, and broken queries return silent zeros that *look* like real data. The fix is not a rewrite — it's **one honest money source, a handful of column fixes, re-lighting 3 dead data pipelines, and archiving the fakes so the dashboard stops lying.**

## Trust map at a glance (~222 surfaces scored)
| Verdict | ~Count | Meaning |
|---|---|---|
| 🟢 real | ~107 (48%) | exists, fresh, correct lineage, plausible |
| 🟡 stale | ~39 (18%) | correct code, but the feeding pipeline has lagged |
| 🟠 misleading | ~41 (18%) | runs without error but mis-scopes/over-counts |
| 🔴 broken | ~23 (10%) | queries a dead table/column → silent zero or 500 |
| ⚫ not-wired | ~11 (5%) | placeholder / hardcoded / mock; never reads live data |
| ⚠️ unverified | ~8 (4%) | EL-instance storyteller routes (env-dependent) |

**Headline:** only ~half of what the dashboard shows is trustworthy, and the single most prominent page — `/company`, the org's front door — is in the broken bucket.

---

## Five systemic diseases (root causes, not symptoms)

**1. Schema drift — 41 of 168 referenced tables (24%) don't exist.**
The code was written once and the DB moved underneath it. Dead tables include `contacts` (real = `ghl_contacts`), `communications` (real = `communications_history`), `storyteller_master_analysis`, `business_initiatives`, `assets`, `donations`, the whole `debts*` set, `compliance_items`, `health_checks`, `deployments`, and the entire `agent_*` learning/autonomy/memory layer. Each becomes a silent zero. *Nothing binds the API to the schema — no types, no contract test.* Full list in `_schema-truth.md`.

**2. Nine finance engines that disagree.**
There is no shared income/expense definition. `lib/finance/` holds only pure math (runway, aging) and defines no extractor, so **every finance route re-invents "expense" and they contradict each other.** Only `api/finance/projects/[code]` (deduped ACCPAY bills + type-based SPEND, the `realExpenseRows` logic) is correct. `/company` and several others still use the **sign bug** (`total < 0` → $0, because all SPEND rows store positive amounts) which fakes **$1.4M revenue / $0 expenses** on the front page.

**3. Bills are ignored, transfers leak in.**
Most expense/R&D/coverage logic counts only bank SPEND and skips ACCPAY bills (the bulk of real spend), while `%-TRANSFER` rows leak in as revenue. Live example: `/harvest` under-reports ACT-HV by ~half ($60,412 of bills ignored).

**4. Three dead data pipelines feeding live-looking pages.**
- `bank_statement_lines` — frozen since **2026-04-13** (43d) → silently empties reconciliation, inbox, workbench, receipt-evidence, dext-push-audit, xero-page-copilot.
- `relationship_pipeline` — frozen since **2026-03-12** (2.5mo, 1,170 rows) → the `/pipeline` page looks alive but isn't (it's also a *third* duplicate "pipeline" concept).
- `relationship_health` — last computed **2026-04-29** (27d). The good news: the day-to-day relationship views deliberately route around it and recompute from fresh `ghl_contacts` + `communications_history`.
- (Lower stakes: `storytellers` 41d, `knowledge_chunks` ingestion 19d, `financial_snapshots` 20d, `fundraising_pipeline` abandoned.)

**5. Silent zeros disguised as data + hardcoded stale constants.**
A broken query returns `0`/empty, and the UI renders "0/100" or "$0" as if it were real. Plus hardcoded wrong constants: the **R&D deadline "30 Apr 2026 / −26 days"** (false — ACT's FY25-26 claim lodges Jul 2026–Apr 2027) appears hardcoded in BOTH `/company` and `api/strategy`; a `$89,000` cash fallback; the wrong legal entity ("ACT Foundation" + sole-trader ABN) baked into `accountant-pack` and `tax`.

---

## What's actually trustworthy (build on these)
- **Finance operate spine:** `/finance/transactions`, `/finance/vendors`, `/finance/audit`, `/finance/funders`, `/finance/ai-suggestions` — correct, fresh, write-safe (manual-source guard). The only live Xero writer (`xero-page-copilot/execute`) is dryRun-gated.
- **The one correct money calc:** `api/finance/projects/[code]` (`realExpenseRows`). This is the seed for the shared source of truth.
- **Relationships:** `/supporters` (daily-rebuilt `supporters_intelligence`, 158 rows fresh), `/people`, the email/relationship views. Canonical contact store = `ghl_contacts` (2,276, fresh).
- **Knowledge:** the memory graph is real and populated (`knowledge_chunks` 19,413, `knowledge_edges` 1,111, `memory_episodes` 3,450, all RPCs exist), `agent_proposals` queue (323), audit log, chat.
- **`api/strategy`** computes finance sign-correctly — the best candidate to become the real executive view (once the hardcoded R&D line is removed).

## What's fake or dead (archive / hide so it stops lying)
`/company` (rebuild, don't patch) · `/goals` (mock) · `business/balance-sheet` + `business/revenue-model` (placeholders) · `/compliance` (dead `compliance_items`) · `/pipeline` (frozen `relationship_pipeline`) · `business-dev` + `development/contacts` (dead `business_initiatives`/`repo_contacts`) · `api/debt` (4 dead tables → 500) · agent **autonomy / learning / procedures** dashboards (dead `agent_*`) · `notion-agent/trials` · ecosystem **deploy/uptime** panels (dead `deployments`/`health_checks`) · `dream-journal` (empty) · `subscriptions/alerts` (dead view) · `admin/sync-health` + `receipts/achievements`/`pdf-preview` (Vercel-only, not-wired).

---

## Remediation plan (phased) — proposed, awaiting approval

### P0 — Stop lying on the front page (≈1 day, no schema work)
1. **Create `lib/finance/ledger.ts`** — ONE income/expense/cash/runway/R&D extractor, lifted from `api/finance/projects/[code]`'s `realExpenseRows` (type-based, deduped ACCPAY bills, exclude `%-TRANSFER`, two-account rule). Export typed functions.
2. **Rebuild `api/intelligence` (`/company`)** on it + fix the dead columns (`project_health.overall_score`, `opportunities_unified.value_mid/stage/probability/project_codes`), point Relationships→`ghl_contacts`/`relationship_health` and Emails→`communications_history`, real cash from `xero_bank_accounts`, filter `calendar_events`.
3. **Kill the hardcoded R&D deadline** in `/company` AND `api/strategy` — drive from the FY25-26 Path-C facts (lodge Jul 2026–30 Apr 2027).
4. **"No silent zero" rule** — a broken/empty pipe renders "— needs wiring", never "0".

### P1 — One money truth everywhere (≈1–2 days)
Migrate every finance route onto `lib/finance/ledger.ts` (the ~9 engines → 1). Fix the live sign-bug routes (`rd-tracking`, `projects` list, `accountant-pack`, `tagger-queue`). Correct the legal entity + ABN in `accountant-pack` and `tax`. Fix `/harvest` to include ACCPAY bills.

### P2 — Re-light or retire the dead pipelines (≈1 day + cron checks)
Restart `bank_statement_lines` sync (or mark the 6 dependent surfaces "stale since X"). Decide: recompute `relationship_health` on a cron, or retire it and let views compute live. Retire `relationship_pipeline`/`fundraising_pipeline` in favour of `opportunities_unified`. Confirm `SUPABASE_SHARED_URL` is set in Vercel (settles the 8 ⚠️ storyteller routes).

### P3 — Make it honest by construction (≈1 day)
- **Schema contract test** in CI: parse `.from('…')` + selected columns, assert each exists in the live schema. Would have caught every 🔴 here. (The diff query in this audit is the seed.)
- **Archive the fakes** (above) per the `git mv` archive convention, with a `RESTORE.md`.
- **Prune the nav** to the surfaces that survive — the "clarity spine."

### The clarity spine (the end state)
A command center where **every visible number is true or visibly marked "not wired"**: `/company` (real exec view on the one ledger) · `/finance` operate spine · `/finance/projects` P&L · `/supporters` + `/people` · `/knowledge`. Everything else either feeds these or gets archived.

---
*Per-surface detail (every page + route, with verdict and fix) is in the five section files linked at top.*
