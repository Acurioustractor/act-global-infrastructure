---
title: STAY journal pitch artefact — session handoff
date: 2026-04-08 (afternoon)
status: Active — resume here
supersedes_for_journal_work: SESSION-HANDOFF.md (which is the morning's work, still relevant for project context)
---

# STAY journal — session handoff (afternoon, 2026-04-08)

> A long visual + editorial review session. The journal at `tools/three-circles-journal.html` was reorganised, four new spreads added, em-dashes stripped, scrapbook elements introduced, voice unified, and the visual language brought into one author/one pen. This file is the resume point for the next session.

## Where to start the next session

1. Open `tools/three-circles-journal.html` in a browser
2. Walk through every spread. ~32 spreads, ~64 pages.
3. Pick up the open threads at the bottom of this file.

## The journal as it stands

**File:** `tools/three-circles-journal.html`
**Spread count:** ~32
**Brand voice:** lowercase journal prose, IM Fell English body serif, Cormorant Garamond italic headings, Architects Daughter handwriting reserved for margin notes only
**Em-dashes:** 0 (stripped, replaced with commas/periods/colons)

### Spread sequence (in order)

| # | Spread | What it does |
|---|---|---|
| 1 | Cover | full-bleed embossed STAY journal photo |
| 2 | Title page | "STAY." + dedication for Lucy Stronach |
| 3 | STAY. three meanings | giant typeset STAY + I/II/III |
| 4 | Why we're writing this | "more reports than ever, more kids in detention" + photo slot |
| 5 | The number | $1.33M / 24.6 per 10K |
| 6 | The proposition | one paragraph + Three rings (renamed from Three circles) |
| 7 | The model | Three Circles diagram + edge/next/rest explainer |
| 8 | What's already built | 1,775 / 100K / 199K / 71K / 96% + Empathy Ledger / CONTAINED / live AI agents (jargon translated) |
| 9 | The Living Map Loop | ALMA loop diagram + WITNESS/DOCUMENT/VERIFY/PUBLISH |
| 10 | Methods intro | 4 method names + scrapbook placeholders (Aunty Bev polaroid, Brodie polaroid, JusticeHub stamp) |
| 11 | Three Ripples | diagram + 3 ripples |
| 12 | I Have · I Am · I Can | diagram + 9 resources + Grotberg Lima context |
| 13 | The Field Canvas | diagram + 5 domains + Drive/Field/Shed |
| 14 | Listen · Curiosity · Action · Art | diagram + 4 LCAA beats |
| 15 | Map of the Ten | full-bleed scrapbook map (placeholder, journal-test-C-) |
| 16 | The Travel Diary | NEW. Mparntwe ↔ Murcia bidirectional. 3 crossing stamps + polaroid |
| 17 | The Ten anchor communities | NEW. 10 library stamps with Indigenous place names + lead person |
| 18 | Cross-community collage | full-bleed (placeholder, journal-test-B-) |
| 19 | Voices from country | NEW. 4 quote cards + 2 polaroids from anchor communities |
| 20 | The artefact | "the country we're building" + 4 polaroid placeholders for the 4 forms |
| 21 | Lineage | NEW. "shoulders we stand on" — Yunkaporta / Grotberg / Diagrama / Ostrom stamps + 2 quote cards |
| 22 | Fire Crescendo | diagram + year 1/2/3 |
| 23 | CAMPFIRE worked example | NEW. Brodie's story + 3 pillar stamps + founder quote |
| 24 | The costed ask | $780K / $960K / $1.16M ledger + Year 1 buys |
| 25 | What changed + Why Minderoo | $8M → $2.9M + Walk Free / Generation One |
| 26 | Three options + sign-off | options ①②③ + Ben & Nick + email |
| 27 | Back cover | small JusticeHub colophon + "A Curious Tractor · 2026" mark (NEW) |

### Removed in this session
- Lucy quote spread ("twelve organisations…") — felt weird, deleted

### Renamed in this session
- "Three circles. One program." → "Three rings. One program." (frees "circles" exclusively for the methodology)

## Visual language locked

### Fonts (all defined as CSS variables at top of file)
```css
--heading-font:'Cormorant Garamond', Georgia, serif;
--hand-font:'Kalam', cursive;            /* margin notes only */
--body-font:'IM Fell English', Georgia, serif;
```
Loaded via Google Fonts. Multiple alternatives loaded so they can be swapped with one-line edits.

### Scrapbook components (all in CSS)
- `.polaroid` — white-bordered square, sepia photo placeholder, brown tape, serif italic caption
- `.index-card` — ruled library catalogue card, serif italic quote with sepia smart quotes, small-caps meta
- `.library-stamp` — sepia ink-stamp impression in serif uppercase
- `.margin-note` — handwritten ochre scrawl with arrow connector
- All rendered via `renderExtras()` from an `extras:[]` array on any text spread

### Visual fixes applied this session
- All em-dashes removed (80 → 0)
- Voice unified to lowercase prose across all spreads
- Bignum chapter numbers → typeset serif italic, no rotation
- Title-page byline → typeset serif italic (was Caveat handwriting)
- Wavy ochre underline → quiet sepia 1px line
- Diagram pages now sit *inside* the book paper with mix-blend-mode multiply, foxing dots, and diagram-frame wrapper
- Topbar / nav buttons / loading screen → typeset serif italic
- Back cover → small JusticeHub colophon centred

## Empathy Ledger / JusticeHub data fetch — built but not yet run

**Script:** `scripts/journal-fetch-extras.mjs`
**Output:** `tools/journal-extras.json`

Pulls verified JusticeHub programs (`/api/community-programs`) → library stamps, plus Empathy Ledger stories + media (`/api/v1/content-hub`) → index cards + polaroids. Filters by 7 STAY anchor communities (Mparntwe, Bwgcolman, Kalkadoon, Jaru, Darug, Ngemba, Minjerribah) and aliases (Oonchiumpa, PICC, CAMPFIRE, Brodie, Mt Druitt etc.).

Journal HTML auto-fetches `journal-extras.json` on load via `loadExtrasAndRender()` and merges into spreads tagged with `community: '<key>'`. **Currently no spreads have `community:` tags** — need to add them once fetch script has been run successfully.

**To run:**
```bash
JUSTICEHUB_URL=http://localhost:3000 \
EMPATHY_LEDGER_URL=http://localhost:3030 \
node scripts/journal-fetch-extras.mjs
```
…or set URLs to prod. Script gracefully degrades if either API is down.

**Schema map** (from explore agent earlier this session):
- Empathy Ledger: API endpoints `/api/v1/content-hub/storytellers`, `/api/v1/content-hub/stories`, `/api/v1/content-hub/quotes`, `/api/v1/content-hub/media` — all wrapped by existing `scripts/lib/empathy-ledger-content.mjs`
- JusticeHub: `community_programs` table or `/api/community-programs` endpoint, columns: id, name, organization, location, state, description, is_featured
- GrantScope: per-program funding is unstructured JSONB in `community_orgs.funding_sources` — no clean per-org join. Deferred.

## Open threads (next session)

### Visual review still pending — needs Ben's eye
1. **The seven Gemini diagram .pngs** — visually inspect side-by-side. Likely generated at different stages with different prompts. If any look like a different artist drew them, re-spin those with the locked visual language brief at `wiki/output/library-hero-prompts.md`.
   - `wiki/output/three-circles-journal-spread.png`
   - `wiki/output/alma-loop-journal.png`
   - `wiki/output/three-ripples-journal-spread.png`
   - `wiki/output/intentionality-canvas-journal-spread.png`
   - `wiki/output/field-diagnostic-journal-spread.png`
   - `wiki/output/lcaa-loop-journal.png`
   - `wiki/output/fire-crescendo-journal.png`
2. **Two test images live in the journal** — `journal-test-C-scrapbook-map.png` and `journal-test-B-beard-collage.png`. Filenames literally say "test". Replace or re-spin.
3. **Scrapbook visual polish** — Ben said "don't like how they look but we can work on it" earlier. CSS was polished once but worth a second pass after seeing it on multiple spreads.

### Editorial threads
4. **Run the data fetch script** then add `community:` tags to: methods-intro spread, ten anchors, voices from country, CAMPFIRE
5. **Brodie sign-off on the CAMPFIRE worked-example spread** before any external use — already noted
6. **VIC and SA community candidates still open** — placeholders for No. 09 (WA) and No. 10 (SA / Flinders) only

### Other open work from earlier today
- §2, §3, §5, §6, §11 of `wiki/projects/the-full-idea.md` may still need passes (the comprehensive doc the journal mirrors)
- The 7 individual standalone STAY Series cover re-spins still need JH colophon update (separate task per `wiki/output/library-hero-prompts.md`)

## Key file pointers

| What | Where |
|---|---|
| The journal HTML | `tools/three-circles-journal.html` |
| Data fetch script | `scripts/journal-fetch-extras.mjs` |
| Existing EL client lib | `scripts/lib/empathy-ledger-content.mjs` |
| The comprehensive doc | `wiki/projects/the-full-idea.md` |
| Locked visual language brief | `wiki/output/library-hero-prompts.md` |
| 7 STAY model copy locked | `thoughts/shared/handoffs/staying/models-locked.md` |
| Journal page review (older) | `thoughts/shared/handoffs/staying/journal-page-review.md` |
| CAMPFIRE companion page | `wiki/projects/campfire.md` |
| JH logo (transparent PNG) | `wiki/output/justicehub-logo.png` |
| Earlier handoff (morning) | `thoughts/shared/handoffs/staying/SESSION-HANDOFF.md` |

## Locked rules (don't break these)

1. **No em dashes anywhere** in journal text. They're an AI tell. Use commas, periods, colons.
2. **Always spell out "Australian Living Map of Alternatives"** — never "ALMA"
3. **Always spell out "Listen · Curiosity · Action · Art"** — never "LCAA"
4. **Indigenous place names always.** Colonial names only in brackets when context demands.
5. **Lowercase journal prose voice.** No corporate sentence-case prose.
6. **No fake handwriting for body text.** Handwriting reserved for margin notes and headings only — and even headings are now Cormorant Garamond italic in this journal.
7. **No technical jargon in pitch text.** "MCP agent" → "AI agent". "v2 consent layer" → "the consent layer that lets storytellers keep sovereignty over their words for life".

## Resume command

```
cd /Users/benknight/Code/act-global-infrastructure
open tools/three-circles-journal.html
```

Then read this file. The next move is your call — visual polish, data wiring, or scope expansion.
