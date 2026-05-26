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
- [ ] 2.  Archive dead-table fakes (git mv + RESTORE.md) — burn-down §H — **Tier 2, confirm**
- [ ] 3.  Fix residual column-drift in routes we KEEP — burn-down §H Cat 3
- [ ] 4.  Prune nav to clarity spine

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

---

## Provenance

- **Data sources queried:** git log/status, `apps/command-center/src/app/api/**`, `_schema-truth.md`, root `package.json`, `scripts/check-tax-types.mjs`, `scripts/tests/finance-integration.test.mjs`
- **Date range:** trust-map audit 2026-05-26; this plan 2026-05-27
- **Unverified assumptions:** CI has `SUPABASE_SHARED_SERVICE_ROLE_KEY` secret (to confirm against existing workflows before wiring step 1e)
- **Generated by:** hybrid (Ben directed sequence; Claude built)
