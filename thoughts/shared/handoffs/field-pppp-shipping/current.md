---
date: 2026-06-07T04:15:47Z
session_name: field-pppp-shipping
branch: main
status: complete
---

# Work Stream: field-pppp-shipping

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-08 (PM-4 — **P4 act.place DEPLOYED + tracer PASSED**; regen PR #52 merged→Vercel prod, newsletter tracer verified the FULL contract incl. the two never-seen-live items (`source:website` tag + consent-source field `HdnMUyXkZRPZG7l7cygG`), tracer contact then deleted. **ACT-FM≡ACT-BV ruling (Ben): merge to ONE — keep ACT-FM (222 money recs vs ACT-BV 9), retire ACT-BV.** **FINDING: www.act.place = Webflow/Cloudflare, NOT this deployment** (forms live at `act-regenerative-studio.vercel.app`). Resume = P2 JusticeHub). Prior PM-3: P1 act.place implemented + pushed. PM-2: whole-system review + plan + rulings R1–R7.
**Goal:** GHL CRM automation-ready. Strategy locked (D1-D4), consent backfilled. **Whole-system forms review COMPLETE.** Ben's ask (review 5 sites via Vercel → align all forms → align all tags → review lists/newsletter) is through the review+plan phase; next is the 3-repo code implementation (day-shift, Tier 1→2→3).
**KEY FINDINGS:** ONE GHL account `agzsSZWgovjwgpcoASWG` ="A Curious Tractor" receives forms from **THREE** codebases (act.place/regen-studio · JusticeHub · empathy-ledger-v2 World Tour), each with its OWN ad-hoc vocab → scope is ~3× the original brief. the-harvest/goods = no live GHL forms (out). **Decision LOCKED:** one account, one canonical contract for all 3. EL verified in-scope (27 `world-tour` contacts in mirror).
**Plan (THE spec):** `thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md` — full per-form CURRENT→TARGET mapping for all 3 repos + locked rulings + phases P0–P6. Review write-up appended to `thoughts/shared/reviews/website-forms-tag-contract-alignment-2026-06-08.md`.
**Branch:** act-global-infrastructure `main` (IN SYNC with origin — the "9 ahead" was stale; PR #143 merged + fetch shows 0 ahead). regen-studio `wip/newsletter-tag-contract-2026-06-08` (now `496e826` = a807396 newsletter + **P1 commit, PUSHED**, undeployed, no PR).

### Now
[->] RESUME POINT — **P2 (JusticeHub)**, best in FRESH context (the plan `thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md` is self-contained spec). P1 DONE (see "Done 2026-06-08 PM-3" below). Remaining phases:
  - **P1 — act.place (regen-studio): ✅ DONE 2026-06-08 PM-3** (commit `496e826`, pushed). FORM_RULES for the 5 inquiry forms + a central namespaced-only contract guard in `pushToGHL` + 6 components stripped of flat tags (provenance→`fields`). **R1 resolved via the VERIFIED registry, not the plan's §A defaults** (which were wrong): farm-stay=`project:act-bv` (NOT act-fa), flagship-inquiry=`role:supporter` (NOT role:partner — no field justifies partner), csa=`interest:membership`, farm-stay=`interest:farm-stay`, residency=`interest:residency`. tsc clean. Deploy+tracer = P4 (✅ DONE PM-4, above). **ACT-FM domain call RESOLVED (Ben, PM-4): ACT-FM ≡ ACT-BV are the same place → merge to ONE code, keep ACT-FM (222 money recs vs ACT-BV 9), retire ACT-BV.** This means the regen `PROJECT_REGISTRY`'s farm→`project:act-bv` is the WRONG code (should be `act-fm`) — fix in the merge. Merge surface = 51 `ACT-BV`/`act-bv`/`ACT-BCV` refs across ~30 files (Tier 1 config/code, incl. the 2nd registry copy `apps/command-center/src/config/project-codes.json` + resolvers `project-code-resolver.mjs`/`project-resolver.mjs`) + 9 Xero/Supabase money records re-coded ACT-BV→ACT-FM (**Tier 3 DONE 2026-06-08 PM-4**: invoice $525 recoded in Xero totals-intact; ACT-BV Xero tracking option DELETED/retired; 9 mirror rows→ACT-FM manual-merge; the 8 reconciled RECEIVE txns are API-locked but were never ACT-BV-tracked in Xero so fold to ACT-FM — SL routing dissolved. Script `recode-act-bv-to-fm-2026-06-08.mjs` + revert log). **Tier-1 merge SHIPPED to main 2026-06-08 PM-4: commit `f9b263a` / PR #144 MERGED** (LEGACY_WRAPPERS fold both maps, both registry copies, 3 resolvers, R&D-eligibility +ACT-FM, money-alignment card folded; tests 6/6+13/13, tsc clean; ADR `wiki/decisions/2026-06-08-act-bv-merged-into-act-fm.md`). Caught latent bug: command-center registry had NO ACT-FM entry (only ACT-BV) → farm lookups silently empty → fixed.
  - **P2 — JusticeHub** (`/Users/benknight/Code/JusticeHub`): rewrite `GHL_TAGS` (`src/lib/ghl/client.ts:550-609`) + 5 routes to the canonical set. Locked mappings: Newsletter→comms:justicehub-newsletter+role:supporter+project:act-jh+consent · STEWARD→tier:steward · STATE_*→place:* · LIVED_EXPERIENCE/YOUTH_VOICE→**lane:community+role:storyteller (zero comms, OCAP)** · CONTAINED→interest:justice-reform+source:event:contained-<slug> · nominations→nominated_person field (drop NOMINATED tag). Audit the embedded `GHLForm.tsx` native form in the GHL UI (R6). Biggest pollution source.
  - **P3 — EL** (`/Users/benknight/Code/empathy-ledger-v2`): align the 2 World Tour forms. ⚠ Verify the live form path first — mirror shows `world-tour`=27 but `wt-*`/`partner-network`=0 (forms may not have fired, or mirror lag).
  - **P4 — Deploy + tracer (Tier 3, Ben's verb). act.place ✅ DONE 2026-06-08 PM-4** (PR #52 merged→`main`→`deploy.yml` Vercel prod succeeded; branch deleted). Newsletter tracer POSTed to `act-regenerative-studio.vercel.app/api/forms/submit` → live GHL contact seated EXACTLY `project:act-in · source:website · role:supporter · tier:curious · comms:act-newsletter` + `newsletter_consent=Yes` (`aVnqmajnysMtGYhLD0oA`) + consent-source (`HdnMUyXkZRPZG7l7cygG`) — **both never-seen-live items CONFIRMED**; contract guard held (no flat leak). Tracer contact deleted via `ghl-api-service.deleteContact` (verified gone). **⚠ FINDING: www.act.place is a Webflow/Cloudflare site, NOT the regen-studio Vercel deployment** — public act.place 404s on `/api/forms/submit`; the aligned forms live only at the `.vercel.app` host. So regen is EITHER a pending cutover OR there is a 6th GHL surface (native Webflow act.place forms) the plan never counted — **investigate before declaring act.place forms truly aligned.** JusticeHub + EL tracers still pending (after P2/P3). Then update memory `newsletter-consent-signup-path` (still says `tier:connected`).
  - **P5 — GHL tag migration (Tier 2/3, gated):** `scripts/ghl-taxonomy-migrate.mjs --dry-run` → tracer → bucketed apply, re-assert community-line guard each bucket (taxonomy §6).
  - **P6 — Lists/newsletter confirm:** re-check the 4 `comms:*-newsletter` enrolments + smart-list counts + consent gate.

  OPEN DECISIONS still queued (carried from the lists review):
  1. **237 orphan tags** need rulings before the taxonomy migration `--apply` (`scripts/ghl-taxonomy-migrate.mjs` DRY-RUN-only; worksheet `thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md`). Big fix found: flat `storyteller` (304) is 98% NOT community (only 7 have lane:community) → `interest:storytelling` EXCEPT the 7 → `role:storyteller`. (Also cleans the stale-tag accumulation the forms leave on contacts.)
  2. **Non-opt-ins re-permission-or-remove**: ~98 UNKNOWN + 11 NOT-OPT-IN on newsletter lists with no consent (Website Inquiry 37, contact forms, ACT Intelligence, Container CSV, test data). Re-permission campaign OR strip the comms tag. NOT backfilled (correctly).
  3. **role:community (person=block) vs role:community-controlled (org=ok)** — confirm the rule; 70 role:community* contacts carry comms tags.
  (#4 "prove the live signup path" → DONE this session, see "Done 2026-06-08 PM" below.)

  STILL PARKED (pre-consent-thread):
  - **Rotary $82.5K** — Pene Curtis Gmail DRAFT awaiting send (Tier 3).
  - **Push** the act-global-infrastructure commits (Ben's verb).
  - **⚠ Compute-tier review** — instance wobbled 4×+ on 06-07 (Cloudflare 522/schema-cache); max_connections=90 bottleneck + standing grantscope orchestrator (172 agents). Do before lists work hammers the DB again.

### Done 2026-06-08 PM-4 — P4 act.place deployed + tracer passed + ACT-FM ruling
- **Gate check first:** confirmed the ACT-FM question did NOT block the deploy — shipped P1 code never emits `project:act-fa` (farm forms emit `interest:farm-stay`/`interest:residency`; `project:` derives from the page projectCode, pre-existing from PR #51). So "code-safe to defer" held.
- **Deploy:** opened regen PR #52 → CI green (Lint&TypeCheck + full `next build` + tests all pass) → merged to `main` → `deploy.yml` Vercel prod deploy succeeded (run 27118452310). Branch auto-deleted.
- **Tracer:** POST newsletter to `act-regenerative-studio.vercel.app/api/forms/submit` (`{formType:'newsletter', fields:{email:'act-tracer-20260608@benjamink.com.au',...}}`) → `success:true, ghl:true`. GHL contact `fJY6a3jYhdlShtTmjeTg` (loc `agzsSZWgovjwgpcoASWG`) had EXACTLY `project:act-in · source:website · role:supporter · tier:curious · comms:act-newsletter` + `newsletter_consent=Yes` + consent-source — no flat leak (guard held). **Both never-seen-live items verified live.** Tracer then DELETED (Ben's verb) via `ghl-api-service.deleteContact` → re-query confirms `total:0`.
- **⚠ FINDING — www.act.place ≠ this deployment:** act.place → 301 → www.act.place, served by **Cloudflare/Webflow** (pageId surrogate-keys), 404 on `/api/forms/submit`. The deploy aliased to `act-regenerative-studio.vercel.app` (server: Vercel, endpoint present). So the aligned forms are NOT on the public act.place site. Contradicts the plan's regen=act.place assumption. **OPEN: is regen a pending cutover, or are there native Webflow act.place forms (6th GHL surface) not in the plan?**
- **ACT-FM ≡ ACT-BV ruling (Ben):** merge to ONE. Xero usage decides the keeper: ACT-FM=138 inv+84 txn=**222**, ACT-BV=1 inv+8 txn=**9** → keep ACT-FM, retire ACT-BV. Merge = 51 refs/~30 files (Tier 1) + 9 money records re-code (Tier 3). Proposal stage — not executed.

### Done 2026-06-08 PM-3 — P1 act.place forms aligned (regen-studio `496e826`, pushed)
- **Read the real code, not the plan's §A table** — caught that §A was speculative and conflicted with the VERIFIED registry `wiki/decisions/act-site-form-alignment.md`. The route derives `project:` from `projectCode` via a registry; per-form tags come from `FORM_RULES`. Frontend genuinely sends all 5 formTypes (verified via grep of `formType:` literals).
- **route.ts**: `FORM_RULES` += csa/farm-stay/residency/payout-wall-contest/flagship-inquiry (each `source:website`+`role:supporter`+an `interest:`, NO comms:/consent). volunteer rule fixed to `role:supporter`+`interest:volunteer` (a807396 follow-up). **NEW central guard** in `pushToGHL`: only colon-namespaced tags reach GHL; drops flat tags (incl. the `act-regenerative-studio` SOURCE_SITE_TAG on every form) + logs; full raw tags preserved on the Supabase fallback row.
- **6 components** (CSA/FarmStay/Residency/Contact/FoundationContest/QuickInquiry): stripped flat human-readable additionalTags; folded page-provenance (context/route/UTM/flagship-interest) into `fields`.
- **Decisions deviating from plan defaults (Ben to veto if wrong):** farm-stay→`project:act-bv` not `act-fa`; flagship-inquiry→`role:supporter` not `role:partner` (field-justification rule); interest values self-documenting (`interest:farm-stay`/`interest:residency`/`interest:membership`).
- **Behaviour-change flag:** guard strips the flat `act-regenerative-studio` tag from GHL on EVERY form incl. the already-live newsletter. Any smart-list on that bare tag stops matching — automations not live, right moment.
- tsc clean (exit 0). Branch pushed (`a807396..496e826`). Deploy+tracer = P4 (Tier 3, Ben's verb).

### Done 2026-06-08 (PM — #4 signup path proven + newsletter contract fixed)
- **Proved the live signup path** end-to-end: real signup → prod fallback `pushToGHL` → GHL contact `spzexfNKtWDyktWC1bjb` carries `newsletter_consent=Yes` (field `aVnqmajnysMtGYhLD0oA`) + `comms:act-newsletter`. Consent gate WORKS. Only 1 real submission ever exists (the 06-02 self-test in `pending_form_submissions`, synced=true) — zero organic traffic; the current projectCode-routing code never had a verified live signup, so a 6-day-old test on superseded code was NOT proof.
- **Found the drift** (live code vs taxonomy): missing `role:supporter` (→ signups invisible to "Org supporters" smart-list + role-gated automations) · `source:website-form` vs `source:website` · `tier:connected` jumps the ladder (D3 wants behaviour-driven) · flat-tag pollution · GHL upsert accumulates stale tags.
- **Fixed newsletter contract** in regen-studio (`a807396`, branch pushed): role:supporter added, source slug fixed, `tier:curious` (Ben's ruling), flat tags dropped/namespaced, route/context provenance → Supabase `fields`. tsc clean. Deploy+tracer pending (above).
- **Pivot**: Ben scoped the next session to the WHOLE forms system → brief `thoughts/shared/reviews/website-forms-tag-contract-alignment-2026-06-08.md`.

### Done 2026-06-08 (CRM automation-readiness — git log bc9123a..69b23a9)
- **GHL audit**: 12 pipelines · 61 contact fields/8 folders · 31 opp fields · ~150 tags. Found dual taxonomy (namespaced vs legacy flat), 2 warmth systems (ring/tier), ~900 cruft tag-uses, redundant fields. → `ghl-crm-taxonomy.md`.
- **Strategy locked**: 5-layer model (describe→segment→enrol→act→gate); D1=4 newsletters, D2=retire partner-drip, D3=auto tier/hand ring, D4=explicit consent. → `ghl-audience-comms-automation.md`.
- **Taxonomy migration dry-run** (`ghl-taxonomy-migrate.mjs`): 2586 contacts, 1024 ADD/4115 REMOVE, 237 orphans, 0 true lane:community breaches (06-07 strip held), 284 consent-gaps.
- **Consent reconciled**: EL = content-consent SoR for storytellers (story/photo/ai, mostly @storyteller.local placeholders, community-line/hand-comms). GHL field = newsletter consent. The "284" were mostly evidenced opt-ins missing the flag. Signup code CORRECT since 06-02 (commit 40730cb) — NOT the ARRAY bug.
- **Consent BACKFILLED** (`backfill-newsletter-consent.mjs`): GHL live `source` field = the evidence (mirror only has sync-provenance). **108 evidenced opt-ins written** (Yes + source + ISO signup date), 0 failed, verified live (Rebecca Ward). Promoted Harvest member-list (20) + gathering-footer (14) on Ben's ruling.
- Grant enrichment FINISHED earlier: 344/375 (31 = deleted-in-GHL phantoms), cron `enrich-grants-ghl` registered + saved.

### Mon 8 Jun morning (all verified ready)
6:00 discovery live-inserts ~150 grants (watchdog-guarded, scorer on fallback router) · 7:00 enrich on MiniMax · 7:32 pr-ci-sweep routine first fire (expect "no open PRs") · 7:45 PPPP scan (momentum feeds) · ritual with Nic: Place-vs-Pulse + gone-quiet projects + Kristy GHL-UI merge + James Davidson ring call.

### This Session (2026-06-07 late evening — four lanes shipped + orchestrator revival + warm→cold pipeline)

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
