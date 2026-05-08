---
title: Supabase shared-DB schema reorganisation
status: Draft (needs sign-off)
date: 2026-04-30
parent_plan: thoughts/shared/plans/supabase-health-2026-04-29.md
db: tednluwflfhxyucgwigh
---

# Supabase shared-DB schema reorganisation

> **No execution.** This is a design doc that needs explicit sign-off (Ben + a JusticeHub-side sanity check) before any DDL runs. PITR is on for the safety window — even with that, schema renames cascade through application code and external scripts.

## Why do this at all

Today, all 604 public tables sit in `public.*` regardless of which app owns them. Reading `pg_tables` is a wall of names; a new contributor can't tell whether `gs_relationships` is grantscope-only or shared. Civicscope-protect rules are written prose ("never touch tables matching `gs_*`, `acnc_*`, ...") rather than enforced by Postgres. One typo in a migration during a future cleanup wipes a civicgraph table that turns out to power 800 grantscope queries.

The proposed reorg replaces the prose rule with a schema boundary:

```
civicscope.*    grantscope-only data + matviews + RPCs
justicehub.*    JusticeHub-only data
public.*        shared / multi-owner / ACT-side
```

Wins:
- Civicscope-protect becomes `GRANT USAGE` posture, not "remember the prose."
- Future cleanup migrations can confidently drop unused indexes in `public.*` without fear of touching civicscope.
- Schema-level access control (e.g. revoke `civicscope` from anon if grantscope migrates to its own auth).
- `\dt civicscope.*` answers "which tables are grantscope-only" in one line.

Trade-offs:
- Every grantscope query that says `FROM gs_entities` becomes `FROM civicscope.gs_entities`.
- Function bodies, RPCs, and matview definitions that reference unqualified table names need updating or a `SET search_path` per function.
- External scripts (cron, deploy hooks, agent prompts that contain SQL) need a sweep.
- Risk of a forgotten reference breaking silently.

This is **not** a perf cleanup. It's an architecture cleanup. The size of the win is proportional to how many people will touch this DB over the next 12 months.

---

## Proposed schemas

### `civicscope` schema (22+ tables, 14+ matviews, 4 RPCs)

| Tables | |
|---|---|
| Single-owner tables (table-consumers.md) | `abr_registry`, `asic_companies`, `asic_name_lookup`, `entity_xref`, `nz_charities`, `nz_gets_contracts`, `ndis_registered_providers`, `ndis_utilisation`, `dss_payment_demographics`, `ato_tax_transparency`, `research_grants`, `acnc_programs`, `procurement_alerts`, `mv_*` (single-owner ones) |
| Multi-owner tables that grantscope is the *primary* consumer of | `gs_entities`, `gs_relationships`, `gs_entity_aliases`, `grant_opportunities`, `foundations`, `acnc_charities`, `acnc_ais`, `austender_contracts`, `state_tenders`, `political_donations`, `justice_funding`, `crime_stats_lga`, `ndis_participants` |
| Matviews | `mv_entity_power_index`, `mv_person_influence`, `mv_person_entity_crosswalk`, `mv_person_entity_network`, `mv_trustee_grantee_chain`, `mv_donation_contract_timing`, `mv_charity_network`, `mv_charity_rankings`, `mv_board_interlocks`, `mv_funding_outcomes_summary`, `mv_donor_contract_crossref`, `mv_revolving_door`, `mv_gs_donor_contractors`, plus the `mv_funding_*` set |
| RPCs | `search_entities_semantic`, `search_grants_semantic`, `search_foundations_semantic`, `match_grants_for_org` |

### `justicehub` schema (2 single-owner tables + JH-primary multi-owner)

| `civic_intelligence_chunks` | `campaign_alignment_entities` |

### `public` schema (everything else)

ACT command-center, EL v2, website, photo manager, finance, agents, wiki, etc. The default — no rename.

---

## Cross-schema references — where this gets hard

