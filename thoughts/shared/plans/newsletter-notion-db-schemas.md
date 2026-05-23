---
title: Newsletter pipeline — Notion DB schemas to create
date: 2026-05-23
status: schemas ready, awaiting Notion DB creation
plan_slug: act-communication-pipeline-2026-05-23-locked
---

# Notion DBs to create

Two databases needed for the newsletter pipeline. Create in Notion UI, then paste their IDs into `config/notion-database-ids.json` as `newsletterCandidates` and `newsletterDrafts`.

---

## 1. `Newsletter candidates`

**Purpose**: Each row is one event from the cross-codebase feed that *might* go in a future newsletter. You tap include/exclude/defer to gate which ones reach the drafter.

**Columns** (in display order):

| Column name | Notion type | Maps to Supabase | Notes |
|---|---|---|---|
| Title | Title | `title` | Sourced from feed event title or filename |
| Status | Status | `status` | Options: `proposed` (default) · `include` · `exclude` · `defer`. Coloured: proposed=grey · include=green · exclude=red · defer=yellow |
| Audiences | Multi-select | `audiences` (override over `auto_audiences`) | Options: `funder` · `partner` · `brand` · `storyteller` |
| Auto audiences | Multi-select (read-only conceptually) | `auto_audiences` | Same options. Computed by source-type rule; don't edit. |
| Source type | Select | `source_type` | Options: `commit` · `plan_updated` · `decision_logged` · `handoff_updated` · `wiki_update` · `wiki_page_synced` · `el_story_updated` · `xero_payment` |
| Source repo | Text | `source_repo` | E.g. `act-global-infrastructure` |
| Source URL | URL | `url` | Permalink (GitHub commit, wiki page, etc) |
| Event date | Date | `event_date` | When the underlying event happened |
| Project codes | Multi-select | `project_codes` | `ACT-OO` · `ACT-GD` · `ACT-EL` · etc — sync from `config/project-codes.json` |
| Storyteller IDs | Multi-select | `storyteller_ids` | For EL story events |
| Consent visibility | Select | `consent_visibility` | For EL stories: `private` · `partner` · `funder` · `public` |
| Notes | Text | (Notion-only) | Free-form notes from you/Nic during triage |
| Synced at | Date | `updated_at` | Auto-managed |

**Views to create**:
1. **All proposed** (filter: `Status = proposed`) — sort by Event date desc. The triage inbox.
2. **By audience: funder** (filter: `auto_audiences contains funder OR audiences contains funder`)
3. **By audience: partner** (filter: same pattern)
4. **By audience: brand** (filter: same pattern)
5. **Include set** (filter: `Status = include`) — what will feed the next drafter run.
6. **By project** (group by `Project codes`)

**Sample query to verify Supabase population**:
```sql
SELECT status, array_to_string(auto_audiences, ',') AS auto, count(*)
FROM newsletter_candidates
GROUP BY status, auto_audiences
ORDER BY count(*) DESC
LIMIT 20;
```

Today's seed: **82 candidates** already in Supabase (75 brand + 7 partner from the last cross-codebase feed run).

---

## 2. `Newsletter drafts`

**Purpose**: Each row is one newsletter edition through its state machine: drafting → graded → reviewed → send-ready → sent.

**Columns** (in display order):

| Column name | Notion type | Maps to Supabase | Notes |
|---|---|---|---|
| Edition slug | Title | `edition_slug` | E.g. `snow-foundation-q4-fy26` |
| Audience | Select | `audience` | `funder` · `partner` · `brand` · `storyteller` |
| Recipient | Text | `recipient_slug` | E.g. `snow-foundation` for per-recipient editions; blank for `brand` |
| Edition period | Text | `edition_period` | `Q4 FY26` · `Sept 2026` · `Fortnight 18` |
| Status | Status | `status` | `drafting` (grey) · `graded` (blue) · `reviewed` (purple) · `send-ready` (orange) · `sent` (green) · `send-error` (red) · `send-blocked-needs-double-confirm` (yellow) |
| Selected subject | Text | `selected_subject` | What goes in the email subject line |
| Subject candidates | Text | `subject_candidates` | The 3 AI-generated options to choose from |
| Body | Text | `body_md` | Markdown of the draft body (Notion will render as rich text) |
| Voice grade score | Number | `voice_grade_score` | 0–100 from grade-voice |
| Consent warnings | Text | `consent_warnings` | JSON list of soft-warn flags per storyteller |
| Double confirmed | Checkbox | `double_confirmed` | Required if consent_warnings present, before send-ready |
| Candidate IDs | Text (or relation later) | `candidate_ids` | What fed this draft |
| Sent at | Date | `sent_at` | Auto-set by send cron |
| GHL campaign ID | Text | `ghl_campaign_id` | Set after successful send |
| Send error | Text | `send_error` | If status=send-error, why |
| Notes | Text | (Notion-only) | Your review notes |

**Views to create**:
1. **Drafting** (filter: `Status = drafting` or `graded`)
2. **Awaiting send** (filter: `Status = reviewed` or `send-ready`)
3. **Sent recently** (filter: `Sent at` within last 30 days; sort desc)
4. **Errors** (filter: `Status = send-error` or `send-blocked-needs-double-confirm`)
5. **By recipient** (filter: `Audience = funder`, group by `Recipient`)

---

## After creating these DBs

1. Copy each DB's page ID (the long hex string in the URL).
2. Add to `config/notion-database-ids.json`:
   ```json
   {
     ...existing keys...,
     "newsletterCandidates": "abc123def456...",
     "newsletterDrafts": "789abc...def456..."
   }
   ```
3. Commit + push.
4. Next step (Day 2 of the build plan): `scripts/sync-candidates-to-notion.mjs` reads Supabase + writes to the Notion candidate DB. Once those page IDs are in config, this script can run.

---

## Why not auto-create the DBs via Notion MCP?

Could be done via `mcp__notion__notion-create-database` — but you should see the schema in the Notion UI first to confirm column types feel right (especially status colours, select options ordering, view filters). Easier to tweak in Notion UI than to re-run the MCP creation.

If you'd prefer I create them programmatically, say so.
