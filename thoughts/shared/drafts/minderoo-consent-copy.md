---
title: Consent-in-action copy deck — every label, explainer, tile text, voice line
status: load-bearing for #consent dashboard section + booklet Page 6b
date: 2026-04-20
purpose: |
  Single source of truth for every word that appears on the Consent in action
  section of the dashboard, the booklet print spread, and any future live
  API component. Written in the envelope's editorial voice (first-person
  storyteller where possible, factual elsewhere, no marketing language).
---

# Consent-in-action copy deck

## Section header

**Eyebrow (11px uppercase letterspaced earth):** `Indigenous data sovereignty, operating`
**Title (serif, 2xl):** Consent in action
**Subtitle (serif-italic, stone-700, max-width 4xl):** Every story shown here has a named storyteller, a named elder, an active consent chain, and a revocation path. The content belongs to the community, not to us. What you see is what is currently agreed. If an agreement changes, what you see changes.

## Consent ribbon

Row above the cards. Cream background, earth border-top. Three stats separated by `·`. Format: stat + small subordinate clause.

```
25 stories flowing today · 0 withdrawn this month (1 last month, honoured in 18 hours) · 3 sacred stories held by community, not shown here
```

Alternative long version for narrow screens:

```
Flowing today · 25
Withdrawn this month · 0
Honoured last month · 1 (within 18 hours)
Sacred, held by community · 3 (never shown here)
```

## The OCAP badges (row beneath storyteller name on each card)

Five badges. Same 11px uppercase letterspacing as existing `.chip`. Small hand-drawn stroke-only 16px glyph sits left of label. Click opens the linked governance page (Year 1 — for 1 May, hover only).

### 1. Ownership

**Label:** `Community-owned · [organisation]`
**Hover:** This story belongs to [organisation]. ACT holds it as custodian, not owner.
**Colour:** grass `#4a6b3a`
**Glyph:** `ocap-glyphs/ownership.svg` — circle containing a small anchor
**Opens:** `wiki/governance/ownership.md` (Year 1)

### 2. Control

**Label:** `Controlled by [storyteller] + [elder]`
**Hover:** Every decision about this story — edit, syndicate, withdraw — requires both the storyteller and the named elder.
**Colour:** earth `#8a5a2a`
**Glyph:** `ocap-glyphs/control.svg` — two open hands
**Opens:** `wiki/governance/control.md` (Year 1)

### 3. Access

**Label:** `Shared with consent · revocable`
**Hover:** Shown here because consent is current. One message from the storyteller or elder removes it within 24 hours.
**Colour:** sky `#2d5f7f`
**Glyph:** `ocap-glyphs/access.svg` — open door
**Opens:** `wiki/governance/access.md` (Year 1)

### 4. Possession

**Label:** `Held in EL v2 · verified [YYYY-MM-DD]`
**Hover:** The story lives in Empathy Ledger v2, a sovereign-to-community data store ACT does not own.
**Colour:** ink `#0f1111`
**Glyph:** `ocap-glyphs/possession.svg` — vault with key
**Opens:** `wiki/governance/possession.md` (Year 1)

### 5. Elder provenance

**Label:** `[Elder name] · [Verbal / In writing / TO-authority] · [YYYY-MM-DD]`
**Hover:** *Verbal-consent-in-conversation is a first-class OCAP mode. Ben-as-witness is the audit trail.* (Re-use verbatim from existing dashboard copy near line 1138)
**Colour:** gold underline on the date
**Opens:** `wiki/governance/verbal-consent.md` (Year 1)

## Consent-status chips (one per card, top-right)

- **Active** — `chip-active` (grass). No icon needed.
- **Awaiting elder** — `chip-emerging` (gold). Small clock glyph.
- **Withdrawn** — new `chip-withdrawn` class, earth on cream-2, italic. Small closed-hand glyph.

Hover copy:
- Active: "This story is currently flowing with full consent."
- Awaiting elder: "This story is paused pending elder review. It is not yet shown publicly."
- Withdrawn: "This story has been withdrawn by the storyteller. We no longer hold it."

## Sensitivity-tier markers

Rule: quieter as sensitivity increases.

### Standard
No marker. Card flows normally.

