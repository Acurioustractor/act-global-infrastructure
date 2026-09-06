# One project record, one site sync

**Written:** 2026-09-06
**Goal:** every ACT repo reads the same typed record for each project (sites, Notion, GHL, Empathy Ledger, art, wiki), and the studio can show every ACT site's live state. Steps 1 and 2 of the five-step alignment; steps 3 to 5 (art as first-class, syndication out, skills sync everywhere) get their own plans once this lands.

## What exists today (checked 2026-09-06)

| Source | Where | State |
|---|---|---|
| Project codes | `config/project-codes.json`, key `projects` | 74 projects. Already carries `notion_page_id` (9), `ghl_tags` (67), `github_repo` (8), `production_url` (12), `syndication_slug` (10), `art_medium` + `art_tags` (10). Untyped JSON, no guard, fields optional by accident. |
| Wiki project pages | `wiki/projects/*.md` | 39 entries. Frontmatter has `canonical_code`, `website_path`, `public_surface`, `cluster`; `empathy_ledger_key` on only 3. |
| Art index | `wiki/art/art-projects.md` | Curatorial table of 9 pieces, hand kept. Studio `/art` reads its own TS file, not this. |
| Vercel sync | `scripts/vercel-sync.mjs` | Writes `ecosystem_sites` in the shared DB. Table has 7 rows, none with `vercel_project_id`, no deployment dates. The script has not run in earnest. |
| Vercel account | team `benjamin-knights-projects` | 50 projects returned (the MCP cap, so likely more). 21 are linked to a GitHub repo, the rest are unlinked or stale experiments. |
| Studio consumers | `scripts/sync-project-code-registry.mjs` and `sync-canonical-wiki-*.mjs` | Already read project-codes.json and the wiki at build time and bake generated JSON. This is the plug the new record goes into. |

So the record does not need inventing. It needs typing, guarding, and three fields it lacks: Vercel project, Empathy Ledger project key, and a canonical art entry.

## Step 1. Typed project record

**Where:** `packages/act-projects/` in this repo (pnpm workspace package, no framework deps).

**Files**
- `src/schema.ts`: a `zod` schema `ProjectRecord`. Required for every project: `code`, `name`, `canonical_slug`, `category`, `tier`, `status`, `description`, `wiki_path`. Optional but typed: `sites[]` (`{ vercel_project_id, vercel_project_name, production_url, github_repo, role: 'primary' | 'campaign' | 'archive' }`), `notion: { page_id, database_ids[] }`, `ghl: { tags[], pipeline_id? }`, `empathy_ledger: { project_key, syndication_slug }`, `art: { medium, tags[], piece_slug, wiki_path }`, plus the existing Xero and Dext fields unchanged.
- `src/guards.ts`: rules that fail the build, not a lint: every code unique; every `tier: ecosystem` or `flagship` project has at least one `sites[]` entry and a `notion.page_id`; every project with `art_medium` has a full `art` block and a page under `wiki/art/`; every `production_url` matches a Vercel project in `sites[]`; every `wiki_path` exists on disk.
- `src/index.ts`: `loadProjects()`, `getProject(codeOrSlug)`, `projectsByTier()`, `artPieces()`, `sitesForProject()`.
- `bin/check.mjs`: runs the guards, exits 1 with a table of every failing project and the missing field. Wired into `/preflight` and CI.

**Data:** `config/project-codes.json` stays the single editable file. The package parses it; nothing else reads it raw. Migration is one script that adds `sites[]` from the existing `production_url` + `github_repo`, and moves `art_medium` / `art_tags` under `art`. Legacy keys stay one release so downstream syncs keep working.

**Studio side:** `scripts/sync-project-code-registry.mjs` imports the package's `loadProjects()` instead of reading JSON, and the generated registry gains `sites`, `empathy_ledger`, `art`. `check:brand-skill` gets a sibling `check:project-record` that fails when the studio's generated JSON is behind the package.

**Filling the gaps:** the guards will fail on day one. That is the point. Expected first run: about 60 projects without a site (most are correct, they are programmes, not sites, so the guard only bites on ecosystem and flagship tiers), 65 without `notion.page_id`, 36 wiki projects without `empathy_ledger_key`. Ben fills the ones that matter in one sitting; the rest are tagged `tier: programme` and exempt.

## Step 2. Vercel site sync

**Where:** rewrite `scripts/vercel-sync.mjs`, keep the name.

**What changes**
- Source of truth for which Vercel projects count is the record's `sites[]`, not name-pattern guessing. Unlinked Vercel projects (`link: null`, 26 of the 50 seen) are listed in a report as candidates to delete, never synced.
- Per site, upsert into `ecosystem_sites`: `vercel_project_id`, `vercel_project_name`, `github_repo`, `url`, `last_deployment_at`, `status` (`ready`, `error`, `building`, `canceled` from the latest production deployment), `last_check_at`. Columns already exist. Add one column, `project_code text`, by migration in `grantscope/supabase/migrations/` per the shared-DB rule.
- Runs from the command-center pm2 cron every 30 minutes with `VERCEL_TOKEN` from env. Also runnable by hand with `--dry` and `--list`.
- Positive control in the test: a fake site with an invalid `vercel_project_id` must show `status: unknown`, not `ready`.

**Studio side:** `/ecosystem` and each flagship hub read `ecosystem_sites` at request time (public key, the table is not private) and show per site: live or broken, last deployed, link. A broken production deploy on any ACT site is visible on the studio ecosystem page within 30 minutes.

## Order of work

1. Package skeleton, schema, guards, migration script. Run guards, publish the failing table. PR to infra.
2. Ben fills the required fields for the 5 flagships and the ecosystem tier. Second PR is data only.
3. Studio sync reads the package. PR to studio.
4. `project_code` migration on the shared DB (Tier 3, Ben's verb via `/db-apply` in grantscope).
5. Vercel sync rewrite, cron entry, first real run. PR to infra.
6. Studio ecosystem page shows site state. PR to studio.

Steps 1 to 3 and 5 to 6 are night-shift safe. Step 4 and the cron `pm2 save` are day shift.

## Not decided, and not blocking

- Which of the 26 unlinked Vercel projects to delete. The sync will list them; deletion is a separate day-shift task.
- Whether `ecosystem_sites` should also carry Webflow (www.act.place until the cutover). Suggest one row with `vercel_project_id null` and `status: external` until then.
- Empathy Ledger project keys for the 36 wiki projects without one. Most will never syndicate. Only the flagships and art pieces need one for step 4 of the wider alignment.

## Sources
- `config/project-codes.json` field counts: node one-liner over `projects`, 2026-09-06.
- Vercel: `list_teams` and `list_projects` via the Vercel MCP, 2026-09-06.
- `ecosystem_sites`: `information_schema.columns` and a count query on the shared project, 2026-09-06.
