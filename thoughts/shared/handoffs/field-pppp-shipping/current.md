---
date: 2026-06-07T04:15:47Z
session_name: field-pppp-shipping
branch: main
status: complete
---

# Work Stream: field-pppp-shipping

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-07T08:10:00Z
**Goal:** Grant-chain revival DONE → DB incident survived + fully remediated (canary-verified collation refresh, 63 hot indexes rebuilt, person_roles covering index live). Funding-lanes build (tasks 1–4) parked mid-flight.
**Branch:** main (~4 commits ahead of origin: maintenance script v3+v4 + doc fixes — "push" pending)
**Test:** `node --experimental-transform-types scripts/discover-grants.mjs --dry-run` (expect ~150 unique, 0 errors)

### Now
[->] RESUME POINT: four-lane funding tasks, parked on the incident, DB now healthy:
  1. **Orchestrator revival** (procurement_alerts dead since 14 Mar) — ROOT CAUSE FOUND: grantscope's `orchestrator` (scripts/agent-orchestrator.mjs, its ONLY PM2 entry) was never `pm2 save`d → dropped on first restart ~14 Mar; contract-alert-checker is registered in its agent-registry but nothing executes it. Data fresh (austender 807k rows to 6 Jun, state_tenders 200k). REVIVAL NEEDS BEN'S CALL: starting it triggers a 3-month agent backlog burst + procurement_notification_outbox sends to assess first. ⚠ another session works in grantscope — touch only the orchestrator.
  2. **Foundation shortlist ranker** — view over foundations(11,042) × foundation_relationship_signals(47 act_* derived, applied) × power profiles × Field warmth → weekly top-10.
  3. **IPP/MMR standing query** — austender_contracts.is_mmr_applicable + furniture/community categories → Goods-biddable tenders via Butterfly/Oonchiumpa JV.
  4. **Corporate double-door lens** — orgs in austender as buyers AND foundations as grant-makers; v_act_procurement_buyers (226) exists.

### Mon 8 Jun morning (all verified ready)
6:00 discovery live-inserts ~150 grants (watchdog-guarded, scorer on fallback router) · 7:00 enrich on MiniMax · 7:32 pr-ci-sweep routine first fire (expect "no open PRs") · 7:45 PPPP scan (momentum feeds) · ritual with Nic: Place-vs-Pulse + gone-quiet projects + Kristy GHL-UI merge + James Davidson ring call.

