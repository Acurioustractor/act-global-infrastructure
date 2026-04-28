---
title: Strategy from Soul
status: Draft
date: 2026-04-28
source_of_truth: wiki/concepts/soul.md
---

# Strategy from Soul

> Soul lives at `wiki/concepts/soul.md`. Everything below flows downstream. If a layer contradicts the soul, the layer is wrong.

## The Stack

Seven layers, from why we do this to where it shows up Tuesday morning.

1. **Soul.** Why we do this. Ben + Nic, two humans, two textures.
2. **Identity.** Who ACT is, in service of soul.
3. **Method.** How we work. Listen, Curiosity, Action, Art.
4. **Economy.** How the money sustains the soul, the work, and the founders.
5. **Structure.** The entities that carry the work.
6. **Projects.** What we build through those entities.
7. **Surfaces.** Where the whole stack shows up daily and publicly.

Each layer points up to the one above. If a project does not lead back, layer by layer, to soul, it is the wrong project. If a dollar does not lead back, layer by layer, to soul, it is the wrong spend.

## Layer-by-Layer State

### 1. Soul ✅
**File:** `wiki/concepts/soul.md`
**State:** Drafted. In review with Ben and Nic.
**Says:** Two humans, two textures. Build, connect, make art, all three each. Why we do this predates ACT.
**Next:** Read aloud with Nic. Mark anything not true in your mouths. Lock when both can read it without flinching.

### 2. Identity ✅
**File:** `wiki/concepts/act-identity.md`
**State:** Updated 2026-04-28.
**What changed:** Replaced "ACT Foundation / ACT Ventures" framing with the real four-entity structure (A Curious Tractor Pty Ltd, Harvest Pty forming, Farm Pty forming, A Kind Tractor Ltd, sole trader winding down). Added a "downstream of soul" frame line at the top. Added soul + act-core-facts to backlinks. Pointed to four-lanes for money flow detail and to act-core-facts for canonical entity numbers (ACNs, ABNs, etc.).
**Still to do:** Optional voice sweep to convert remaining em-dashes to commas/periods/colons. Not blocking.

### 3. Method ✅
**File:** `wiki/concepts/lcaa-method.md`
**State:** Polished 2026-04-29.
**What changed:** Added a soul source blockquote at the top. Added a new "How LCAA Came to Be" section after Definition that frames the method as the founder soul externalised, with the line about it being "a description of what already happens" rather than a framework imported. Added soul + four-lanes to backlinks. Fixed the one em-dash in the Definition paragraph that sat adjacent to the new content.
**Still to do:** Broader em-dash sweep across the rest of the file (similar to the act-identity.md sweep), if wanted.

### 4. Economy ✅
**File:** `wiki/concepts/four-lanes.md`
**State:** Drafted. In review with Ben + Nic.
**Naming note:** Originally drafted as `custodian-economy.md` then renamed because `wiki/projects/custodian-economy.md` already exists as a separate ACT project. The Four Lanes is ACT's own internal economy. The Custodian Economy project is a different thing that should not be conflated.
**Says:**
- How money flows in (revenue, grants, services).
- The four lanes: To Us, To Down, To Grow, To Others.
- The founders are sustained as part of the method, not a tax on it.
- Each dollar tagged to an LCAA phase, so spend tells us whether we are living the method.
- Beautiful obsolescence applied to money: built to be handed back to the work itself.
**Why it matters:** Without this layer the soul lives but the body the soul inhabits is invisible. This is the file that closes the loop Ben opened at the start of this thread: "we earn money, it goes, we cannot see what it bought."

### 5. Structure ✅
**File:** `wiki/decisions/act-core-facts.md` (canonical, syncs to other repos via `scripts/sync-act-context.mjs`)
**State:** Updated 2026-04-28.
**What changed:** Added a "Source upstream of this file" frame line pointing to soul. Added a "Why this structure" subsection after the entities table, capturing the philosophy behind the multi-entity setup (legibility, each project earning its own growth, founder muscle in ACT Pty). Pointed to four-lanes and soul.
**Important note:** the sync script's output block is a hardcoded template inside `sync-act-context.mjs`, not extracted from the source file. My additions to `act-core-facts.md` are safe (won't change what gets synced) but if you want the why-of-each in the synced block too, the script's `generateContextBlock()` template needs updating separately.

### 6. Projects ✅ (mostly)
**Files:** `wiki/projects/*` and project-specific subfolders.
**State:** Most have their own page. Some are richer than others.
**Optional improvement:** Each project page carries a one-line "how this serves soul" anchor near the top. Not blocking. Useful when projects multiply.

### 7. Surfaces
Where the whole stack shows up. The test of whether any of this is real.