The 20 multi-owner tables (`person_roles`, `services`, `notion_projects`, `opportunities_unified`, `media_items`, `wiki_pages`, `knowledge_chunks`, `person_identity_map`, etc.) are not safe to move into either schema. They're queried by both ACT-side AND civicscope/JH paths.

**Two viable approaches:**

### Approach 1: Views in target schema, base in `public`

```sql
-- person_roles stays in public
CREATE VIEW civicscope.person_roles AS SELECT * FROM public.person_roles;
GRANT SELECT ON civicscope.person_roles TO anon, authenticated, service_role;
```

**Pros:** Backward-compatible, base table doesn't move, RLS still applied via view.
**Cons:** Each schema has its own view, the prose-rule problem doesn't fully go away.

### Approach 2: Move to target schema, keep public alias

```sql
ALTER TABLE public.gs_entities SET SCHEMA civicscope;
CREATE VIEW public.gs_entities AS SELECT * FROM civicscope.gs_entities;  -- backward compat
```

**Pros:** Full architectural fidelity. Future migrations naturally land in the right schema.
**Cons:** RLS rules attached to `public.gs_entities` need replacing on the view OR moving to the underlying table. RPC bodies need updating. Two paths into the same data — easy to drift.

**Recommended approach:** Hybrid. Move single-owner tables (Approach 2 without backward-compat views, since by definition no other consumer exists). Keep multi-owner tables in `public` and don't add cross-schema views — let ACT-side queries continue to use `public.<table>` and let civicscope-side queries continue to use `public.<table>`. The schema rename only happens for tables that **are** civicscope-only.

This means the `civicscope` schema becomes a clear "this is grantscope's house" boundary without breaking anything for shared tables.

---

## Migration order

Phase order matters because dependent objects (matviews, RPCs, FK constraints) break if a table moves before they update.

### Phase 0 — Pre-flight (no DDL)

- Re-run `table-consumers.md` audit to confirm single-owner status hasn't changed.
- Inventory every grantscope code reference (`grep -rh "from('<table>')\|FROM <table>" /Users/benknight/Code/grantscope/`).
- Inventory every JH code reference.
- Inventory every cross-repo script reference (cron, deploy hooks).
- Output: `phase-0-references.md` — every place each candidate table is named.

### Phase 1 — Create empty schemas

```sql
CREATE SCHEMA IF NOT EXISTS civicscope;
CREATE SCHEMA IF NOT EXISTS justicehub;
GRANT USAGE ON SCHEMA civicscope TO authenticated, anon, service_role;
GRANT USAGE ON SCHEMA justicehub TO authenticated, anon, service_role;
```