### This Session (2026-06-07 evening — DB incident + remediation)
- [x] INCIDENT: shared DB wedged 16:24–17:22 (pool exhaustion → instance freeze). Causes: my pm2-restart fired discover-grants live (4h hang — scorer retry-storm on dead Anthropic key) + parallel ad-hoc probes + person_roles seq-scan loop (count=exact, no index) + uncached site polling (limit=5000 + justice_matrix bursts). Ben restarted via dashboard 17:22.
- [x] Incident fixes committed: grant-scorer → fallback router · discover-grants 30-min watchdog · memory `pm2-oneshot-restart-trap` (pm2 restart on a cron one-shot = LIVE RUN; use stop)
- [x] MAINTENANCE RUN (Ben-authorized, completed ~18:00): collation 153.120→153.121 mismatch remediated via v4 canary design (amcheck NOT in Supabase's catalogue at all — index-scan-order vs forced-sort-order on 7 unique text columns, all `ok` = order unchanged) → 63 hot-table text indexes rebuilt CONCURRENTLY → REFRESH applied (datcollversion=153.121, warning gone) → `idx_person_roles_company_active` covering partial index live, planner picks Index Only Scan → zero invalid-index debris.
- [x] Script v1→v4 lessons (all committed): halt-before-fix chicken-egg · refresh-after-partial-rebuild hole · missing statement_timeout=0 · **checker-failure ≠ subject-failure** (missing amcheck marked all 1,191 indexes FAILED → near-miss full-DB reindex, killed clean) · circuit breaker >50 = systemic.
- [x] Load-reduction list given to Ben (ranked): person_roles index ✅ done · uncached site polling (justice_matrix/limit=5000 → ISR or JSON snapshot) ⬜ · vector-syntax + mv_gs_entity_stats.counterparty_count retry-churn bugs ⬜ · pm2_cron_status heartbeat frequency ⬜ · compute tier review (max_connections=90) ⬜. Ben "ran a few ideas" — WHAT HE CHANGED NOT YET CAPTURED, ask next session.

### Prior (2026-06-07 PM2 — grant-chain revival, "fix and build all")
- [x] FY26 P&L report + provenance sidecar shipped (`thoughts/shared/reports/fy26-pnl-to-date-2026-06-07.md`): rev $1.91M / exp $1.09M / net +$815K; pushed
- [x] ROOT CAUSE: fae6ac5 (27 Apr) archived grant-engine as "zero consumers" but discover-grants imports it relatively — every 6am fire since crashed. Restored + .ts specifiers + --experimental-transform-types in PM2 entry
- [x] THREE dead API keys found: Anthropic (no credit) · Firecrawl (no credit) · retired model defaults inside the archived package. Fixes: grantconnect RSS via native fetch + browser UA (the "403" was UA-filtering — free, 128 grants) · llm-knowledge → MiniMax M3 Anthropic-compat endpoint (key existed; honest []) · NEW gemini-search plugin (grounded googleSearch on funded GEMINI key, 503-retry + flash-lite fallback + salvage parser, ~34 grants) · enrich → trackedAgentCompletionWithFallback (MiniMax-first; smoke-tested "OK")
- [x] web-search (Anthropic server tool) out of default sources, kept for --sources; Anthropic top-up now OPTIONAL
- [x] foundation ACT-signals builder applied on Ben's word: 47 derived signals (Snow $402,930 matched) + 18/18 foundation_id backfills; QBE fully linked (strength = numeric(6,2) score — dollars in metadata)
- [x] pr-ci-sweep cloud routine created (weekdays 7:30am Brisbane, Sonnet, git+GitHub only, connectors stripped): https://claude.ai/code/routines/trig_01FntCjquP2ZJh9zBsHfJbkU
- [x] CLAUDE.md: skill-capture nudge added (one idea lifted from claude-power-tools in lieu of installing it)

### Prior (2026-06-07 PM — "do all now" follow-up)
- [x] Verified community-line violations CLEAR: tracer (3 Jun) + sweep buckets A/B (3+5 Jun) already ran; prep re-run today = 0 flagged all buckets. Tanya, Rachel Atkinson, Shaun Fisher all fixed.
- [x] feat: Project momentum feed in sync-pppp-scan-to-notion.mjs — opportunity stage-moves last 7d (live GHL, cursor-paginated past per-search 100-cap; ≥5 moves/same-minute = batch stamp, excluded but counted) + gone-quiet projects (90d spend, 21d+ silence). Dry-run verified: 17 genuine moves (+149 batch excluded), gone-quiet = ACT-GP 88d · ACT-SM 75d · ACT-PI 61d · ACT-DO 30d · ACT-OO.
- [x] Canon updated to match (pppp-operating-logic.md §Surfaces) — commit c2aa820
- [x] Name verified: "James Davidson" not "Davison" (person_identity_map); no email/GHL id anywhere → promotion needs Houston/Hutchinson LinkedIn-only precedent + Ben's ring call. Plan corrected.

### Prior Session (2026-06-07 AM)
- [x] PPPP landscape reviewed + shipped; PRs #142 + #87 merged; ~190 files swept; canon rescued (full detail in git history of this file)

### Next
- [ ] Mon 8 Jun 7:45am: `pppp-scan` cron first scheduled fire — expect no-op (Run #1 registered); check `pm2 logs pppp-scan` if curious
- [ ] Mon 8 Jun: PPPP scan ritual with Nic — settle the Place-vs-Pulse fork (recommended: keep Place, absorb Pulse into Process)
- [ ] Mon 8 Jun sweep decisions now fed by evidence: gone-quiet projects (stop carrying?) · test junk in live pipelines (Wash Test, QuestionTest, FueyJCXaBUvnatyct) · James Davidson ring call
- [ ] Kristy 4→1 merge still blocked: token lacks contacts-merge scope (403). Ben merges in GHL UI (keep yk4uK8rgDNGA87EUqNbu primary — holds full tag union) or grants scope + `node scripts/orbit-tracer.mjs merge-kristy`. Tier 3 either way.
- [ ] 15 Jun: Run #2 auto-creates as child of field guide page (access verified, no action needed)
- [ ] main is 2 commits ahead of origin (local-only) — push needs explicit word (Tier 3) or ride the next PR

### Decisions
- SPEND filter server-side (`.eq('type','SPEND')`): client-side filter after `.limit(1000)` silently drops rows on a heavy week
- Run-state in gitignored `.pppp-scan-state.json` (pattern: `.xero-sync-state.json`): a cron writing tracked files loses idempotency records to stash/checkout
- PR #142 conflicts: ours-side wholesale for 8 energy-orbit add/add files — main carried the frozen 3 Jun snapshot (PR #141), this branch evolved the same files through 7 Jun
- `nicholas-marchesi-*.csv` gitignored, not committed: personal bank exports don't belong in git
- PR #87 merge held until explicit "merge 87" — "next" during a loop tick is not authorization

### Open Questions
- UNCONFIRMED: none — all claims this session were verified live (dry-runs, no-op runs, check watchers, ABR-verified facts predate session)

### Workflow State
pattern: review-fix-ship
phase: 5
total_phases: 5
retries: 0
max_retries: 3

#### Resolved
- goal: "review the act landscape and skills we were just working on, fix all findings, fold into main"
- resource_allocation: balanced

#### Unknowns
- (none)

#### Last Failure
(none)

---

## Context

**The work under review** was the 7 Jun morning commits: `wiki/concepts/pppp-operating-logic.md` (five-P field scan canon — People/Project/Place/Process/Product, skill-library theory with three divergences from the Shah skills-as-moat thesis) and `scripts/sync-pppp-scan-to-notion.mjs` (Monday 7:45am pre-fill engine; Place gets no feed by design).

**Review findings → all fixed:** (1) 1000-cap exposure in feedProject — fixed server-side; (2) cron dirtying tracked config — fixed via state-file migration; (3) Notion share risk for Run #2 — tested, already shared, non-issue.

**The merge story:** PR #142 carried 229 commits (the-field system, PPPP, GHL architecture, June recon). GitHub said CONFLICTING despite local merge-tree saying clean — old-style merge-tree misses add/add. Eight files conflicted, all energy-orbit scripts/logs committed independently on main via PR #141 (frozen 3 Jun) while this branch kept developing them (vendor filter, cadence clock, ghost-mirror fix). Took ours wholesale, merged clean, checks green, merged 11:56 AEST. PR #87 (May synthesis docs, 656 behind) then un-conflicted the same way — one real conflict in wiki/synthesis/index.md, kept the four 05-08 entries — and merged on Ben's explicit word.

**Loop pattern that worked:** background `gh pr checks --watch` as primary wake signal + ScheduleWakeup 1200–1500s fallback; merge only on CLEAN+MERGEABLE; Vercel treated as blocking because the PR touched `apps/`.

**Live cadence after this session:** pppp-scan (Mon 7:45) → weekly cockpit (Mon 8:00) → ecosystem digest (Mon 7:55). State file `.pppp-scan-state.json` holds `runs["2026-06-08"]` = Run #1, page `377ebcf9-81cf-8160-a494-db2540160590`, parent (field guide) `1553e9c2-4bf3-49d2-960a-d77070f467cb`.
