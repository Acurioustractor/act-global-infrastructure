# EL v2 Story Schema — Mapping for Tagging, Gap Analysis, and Alice Springs Trip

Date: 2026-05-15
Project ref: `yvnuayzslukamizrlhwb` (EL v2 Supabase, separate from main `tednluwflfhxyucgwigh`)
Repo: `/Users/benknight/Code/empathy-ledger-v2`

All schema facts here are **verified** against `information_schema.columns` and live `SELECT` queries unless explicitly flagged as inferred.

---

## Repo orientation (key files + folders)

- `supabase/migrations/` — ~200+ timestamped SQL migrations from 2026-01-11 baseline forward. The schema is migration-led, no `src/db/` exists.
- `docs/04-database/` — schema notes; `SYSTEM-STATE.md` is the canonical "what's where now" doc per AGENTS.md.
- `AGENTS.md` (root) — operational rulebook; explicit "no fabrication" + "soft-delete only" + audit log requirements (lookup chains for schema/past-decisions/cluster data documented).
- `CLAUDE.md`, `SOUL.md`, `USER.md` — constitution / brand / deep-model docs.
- Storyteller intake jobs at `src/lib/intake/run-intake.ts` (writes to `intake_jobs`). Whisper transcripts cached in `whisper_cache`.
- 235 public tables; verified RLS critical advisory: 12 tables (comments\*, story_versions, kinship\*, timeline_event\*, connections, canonical_theme_quotes) have **RLS disabled** — flagged but no auto-remediation applied.

## Story schema (tables + key columns + constraints)

`public.stories` (455 rows) is the canonical story record. Key columns (verified):

- **Identity** — `id`, `tenant_id`, `author_id`, `storyteller_id`, `title`, `content`, `summary`, `excerpt`
- **Media** — `media_url`, `media_urls[]`, `media_attachments` (jsonb), `transcription`, `transcript_id`, `video_embed_code`, `video_link`, `story_image_url`, `media_metadata`
- **Categorisation** — `themes` (jsonb), `tags[]`, `cultural_themes[]`, `story_category`, `story_type`, `story_stage`, `language`
- **Privacy / publishing** — `privacy_level`, `permission_tier` (enum), `is_public`, `is_featured`, `is_archived`, `archived_at`, `archive_reason`, `published_at`, `status`, `scheduled_publish_at`, `deleted_at`
- **Consent** — `has_explicit_consent`, `consent_details` (jsonb), `consent_verified_at`, `consent_withdrawn_at`, `consent_withdrawal_reason`, `ai_processing_consent_verified`, `archive_consent_given`, `cultural_permission_level`
- **Cultural safety** — `cultural_sensitivity_level`, `cultural_sensitivity_flag`, `cultural_warnings` (jsonb), `traditional_knowledge_flag`, `requires_elder_approval`, `requires_elder_review`, `elder_reviewed`, `elder_reviewed_at`, `elder_reviewer_id`, `elder_review_notes`, `elder_review_date`, `elder_approved_by`, `elder_approved_at`
- **Location** — `location` (text), `location_text`, `location_id` (FK → `locations`), `latitude`, `longitude`
- **Provenance** — `original_author_id`, `ownership_status`, `ownership_transferred_at`, `provenance_chain` (jsonb), `legacy_story_id`, `airtable_record_id`, `source_empathy_entry_id`
- **Linkage** — `project_id`, `organization_id`, `service_id`, `campaign_id`, `fellow_id`, `linked_storytellers` (jsonb)
- **Syndication** — `syndication_enabled`, `syndication_excerpt`, `syndication_destinations` (jsonb), `embeds_enabled`, `sharing_enabled`, `allowed_embed_domains[]`
- **AI / search** — `embedding` (pgvector), `search_vector` (tsvector), `ai_processed`, `ai_confidence_scores`, `ai_generated_summary`, `ai_enhanced_content`
- **Anonymisation** — `anonymization_status`, `anonymization_requested_at`, `anonymized_at`, `anonymized_fields` (jsonb)

