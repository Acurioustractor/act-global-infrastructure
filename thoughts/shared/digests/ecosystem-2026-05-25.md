---
title: ACT Ecosystem Digest — 2026-05-25
window: 7 days (2026-05-18 → 2026-05-25)
repos_scanned: 8
total_commits: 231
plans_advanced: 5
unscoped_commits: 194
generated: 2026-05-24T21:55:01.704Z
---

# ACT Ecosystem — Week of 2026-05-25

> **231 commits** across **8 repos** · **5 plans advanced** · **194 commits** without `Plan:` trailer

_Skipped repos (not on disk / not git):_ `goods`


## 🎯 Plans advanced (last 7 days)

### `minimax-full-migration-2026-05-22` — 20 commits
[plan](../plans/minimax-full-migration-2026-05-22.md)

- **act-global-infrastructure**
  - `ad9f2b0` docs(handoff): tonight-pack — secret rotated + graders pinned _(2026-05-23)_
  - `fd6ccfe` docs(handoff): Plan C deployed + audit doc shipped — full ledger close _(2026-05-23)_
  - `0706226` feat(llm): Plan C — Gemini Flash Lite as cheap-tier primary _(2026-05-23)_
  - `43ab44c` docs(handoff): Phase 4d Test (a) PASSED — bot live on MiniMax _(2026-05-23)_
  - `37bfcfa` feat(llm): Plan B — remap Haiku tier to MiniMax-M2.7 (regular, not highspeed) _(2026-05-23)_
  - `4f7f12e` feat(llm): extractJson() + temperature=0 for grader determinism _(2026-05-23)_
  - `6f7ce17` feat(llm): Phase 4c spike PASSED + Phase 3b calibration 20/28 + critical finding _(2026-05-23)_
  - `3975717` docs(handoff): Phase 4d mechanics correction — bot is Vercel, not PM2 _(2026-05-23)_
  - `058d0b6` docs(handoff): /clear-save — final consolidation, ready for next session _(2026-05-22)_
  - `8406804` docs(handoff): lock Phase 4 D1 + D4 decisions + 4d execution checklist _(2026-05-22)_
  - `3ceab07` docs(handoff): money-state-of-play — Phase 4b shipped _(2026-05-22)_
  - `fb42a72` feat(llm): wire LLMClient adapter into 5 command-center callers (Phase 4b) _(2026-05-22)_
  - `d5d801d` docs(handoff): /clear-save — 2026-05-22 audit + MiniMax Phase 0-4a complete _(2026-05-22)_
  - `ef6d19e` feat(llm-adapter): bot LLM adapter — drop-in shim for Anthropic SDK _(2026-05-22)_
  - `e7c1f92` feat(llm): reasoning_split=true + PRICING cleanup + revise Phase 4 scope _(2026-05-22)_
  - `d040861` docs(plan): update MiniMax migration plan with Phase 0-3a progress _(2026-05-22)_
  - `89d9355` feat(graders): migrate 4 graders + helper to provider router (Phase 3a) _(2026-05-22)_
  - `a73d1f9` feat(llm): route 3 non-grader scripts via MiniMax router with Anthropic fallback _(2026-05-22)_
  - `07793dd` feat(llm): harden provider router for MiniMax-primary _(2026-05-22)_
  - `3442592` feat(finance): overnight audit + RCA + fix runbook + NAB filter loosened _(2026-05-22)_

### `act-communication-pipeline-2026-05-23-locked` — 11 commits
[plan](../plans/act-communication-pipeline-2026-05-23-locked.md)

