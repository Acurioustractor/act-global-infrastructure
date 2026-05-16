---
title: CivicScope codebase — Claude Code prompts for data-lake build-out
date: 2026-05-15
audience: Ben (paste each into Claude Code while in /Users/benknight/Code/grantscope)
status: drafts, refine per session
context: CivicScope shares Supabase with ACT main (tednluwflfhxyucgwigh). 597K gs_entities · 10,965 foundations · alma_funding_opportunities. ACT main has canonical_entities (15K) · ghl_contacts (2.1K canonical) · ghl_opportunities (477) · projects with 51 ACT-XX codes. Notion mirrors all of it.
---

# CivicScope prompts — copy-paste briefs

Each prompt below is a self-contained brief. Paste into Claude Code while in the CivicScope repo. Each has goal, scope, stop criteria, and output format so the work is durable.

The architecture they all serve:

```
CivicScope (data lake)                          ACT main (operational)
  gs_entities · foundations          ←-bridge-→  canonical_entities · ghl_contacts
  alma_funding_opportunities         ←-bridge-→  ghl_opportunities · projects
  foundation_*                                    Notion Orgs · Opportunities
  funder_portfolios                              Funder Cadence rating
```

The shared Supabase makes all of this a JOIN, not a copy.

---

## Prompt 1 — Build the CivicScope ↔ ACT entity bridge

```
Build the entity-bridge junction table that links CivicScope's 597K gs_entities and
10,965 foundations to ACT's canonical_entities (15K rows in the same Supabase).

Why we need it: every ACT opportunity / org / contact has a corresponding
foundation or entity profile in CivicScope. Without a junction we cannot enrich
ACT data with CivicScope research. Today the join is name-only and brittle.

Scope:
  - Use the same Supabase (tednluwflfhxyucgwigh). Read foundations + gs_entities
    + canonical_entities in place. No copying.
  - Build a junction table `civicscope_act_entity_bridge`:
      civicscope_entity_id (text, FK to gs_entities or foundations)
      civicscope_entity_table (text, 'gs_entities' or 'foundations')
      canonical_entity_id (uuid, FK to canonical_entities)
      match_method (text, 'exact_name' | 'abn' | 'fuzzy_name' | 'manual')
      match_confidence (numeric 0-1)
      created_at, verified_at, verified_by
  - Resolution rules:
      1. Exact ABN match → confidence 1.0, method='abn'
      2. Exact normalised-name match → confidence 0.95, method='exact_name'
      3. Trigram similarity > 0.8 → confidence = similarity, method='fuzzy_name'
      4. Below 0.8 → manual queue
  - First pass: write a SQL function `bridge_civicscope_to_act()` that fills
    the junction. Run dry on 500-row sample, show counts at each confidence
    bucket. Then run full.
  - Migrate any existing canonical_entities.civicscope_entity_id column data
    if it exists.

Stop when:
  - Junction table populated with all auto-resolvable rows
  - Report at thoughts/shared/handoffs/2026-05-15-civicscope-bridge.md showing:
      count by match_method, count by confidence bucket, top 20 unmatched
      foundations (manual queue), top 20 unmatched canonical_entities

Fallback: if foundations.abn coverage is poor, fall back to name+location.

Output: SQL migration + handoff + a SELECT showing 5 bridged examples end-to-end.
```

---

## Prompt 2 — Match alma_funding_opportunities to ACT-XX projects

```
Score every alma_funding_opportunity for fit against each of ACT's 51 active
ACT-XX projects (projects.act_project_code).

Why we need it: ACT has 477 GHL opportunities, mostly discovery-tier. The 18K+
grants discovered in alma_funding_opportunities should be filterable by which
ACT project they could fund. Today there is no link.

Scope:
  - Inputs: alma_funding_opportunities table (full row), projects table where
    act_project_code IS NOT NULL (51 rows), and project context from
    projects.description + focus_areas + themes + the project wiki page
    (wiki/projects/<slug>.md in /Users/benknight/Code/act-global-infrastructure).
  - For each (opportunity × project) pair, compute a fit score 0-1 using:
      A. Jurisdiction overlap (alma.jurisdictions ∩ project's known regions)
      B. Theme similarity (alma.themes ∩ project.themes + cosine over
         description embeddings if available)
      C. Funder type fit (philanthropic vs government vs corporate matched to
         project's typical funders)
      D. Hard rejects: alma.status='closed' → score 0, alma.eligibility says
         'individual' when project is org-led → score 0
  - Write to a new view `v_grants_x_projects_fit` materialised, refreshed nightly.
  - Top 20 fit per project must be human-reviewable in <10 minutes per project.

Output:
  - The materialised view + nightly refresh job
  - A report at thoughts/shared/handoffs/civicscope-act-grants-fit.md showing
    the top 10 highest-fit grants per ACT-GD, ACT-EL, ACT-JH, ACT-OO

Stop when the view is live and the report is written.
```