Supporting story tables:
- `story_versions` (46 rows; RLS off)
- `transcripts` (597 rows) — `transcript_content`, `themes`, `key_quotes`, `ai_summary`, `cultural_sensitivity`, `requires_elder_review`, `era_label`, `event_year_min/max`
- `transcript_segments` (2,036), `transcript_analysis_results` (740, versioned)
- `extracted_quotes` (3,168), `storyteller_quotes` (486), `canonical_theme_quotes` (1,349; RLS off)
- `story_drafts` (579) — AI-generated long_form / short_form / quote_card variants from The Writer agent

## Tagging / taxonomy structure

Three layers, all verified:

1. **Controlled vocabulary — `canonical_themes`** (45 rows). Columns: `slug`, `display_label`, `description`, `category`, `cultural_sensitivity` (`low|medium|...`), `aliases[]`, `era_specific`, `era_year_min/max`. Categories observed: **agency, culture, history, opportunity, response, safety, service, strength, wellbeing**. Includes culturally-scoped entries like `mens_business`, `womens_business`, `elders_wisdom`, `connection_to_country`, `stolen_generations`, `palm_island_uprising` (medium-sensitivity), `youth_pathways`, `healing_and_trauma`.
2. **Per-story tags — `story_themes`** (895 rows). Columns: `story_id`, `theme` (text — free-form Indigenous theme), `added_by`, `ai_suggested`, `created_at`. The 20 common Indigenous themes + custom themes per the comment.
3. **AI-extracted — `narrative_themes`** (505 rows) and `storyteller_themes` (0 rows currently), plus per-story arrays on `stories.themes` (jsonb), `stories.tags[]`, `stories.cultural_themes[]`.
4. **General tags — `tags`** (91 rows) + `media_tags` (499) for media-asset-level tagging with source tracking + verification.

## Storyteller schema

`public.storytellers` (375 rows) — public storytelling profile. Comment: *"Every storyteller has a profile (FK to profiles.id). Use storyteller_full_profile view for combined data."*

Key columns: `id`, `profile_id` (FK), `organization_id`, `display_name`, `bio`, `location` (free-text — the dominant location signal in practice), `latitude`, `longitude`, `cultural_background[]`, `is_active`, `content_status` (values seen: `active`, `needs_content`, `pending_review`), `is_elder`, `is_featured`, `verified_at`, `tags[]`, `access_token`, `birth_year`, `death_year`, `is_ancestor`, `historical_sources` (jsonb).

`public.profiles` (489 rows) — the rich identity table. Key fields beyond auth: `traditional_country`, `language_group`, `languages_spoken[]`, `cultural_affiliations[]`, `indigenous_status`, `community_role`, `traditional_knowledge_keeper`, `cultural_protocols` (jsonb), `cultural_permissions` (jsonb), `cultural_protocol_level`, `requires_elder_review`, all the `*_visibility` granular privacy controls, `ai_processing_consent`, `quote_sharing_consent`, `face_recognition_consent`, `payout_preference`, `stripe_connect_account_id`.

Storyteller-to-org/project linkage:
- `storyteller_organizations` (375), `project_storytellers` (404), `profile_organizations` (541), `profile_projects` (8), `storyteller_services` (299), `storyteller_locations` (105), `profile_locations` (192), `storyteller_channels` (65).
- `storyteller_master_analysis` (294) — ACT Unified Analysis container with ALMA v2.0 signals.

## Project / community model

Two parallel project tables:
- `public.projects` (130 rows) — generic projects. Columns: `slug`, `act_project_code` (TEXT — the canonical ACT code like `ACT-OO`, `ACT-BG`), `organization_name` (does NOT exist — only `organization_id`), `focus_areas[]`, `themes[]`, `allows_storyteller_optin`, `allows_story_featuring`. **Note**: this table has no `title` or `name` column — display name comes from elsewhere (likely the linked organization or `slug`). Confirmed via failed `SELECT name` and `SELECT title`.
- `public.act_projects` (44 rows) — "Cleaned up to show only actual ACT projects. 25 active." Columns: `id`, `created_at`, `name`, `slug`, `description`, `category`, `cultural_sensitivity_level`, `usage_count`.