- **act-global-infrastructure**
  - `784fc58` feat(supporters): unified supporter intelligence — Supabase + Notion + 3 missing orgs _(2026-05-23)_
  - `267358f` docs(supporters): deep search — 34 paid orgs, \$1.51M historical, \$602K outstanding _(2026-05-23)_
  - `d371425` feat(funders): align all 10 active funders + GHL cleanup automation _(2026-05-23)_
  - `be7f73f` fix(ghl): searchContacts uses POST /contacts/search (v2 API) _(2026-05-23)_
  - `4f627dc` docs(funders): GHL audit corrects Gmail-only findings + maps tagging conventions _(2026-05-23)_
  - `82ec80a` docs(funders): Gmail audit findings for 10 priority funders _(2026-05-23)_
  - `04a401f` feat(newsletter): wire Notion DBs — 90 candidates + Snow draft live in Notion _(2026-05-23)_
  - `fcd5ca6` feat(newsletter): Day 3 — drafts-to-Notion sync + paste-ready send prep _(2026-05-23)_
  - `76a38b8` feat(newsletter): Day 2 complete — Notion bidirectional sync scripts _(2026-05-23)_
  - `48a0d18` feat(newsletter): Day 2 — funder drafter end-to-end working _(2026-05-23)_
  - `8898008` docs(plan): communication pipeline locked + Snow Foundation Q4 MVP build plan _(2026-05-23)_

### `telegram-noise-audit-2026-05-23` — 3 commits
[plan](../plans/telegram-noise-audit-2026-05-23.md)

- **act-global-infrastructure**
  - `404b3d1` feat(telegram): Phase B — snooze buttons + Supabase mute table + budget cap _(2026-05-23)_
  - `43987be` feat(telegram): Phase A — dedup helper + quiet hours + queue drain _(2026-05-23)_
  - `2ee3c8d` fix(telegram): kill the tagger noise + audit all push sources _(2026-05-23)_

### `act-communication-pipeline-2026-05-23` — 2 commits
[plan](../plans/act-communication-pipeline-2026-05-23.md)

- **act-global-infrastructure**
  - `e5fa50a` docs(plan): ACT communication pipeline — backbone + cross-codebase + newsletter alignment _(2026-05-23)_
- **act-regenerative-studio**
  - `5b862d8` feat(comms): ask-act --feed flag + admin OCAP storyteller view _(2026-05-23)_

### `newsletter-pipeline-2026-05-23` — 1 commit
[plan](../plans/newsletter-pipeline-2026-05-23.md)

- **act-global-infrastructure**
  - `23ecdfa` feat(ops): continuous tagging (2h cron) + 5 audit skills + newsletter PRD _(2026-05-23)_

## 📦 Per-repo activity

| Repo | Branch | Commits | Plans touched |
|---|---|---:|---:|
| act-global-infrastructure | main | 64 | 5 |
| act-regenerative-studio | main | 2 | 1 |
| empathy-ledger-v2 | main | 89 | 0 |
| JusticeHub | main | 74 | 0 |
| grantscope | main | 0 | 0 |
| Palm Island Reposistory | feat/meeting-process-wrapper | 0 | 0 |
| act-farm | main | 0 | 0 |
| The Harvest Website | main | 2 | 0 |

## 🔥 Where work happened (unscoped — last 7 days)

Top 15 areas by file-touches across commits without a `Plan:` trailer. Tells you where work landed even when the trailer is missing. Add rules in `AREA_RULES` (`scripts/weekly-ecosystem-digest.mjs`) when "Other" gets large.

