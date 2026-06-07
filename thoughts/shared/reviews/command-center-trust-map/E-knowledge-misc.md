# E — Knowledge, storytellers, wiki, ideas, grants, goods, calendar, agent, system

Audited 2026-05-26 against `_schema-truth.md` (shared DB `tednluwflfhxyucgwigh`). Read-only. Verdict legend per schema-truth. Tables/views/RPCs not in schema-truth were verified live via `mcp__supabase__execute_sql` (existence + row counts).

## Top findings

1. **The knowledge base is the healthiest cluster in the whole command-center.** All `knowledge/*` routes read `project_knowledge` (672 rows, fresh) + a *real, populated* memory-graph layer: `knowledge_chunks` (19,413), `knowledge_edges` (1,111), `memory_episodes` (3,450). All 5 memory RPCs exist and work (`hybrid_memory_search`, `record_memory_access`, `get_edge_type_counts`, `get_decay_stats`, `get_knowledge_subgraph`, `get_knowledge_neighbors`). Ask/search use OpenAI embeddings + gpt-4o-mini synthesis with a text fallback. 🟢

2. **The "AI agent autonomy/learning" layer is mostly dead — but NOT all of it.** `/agent/learning` (agent_learnings, agent_mistake_patterns, agent_confidence_calibration), `/agent/procedures` (procedural_memory), `/agent/autonomy` (agent_autonomy_transitions) all query **DEAD tables** → silent empty arrays behind try/catch → the whole `/agent` page renders zeros. 🔴. **However** `agent_proposals` (323 rows) and `agent_audit_log` (84 rows) ARE real, so `/agent/proposals`, `/api/agents`, `/agent/insights`, `/proposals/stats` return live data. The live chat agents (`/chat`, `/agent/chat`) are real Anthropic API calls. So: the *brain-memory dashboards* are dead, the *proposal queue + audit log + live chat* are real.

3. **`knowledge/stats` is half-dead and silently masks it.** It counts `procedural_memory`, `agent_working_memory`, `agent_learnings` (all DEAD → 0) alongside real `knowledge_chunks`/`memory_episodes`/`agent_proposals` counts. The "AI brain health" widget will show real chunk/episode numbers but 0 procedures/working-memory/learnings — misleading-by-omission. 🟠

4. **Storyteller instance question — ANSWERED: routes intend EL v2 but the env fallback silently points them at the shared DB.** All 7 storyteller/compendium-storyteller routes import `elSupabase` (or alias), but `getELSupabase()` falls back to `SUPABASE_SHARED_URL || NEXT_PUBLIC_SUPABASE_URL` — **if `SUPABASE_SHARED_URL` is not set in Vercel, elSupabase === the shared DB.** They read `storyteller_master_analysis` and `project_impact_analysis`, which are **DEAD in the shared DB** but exist in EL v2. So the verdict is conditional: ⚠️ verify-instance — if `SUPABASE_SHARED_URL` is set → 🟡 (storytellers stale 41d in EL); if unset → 🔴 (master_analysis/impact return empty). `project_storytellers` (16) and `storytellers` exist in both, `el_storytellers` (55) is the shared-DB copy. `stories/route.ts` is different — it uses the **shared** client + a DIFFERENT storyteller schema (`full_name`, `expertise_areas`, `consent_given`) than the EL one (`display_name`); shared `storytellers` is STALE 41d. 🟡.