Tagging stories to ACT projects: **`story_project_tags`** (0 rows currently; bidirectional approval table). Columns: `story_id`, `act_project_id` (FK), `tagged_by`, `tag_source`, `storyteller_approved`, `act_approved`, `is_featured`, `featured_priority`, `relevance_score`, `ai_reasoning`, `suggested_themes[]`. Sibling: `storyteller_project_features` (0 rows — bidirectional opt-in/approve).

Community model: `communities` (2 rows), `community_members` (2), `community_family_folders` (8), `family_folders` (8), `family_folder_members` (73), `family_folder_sessions` (28) — family-level governance overlay used for Palm Island / Bloomfield cluster work.

Organisation context: `organizations` (26), `organization_members` (541), `organization_roles` (2), `organization_contexts` (3), `org_contacts` (199 — people connected to an org including non-EL-account holders).

## Cultural sensitivity / OCAP model

Multiple overlapping layers — verified columns:

1. **Story-level flags** — `cultural_sensitivity_level` (text), `cultural_sensitivity_flag` (bool), `cultural_warnings` (jsonb), `cultural_themes[]`, `traditional_knowledge_flag`, `cultural_permission_level`, `permission_tier` (enum).
2. **Elder review pipeline** — story columns `requires_elder_approval`, `requires_elder_review`, `elder_reviewed`, `elder_reviewed_at`, `elder_reviewer_id`, `elder_review_notes`, `elder_approved_by`, `elder_approved_at`. Plus dedicated tables: `elder_review_queue` (0 rows; columns: `content_id`, `content_type`, `cultural_issues` jsonb, `priority`, `assigned_elder_id`, `community_input_required`, `review_conditions[]`), `story_reviews` (0 rows), `moderation_results` (0), `moderation_appeals` (0).
3. **Cultural protocols** — `cultural_protocols` (11 rows; per-tenant rules: `protocol_type`, `rules` jsonb, `enforcement_level`, `effective_date`/`expiry_date`), `cultural_tags` (0 rows; empty table).
4. **Consent** — `consents` (30 rows; columns include `consent_type`, `purpose`, `status`, `granted_at`, `expires_at`, `withdrawn_at`, `multi_party_consents` jsonb), `consent_audit` (0), `consent_change_log` (0), `deletion_requests` (0 — GDPR), `story_syndication_consent` (0), `syndication_consent` (8), `gallery_syndication_consent` (8), `story_access_tokens` (0), `storyteller_self_actions` (15).
5. **Palm Island governance overlay** — `palm_tree_review_decisions`, `palm_public_source_review_decisions`, `palm_contribution_answers` (all 0 rows; sensitive_until_reviewed default; append-only audit event tables). Built for Bloomfield/Palm cluster work.
6. **Audit** — `audit_logs` (62,856 rows!), `audit_log` (919), `storyteller_verification_actions` (12 — explicit human verification log per Decision 9, 2026-04-09).

OCAP principles surface as: storyteller-controlled `syndication_consent` per story per site, ownership transfer fields on stories, separate elder-review pipeline, narrative_ownership_level on profiles, and "sensitive_until_reviewed" defaults on Palm tables.

## Stories-not-told-yet — query recipe

Verified working pattern (used live for the Alice Springs query in the next section). Five gap signals:

1. **Active storyteller, zero stories, zero transcripts** — `is_active=true`, `content_status='needs_content'`, no rows in `stories` or `transcripts` for that storyteller_id. Highest-priority capture candidates.
2. **Has transcript, no story** — transcript exists but no published `stories` row. Easy wins: just write the story from the transcript.
3. **Story stale** — `MAX(stories.created_at)` more than X months ago for an active storyteller (`storytellers.is_active` + `content_status='active'`).
4. **Tagged to a project, no story** — row in `project_storytellers` (status='active'/'member') but no rows in `story_project_tags` joined to that project's stories for that storyteller.
5. **Org contacts not yet onboarded** — `org_contacts` rows (199 total) without a linked `profile_id`/`storyteller_id`. These are people we know via the org but who don't have an EL identity yet.

The skeleton query (substitute your geo filter):

```sql
WITH candidate_pool AS (
  SELECT s.id, s.display_name, s.location, s.is_active, s.content_status,
         p.traditional_country, p.language_group, s.organization_id
  FROM storytellers s
  LEFT JOIN profiles p ON p.id = s.profile_id
  WHERE <geo or org filter>
)
SELECT n.*,
       COUNT(DISTINCT st.id) AS story_count,
       MAX(st.created_at)::date AS last_story_at,
       COUNT(DISTINCT t.id)  AS transcript_count,
       MAX(t.created_at)::date AS last_transcript_at
FROM candidate_pool n
LEFT JOIN stories st ON st.storyteller_id = n.id AND st.is_archived IS NOT TRUE
LEFT JOIN transcripts t ON t.storyteller_id = n.id
GROUP BY 1,2,3,4,5,6,7,8
ORDER BY story_count ASC, last_transcript_at DESC NULLS LAST;
```

## Alice Springs candidates — what we can pull

Geo filter matched: `location ILIKE '%alice%' OR '%mparntwe%' OR '%atnarpa%' OR '%loves creek%' OR '%undoolya%' OR '%angas downs%' OR '%tennant%' OR '%central australia%' OR '%NT%' OR '%northern territory%'`, plus `profiles.traditional_country ILIKE '%arrernte%'`.

Live counts (verified 2026-05-15):
- Alice Springs (various spellings): ~21 storytellers
- Tennant Creek: 11
- Central Australia: 11
- Katherine: 5
- Loves Creek / Atnarpa / Undoolya / Angas Downs: 8 (mostly Bloomfield/Liddle ancestors, `is_active=false`)
- Existing stories near Alice Springs / Atnarpa: 6 (verified). Includes Kristy Bloomfield "Bringing Kids Back to Country" (Atnarpa Station, Arrernte Country, 2026-03-22), Kylie Bloomfield "Creating Our Own History", Henry Bloomfield "Coming Home to Love's Creek", plus Fred Campbell, "Community Voices — Alice Springs".

**Priority capture list — active storytellers, 0 stories, near Alice Springs:**

| Storyteller | Location | Transcripts | Last transcript | Notes |
|---|---|---|---|---|
| **Kirsty Bloomfield** | Alice Springs, NT | 0 | — | Oonchiumpa lead per MEMORY.md — **gap**: zero transcripts, zero stories. Spelling note: MEMORY says "Kristy Bloomfield" but DB has "Kirsty Bloomfield" + a separate "Kristy Bloomfield" with 1 story. Two records may need merging. |
| **Tanya Turner** | Alice Springs, NT | 2 (2026-04-13) | recent | Oonchiumpa lead per MEMORY. Has 1 story (2026-04-10). One more easy win from the second transcript. |
| **Karen Liddle** | Alice Springs / Atnarpa, NT | 0 | — | Atnarpa connection. Active. |
| **Yani Bloomfield** | Alice Springs, NT | 0 | — | needs_content. |
| **Chelsea Kenneally** | Alice Springs, NT | 0 | — | needs_content. |
| **Suzie Ma** | Alice Springs, NT | 0 | — | needs_content. |
| **Patricia Ann Miller** | Alice Springs, NT | 1 (2026-04-13) | recent | Transcript exists, no story. |
| **Jackquann** | Alice Springs | 1 (2026-04-11) | recent | Transcript exists, no story. |
| **Laquisha** | Alice Springs | 1 (2026-03-20) | — | Transcript exists, no story. |
| **Anthony Hopkins** | Alice Springs, NT | 1 (2026-04-20) | very recent | Transcript exists, no story. |
| **Braydon Dema** | Alice Springs, NT | 2 (2026-04-20) | very recent | needs_content, two transcripts pending. |
| Tennant Creek cohort (Patricia/Jimmy/Norman Frank, Cliff Plummer, Annie Morrison, Linda Turner, Melissa Jackson, Risilda Hogan) | Tennant Creek, NT | 1-3 each | 2026-04-13 | Most have 1 story already; transcripts suggest more in the pipeline. |
| Ancestor / historical Bloomfield + Liddle entries (~20) | Loves Creek / Atnarpa / Undoolya / Central Australia | 0 | — | `is_active=false`, `is_ancestor=true` likely. **Not capture targets** — these are family-history records, not living candidates. Useful for kinship/family folder context on the trip. |

