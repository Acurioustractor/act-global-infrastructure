# Tractorpedia Viewer Generator — Known Bugs

**File:** `scripts/wiki-build-viewer.mjs`
**Filed:** 2026-04-21
**Context:** Live `tractorpedia.html` was broken with blank home and dead nav. Diagnosed three unresolved git merge conflicts (`<<<<<<< Updated upstream ... >>>>>>> Stashed changes`) plus 918 lines of duplicated code committed into the viewer across multiple auto-rebuild cycles.

## Bug 1 — generator appends `artProjects.forEach` block instead of replacing it

**Symptom:** Every auto-rebuild cron adds another duplicate copy of the `artProjects.forEach(function(p) { fetchELMedia(...) })` block into the `showArtPortfolio()` function. Accumulated to 7+ identical copies over several weeks.

**Impact:** File bloat, unnecessary duplicate network calls to Empathy Ledger Supabase on every art-portfolio view, slower page load.

**Fix needed:** The generator's patch region for the art-portfolio async-load block must be bounded by clear start/end sentinels and replaced wholesale, not appended. Grep the script for the `fetchELMedia(p.slug, 1)` insertion to find the offending logic.

## Bug 2 — generator preserves merge conflict markers from the existing viewer

**Symptom:** The generator reads `tools/act-wikipedia.html` as a template (line 538: `let html = readFileSync(VIEWER, 'utf8')`), patches specific regions, and writes back. Any unresolved git merge conflict markers in untouched regions are preserved indefinitely. Once committed, every subsequent auto-rebuild re-commits them.

**Impact:** Syntax error in JavaScript breaks every function on the viewer. Home page blank, all navigation dead.

**Fix needed:** Add a pre-flight check in `scripts/wiki-build-viewer.mjs` that refuses to run if the source template contains `<<<<<<<`, `=======` (as a standalone line), or `>>>>>>>` markers. Better: rebuild the viewer from a clean template file in the repo rather than patching the last output in place.

## Recovery action taken 2026-04-21

- Resolved three conflict blocks in `tools/act-wikipedia.html` (kept clean upstream side).
- Removed 918 lines of accumulated duplicate `artProjects.forEach` code.
- Copied clean viewer to `apps/command-center/public/tractorpedia.html` per CI workflow pattern (`.github/workflows/wiki-rebuild.yml` line 60).
- Committed + pushed to unblock live site.

## Next

Fix both bugs in `scripts/wiki-build-viewer.mjs` before the next auto-rebuild cron fires, or the viewer will regress.