5. **`/assets`, `/team`, `/notion-agent/trials` are dead-table 🔴/⚫.** `/assets` reads `assets`+`asset_maintenance`+`properties`+`lodgings` — ALL DEAD (it's the old property/lodging tracker). `/team` reads real `team_members` (4) but also DEAD `seasonal_demand` (resource_allocations=9 real). `/notion-agent/trials` reads DEAD `notion_agent_trials` + DEAD view `v_notion_agent_reliability` → 🔴.

6. **`grantscope/intelligence` has column drift → two of its widgets are 🔴.** It selects `title`, `close_date`, `funder_name` from `grant_opportunities`, but the real columns are `name`, `closes_at`/`deadline`, and there is no `funder_name`. The `.gte('close_date',…)` filter + "closing soon" + "recently discovered" lists error/return empty. The count tiles (which use `id`) are fine. The rest of grants/grantscope is real (grant_opportunities 24,977; foundations; gs_entities; acnc_charities; v_pipeline_value; v_grant_readiness; grant_funder_documents all exist).

7. **Wiki is filesystem-backed and solid.** `wiki/page|search|status|structure` read the bundled `public/wiki/*.md` snapshot via `lib/wiki-files`, no DB dependency (a `wiki_pages` table with 413 rows exists but these routes don't use it). 🟢. `wiki/project-storytellers` is the exception — EL-instance storyteller dep (⚠️).

8. **`dream-journal` is wired but EMPTY (0 rows)** → `/dreams` page renders an empty state. ⚫ not-wired-in-practice. `ideas` (idea_board, 73 rows) and `sprint` (sprint_items 36 + sprint_suggestions 850) are real and populated. 🟢

9. **`system/usage` is stale and `admin/sync-health` only works on the PM2 host.** `api_usage` has just 25 rows, last 2026-03-21 (2 months stale) → usage dashboard near-empty. 🟡. `admin/sync-health` shells `pm2 jlist` via `execSync` — works on the local PM2 box, returns `{error:'pm2 not available'}` on Vercel. ⚫ on production.

10. **Calendar is real but unfiltered.** `calendar/events` reads `calendar_events` (2,748, fresh) as a raw per-day/range list — it does NOT apply the schema-truth "count-everything" guards (no `status!='cancelled'`, no `transparency`/all-day exclusion), but since it's a display list (not an aggregate KPI) the over-count is cosmetic. 🟢 (with note).

## Surface map

| Surface | Shows / returns | Lineage (table.cols · API · transform) | Verdict | Root cause / note | Fix |
|---|---|---|---|---|---|
| **API `knowledge/actions`,`/decisions`,`/meetings`,`/public`,`/briefing`** | Action items, decisions, meeting notes, public KB, briefing counts | `project_knowledge` (672, fresh) filtered by `knowledge_type` · shared `supabase` | 🟢 real | Correct table + cols | — |
| **API `knowledge/ask`,`/search`** | NL Q&A + hybrid search over KB | RPC `hybrid_memory_search`+`record_memory_access` (exist), OpenAI embed + gpt-4o-mini; text fallback on `project_knowledge` | 🟢 real | Graceful degradation if no OPENAI key | — |
| **API `knowledge/stats`** | Brain health (chunks/edges/episodes/agents/decay) | `knowledge_chunks`(19,413),`knowledge_edges`(1,111),`memory_episodes`(3,450),`agent_proposals`(323) REAL **+** `procedural_memory`,`agent_working_memory`,`agent_learnings`,`memory_consolidation_log` DEAD→0 | 🟠 misleading | Mixes real + dead counts; dead ones silently 0 | Drop the dead-table counts or label "n/a" |
| **API `knowledge/episodes`** | Memory episodes list+stats | `memory_episodes` (3,450, real) | 🟢 real | — | — |
| **API `knowledge/graph`,`/graph/overview`** | Knowledge graph subgraph/neighbors/edge-type overview | RPC `get_knowledge_subgraph`,`get_knowledge_neighbors` (exist) + `knowledge_edges`(1,111) + `project_knowledge` | 🟢 real | — | — |
| **Page `knowledge`,`/actions`,`/decisions`,`/graph`,`/meetings`,`/public`** | KB hub, action/decision/meeting lists, graph viz, public KB | calls knowledge/* via `lib/api` | 🟢 real (graph page inherits 🟢) | Healthiest cluster | — |
| **API `storytellers/overview`,`/themes`,`/quotes`,`/impact`,`/activity`,`/filters`** | Storyteller stats, themes, quotes, impact dims, activity | `elSupabase` → `storyteller_master_analysis`+`project_impact_analysis` (DEAD in shared, exist in EL) + `storytellers`/`project_storytellers`(16)/`organizations`(104k) | ⚠️ verify-instance | Hinges on `SUPABASE_SHARED_URL` env: set→🟡(EL stale 41d); unset→🔴(master_analysis empty) | Confirm `SUPABASE_SHARED_URL` in Vercel; if pointing at shared, master_analysis/impact are dead there |
| **API `stories/route.ts`** | Storyteller list w/ consent + project name | **shared** `supabase` → `storytellers` (STALE 41d) cols `full_name,expertise_areas,consent_given` (≠ EL schema) | 🟡 stale | Shared-DB storyteller copy frozen since 2026-04-15 | Re-sync storytellers or repoint to EL |
| **API `wiki/project-storytellers`** | Storytellers per project | `elSupabase` → projects + `project_storytellers`(16) + `storyteller_master_analysis`(EL) | ⚠️ verify-instance | Same EL-fallback caveat | as above |
| **Page `compendium`,`/[project]`,`/storytellers`(+org/project subpages)** | Ecosystem cards, project compendium, storyteller dashboard | `coreProjects` hardcoded scaffold enriched w/ `getProjects` (real); storyteller subpages call storyteller/* APIs | ⚠️ (storyteller pages) / 🟢 (project pages) | Project cards real; storyteller pages inherit EL-instance caveat | — |
| **API `wiki/page`,`/search`,`/status`,`/structure`** | Wiki markdown pages, search, status, nav tree | Filesystem `lib/wiki-files` over bundled `public/wiki/*.md` (no DB) | 🟢 real | DB `wiki_pages`(413) exists but unused by these routes | — |
| **Page `wiki`** | Wiki browser | getWikiStructure/Page/search/status | 🟢 real | — | — |
| **API `ideas`,`/ideas/[id]`** | Idea board CRUD | `idea_board` (73 rows, real) | 🟢 real | — | — |
| **API `dream-journal`,`/[id]`** | Dream journal CRUD | `dream_journal` (table exists, **0 rows**) | ⚫ not-wired | Empty in practice → page shows empty state | Populate or hide nav entry |
| **API `sprint`,`sprint-suggestions/dismiss`** | Sprint items + AI suggestions; dismiss | `sprint_items`(36), `sprint_suggestions`(850) real | 🟢 real | — | — |
| **Page `ideas` / `dreams` / `sprint`** | Idea board / dream journal / sprint board | calls ideas / dream-journal / sprint APIs | 🟢 / ⚫(empty) / 🟢 | dreams page empty | — |
| **API `grants/opportunities`,`/pipeline`,`/metrics`,`/readiness`,`/assets`,`/[id]`,`/[id]/draft`,`/[id]/milestones`** | Grant opps, pipeline, metrics, readiness, assets, detail, AI draft, milestones | `grant_opportunities`(24,977),`grant_applications`,`grant_assets`(26),`grant_funder_documents`,`v_grant_readiness`,`ghl_opportunities`; draft uses `hybrid_memory_search`+`project_knowledge` | 🟢 real | All tables/views exist + fresh | — |
| **API `grantscope/entities`,`/foundations/search`,`/grants/matching`** | GS entity graph, foundation search, grant matching | `gs_entities`,`gs_relationships`,`acnc_charities`,`foundations`,`grant_opportunities` (all exist) | 🟢 real | — | — |
| **API `grantscope/intelligence`** | GS overview tiles + closing-soon + recently-discovered + top funders + pipeline | counts on real tables **BUT** selects `title`,`close_date`,`funder_name` from `grant_opportunities` (real cols = `name`,`closes_at`/`deadline`, no funder_name) | 🔴 (lists) / 🟢 (count tiles) | Column drift → `.gte('close_date')` + closing/recent lists empty | Rename to `name`,`closes_at`; drop `funder_name` |
| **Page `grants/[id]`** | Grant detail + AI draft | grants/[id] + draft APIs | 🟢 real | — | — |
| **API `goods/dashboard`,`/pipeline`,`/duplicates`,`/duplicates-by-company`,`/merge`,`/outreach`** | Goods CRM dashboard, pipeline, dup detection, contact merge, outreach | `ghl_contacts`(2,276),`ghl_opportunities`(500),`ghl_pipelines`,`xero_invoices`,`communications_history`(27k),`relationship_health`(STALE 27d),`goods_content_library`(369) | 🟢 real (🟡 where it reads relationship_health) | All real; relationship_health frozen 2026-04-29 | — |
| **Page `goods`,`goods/pipeline`** | Goods CRM hub + pipeline board | goods/* APIs | 🟢 real | — | — |
| **API `calendar/events`,`/calendars`,`/events/[id]`,`/events/bulk`,`/meeting-note`,`/note`** | Calendar event list, sources, edit, bulk-tag, meeting notes | `calendar_events`(2,748, fresh); notes write `project_knowledge`+`communications_history` | 🟢 real (note: no cancelled/transparency filter, but display list) | Raw list, cosmetic over-count only | Optionally filter `status!='cancelled'` |
| **Page `calendar`** | Calendar UI w/ project tagging | calendar/* APIs | 🟢 real | — | — |
| **API `agent/learning`** | Learnings, mistake patterns, calibration | `agent_learnings`,`agent_mistake_patterns`,`agent_confidence_calibration` — ALL DEAD | 🔴 broken | Dead memory tables → empty arrays in try/catch | — |
| **API `agent/procedures`** | Learned procedures | `procedural_memory` — DEAD | 🔴 broken | — | — |
| **API `agent/autonomy`** | Autonomy transitions + current levels | `agent_autonomy_transitions` — DEAD | 🔴 broken | — | — |
| **API `agent/proposals` (GET/POST)** | Proposal queue + approve/reject | `agent_proposals` (323 rows, real) | 🟢 real | Live write-back works | — |
| **API `agent/insights`,`agents/route.ts`** | "Insights" + agent roster | `agent_audit_log` (84 rows, real); `agents` enriches a **hardcoded** 5-agent list | 🟢 real (⚫ for the static roster definition) | Roster is hardcoded scaffolding, status derived from audit log | — |
| **API `agent/chat`,`chat`** | Live AI agent chat (text/voice/photo) | Anthropic `claude-haiku-4-5` + `agent-tools`/`agent-loop`; logs to `logAgentUsage`; chat uses `loadPendingAction` (telegram pending-action state) | 🟢 real | Genuine LLM calls; pending-action store may touch dead `telegram_pending_actions` but path is guarded | — |
| **Page `agent`** | Agent autonomy/learning/procedures/proposals dashboard | calls autonomy+learning+procedures+proposals | 🔴 (3 of 4 panels dead) | 3 dead-table panels render 0; only proposals panel live | Hide learning/procedures/autonomy panels or wire the tables |
| **Page `chat`** | Web chat with the agent | `/api/chat` | 🟢 real | — | — |
| **Page `intelligence`** | Insight feed, suggestions, history | `/api/intelligence/feed`+`/suggestions` → `intelligence_insights` (23 rows, 🟡 4d) | 🟡 stale/low-volume | Real but sparse | — |
| **API `system/usage`** | LLM API usage by model/day | `api_usage` (25 rows, last 2026-03-21, 2mo stale) | 🟡 stale | Usage logging pipeline lagged | Resume api_usage logging |
| **Page `system`,`system/usage`** | System status / usage dashboard | system/usage API | 🟡 stale | near-empty usage | — |
| **API `team`** | Team roster + allocations + demand | `team_members`(4) + `resource_allocations`(9) REAL; `seasonal_demand` DEAD | 🟠 partial | seasonal_demand dead → that section empty | Drop seasonal_demand |
| **Page `team`** | Team page | `/api/team` | 🟠 partial | demand section empty | — |
| **API `admin/sync-health`** | PM2 cron sync health | `execSync('pm2 jlist')` on host — no DB | ⚫ on Vercel / 🟢 on PM2 host | pm2 binary absent in serverless | Note: local-only diagnostic |
| **Page `admin/sync-health`** | Sync-health dashboard | `/api/admin/sync-health` | ⚫ on prod | empty unless on PM2 box | — |
| **API `briefing/morning`** | Morning briefing (calendar, comms, stories, sprint, opps) | real: `calendar_events`,`communications_history`,`sprint_suggestions`,`opportunities_unified` **+** `storyteller_master_analysis`/`storytellers` via elSupabase | 🟡/⚠️ | Mostly real; storyteller section EL-instance caveat | — |
| **API `briefing/weekly`** | Weekly project/program summaries | `project_summaries`(216),`program_summaries`(6) real | 🟢 real | — | — |
| **API `funder-briefs`** | Funder brief cards (QBE-style) | `funder_briefs` (2 rows) real | 🟢 real (low volume) | — | — |
| **API `proposals/stats`** | Proposal stats | `agent_audit_log` (84) real | 🟢 real | — | — |
| **API `notion-agent/health`,`/mission`** | Read-only feeds for Notion agents | views `v_project_summary`,`v_projects_needing_attention`,`v_activity_stream`,`v_outstanding_invoices`,`v_cashflow_summary` + `project_knowledge`,`ghl_opportunities` (all exist) | 🟢 real | Replaces sync-*-to-notion scripts | — |
| **API `notion-agent/trials`** | Notion-agent trial reliability | `notion_agent_trials` + `v_notion_agent_reliability` — BOTH DEAD | 🔴 broken | Dead table + dead view | — |
| **API `inbox`** | Inbox (knowledge + comms + contacts) | `project_knowledge`,`communications_history`,`ghl_contacts` (all real) | 🟢 real | — | — |
| **API `search`** | Global search | `ghl_contacts`,`project_knowledge`,`notion_projects`(80) real | 🟢 real | — | — |
| **API `assets`** | Asset/property/lodging register | `assets`,`asset_maintenance`,`properties`,`lodgings` — ALL DEAD | 🔴 broken | Entire old property tracker is dead | Archive route |

## What's salvageable

**Keep (real, fresh, correct):**
- Entire `knowledge/*` API + pages (actions, decisions, meetings, public, ask, search, graph, episodes, briefing) — the strongest cluster; real memory-graph with 19k chunks / 3.4k episodes.
- `wiki/*` (filesystem-backed, solid).
- `ideas` (73), `sprint` (36 items / 850 suggestions).
- All `grants/*` + `grantscope/entities|foundations|matching` + `notion-agent/health|mission`.
- `goods/*`, `calendar/*`, `inbox`, `search`, `briefing/weekly`, `funder-briefs`, `proposals/stats`.
- `agent/proposals`, `agents`, `agent/insights`, `chat`, `agent/chat` (live).

**Fix (cheap, high-value):**
- `grantscope/intelligence` column drift (`close_date`→`closes_at`, `title`→`name`, drop `funder_name`) — 2 broken widgets.
- `knowledge/stats` — stop counting dead memory tables (procedural_memory, agent_working_memory, agent_learnings) so the brain-health widget stops showing misleading 0s.
- `team` — drop `seasonal_demand`.
- Resolve the storyteller instance: confirm `SUPABASE_SHARED_URL` is set in Vercel and points at EL v2; if not, all 7 storyteller routes + briefing/morning's story section are reading dead tables.
- `system/usage` / `api_usage` — resume the usage-logging pipeline (2mo stale).

**Archive / hide (dead or empty):**
- `assets` route + any asset register page (4 dead tables — old property tracker).
- `notion-agent/trials` (dead table + dead view).
- `agent/learning`, `agent/procedures`, `agent/autonomy` + the corresponding 3 panels on the `/agent` page (dead `agent_*` memory layer). Keep the proposals panel.
- `dream-journal` / `/dreams` (table empty, 0 rows) — hide nav entry until populated.
- `admin/sync-health` — keep as local-only diagnostic; note it returns an error on Vercel (no pm2).