| Area | Intensity | File touches | Commits | Repos |
|---|---|---:|---:|---|
| Other | `████████████████████` | 464 | 130 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +2 |
| Command Center | `███████░░░░░░░░░░░░░` | 169 | 2 | act-global-infrastructure |
| Scripts | `█████░░░░░░░░░░░░░░░` | 106 | 56 | act-global-infrastructure, empathy-ledger-v2, JusticeHub |
| DB Migrations | `██░░░░░░░░░░░░░░░░░░` | 54 | 43 | act-global-infrastructure, empathy-ledger-v2, JusticeHub |
| Thoughts | `█░░░░░░░░░░░░░░░░░░░` | 28 | 11 | act-global-infrastructure, empathy-ledger-v2 |
| Command Center · API | `█░░░░░░░░░░░░░░░░░░░` | 25 | 10 | act-global-infrastructure |
| Handoffs | `█░░░░░░░░░░░░░░░░░░░` | 22 | 13 | act-global-infrastructure, empathy-ledger-v2 |
| Command Center · Finance | `█░░░░░░░░░░░░░░░░░░░` | 15 | 9 | act-global-infrastructure |
| Docs | `█░░░░░░░░░░░░░░░░░░░` | 11 | 4 | JusticeHub, The Harvest Website |
| Command Center · Lib | `█░░░░░░░░░░░░░░░░░░░` | 10 | 5 | act-global-infrastructure |
| Plans | `█░░░░░░░░░░░░░░░░░░░` | 9 | 6 | act-global-infrastructure, empathy-ledger-v2 |
| Notion Syncs | `█░░░░░░░░░░░░░░░░░░░` | 6 | 6 | act-global-infrastructure |
| Wiki | `█░░░░░░░░░░░░░░░░░░░` | 5 | 1 | act-global-infrastructure |
| Wiki · Decisions | `█░░░░░░░░░░░░░░░░░░░` | 2 | 1 | act-global-infrastructure |
| Command Center · UI | `█░░░░░░░░░░░░░░░░░░░` | 1 | 1 | act-global-infrastructure |

_…and 5 more areas below the top 15._

## 📝 Commits without `Plan:` trailer

### act-global-infrastructure
- `a071916` docs(handoff): supporters platform shipped 2026-05-23 — ready to /clear _(2026-05-23)_
- `07c7336` feat(supporters): unified supporter view + GHL pipelines + funder briefs overlay _(2026-05-23)_
- `3c697b1` feat(newsletter): Day 1 — Supabase tables + feed-to-candidates sync + Notion schemas _(2026-05-23)_
- `3b97549` feat(comms): cross-codebase activity feed daily cron _(2026-05-23)_
- `022ee11` docs(audit): bot tools × LLM adapter compatibility (46 tools) _(2026-05-23)_
- `0d05794` feat(finance): funders panel — Sync to Notion + drawdown form + reports tracker _(2026-05-21)_
- `641a438` feat(finance): /finance/funders page with warmth + edit/add UI _(2026-05-21)_
- `5a428a1` feat(finance): funder warmth scoring + Notion reporting template + sync script _(2026-05-21)_
- `4035f34` docs(finance): 2026-05-21 system review + tagging story + punch list _(2026-05-21)_
- `0b78bf9` chore(cron): consolidate Mon-morning sync chain + reduce Telegram noise _(2026-05-21)_
- `b39d214` feat(finance): per-project burn metrics + funding sources + key contacts panels _(2026-05-21)_
- `0f1fed9` feat(finance): funder allocations + quarter position MV + tagging guard library _(2026-05-21)_
- `1a39053` Merge pull request #86 from Acurioustractor/feat/archive-duplicating-receipt-scripts-2026-05-19 _(2026-05-19)_
- `47bd1b0` chore(finance): archive gmail-to-xero + push-receipts scripts _(2026-05-19)_
- `3cce1c5` Merge pull request #85 from Acurioustractor/feat/no-receipt-needed-exclusions-2026-05-18 _(2026-05-18)_
- `b0b2a84` feat(finance): exclude transfers + ATO from receipt-coverage denominator _(2026-05-18)_
- `39a05f5` Merge pull request #84 from Acurioustractor/feat/dup-detection-tune-2026-05-18 _(2026-05-18)_
- `d35d4d6` feat(finance): duplicate-detection tuning + Duplicates panel + void plan script _(2026-05-18)_
- `07481aa` Merge pull request #83 from Acurioustractor/feat/reality-check-strip-2026-05-18 _(2026-05-18)_
- `bba60b8` feat(finance): reality-check strip on /finance/transactions _(2026-05-18)_
- `7dc50d6` Merge pull request #82 from Acurioustractor/feat/quick-tagger-ui-2026-05-18 _(2026-05-18)_
- `a6c21a3` feat(finance): quick-tagger UI — Tier A+B bulk, paint mode, batch OCR _(2026-05-18)_
- `448501e` chore: auto-rebuild Tractorpedia viewer [skip ci] _(2026-05-18)_
- `2ace6f5` Merge pull request #81 from Acurioustractor/wip/finance-tagging-platform-2026-05-18 _(2026-05-18)_
- `95552e9` fix(xero-copilot): same supabase-cast as OCR route _(2026-05-18)_
- `7c4ef4e` fix(ocr): cast supabase client to break Vercel duplicate-type clash _(2026-05-18)_
- `2f221eb` feat(finance): suggest-from-line-desc tagger with Tier A-D rules _(2026-05-18)_
- `b4acc77` recovered(wip): finance tagging platform + ACT-HV audit (parallel session 2026-05-17/18) _(2026-05-18)_

