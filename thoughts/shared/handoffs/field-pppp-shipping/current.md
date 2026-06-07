---
date: 2026-06-07T04:15:47Z
session_name: field-pppp-shipping
branch: main
status: complete
---

# Work Stream: field-pppp-shipping

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-07T09:30:00Z
**Goal:** Four-lane funding build SHIPPED + orchestrator revival COMPLETE (PM2-homed + saved) + warm→cold pipeline operating picture committed. Next: operate the pipeline (Rung-0 chases), violations verify, push.
**Branch:** main (~10 commits ahead of origin — "push" pending, Tier 3)
**Test:** `node scripts/foundation-shortlist.mjs` (expect top-10, Paul Ramsay #1) · `pm2 logs orchestrator --nostream` (grantscope orchestrator online, 172 agents)

### Now
[->] RESUME POINT — pipeline built + operating; two things pending the DB instance recovering:
  1. **FINISH GHL grant enrichment (blocked on DB REST)** — 198/375 grant opps enriched live; 177 RICH (date-bearing) ones still bare. Date bug FIXED (GHL DATE wants ISO 'YYYY-MM-DD' not epoch-ms; verified live on opp 2Y1NVSgtbQZuML7THmww). The 8 custom fields exist. Re-runs FAILED at buildMirrorMap — shared instance PostgREST degraded ("schema cache" errors, 4th wobble tonight). **WHEN REST HEALTHY: `node scripts/enrich-ghl-grants.mjs --apply` (idempotent; ~19min) → expect ~375 enriched, ~0 failed.** Then register the cron: it's in ecosystem.config.cjs (`enrich-grants-ghl`, 45 */6) but NOT in live PM2 yet (held back — pm2 start fires it immediately = one-shot trap + load on fragile instance). Register with `pm2 start ecosystem.config.cjs --only enrich-grants-ghl && pm2 save` once instance is calm.
  2. **⚠ COMPUTE TIER NOW URGENT** — instance wobbled 4×+ tonight (Cloudflare 522 / "schema cache" / ECHECKOUTTIMEOUT). Compounding load: standing grantscope orchestrator (172 agents, 10s poll, added tonight) + heavy paginated supabase-js runs. max_connections=90 review from the 06-07 incident list is the real bottleneck — do BEFORE Monday 6am when discovery+orbit+enrich crons all fire together.
  3. **Rung-0 chases**: Rotary Eclub $82.5K (Pene Curtis Gmail DRAFT created, awaiting send) · Indigenous Languages & Arts $300K in-progress · INV-0314 Centrecorp $84.7K send/void with Nic.
  4. **Push** the ~9 local commits (Ben's verb).
  5. Reconcile Notion grant-tranche ledger ($592K) vs Xero before external quoting.

### Done this session (funding system buildout — see git log bc9123a..bec879d)
- Community-line: 3 people (Kristy/Shaun/Rachel, 7 records) — funder+newsletter tags STRIPPED live (34 removals, verified). `scripts/strip-community-line-tags.mjs`.
- Rotary INV-0222 traced: Pene Curtis Rotary Global Grant in-assembly (not a deadbeat) — Gmail draft created, send pending.
- `/finance/opportunities` four-lane board shipped (commit bc9123a).
- `push-prospects-to-ghl.mjs`: discovery→GHL rail (10 prospects pushed: 5 lapsed funders→Supporter Journey, 5 MMR→Buyer Pipeline; dedupe-protected).
- Regional Business Gateways (Qld, $250-600K, EOI 17 Jul) added to Grants pipeline for Harvest — NOTE eligibility needs a consortium (council/chamber-led), ACT Pty can't apply solo.
- Harvest = Sunshine Coast Council → free GrantGuru at sunshinecoast.grantguru.com.au (register Harvest, ~900 curated grants).
- GHL grant enrichment: 8 opp custom fields created + backfill (see pending #1).

### Mon 8 Jun morning (all verified ready)
6:00 discovery live-inserts ~150 grants (watchdog-guarded, scorer on fallback router) · 7:00 enrich on MiniMax · 7:32 pr-ci-sweep routine first fire (expect "no open PRs") · 7:45 PPPP scan (momentum feeds) · ritual with Nic: Place-vs-Pulse + gone-quiet projects + Kristy GHL-UI merge + James Davidson ring call.

### This Session (2026-06-07 late evening — four lanes shipped + orchestrator revival + warm→cold pipeline)
- [x] Four-lane funding tools (commit `1136fc9`): `foundation-shortlist.mjs` (weights: signal .45/warmth .25/capacity .20/recency .10 ×approachability; warmth via board_members↔field-decisions.jsonl) · `goods-tender-scan.mjs` (austender+state_tenders are AWARDED data → re-tender targets, not open feeds; 8 MMR targets/90d) · `corporate-double-door.mjs` (0 exact, 14 coincidental near-misses — dual-role thesis doesn't hold) · orchestrator revival brief.
- [x] PREMISE CORRECTED: orchestrator wasn't dead globally — only contract-alert path (no agent_schedules row + entity_abn→supplier_abn schema drift + NULL watermark). procurement outbox EMPTY + in-app-only. Real exposure was 771 stale queued emails in grant_notification_outbox.
- [x] QUARANTINE (Ben yes): 771 → status='cancelled' (reversible), verified 0 queued.
- [x] CONTRACT-ALERT REVIVAL (Ben greenlit): 4-line column fix in grantscope `check-contract-alerts.mjs` (committed there, `0507e7d`) → watermark stamped now() (SQL-verified 0 would-alert; 5 historical stay buried) → dry-run clean → agent_schedules 24h registered (first fire ~7pm Bris 8 Jun, in-app only).
- [x] EXECUTOR MYSTERY SOLVED: nothing was hosting the orchestrator (no PM2/Vercel/pg_cron/launchd) — today's runs were the other grantscope session running it manually. Ben ran `pm2 start ecosystem.config.js && pm2 save` → orchestrator id 133 ONLINE, in dump.pm2 (survives restarts), 172 registered agents, small due-backlog executed calmly.
- [x] RELATIONSHIP MAPS (2 agents, commit `e546887`): `2026-06-08-funding-relationships-current-state.md` (11 FY26 grant-makers/$1.31M ACCREC; zero federal procurement footprint 0/806,713; PICC $365K largest payer; 6 adjacency recipes R1–R6) + `2026-06-08-pipelines-suppliers-dgr-doors.md` (GHL $272M Grants pipeline = discovery noise, real = 4 in-progress+3 submitted; spine warm threads Snow ToR 45/yr·Dusseldorp 40/yr; suppliers-as-relationships Defy ~$219K·Oonchiumpa Consultancy $14.9K; Butterfly DGR unlocks ~11 DGR-gated + 318 Indigenous-targeted grants + 551 DGR foundations) + provenance sidecars.
- [x] SYNTHESIS: `2026-06-08-warm-to-cold-funding-pipeline.md` — five rungs (in-motion → renewals → adjacent → new doors → cold-ranked), weekly rhythm, hygiene gates. Never start colder than you have to.
- [!] Classifier blocked grantscope edits mid-batch (half-edited file) — resolved with Ben's explicit verb; also blocked pm2 start (Ben ran via `!`). Pattern: cross-repo writes during another session's activity need Ben's words verbatim.
- [!] DB wobbled again this evening (Cloudflare 522/ECHECKOUTTIMEOUT mid-agent-task, self-recovered) — watch for recurrence; compute-tier review still open from incident list.

### Prior (2026-06-07 evening — DB incident + remediation)
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
- [ ] main is ~10 commits ahead of origin (local-only) — push needs explicit word (Tier 3) or ride the next PR

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
