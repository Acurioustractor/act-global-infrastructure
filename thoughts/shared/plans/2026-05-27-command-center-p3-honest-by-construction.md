# Plan: Command Center P3 — Honest by Construction

> Slug: `command-center-p3-honest-by-construction`
> Created: 2026-05-27
> Status: in-progress
> Owner: Ben + Claude

## Objective

Close the last open phase of the 2026-05-26 command-center trust-map remediation: make the
dashboard **honest by construction** so it can never silently drift away from the schema again.
P0–P2 (one money ledger, rebuilt `/company`, row-cap sweep, entity dimension + bank-balance
re-light) and the P3 compliance-calendar re-light already shipped (PR #88–#93, merged to main).
What remains is the trust-map's own **"P3 — honest by construction"** trio:

1. **Schema-contract test** (highest leverage — locked-in gain). A check that fails when any
   command-center query references a table/column that doesn't exist in the live schema. Would have
   caught every 🔴 in the audit. **This is the tool that drives steps 2–3.**
2. **Archive the fakes** — `git mv` the dead-table pages flagged by the audit + the checker
   (`/goals`, `/compliance`, `/pipeline`, `business-dev`, agent `autonomy/learning/procedures`,
   `api/debt`, etc.) per the archive convention, with a `RESTORE.md`.
3. **Prune the nav** to the "clarity spine" — only surfaces that survive.

Why it matters: the audit found ~1 in 4 referenced tables no longer exists, each becoming a silent
zero that *looks* like real data. Nothing binds the API to the schema — no types, no contract test.
This phase installs that binding.

## Approach — the checker (step 1, building first)

A standalone Node script (no Next compile — reads `.ts` as text) following repo test conventions
(`scripts/tests/*.test.mjs`, `node --test`, `exec_sql` RPC for live schema):

- **Scan** `apps/command-center/src/app/api/**/route.ts` + `apps/command-center/src/lib/**/*.ts`
  for `.from('<table>')` and the chained `.select('<columns>')`.
- **Extract** table names + bare column references. Handle: same-line + multi-line `.select`,
  `select('*')` (table-only check), `alias:real_col`, `col::cast`, `metadata->>'k'` (→ `metadata`),
  `count/head` form. **Skip** (report as "unverifiable", don't fail): dynamic `.from(variable)`,
  PostgREST embedded resources `rel(...)`.
- **Ground truth**: `SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema='public'` via `exec_sql` on the shared DB `tednluwflfhxyucgwigh`.
  Build `{table: Set(columns)}` (includes `v_*` views).
- **Allowlist** (`config/schema-contract-allowlist.json`): cross-instance tables (EL v2 storyteller
  set, media), files using a non-shared `createClient`, and any deliberately-dynamic `.from()`.
  Seeded from `_schema-truth.md`'s multi-instance caveat.
- **Output**: violation report grouped DEAD-TABLE / DEAD-COLUMN / SKIPPED, with `file:line`.
- **Test wrapper** asserts zero DEAD-TABLE + DEAD-COLUMN (excluding allowlist). **Expected to FAIL
  on first run** — the failure list is the authoritative driver for steps 2–3.
- **No silent pass**: if neither live DB creds nor a committed schema snapshot are available, the
  test ERRORS (honest by construction applies to the test itself).

Files (all new — no entanglement with the 143 pre-existing dirty working-tree files):
- `scripts/lib/schema-contract.mjs` — scanner + schema fetch + diff (reusable)
- `scripts/check-schema-contract.mjs` — CLI runner (human-readable report; `--snapshot` to refresh)
- `scripts/tests/schema-contract.test.mjs` — `node --test` wrapper
- `config/schema-contract-allowlist.json` — cross-instance / dynamic exceptions
- `config/schema-snapshot.json` — committed schema fallback for CI (refreshed via `--snapshot`)
- `.github/workflows/schema-contract.yml` — PR gate (wired blocking only after report is green)

## Task Ledger

- [x] 1a. Build `schema-contract.mjs` scanner + schema fetch + diff
- [x] 1b. CLI runner + first live run → triage report
- [x] 1c. Client-aware parsing (EL-alias) instead of table allowlist; commit schema snapshot
- [x] 1d. `node --test` wrapper (15/15 green) + baseline ratchet (87 accepted)
- [x] 1e. Wire CI workflow `.github/workflows/schema-contract.yml`
- [~] 2.  Archive dead-table fakes — **DONE for the 14 truly-dead routes + team page** (baseline 70→47, RESTORE.md written); the other §H Cat-1 routes turned out to be **live pages reading dead tables** → reclassified to fix-don't-archive (Cat-3), NOT archived
- [~] 3.  Fix residual column-drift — select-drift DONE (87→64); **filter-drift: 18 fixed, 9 baselined needs-intent**; remaining needs-intent batch in §H awaits product calls (subscriptions $ total, agent_audit_log wrong-table, contact_id value-tracing)
- [ ] 4.  Prune nav to clarity spine
- [x] 5.  Extend checker to validate filter columns (.eq/.gte/.is/.order etc.) — DONE: fluent-chain-scoped extraction + `fluentChainAfter` (kills false positives), 5 new tests (20/20)

Burn-down checklist: `thoughts/shared/reviews/command-center-trust-map/H-schema-contract-burndown.md`

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-05-27 | Branch from current HEAD (merged `wip/harvest…`), commit only new files | All 6 "behind" commits are merge commits of this same branch; PR diff vs main = my new files only. Avoids entangling 143 pre-existing dirty files. | yes |
| 2026-05-27 | Checker reads `.ts` as text (regex), not AST | No Next compile / TS toolchain needed in CI; supabase-js already a dep | yes |
| 2026-05-27 | Test errors (not skips) when no schema source available | "No silent zero" rule applied to the test itself | yes |
| 2026-05-27 | Build checker first; it drives archiving/fixes | Test produces the authoritative violation list; supersedes manual audit list | yes |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| Working tree has all P0–P3 finance code | yes | `ledger.ts`/`entities.ts` present; 6 "behind" commits are merge commits of this branch | 2026-05-27 |
| Repo test convention = `node --test scripts/tests/*.test.mjs` | yes | root `package.json` `test` script | 2026-05-27 |
| Live schema via `rpc('exec_sql', {query})` + `SUPABASE_SHARED_SERVICE_ROLE_KEY` | yes | `scripts/check-tax-types.mjs` | 2026-05-27 |

## Changelog

### 2026-05-27 — Schema-contract test SHIPPED (step 1 complete)
**Objective:** Build the schema-contract checker — highest-leverage P3 item.
**Changed:** 6 new files — `scripts/lib/schema-contract.mjs` (client-aware scanner + live-schema diff +
baseline ratchet), `scripts/check-schema-contract.mjs` (CLI: check/`--snapshot`/`--baseline`/`--json`),
`scripts/tests/schema-contract.test.mjs` (15 tests), `config/{schema-snapshot,schema-contract-allowlist,
schema-contract-baseline}.json`, `.github/workflows/schema-contract.yml`, +3 `package.json` scripts.
**Verified:** live run = 780 tables; **87 baselined violations (100 refs)**; 15/15 tests green; snapshot
fallback works; no-source path throws (no silent pass). Found a NEW regression the audit missed —
`/harvest` selects non-existent `xero_transactions.description/account_code/account_name`.
**Learned:** (a) `exec_sql` IS subject to the PostgREST ~1000-row cap → aggregate schema with `array_agg`.
(b) storyteller routes alias `elSupabase as supabase` → must resolve client→instance per file, not a
table allowlist (eliminated 30 false positives structurally).
**Next:** burn-down §H — Tier 2 archiving of dead-table routes (confirm with Ben) + Cat-3 column fixes.

### 2026-05-27 — Column burn-down, two passes (87→64)
**Objective:** "Fix columns first" (Ben's call). Tractable column drift only.
**Changed:** commit `86ef6be` (pass 1, 87→72): live `/harvest` regression (verified vs DB — old select
400'd → overview showed $0; now reads `line_items[]`, returns 58 rows / $51,573 spend / 10 GL accounts)
+ 13 clean renames via PostgREST aliases. commit `568b277` (pass 2, 72→64): 8 more renames
(pipeline_stage→stage_name, vendor_name→contact_name, description/account_code→line_items[],
received_at/ai_summary→occurred_at/summary) + a filter-column fix (responded_at→response_received_at).
**Verified:** harvest query runs (was 400ing); no NEW drift after each pass; type-checks clean; only my
files staged (3 pre-existing dirty `page.tsx` + 143 wiki files left untouched).
**Learned:** the checker has a blind spot — it validates `.select()` columns but NOT filter/order
columns (`.eq/.gte/.is/.order`), so `responded_at` and `notion-agent`'s `.ilike('tags')` slipped past.
Added as task 5.
**Next:** needs-intent column batch (contact_project_links join, subscriptions name/value_rating,
project_budgets aggregation, ghl_opportunities close_date/contact joins, api_usage rewrite,
receipt_matches.project_code, business/overview running_balance) — each needs a product decision.
Then Tier-2 archiving (task 2). 3 commits local, unpushed.

### 2026-05-27 — Filter-column coverage (task 5) + filter-drift burn-down
**Objective:** Close the checker's documented blind spot — it validated `.select()` columns but ignored
filter/order args, so `.is('responded_at', …)` and `.ilike('tags', …)` drift slipped past.
**Changed (checker):** `scripts/lib/schema-contract.mjs` — added `FILTER_RE` (the column-positional
PostgREST methods, quoted-literal first arg only → excludes `Array.filter(cb)`/`String.match`), a new
exported `fluentChainAfter()` walker that scopes filter extraction to the query's own fluent chain
(string/paren aware), `ref.filterColumns`, and `diff()` now validates filter columns regardless of
select form. `scripts/tests/schema-contract.test.mjs` — 5 new tests (filter extraction, star+filter,
**chunk-bleed false-positive regression**, two `fluentChainAfter` units); 20/20 green.
**Changed (fixes, 7 files):** 18 latent silent-zero filter drifts fixed — `project_knowledge.type →
knowledge_type` ×11 (reports), `has_attachment → has_attachments`, `xero_id → xero_transaction_id`
(xero_transactions only), `responded_at → response_received_at`, `communication_date → occurred_at`
(+ broken `.or(contact_id)` → `contact_email`), `grant_opportunities.discovered_at → created_at` ×2,
`ghl_opportunities .ilike('tags') → .eq('project_code')`.
**Verified:** live DB — knowledge counts 146/258/83 (were 0), receipt-matched spends 1304, ACT-HV opps
5 rows; `npx tsc --noEmit` clean; 20/20 tests; checker reports no NEW drift on baseline 72.
**Learned:** chunk-based filter attribution false-positives the moment a route reassigns a builder
variable (`query = query.eq(…)`) or interleaves an inline sub-query — fluent-chain scoping is mandatory,
not optional, for filter columns (select columns mostly escaped it because `.select()` hugs `.from()`).
**Decision:** baseline (not fix) the 9 needs-intent filter drifts — `subscriptions.status` feeds a $ total
(`account_status` 6 vs `review_status` 68 — Ben to confirm), `agent_audit_log.status` reads the wrong
table (no `status` col — likely dead feature), `*.contact_id` needs the passed value traced not just the
column renamed. Documented in §H. **Baseline 64 → 72** (coverage went up; burn-down list grew honestly).
**Next:** product calls on the 9 needs-intent drifts; then task 2 (Tier-2 archive of dead-table routes)
+ task 4 (nav prune). Commits local on `wip/harvest-stage-budget-2026-05-26`, unpushed.

### 2026-05-27 — Archive dead-table routes (task 2), baseline 70 → 47
**Objective:** Archive the dead-table fake routes (trust-map §H Cat-1) — Tier 2, Ben confirmed full
safe sweep + Stripe unwired.
**Changed:** `git mv` 13 dead API routes + the orphan `team/page.tsx` →
`app/_archived/2026-05-27-dead-table-routes/` (+ RESTORE.md). Next.js ignores `_archived/`
(underscore segment) and so does the scanner (`SKIP_DIRS`) → 23 dead-table violations drop out.
Routes: agent/{autonomy,learning,procedures}, assets, business-dev, compliance, debt,
notion-agent/trials, pipeline/unified, receipts/achievements, subscriptions/alerts, team, webhooks/stripe.
**Verified:** `.next` cleared (stale route-type stubs) → `npx tsc --noEmit` exit 0; checker baseline
70 → 47; no NEW drift.
**Learned (the load-bearing finding):** the §H Cat-1 archive list was **too aggressive** — tracing
`lib/api.ts` helper → page consumption showed **most "dead-table" routes are fetched by LIVE pages**
(intelligence, finance/board, development, ecosystem, knowledge, today, finance/accountant). They render
empty sections; archiving the route would turn empty → a 404 *error*. Naive bulk-archiving would have
broken 7+ live pages. Those were left in place + reclassified to fix-don't-archive. Only routes with
**zero live-page consumers** were archived.
**Deferred (documented in RESTORE.md):** `agent/page.tsx` still fetches its 3 now-archived routes (404;
sections already broken, page not in nav — panel removal is risky surgery on an 830-line file); 7 dead
`lib/api.ts` fetch-wrapper helpers (invisible to the schema checker, zero callers) left as dead code.
**Next:** the 47 remaining baselined violations are now mostly **fix-don't-archive** (live routes,
dead column/table refs needing a rename or a join) + the needs-intent batch. Task 4 (nav prune) +
task 3 residual. Commits local on `wip/harvest-stage-budget-2026-05-26`, unpushed.

---

## Provenance

- **Data sources queried:** git log/status, `apps/command-center/src/app/api/**`, `_schema-truth.md`, root `package.json`, `scripts/check-tax-types.mjs`, `scripts/tests/finance-integration.test.mjs`
- **Date range:** trust-map audit 2026-05-26; this plan 2026-05-27
- **Unverified assumptions:** CI has `SUPABASE_SHARED_SERVICE_ROLE_KEY` secret (to confirm against existing workflows before wiring step 1e)
- **Generated by:** hybrid (Ben directed sequence; Claude built)