### Medium
Small gold dot beside the OCAP badge row. Hover: *"Medium cultural sensitivity. Shown with elder approval current to [YYYY-MM-DD]. Context matters — please read with care."*

### High
Country-red `#b7410e` dot AND a one-line cultural-context preface above the quote, written by the organisation. Example preface format: *"Told on [country] after [context] — please sit with this before sharing onwards. —[Organisation]"*
Click-to-share interrupts with a modal: *"This story is culturally sensitive. Please re-confirm you have consent from [organisation] before sharing outside this page."*

### Sacred
**The story does not appear at all.** In its place, one serif-italic line sits in the consent ribbon:

> *"3 sacred stories are held by MMEIC for MMEIC. They are not shown here and will never be shown here. The envelope does not depend on them."*

(Number updates per snapshot. Organisation name configurable per sacred holding.)

## Consent-mode glyphs (top-right of each card)

Small 16px stroke-only SVG. Shape-only (no colour meaning). Distinguished by form.

### Mode 1 — Traditional Owner authority
**Used by:** Oonchiumpa (Kristy Bloomfield + Tanya Turner, Central Arrernte / Eastern Arrernte / Alyawarra TOs of Mparntwe)
**Glyph:** `ocap-glyphs/to-authority.svg` — triangle inside a circle (land inside community)
**Hover:** *"Kristy and Tanya hold Traditional Owner standing for Mparntwe. Their consent satisfies the elder role. Under the authority of Aunty Bev and Uncle Terry."*

### Mode 2 — Selective per-storyteller
**Used by:** PICC (Palm Island Community Company)
**Glyph:** `ocap-glyphs/selective.svg` — three small dots of uneven size
**Hover:** *"PICC does not give blanket consent. Each storyteller is asked per-story, and each answer is recorded individually."*

### Mode 3 — Elders-in-Council
**Used by:** MMEIC (Minjerribah Moorgumpin Elders-in-Council)
**Glyph:** `ocap-glyphs/elders-in-council.svg` — ring of five dots around a centre
**Hover:** *"Consent is given by the Minjerribah Moorgumpin Elders-in-Council as a collective body, not by a single individual. 32 years of council practice."*

### Mode 4 — CEO-as-elder for own-org compilation
**Used by:** Mounty Yarns (Daniel Daylight, CEO)
**Glyph:** `ocap-glyphs/ceo-as-elder.svg` — single dot with a downward anchor line
**Hover:** *"Daniel Daylight stands as elder for the Mounty Yarns compilation he authored. His organisational authority and his cultural authority are the same signature here."*

### Mode 5 — Non-TO leader with per-story elder review
**Used by:** BG Fit (Brodie Germaine, non-TO org leader; elder review per story)
**Glyph:** `ocap-glyphs/non-to-per-story.svg` — two overlapping circles
**Hover:** *"Brodie Germaine gives organisational consent. Each story also has a separate elder named per-story — Brodie does not speak for another's Country."*

## The Honoured-Withdrawal tile

Same card dimensions as other cards. Empty hero slot containing only `ocap-glyphs/closed-hand.svg` (single hand-drawn closed fist, stroke-only, cream-2 background). Where the quote would sit:

### Example A (active rotation, week of 1 May)

> *"Kai asked us to take his story back on 2026-04-12. We did, within 18 hours. ACT honours his choice. This placeholder will itself be removed on 2026-05-12 — a withdrawn story should not leave even a shadow behind indefinitely."*

**Sub-row (11px uppercase stone-500):** `Withdrawn · 2026-04-12 · via Kristy Bloomfield · EL v2 record: honoured`

### Example B (rotation option)

> *"Lena asked us to remove her story from public view on 2026-03-27. We did the same day. The story is now held only by her and by Oonchiumpa."*

**Sub-row:** `Withdrawn · 2026-03-27 · via Tanya Turner · EL v2 record: honoured`

### Example C (rotation option)

> *"The Mount Isa compilation included a 14-year-old whose guardian asked us to pause it on 2026-02-14. We paused the compilation until each family re-confirmed. Three of six re-confirmed; the compilation now holds three voices."*

**Sub-row:** `Paused → partially-restored · 2026-02-14 · via Brodie Germaine · EL v2 record: honoured`

### Hover on the tile