| Surface | What it carries | State |
|---------|----------------|-------|
| Wiki (this repo) | All seven layers, linked | Layers 1, 3 strong. 2, 4, 5 need work. |
| `act.place/about` | Public who-we-are | Three thin cards. No economy. Needs rewrite from soul. |
| `act.place/vision` | Public where-we-are-going | Acts and Pillars. No economic spine. Needs the four lanes added. |
| `act.place/economy` | NEW. Public translation of custodian-economy. | Does not exist. Add. |
| Notion top card | Live current-quarter four-lane snapshot | Does not exist. Add. |
| Weekly digest | One-line lane status + soul check | Digest exists. Add the line. |
| Conversation | "How is the soul of the work this week?" as a check-in question | Cultural, not technical. Just start asking it. |

## Work Order

Smallest sequence that fixes the whole stack. Wiki work first (so the source is true), then surfaces (so the source is visible).

1. ✅ Draft `soul.md`. (Done. In review.)
2. ✅ Draft `four-lanes.md`. (Done. In review.)
3. ✅ Update `act-identity.md`. (Done 2026-04-28: real entity names, soul reference at top, four-lanes link, act-core-facts link.)
4. ✅ Update `act-core-facts.md`. (Done 2026-04-28: soul reference + Why this structure subsection. Sync script template still needs separate update if synced block should carry the why.)
5. ✅ Polish `lcaa-method.md` (Done 2026-04-29: soul source blockquote at top, new "How LCAA Came to Be" section after Definition, soul + four-lanes added to backlinks. Broader em-dash sweep still pending if wanted.)
6. ✅ Add `/economy` page to `act.place`. (Done 2026-04-29: `apps/website/src/app/economy/page.tsx` created. Public translation of four-lanes. Linked from main nav and footer.)
7. ✅ Rewrite `act.place/about` from soul. (Done 2026-04-29: replaced three thin cards with two-humans intro, Not-charity-not-consultancy framing, LCAA-as-externalised-soul, project clusters, beautiful obsolescence, footer CTAs.)
8. ✅ Notion top card / cockpit snapshot. (Done 2026-04-29: `scripts/four-lanes-snapshot.mjs` queries lane + LCAA data and writes `wiki/cockpit/four-lanes-today.md`. Includes data-freshness banner, current quarter, previous quarter, last-90-days, LCAA-by-spend, soul-check most-behind line. Also done: `scripts/tag-lcaa-phases.mjs` for ongoing phase tagging — though the JS client hits a PostgREST timeout on the bulk fetch; initial backfill ran via direct SQL through MCP. Rule refinements applied 2026-04-29: ACT-GD travel/fieldwork → Listen (192 rows reclassified), Adobe + art-vendor patterns → Art (5 rows), Knight/Marchesi Trust catcher → To Us (forward-looking, 0 matches yet). All rules encoded in the JS script.)
9. Add the one extra line to the weekly digest. (Pending: extend `scripts/weekly-reconciliation.mjs` to include the four-lane snapshot + soul check in its Telegram output.)

Items 1–5 are wiki. Items 6–9 are surfaces. Both flow from the same source.

## What Done Looks Like

A Tuesday morning, three months from now.

- Ben opens Notion. Top card reads: `Q1 FY27 to date: To Us $X · To Down $Y · To Grow $Z · To Others $W. Listen 28% / Curiosity 22% / Action 32% / Art 18%.`
- The weekly digest has landed. One line in it says: `Lane most behind this week: To Us. Soul check: when did you last sit in a room with someone you did not have to convince of anything?`
- A funder visits `act.place/economy` and reads: `Q4 To Grow funded the Goods Minderoo pitch and BG Fit fieldwork. Q4 To Us paid the founders for the first time at the level the entity now allows. Q4 To Others sent X to anchor partners.` Not financials. Story told in money.
- Ben rereads `wiki/concepts/soul.md` and it still sounds like him and Nic in their mouths.
- Nothing in any layer contradicts the layer above it.

That is the whole point.

## Risks to Watch

- **Soul without economy.** If `soul.md` is the only new file for weeks, soul exists but has no body. Do not let custodian-economy.md slip.
- **Layer drift into corporate voice.** Any layer rewritten without re-reading soul will drift. Discipline: open soul.md before any edit at any layer.
- **Premature public translation.** Public versions of soul, identity, and economy each need their own draft pass for strangers. Do not copy internal text to the website. Translate it.
- **Sync before truth.** `act-core-facts.md` distributes to 7 repos. Confirm the structure language is right before letting the sync run again, or seven repos pick up the wrong thing at once.

## How to Use This Document

When in doubt, return to `wiki/concepts/soul.md` first. Then come back here and ask: which layer is the question about? Then go to that layer's file. If the file is missing or wrong, fix it. Do not improvise the answer somewhere else and let the layers drift apart.

---

## Backlinks

- [[../../wiki/concepts/soul|Soul]]: the source
- [[../../wiki/concepts/act-identity|ACT Identity]]: layer 2 (needs update)
- [[../../wiki/concepts/lcaa-method|LCAA Method]]: layer 3
- [[../../wiki/concepts/four-lanes|The Four Lanes]]: layer 4
- [[../../wiki/decisions/act-core-facts|ACT Core Facts]]: layer 5 (canonical structure file)
