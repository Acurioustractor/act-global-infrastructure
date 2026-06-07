---
title: ACT Ecosystem Digest — 2026-06-01
window: 7 days (2026-05-25 → 2026-06-01)
repos_scanned: 8
total_commits: 489
plans_advanced: 13
unscoped_commits: 432
generated: 2026-05-31T21:55:01.437Z
---

# ACT Ecosystem — Week of 2026-06-01

> **489 commits** across **8 repos** · **13 plans advanced** · **432 commits** without `Plan:` trailer

_Skipped repos (not on disk / not git):_ `goods`


## 🎯 Plans advanced (last 7 days)

### `2026-05-29-finance-xero-mirror-surface` — 10 commits
[plan](../plans/2026-05-29-finance-xero-mirror-surface.md)

- **act-global-infrastructure**
  - `e941bde` docs(finance): roll money-state-of-play ledger forward to 2026-05-29 _(2026-05-29)_
  - `71b58a6` docs(finance): refresh handoff — #2/#3 done + $76K dup void worklist _(2026-05-29)_
  - `0311737` feat(finance): #3 — duplicate void triage worklist ($76K phantom AP) _(2026-05-29)_
  - `a682653` feat(finance): #3 — anomaly/dup watch (detect-finance-anomalies) _(2026-05-29)_
  - `e7d1727` feat(finance): #2 — daily digest compute + mirror recency filter _(2026-05-29)_
  - `d398b57` docs(finance): session handoff — Xero Mirror + ongoing-bookkeeping roadmap _(2026-05-29)_
  - `c7ccead` feat(finance): mirror #1 — inline project suggestions on untagged rows _(2026-05-29)_
  - `34653c5` feat(finance): mirror table — sortable columns + per-column filters _(2026-05-29)_
  - `134a8b6` fix(finance): mirror missing-receipt flag → bills-only (1246 → 11) _(2026-05-29)_
  - `798cc2b` feat(finance): Xero Mirror surface + project-finance data fixes _(2026-05-29)_

### `2026-05-30-xero-source-of-truth-goods-ledger` — 9 commits
[plan](../plans/2026-05-30-xero-source-of-truth-goods-ledger.md)

- **act-global-infrastructure**
  - `e9a9941` feat(finance): colour-code transaction chips + wire Project Money → Transactions _(2026-05-30)_
  - `1b8d8f6` feat(finance): retag The Plasticians AP bill ACT-IN → ACT-GD in Xero _(2026-05-30)_
  - `3d041f7` docs(finance): SL handoff — sense-check findings (TFN grant + Plasticians + MOL) _(2026-05-30)_
  - `37832ac` feat(finance): tag the final 35 incidentals → FY26 coverage now 100% _(2026-05-30)_
  - `9442d5d` feat(finance): unified Project Money page — live per-project in/out/net + coverage _(2026-05-30)_
  - `0b19080` feat(finance): tag 106 untagged FY26 expenses to projects (income already 100%) _(2026-05-30)_
  - `a998a28` fix(finance): durable guard against voided-invoice phantom receivables _(2026-05-30)_
  - `c10cbaa` feat(finance): Phase 3 — invoice sync derives project_code FROM Xero Project Tracking _(2026-05-30)_
  - `b8a47e5` feat(finance): funders surface — GHL-vs-Xero drift overlay + project filter _(2026-05-30)_

### `2026-05-29-finance-cockpit-consolidation` — 7 commits
[plan](../plans/2026-05-29-finance-cockpit-consolidation.md)

- **act-global-infrastructure**
  - `54c49ca` docs(finance): correct handoff §4 — excludeRadar refactor reverted by concurrent session _(2026-05-29)_
  - `51ee930` docs(finance): Goods AP recon + expense de-dup ($614K/$649K) + session handoff _(2026-05-29)_
  - `b2890de` docs(finance): mark cockpit-consolidation P1–P4 shipped + record decisions _(2026-05-29)_
  - `d85984b` feat(finance): P4 nav cleanup — collapse finance sidebar to State · Operate · Drill · Reports _(2026-05-29)_
  - `ef9206f` feat(finance): P3 OPERATE fold — copilot becomes the work surface (inline re-tag, receipt badge, find-missing) _(2026-05-29)_
  - `e2dc9f7` feat(finance): P2 STATE fold — trust meters on overview + redirect command/money-alignment _(2026-05-29)_
  - `c593390` feat(finance): P1 trust primitives — FreshnessBadge + ReceiptInXero + sync-freshness API _(2026-05-29)_

### `2026-05-28-goods-three-pipeline-operating-model` — 7 commits
[plan](../plans/2026-05-28-goods-three-pipeline-operating-model.md)

- **act-global-infrastructure**
  - `eff782f` docs(goods): CRM operating guide + strategy (Notion-ready) _(2026-05-28)_
  - `834ae2e` chore(goods): dedupe double-listed Demand Register communities _(2026-05-28)_
  - `45a2dfc` feat(goods): 3-pipeline operating model + unit-ledger wiring _(2026-05-28)_
- **grantscope**
  - `c68d21d` feat(goods): auto-refresh the impact film data from live numbers _(2026-05-28)_
  - `1246ca2` feat(goods): data-driven impact film on the Remotion video app _(2026-05-28)_
  - `d1266f6` feat(goods): link the Goods funnel dashboard from the Goods OS header _(2026-05-28)_
  - `6aaebee` feat(goods): live funnel dashboard — 3 pipelines on the 5-stage spine _(2026-05-28)_

### `2026-05-26-act-operating-picture-blueprint` — 7 commits
[plan](../plans/2026-05-26-act-operating-picture-blueprint.md)

- **act-global-infrastructure**
  - `dba5793` fix(finance): re-light P3 compliance calendar (time-aware API + crons) _(2026-05-27)_
  - `d7f63dd` feat(finance): P2 — entity dimension + durable bank-balance re-light _(2026-05-27)_
  - `91751e5` refactor(finance): consolidate P&L surfaces onto the one ledger (accrual) _(2026-05-26)_
  - `6ddbb34` fix(finance): paginate 9 row-cap-truncated finance totals _(2026-05-26)_
  - `81ffc5b` fix(finance): paginate ledger reads — PostgREST 1000-row cap was truncating sums _(2026-05-26)_
  - `a774340` docs(review): command-center data trust map + operating-picture blueprint _(2026-05-26)_
  - `775cff7` feat(finance): one money ledger + rebuilt /company front page _(2026-05-26)_

### `2026-05-29-close-the-books-assistant` — 4 commits
[plan](../plans/2026-05-29-close-the-books-assistant.md)

- **act-global-infrastructure**
  - `c1db312` docs(finance): ledger — PR #125 merged + deployed; do-all follow-through _(2026-05-29)_
  - `03d4978` feat(finance): monthly close-the-books cron + SL locked-period dup handoff _(2026-05-29)_
  - `1a9d339` docs(finance): ledger — #4 close-the-books shipped, roadmap 4/4 complete _(2026-05-29)_
  - `832da92` feat(finance): #4 close-the-books assistant — period ready-to-close gate _(2026-05-29)_

### `act-communication-pipeline-2026-05-23-locked` — 3 commits
[plan](../plans/act-communication-pipeline-2026-05-23-locked.md)

- **act-global-infrastructure**
  - `9396ecc` fix(comms): broaden ghost detection to any 'not found' GHL error _(2026-05-28)_
  - `51ac6bf` feat(comms): audience script — ghost handling + Supabase tag mirror _(2026-05-28)_
  - `2ac70a7` feat(comms): audience segmentation taxonomy + script _(2026-05-28)_

### `rd-tax-incentive-fy2526-path-c` — 2 commits
[plan](../plans/rd-tax-incentive-fy2526-path-c.md)

- **act-global-infrastructure**
  - `17a5486` docs(rd): resolve ACT-IN classification — internal tooling excluded as core _(2026-06-01)_
  - `ce77ec7` docs(rd): FY26 R&D pack — overseas finding, master register, compliance check, Path C plan _(2026-05-31)_