*"You are seeing the absence that sovereignty requires. The data is gone. Only the fact of the withdrawal remains, and that will go too."*

## Storyteller-voice spine

Used in three places (below Honoured-Withdrawal tile, at end of consent ribbon, in dashboard footer). One line. Never altered. Cormorant Garamond italic 18px, centred, cream-2 background, ink type.

> *"This is my story. I consent. I can take it back. Nothing changes for me if I do."*

Footer attribution (below the line, 11px stone-500): `Storytellers retain full authority. ACT holds stories as custodians, not owners.`

## OCAP chain footer on each card

Small `<details>` element. Collapsed label:

**12 gates passed · click to see each**

Expanded content (Year 1 — for 1 May, leave details blank or link to `config/wiki-story-sync.json`):

1. Storyteller consent is active
2. Elder approval is current
3. Organisation consent is signed
4. Syndication is enabled
5. Privacy tier permits publication
6. Sensitivity tier permits publication
7. Cultural-warnings scan passed
8. Sacred-keywords scan passed
9. Cross-tenant visibility allows ACT wiki
10. Storyteller is not suspended
11. Organisation is not paused
12. Last verification within 90 days

Each passed gate shown as a tick + timestamp. Each click opens a wiki page (Year 1).

## Print booklet — Page 6b copy

Full-page spread inside the canonical pitch booklet. Mirrors the dashboard `#consent` section for the reader who opens the envelope first.

### Print title
**Consent in action.**

### Print subtitle (serif-italic, max 2 lines)
Every story shown here has a named storyteller, a named elder, an active consent chain, and a revocation path. The content belongs to the community, not to us. What you see is what is currently agreed.

### Print body copy (2 columns, grid)

Four to six story cards arranged in a 2-column grid, identical content to the dashboard. Each card prints:

- Hero photograph
- Quote (serif-italic, 14pt)
- Storyteller name + role
- Elder name + approval mode + date
- Organisation
- Consent-mode glyph (printed black, stroke-only)
- Sensitivity dot (if medium or high)
- Footer annotation in 8pt: `Elder approval: [name], [mode], [date]. Held in Empathy Ledger v2, verified [date]. This story is revocable at any time.`

### Print pull-quote (bottom-third of spread)

> *"This is my story. I consent. I can take it back. Nothing changes for me if I do."*
> — Storyteller voice, repeated across every story in this envelope.

### Print Honoured-Withdrawal callout (edge of spread)

Small framed panel with the closed-hand glyph + one real withdrawal example (chose Example A or rotate). 60-80 words max.

## Glossary panel (Year 1 — governance pages)

Each governance page follows the same structure:

- What the principle means (in community and in ACT practice)
- How it is enforced in this system (specific fields, specific gates)
- How to revoke / change / request (concrete contact path)
- The decision-record trail (links to `wiki/decisions/` entries)

(1 May ships the linked text as inline hover. Governance pages written in Year 1.)

## Tone rules

1. First person where the storyteller's voice is load-bearing. Third person factual otherwise. No marketing voice anywhere.
2. Short sentences. No em-dashes in print (per ACT style). Commas + periods + colons.
3. Name people. Never "a storyteller" when we mean Kristy. Never "an elder" when we mean Aunty Bev.
4. Sensitive data never shown as placeholder — if we can't show it, we say what we can't show and why (the sacred-silence line is the model).
5. The word "revocable" earns its place in the ribbon. The word "sovereign" is in the subtitle only (do not repeat — overuse dilutes).
6. Consent is written as continuous (`is consenting`, `currently agreed`) not past-tense (`gave consent`). Consent is now, not done.
7. When quoting a storyteller, the attribution carries: name, role, age where consent permits, organisation, Country or mob where consent permits.

## Accessibility

- All glyphs have `role="img"` and `aria-label` equal to their label text
- OCAP badges are readable text first, decorated second — screen readers hear "Community-owned — Oonchiumpa" not an emoji
- Sensitivity dots have `aria-label` equal to tier name
- The Honoured-Withdrawal tile has `aria-label="A story placeholder — this story has been withdrawn by the storyteller"`
- Keyboard navigation through cards using tab order — hover content appears on focus too
- Colour is never the sole carrier of meaning (status chips carry both colour and icon/label)
