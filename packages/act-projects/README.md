# @act/projects

The one typed record for every ACT project. Source data stays in
`config/project-codes.json`; this package is the only thing that should read it raw.

```js
import { loadProjects, getProject, artPieces, allSites } from '@act/projects';
const { projects, gaps } = loadProjects();   // throws on schema or guard errors
getProject(projects, 'ACT-JH');              // by code, slug, legacy code or alias
artPieces(projects);                         // every project with an `art` block
allSites(projects);                          // every site, tagged with project_code
```

## Check

```bash
pnpm projects:check            # errors exit 1, gaps are listed
pnpm projects:check -- --strict  # gaps exit 1 too; turn on once the record is filled
```

Errors: duplicate slug, `production_url` not in `sites[]`, a `wiki_path` that does
not exist, a site with no identifier, an unknown key. Gaps: a live ecosystem
project with no site or Notion page, a live project with no wiki page, an art
piece with no `art` block or wiki page. Gaps are the to-do list; errors are bugs.

## Record shape

Required: `code`, `name`, `canonical_slug`, `category`, `tier`, `status`, `description`.
Typed blocks: `sites[]` (Vercel id and name, production URL, GitHub repo, role),
`notion` (page id, database ids), `ghl` (tags, pipeline), `empathy_ledger`
(project key, syndication slug), `art` (media, tags, piece slug, wiki path), `wiki_path`.
Legacy flat fields (`production_url`, `notion_page_id`, `ghl_tags`, `art_medium`, …)
are still accepted so older scripts keep working; `scripts/migrate-project-codes.mjs`
copies them into the typed blocks and is idempotent.

Plan: `thoughts/shared/plans/project-record-and-site-sync.md`.