### `2026-05-29-finance-close-panel` — 2 commits
[plan](../plans/2026-05-29-finance-close-panel.md)

- **act-global-infrastructure**
  - `cc9e963` docs(finance): ledger — close panel shipped + deployed (PR #126) _(2026-05-29)_
  - `88faf6d` feat(finance): live close-pack panel at /finance/close _(2026-05-29)_

### `2026-05-29-xero-close-the-loop` — 2 commits
[plan](../plans/2026-05-29-xero-close-the-loop.md)

- **act-global-infrastructure**
  - `1f3bcad` docs(finance): ledger — 20 dup bills voided ($67,970.72), 6 locked-period → SL _(2026-05-29)_
  - `bf4a4c3` feat(finance): mirror Phase 1 — attach receipts to Xero from the flagged bills _(2026-05-29)_

### `2026-05-27-eofy-burndown-system` — 2 commits
[plan](../plans/2026-05-27-eofy-burndown-system.md)

- **act-global-infrastructure**
  - `6439ee6` feat(eofy): daily burndown snapshot cron + Telegram countdown _(2026-05-27)_
  - `5dcd56a` feat(eofy): countdown + burndown tracker for the 30 June Pty cutover _(2026-05-27)_

### `2026-05-28-unified-content-calendar` — 1 commit
[plan](../plans/2026-05-28-unified-content-calendar.md)

- **act-global-infrastructure**
  - `a567cb1` feat(comms): unified content calendar — cadence engine + Notion view _(2026-05-28)_

### `2026-05-28-partner-brand-newsletter-drafters` — 1 commit
[plan](../plans/2026-05-28-partner-brand-newsletter-drafters.md)

- **act-global-infrastructure**
  - `d295c15` feat(comms): partner + brand newsletter drafters + public brand archive _(2026-05-28)_

## 📦 Per-repo activity

| Repo | Branch | Commits | Plans touched |
|---|---|---:|---:|
| act-global-infrastructure | wip/opus-4-8-prompting-2026-05-31 | 174 | 13 |
| act-regenerative-studio | codex/philanthropy-transparency-bridge | 60 | 0 |
| empathy-ledger-v2 | main | 98 | 0 |
| JusticeHub | main | 83 | 0 |
| grantscope | feat/reconcile-entity-datasets-cron | 44 | 1 |
| Palm Island Reposistory | feat/meeting-process-wrapper | 0 | 0 |
| act-farm | main | 0 | 0 |
| The Harvest Website | launch-readiness-reconcile | 30 | 0 |

## 🔥 Where work happened (unscoped — last 7 days)

Top 15 areas by file-touches across commits without a `Plan:` trailer. Tells you where work landed even when the trailer is missing. Add rules in `AREA_RULES` (`scripts/weekly-ecosystem-digest.mjs`) when "Other" gets large.

| Area | Intensity | File touches | Commits | Repos |
|---|---|---:|---:|---|
| Other | `████████████████████` | 749 | 168 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +2 |
| Scripts | `████░░░░░░░░░░░░░░░░` | 158 | 94 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +3 |
| Thoughts | `███░░░░░░░░░░░░░░░░░` | 100 | 41 | act-global-infrastructure, empathy-ledger-v2, grantscope |
| Command Center | `██░░░░░░░░░░░░░░░░░░` | 87 | 1 | act-global-infrastructure |
| Docs | `██░░░░░░░░░░░░░░░░░░` | 70 | 35 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +2 |
| DB Migrations | `██░░░░░░░░░░░░░░░░░░` | 67 | 51 | act-global-infrastructure, empathy-ledger-v2, JusticeHub +1 |
| Command Center · API | `██░░░░░░░░░░░░░░░░░░` | 67 | 14 | act-global-infrastructure |
| Plans | `█░░░░░░░░░░░░░░░░░░░` | 41 | 35 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +1 |
| Handoffs | `█░░░░░░░░░░░░░░░░░░░` | 35 | 29 | act-global-infrastructure, act-regenerative-studio, empathy-ledger-v2 +1 |
| Claude Config | `█░░░░░░░░░░░░░░░░░░░` | 26 | 3 | act-global-infrastructure, JusticeHub |
| Config | `█░░░░░░░░░░░░░░░░░░░` | 25 | 22 | act-global-infrastructure, act-regenerative-studio |
| Command Center · Lib | `█░░░░░░░░░░░░░░░░░░░` | 24 | 11 | act-global-infrastructure |
| Wiki | `█░░░░░░░░░░░░░░░░░░░` | 23 | 4 | act-global-infrastructure |
| Command Center · UI | `█░░░░░░░░░░░░░░░░░░░` | 21 | 5 | act-global-infrastructure |
| Public Assets | `█░░░░░░░░░░░░░░░░░░░` | 20 | 13 | act-regenerative-studio, empathy-ledger-v2 |

_…and 12 more areas below the top 15._

## 📝 Commits without `Plan:` trailer

### act-global-infrastructure
- `b035dbc` docs(wiki): reconcile four-lanes + act-identity to canonical entity architecture _(2026-06-01)_
- `cbd6e98` docs(handoff): session 2026-06-01 — entity cutover + business architecture + Goods/Butterfly + R&D reframe _(2026-06-01)_
- `97a2099` docs(finance): SL-perspective R&D outcomes + FY27 engine setup + Goods service agreement _(2026-06-01)_
- `0c6ba5b` feat(finance): PTY cutover readiness page + Goods/Butterfly entity lock-in _(2026-06-01)_
- `cc27f6f` docs(finance): Mounty voided + SL notes for Sand Yard/Edmonds dup-contact cleanup _(2026-05-31)_
- `ccc2acb` chore(finance): void 2 leftover 429 Dext duplicates _(2026-05-31)_
- `b88f3d6` feat(finance): MOL FX fix + Q2/Q3 429 REVIEW-band decisions for SL _(2026-05-31)_
- `2e75b31` docs(rules): align coding practice to ACT business (Pocock workshop) _(2026-05-31)_
- `0874599` docs(tooling): Opus 4.8 effort-routing cheat-card + repo rules ref _(2026-05-31)_
- `982fcd7` Merge pull request #131 from Acurioustractor/wip/sl-sense-check-findings-2026-05-30 _(2026-05-30)_
- `d3a1093` Merge pull request #130 from Acurioustractor/wip/voided-receivable-guard-2026-05-30 _(2026-05-30)_
- `b57f5df` Merge pull request #129 from Acurioustractor/wip/xero-source-phase3-2026-05-30 _(2026-05-30)_
- `5661d0e` Merge pull request #128 from Acurioustractor/wip/xero-source-phase2-2026-05-30 _(2026-05-30)_
- `d4987be` feat(finance): Phase 2 — Xero Project Tracking backfill tooling + SL handoff _(2026-05-30)_
- `a66c78e` Merge pull request #127 from Acurioustractor/wip/funders-ghl-diff-2026-05-30 _(2026-05-30)_
- `e84c99b` docs(qbe): cost-model v6 worked numbers + secure Stage-1 briefs _(2026-05-29)_
- `8b18555` Merge pull request #126 from Acurioustractor/wip/finance-close-panel-2026-05-29 _(2026-05-29)_
- `f7ca7e8` Merge pull request #125 from Acurioustractor/wip/goods-finance-recon-2026-05-29 _(2026-05-29)_
- `9b77f87` feat(finance): void 20 confirmed duplicate bills ($67,970.72 phantom AP) _(2026-05-29)_
- `ce37317` feat(finance): Goods Xero corrections applied + AP Find&Match action sheet _(2026-05-29)_
- `ac891ab` docs(ghl): tag plan + prep pack — frozen map, type taxonomy, workflow triggers, Phase 1 done _(2026-05-29)_
- `d9e26cc` feat(ghl): audience_segments column + partner/funder type classifier _(2026-05-29)_
- `bcbdf3d` docs(ghl): CRM world-class audit, Tier-1 prep pack, tag-canonicalization plan _(2026-05-29)_
- `139a089` fix(finance): exclude grant-radar pipeline from monetary roll-ups _(2026-05-29)_
- `9616c2d` Merge pull request #124 from Acurioustractor/wip/xero-recon-recode-2026-05-29 _(2026-05-29)_
- `1c90590` docs(finance): finance cockpit consolidation plan (3 surfaces, trust primitives, phased) _(2026-05-29)_
- `5d5780a` feat(finance): sync by modification-date (If-Modified-Since) + 429 retry _(2026-05-29)_
- `b82592f` feat(finance): GE recode Medium band applied (42 bills) + script hardening _(2026-05-29)_
- `0071213` feat(finance): apply GE (429) recode to Xero — High band done (48 bills), reversible _(2026-05-29)_
- `c2ed956` docs(finance): Pty Ltd Xero cutover runbook (30 Jun 2026) _(2026-05-29)_
- `7f73c35` docs(finance): fold operating-model + Xero-AI/Dext + AU-GST into MASTER pack; SL email draft _(2026-05-29)_
- `3d9e34a` docs(finance): reconciliation+receipts operating model + Xero bank-rules proposal _(2026-05-29)_
- `abde9ae` docs(finance): Xero Q2/Q3 health review + Standard Ledger recon/recode prep pack _(2026-05-29)_
- `890389d` docs(qbe): cost-model v6 advisor prep doc _(2026-05-29)_
- `c99c9c9` Merge pull request #123 from Acurioustractor/wip/handoff-2026-05-28-cost-model-session _(2026-05-28)_
- `d98ab81` docs(handoff): goods cost-model + dashboard session 2026-05-28 _(2026-05-28)_
- `4be5c32` Merge pull request #122 from Acurioustractor/wip/goods-bed-unit-economics-2026-05-28 _(2026-05-28)_
- `8b3ea40` feat(goods): v3 cost model — 20kg HDPE/bed locked, Sheets export script _(2026-05-28)_
- `e412a6f` analysis(goods): v3 cost model — Idiot Index + in-house scenarios + founder time split _(2026-05-28)_
- `545e839` analysis(goods): CORRECTED bed unit economics from Defy invoice OCR _(2026-05-28)_
- `0fbc3f6` analysis(goods): mark bed-unit-economics doc as SUPERSEDED/flawed _(2026-05-28)_
- `99fe0c1` analysis(goods): bed unit economics worked backwards from Defy invoices _(2026-05-28)_
- `674cad1` Merge pull request #121 from Acurioustractor/wip/goods-cost-evidence-plan-2026-05-28 _(2026-05-28)_
- `527a82d` docs(goods): cost-evidence funder-artifact plan + recovered-branch review _(2026-05-28)_
- `2dab16c` Merge pull request #119 from Acurioustractor/wip/goods-kaltukatjara-dedup-2026-05-28 _(2026-05-28)_
- `896566c` chore(goods): dedup Kaltukatjara — remove deregistered Nguratjaku Council row _(2026-05-28)_
- `f9da9ba` Merge pull request #118 from Acurioustractor/wip/goods-crm-guide-2026-05-28 _(2026-05-28)_
- `ce12efe` docs(goods): correct cockpit location to CivicScope (civicgraph.app) _(2026-05-28)_
- `15d4889` Merge pull request #117 from Acurioustractor/wip/goods-demand-dedup-2026-05-28 _(2026-05-28)_
- `0e9e7d0` Merge pull request #116 from Acurioustractor/wip/fix-storyteller-sync-2026-05-28 _(2026-05-28)_
- `3eca6b7` fix(storytellers): repair EL-v2 schema drift, add OCAP filters, disable GHL push _(2026-05-28)_
- `982d616` Merge pull request #115 from Acurioustractor/wip/goods-operating-model-2026-05-28 _(2026-05-28)_
- `6e37258` Merge pull request #114 from Acurioustractor/wip/audience-segmentation-2026-05-28 _(2026-05-28)_
- `d436360` Merge pull request #113 from Acurioustractor/wip/goods-session-handoff-2026-05-27 _(2026-05-27)_
- `a2f102b` docs(handoff): 2026-05-27 Goods GHL CRM session — state + next-session restart _(2026-05-27)_
- `6e3bb6c` Merge pull request #112 from Acurioustractor/wip/goods-garma-showcase-2026-05-27 _(2026-05-27)_
- `2fb3ced` feat(goods): add Garma Festival beds-showcase as a demand/event opportunity _(2026-05-27)_
- `c12e3eb` Merge pull request #111 from Acurioustractor/wip/goods-grants-sales-2026-05-27 _(2026-05-27)_
- `b6391fc` feat(goods): grant sweep + SEDI fix + ALIVE-Beds sales prospects _(2026-05-27)_
- `3209986` Merge pull request #110 from Acurioustractor/wip/goods-field-strategy-2026-05-27 _(2026-05-27)_
- `12891cd` feat(ghl): org/impact field strategy — audit, ABN + rollup fields, service fix _(2026-05-27)_
- `60fb94b` Merge pull request #109 from Acurioustractor/wip/goods-followup-2026-05-27 _(2026-05-27)_
- `836599e` feat(goods): anchor councils/ACCHOs → Demand Register + warm-intro worksheet _(2026-05-27)_
- `8400364` Merge pull request #108 from Acurioustractor/wip/goods-pipeline-2026-05-27 _(2026-05-27)_
- `6983ee7` feat(goods): buyers phase — Buyer Pipeline 1→6, Demand Register +14 _(2026-05-27)_
- `b0bfaae` feat(goods): foundation pipeline — Gmail + GrantScope mine, seed 13→35 funders _(2026-05-27)_
- `dc0abfd` Merge pull request #107 from Acurioustractor/wip/civic-os-docs-2026-05-27 _(2026-05-27)_
- `adeb083` docs(civic-os): propagate Civic Operating System reframe + ALMA spell-out _(2026-05-27)_
- `c3437b4` feat(goods): GHL supporter-journey seed + buyer-pipeline cleanup _(2026-05-27)_
- `4ef11ac` Merge pull request #105 from Acurioustractor/wip/eofy-burndown-2026-05-27 _(2026-05-27)_
- `dfd8c7f` docs(recover): preserve authored civic-OS docs, plans, research from stale branch _(2026-05-27)_
- `663e02c` Merge pull request #104 from Acurioustractor/wip/session-handoff-2026-05-27 _(2026-05-27)_
- `f6ad345` docs(handoff): 2026-05-27 command-center honest-by-construction + Phase 4 _(2026-05-27)_
- `fd3d938` Merge pull request #103 from Acurioustractor/wip/cash-pipeline-fixes-2026-05-27 _(2026-05-27)_
- `29dad60` fix(lint): drop bogus eslint-disable (rule not configured here) _(2026-05-27)_
- `9251b43` fix(command-center): finance/overview cash (two-account) + /pipeline row-cap _(2026-05-27)_
- `2073464` Merge pull request #102 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `d2457f5` feat(db): add contact_project_links.ghl_contact_id — schema baseline 2→0 (fully strict) _(2026-05-27)_
- `0304eeb` Merge pull request #101 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `6feda9b` ci: Type Check & Lint runs on every PR (prereq for required check) _(2026-05-27)_
- `f8ae1b2` Merge pull request #100 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `de9ad70` ci(schema-contract): run on every PR so it can be a required check _(2026-05-27)_
- `a9f3834` Merge pull request #99 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `4f86006` fix(command-center): ALMA naming correction + supporters table sorting _(2026-05-27)_
- `fc22071` fix(command-center): wire real bank balance into /business/overview _(2026-05-27)_
- `eea127b` Merge pull request #98 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `433d47b` feat(pipeline): build + apply the /pipeline kanban populator (D3a) _(2026-05-27)_
- `de4d0fd` Merge pull request #97 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `cc6b64f` feat(cron): re-light relationship_health recompute (daily 3:15am) _(2026-05-27)_
- `801b556` docs(goods): Xero project-tagging cleanup ticket + tagging script _(2026-05-27)_
- `e763025` docs(plan): pipeline consolidation (Phase 4) — investigation + decisions _(2026-05-27)_
- `77c151a` Merge pull request #96 from Acurioustractor/wip/schema-needs-intent-2026-05-27 _(2026-05-27)_
- `de39e3f` docs(plan): record needs-intent burn-down 12→2 (P3) _(2026-05-27)_
- `3ee356b` fix(command-center): resolve 7 more needs-intent drifts (9→2) _(2026-05-27)_
- `dcffb62` fix(command-center): real fixes for api_usage + project_budgets drift (12→9) _(2026-05-27)_
- `bcace8a` Merge pull request #95 from Acurioustractor/wip/dead-table-cleanup-2026-05-27 _(2026-05-27)_
- `25cf855` chore(command-center): regenerate schema-contract baseline 36→12 (P3 burn-down) _(2026-05-27)_
- `b9b8b5a` fix(command-center): retire library dead-table queries (P3 burn-down) _(2026-05-27)_
- `3a18f64` fix(command-center): retire data-route dead-table queries (P3 burn-down) _(2026-05-27)_
- `277e06f` Merge pull request #94 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-27)_
- `e8bd7ff` fix(command-center): fix-don't-archive clean renames (P3 burn-down 47→36) _(2026-05-27)_
- `ce9c1ef` chore(command-center): archive 14 dead-table routes + team page (P3 task 2) _(2026-05-27)_
- `031d98a` docs(review): archive execution-scoping for trust-map §H (task 2 prep) _(2026-05-27)_
- `a744d1d` fix(command-center): subscriptions active filter → account_status (P3 burn-down) _(2026-05-27)_
- `e89a25d` fix(command-center): validate filter columns + fix 18 silent-zero filter drifts (P3 task 5) _(2026-05-27)_
- `2aa0722` docs(plan): update P3 honest-by-construction ledger (columns 87→64) _(2026-05-27)_
- `568b277` fix(command-center): schema burn-down 72→64 — tractable column renames _(2026-05-27)_
- `86ef6be` fix(command-center): burn down schema drift 87→72 (incl. live /harvest regression) _(2026-05-27)_
- `31fb174` feat(command-center): schema-contract test — honest by construction (P3) _(2026-05-27)_
- `61c41d0` Merge pull request #93 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-27)_
- `2b35e57` Merge pull request #92 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-27)_
- `1673c7c` Merge pull request #91 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-26)_
- `8ae1dee` Merge pull request #90 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-26)_
- `b535dee` Merge pull request #89 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-26)_
- `926154a` Merge pull request #88 from Acurioustractor/wip/harvest-stage-budget-2026-05-26 _(2026-05-26)_
- `29fecc1` docs(handoff): 2026-05-26 — Harvest finance cleanup, command-center login, /company audit _(2026-05-26)_
- `c893e2d` chore: trigger preview build with DASHBOARD_PASSWORD env _(2026-05-26)_
- `4d9e6c0` feat(auth): one-click magic-link login (/login?k=password) _(2026-05-26)_
- `61060bd` feat(auth): shared-password gate for command-center _(2026-05-26)_
- `cdd8344` feat(finance): Harvest stage/zone budget-vs-actual (garden pinned) _(2026-05-26)_
- `2e610a8` feat(finance): deep-linkable filters on transaction picker _(2026-05-26)_

### act-regenerative-studio
- `b2c3245` Merge pull request #48 from Acurioustractor/feat/payout-wall-visual _(2026-05-30)_
- `f9d59e9` feat(payout-wall): rework the visual, voices over the wall, legibility pass _(2026-05-30)_
- `96f8f1d` Merge pull request #47 from Acurioustractor/feat/confessions-ia-reframe _(2026-05-30)_
- `2525c15` feat(confessions): unify the campaign under /confessions with a persistent nav + fix the Payout Wall _(2026-05-30)_
- `16b70e5` feat(confessions): render words-only messages as readable quotes _(2026-05-30)_
- `8ee6990` Merge pull request #46 from Acurioustractor/feat/confessions-lineage-qpw _(2026-05-30)_
- `22adc10` feat(payout-wall): name the cells from the confirmed-grantmaker cut _(2026-05-30)_
- `f35e300` feat(payout-wall): correct open-door count to 113 (98.9%) + add Philanthropy Australia positioning pack _(2026-05-30)_
- `2ae4e07` Merge pull request #45 from Acurioustractor/feat/confessions-lineage-qpw _(2026-05-29)_
- `fbca021` feat(confessions): lineage trio on /confessions + QPW comms calendar _(2026-05-29)_
- `cf2ec59` Merge pull request #44 from Acurioustractor/feat/friday-tape _(2026-05-29)_
- `ee75bbe` feat(payout-wall): data-drive the concentration from a confirmed-grantmaker filter _(2026-05-29)_
- `5de30c2` feat(confessions): The Friday Tape — play the week back _(2026-05-29)_
- `47f7bb9` Merge pull request #43 from Acurioustractor/feat/confessions-payout-wall _(2026-05-29)_
- `d7c5f75` Merge pull request #42 from Acurioustractor/fix/flagship-hubs-canonical _(2026-05-29)_
- `d438a1d` feat(art): methodology + right-of-reply page, Confessions wiring, dead-cell contrast _(2026-05-29)_
- `5c61e96` feat(art): dead-capital cell-mass, mobile pass, confirmed-grantmaker cut _(2026-05-29)_
- `5d0425c` feat(art): The Payout Wall - foundation power made visible _(2026-05-29)_
- `97d4ef7` feat(confessions): real audio playback in the voicemail inbox _(2026-05-29)_
- `574247d` fix(harvest): use live theharvestwitta.com.au contact email _(2026-05-29)_
- `a05ef6e` fix(flagships): hub-canonical routing, human heroes, Pakkimjalki Kari _(2026-05-29)_
- `f4a4a36` Merge pull request #41 from Acurioustractor/fix/launch-content-pass _(2026-05-29)_
- `1662ad5` fix(launch): expand OCAP® on method/principles; copy-check guards bio leak _(2026-05-29)_
- `c253312` fix(launch): gate /people, fix /vision render, ecosystem zero-guard, footer copy _(2026-05-29)_
- `296d1be` Merge pull request #40 from Acurioustractor/fix/launch-critical _(2026-05-29)_
- `aaee965` docs(confessions): add launch newsletter + Friday playback email copy _(2026-05-29)_
- `b8d27be` fix(confessions): clean slate for launch — real voicemail, no fabricated quotes _(2026-05-29)_
- `b61f909` fix(ci): deploy with the current Vercel CLI _(2026-05-29)_
- `c715377` fix(el-sync): keep storyteller attribution and honor consent withdrawals _(2026-05-29)_
- `10c95ab` fix(seo): point syndicated /blog canonicals at the Empathy Ledger source _(2026-05-29)_
- `67a4ca2` Merge pull request #39 from Acurioustractor/launch/site-refresh-2026-05-26 _(2026-05-29)_
- `e656945` fix(launch): resolve held project chips on /people, gate confessions sample copy, de-stale brand check _(2026-05-29)_
- `2668852` feat(home): play the Confessions film in a modal + rotary-dial visual _(2026-05-27)_
- `aa91c7b` feat(launch): confessions-led homepage + project hide lever + link hardening _(2026-05-27)_
- `95bf198` docs(handoff): session summary — launch holds + forms→GHL pipeline _(2026-05-27)_
- `c120805` fix(forms): use real GHL pipeline ids (ghl_id) for opportunity routing _(2026-05-27)_
- `56d7bde` feat(forms): surface GHL opportunity result in the submit response _(2026-05-27)_
- `7bea257` fix(ghl): correct opportunities.create endpoint (trailing slash + v2023-02-21) _(2026-05-27)_
- `fa2d5fc` feat(forms): route GHL leads into pipelines (opportunities) by project code _(2026-05-27)_
- `bf4adcb` docs(crm): form -> GHL pipeline + message routing design _(2026-05-27)_
- `5262138` fix(dashboard): read form submissions from pending_form_submissions _(2026-05-27)_
- `feffe90` feat(forms): direct GHL push on the prod path (same location, same tagging) _(2026-05-27)_
- `af969a4` docs(env): document ACT_ECOSYSTEM_API_URL + Supabase as required for prod forms _(2026-05-27)_
- `36df6ba` fix(forms): route farm-stay submissions to ACT-BV (Black Cockatoo Valley) _(2026-05-27)_
- `22f346e` fix(forms): route residency submissions to ACT-AS (was invalid ACT-AR) _(2026-05-27)_
- `c964b72` docs(strategy): website review + engagement playbook; lazy-load art hero video _(2026-05-27)_
- `93673ed` feat(launch): hold /wiki surface for a later phase (longer build) _(2026-05-27)_
- `f10e688` feat(art): add Confessions to Philanthropy film as hero video + thumbnail _(2026-05-27)_
- `cd40af4` feat(art): add Confessions to Philanthropy as a portfolio artwork _(2026-05-27)_
- `8bf0673` feat(home): wire hero stats to live data + fix storyteller-hold type errors _(2026-05-27)_
- `2e55510` feat(launch): hold /storytellers and /ask surfaces for a later phase _(2026-05-27)_
- `b5b2c90` feat(ghl): tag contact-form submissions for the ACT inquiry workflow _(2026-05-27)_
- `28b51d1` feat(launch): canonical/OG metadata for all public routes + sitemap gate _(2026-05-27)_
- `4a514da` feat(confessions): remove the murmuration section _(2026-05-27)_
- `27e31fe` feat(confessions): replace switchboard with a voicemail inbox _(2026-05-27)_
- `d388985` style(confessions): vintage telephone brand refresh _(2026-05-26)_
- `31d3303` feat(confessions): Switchboard + Murmuration visualisations _(2026-05-26)_
- `a593bd3` fix(confessions): full-bleed page, edge to edge _(2026-05-26)_
- `7f6dced` feat(confessions): Confessions to Philanthropy campaign page _(2026-05-26)_
- `1ebf703` feat(site): launch-ready refresh — SEO metadata, public-copy sanitizer, /stories, externalized redirects _(2026-05-26)_

### empathy-ledger-v2
- `16acb8e0` perf(deploy): drop duplicate pre-deploy gate, now covered by branch protection (#264) _(2026-05-30)_
- `7e3673a9` perf(ci): cut PR + deploy time — drop redundant validate workflow, cache builds (#263) _(2026-05-30)_
- `83907308` feat(tour): newsletter→tour-join CTA, world-tour prerender fix, human-from + deliverability (#262) _(2026-05-30)_
- `98741450` fix(newsletter): guard GHL integration location_id (type + defensive) (#261) _(2026-05-30)_
- `3d174447` feat(newsletter): story → newsletter bridge + admin send button (#260) _(2026-05-30)_
- `3def8629` feat(impact): ACT services tracker + live Goods on Country impact (#259) _(2026-05-30)_
- `ce8d56b2` fix(impact): resolve org slug→UUID on the org impact page (#258) _(2026-05-30)_
- `303a4ea4` fix(impact): close the orphaned global_impact_intelligence rollup (#257) _(2026-05-30)_
- `b5b5701b` feat(impact): unified admin impact cockpit (item 5) (#256) _(2026-05-30)_
- `1d645be3` feat(impact): services tier + Goods claim-label taxonomy on outcomes (#255) _(2026-05-30)_
- `c9b06690` feat(impact): surface theory of change above org impact metrics (#254) _(2026-05-30)_
- `508ddce5` feat(impact): rollup freshness badge on org impact dashboard (#253) _(2026-05-30)_
- `da8ebcc5` feat(impact): close the outcomes → story evidence loop (#252) _(2026-05-30)_
- `b6b1d4ec` feat(org+admin): loop workspace, identity menu, platform cockpit, ToC editor (#251) _(2026-05-30)_
- `88774842` perf+ux(admin): server-render the dashboard, declutter, consolidate (#250) _(2026-05-29)_
- `fd17d1a3` fix(intelligence): revive the analysis pipeline (rollup + consent-gated analysis) (#249) _(2026-05-29)_
- `f54089e9` feat(outcomes): org outcomes entry surface + per-org service_area (Option A) (#248) _(2026-05-29)_
- `a5a24604` fix(sovereignty): close elder-gate is_public bypass + deny NULL media visibility + cascade withdrawal to media (#247) _(2026-05-29)_
- `962e8253` feat(capture): URL-locked mobile capture /capture/m with consent gate + offline queue (#246) _(2026-05-29)_
- `f32181cb` fix(world-tour): null hardcoded partner contact names in locations.ts (#244) _(2026-05-29)_
- `6275b06c` fix(rls): org-scope authenticated ALL policies on stories/media/story_drafts (#243) _(2026-05-29)_
- `35ea574f` fix(world-tour): soul quick wins — gate anon quotes, fix capture, retire test fixtures (#242) _(2026-05-29)_
- `74d5962e` docs(world-tour): session plans, outreach queue, and handoff (29 May 2026) _(2026-05-29)_
- `944cc821` fix(world-tour): stop rendering partner contact names on public stop pages _(2026-05-29)_
- `aa2afff7` feat(world-tour): segment GHL contacts by stop and lane _(2026-05-29)_
- `bbd056e2` fix(world-tour): remove unconsented + sensitive personal data from public site _(2026-05-29)_
- `2691bdf7` feat(world-tour): realign route + dates to locked 27 Jun-7 Aug flights _(2026-05-29)_
- `83bc80e8` docs(rls): draft Step 2 org-scope migration + test checklist _(2026-05-27)_
- `564547f7` fix(rls): close anon-write holes on notifications + report_section_drafts _(2026-05-27)_
- `a61aa280` fix(rls): close critical anon read/write hole on stories, media_assets, story_drafts _(2026-05-27)_
- `2a9599b8` fix(rls): close public/cross-tenant leaks on financials, tokens, drafts _(2026-05-27)_
- `196ec56d` chore(repo): preserve 2026-05-23 handoff, untrack drift-detector artifacts _(2026-05-27)_
- `a2c674ef` docs(handoff): tenant alignment session shipped _(2026-05-27)_
- `6d8f5ddd` feat(tenants): tenant structure + alignment closing session _(2026-05-27)_
- `fe376ec7` chore(build): fix prefer-const reassignment in cohort-folders _(2026-05-26)_
- `1a0bcd88` feat(accountability): server-resolve org from storyteller in /ai-runs _(2026-05-26)_
- `20a0b87c` docs(handoff): record Path A.1 desktop auth audit + Phase 2 plan _(2026-05-26)_
- `11f5531a` chore(auth): Phase A.1 — gate /api/desktop/* with requireAdminAuth _(2026-05-26)_
- `e072567d` docs(handoff): record post-CI state for 2026-05-26 evening session _(2026-05-26)_
- `654b5058` chore(test): cross-tenant-substitution — recognise resolveServiceToken _(2026-05-26)_
- `e238431a` chore(test): api-auth-coverage — recognise resolveServiceToken + 3 public routes _(2026-05-26)_
- `fbb0f5d7` chore(lint): fix 5 pre-existing errors blocking production deploys _(2026-05-26)_
- `7888bbae` chore(rls): Phase A11 Tier 2.B — drop 5 over-permissive write policies _(2026-05-26)_
- `43063c7e` feat(accountability): storyteller-facing pages — consent control room + ai-log _(2026-05-26)_
- `c07c1a32` feat(accountability): native /api/ai-runs reader + analyzer ledger hook _(2026-05-26)_
- `c2030e06` feat(accountability): kernel barrel + /api/v1/accountability/* surface _(2026-05-26)_
- `6963e7e5` feat(accountability): ai_runs + accountability_events ledger schema _(2026-05-26)_
- `27eb7f3c` docs(handoff): 2026-05-26 — Phase A7→A11 shipped, Tier 2.B + Tier 3 remain _(2026-05-26)_
- `61b1188d` chore(rls): Phase A11 Tier 1.C — RLS on 3 remaining non-sensitive tables _(2026-05-26)_
- `984f37dc` chore(rls): Phase A11 Tier 2.A — drop 9 over-permissive write policies _(2026-05-26)_
- `416f8239` chore(rls): Phase A11 Tier 1.B — enable RLS on timeline_events cluster _(2026-05-26)_
- `ca7ab845` chore(rls): Phase A11 Tier 1 — enable RLS on kinship_relations (sovereignty) _(2026-05-26)_
- `1cb57991` docs(plan): Phase A11 RLS hardening — audit findings + remediation roadmap _(2026-05-26)_
- `a15b665c` ci: add workflow_dispatch for manual triggers (verification + future debug) _(2026-05-26)_
- `6f1f936d` ci: add tenant-drift job — verify zero tenant_id drift on every PR (Phase A9) _(2026-05-26)_
- `d604cfd5` chore(tenants): drift detector + audit reports (Phase A8 tooling) _(2026-05-26)_
- `12e835a5` fix(admin): storytellers/[id] — add per-storyteller org auth on PATCH/PUT _(2026-05-26)_
- `792d295b` fix(admin): editorial-command/bulk — close cross-tenant write paths _(2026-05-26)_
- `80efc681` chore(schema): Phase A7 — close last nullable tenant_id surfaces _(2026-05-26)_
- `cbe801ba` chore(schema): Phase A6 steps 3+4 — install 18 triggers + NOT NULL lock 9 tables _(2026-05-25)_
- `e5ca0810` chore(schema): Phase A6 steps 1+2 — fix broken tenant_ids + sensitive drift _(2026-05-25)_
- `5f566f52` chore(schema): Phase A drift — bulk mechanical fix on 11 unambiguous tables _(2026-05-25)_
- `8073c965` fix(admin): EnhancedMediaPicker — scope by project_id alone when a project is selected _(2026-05-25)_
- `fb0e617b` chore(schema): Phase A follow-up — default-tenant content drift cleanup _(2026-05-25)_
- `6f27c4fd` chore(schema): Phase A follow-up — full storyteller_organizations drift sweep _(2026-05-25)_
- `72e7a68b` chore(schema): Phase A follow-up #3 final — re-tenant Ben's story, hard-delete pcyc fixtures _(2026-05-25)_
- `14662b14` chore(schema): Phase A follow-up #3 Tier 2 — named decisions + so drift correction _(2026-05-25)_
- `3568e017` chore(schema): Phase A follow-up #3 Tier 1 — re-tenant 24 orphan-tenant profiles _(2026-05-25)_
- `1e5e101d` chore(schema): Phase A follow-up #3 — delete 11 orphan tenants (zero-data only) _(2026-05-25)_
- `355da050` chore(phase-a): add verify-a4-coverage.mjs for the 25 storyteller-linked tables _(2026-05-25)_
- `0d5e8a57` docs(handoff): phase A follow-ups — defer trove orphans, ship platform tenant fix _(2026-05-25)_
- `1880f463` chore(tenants): centralise PLATFORM_TENANT_ID, remove all-zeros fallback _(2026-05-25)_
- `9d39702e` docs(handoff): 2026-05-25 evening — Phase A tenant ownership shipped _(2026-05-25)_
- `ccae8000` chore(schema): Phase A5 — correct media_assets cross-tenant drift + attach trigger _(2026-05-25)_
- `a2955e36` chore(schema): Phase A4.2 — backfill tenant_id, lock NOT NULL, install storyteller trigger _(2026-05-25)_
- `5198da89` chore(schema): Phase A4.1 — add nullable tenant_id to 25 storyteller-linked tables _(2026-05-25)_
- `e9f666fe` chore(schema): Phase A3 — backfill tenant_id, lock NOT NULL, install auto-fill trigger _(2026-05-25)_
- `f6f82507` fix(audit): pass tenant_id explicitly to super_admin_audit_log inserts _(2026-05-25)_
- `9426133c` chore(schema): Phase A2 — add nullable tenant_id to 53 tables _(2026-05-25)_
- `348669e8` chore(schema): Phase A2 prep — drafts for tenant_id column add (not applied) _(2026-05-25)_
- `d7aad9a8` chore(schema): drop dead story_syndication_consent family _(2026-05-25)_
- `7a28df84` feat(api): storytellers strangler batch — 5 routes migrated to v2 platform _(2026-05-25)_
- `a1938e6e` docs(handoff): 2026-05-25 session — strangler + widgets + tenant ownership _(2026-05-25)_
- `1fa7e163` fix(uploads): gallery uploads were silently using DEFAULT_TENANT_ID _(2026-05-25)_
- `72272870` feat(embed): <el-hero-video> for full-bleed background video sections _(2026-05-25)_
- `0ee3cf06` feat(ownership): canonical resolver for tenant_id / org_id / storyteller_id _(2026-05-25)_
- `74b2daee` fix(gallery-consent): galleries table has no tenant_id, derive from org _(2026-05-25)_
- `c7192345` feat(api): strangler batch 3, organizations (+ slug, + people) _(2026-05-25)_
- `52128d8a` feat(syndication): story consent matrix UI _(2026-05-25)_
- `45b38b43` feat(api): strangler batch 2, +interest (POST) and analytics/network _(2026-05-25)_
- `b6dcdf03` feat(embed): partner-ready packaging — v1.min.js + integration doc _(2026-05-25)_
- `05addd18` feat(embed): per-site story widget _(2026-05-25)_
- `d401044e` feat(galleries): fallback cover image from first photo when cover_image is null _(2026-05-25)_
- `8bb200fa` feat(embed): per-site widgets + admin consent matrix _(2026-05-25)_
- `31749bac` fix(embed-demo): hydration mismatch on inline style tag _(2026-05-25)_
- `982ee090` feat(embed): drop-in widget library v1 + live demo page _(2026-05-25)_
- `f0d8170f` feat(api): strangler batch 1, four more public routes onto /v2/platform/* _(2026-05-25)_
- `f0e1fe11` feat(api): strangler migration worked example, featured-stories on /v2/platform/* _(2026-05-25)_

### JusticeHub
- `978d6cf` feat(justice-matrix): issue surface gate + 5 more issues (#33) _(2026-05-30)_
- `770baf3` feat(justice-matrix): Issue Profiles — the weave screen (#32) _(2026-05-30)_
- `c80c557` security: purge committed service_role keys + add secret-scan guard (#29) _(2026-05-30)_
- `8f28113` feat(justice-matrix): CanLII adapter for Canadian refugee jurisprudence (#31) _(2026-05-30)_
- `374ab8a` feat(justice-matrix): featured 'Start here' rail on the hub (#30) _(2026-05-30)_
- `545e217` Merge pull request #27 from Acurioustractor/feat/justice-matrix-scanner _(2026-05-30)_
- `f64abb3` fix(justice-matrix): HUDOC enricher write-retry also catches "fetch failed"/network _(2026-05-30)_
- `2798819` feat(justice-matrix): HUDOC enricher uses MiniMax-M2.7, tighter prompt, resilient writes _(2026-05-30)_
- `680cb21` chore(llm): default backfill scripts to free/cheap providers, Anthropic last-resort (cost) _(2026-05-30)_
- `a169244` Merge: real-source HUDOC enricher (ECtHR API) _(2026-05-30)_
- `aeeec65` feat(justice-matrix): real-source HUDOC enricher (ECtHR API) _(2026-05-30)_
- `5ccd0f8` Merge: legal-review loop + grounded summary enricher _(2026-05-29)_
- `838eb7c` feat(justice-matrix): grounded case-summary enricher (#1, thin excerpts) _(2026-05-29)_
- `e1db935` feat(justice-matrix): pro bono legal-review loop for AI-extracted cases _(2026-05-29)_
- `daddec1` Merge: explore search depth (full-set, reactive facets, Court + Era) _(2026-05-29)_
- `c979a95` feat(justice-matrix): explore search depth — full set, reactive facets, Court + Era (searchability) _(2026-05-29)_
- `d8b2c90` Merge: Justice Matrix refugee re-centring + entry-depth fixes _(2026-05-29)_
- `fe21fb1` feat(justice-matrix): Asia non-refoulement seeds + resilient auto-publish (SE Asia gap) _(2026-05-29)_
- `f5b1199` feat(justice-matrix): offshore-detention seed cases (refugee re-centring) _(2026-05-29)_
- `0c2db7b` feat(justice-matrix): Anthropic-independent source-link resolver (#6) _(2026-05-29)_
- `c784444` feat(justice-matrix): clean case-type taxonomy + report/inquiry overlay (#8) _(2026-05-29)_
- `6c9ad03` Merge: evidence backfill enum fix (#5) _(2026-05-29)_
- `7e1c926` fix(justice-matrix): evidence backfill respects effect_size enum + reports write failures _(2026-05-29)_
- `93f454a` Merge: evidence quantitative-spine backfill (#5) _(2026-05-29)_
- `d23d8a8` feat(justice-matrix): evidence quantitative-spine backfill (#5, the researcher gap) _(2026-05-29)_
- `a2e46f2` Merge: ingest enrichment + CrossRef DOI + clear false verified (#20) _(2026-05-29)_
- `f28c9eb` feat(justice-matrix): deterministic ingest enrichment + CrossRef DOI backfill _(2026-05-29)_
- `b17630c` Merge: EDAL adapter (#19) _(2026-05-29)_
- `fc77a5c` feat(justice-matrix): EDAL adapter (European Database of Asylum Law, ~1,829 summaries) _(2026-05-29)_
- `aec7907` Merge: Confirm-review button + CLI sweep + CourtListener relevance gate (#18) _(2026-05-29)_
- `3265299` fix(justice-matrix): CourtListener adapter gates on the relevance signal _(2026-05-29)_
- `2f28c6a` feat(justice-matrix): wire HUDOC + CourtListener into the CLI scanner _(2026-05-29)_
- `1492526` feat(justice-matrix): admin "Confirm legal review" button (dual-control step 2) _(2026-05-29)_
- `5472690` Merge: Justice Matrix — explore rebuild, two-surface engine, consent gate, live scrapers, governance v1 (#17) _(2026-05-29)_
- `506cf6b` feat(justice-matrix): daily auto-publish cron (decouple visibility from confirmation) _(2026-05-29)_
- `2f6e909` feat(justice-matrix): unlock HUDOC + CourtListener, broaden CJEU, raise scan limit _(2026-05-29)_
- `a5cf27c` fix(justice-matrix): youth surface is scope-only so the evidence lane shows _(2026-05-29)_
- `6ee2b52` feat(justice-matrix): governance v1 — disclaimer, CC-BY-NC, dual-control sign-off _(2026-05-29)_
- `2b7b07c` feat(justice-matrix): live-verified HUDOC + CourtListener scrapers, wired into scan-json _(2026-05-29)_
- `c35e0ac` feat(justice-matrix): two-surface lens (refugee + youth) over one engine _(2026-05-29)_
- `c37c4c7` feat(justice-matrix): HUDOC + CourtListener adapter scaffolds (NOT yet wired) _(2026-05-29)_
- `443206e` feat(justice-matrix): honest provenance, type split, community-held consent, moat + digest _(2026-05-29)_
- `8b1d2cd` fix(justice-matrix): remove em dashes from insights copy _(2026-05-29)_
- `bf0142c` feat(justice-matrix): research-tool landing page that funnels into explore _(2026-05-29)_
- `46619e9` feat(justice-matrix): rebuild explore as a search-first research tool _(2026-05-29)_
- `3acf8c6` feat(justice-matrix): Claude-first provider in deep-fields backfill _(2026-05-29)_
- `bd6b256` feat(justice-matrix): retry-on-JSON-fail + nightly facts backfill cron _(2026-05-29)_
- `364b345` feat(justice-matrix): AU/global scope lens + verified provenance on explore _(2026-05-29)_
- `3058cb5` feat(justice-matrix): evidence detail page with reverse case/campaign links _(2026-05-29)_
- `ffd00eb` feat(justice-matrix): consent-gated ALMA evidence in explore + case pages _(2026-05-29)_
- `f544065` feat(justice-matrix): public explore UX, auto-publish, deep case fields _(2026-05-29)_
- `0c2a013` feat(justice-matrix): one-click "Enrich from source" in reviewer queue _(2026-05-28)_
- `bc1ceba` chore(justice-matrix): deactivate non-case sources + broken DNS _(2026-05-28)_
- `e18c762` feat(justice-matrix): scanner uses model-router (provider-agnostic) _(2026-05-28)_
- `d37e475` feat(justice-matrix): MiniMax-routed source-link backfill _(2026-05-28)_
- `65af2a5` feat(justice-matrix): web-search-enabled source-link backfill _(2026-05-28)_
- `466e15f` feat(justice-matrix): source-link backfill with HEAD verification _(2026-05-28)_
- `deea07f` feat(justice-matrix): default case list to court decisions + drop placeholders _(2026-05-28)_
- `00f411b` feat(justice-matrix): health dashboard + case_type taxonomy _(2026-05-28)_
- `0de1059` feat(justice-matrix): add-source form at /admin/justice-matrix/sources/new _(2026-05-28)_
- `0475b5f` feat(justice-matrix): keep embeddings current (real-time + nightly) _(2026-05-28)_
- `b7f97dd` feat(justice-matrix): CLI scanner uses the shared semantic-dedup helper _(2026-05-28)_
- `0fdf711` feat(justice-matrix): cron scanner flags semantic near-duplicates _(2026-05-28)_
- `5f6e725` feat(justice-matrix): pgvector embeddings + semantic dedup foundation _(2026-05-28)_
- `a63c718` feat(justice-matrix): editorial insights page _(2026-05-28)_
- `073b06a` feat(justice-matrix): public partner-contribution portal _(2026-05-28)_
- `b38f8d1` feat(justice-matrix): editorial landing at /justice-matrix _(2026-05-28)_
- `de205c0` feat(justice-matrix): cross-link the two admin surfaces _(2026-05-28)_
- `3e65c06` chore(justice-matrix): migration capturing category canonicalisation _(2026-05-28)_
- `431c6b4` feat(justice-matrix): key_holding backfill script for verified cases _(2026-05-28)_
- `9146b54` feat(justice-matrix): faceted campaign list at /justice-matrix/campaigns _(2026-05-28)_
- `31bbafc` feat(justice-matrix): weekly Vercel cron for JSON-API source scans _(2026-05-28)_
- `3f9fd87` feat(justice-matrix): source-health admin at /admin/justice-matrix/sources _(2026-05-28)_
- `1440600` feat(justice-matrix): public campaign profile page _(2026-05-28)_
- `22f61c3` fix(justice-matrix): gate admin page + API writes (close auth hole) _(2026-05-28)_
- `65b19a3` feat(justice-matrix): faceted case list at /justice-matrix/cases _(2026-05-28)_
- `4e78d26` feat(justice-matrix): public case profile page _(2026-05-28)_
- `7add2b6` feat(justice-matrix): reviewer queue v2 (split layout, inline edit) _(2026-05-28)_
- `a515475` feat(justice-matrix): add CJEU JSON-API adapter to scanner _(2026-05-28)_
- `fb60ed5` feat(justice-matrix): implement source scanner _(2026-05-28)_
- `2408438` supabase: track 9 migrations into version control _(2026-05-27)_
- `993b46e` chore: untrack build/cache noise + extend gitignore _(2026-05-27)_
- `4d3bb09` contact: tag GHL contacts with act-inquiry + project-justicehub _(2026-05-27)_

### grantscope
- `3408a90` feat(cron): re-runnable entity source_datasets reconciliation _(2026-05-30)_
- `c257ac3` Merge pull request #53 from Acurioustractor/feat/cron-qld-foundation-discovery _(2026-05-30)_
- `187f6a6` feat(cron): QLD-prioritised foundation-program discovery agent _(2026-05-30)_
- `147a166` Merge pull request #52 from Acurioustractor/fix/sync-foundation-programs-url-geo _(2026-05-30)_
- `eeaff20` Merge pull request #51 from Acurioustractor/fix/discover-resilience-2026-05-30 _(2026-05-30)_
- `94fe1c8` fix(sync): unique per-program URLs + carry geography into the finder _(2026-05-30)_
- `03b357c` fix(discover): survive transient Supabase failures instead of crashing _(2026-05-30)_
- `588c77b` Merge pull request #50 from Acurioustractor/fix/discover-exclude-operators-2026-05-30 _(2026-05-30)_
- `bb97444` fix(discover): exclude non-grantmaker types from program discovery _(2026-05-30)_
- `afdf1b3` Merge pull request #49 from Acurioustractor/fix/grant-finder-tokenize-geo-2026-05-30 _(2026-05-30)_
- `c413f58` feat(discover): add --geo filter to target one state's foundations _(2026-05-30)_
- `5a4c699` Merge pull request #48 from Acurioustractor/fix/grant-finder-tokenize-geo-2026-05-30 _(2026-05-30)_
- `70ce705` fix(grants): tokenise search + read state names as geo filters _(2026-05-30)_
- `fc42b91` Merge pull request #47 from Acurioustractor/wip/remove-goods-funder-view-2026-05-28 _(2026-05-28)_
- `2e22636` refactor(goods): move funder cost-evidence artifact to Goods v2 _(2026-05-28)_
- `ae25ebe` Merge pull request #46 from Acurioustractor/wip/goods-cost-allocation-2026-05-28 _(2026-05-28)_
- `3c962b5` feat(goods): v3 cost model in funderView — scenarios + Idiot Index + founder split + fundraising offset _(2026-05-28)_
- `2f5fa06` feat(goods): Phase 2 — 429 mapping + data-quality flags + capital split; Phase 3 — funder cost-evidence artifact _(2026-05-28)_
- `5b7912e` feat(goods): cost-allocation table on the project page (Phase 1) _(2026-05-28)_
- `98eabc3` Merge pull request #45 from Acurioustractor/wip/goods-impact-data-registry-2026-05-28 _(2026-05-28)_
- `df72d64` chore(goods): register build-goods-impact-data agent _(2026-05-28)_
- `a48a431` Merge pull request #44 from Acurioustractor/wip/goods-impact-video-2026-05-28 _(2026-05-28)_
- `6b0e227` Merge pull request #43 from Acurioustractor/wip/goods-funnel-navlink-2026-05-28 _(2026-05-28)_
- `6905cd7` Merge pull request #42 from Acurioustractor/wip/goods-funnel-dashboard-2026-05-28 _(2026-05-28)_
- `493cd38` Merge pull request #41 from Acurioustractor/wip/goods-operating-model-2026-05-28 _(2026-05-28)_
- `9909660` Merge pull request #40 from Acurioustractor/wip/goods-phase1-discovery-surface-2026-05-28 _(2026-05-28)_
- `035410b` feat(goods): 3-pipeline unit-ledger roll-up (read-only cockpit) _(2026-05-28)_
- `d0df78d` docs(goods): mark Phase 1 plan BUILT (C/A/B committed, awaiting push) _(2026-05-28)_
- `f6ab6af` feat(goods): Phase 1 — capital pipeline panel + procurement badges in workbench _(2026-05-28)_
- `1778d7c` feat(goods): Phase 1 — discovery_method filter chip on /grants _(2026-05-28)_
- `0fc6e11` feat(goods): Phase 1 — repeat-buyer intel from austender_contracts (read-only) _(2026-05-28)_
- `d3d19ab` Merge pull request #39 from Acurioustractor/wip/goods-open-tenders-2026-05-27 _(2026-05-28)_
- `a2831bb` feat(goods): Phase 3 — AusTender open-tender (ATM) ingestion _(2026-05-27)_
- `f8f0bdc` docs(goods): lock Phase 3 (open-tender feed) as item #3 build priority _(2026-05-27)_
- `5910b20` docs(goods): scope item #3 — capital + procurement pipelines _(2026-05-27)_
- `c435b74` fix(goods): seeder net-new path — INSERT + 23505-skip (partial unique index) _(2026-05-27)_
- `d9a40cc` feat(goods): source-vector ingest seeder (review-first) + fellowship scoring carve _(2026-05-27)_
- `b843ee9` feat(goods): de-noise grant scoring — source/provider disqualifiers + SEDI signal _(2026-05-27)_
- `5ef9d6c` feat(goods): backfill anchor councils + ACCHOs into goods_procurement_entities _(2026-05-27)_
- `259d090` feat(goods): buyer-pipeline activation + entity-graph data-quality _(2026-05-27)_

### The Harvest Website
- `b555dde` Add 20 June RSVP workflow specs + fix Member Reconfirm segment _(2026-05-30)_
- `c459e8b` Add 20 June launch burndown + plan (workflow-generated, voice-checked) _(2026-05-29)_
- `3ac4f03` Add ready-to-use broker brief + council call script to run sheet _(2026-05-29)_
- `f433d95` Reconcile 20 June launch readiness: run sheet + drift fixes _(2026-05-29)_
- `70b1dfc` Add the consolidated planning layer: master plan, build plan, and 20 June launch readiness (#22) _(2026-05-28)_
- `ff38d0b` Add the shop operating system doc _(2026-05-28)_
- `0a2f991` Add the email operating system doc _(2026-05-28)_
- `6a18c3e` Add the Harvest philosophy doc and calendar booking tags _(2026-05-28)_
- `b487759` Soften the Witta shop claim and source the population figure _(2026-05-28)_
- `947aa2e` Split 20 June launch into makers' morning + community pizza evening _(2026-05-27)_
- `153a1aa` Add Calendars setup + 20 June members'-day RSVP to the runbook _(2026-05-27)_
- `b806931` Add June 2026 content calendar with drafted copy _(2026-05-27)_
- `9d9fd2d` Add GHL setup runbook; defer Partners; simplify receipts to tag-triggers _(2026-05-27)_
- `820d1b2` Wire Harvest Inbox + Shop pipelines, separate them from shared ACT location _(2026-05-27)_
- `68382ef` Right-size to three GHL pipelines, defer Bookings, keep funders in ACT _(2026-05-27)_
- `269ce4b` Plan four GHL pipelines and the no-portal membership decision _(2026-05-27)_
- `aa89717` Add GHL pipeline playbook and route shop EOIs to a Shop pipeline _(2026-05-27)_
- `3b22440` Add /shop front door and lighten the shop intake form _(2026-05-27)_
- `c2b93c4` Add act-inquiry and project-harvest tags to contact-form GHL push _(2026-05-27)_
- `061a165` Apply the follow-along footer to the live BauhausFooter _(2026-05-26)_
- `f5bc3f0` Make the site footer a follow-along signup, not a member join _(2026-05-26)_
- `32e52a5` Add community engagement + membership system docs _(2026-05-26)_
- `eb95c52` Add npm run verify:forms:ghl helper for end-to-end form testing _(2026-05-25)_
- `537ac10` Soften Shop entity wording + Cedar Witta-origin claim per audit _(2026-05-25)_
- `2ebbddf` Brief for the three offline calls: council, broker, Susie + Joey _(2026-05-25)_
- `e911ad9` Draft Article 02 — The Garden (Susie + Joey) for W-2 publish _(2026-05-25)_
- `41bf02e` Strip em-dashes from W-2 nudge and W-1 practical note copy _(2026-05-25)_
- `550bfb1` Add witta-soft-opening tag to audit script _(2026-05-25)_
- `0fa0407` Add soft-opening RSVP headcount script + tag _(2026-05-25)_
- `c6dc858` Ship launch-week polish for 20 June soft opening _(2026-05-25)_

---

_Generated by `scripts/weekly-ecosystem-digest.mjs`. Window: 2026-05-25 → 2026-06-01. Plan slugs validated against `thoughts/shared/plans/` in this repo._