**Inferred (worth confirming on the ground):** Kirsty/Kristy Bloomfield split looks like a duplicate identity that should be merged via `storyteller_verification_actions` audit log per the EL v2 protocol.

**Org context for the trip** — `org_contacts` (199 rows) is the table to mine for "people Oonchiumpa knows but who aren't yet storytellers" — query by `organization_id` matching the Oonchiumpa org once you have its id, joined with `WHERE profile_id IS NULL` to find people not yet onboarded.

## Recommended Notion mirror DBs (Stories + Storytellers, with proposed schema)

EL v2 is the canonical store. The Notion mirror should be **read-only outbound** (per project Notion policy in `wiki/decisions/notion-page-policy.md`) and updated by a one-way sync script following the 17 existing `sync-*-to-notion.mjs` pattern.

### DB 1 — `EL Stories` (mirror of `public.stories`)

| Notion property | Type | Source column | Notes |
|---|---|---|---|
| Title | title | `stories.title` | |
| EL Story ID | text (unique key for upsert) | `stories.id` (uuid) | onConflict key |
| Storyteller | relation → EL Storytellers | `stories.storyteller_id` | |
| Project | select | derived: `projects.act_project_code` via `story_project_tags` (act_approved=true) | |
| Themes | multi-select | `story_themes.theme` aggregated | Controlled list mirrors `canonical_themes.display_label` |
| Cultural sensitivity | select | `cultural_sensitivity_level` | `standard / sensitive / sacred` |
| Permission tier | select | `permission_tier` enum | |
| Elder reviewed | checkbox | `elder_reviewed` | + Reviewed date + Reviewer |
| Consent | select | derived: `has_explicit_consent` + `consent_withdrawn_at` → `granted / withdrawn / pending` |
| Privacy | select | `privacy_level` | |
| Location | text | `location_text` or `location` | |
| Lat/Lon | number, number | `latitude`, `longitude` | |
| Status | select | `status` + `is_archived` + `published_at` | derived |
| Created | created_time | `created_at` | |
| Last reviewed | date | `elder_review_date` | |
| EL deep link | url | `https://empathyledger.app/stories/{id}` | inferred URL pattern — verify |
| Excerpt | text | `excerpt` or `summary` | |

### DB 2 — `EL Storytellers` (mirror of `public.storytellers` + `profiles` join)