---

## Prompt 3 — Enrich every open GHL opportunity with its foundation profile

```
For each of the 8 active relationship-pipeline ghl_opportunities (status=open,
contact has company_name, not a discovery placeholder), attach the foundation
profile from CivicScope.

Why we need it: the Notion Opportunities DB shows pipeline value and stage. It
should ALSO show — for funders — recent grants history, average grant size,
grantee profile, relationship signals from foundation_relationship_signals.

Scope:
  - Bridge from ghl_opportunities → ghl_contact → company_name → foundations.name
    (fuzzy match via the v_canonical_contacts company_name).
  - For each match, pull from foundations + foundation_programs +
    foundation_grantees (most recent 10) + foundation_relationship_signals.
  - Write to a view v_ghl_opportunity_with_foundation_context.
  - Then update the existing sync-opportunities-to-notion.mjs in the ACT main
    repo to read this view and surface 3 new Notion fields on each opp:
      "Foundation Type", "Avg Grant ($)", "Recent Grantees (sample)"
  - Skip pulling for discovery-tier opps (Ben as proxy, NT placeholders) —
    they have no foundation behind them.

Stop when the view is live and Notion Opportunities show foundation context
on the 8 relationship-pipeline rows.

Output: handoff + screenshot of one enriched Notion opp row.
```

---

## Prompt 4 — Auto-discover new grants matching ACT's profile (recurring)

```
Build a recurring agent that finds new grants in alma_funding_opportunities
(or upstream sources) that match ACT's profile across all 51 ACT-XX projects.

Why we need it: ACT's pipeline is currently filled by Ben manually scanning.
The 18K+ grant discovery feed should surface "you should look at this" matches
automatically.

Scope:
  - Daily cron at 6am AEST. Pull every grant in alma_funding_opportunities
    added in the last 7 days (created_at > now - interval '7 days').
  - For each new grant, run the project-fit scorer from Prompt 2.
  - Write rows above 0.6 fit threshold into a new table
    `act_grant_recommendations`:
      grant_id, recommended_for_project (ACT-XX code), fit_score, reasoning,
      surfaced_at, status ('new' | 'reviewed' | 'pursued' | 'declined')
  - The agent also writes a daily slack-style markdown summary at
    wiki/cockpit/grants-feed-YYYY-MM-DD.md listing top 10 new grants.
  - Existing PM2 cron infrastructure exists in
    /Users/benknight/Code/act-global-infrastructure/ecosystem.config.cjs —
    add an entry there.

Stop when:
  - Table + cron live
  - First daily report written, with 10+ scored recommendations

Output: SQL migration for act_grant_recommendations, the agent script, the
PM2 cron entry, and the first day's output committed.
```

---

## Prompt 5 — Foundation deep-dive for every Notion Org with pipeline

```
For each Notion Organisation row with Funder Cadence ∈ {PASS, WARN, FAIL} and
Open Pipeline Value > 0, run a foundation deep-dive that pulls everything
CivicScope knows about that funder.

Why we need it: when Ben opens a PICC or Snow Foundation row in Notion, he
should see the same intelligence he'd get from a 30-minute CivicScope research
session — without leaving Notion.

Scope:
  - Read the Notion Orgs DB (id 361ebcf9-81cf-8190-b61d-fa81a302edc9). Filter
    where Funder Cadence != 'n/a' AND Open Pipeline Value > 0. Expect ~20-30 orgs.
  - For each org, resolve to a foundations row (use the bridge from Prompt 1).
  - Pull: foundation_power_profiles (decision-makers + relationships),
    foundation_relationship_signals (recent activity), recent grants
    (foundation_grantees joined on year), program_years (active programs).
  - Build a brief (2-3 paragraphs) plus a structured "deep dive" JSON:
      decision_makers: [...],
      typical_grant_size_aud: median,
      programs_relevant_to_ACT: [...],
      recent_grants_to_similar_orgs: [...],
      relationship_signal_strength: 'cold' | 'warm' | 'hot',
      next_best_move: text
  - Write into a new Notion property "CivicScope Brief" (rich_text) on the
    Orgs DB. Use sync-civicscope-briefs-to-notion-orgs.mjs (new script).
  - Refresh weekly.

Stop when first 5 orgs are enriched in Notion and the script runs end-to-end.

Output: script + cron entry + handoff showing PICC, Snow Foundation, Centrecorp,
Vincent Fairfax, and Bryan Foundation enriched.
```

---

## Prompt 6 — Community + procurement opportunity discovery

