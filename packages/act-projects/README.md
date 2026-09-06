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

## Align with Notion and Empathy Ledger

```bash
node --env-file=.env.local packages/act-projects/bin/align.mjs                   # report drift
node --env-file=.env.local packages/act-projects/bin/align.mjs --write-registry  # fill notion/EL ids locally
node --env-file=.env.local packages/act-projects/bin/align.mjs --write-notion    # stamp ACT Project Code in Notion (ask first)
```

The ACT code is the id. The Notion Projects database (`NOTION_PROJECTS_DATABASE_ID`) is the
high-level list people edit; Empathy Ledger `projects` holds stories, media and artefacts.
`align` matches all three by code, then by name, and only writes an id into the registry when
the match is exact by code or the other side carries no code at all. It never writes to
Empathy Ledger; `scripts/sync-projects-to-el.mjs --fix` owns that.

## Art index

```bash
pnpm projects:art-index            # regenerate the table in wiki/art/art-projects.md
pnpm projects:art-index -- --check # CI: exit 1 when the table is behind
```

Identity (code, media, status, connected project) comes from the record; the one-line
quote, summary, philosophy and impact live in each piece's wiki page frontmatter
(`quote`, `summary`, `philosophy`, `impact`, `art_year`, `art_location`). The studio
reads both; nothing about a piece is typed into TypeScript.

## Record shape

Required: `code`, `name`, `canonical_slug`, `category`, `tier`, `status`, `description`.
`internal: true` marks an admin code with no public face (ACT-IN); the site guard skips it.
Typed blocks: `sites[]` (Vercel id and name, production URL, GitHub repo, role),
`notion` (page id, database ids), `ghl` (tags, pipeline), `empathy_ledger`
(project key, syndication slug), `art` (media, tags, piece slug, wiki path), `wiki_path`.
Legacy flat fields (`production_url`, `notion_page_id`, `ghl_tags`, `art_medium`, …)
are still accepted so older scripts keep working; `scripts/migrate-project-codes.mjs`
copies them into the typed blocks and is idempotent.

Plan: `thoughts/shared/plans/project-record-and-site-sync.md`.
