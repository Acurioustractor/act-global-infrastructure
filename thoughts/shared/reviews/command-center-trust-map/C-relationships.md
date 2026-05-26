---
title: Command-Center Trust Map — C. Relationships, people, pipeline, opportunities, comms
date: 2026-05-26
author: Claude (audit agent)
scope: app/api/{contacts,relationships,supporters,pipeline,opportunities,ghl,entities,communications,emails,development,business-dev}/** + pages {supporters,pipeline,people,people/[id],people/duplicates,opportunities,development}
ground_truth: thoughts/shared/reviews/command-center-trust-map/_schema-truth.md
verified_against: shared DB tednluwflfhxyucgwigh, 2026-05-26
---

# C — Relationships, people, pipeline, opportunities, comms

## Top findings

- **The contact/relationship intelligence layer is LIVE, not frozen — because the live routes deliberately route AROUND the stale `relationship_health` table.** `relationships/{list,attention,overdue,health,nudges}` and `contacts/[id]` all recompute "temperature" on the fly from `ghl_contacts.last_contact_date` + `communications_history` (both fresh to 2026-05-25/26). They never read the STALE-27d `relationship_health` snapshot. So the day-to-day people/relationship views are real.
- **The canonical contact store is `ghl_contacts` (2,276 rows, fresh).** Every contacts/* and relationships/* route reads it correctly. The dead `contacts` table (per _schema-truth) is referenced NOWHERE in this scope — that bug lives only in the /company intelligence route, not here. Same for `communications`: all email/comms routes here correctly use `communications_history` (27,186 rows, fresh), not the dead `communications` table.
- **There are THREE overlapping "pipeline" surfaces, and only one is live data.** (1) `/pipeline` page → `/api/pipeline` → `relationship_pipeline` table = **STALE since 2026-03-12** (1,170 rows, 2.5mo abandoned, same era as fundraising_pipeline). (2) `/api/pipeline/board` → `ghl_opportunities`+`ghl_pipelines` = the **real, fresh** GHL kanban (subject to the 500-row cap). (3) `/api/pipeline/unified` + `/api/opportunities` → `opportunities_unified` (fresh but grant-noise) + `fundraising_pipeline` (ABANDONED). The flagship `/pipeline` page is reading the dead one.
- **Two stale/abandoned pipelines still feed `/api/opportunities`:** it triple-merges grants + GHL + `fundraising_pipeline` (14 rows, abandoned 2026-03-06) and enriches with `relationship_health` (stale 27d). The fundraising rows and the relationshipTemp/daysSinceContact enrichment are frozen, but they're a small minority of the merged output.
- **`/api/business-dev` is fully broken** — its first query hits `business_initiatives` (DEAD table), which `throw`s → whole route 500s. The `/development` page's "business dev" widgets that depend on it get nothing.
- **`/api/development/contacts` is broken** (reads/writes `repo_contacts`, a DEAD table → errors/empty). `/api/development/overview` survives only because it wraps `repo_contacts` in `Promise.allSettled` (graceful empty); its core is GitHub API + `ecosystem_sites` + `repo_project_links` (all real).
- **The entity-resolution layer is real and populated.** `/people/duplicates` → `/api/entities/{matches,merge}` reads `v_duplicate_review_queue`, `entity_identifiers`, `entity_potential_matches` (620 rows, 559 pending), `canonical_entities`, `entity_merge_log` — all EXIST. This is a distinct, working dedup surface from the contacts-level `/api/contacts/duplicates`.
- **The `/supporters` page is the genuine "CRM at a glance" surface** and it's fresh: reads `supporters_intelligence` (158 rows) + `supporter_comms_summary` + `project_pipelines` (39 rows) — daily-rebuilt aggregate tables from the 2026-05-23 communication-pipeline plan. This is the most trustworthy relationship roll-up in scope.
- **Column-drift landmines (run-without-error, return null/skip):** `opportunities/update` writes `fundraising_pipeline.target_amount`/`.project_code` (cols don't exist → silent no-op for that source); `pipeline/search` reads `foundations.annual_giving_total` (real col `total_giving_annual` → foundation value always null); `ghl/opportunities` filters `pipeline_id` / reads `o.value` (real cols `ghl_pipeline_id`/`monetary_value`).
- **Dead-table writes that silently no-op (harmless but misleading):** `pipeline/unified` PATCH inserts into `opportunity_stage_history` (DEAD) → stage history never recorded; `communications/pending` reads `agent_insights` (DEAD) → the "follow-up suggestions" sub-list is always empty; contacts `merge`/DELETE loop over several dead FK tables (`donations`, `contact_activities`, etc.) as best-effort deletes — no functional harm.

## Surface-by-surface

| Surface | Shows / returns | Lineage (table.cols · API · transform) | Verdict | Root cause / note | Fix |
|---|---|---|---|---|---|
| **API `contacts/route` (POST)** | Create contact | GHL create → insert `ghl_contacts` | 🟢 real | Canonical store, correct cols. | — |
| **API `contacts/all`** | Paginated contacts + projects + last email + pipeline $ | `ghl_contacts` + `communications_history` (latest) + `ghl_opportunities` (sum) + `projects.ghl_tags` map | 🟢 real | All fresh tables, correct cols. DELETE loops over some dead FK tables (best-effort). | — |
| **API `contacts/search`** | Typeahead contacts | `ghl_contacts` ilike name/email/company | 🟢 real | — | — |
| **API `contacts/duplicates`** | Email/name dup sets + blanks | `ghl_contacts` full scan, paginated | 🟢 real | Correct cols; full pagination. | — |
| **API `contacts/merge` (POST)** | Merge dup contacts | `ghl_contacts` update + repoint `communications_history` + delete dead FK tables | 🟢 real | Core merge correct; FK-cleanup loop hits dead tables but ignores errors. | drop dead tables from loop |
| **API `contacts/[id]` (GET/PATCH)** | Contact detail + computed engagement | `ghl_contacts` + `communications_history` counts; temp computed from recency | 🟢 real | Computes its own temperature — does NOT read stale relationship_health. PATCH dual-writes GHL. | — |
| **API `contacts/[id]/interactions`** | Comms timeline | `communications_history` by ghl_contact_id | 🟢 real | Fresh. | — |
| **API `contacts/[id]/meetings`** | Meetings for contact | `calendar_events` contains ghl_contact_ids | 🟢 real | Real table; no count-everything bug (scoped to one contact). | — |
| **API `contacts/[id]/opportunities`** | Contact's deals | `ghl_opportunities` by ghl_contact_id | 🟢 real | Subject to 500-cap upstream. | — |
| **API `contacts/[id]/link-project` (POST/DEL)** | Link contact↔project | `contact_project_links` upsert | 🟢 real | Table EXISTS (verified, 6 cols). | — |
| **API `contacts/[id]/vote` (POST)** | Up/down vote on contact | `contact_votes` insert + `communications_history` snapshot | 🟢 real | Table EXISTS (verified, 5 cols). | — |
| **API `relationships/list`** | Relationship cards by temp | `ghl_contacts` only; temp derived from `last_contact_date` | 🟢 real | Bypasses stale relationship_health entirely. Fresh. | — |
| **API `relationships/attention`** | Contacts 14–60d silent | `ghl_contacts.last_contact_date` window | 🟢 real | Hardcoded temp=50 (cosmetic), data fresh. | — |
| **API `relationships/overdue`** | >30d / never contacted | `ghl_contacts.last_contact_date` | 🟢 real | Fresh; temp=20 hardcoded label. | — |
| **API `relationships/health`** | Hot/warm/cool + LCAA tallies | `ghl_contacts` recency + engagement_status→LCAA map | 🟢 real | Derived live from fresh contacts; no stale-table dep. | — |
| **API `relationships/nudges`** | Cold active/prospect + last context | `ghl_contacts` + `communications_history` last msg | 🟢 real | Fresh. | — |
| **API `relationships/touchpoints`** | needsFollowUp / goingCold / wins / partners | **`relationship_health`** (temp, days_since, total_touchpoints, **`last_touchpoint_date`**) + `communications_history` + `ghl_contacts` + `ghl_opportunities` | 🟡 stale + 🔴 col-drift | Only relationships route that reads the **STALE-27d** snapshot; categorisation frozen at 2026-04-29. Also selects `last_touchpoint_date` which does NOT exist (real `last_contact_at`) → that field null. | Re-run relationship_health job OR rewrite to derive live like the sibling routes; fix col name |
| **API `relationships/[id]/snooze` (POST)** | Snooze a contact | writes `relationship_health.snoozed_until` | 🟡 stale | Col exists, but writing into a snapshot table that isn't being regenerated; effect invisible to the live routes (which don't read relationship_health). | point snooze at a live store |
| **API `supporters/route`** | Unified supporter roll-up (tier, $ paid/outstanding, opps, last touch) | `supporters_intelligence` (158) + `supporter_comms_summary` (by domain) [+ `project_pipelines` per header] | 🟢 real | Daily-rebuilt aggregate tables (2026-05-23 plan). The trustworthy CRM glance. | confirm daily cron actually runs |
| **PAGE `/supporters`** | Tier cards, outstanding alerts, needs-reply, comms | → `/api/supporters` + `/api/funder-briefs` | 🟢 real | Renders the live supporter aggregate. | — |
| **API `pipeline/route` (GET/POST)** | Relationship board by stage/urgency | **`relationship_pipeline`** (1,170 rows) | 🔴 stale-abandoned | Table **STALE since 2026-03-12** (2.5mo). value_high/urgency_score frozen. Distinct from opportunities_unified + fundraising_pipeline. | retire surface OR repoint to opportunities_unified/ghl_opportunities |
| **API `pipeline/[id]` (PUT/DEL)** | Edit/delete pipeline item | `relationship_pipeline` | 🔴 stale-abandoned | Writes to abandoned table. | as above |
| **API `pipeline/search`** | Cross-source entity search | `grant_opportunities`+`foundations`+`ghl_contacts`+`xero_invoices`(ACCREC)+`relationship_pipeline`(tracked set) | 🟠 misleading | Sources mostly real & fresh, but `foundations.annual_giving_total` doesn't exist → foundation value_high always null; "already_tracked" checks the abandoned relationship_pipeline. | fix col → `total_giving_annual`; reconsider tracked-set source |
| **API `pipeline/board`** | GHL kanban by pipeline/stage + win/loss | `ghl_opportunities`+`ghl_pipelines`+`ghl_contacts` | 🟢 real (⚠️ 500-cap) | Correct cols, fresh. Only caveat: ghl_opportunities is exactly 500 rows (suspected GHL API page-cap, not true count) → win-rate/totals may undercount. | verify 500 isn't truncation |
| **API `pipeline/unified` (GET/PATCH)** | Unified opp kanban + weighted value | `opportunities_unified`(stage/value_mid via view) + `v_pipeline_value` view; PATCH inserts `opportunity_stage_history` (DEAD) | 🟡 grant-noise + dead-write | Reads correct cols on fresh-but-grant-polluted `opportunities_unified` (15,549 rows). PATCH stage-history write silently no-ops (dead table). | scope out grant noise; drop or replace stage-history insert |
| **API `opportunities/route`** | Unified opps (grants+GHL+fundraising) enriched | `grant_opportunities`+`ghl_opportunities`+**`fundraising_pipeline`**(abandoned)+`ghl_contacts`+`communications_history`+**`relationship_health`**(stale)+`grant_applications` | 🟡 stale-mixed | Core grants+GHL fresh & correct. fundraising_pipeline rows (14) abandoned; relationshipTemp/daysSinceContact enrichment frozen 27d. | drop fundraising_pipeline source; derive temp live |
| **API `opportunities/update` (POST)** | Edit opp (GHL/grant/fundraising) | `ghl_opportunities`/`grant_opportunities` update + GHL PUT; fundraising → `fundraising_pipeline.target_amount`/`.project_code` | 🟠 partial | GHL + grant branches correct + bidirectional. fundraising branch writes **nonexistent cols** (`target_amount`, `project_code`; real `amount`, `project_codes`) → silent no-op. | fix col names or remove fundraising branch |
| **PAGE `/opportunities`** | Unified opp list + GHL kanban + grant metrics | → `/api/opportunities`, `/api/grants/pipeline`, `/api/grants/metrics`, `/api/opportunities/update` | 🟡 stale-mixed | Inherits opportunities/route mix; grants/* out of scope. | — |
| **API `ghl/opportunities`** | Flat opp list | `ghl_opportunities`; filters `pipeline_id`, reads `o.value` | 🟠 col-drift | Real table but `pipeline_id` filter / `o.value` are wrong cols (`ghl_pipeline_id`/`monetary_value`); `o.value` saved by `|| monetary_value` fallback, the pipeline filter would silently match nothing. 500-cap. | fix col names |
| **API `ghl/pipelines`** | Pipeline definitions | `ghl_pipelines` | 🟢 real | Correct; not capped. | — |
| **API `entities/matches` (GET/PATCH)** | Dedup review queue + sources | `v_duplicate_review_queue`+`entity_identifiers`+`entity_potential_matches`(620 rows/559 pending) | 🟢 real | All exist & populated; correct cols. | — |
| **API `entities/merge` (POST)** | Merge canonical entities | `canonical_entities`+`entity_identifiers`+`entity_merge_log`+`entity_potential_matches`+`ghl_contacts` | 🟢 real | Full audit-logged merge; all tables exist. | — |
| **PAGE `/people/duplicates`** | Entity match review UI | → `/api/entities/matches`, `/api/entities/merge` | 🟢 real | Wired to the live entity-resolution layer (NOT contacts/duplicates). | — |
| **API `communications/pending`** | Awaiting-our-reply queue + follow-ups | `communications_history`(waiting_for_response, response_needed_by='us')+`communication_user_actions`(13 rows)+`ghl_contacts`+**`agent_insights`**(DEAD) | 🟡 mostly-real | Core pending queue real & fresh. The `followUps` sub-list reads dead `agent_insights` → always empty. | drop agent_insights block |
| **API `communications/action` (POST/DEL)** | Archive/flag a comm | `communication_user_actions` upsert | 🟢 real | Table exists. | — |
| **API `emails/recent`** | Recent emails + sender | `communications_history`(channel=email) embed `ghl_contacts` | 🟢 real | Correct — uses communications_history, not dead `communications`. metadata.from parsed. | — |
| **API `emails/stats`** | Today / waiting / requires-response counts | `communications_history` count queries | 🟢 real | Fresh, correct filters. | — |
| **API `emails/dismiss` (POST)** | Dismiss emails | `communications_history.dismissed_at/dismissed_reason` | 🟢 real | Cols exist. | — |
| **API `development/overview`** | Sites/repos/codebases tiers | GitHub API + `ecosystem_sites` + `repo_project_links` + **`repo_contacts`**(DEAD, allSettled) | 🟡 mostly-real | Core (GitHub + ecosystem_sites + repo_project_links) real. repo_contacts dead but wrapped in Promise.allSettled → graceful empty (tagged-contacts feature silently absent). | stand up repo_contacts or drop feature |
| **API `development/contacts` (GET/POST/DEL)** | Repo↔contact tags | **`repo_contacts`** (DEAD) | 🔴 broken | Table doesn't exist → reads error→empty, writes fail. | create table or remove |
| **API `development/links` (GET/POST/DEL)** | Repo↔project links | `repo_project_links` | 🟢 real | Table exists. | — |
| **API `business-dev/route` (GET/POST)** | Initiatives + revenue + fundraising | **`business_initiatives`**(DEAD)+`revenue_streams`+**`fundraising_pipeline`**(abandoned) | 🔴 broken | First query on dead `business_initiatives` throws → whole GET 500s; POST insert also fails. | repoint/remove; use real revenue_streams only |
| **PAGE `/development`** | Sites grid + repos + relationship search | → `/api/development/overview`, `/api/relationships/list`, project codes | 🟡 mostly-real | Overview core real; tagged-contacts empty; any business-dev panel broken. | — |
| **PAGE `/people`** | Contacts table + duplicates tab | → `/api/contacts/all`, `/api/contacts/duplicates`, project codes | 🟢 real | All fresh sources. | — |
| **PAGE `/people/[id]`** | Contact profile (detail/timeline/meetings/opps) | → `/api/contacts/[id]{,/interactions,/meetings,/opportunities}` | 🟢 real | All four sources fresh & correct. | — |
| **PAGE `/pipeline`** | Relationship pipeline board (kanban) | → `/api/pipeline`, `/api/pipeline/[id]`, `/api/pipeline/search` | 🔴 stale-abandoned | Flagship board renders `relationship_pipeline`, abandoned 2026-03-12. Looks alive, data is 2.5mo frozen. | repoint to ghl_opportunities/opportunities_unified or retire |

## What's salvageable

**Real CRM view (keep, trust):**
- **`/supporters` + `/api/supporters`** — the genuine relationship roll-up; daily-rebuilt `supporters_intelligence` / `supporter_comms_summary` / `project_pipelines`. Most trustworthy surface in scope.
- **`/people`, `/people/[id]`, all `contacts/*` + the live `relationships/{list,attention,overdue,health,nudges}`** — canonical `ghl_contacts` + `communications_history`, fresh, temperature recomputed live (NOT from the stale snapshot). This is the working contact CRM.
- **`/people/duplicates` + `entities/{matches,merge}`** — populated, audit-logged entity-resolution layer (620 candidate matches). Distinct and healthy.
- **`pipeline/board` + `ghl/{opportunities,pipelines}`** — the real, fresh GHL deal kanban (only caveat: the 500-row cap on ghl_opportunities may be truncation — verify).
- **`opportunities/route` (grants+GHL portion), `pipeline/unified`** — fresh on `opportunities_unified`/`grant_opportunities`/`ghl_opportunities`, modulo grant-noise pollution.
- **Email/comms surfaces** (`emails/*`, `communications/{pending,action}`) — correctly on fresh `communications_history`.

**Duplicates / dead — retire or repoint:**
- **`/pipeline` page + `pipeline/{route,[id],search}`** — built on `relationship_pipeline`, abandoned 2026-03-12. A THIRD pipeline concept duplicating opportunities_unified + the GHL board. Single worst finding: a flagship page silently serving 2.5-month-old data.
- **`business-dev/route`** — hard-broken on dead `business_initiatives` (500s).
- **`development/contacts`** — hard-broken on dead `repo_contacts`.
- **Stale/dead feeds inside otherwise-real routes:** `relationships/touchpoints` + `relationships/[id]/snooze` (stale `relationship_health`); `opportunities/route` fundraising_pipeline + relationship_health enrichment; `opportunities/update` fundraising branch (wrong cols); `pipeline/unified` opportunity_stage_history write (dead); `communications/pending` agent_insights follow-ups (dead); `pipeline/search` foundations.annual_giving_total (wrong col); `ghl/opportunities` pipeline_id/value (wrong cols).

**Canonical-store note:** `ghl_contacts` is the single contact source of truth across this entire scope. The dead `contacts` / `communications` tables flagged in _schema-truth are NOT referenced anywhere in the relationships scope — those bugs are isolated to the /company intelligence route.