| Notion property | Type | Source column | Notes |
|---|---|---|---|
| Display name | title | `storytellers.display_name` | |
| EL Storyteller ID | text (unique key) | `storytellers.id` | onConflict |
| Active | checkbox | `is_active` | |
| Content status | select | `content_status` (`active / needs_content / pending_review`) | |
| Location | text | `storytellers.location` | dominant signal |
| Traditional country | text | `profiles.traditional_country` | |
| Language group | text | `profiles.language_group` | |
| Languages spoken | multi-select | `profiles.languages_spoken[]` | |
| Indigenous status | select | `profiles.indigenous_status` | |
| Community role | text | `profiles.community_role` | |
| Elder | checkbox | `storytellers.is_elder` OR `profiles.is_elder` | |
| Traditional knowledge keeper | checkbox | `profiles.traditional_knowledge_keeper` | |
| Cultural protocol level | select | `profiles.cultural_protocol_level` | |
| Requires elder review | checkbox | `profiles.requires_elder_review` | |
| Stories | relation → EL Stories | derived | count + last date |
| Story count | rollup | rollup of relation | |
| Last story | rollup (date max) | rollup of relation | gap signal |
| Transcripts | number | derived from `transcripts` | |
| Last transcript | date | derived | gap signal |
| Org | relation → EL Orgs (or text) | `storytellers.organization_id` | |
| ACT project | select | derived via `project_storytellers` ∩ `projects.act_project_code` | `ACT-OO / ACT-BG / ACT-EL` |
| GHL contact | url | join via main DB `ghl_contacts.empathy_ledger_id` | bridges to GHL |
| Verified | checkbox + date | `verified_at` / `verified_by` | |
| Consent given | checkbox | `profiles.consent_given` | |
| AI processing consent | checkbox | `profiles.ai_processing_consent` | |
| Face recognition consent | checkbox | `profiles.face_recognition_consent` | |
| Gap flag | formula | "needs story" if `content_status='needs_content'` OR (transcripts>0 AND stories=0) OR last_story > 6mo ago | trip prioritisation |
| EL deep link | url | `https://empathyledger.app/storytellers/{id}` | verify pattern |

### Optional DB 3 — `EL Story Gaps` (computed view)

Same as DB 2 but filtered to `Gap flag = true` and sorted by transcript_count DESC, last_transcript DESC. This is the field-trip target list. Pre-filter by location for trip-specific views (Alice Springs view, Mounty/BG-FIT view, etc).

### Sync script outline (inferred from existing pattern, not yet written)

- New: `scripts/sync-el-stories-to-notion.mjs` and `scripts/sync-el-storytellers-to-notion.mjs`.
- Reads EL v2 Supabase (`yvnuayzslukamizrlhwb`) via service-role key. Paginate with `.range()` past the 1,000-row default.
- Upsert into Notion using `EL Story ID` / `EL Storyteller ID` as the natural key (matches existing 17-script pattern).
- Run weekly via PM2 cron alongside other Notion outbound jobs.
- Add a `wiki/decisions/notion-page-policy.md` entry: both DBs are **outbound-only** — edits in Notion will be overwritten.

---

## Verification notes

- **Verified** via live SQL against `yvnuayzslukamizrlhwb` (2026-05-15): all column lists, the canonical_themes vocabulary, the Alice Springs gap counts, the 6 existing Atnarpa/Alice Springs stories.
- **Inferred** (not directly confirmed): EL deep-link URL patterns (`/stories/{id}`, `/storytellers/{id}`) — sourced from convention not from inspection of `apps/website/src/app/stories/` or similar; Notion sync script naming follows the 17 existing `sync-*-to-notion.mjs` pattern in the main repo.
- **Critical security advisory surfaced but NOT remediated**: 12 tables in EL v2 have RLS disabled (comments\*, story_versions, kinship\*, timeline_event\*, connections, canonical_theme_quotes). Flag this to Ben separately — outside the scope of this research task, but should not stay unaddressed.
- **Schema gotcha**: `projects` table has NO `title` and NO `name` column despite the comment hinting otherwise — display name is read from elsewhere (likely the linked organization). Confirmed via failed queries.
- **Duplicate identity hint**: "Kirsty Bloomfield" (0 transcripts, needs_content) and "Kristy Bloomfield" (1 story 2026-03-22) likely the same person. Resolve via `storyteller_verification_actions` audit log before the trip.

NEXT: Confirm with Kristy/Kirsty Bloomfield on the trip which spelling she uses, then merge the duplicate storyteller record via the EL v2 admin verification workflow before any new stories are tagged.
