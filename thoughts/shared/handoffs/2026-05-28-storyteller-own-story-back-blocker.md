# Storyteller own-story-back foundation — research + blocker (2026-05-28)

Backlog item 4 of the comms operating system. Chosen first slice (Ben):
**where-used spine (`story_usages`) + admin storyteller view** — operator-only,
no storyteller-facing send. Researched, **not built — blocked on data model.**

## The blocker

The foundation needs a verifiable storyteller ↔ story ↔ usage data spine. In the
data reachable from this session it isn't there:

- `story_usages` table: does not exist (would be a new prod migration — Tier 3).
- **Newsletter usage source = 0**: no `newsletter_candidates` row currently carries
  any `storyteller_ids`, so the "featured in a sent edition" link the locked plan
  assumed has no data yet.
- **stories ↔ storytellers link is absent in `main`**: `main.stories` has only **9
  rows** (all published); `main.storytellers` has **226**. `stories.author_id`
  (text) matches **0** storytellers by `id`, `user_id`; `stories.public_profile_id`
  matches **0** by `id`. They're effectively disconnected datasets.
- **EL-v2 not reachable here**: command-center's `elSupabase` reads
  `SUPABASE_SHARED_URL` / `SUPABASE_SHARED_SERVICE_ROLE_KEY`, which are **unset
  locally** → it falls back to `main`. The canonical EL-v2 store (where real,
  linked storyteller content presumably lives) can't be queried from this session.

Building against `main` now would produce an empty/broken foundation.

## What IS known (verified 2026-05-28, main DB tednluwflfhxyucgwigh)

- `storytellers` (226 rows) consent model: `consent_given` (bool), `consent_date`,
  `consent_expiry`, `story_visibility_level` (text), `quote_sharing_consent` (bool),
  `full_name` / `display_name`, `email` / `contact_email`, `project_id`,
  `organization_id`. id = uuid.
- `stories` (9 rows): `title`, `slug`, `author_id` (text), `public_profile_id`
  (uuid), `is_published`, `published_at`, `visibility`, `is_featured`, `status`,
  `featured_image_url`.
- Newsletter→storyteller link path (when populated): `newsletter_drafts` (sent) →
  `candidate_ids` → `newsletter_candidates.storyteller_ids`.
- Existing operator dashboards: `/compendium/storytellers/...` (by project/org).
  The Q16 split (`/storytellers/[id]` public, `/admin/storytellers/[id]` full) does
  NOT exist yet.

## Open questions to resolve before building (next session)

1. **Where is the canonical storyteller + story content?** Confirm the EL-v2 project
   ref + wire `SUPABASE_SHARED_URL`/`SUPABASE_SHARED_SERVICE_ROLE_KEY` into this
   repo's env (or run the build from a session with EL-v2 MCP access).
2. **The real stories ↔ storytellers join key** (author_id? a join table? EL-v2
   only?). Without this, "where used" can't attribute a story to a person.
3. **Which DB hosts `story_usages`?** Usage events (newsletters) are in `main`;
   storytellers may be in EL-v2 → soft reference (no cross-DB FK), admin view reads
   both clients. Decide once #1 is answered.
4. **Consent gate on the admin view**: which `story_visibility_level` /
   `consent_*` states surface which uses; how `consent_expiry` is handled.

## Proposed build once unblocked (the foundation slice)

1. `supabase/migrations/<ts>_story_usages.sql` — `story_usages` (storyteller_id,
   story_id, usage_type [newsletter|website|pitch|...], surface, title, used_at,
   audience, visibility, source_ref; unique (storyteller_id, usage_type,
   source_ref)). **Tier 3 apply — flag, don't auto-apply.**
2. `scripts/build-story-usages.mjs` — idempotent populate from sent newsletters
   (+ future sources), `--dry-run`.
3. Admin view `/admin/storytellers/[id]` — storyteller profile + consent state +
   their stories + downstream uses. Reads main + EL clients.

## Meanwhile (unblocked, shipped this session, awaiting Ben)

- Branch `wip/newsletter-drafters-2026-05-28` — 2 commits (partner+brand drafters
  `d295c15`; unified content calendar `a567cb1`). **Unpushed, no PR.**
- PM2 reload pending (activates `comms-content-calendar` cron + prior storyteller
  cron-disable from PR #116).