### act-regenerative-studio
- `ff4409a` chore: sync ACT Context block from upstream _(2026-05-09)_

### empathy-ledger-v2
- `a207c327` chore(goods): upload Mykel.mp4 + insert story 680eb68d (is_public=false, elder-pending) _(2026-05-23)_
- `6e31f1c6` feat(desktop): inline edit on story drafts queue cards _(2026-05-23)_
- `c13062c4` feat(consents): allow status='pending' + persist multi-party consent on goods-create _(2026-05-23)_
- `fe8f895f` docs(handoff): response to Goods upload-flow brief — storyteller helper shipped, Mykel created _(2026-05-23)_
- `7be58745` feat(admin): POST /api/admin/storytellers/goods-create _(2026-05-23)_
- `da5db613` feat(desktop): upload button on /desktop/photos opens file picker _(2026-05-23)_
- `abdd86c4` docs(handoff): capture surfaces + drafts queue session 2026-05-23 _(2026-05-23)_
- `6d285ff5` chore(editorial): bump editorial-command caps 500 to 2000 _(2026-05-23)_
- `00260547` feat(desktop): story drafts review queue _(2026-05-23)_
- `4cdc102e` feat(desktop): per-org locked capture surfaces _(2026-05-23)_
- `f9bd26f8` feat(desktop): bulk photo upload with drag-drop + dup detection _(2026-05-23)_
- `d1f58ae7` docs(handoff): observatory cosmetic sweep + phase 2 plan _(2026-05-23)_
- `73823ab4` docs(plans): resonance-field phase 2 — capture decisions from grilling _(2026-05-23)_
- `4feb43d7` docs(plans): resonance-field phase 2 unification plan _(2026-05-23)_
- `71e94800` polish(observatory): smooth theme transitions + silhouette fallback + mobile labels _(2026-05-23)_
- `363fbc8f` docs(handoff): desktop editorial surfaces — 2026-05-23 afternoon session _(2026-05-23)_
- `0ac9a87b` chore(projects): archive 7 empty ACT placeholder projects _(2026-05-23)_
- `251fdbf8` feat(desktop): storyteller browser at /desktop/storytellers _(2026-05-23)_
- `1f2f9b48` feat(desktop): articles browser at /desktop/articles _(2026-05-23)_
- `cf0b2f80` fix(stories): filter photo-records by storyteller, not title regex _(2026-05-23)_
- `41b10dd3` feat(cohort-folders): activity digest preview + email _(2026-05-23)_
- `189c0094` fix(stories): use PostgREST 'match' operator instead of SQL '~' for photo-record filter _(2026-05-23)_
- `9cc90205` chore(stories): soft-archive 172 ACT photo-record stories _(2026-05-23)_
- `9e04636c` docs(handoff): world-tour spine follow-ups all shipped, 2026-05-23 PM _(2026-05-23)_
- `fd9d0dca` fix(stories): hide auto-generated photo-record rows from editorial views _(2026-05-23)_
- `469159d4` feat(desktop): stories backlog browser at /desktop/stories _(2026-05-23)_
- `7613f7c0` feat(world-tour): seed tour_stops table from editorial canon + slug-based FK lookup _(2026-05-23)_
- `4aeaf040` feat(admin): wire CTA tab in /admin/articles/[id]/edit to existing API _(2026-05-23)_
- `73e620ba` feat(admin): super-admin override of storyteller-approval publish gate _(2026-05-23)_
- `e72c3ab6` feat(syndication): /api/syndication/contained/engagement _(2026-05-23)_
- `f9124f7c` feat(storyteller): pending-review badge in /storyteller/me/* header _(2026-05-23)_
- `42736766` feat(dev): /dev/clean-walkthrough — one-button tear-down for the 5 world-tour smokes _(2026-05-23)_
- `d0e5bb2d` feat(desktop): project drilldown at /desktop/projects/[id] _(2026-05-23)_
- `8a832873` chore(migrations): rename audit_derive_project_links to break 20260523180000 collision _(2026-05-23)_
- `6c860016` docs(handoff): world-tour spine end-to-end session _(2026-05-23)_
- `7b39a3d5` chore(projects): derive project_storytellers from stories + media _(2026-05-23)_
- `c60dade0` feat(world-tour): theme aggregation index at /world-tour/themes _(2026-05-23)_
- `0198a902` feat(desktop): bulk-attach photos to projects _(2026-05-23)_
- `95b773e9` feat(desktop): bulk select + bulk actions on /desktop/photos _(2026-05-23)_
- `1a82c39a` feat(contained): per-item storyteller consent + media syndication endpoint _(2026-05-23)_
- `f7c3c409` feat(desktop): client-side capture + persist video thumbnails _(2026-05-23)_
- `fc4c9c69` feat(articles): email storyteller when article enters pending_storyteller_review _(2026-05-23)_
- `398e82c3` feat(world-tour): theme alignment surface at /world-tour/themes/[theme] _(2026-05-23)_
- `eb2a83a6` feat(desktop): video thumbnails on /desktop/photos tiles _(2026-05-23)_
- `45dfb4fd` chore(media): backfill storyteller profile images into media_assets _(2026-05-23)_
- `dccb9e58` feat(articles): Lane K — articles join the field-session spine + storyteller approval gate _(2026-05-23)_
- `514030c0` feat(desktop): photo browser at /desktop/photos _(2026-05-23)_
- `f7e05250` chore(media): normalize file_type to canonical MIME across all orgs _(2026-05-23)_
- `4d8d1b9e` fix(middleware): allowlist /api/syndication/{justicehub,contained}/* for API-key auth _(2026-05-23)_
- `cfe30055` feat(syndication): Lane J — CONTAINED touring exhibition curation _(2026-05-23)_
- `e4371ff8` docs(desktop): audit + handoff for 2026-05-23 governance session _(2026-05-23)_
- `adc10597` feat(desktop): governance dashboard at /desktop/* _(2026-05-23)_
- `cda72fae` feat(desktop): governance schema + PICC backfill scripts _(2026-05-23)_
- `2278ad2b` feat(world-tour): I — instant revalidation when youth flip visibility / withdraw _(2026-05-23)_
- `ed99e251` feat(field-sessions): D+E+F — duplicate CTA, storyteller links, org override _(2026-05-23)_
- `49c6b18b` feat(visits): A+B+C UX polish — titles + audio player + pretty visibility _(2026-05-23)_
- `f257e036` fix(world-tour): match field_sessions by place name, not full formatted string _(2026-05-23)_
- `01203e19` fix(field): storyteller_organizations.tenant_id is NOT NULL — set it _(2026-05-23)_
- `4d92cc83` feat(field-sessions): quick-onboard a new storyteller during a visit (Lane I) _(2026-05-23)_
- `4ad4dca7` fix(dev): /dev/login-as uses correct verifyOtp shape + short-circuits refresh _(2026-05-23)_
- `2f421136` feat(dev): /dev/login-as one-click sign-in for local development _(2026-05-22)_
- `0cfc6877` feat(field-sessions): wire youth capture routes + pages to field_session_id _(2026-05-22)_
- `66566db7` feat(cohort-folders): F3 — cohort folder pattern for school + class visits _(2026-05-22)_
- `ccbf2f04` feat(admin): start-visit UI + API for field_sessions _(2026-05-22)_
- `fac1474e` feat(world-tour): F2 — surface field_session visits + public media on stop page _(2026-05-22)_
- `e6d3cf2e` feat(field-sessions): F1 primitive — visit + storyteller + media link _(2026-05-22)_
- `56cfc8fe` docs(handoff): Oonchiumpa youth file trust-completion session _(2026-05-21)_
- `0c88687d` refactor(youth): rename oonchiumpa_staff visibility to org_staff and anchor in a constant _(2026-05-21)_
- `992d6876` feat(youth): Lane 3 follow-up, edit capture-session context after the fact _(2026-05-21)_
- `fce5584e` feat(youth): Lane 2a follow-up, rotate family folder access code _(2026-05-21)_
- `2ba8626b` feat(youth): Lane 1 follow-up, bring-back from withdrawn within the 30-day grace _(2026-05-21)_
- `e2b2423f` chore(demo): Oonchiumpa youth file seeder + walkthrough for Sue _(2026-05-21)_
- `3c8f1a09` feat(youth): Lane 3, capture-session context (who, where) wired end to end _(2026-05-21)_
- `39e8bcdc` feat(youth): admin "Manage family" UI for Lane 2a folders _(2026-05-21)_
- `4a8153c4` feat(youth): Lane 2a, family viewer for the youth file _(2026-05-21)_
- `a0200769` feat(youth): Lane 1 — 30-day storage purge for withdrawn media + countdown badge _(2026-05-21)_
- `011e5240` feat(youth): gate Youth Program button to Oonchiumpa + document v1 limitations _(2026-05-20)_
- `bfa05e7b` test(cross-tenant): allowlist requireOrgAdmin as a known auth pattern _(2026-05-20)_
- `0187e175` chore(audit): script to audit Living Map quote attribution against transcripts _(2026-05-20)_
- `f12576da` fix(auth): wrap reset-password in Suspense — useSearchParams() requires it in Next 15 _(2026-05-20)_
- `fdd03b84` feat(youth): admin org-scoped youth cohort views + Youth Program entry point _(2026-05-20)_
- `3a8b4fd0` feat(youth): storyteller My File pages + /legal/ocap explainer _(2026-05-20)_
- `9b758651` feat(youth): shared components for capture, file list, OCAP banner, recognition _(2026-05-20)_
- `4c9b5d47` feat(youth): server-side Oonchiumpa youth file — onboard, capture, recognition, withdraw _(2026-05-20)_
- `e11a913a` feat(admin): QR code on storyteller share access dialog _(2026-05-20)_
- `10e29df2` fix(auth): cookie-writing welcome session, StrictMode-safe finish, recovery-code reset _(2026-05-20)_
- `1c7593b1` feat(palm-tree-review): distinguish active vs pending community links + local-dev bypass _(2026-05-20)_
- `c32c4aca` feat(media): shared resolveMediaAssetUrl helper for annual report photos _(2026-05-20)_
- `ce2ae38c` refactor(org-layout): observatory full-width + dev impersonation skip _(2026-05-20)_

### JusticeHub
- `3e942b6` docs/handoffs: Codex handoff for civic-intelligence work _(2026-05-24)_
- `a639a88` Track rhetoric-tagger lib (was untracked, breaking Vercel build) _(2026-05-23)_
- `fd42c97` Front-end surfaces for civic people registry _(2026-05-23)_
- `1cf3fe7` People backbone + money→outcomes + temporal snapshots _(2026-05-23)_
- `5763723` COE landing: surface live data sufficiency stats _(2026-05-23)_
- `4fba4b0` Data agent: fix silent upsert failure with pre-check pattern _(2026-05-23)_
- `416e54c` Data sufficiency scripts: standalone runners + digest + auto-seed _(2026-05-23)_
- `13918a3` Data sufficiency: agent topic-rotation + monthly URL health probe _(2026-05-23)_
- `0d7ff67` Data sufficiency: research agent + per-topic page + inventory + freshness watchers _(2026-05-23)_
- `d27a4a8` Data sufficiency layer + nightly YJ classifier cron _(2026-05-23)_
- `c470b61` Kiosk: final source-doc backfill (88/88) + classifier coverage on status page _(2026-05-23)_
- `4f638b8` Kiosk: primary source documents in trust modal + operator status page _(2026-05-23)_
- `bc0f9ca` Kiosk: printable take-a-card + PIN-gated remote control _(2026-05-23)_
- `532e631` Kiosk: lens-grid trust drills + idle countdown pill _(2026-05-23)_
- `2cc6af6` Kiosk breadcrumb + WHAT WORKS category coverage drill _(2026-05-23)_
- `5828baf` Kiosk: trust drill modal on PLACES + ORGS lenses _(2026-05-23)_
- `9101f4e` Kiosk: in-place trust drill modal + live-counts hook entry _(2026-05-23)_
- `d03a01d` Kiosk: hero-photo admin uploader + persistent search modal _(2026-05-23)_
- `59725df` Kiosk: real photos + per-category WHAT WORKS drill _(2026-05-23)_
- `1c735a4` /kiosk — Adelaide exhibition surface with persistent five-lens nav _(2026-05-23)_
- `832c734` /intelligence/civic/whats-new — living feed + ACCO trigram match _(2026-05-23)_
- `ecd392c` Front-load Centre of Excellence on homepage + ACCO backfill via ORIC ABN match _(2026-05-23)_
- `f75e7ca` Source year on every claim card + sites cross-links to civic + external registers _(2026-05-23)_
- `6af0eed` Claim drill-down + critic fixes for exhibition readiness _(2026-05-23)_
- `a98fd9b` Per-state YJ landscape: /intelligence/civic/state/[code] _(2026-05-23)_
- `c18912b` Entity-360 + triangulation badges + Centre of Excellence landing _(2026-05-23)_
- `4e9eebc` Exhibition filter chips: clickable type filter + state filter chips _(2026-05-23)_
- `3f3a7a1` Phase C: /find-funding + /admin/civic/service-submissions + sharper YJ-philanthropy claim _(2026-05-23)_
- `e4cd220` Exhibition Phase B: YJ ranking boost + /add-service intake form _(2026-05-23)_
- `e6cb9ec` Exhibition search Phase A: single-bar query across the civic universe _(2026-05-23)_
- `a6bd087` Centre of Excellence pattern: evidence-review admin + nightly cron _(2026-05-23)_
- `8ef6a9c` seed-claim-evidence.mjs — codify the triangulation lineage _(2026-05-23)_
- `abaadbf` Claim-evidence lineage layer: triangulation as a first-class data model _(2026-05-23)_
- `846c0a5` /intelligence/civic/government-programs + triangulated community-led claim _(2026-05-23)_
- `5c7ca7f` Data-quality page + YJ classifier + ABN dedup design _(2026-05-23)_
- `5f3e6a8` /intelligence/civic/foundations: deep-dive on philanthropy-to-ACCO gap _(2026-05-23)_
- `ae00435` v_entity_360: cross-source org view joined by ABN _(2026-05-23)_
- `460c0ed` Civic claims: ACCO foundation share + oversight tallies + AIHW indigenous overrep _(2026-05-23)_
- `4df957e` Data quality fixes: ACCO flag + foundation tagging + ORIC backfill script _(2026-05-23)_
- `3e38e9c` Sentencing Advisory Councils ingestion (VIC/TAS/NSW/NT) _(2026-05-23)_
- `841c1ea` Surface AIHW Indigenous overrep ratios as civic claims _(2026-05-23)_
- `cc49fc5` AIHW schema patches: source_format + source_sheet_label columns _(2026-05-23)_
- `297138f` Civic connectors batches 2+3: 5 more ingestion pipelines _(2026-05-23)_
- `13df859` Civic connectors batch 1 finished: SCAG + ABR refresh detector _(2026-05-23)_
- `a61c7c3` Civic connectors batch 1: JR Network + Mission Australia + ABN v2 _(2026-05-23)_
- `532111e` Civic connectors build specs (7-agent research sprint) _(2026-05-23)_
- `95a1ca0` ABN backbone: vic grants ABN backfill + orphan funding ABN import _(2026-05-23)_
- `764a0b3` Phase 3: Tier 1 funding distribution + indigenous funding-share claim _(2026-05-23)_
- `1cb8272` Civic intelligence: detention deep-dive + locale pages (5 named places) _(2026-05-23)_
- `798c935` Civic page: surface detention-vs-community comparison in Access chapter _(2026-05-23)_
- `89a17bd` Phase 2: Community supervision cost + detention multiple + recidivism _(2026-05-23)_
- `6f27a1d` Phase 2 cont: ROGS detention cost claims (per-state daily + national) _(2026-05-23)_
- `e7eff66` Phase 2: Seed 15 AU youth detention centres + detention-beds claims _(2026-05-23)_
- `cb04212` Civic subsystem: ship dependencies + national Tier 1 classifications _(2026-05-23)_
- `552300e` Civic page refactor + Tier 1 hero copy _(2026-05-23)_
- `1966599` Daily logo migration cron at 06:00 UTC _(2026-05-23)_
- `70a0f63` Daily annual-report extraction cron at 05:00 UTC _(2026-05-23)_
- `f449edf` Daily rescore cron + email backfill script _(2026-05-23)_
- `b28a247` Daily auto-approve cron at 11:00 UTC _(2026-05-22)_
- `8aa6969` Auto-approve gate relax + rescore --all paging + AR landing-page crawl _(2026-05-22)_
- `eb5ee68` Re-enrichment scheduler + trust signals + what's new + weekly digest _(2026-05-22)_
- `380bb81` Audit log + campaign mode + org cockpit + CSV export _(2026-05-22)_
- `2ac3b3c` Surface enriched data on org pages + funder discovery _(2026-05-22)_
- `15eddb6` Logo cache + re-enrich loop + PDF deep-extract + bounce tracking _(2026-05-22)_
- `e4ec105` Build ALMA enrichment approval pipeline end-to-end _(2026-05-22)_
- `69e708e` Harden enrichment: structured identity check replaces keyword scan _(2026-05-20)_
- `a69d88e` Move org enrichment to dedicated alma_org_enrichment_candidates table _(2026-05-20)_
- `f31b545` Add /admin/alma/elder-review queue (visibility only, no auto-outreach) _(2026-05-20)_
- `8ba6095` Capture consent + permitted-uses + story interest at org claim time _(2026-05-20)_
- `c91520b` Tighten enrichment script: drop empty extractions, route mismatches separately _(2026-05-20)_
- `d460145` Add org-enrichment script + admin outreach queue _(2026-05-20)_
- `42b0939` Add profile completeness scoring + Exemplar toggle to /alma _(2026-05-20)_
- `692d7e1` Add /alma search page; fix Map name and stale detention stat _(2026-05-20)_
- `04f4a7f` Fix 404 on six printed-postcard story slugs _(2026-05-19)_

### The Harvest Website
- `67fe8bd` Add heardAbout signup field + ship member-welcome modal _(2026-05-22)_
- `03209b3` Align launch comms + Path A page copy for 20 June soft opening _(2026-05-22)_

---

_Generated by `scripts/weekly-ecosystem-digest.mjs`. Window: 2026-05-18 → 2026-05-25. Plan slugs validated against `thoughts/shared/plans/` in this repo._