No data movement. Reversible via `DROP SCHEMA IF EXISTS civicscope CASCADE` (which would only drop the schema, not any tables — they're still in public).

### Phase 2 — Move single-owner tables

For each table, in dependency order (referenced-by → referencing):

```sql
ALTER TABLE public.<table> SET SCHEMA civicscope;
```

**Order matters when there are FK relationships.** Moving a parent table first leaves dangling FKs in children that haven't moved yet — Postgres will error. Resolve by:
- Listing FKs first via `pg_catalog`.
- Moving leaf tables before parents.
- Or: moving all tables in one transaction.

Recommended: **single transaction**, all civicscope-single-owner tables in one `ALTER TABLE ... SET SCHEMA` block. Postgres handles dependency reordering internally.

### Phase 3 — Update matview definitions

Matviews don't follow the table when the source table changes schema. Each matview that references a moved table needs:

```sql
DROP MATERIALIZED VIEW IF EXISTS public.<mv_name>;
CREATE MATERIALIZED VIEW civicscope.<mv_name> AS <body referencing civicscope.<source>>;
REFRESH MATERIALIZED VIEW civicscope.<mv_name>;
```

15+ civicscope matviews need this. ddl-rollback.sql Part C has the bodies as of 2026-04-29 — start there.

### Phase 4 — Update RPC function bodies

Each of the 4 civicscope RPCs (`search_entities_semantic`, `search_grants_semantic`, `search_foundations_semantic`, `match_grants_for_org`) needs:

```sql
CREATE OR REPLACE FUNCTION civicscope.<name>(...) RETURNS ... AS $$ ... $$ LANGUAGE sql STABLE
SET search_path = 'civicscope, extensions, pg_catalog';
```

The `SET search_path` removes ambiguity — function body can use unqualified names that resolve to civicscope first.

### Phase 5 — Update grantscope app + scripts

Outside this DB:

- `/Users/benknight/Code/grantscope/`: every `from('<table>')` becomes `schema('civicscope').from('<table>')` OR set the schema at client-creation time.
- All ACT scripts that read civicscope tables (e.g. anything in `scripts/lib/civicscope-*.mjs`) need the same.
- Vercel envs: confirm grantscope's Supabase URL is unchanged but client config needs schema awareness.

### Phase 6 — Verify + rollback window

- Civicscope smoke test passes.
- `civicgraph.app` loads and key dashboards render.
- All 4 RPCs return rows for known inputs.
- Wait 14 days before next phase. PITR window is the safety net.

### Phase 7 (optional, later) — `justicehub` schema

Two tables, lower priority. Same recipe at smaller scale.

---

## What can go wrong

1. **Forgotten reference in production code.** A scheduled grantscope cron job hits `public.gs_entities` 6 hours after the move and 500s. Mitigation: phase 0 inventory + dry-run the cron list.
2. **Stored procedure body references unqualified `gs_entities`.** Phase 4 SET search_path mitigates if applied to all civicscope functions.
3. **RLS policy on a moved table fails to migrate.** Postgres preserves policies on `ALTER TABLE SET SCHEMA`. Verify per-table after move.
4. **Matview rebuild takes too long.** `mv_donor_contract_crossref` last took 5 min to rebuild. Schedule during low-traffic.
5. **Embedding indexes** (4 of them, 3.2 GB total). They follow the table on `SET SCHEMA`. Should not need rebuild — but verify with `\d civicscope.gs_entities` post-move.
6. **External link from `civicgraph.app` (Vercel) breaks.** This site reads via service_role from grantscope. Check the env config there.
7. **A "civicscope-only" table turns out to be multi-owner.** This is the biggest risk. Phase 0 must include `grep -r "from('table')"` across **every** repo Ben works in, not just grantscope.

---

## Estimated effort

- Phase 0: 4-6 hours (inventory across repos)
- Phases 1–4: 2-3 hours of DDL work + smoke testing (one session)
- Phase 5: 4-6 hours of grantscope code updates + testing
- Phase 6: 14-day soak window (passive, no work)
- Phase 7: 1 hour of DDL

**Total active work: ~15 hours, spread across 4-6 sessions, with 2-week soak in middle.**

---

## Decision needed before any execution

1. **Approach 2 (move + no backward-compat view) for single-owner tables** — yes/no?
2. **Skip multi-owner tables entirely** (no cross-schema views) — yes/no?
3. **Phase 0 inventory in this session, or scheduled separately?**
4. **Who reviews the JusticeHub side** — Ben to confirm `civic_intelligence_chunks` and `campaign_alignment_entities` are JH-only?
5. **Soak window length** — 14 days as proposed, or longer given how invasive this is?

---

## Open questions for Ben

- Does grantscope have its own deploy pipeline that would need a coordinated cutover, or is it strictly read-from-shared-DB-via-service_role?
- Are there any ACT-side scripts that use `gs_entities` outside the explicit civicscope codebase? (Some reconciliation scripts might join through abr_registry — those need flagging.)
- Is JusticeHub's 2-table footprint going to grow soon (e.g. is `campaign_*` family expanding)? If yes, define the schema now even though it's small.

---

## Backlinks

- Parent: [supabase-health-2026-04-29 plan](supabase-health-2026-04-29.md)
- Triage: [batch-bc-triage](../handoffs/supabase-health-2026-04-29/batch-bc-triage.md)
- Consumer map: [table-consumers](../handoffs/supabase-health-2026-04-29/table-consumers.md)
- Runbook: [weekly-runbook](../handoffs/supabase-health-2026-04-29/weekly-runbook.md)