```
Specifically target opportunities that fund the 32 NT communities currently
held as placeholder contacts in GHL (maningrida-nt, wadeye-nt, galiwinku-nt,
…), plus Indigenous Procurement Policy (IPP) opportunities for Goods on
Country.

Why we need it: the $11.6M community-targeted discovery layer in our pipeline
is one opp per community. Each community should have a watchlist of relevant
funders + procurement opps that update as CivicScope ingests them.

Scope:
  - Pull all 32 community placeholder contacts from ghl_contacts (name pattern
    '* nt').
  - For each community: identify keyword set (community name, language group,
    region) + cross-reference to alma_funding_opportunities and gs_entities.
  - Write to act_community_funding_watchlist:
      community_ghl_contact_id, opportunity_id, fit_score, surfaced_at, status.
  - Separately, for Indigenous Procurement Policy (IPP):
      gs_entities and foundations tagged with procurement/IPP-related themes
      → surface contracts and tenders matching Goods on Country (recycled
      plastic furniture, washing machines, fridges).
  - Both watchlists feed a Notion view: filter Opportunities DB by "Watchlist
    Source = NT Community" or "= IPP".

Stop when:
  - Watchlist tables populated
  - Notion Opportunities DB shows community-targeted matches alongside the
    existing 477 GHL opps

Output: SQL + sync script + a handoff showing the top 5 NT community matches
and top 5 IPP procurement opportunities for Goods.
```

---

## Prompt 7 — Push CivicScope relationship signals into ACT Funder Cadence

```
CivicScope has foundation_relationship_signals (recent activity, RFI responses,
new program announcements). ACT's Notion Orgs DB has a Funder Cadence column
(PASS/WARN/FAIL). Currently Funder Cadence is derived only from ACT's own
activity (last contact, paid invoices, open pipeline). It should ALSO be
influenced by signals coming from CivicScope.

Why we need it: a foundation that JUST closed a related grant or JUST
announced a new program should bump up to "engage this week" even if ACT
hasn't contacted them recently.

Scope:
  - Add CivicScope signal weighting to scripts/tag-orgs-funder-cadence.mjs in
    the ACT main repo:
      - If foundation_relationship_signals row exists for this org with
        signal_type IN ('new_program_announced', 'rfi_open', 'grantee_aligned')
        AND signal_date > now - interval '14 days' → bump PASS or override WARN
        to URGENT.
  - Add a new cadence value 'URGENT — fresh signal from CivicScope'.
  - Notion Orgs DB schema needs Funder Cadence to include URGENT option.

Stop when the tag-orgs-funder-cadence.mjs script considers CivicScope signals,
and at least one org gets URGENT status.

Output: updated tagger script + handoff showing which orgs moved.
```

---

## Prompt 8 — Foundation profile bot for unknown funders

```
Whenever a new funder name appears in ACT (ghl_contacts.company_name with a
funder tag, or a new ghl_opportunity.name that contains a foundation reference),
trigger an agent that creates a foundation profile in CivicScope from public
sources.

Why we need it: ACT keeps encountering new funders. CivicScope should auto-
populate a profile so when Ben opens that org in Notion, the brief is already
there.

Scope:
  - Listener: pg_cron job that polls ghl_contacts every 15 min for new rows
    with company_name and tag includes 'funder' or 'goods-funder' or similar.
  - For each new funder name not yet in foundations, dispatch a research task:
      1. Web-search for the foundation's website, ABN, address
      2. Pull recent annual reports / 990 equivalents if available
      3. Extract programs, focus areas, grant size band, recent grantees
      4. Write into foundations + foundation_programs + foundation_grantees
      5. Set foundations.enrichment_status='auto', source='civicscope-agent-YYYY-MM-DD'
  - Rate-limit: max 5 new foundations per hour. Queue overflow.
  - Critical: write to foundations.notes a clear "auto-enriched, needs human
    verification" flag.

Stop when first 10 funders auto-enriched without errors.

Output: pg_cron entry + agent script + handoff showing 10 enrichments.
```

---

# How to use these

For each prompt, in CivicScope repo:

```bash
cd /Users/benknight/Code/grantscope
claude  # or codex, or whatever you use
# Paste one prompt at a time
```

Order by leverage: **1 → 2 → 4 → 3 → 5 → 6 → 7 → 8**. Prompt 1 (the bridge) is the keystone — everything else depends on it. Then 2 (project fit) unlocks discovery. Then 4 (recurring agent) is the runtime that keeps the system fresh.

# What ACT's side does in parallel

Once these land in CivicScope, the ACT main repo needs:
- One new sync script per output (sync-civicscope-briefs-to-notion-orgs.mjs etc.)
- New Notion columns on Orgs DB ("Foundation Type", "CivicScope Brief", "Watchlist Source")
- New Notion view: "Hot funders this week" filtered by Funder Cadence = URGENT

I'll build those when the CivicScope side is ready.

# Risk notes

- All 8 prompts read/write the same Supabase as ACT main. Each MUST scope writes to its own table or view — no UPDATEs to canonical_entities / ghl_contacts / ghl_opportunities from CivicScope.
- foundations + foundation_grantees etc. are CivicScope-owned. Safe to write there.
- Auto-enrichment (Prompt 8) must flag rows as needs-verification. Civicscope sources can be wrong; never overwrite ACT's curated profile.
