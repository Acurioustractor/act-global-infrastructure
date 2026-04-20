# Wiki Surfaces Audit
Generated: 2026-04-13

## Summary

Four distinct surfaces serve wiki content. Two are static (HTML viewer + public snapshot), two are live (Command Center route + Regen Studio). The canonical source of truth is `wiki/` at repo root.

---

## 1. Tractorpedia HTML Viewer — `tools/act-wikipedia.html`

- **Size:** 22,957 lines / 1.4 MB — entire wiki baked into a single self-contained HTML file
- **Article count:** Built by `scripts/wiki-build-viewer.mjs`; memory says ~183 articles as of 2026-04-13
- **Structure:** Wikipedia Vector skin CSS; fixed left sidebar (15em), fixed top bar, scrollable content area
- **Navigation:** Left sidebar with collapsible section tree (all 11 canonical sections)
- **Search:** Client-side fuzzy search over embedded article list
- **Categories:** Sections: Concepts, Projects, Communities, People, Stories, Art, Research, Technical, Finance, Decisions, Synthesis
- **Reader experience:** Closest to a real Wikipedia. Fully offline. Wikipedia-blue link palette, serif body font. Red links for missing articles.
- **How it's built:** `wiki-rebuild.yml` CI job runs `node scripts/wiki-build-viewer.mjs` on every push to `wiki/**` on main, then commits the rebuilt file. Also copied to `apps/command-center/public/tractorpedia.html`.
- **Also served at:** `act-global-infrastructure.vercel.app/tractorpedia.html` (static public asset)

---

## 2. Command Center Wiki Route — `/wiki` page

- **File:** `apps/command-center/src/app/wiki/page.tsx` (single 689-line client component)
- **Brand name in UI:** "ACT Compendium" (not Tractorpedia)
- **Content source:** Live filesystem reads via `apps/command-center/src/lib/wiki-files.ts`
  - Primary: `wiki/` at workspace root (canonical)
  - Fallback: `apps/command-center/public/wiki/` snapshot
  - `resolveWikiPath()` tries canonical first, then snapshot, then legacy path aliases
- **API routes it calls:** `/api/wiki/structure`, `/api/wiki/page`, `/api/wiki/search`, `/api/wiki/status`
- **Features:**
  - Full-text search (live, triggers at ≥2 chars)
  - Collapsible section nav in left sidebar (w-80)
  - Canonical Health stats panel: total articles, wikilinks, orphans, broken links
  - Repair Queue dashboard on homepage: broken links, missing-from-index, orphan pages, next stub
  - Backlink signals panel (direct + advisory hub references)
  - Article view: ReactMarkdown with GFM, breadcrumb trail, internal wikilink routing, external link icon
- **Reader experience:** Dark glass UI (indigo/purple palette). Dashboard-first — homepage is a health/maintenance view, not a content index. Targeted at internal editors, not casual readers.
- **Status data source:** `wiki/output/status-latest.json` (written by `scripts/wiki-lint.mjs`)

---

## 3. Command Center Snapshot — `apps/command-center/public/wiki/`

- **What it is:** Legacy static mirror of a subset of canonical wiki articles, committed to the repo
- **Article count:** 1 JSON file, 57 markdown files (confirmed via find)
- **Structure:** Flat + shallow project-folder layout: `act/`, `empathy-ledger/`, `goods/`, `justicehub/`, `place/`, `stories/`, `the-farm/`, `the-harvest/`, `the-studio/` + a handful of root-level concept files
- **Meta:** `snapshot-meta.json` — 23 direct mappings, 4 wrapper pages, generated 2026-04-13T11:45:09Z
- **README says:** "Legacy mirror for command-center compatibility only. Do not edit."
- **How it's updated:** `node scripts/wiki-sync-command-center-snapshot.mjs` (manual or CI)
- **Purpose:** Fallback for `wiki-files.ts` path resolution when a page isn't in the canonical `wiki/` tree. In practice the canonical tree now covers everything, so this is vestigial.
- **Reader experience:** Not directly browsable. No HTML viewer. Only consumed via the CC API routes.

---

## 4. Regenerative Studio Wiki — `act-regenerative-studio.vercel.app/wiki`

- **Article count:** 326 (per memory; larger than the CC route because the regen studio may include extra content)
- **How it gets content:** Repository dispatch — `wiki-rebuild.yml` fires `peter-evans/repository-dispatch@v3` to `Acurioustractor/act-regenerative-studio` with event `wiki-content-updated` after every rebuild. Requires `CROSS_REPO_TOKEN` secret.
- **What gets dispatched:** Just the event trigger; no file payload. The regen studio repo presumably pulls the latest wiki content from this repo or has its own build step on receipt of the event.
- **Sync config in this repo:** No local config file. Entirely managed by the workflow step in `.github/workflows/wiki-rebuild.yml` lines 74–83.
- **Reader experience:** Unknown without access to the regen studio repo. Memory notes 326 articles — higher count than CC route (175 runtime), suggesting regen studio may pull additional content or have its own wiki additions.

---

## Key Differences Between Surfaces

| Surface | Articles | Source | Updated | Audience |
|---------|----------|--------|---------|----------|
| Tractorpedia HTML | ~183 | Built from `wiki/` | CI on push | Anyone with the URL; offline-capable |
| CC `/wiki` route | 175 runtime | Live `wiki/` FS reads | Immediate on deploy | Internal editors/operators |
| CC snapshot | ~57 | Legacy mirror subset | Manual / CI | Fallback only, not browsable |
| Regen Studio | 326 | Cross-repo dispatch | After CI rebuild | External / community audience |

## Open Questions

- Why does Regen Studio show 326 articles vs 183 in the HTML viewer? Either the regen studio repo has its own wiki content, or the count includes something not in `wiki/` root sections.
- The snapshot (57 files) is stale relative to the canonical tree — worth confirming `wiki-files.ts` fallback is never actually triggered in production.
- `CROSS_REPO_TOKEN` is required for regen studio dispatch — if that secret is unset, the regen studio never updates.
