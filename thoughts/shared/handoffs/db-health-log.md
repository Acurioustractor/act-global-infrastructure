# Supabase shared-DB — weekly health log
Append one dated entry per week. Template at the bottom.

Runbook: `thoughts/shared/handoffs/supabase-health-2026-04-29/weekly-runbook.md`

---

## 2026-04-29 (founding session — baseline)
- **Smoke test:** 6/6 (homepage, architecture, power-concentration, /api/data/health, /api/data/power-index, /api/ops/health 401)
- **DB size:** 21 GB
- **Tables / indexes / policies / matviews:** 604 / 2,493 / 502 / 81
- **Public functions:** 335
- **Connections:** 2 active / 25 idle / 0 idle-in-tx
- **Worst dead_pct:** 0% across all heavy tables (just vacuumed)
- **WAL archiving:** healthy (100s lag, 0.03% fail rate, 20,145 WALs shipped)
- **Top query share:** PostgREST `set_config` 29.3% (normal)
- **Advisor PERF:** 1,830 (baseline)
- **Advisor SEC:** 673 (baseline)
- **Civicscope counts:**
  - gs_entities: 591,819
  - grant_opportunities: 32,059
  - foundations: 10,918
  - asic_companies: 2,167,341
  - austender_contracts: 798,586
- **RLS audit:** all 8 sensitive tables show `rls_on=true`
- **Notes:** Founding session. PITR turned on for 7-day window. 13 migrations applied — all reversible.

---

## 2026-04-30 (Week 0.1 — confirmation snapshot, day after migrations)
- **Smoke test:** 6/6 (homepage 1127ms, architecture 1143ms, power-concentration 787ms, /api/data/health 1599ms, power-index 785ms, ops/health 401 288ms)
- **DB size:** 21 GB (no change)
- **Tables / indexes / policies / matviews:** 604 / 2,493 / 502 / 81 (no change)
- **Connections:** 1 active / 33 idle / 0 idle-in-tx ✅
- **Worst dead_pct:** 3.5% on grant_opportunities (well under 30% threshold)
- **Autovacuum-behind:** 10 entries flagged but all dead/live ratios <5% (e.g. person_roles 14k/340k = 4.3%, abr_registry 11k/20M = 0.06%) — noise, not concerning
- **WAL archiving:** 84 secs since last; fail rate 0.0288% ✅
- **Top query share:** PostgREST `set_config` 29.0% (normal); REFRESH MATERIALIZED VIEW operations from cleanup session show up in 2nd–9th place
- **Advisor PERF:** 1,794 (Δ −36 vs baseline)
- **Advisor SEC:** 592 (Δ −81 vs baseline)
- **ERROR-level changes:** 0 new — `sensitive_columns_exposed`, `policy_exists_rls_disabled`, `extension_in_public` all confirmed closed
- **Civicscope counts:** gs_entities 591,821 (+2); grants 32,059; foundations 10,918; asic_companies 2,167,341; austender 798,586; donations 437,399; acnc_charities 64,988 — all stable or growing ✅
- **RLS audit:** all 8 sensitive tables `rls_on=true` ✅
- **Notes:** Same-day confirmation run. `scripts/db-health.mjs` couldn't connect via pooler (JWT in env not the DB password) — ran probes via Supabase MCP `execute_sql` instead. Lint counts dropped further (likely matview revoke from anon/authenticated clearing some derived findings). No regressions. Healthy.

---

## Template (copy this for next week)

```markdown
## YYYY-MM-DD
- Smoke test: X/6
- DB size: NN GB; tables NNN; indexes NNNN
- Connections: N active / NN idle / 0 idle-in-tx
- Worst dead_pct: X% on <table>
- WAL archiving: NN secs since last
- Top query share: <pattern> X% (normal/unusual)
- Advisor: perf NNNN (Δ) / sec NNN (Δ)
- Civicscope counts: gs_entities NNN; grants NN; foundations NN
- Notes: <anything unusual or none>
```

---

## PITR turn-off — readiness checklist

Track when each criterion is met. Earliest turn-off date: **2026-05-13** (2 weeks post-session).

- [ ] 2 consecutive weekly checks with no regressions (target: 2026-05-13)
- [ ] No civicscope smoke-test failure in 14 days
- [ ] No new ERROR-level advisor findings vs 2026-04-29 baseline
- [ ] Substantive use confirmed on each site:
  - [ ] Grantscope search/report run
  - [ ] JusticeHub page rendered
  - [ ] act.place visited
  - [ ] command-center finance reconciliation run
  - [ ] Xero sync executed
  - [ ] Goods photo upload tested
- [ ] `pg_dump` cold-storage snapshot taken
- [ ] **PITR disabled — date: ____**
