# Art from the record

**Written:** 2026-09-06, after project-record-and-site-sync shipped.
**Goal:** adding an art piece is one record entry, one wiki page and one Empathy Ledger project, and the studio's `/art` pages pick it up at build. No hand-kept prose or counts in TypeScript.

## What exists (checked 2026-09-06)

| Where | State |
|---|---|
| Studio `src/lib/art/art-portfolio.ts` | 506 lines, 15 hand-kept pieces. Each carries identity (slug, mediums, tags, status), prose (quote, description, philosophy, impact), hardcoded `photoCount` and `storytellerCount`, `elSlugs`, and links to `/projects/<slug>`, a route that now 308s to the home page. Hydration pulls live media, stories and storytellers from Empathy Ledger per `elSlugs`. |
| Record (`@act/projects`) | 10 pieces carry an `art` block: ACT-PS, UA, CN, CF, GP, RT, RA, CA, MC, TR. All ten have an Empathy Ledger project id. |
| Wiki | `wiki/art/art-projects.md` is the curatorial index (nine pieces, hand kept). Piece pages sit under `wiki/projects/act-studio/` (caravan, confessional, gold-phone, redtape, regional-arts-fellowship, cars, treacher, the-vagina, uncle-allan), `wiki/projects/` (contained, caring-for-those-who-care) and `wiki/projects/picc/` (photo kiosk, photo studio). |
| Drift | Studio has five pieces the record does not know as art: the-caravan, picc-photo-kiosk, confessions-to-philanthropy, the-vagina, anat-spectra-2025. The record has ACT-PS (photo studio) which the studio does not show. Studio slug `uncle-allan` vs record `uncle-allan-palm-island-art`. Status vocabularies differ (`exhibited / active / ideation / concept` vs `active / ideation / ...`). |

## Ownership, one line each

- **Identity** (slug, code, media, tags, status, connected project, EL project, own site): the record. Guarded.
- **Prose** (the one-line quote, the description, philosophy, impact): the wiki page for the piece, in its frontmatter and first sections. Same rule as project heroes (wiki first).
- **Counts and media** (photos, storytellers, stories, hero image): Empathy Ledger, live at build, never typed in.
- **Presentation overrides** (a local hero video, letterbox fit, an external wall URL): a small studio file keyed by slug, only for what the other three cannot hold.

## Steps

1. **Record.** Add art blocks for the five missing pieces. Codes: the-caravan gets `ACT-CVN` (already its Empathy Ledger code); the-vagina gets a new studio-line code; picc-photo-kiosk becomes an art sub-piece of ACT-PI (`art.parent_code`); confessions-to-philanthropy becomes an art piece under ACT-CS with `sites[]` pointing at the Payout Wall; anat-spectra-2025 is an event and is retired from `/art`. Rename nothing on the studio side; add `slug_aliases: ["uncle-allan"]`. Extend `Art` in the schema with `status: exhibited | active | ideation | concept`, `year`, `location`, `connected_code`, `lcaa_stages[]`, `wiki_path`. Guard: every art piece has a wiki page and an Empathy Ledger project id or `tracked: false`.
2. **Wiki.** Piece pages get frontmatter `quote`, `philosophy`, `impact` moved out of the studio TS (verbatim, then edited in the wiki from now on). `art-projects.md` is regenerated from the record by a small script so the index cannot drift.
3. **Studio.** `sync-canonical-wiki-pages.mjs` already bakes wiki pages; extend the flagship-pack style sync with an `art-pieces.generated.json` joining record art blocks + wiki prose. `art-portfolio.ts` shrinks to: read that JSON, hydrate from Empathy Ledger, apply the override file. Counts come from the EL response. `generateStaticParams` reads the record. Connected-project links use the record's public path, not `/projects/*`. `check:art-record` fails when the generated JSON is behind the record.
4. **Verify.** `/art` and every `/art/<slug>` render the same fifteen pieces before and after (fourteen, with ANAT SPECTRA retired to the events list), byte-compared on title, quote and description; media counts now live. Control: a piece with no wiki page fails the studio build.

## Order and tiers

1 and 2 are infra PRs (data + wiki, night-shift safe). 3 is a studio PR that touches public pages, so Ben looks at the Vercel preview of `/art` and one piece page before merge. No database or external writes.

## Not decided

- The-vagina code. Suggest `ACT-TV` unless Xero already uses it.
- Whether `wiki/art/art-projects.md` keeps its essay paragraphs above the generated table (suggest yes: generated table, hand-kept prose around it).
